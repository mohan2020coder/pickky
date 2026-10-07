package deliveries

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"pickky/backend/internal/config"
	"pickky/backend/internal/events"
	"pickky/backend/internal/notifications"
	"pickky/backend/internal/payments"
	"pickky/backend/internal/presence"
)

// SvcError carries an HTTP status so handlers can map domain failures 1:1.
type SvcError struct {
	Status  int
	Message string
}

func (e *SvcError) Error() string { return e.Message }

func fail(status int, msg string) *SvcError { return &SvcError{Status: status, Message: msg} }

// Service owns delivery state transitions, rider matching and every side
// effect they imply (notifications, events, payments, conversations).
type Service struct {
	db       *gorm.DB
	cfg      *config.Config
	bus      *events.Bus
	presence *presence.Store
	rdb      *redis.Client
	log      *slog.Logger
	sim      *Simulator
}

func NewService(db *gorm.DB, cfg *config.Config, bus *events.Bus, p *presence.Store, rdb *redis.Client, log *slog.Logger) *Service {
	if log == nil {
		log = slog.Default()
	}
	return &Service{db: db, cfg: cfg, bus: bus, presence: p, rdb: rdb, log: log}
}

func (s *Service) SetSimulator(sim *Simulator) { s.sim = sim }

// ---------- helpers ----------

func (s *Service) publishDelivery(ctx context.Context, d *Delivery, event string, extra map[string]any) {
	data := map[string]any{
		"delivery_id":       d.ID,
		"status":            string(d.Status),
		"status_changed_at": d.StatusChangedAt.UTC().Format(time.RFC3339Nano),
	}
	for k, v := range extra {
		data[k] = v
	}
	rooms := []string{events.UserRoom(d.CustomerID), "delivery:" + d.ID.String(), "admin", "support"}
	if d.RiderID != nil {
		rooms = append(rooms, events.UserRoom(*d.RiderID))
	}
	env := events.New(event, "delivery", d.ID, data)
	if err := s.bus.Publish(ctx, events.ChannelDelivery, env, rooms...); err != nil {
		s.log.Warn("publish failed", "event", event, "err", err)
	}
}

func (s *Service) notifyCustomer(ctx context.Context, d *Delivery, typ, title, message string, data map[string]any) {
	if data == nil {
		data = map[string]any{}
	}
	data["delivery_id"] = d.ID
	if _, err := notifications.Create(ctx, s.db, s.bus, d.CustomerID, typ, title, message, data); err != nil {
		s.log.Warn("notification failed", "err", err)
	}
}

func (s *Service) notifyRider(ctx context.Context, riderID uuid.UUID, typ, title, message string, data map[string]any) {
	if _, err := notifications.Create(ctx, s.db, s.bus, riderID, typ, title, message, data); err != nil {
		s.log.Warn("notification failed", "err", err)
	}
}

// ApplyStatus performs a validated state transition plus all side effects.
// The database write is authoritative; Redis/WS fan-out happens after commit.
func (s *Service) ApplyStatus(ctx context.Context, d *Delivery, to Status, note string) error {
	from := d.Status
	if from == to {
		return nil
	}
	if !ValidTransition(from, to) {
		return fail(409, "That update is not valid for the current delivery state.")
	}

	now := time.Now().UTC()
	updates := map[string]interface{}{
		"status":             string(to),
		"status_changed_at":  now,
		"updated_at":         now,
	}
	if to == StatusDelivered {
		updates["delivered_at"] = now
	}
	if to == StatusCancelled {
		updates["cancelled_at"] = now
		if note != "" {
			updates["cancel_reason"] = note
		}
	}
	if to == StatusPickedUp && d.PickupVerifiedAt == nil {
		updates["pickup_verified_at"] = now
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Delivery{}).Where("id = ?", d.ID).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Create(&DeliveryStatusHistory{
			DeliveryID: d.ID, Status: to, Note: note, CreatedAt: now,
		}).Error
	})
	if err != nil {
		return fail(500, "Something went wrong. Please try again.")
	}

	// Reflect the new state on the in-memory row.
	d.Status = to
	d.StatusChangedAt = now
	d.UpdatedAt = now
	if to == StatusDelivered {
		d.DeliveredAt = &now
	}
	if to == StatusCancelled {
		d.CancelledAt = &now
		if note != "" {
			d.CancelReason = note
		}
	}
	if to == StatusPickedUp && d.PickupVerifiedAt == nil {
		d.PickupVerifiedAt = &now
	}

	info := infoFor(to)
	if to != StatusDraft {
		s.notifyCustomer(ctx, d, info.Event, info.Label, info.Description, nil)
	}
	s.publishDelivery(ctx, d, info.Event, nil)

	switch to {
	case StatusSearchingRider:
		go s.startOffers(context.WithoutCancel(ctx), d.ID)
	case StatusRiderAssigned:
		s.ensureConversation(ctx, d)
		if d.RiderID != nil {
			s.notifyRider(ctx, *d.RiderID, "rider.assigned", "Delivery accepted",
				fmt.Sprintf("Head to %s for pickup.", d.PickupAddr),
				map[string]any{"delivery_id": d.ID})
		}
	case StatusDelivered:
		s.db.WithContext(ctx).Model(&payments.Payment{}).
			Where("delivery_id = ? AND status IN ?", d.ID, []string{"PENDING", "PROCESSING"}).
			Updates(map[string]interface{}{"status": "CAPTURED", "captured_at": now})
	case StatusCancelled:
		s.db.WithContext(ctx).Model(&DeliveryAssignment{}).
			Where("delivery_id = ? AND status = 'PENDING'", d.ID).
			Update("status", "EXPIRED")
		s.db.WithContext(ctx).Model(&payments.Payment{}).
			Where("delivery_id = ? AND status IN ?", d.ID, []string{"PENDING", "PROCESSING"}).
			Updates(map[string]interface{}{"status": "REFUNDED", "updated_at": now})
	}

	if s.sim != nil {
		s.sim.OnStatus(d)
	}
	return nil
}

// ---------- create / quote ----------

type ItemInput struct {
	Description string   `json:"description"`
	Quantity    int      `json:"quantity"`
	WeightKg    *float64 `json:"weight_kg"`
	Fragile     bool     `json:"fragile"`
}

type CreateRequest struct {
	Pickup      Geo         `json:"pickup"`
	Dropoff     Geo         `json:"dropoff"`
	Items       []ItemInput `json:"items"`
	Instructions string     `json:"instructions"`
	PackageType string      `json:"package_type"`
	PackageSize string      `json:"package_size"`
}

func (s *Service) Quote(pickup, dropoff Geo) Quote {
	return ComputeQuote(s.cfg, pickup, dropoff)
}

func genOTP() string { return fmt.Sprintf("%04d", 1000+rand.Intn(9000)) }

// otpMatches accepts either the delivery's stored code or the configured
// demo fixed code (README: "OTP is always 1234").
func (s *Service) otpMatches(given, stored string) bool {
	if given == "" {
		return false
	}
	if fixed := s.cfg.OTP.FixedCode; fixed != "" && given == fixed {
		return true
	}
	return given == stored
}

func (s *Service) nextReference(ctx context.Context) (string, error) {
	var count int64
	if err := s.db.WithContext(ctx).Table("deliveries").Count(&count).Error; err != nil {
		return "", err
	}
	for i := 0; i < 50; i++ {
		ref := fmt.Sprintf("DLV-%d", 1001+count+int64(i))
		var n int64
		s.db.WithContext(ctx).Table("deliveries").Where("reference = ?", ref).Count(&n)
		if n == 0 {
			return ref, nil
		}
	}
	return "", errors.New("reference exhausted")
}

func (s *Service) Create(ctx context.Context, customerID uuid.UUID, req CreateRequest) (*DeliveryDTO, error) {
	if req.Pickup.Addr == "" || req.Dropoff.Addr == "" {
		return nil, fail(422, "Pickup and destination are required.")
	}
	quote := s.Quote(req.Pickup, req.Dropoff)
	ref, err := s.nextReference(ctx)
	if err != nil {
		return nil, fail(500, "Something went wrong. Please try again.")
	}
	packageType := req.PackageType
	if packageType == "" {
		packageType = "parcel"
	}
	now := time.Now().UTC()
	d := Delivery{
		CustomerID:      customerID,
		Status:          StatusCreated,
		Reference:       ref,
		PackageType:     packageType,
		PickupLat:       req.Pickup.Lat,
		PickupLng:       req.Pickup.Lng,
		PickupAddr:      req.Pickup.Addr,
		DropoffLat:      req.Dropoff.Lat,
		DropoffLng:      req.Dropoff.Lng,
		DropoffAddr:     req.Dropoff.Addr,
		Instructions:    req.Instructions,
		PriceMinor:      quote.PriceMinor,
		DistanceKm:      quote.DistanceKm,
		PickupOTP:       genOTP(),
		DeliveryOTP:     genOTP(),
		StatusChangedAt: now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&d).Error; err != nil {
			return err
		}
		for _, it := range req.Items {
			if it.Description == "" {
				continue
			}
			qty := it.Quantity
			if qty <= 0 {
				qty = 1
			}
			weight := 0.0
			if it.WeightKg != nil {
				weight = *it.WeightKg
			}
			item := DeliveryItem{
				DeliveryID: d.ID, Description: it.Description, Quantity: qty,
				WeightKg: weight, Fragile: it.Fragile, CreatedAt: now,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		if err := tx.Create(&DeliveryStatusHistory{
			DeliveryID: d.ID, Status: StatusCreated, Note: "Delivery created", CreatedAt: now,
		}).Error; err != nil {
			return err
		}
		return tx.Create(&payments.Payment{
			DeliveryID: d.ID, AmountMinor: quote.PriceMinor, Currency: "INR",
			Status: "PENDING", CreatedAt: now, UpdatedAt: now,
		}).Error
	})
	if err != nil {
		return nil, fail(500, "Something went wrong. Please try again.")
	}

	s.notifyCustomer(ctx, &d, "delivery.created", "Delivery created",
		fmt.Sprintf("We're finding a rider for %s.", d.Reference), map[string]any{"delivery_id": d.ID})
	s.publishDelivery(ctx, &d, "delivery.created", nil)

	if s.sim != nil {
		s.sim.OnCreated(&d)
	}
	return s.hydrateOne(ctx, &d)
}

func (s *Service) hydrateOne(ctx context.Context, d *Delivery) (*DeliveryDTO, error) {
	list, err := Hydrate(ctx, s.db, []Delivery{*d})
	if err != nil {
		return nil, fail(500, "Something went wrong. Please try again.")
	}
	if len(list) == 0 {
		return nil, fail(404, "We couldn't find that delivery.")
	}
	return &list[0], nil
}

// ---------- lookup ----------

// GetRow loads a delivery by UUID or reference (DLV-1234).
func (s *Service) GetRow(ctx context.Context, idOrRef string) (*Delivery, error) {
	var d Delivery
	q := s.db.WithContext(ctx)
	if id, err := ParseUUID(idOrRef); err == nil {
		if err := q.First(&d, "id = ?", id).Error; err == nil {
			return &d, nil
		}
	}
	if err := q.First(&d, "lower(reference) = ?", idOrRefLower(idOrRef)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fail(404, "We couldn't find that delivery.")
		}
		return nil, fail(500, "Something went wrong. Please try again.")
	}
	return &d, nil
}

func ParseUUID(s string) (uuid.UUID, error) { return uuid.Parse(s) }
func idOrRefLower(s string) string {
	if s == "" {
		return s
	}
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}

// ---------- listing ----------

type ListFilter struct {
	Scope  string // active | history | ""
	Status string
	Page   int
	Limit  int
}

func (s *Service) ListForUser(ctx context.Context, userID uuid.UUID, f ListFilter) ([]DeliveryDTO, int, error) {
	q := s.db.WithContext(ctx).Model(&Delivery{}).
		Where("customer_id = ? OR rider_id = ?", userID, userID)
	switch f.Scope {
	case "active":
		q = q.Where("status NOT IN ?", []string{"DELIVERED", "CANCELLED", "FAILED"})
	case "history":
		q = q.Where("status IN ?", []string{"DELIVERED", "CANCELLED", "FAILED"})
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fail(500, "Something went wrong. Please try again.")
	}
	var rows []Delivery
	if err := q.Order("created_at DESC").Limit(f.Limit).Offset((f.Page - 1) * f.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, fail(500, "Something went wrong. Please try again.")
	}
	list, err := Hydrate(ctx, s.db, rows)
	if err != nil {
		return nil, 0, fail(500, "Something went wrong. Please try again.")
	}
	return list, int(total), nil
}

// ListByAdmin powers /admin/deliveries and /admin/issues.
func (s *Service) ListByAdmin(ctx context.Context, status, search string, page, limit int) ([]DeliveryDTO, int, error) {
	q := s.db.WithContext(ctx).Model(&Delivery{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if search != "" {
		like := "%" + idOrRefLower(search) + "%"
		q = q.Where("lower(reference) LIKE ? OR lower(pickup_addr) LIKE ? OR lower(dropoff_addr) LIKE ?", like, like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fail(500, "Something went wrong. Please try again.")
	}
	var rows []Delivery
	if err := q.Order("created_at DESC").Limit(limit).Offset((page - 1) * limit).
		Find(&rows).Error; err != nil {
		return nil, 0, fail(500, "Something went wrong. Please try again.")
	}
	list, err := Hydrate(ctx, s.db, rows)
	if err != nil {
		return nil, 0, fail(500, "Something went wrong. Please try again.")
	}
	return list, int(total), nil
}

// ---------- rider lifecycle ----------

// riderStatusWhitelist is what a rider may push through /deliveries/:id/status.
var riderStatusWhitelist = map[Status]bool{
	StatusRiderArrivingPickup:  true,
	StatusRiderArrivedPickup:   true,
	StatusInTransit:            true,
	StatusNearDestination:      true,
	StatusFailed:               true,
}

func (s *Service) UpdateStatus(ctx context.Context, d *Delivery, to Status, note string, isAdmin bool) (*DeliveryDTO, error) {
	if to == "" {
		return nil, fail(422, "That status update is not allowed here.")
	}
	if !isAdmin && !riderStatusWhitelist[to] {
		return nil, fail(422, "That status update is not allowed here.")
	}
	if d.Status == to {
		return s.hydrateOne(ctx, d)
	}
	if err := s.ApplyStatus(ctx, d, to, note); err != nil {
		return nil, err
	}
	return s.hydrateOne(ctx, d)
}

func (s *Service) Cancel(ctx context.Context, d *Delivery, reason string) (*DeliveryDTO, error) {
	if IsTerminal(d.Status) {
		return nil, fail(409, "This delivery can no longer be cancelled.")
	}
	if reason == "" {
		reason = "Cancelled by customer"
	}
	if err := s.ApplyStatus(ctx, d, StatusCancelled, reason); err != nil {
		return nil, err
	}
	return s.hydrateOne(ctx, d)
}

// VerifyOTP validates a pickup or delivery code and advances the lifecycle.
func (s *Service) VerifyOTP(ctx context.Context, d *Delivery, otp, stage string) (*DeliveryDTO, error) {
	if stage == "pickup" {
		if d.Status == StatusPickedUp || d.Status == StatusInTransit || IsTerminal(d.Status) {
			return s.hydrateOne(ctx, d)
		}
		if d.Status != StatusPickupVerification && d.Status != StatusRiderArrivedPickup {
			return nil, fail(409, "This delivery is not waiting for pickup verification.")
		}
		if !s.otpMatches(otp, d.PickupOTP) {
			return nil, fail(422, "That code is not correct. Please try again.")
		}
		if d.Status == StatusRiderArrivedPickup {
			if err := s.ApplyStatus(ctx, d, StatusPickupVerification, "Pickup verification started"); err != nil {
				return nil, err
			}
		}
		if err := s.ApplyStatus(ctx, d, StatusPickedUp, "Pickup verified"); err != nil {
			return nil, err
		}
		return s.hydrateOne(ctx, d)
	}

	if d.Status == StatusDelivered {
		return s.hydrateOne(ctx, d)
	}
	if d.Status != StatusDeliveryVerification && d.Status != StatusNearDestination && d.Status != StatusInTransit {
		return nil, fail(409, "This delivery is not waiting for delivery verification.")
	}
	if !s.otpMatches(otp, d.DeliveryOTP) {
		return nil, fail(422, "That code is not correct. Please try again.")
	}
	if d.Status != StatusDeliveryVerification {
		if err := s.ApplyStatus(ctx, d, StatusDeliveryVerification, "Delivery verification started"); err != nil {
			return nil, err
		}
	}
	if err := s.ApplyStatus(ctx, d, StatusDelivered, "Delivered"); err != nil {
		return nil, err
	}
	return s.hydrateOne(ctx, d)
}

// Rate stores a customer rating for a completed delivery.
func (s *Service) Rate(ctx context.Context, d *Delivery, customerID uuid.UUID, stars int, comment string, tags []string) error {
	if stars < 1 || stars > 5 {
		return fail(422, "Please choose a rating from 1 to 5.")
	}
	if d.Status != StatusDelivered {
		return fail(409, "You can rate this delivery once it is complete.")
	}
	if d.CustomerID != customerID {
		return fail(403, "You don't have permission to rate this delivery.")
	}
	tagsJSON := "[]"
	if len(tags) > 0 {
		b, err := json.Marshal(tags)
		if err == nil {
			tagsJSON = string(b)
		}
	}
	row := map[string]interface{}{
		"delivery_id": d.ID, "customer_id": customerID, "rider_id": d.RiderID,
		"stars": stars, "comment": comment, "tags": tagsJSON,
	}
	if d.RiderID == nil {
		return fail(409, "This delivery has no rider to rate.")
	}
	if err := s.db.WithContext(ctx).Table("ratings").Create(row).Error; err != nil {
		return fail(500, "Something went wrong. Please try again.")
	}
	return nil
}

// AssignRider sets the rider (admin action) and advances CREATED/SEARCHING
// deliveries to RIDER_ASSIGNED.
func (s *Service) AssignRider(ctx context.Context, d *Delivery, riderUserID uuid.UUID, note string) (*DeliveryDTO, error) {
	var name string
	s.db.WithContext(ctx).Table("users").Where("id = ?", riderUserID).Pluck("name", &name)
	if name == "" {
		return nil, fail(404, "We couldn't find that rider.")
	}
	if d.Status == StatusDelivered || d.Status == StatusCancelled || d.Status == StatusFailed {
		return nil, fail(409, "This delivery can no longer be assigned.")
	}

	now := time.Now().UTC()
	if err := s.db.WithContext(ctx).Model(&Delivery{}).Where("id = ?", d.ID).
		Updates(map[string]interface{}{"rider_id": riderUserID, "updated_at": now}).Error; err != nil {
		return nil, fail(500, "Something went wrong. Please try again.")
	}
	d.RiderID = &riderUserID
	s.db.WithContext(ctx).Model(&DeliveryAssignment{}).
		Where("delivery_id = ? AND rider_id <> ? AND status = 'PENDING'", d.ID, riderUserID).
		Update("status", "EXPIRED")

	if d.Status == StatusCreated {
		if err := s.ApplyStatus(ctx, d, StatusSearchingRider, ""); err != nil {
			return nil, err
		}
	}
	if d.Status == StatusSearchingRider || d.Status == StatusDraft {
		if note == "" {
			note = fmt.Sprintf("%s assigned by admin", name)
		}
		if err := s.ApplyStatus(ctx, d, StatusRiderAssigned, note); err != nil {
			return nil, err
		}
	}
	s.notifyRider(ctx, riderUserID, "admin.assigned", "Delivery assigned",
		fmt.Sprintf("You've been assigned %s.", d.Reference),
		map[string]any{"delivery_id": d.ID})
	return s.hydrateOne(ctx, d)
}

// ---------- rider offers ----------

type offerCandidate struct {
	UserID uuid.UUID
	Lat    float64
	Lng    float64
	Dist   float64
}

// startOffers ranks online riders and creates TTL-bound offers for a delivery
// that entered SEARCHING_RIDER.
func (s *Service) startOffers(ctx context.Context, deliveryID uuid.UUID) {
	var d Delivery
	if err := s.db.WithContext(ctx).First(&d, "id = ?", deliveryID).Error; err != nil {
		return
	}
	if d.Status != StatusSearchingRider || d.RiderID != nil {
		return
	}
	online, err := s.presence.OnlineRiderIDs(ctx)
	if err != nil || len(online) == 0 {
		return
	}
	var candidates []offerCandidate
	if err := s.db.WithContext(ctx).Table("riders").
		Select("riders.user_id, riders.lat, riders.lng").
		Where("riders.user_id IN ? AND riders.is_verified AND NOT riders.is_suspended", online).
		Scan(&candidates).Error; err != nil {
		return
	}
	pickup := Geo{Lat: d.PickupLat, Lng: d.PickupLng}
	for i := range candidates {
		candidates[i].Dist = haversineKm(pickup, Geo{Lat: candidates[i].Lat, Lng: candidates[i].Lng})
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].Dist < candidates[j].Dist })

	// Riders who already saw this delivery (accepted/rejected/expired) are skipped.
	var seenRiders []uuid.UUID
	s.db.WithContext(ctx).Table("delivery_assignments").
		Where("delivery_id = ?", d.ID).Pluck("rider_id", &seenRiders)
	seen := map[uuid.UUID]bool{}
	for _, id := range seenRiders {
		seen[id] = true
	}

	now := time.Now().UTC()
	expires := now.Add(s.cfg.OfferTTL)
	created := 0
	for _, c := range candidates {
		if created >= 5 {
			break
		}
		if seen[c.UserID] {
			continue
		}
		var pending int64
		s.db.WithContext(ctx).Table("delivery_assignments").
			Where("rider_id = ? AND status = 'PENDING' AND expires_at > now()", c.UserID).Count(&pending)
		if pending >= 3 {
			continue
		}
		offer := DeliveryAssignment{
			DeliveryID: d.ID, RiderID: c.UserID, Status: "PENDING",
			OfferedAt: now, ExpiresAt: &expires, CreatedAt: now,
		}
		if err := s.db.WithContext(ctx).Create(&offer).Error; err != nil {
			continue
		}
		created++
		s.emitOffer(ctx, &d, &offer)
	}
}

func (s *Service) emitOffer(ctx context.Context, d *Delivery, o *DeliveryAssignment) {
	earnings := int64(math.Round(float64(d.PriceMinor) * 0.8))
	data := map[string]any{
		"offer_id":       o.ID,
		"delivery_id":    d.ID,
		"pickup_addr":    d.PickupAddr,
		"dropoff_addr":   d.DropoffAddr,
		"distance_km":    d.DistanceKm,
		"earnings_minor": earnings,
		"currency":       "INR",
		"package_type":   d.PackageType,
		"customer_rating": nil,
	}
	if o.ExpiresAt != nil {
		data["expires_at"] = o.ExpiresAt.UTC().Format(time.RFC3339Nano)
	}
	env := events.New("rider.delivery_offer", "delivery", d.ID, data)
	room := events.UserRoom(o.RiderID)
	if err := s.bus.Publish(ctx, events.ChannelRider, env, room, "admin"); err != nil {
		s.log.Warn("offer publish failed", "err", err)
	}
	s.notifyRider(ctx, o.RiderID, "rider.delivery_offer", "New delivery nearby",
		fmt.Sprintf("%s → %s", d.PickupAddr, d.DropoffAddr), data)
}

// ListOffers returns pending, unexpired offers for a rider.
func (s *Service) ListOffers(ctx context.Context, riderUserID uuid.UUID) ([]map[string]any, error) {
	var offers []DeliveryAssignment
	err := s.db.WithContext(ctx).
		Where("rider_id = ? AND status = 'PENDING' AND expires_at > now()", riderUserID).
		Order("offered_at DESC").
		Find(&offers).Error
	if err != nil {
		return nil, fail(500, "Something went wrong. Please try again.")
	}
	out := []map[string]any{}
	if len(offers) == 0 {
		return out, nil
	}
	ids := make([]uuid.UUID, 0, len(offers))
	for _, o := range offers {
		ids = append(ids, o.DeliveryID)
	}
	var dels []Delivery
	if err := s.db.WithContext(ctx).Where("id IN ?", ids).Find(&dels).Error; err != nil {
		return nil, fail(500, "Something went wrong. Please try again.")
	}
	byID := map[uuid.UUID]*Delivery{}
	for i := range dels {
		byID[dels[i].ID] = &dels[i]
	}
	for _, o := range offers {
		d, ok := byID[o.DeliveryID]
		if !ok {
			continue
		}
		out = append(out, map[string]any{
			"id":              o.ID,
			"delivery_id":     d.ID,
			"pickup_addr":     d.PickupAddr,
			"dropoff_addr":    d.DropoffAddr,
			"distance_km":     d.DistanceKm,
			"earnings_minor":  int64(math.Round(float64(d.PriceMinor) * 0.8)),
			"currency":        "INR",
			"package_type":    d.PackageType,
			"customer_rating": nil,
			"expires_at":      o.ExpiresAt,
		})
	}
	return out, nil
}

// AcceptOffer claims a delivery for the rider under a distributed lock.
func (s *Service) AcceptOffer(ctx context.Context, offerID uuid.UUID, riderUserID uuid.UUID) (*DeliveryDTO, error) {
	var offer DeliveryAssignment
	if err := s.db.WithContext(ctx).First(&offer, "id = ?", offerID).Error; err != nil {
		return nil, fail(409, "This request is no longer available.")
	}
	run := func() (*DeliveryDTO, error) {
		if offer.Status != "PENDING" {
			return nil, fail(409, "This request is no longer available.")
		}
		if offer.ExpiresAt != nil && offer.ExpiresAt.Before(time.Now().UTC()) {
			s.db.WithContext(ctx).Model(&DeliveryAssignment{}).Where("id = ?", offer.ID).
				Update("status", "EXPIRED")
			return nil, fail(409, "This request expired before you accepted it.")
		}
		var d Delivery
		if err := s.db.WithContext(ctx).First(&d, "id = ?", offer.DeliveryID).Error; err != nil {
			return nil, fail(404, "We couldn't find that delivery.")
		}
		if d.RiderID != nil {
			return nil, fail(409, "Another rider already accepted this delivery.")
		}
		if IsTerminal(d.Status) {
			return nil, fail(409, "This request is no longer available.")
		}

		now := time.Now().UTC()
		err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&DeliveryAssignment{}).Where("id = ?", offer.ID).
				Updates(map[string]interface{}{"status": "ACCEPTED", "accepted": true, "responded_at": now}).Error; err != nil {
				return err
			}
			if err := tx.Model(&DeliveryAssignment{}).
				Where("delivery_id = ? AND status = 'PENDING' AND id <> ?", d.ID, offer.ID).
				Update("status", "EXPIRED").Error; err != nil {
				return err
			}
			res := tx.Model(&Delivery{}).Where("id = ? AND rider_id IS NULL", d.ID).
				Updates(map[string]interface{}{"rider_id": riderUserID, "updated_at": now})
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return errRace
			}
			return nil
		})
		if err != nil {
			if errors.Is(err, errRace) {
				return nil, fail(409, "Another rider already accepted this delivery.")
			}
			return nil, fail(500, "Something went wrong. Please try again.")
		}
		d.RiderID = &riderUserID
		if d.Status == StatusSearchingRider || d.Status == StatusCreated || d.Status == StatusDraft {
			if err := s.ApplyStatus(ctx, &d, StatusRiderAssigned, "Rider accepted"); err != nil {
				return nil, err
			}
		}
		return s.hydrateOne(ctx, &d)
	}

	if s.rdb != nil {
		lockKey := "lock:delivery:" + offer.DeliveryID.String()
		ok, err := s.rdb.SetNX(ctx, lockKey, "1", s.cfg.LockTTL).Result()
		if err != nil {
			// Redis down: fall through without the lock rather than failing the accept.
			s.log.Warn("redis lock unavailable", "err", err)
			return run()
		}
		if !ok {
			return nil, fail(409, "This request is no longer available.")
		}
		defer s.rdb.Del(ctx, lockKey)
		return run()
	}
	return run()
}

var errRace = errors.New("rider already assigned")

// RejectOffer marks an offer rejected (idempotent).
func (s *Service) RejectOffer(ctx context.Context, offerID uuid.UUID) error {
	s.db.WithContext(ctx).Model(&DeliveryAssignment{}).
		Where("id = ? AND status = 'PENDING'", offerID).
		Updates(map[string]interface{}{"status": "REJECTED", "responded_at": time.Now().UTC()})
	return nil
}

// ExpireOffers is the background sweeper: stale offers expire and deliveries
// still searching get re-matched with riders that have not seen them yet.
func (s *Service) ExpireOffers(ctx context.Context) {
	s.db.WithContext(ctx).Exec(`UPDATE delivery_assignments SET status = 'EXPIRED'
		WHERE status = 'PENDING' AND expires_at IS NOT NULL AND expires_at < now()`)

	var ids []uuid.UUID
	s.db.WithContext(ctx).Raw(`SELECT d.id FROM deliveries d
		WHERE d.status = 'SEARCHING_RIDER' AND d.rider_id IS NULL
		AND NOT EXISTS (
			SELECT 1 FROM delivery_assignments a
			WHERE a.delivery_id = d.id AND a.status = 'PENDING' AND a.expires_at > now())`).Scan(&ids)
	for _, id := range ids {
		s.startOffers(ctx, id)
	}
}

// OfferToRider pushes every currently-searching delivery to one rider (used
// when a rider flips to ONLINE).
func (s *Service) OfferToRider(ctx context.Context, riderUserID uuid.UUID) {
	var ids []uuid.UUID
	s.db.WithContext(ctx).Raw(`SELECT id FROM deliveries
		WHERE status = 'SEARCHING_RIDER' AND rider_id IS NULL`).Scan(&ids)
	for _, id := range ids {
		var d Delivery
		if err := s.db.WithContext(ctx).First(&d, "id = ?", id).Error; err != nil {
			continue
		}
		var seen int64
		s.db.WithContext(ctx).Table("delivery_assignments").
			Where("delivery_id = ? AND rider_id = ?", d.ID, riderUserID).Count(&seen)
		if seen > 0 {
			continue
		}
		now := time.Now().UTC()
		expires := now.Add(s.cfg.OfferTTL)
		offer := DeliveryAssignment{
			DeliveryID: d.ID, RiderID: riderUserID, Status: "PENDING",
			OfferedAt: now, ExpiresAt: &expires, CreatedAt: now,
		}
		if err := s.db.WithContext(ctx).Create(&offer).Error; err != nil {
			continue
		}
		s.emitOffer(ctx, &d, &offer)
	}
}

// ---------- conversation ----------

func (s *Service) ensureConversation(ctx context.Context, d *Delivery) {
	if d.RiderID == nil {
		return
	}
	var id uuid.UUID
	err := s.db.WithContext(ctx).Table("conversations").
		Where("delivery_id = ?", d.ID).Pluck("id", &id).Error
	if err != nil || id != uuid.Nil {
		return
	}
	now := time.Now().UTC()
	conv := struct {
		ID         uuid.UUID
		DeliveryID uuid.UUID
		CreatedAt  time.Time
		UpdatedAt  time.Time
	}{ID: uuid.New(), DeliveryID: d.ID, CreatedAt: now, UpdatedAt: now}
	if err := s.db.WithContext(ctx).Table("conversations").Create(conv).Error; err != nil {
		return
	}
	for _, uid := range []uuid.UUID{d.CustomerID, *d.RiderID} {
		s.db.WithContext(ctx).Exec(
			`INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)
			 ON CONFLICT DO NOTHING`, conv.ID, uid, now)
	}
}

// ---------- live location ----------

// HandleLocation stores the rider's GPS fix in Redis and fans it out to the
// customer map (never written to PostgreSQL).
func (s *Service) HandleLocation(ctx context.Context, riderUserID uuid.UUID, p LocationUpdate) error {
	var d Delivery
	if err := s.db.WithContext(ctx).First(&d, "id = ?", p.DeliveryID).Error; err != nil {
		return fail(404, "We couldn't find that delivery.")
	}
	if d.RiderID == nil || *d.RiderID != riderUserID {
		return fail(403, "You don't have permission to update this delivery.")
	}
	_ = s.presence.SaveLocation(ctx, d.ID, p.Lat, p.Lng, p.Heading, p.Speed, p.Accuracy)

	data := map[string]any{
		"delivery_id": d.ID, "lat": p.Lat, "lng": p.Lng,
		"heading": p.Heading, "speed": p.Speed, "accuracy": p.Accuracy,
		"ts": time.Now().UnixMilli(),
	}
	rooms := []string{"delivery:" + d.ID.String(), "admin", "support", events.UserRoom(d.CustomerID)}
	env := events.New("rider.location_updated", "delivery", d.ID, data)
	if err := s.bus.Publish(ctx, events.ChannelRider, env, rooms...); err != nil {
		return err
	}
	return nil
}

type LocationUpdate struct {
	DeliveryID uuid.UUID
	Lat        float64
	Lng        float64
	Heading    float64
	Speed      float64
	Accuracy   float64
}

