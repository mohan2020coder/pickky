package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"pickky/backend/internal/auth"
)

const seedPassword = "pass1234"
const demoPhone = "9000000001"

const (
	day = 24 * time.Hour
	h   = time.Hour
	m   = time.Minute
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func fatal(step string, err error) {
	fmt.Fprintf(os.Stderr, "seed: %s: %v\n", step, err)
	os.Exit(1)
}

func lookupID(db *gorm.DB, query string, args ...any) (uuid.UUID, bool) {
	var id uuid.UUID
	if err := db.Raw(query, args...).Row().Scan(&id); err != nil {
		return uuid.Nil, false
	}
	return id, true
}

func countRows(db *gorm.DB, table string) int64 {
	var n int64
	if err := db.Raw("SELECT COUNT(*) FROM " + table).Scan(&n).Error; err != nil {
		return -1
	}
	return n
}

type seedUser struct {
	Phone string
	Name  string
	Email string
	Role  string
	ID    uuid.UUID
}

var seedUsers = []seedUser{
	{Phone: "9000000001", Name: "Aarav Mehta", Email: "aarav@pickky.app", Role: "CUSTOMER"},
	{Phone: "9000000005", Name: "Diya Sharma", Email: "diya@pickky.app", Role: "CUSTOMER"},
	{Phone: "9000000006", Name: "Vikram Singh", Email: "vikram@pickky.app", Role: "CUSTOMER"},
	{Phone: "9000000002", Name: "Rajesh Kumar", Email: "rajesh@pickky.app", Role: "RIDER"},
	{Phone: "9000000007", Name: "Suresh Babu", Email: "suresh@pickky.app", Role: "RIDER"},
	{Phone: "9000000008", Name: "Imran Khan", Email: "imran@pickky.app", Role: "RIDER"},
	{Phone: "9000000009", Name: "Priya Nair", Email: "priya@pickky.app", Role: "RIDER"},
	{Phone: "9000000010", Name: "Manoj Yadav", Email: "manoj@pickky.app", Role: "RIDER"},
	{Phone: "9000000003", Name: "Admin Workspace", Email: "admin@pickky.app", Role: "ADMIN"},
	{Phone: "9000000004", Name: "Support Desk", Email: "support@pickky.app", Role: "SUPPORT"},
}

type riderSpec struct {
	Phone     string
	Status    string
	Vehicle   string
	Plate     string
	Lat       float64
	Lng       float64
	Verified  bool
	Suspended bool
}

var riderSpecs = []riderSpec{
	{Phone: "9000000002", Status: "ONLINE", Vehicle: "Bike", Plate: "KA-01-HH-1001", Lat: 12.9352, Lng: 77.6245, Verified: true},
	{Phone: "9000000007", Status: "OFFLINE", Vehicle: "Bike", Plate: "KA-01-HH-1002", Lat: 12.9081, Lng: 77.6476, Verified: true},
	{Phone: "9000000008", Status: "OFFLINE", Vehicle: "Scooter", Plate: "KA-01-HH-1003", Lat: 12.9756, Lng: 77.6063, Verified: true, Suspended: true},
	{Phone: "9000000009", Status: "OFFLINE", Vehicle: "Bicycle", Plate: "KA-01-HH-1004", Lat: 12.9719, Lng: 77.6412, Verified: true},
	{Phone: "9000000010", Status: "OFFLINE", Vehicle: "Bike", Plate: "KA-01-HH-1005", Lat: 12.925, Lng: 77.5938},
}

type place struct {
	Name string
	Addr string
	Lat  float64
	Lng  float64
}

func pl(name, addr string, lat, lng float64) place {
	return place{Name: name, Addr: addr, Lat: lat, Lng: lng}
}

var routePairs = [][2]place{
	{
		pl("Koramangala 4th Block", "4th Block, Koramangala, Bengaluru", 12.9352, 77.6245),
		pl("Indiranagar 100ft Rd", "100ft Road, Indiranagar, Bengaluru", 12.9719, 77.6412),
	},
	{
		pl("MG Road Metro", "MG Road Metro Station, Bengaluru", 12.9756, 77.6063),
		pl("Jayanagar 4th Block", "4th Block, Jayanagar, Bengaluru", 12.925, 77.5938),
	},
	{
		pl("HSR Sector 2", "Sector 2, HSR Layout, Bengaluru", 12.9081, 77.6476),
		pl("Domlur", "Domlur, Bengaluru", 12.9356, 77.6408),
	},
	{
		pl("Whitefield ITPL", "ITPL Main Road, Whitefield, Bengaluru", 12.9698, 77.75),
		pl("Bellandur ORR", "Outer Ring Road, Bellandur, Bengaluru", 12.9305, 77.6784),
	},
	{
		pl("Embassy Tech Village", "Embassy Tech Village, Outer Ring Rd, Bengaluru", 12.9855, 77.6682),
		pl("Yelahanka New Town", "Yelahanka New Town, Bengaluru", 13.1005, 77.5963),
	},
}

var statusPath = []string{
	"CREATED",
	"SEARCHING_RIDER",
	"RIDER_ASSIGNED",
	"RIDER_ARRIVING_PICKUP",
	"RIDER_ARRIVED_PICKUP",
	"PICKUP_VERIFICATION",
	"PICKED_UP",
	"IN_TRANSIT",
	"NEAR_DESTINATION",
	"DELIVERY_VERIFICATION",
	"DELIVERED",
}

var statusNotes = map[string]string{
	"CREATED":               "Delivery created",
	"SEARCHING_RIDER":       "Finding a rider",
	"RIDER_ASSIGNED":        "Rider accepted",
	"RIDER_ARRIVING_PICKUP": "Rider heading to pickup",
	"RIDER_ARRIVED_PICKUP":  "Rider arrived",
	"PICKUP_VERIFICATION":   "Pickup verified",
	"PICKED_UP":             "Item picked up",
	"IN_TRANSIT":            "On the way",
	"NEAR_DESTINATION":      "Near destination",
	"DELIVERY_VERIFICATION": "Verifying delivery",
	"DELIVERED":             "Delivered",
}

func pathIndex(s string) int {
	for i, v := range statusPath {
		if v == s {
			return i
		}
	}
	return -1
}

var packageTypes = []string{"document", "parcel", "groceries", "medicine", "keys", "clothes"}

var instructionsList = []string{
	"Call before arriving",
	"Leave at the reception if no answer",
	"Handle with care, fragile contents",
	"Hand over to the security desk",
	"",
}

var itemDescs = []string{
	"Laptop charger",
	"Documents",
	"Medicines",
	"Groceries bag",
	"House keys",
	"Office files",
	"Phone accessories",
	"Clothes",
}

var riderCycle = []int{0, 1, 0, 2, 0, 1, 2, 0, 1, 0, 2, 1, 0, 2, 0, 0, 1, 2, 0, 0}

func haversineKm(lat1, lng1, lat2, lng2 float64) float64 {
	const earth = 6371.0
	rad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := rad(lat2 - lat1)
	dLng := rad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(rad(lat1))*math.Cos(rad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earth * c
}

type plan struct {
	Status       string
	Pair         int
	CreatedAgo   time.Duration
	EndAgo       time.Duration
	NoRider      bool
	Prefix       int
	Note         string
	CancelReason string
}

var plans = []plan{
	{Status: "DELIVERED", Pair: 0, CreatedAgo: 336 * h, EndAgo: 336*h - 45*m},
	{Status: "DELIVERED", Pair: 1, CreatedAgo: 312 * h, EndAgo: 312*h - 45*m},
	{Status: "DELIVERED", Pair: 2, CreatedAgo: 276 * h, EndAgo: 276*h - 45*m},
	{Status: "DELIVERED", Pair: 3, CreatedAgo: 240 * h, EndAgo: 240*h - 45*m},
	{Status: "DELIVERED", Pair: 4, CreatedAgo: 204 * h, EndAgo: 204*h - 45*m},
	{Status: "DELIVERED", Pair: 0, CreatedAgo: 168 * h, EndAgo: 168*h - 45*m},
	{Status: "DELIVERED", Pair: 1, CreatedAgo: 132 * h, EndAgo: 132*h - 45*m},
	{Status: "DELIVERED", Pair: 2, CreatedAgo: 96 * h, EndAgo: 96*h - 45*m},
	{Status: "CANCELLED", Pair: 3, CreatedAgo: 84 * h, EndAgo: 84*h - 30*m, Prefix: 3, Note: "Cancelled by customer", CancelReason: "Cancelled by customer"},
	{Status: "CANCELLED", Pair: 4, CreatedAgo: 72 * h, EndAgo: 72*h - 45*m, Prefix: 4, Note: "Cancelled by customer", CancelReason: "Cancelled by customer"},
	{Status: "FAILED", Pair: 0, CreatedAgo: 60 * h, EndAgo: 60*h - 60*m, Prefix: 8, Note: "Delivery failed"},
	{Status: "DELIVERY_VERIFICATION", Pair: 1, CreatedAgo: 6 * h, EndAgo: 3 * m},
	{Status: "IN_TRANSIT", Pair: 2, CreatedAgo: 4 * h, EndAgo: 6 * m},
	{Status: "IN_TRANSIT", Pair: 3, CreatedAgo: 3 * h, EndAgo: 9 * m},
	{Status: "PICKED_UP", Pair: 4, CreatedAgo: 150 * m, EndAgo: 12 * m},
	{Status: "PICKUP_VERIFICATION", Pair: 0, CreatedAgo: 120 * m, EndAgo: 15 * m},
	{Status: "RIDER_ARRIVED_PICKUP", Pair: 1, CreatedAgo: 90 * m, EndAgo: 18 * m},
	{Status: "RIDER_ARRIVING_PICKUP", Pair: 2, CreatedAgo: 75 * m, EndAgo: 22 * m},
	{Status: "RIDER_ARRIVING_PICKUP", Pair: 3, CreatedAgo: 60 * m, EndAgo: 26 * m},
	{Status: "SEARCHING_RIDER", Pair: 4, CreatedAgo: 45 * m, EndAgo: 38 * m, NoRider: true},
	{Status: "SEARCHING_RIDER", Pair: 0, CreatedAgo: 40 * m, EndAgo: 33 * m},
	{Status: "CREATED", Pair: 1, CreatedAgo: 12 * m, EndAgo: 12 * m, NoRider: true},
}

type deliveryRec struct {
	ID          uuid.UUID
	Ref         string
	CustomerID  uuid.UUID
	RiderID     *uuid.UUID
	Status      string
	Pickup      place
	Dropoff     place
	Price       int64
	CreatedAt   time.Time
	EndAt       time.Time
	Times       map[string]time.Time
	DeliveredAt *time.Time
}

func main() {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		env("DB_HOST", "localhost"),
		env("DB_PORT", "5433"),
		env("DB_USER", "pickky"),
		env("DB_PASSWORD", "pickky"),
		env("DB_NAME", "pickky"),
		env("DB_SSLMODE", "disable"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		fatal("connect", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		fatal("sql db", err)
	}
	defer sqlDB.Close()
	if err := sqlDB.Ping(); err != nil {
		fatal("ping", err)
	}

	var existing int64
	if err := db.Raw(`SELECT COUNT(*) FROM users WHERE phone = ?`, demoPhone).Scan(&existing).Error; err != nil {
		fatal("check seed state", err)
	}
	if existing > 0 {
		fmt.Println("seed: already seeded")
		os.Exit(0)
	}

	if err := auth.EnsureRoles(db); err != nil {
		fatal("ensure roles", err)
	}
	fmt.Println("seed: roles ensured")

	roles := map[string]uuid.UUID{}
	for _, r := range []string{"CUSTOMER", "RIDER", "ADMIN", "SUPPORT"} {
		id, ok := lookupID(db, `SELECT id FROM roles WHERE name = ?`, r)
		if !ok {
			fatal("load roles", fmt.Errorf("role %s not found", r))
		}
		roles[r] = id
	}

	seedUserRows(db, roles)
	seedRiderRows(db)

	customers := []uuid.UUID{seedUsers[0].ID, seedUsers[1].ID, seedUsers[2].ID}
	activeRiders := []uuid.UUID{seedUsers[3].ID, seedUsers[4].ID, seedUsers[6].ID}
	supportID := seedUsers[9].ID

	recs := seedDeliveries(db, customers, activeRiders)
	seedPayments(db, recs)
	seedRatings(db, recs)
	seedConversations(db, recs)
	seedNotifications(db, recs)
	seedTickets(db, customers, supportID, recs)
	seedSavedAddresses(db, customers[0])
	printSummary(db)
}

func seedUserRows(db *gorm.DB, roles map[string]uuid.UUID) {
	hash, err := auth.HashPassword(seedPassword)
	if err != nil {
		fatal("hash password", err)
	}
	for i := range seedUsers {
		u := &seedUsers[i]
		u.ID = uuid.New()
		created := time.Now().UTC().Add(-time.Duration(40-2*i) * day)
		if err := db.Exec(`INSERT INTO users (id, phone, name, email, password, is_active, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, true, ?, ?)
			ON CONFLICT (phone) DO NOTHING`,
			u.ID, u.Phone, u.Name, u.Email, hash, created, created).Error; err != nil {
			fatal("insert user "+u.Phone, err)
		}
		id, ok := lookupID(db, `SELECT id FROM users WHERE phone = ?`, u.Phone)
		if !ok {
			fatal("insert user "+u.Phone, fmt.Errorf("user not found after insert"))
		}
		u.ID = id
		if err := db.Exec(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)
			ON CONFLICT DO NOTHING`, u.ID, roles[u.Role]).Error; err != nil {
			fatal("assign role "+u.Phone, err)
		}
	}
	fmt.Printf("seed: users (%d) with roles\n", len(seedUsers))
}

func seedRiderRows(db *gorm.DB) {
	now := time.Now().UTC()
	for _, r := range riderSpecs {
		uid := uuid.Nil
		for _, u := range seedUsers {
			if u.Phone == r.Phone {
				uid = u.ID
			}
		}
		var lastLoc any
		if r.Status == "ONLINE" {
			lastLoc = now
		}
		if err := db.Exec(`INSERT INTO riders (id, user_id, status, vehicle_type, license_plate, lat, lng,
			last_location_at, is_verified, is_suspended, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (user_id) DO NOTHING`,
			uuid.New(), uid, r.Status, r.Vehicle, r.Plate, r.Lat, r.Lng,
			lastLoc, r.Verified, r.Suspended, now.Add(-30*day), now).Error; err != nil {
			fatal("insert rider "+r.Phone, err)
		}
	}
	fmt.Printf("seed: riders (%d)\n", len(riderSpecs))
}

type histRow struct {
	status string
	note   string
	at     time.Time
}

func seedDeliveries(db *gorm.DB, customers []uuid.UUID, activeRiders []uuid.UUID) []deliveryRec {
	now := time.Now().UTC()
	var recs []deliveryRec
	riderPos := 0
	for i, p := range plans {
		ref := fmt.Sprintf("DLV-%d", 1001+i)
		if _, ok := lookupID(db, `SELECT id FROM deliveries WHERE reference = ?`, ref); ok {
			fmt.Printf("seed: %s exists, skipped\n", ref)
			continue
		}
		route := routePairs[p.Pair]
		pickup, dropoff := route[0], route[1]
		rawKm := haversineKm(pickup.Lat, pickup.Lng, dropoff.Lat, dropoff.Lng) * 1.3
		distKm := math.Round(rawKm*10) / 10
		price := 4000 + int64(math.Floor(rawKm*1500))
		created := now.Add(-p.CreatedAgo)
		end := now.Add(-p.EndAgo)

		var riderArg any
		var riderID *uuid.UUID
		if !p.NoRider {
			rid := activeRiders[riderCycle[riderPos%len(riderCycle)]%len(activeRiders)]
			riderPos++
			riderArg = rid
			riderID = &rid
		}

		var entries []string
		if p.Status == "CANCELLED" || p.Status == "FAILED" {
			entries = append(append([]string{}, statusPath[:p.Prefix]...), p.Status)
		} else {
			idx := pathIndex(p.Status)
			if idx < 0 {
				fatal("plan", fmt.Errorf("unknown status %s", p.Status))
			}
			entries = statusPath[:idx+1]
		}

		times := map[string]time.Time{}
		var hist []histRow
		span := end.Sub(created)
		for j, st := range entries {
			t := created
			if len(entries) > 1 {
				t = created.Add(time.Duration(float64(span) * float64(j) / float64(len(entries)-1)))
			}
			note := statusNotes[st]
			if j == len(entries)-1 && p.Note != "" {
				note = p.Note
			}
			times[st] = t
			hist = append(hist, histRow{status: st, note: note, at: t})
		}

		var pickupVerified, deliveredAt, cancelledAt *time.Time
		if t, ok := times["PICKUP_VERIFICATION"]; ok {
			pickupVerified = &t
		}
		if t, ok := times["DELIVERED"]; ok {
			deliveredAt = &t
		}
		if p.Status == "CANCELLED" {
			cancelledAt = &end
		}

		pu := (4821 + i*1723) % 10000
		do := (pu + 517 + i*7) % 10000
		if do == pu {
			do = (do + 137) % 10000
		}
		deliveryID := uuid.New()
		statusChanged := hist[len(hist)-1].at

		if err := db.Exec(`INSERT INTO deliveries (id, customer_id, rider_id, status,
			pickup_lat, pickup_lng, pickup_addr, dropoff_lat, dropoff_lng, dropoff_addr,
			instructions, reference, package_type, price_minor, distance_km,
			pickup_otp, delivery_otp, pickup_verified_at, delivered_at, cancelled_at,
			cancel_reason, status_changed_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			deliveryID, customers[i%len(customers)], riderArg, p.Status,
			pickup.Lat, pickup.Lng, pickup.Addr, dropoff.Lat, dropoff.Lng, dropoff.Addr,
			instructionsList[i%len(instructionsList)], ref, packageTypes[i%len(packageTypes)],
			price, distKm, fmt.Sprintf("%04d", pu), fmt.Sprintf("%04d", do),
			pickupVerified, deliveredAt, cancelledAt, p.CancelReason,
			statusChanged, created, statusChanged).Error; err != nil {
			fatal("insert delivery "+ref, err)
		}

		itemCount := 1 + i%2
		for k := 0; k < itemCount; k++ {
			desc := itemDescs[(i+k*3)%len(itemDescs)]
			qty := 1 + (i+k)%2
			weight := 0.3 + float64((i*7+k*3)%22)/10
			fragile := (i+k)%3 == 0
			if err := db.Exec(`INSERT INTO delivery_items (id, delivery_id, description, quantity, weight_kg, fragile, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				uuid.New(), deliveryID, desc, qty, weight, fragile, created).Error; err != nil {
				fatal("insert item "+ref, err)
			}
		}

		for _, hr := range hist {
			if err := db.Exec(`INSERT INTO delivery_status_history (id, delivery_id, status, note, created_at)
				VALUES (?, ?, ?, ?, ?)`, uuid.New(), deliveryID, hr.status, hr.note, hr.at).Error; err != nil {
				fatal("insert history "+ref, err)
			}
		}

		recs = append(recs, deliveryRec{
			ID: deliveryID, Ref: ref, CustomerID: customers[i%len(customers)],
			RiderID: riderID, Status: p.Status, Pickup: pickup, Dropoff: dropoff,
			Price: price, CreatedAt: created, EndAt: end, Times: times, DeliveredAt: deliveredAt,
		})
	}
	fmt.Printf("seed: deliveries (%d) + items + status history\n", len(recs))
	return recs
}

var payMethods = []string{"UPI", "CARD", "WALLET"}

func seedPayments(db *gorm.DB, recs []deliveryRec) {
	for i, d := range recs {
		status := "PENDING"
		var captured, failed *time.Time
		updated := d.EndAt
		switch d.Status {
		case "DELIVERED":
			status = "CAPTURED"
			captured = d.DeliveredAt
			if captured != nil {
				updated = *captured
			}
		case "CANCELLED":
			if i%2 == 0 {
				status = "REFUNDED"
			} else {
				status = "FAILED"
				failed = &d.EndAt
			}
		case "FAILED":
			status = "FAILED"
			failed = &d.EndAt
		}
		if err := db.Exec(`INSERT INTO payments (id, delivery_id, amount_minor, currency, method,
			status, reference, created_at, updated_at, captured_at, failed_at)
			VALUES (?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?)`,
			uuid.New(), d.ID, d.Price, payMethods[i%len(payMethods)], status,
			"PAY-"+d.Ref, d.CreatedAt, updated, captured, failed).Error; err != nil {
			fatal("insert payment "+d.Ref, err)
		}
	}
	fmt.Printf("seed: payments (%d)\n", len(recs))
}

var ratingStars = []int{5, 4, 5, 3, 5, 4, 5, 5}
var ratingComments = []string{
	"Quick and careful",
	"Smooth handover",
	"On time as promised",
	"Pickup took a while",
	"Very polite rider",
	"Neat packaging",
	"Followed instructions",
	"Great communication",
}
var ratingTags = [][]string{
	{"quick", "careful"},
	{"smooth"},
	{"on_time"},
	{"slow_pickup"},
	{"friendly"},
	{"neat"},
	{"accurate"},
	{"communicative"},
}

func seedRatings(db *gorm.DB, recs []deliveryRec) {
	now := time.Now().UTC()
	r := 0
	for _, d := range recs {
		if d.Status != "DELIVERED" || d.RiderID == nil {
			continue
		}
		idx := r % len(ratingStars)
		tags, _ := json.Marshal(ratingTags[idx])
		createdAt := d.EndAt.Add(10 * m)
		if createdAt.After(now) {
			createdAt = now.Add(-2 * m)
		}
		if err := db.Exec(`INSERT INTO ratings (id, delivery_id, customer_id, rider_id, stars, comment, tags, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			uuid.New(), d.ID, d.CustomerID, *d.RiderID, ratingStars[idx],
			ratingComments[idx], string(tags), createdAt).Error; err != nil {
			fatal("insert rating "+d.Ref, err)
		}
		r++
	}
	fmt.Printf("seed: ratings (%d)\n", r)
}

var chatBodies = []string{
	"Hi, I'm on the way",
	"Please ring the bell at the gate",
	"Reached the pickup point",
	"Sure, I'll wait at the reception",
	"On the way to the dropoff",
	"Thanks!",
	"Can you leave it at the front desk?",
	"Almost there, 2 minutes away",
	"Please handle with care, it's fragile",
	"Appreciate the quick pickup!",
}

func seedConversations(db *gorm.DB, recs []deliveryRec) {
	now := time.Now().UTC()
	convCount := 0
	msgCount := 0
	bodyPos := 0
	for _, d := range recs {
		if d.RiderID == nil || d.Status == "CREATED" || d.Status == "SEARCHING_RIDER" {
			continue
		}
		if _, ok := lookupID(db, `SELECT id FROM conversations WHERE delivery_id = ?`, d.ID); ok {
			continue
		}
		convID := uuid.New()
		convStart := d.CreatedAt.Add(3 * m)
		n := 2 + convCount%5
		last := now.Add(-time.Duration(10+convCount%5*8) * m)
		first := convStart
		if last.Sub(first) > 2*h {
			first = last.Add(-2 * h)
		}
		if first.After(last) {
			first = last
		}
		if err := db.Exec(`INSERT INTO conversations (id, delivery_id, created_at, updated_at)
			VALUES (?, ?, ?, ?)`, convID, d.ID, convStart, last).Error; err != nil {
			fatal("insert conversation "+d.Ref, err)
		}
		for _, uid := range []uuid.UUID{d.CustomerID, *d.RiderID} {
			if err := db.Exec(`INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
				VALUES (?, ?, ?) ON CONFLICT DO NOTHING`, convID, uid, convStart).Error; err != nil {
				fatal("insert participant "+d.Ref, err)
			}
		}
		unread := min(2, n-1)
		customerFirst := convCount%2 == 0
		for k := 0; k < n; k++ {
			t := last
			if n > 1 {
				t = first.Add(time.Duration(float64(last.Sub(first)) * float64(k) / float64(n-1)))
			}
			sender := d.CustomerID
			isCustomerTurn := k%2 == 0
			if customerFirst != isCustomerTurn {
				sender = *d.RiderID
			}
			var readAt *time.Time
			if k < n-unread {
				rt := t.Add(5 * m)
				if rt.After(now.Add(-m)) {
					rt = now.Add(-m)
				}
				readAt = &rt
			}
			body := chatBodies[bodyPos%len(chatBodies)]
			bodyPos++
			if err := db.Exec(`INSERT INTO messages (id, conversation_id, sender_id, body, read_at, created_at)
				VALUES (?, ?, ?, ?, ?, ?)`, uuid.New(), convID, sender, body, readAt, t).Error; err != nil {
				fatal("insert message "+d.Ref, err)
			}
			msgCount++
		}
		convCount++
	}
	fmt.Printf("seed: conversations (%d) with messages (%d)\n", convCount, msgCount)
}

type notifSpec struct {
	UserID     uuid.UUID
	Type       string
	Title      string
	Message    string
	DeliveryID uuid.UUID
	At         time.Time
}

func seedNotifications(db *gorm.DB, recs []deliveryRec) {
	now := time.Now().UTC()
	var specs []notifSpec
	add := func(d deliveryRec, userID uuid.UUID, typ, title, msg string, at time.Time) {
		specs = append(specs, notifSpec{UserID: userID, Type: typ, Title: title, Message: msg, DeliveryID: d.ID, At: at})
	}

	for _, idx := range []int{14, 15, 16, 17, 18, 19, 20, 21} {
		d := recs[idx]
		msg := fmt.Sprintf("We're finding a rider for %s.", d.Ref)
		if d.Status != "CREATED" && d.Status != "SEARCHING_RIDER" {
			msg = fmt.Sprintf("Your delivery %s has been created.", d.Ref)
		}
		add(d, d.CustomerID, "delivery.created", "Delivery created", msg, d.CreatedAt)
	}
	for _, idx := range []int{1, 3, 5, 9, 11} {
		d := recs[idx]
		add(d, d.CustomerID, "delivery.rider_assigned", "Rider assigned",
			"Your rider is on the way.", d.Times["RIDER_ASSIGNED"])
	}
	for _, idx := range []int{11, 12, 14, 1} {
		d := recs[idx]
		add(d, d.CustomerID, "delivery.picked_up", "Item picked up",
			fmt.Sprintf("Your item for %s has been picked up.", d.Ref), d.Times["PICKED_UP"])
	}
	for _, idx := range []int{0, 1, 2, 3, 4, 5, 6, 7} {
		d := recs[idx]
		add(d, d.CustomerID, "delivery.delivered", "Delivery completed",
			fmt.Sprintf("Your delivery %s has been delivered.", d.Ref), d.Times["DELIVERED"])
	}
	for _, idx := range []int{0, 4, 9, 13, 15} {
		d := recs[idx]
		if d.RiderID == nil {
			continue
		}
		add(d, *d.RiderID, "rider.assigned", "Delivery accepted",
			fmt.Sprintf("Head to %s for pickup.", d.Pickup.Addr), d.Times["RIDER_ASSIGNED"])
	}
	for _, idx := range []int{11, 16, 17, 18} {
		d := recs[idx]
		if d.RiderID == nil {
			continue
		}
		add(d, *d.RiderID, "rider.delivery_offer", "New delivery nearby",
			fmt.Sprintf("%s -> %s", d.Pickup.Addr, d.Dropoff.Addr), d.Times["SEARCHING_RIDER"])
	}

	unread := 0
	for j, s := range specs {
		var readAt *time.Time
		if now.Sub(s.At) > 72*h || j%5 == 0 {
			rt := s.At.Add(15 * m)
			if rt.After(now.Add(-m)) {
				rt = now.Add(-m)
			}
			readAt = &rt
		} else {
			unread++
		}
		data := fmt.Sprintf(`{"delivery_id":"%s"}`, s.DeliveryID)
		if err := db.Exec(`INSERT INTO notifications (id, user_id, type, title, message, data, read_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			uuid.New(), s.UserID, s.Type, s.Title, s.Message, data, readAt, s.At).Error; err != nil {
			fatal("insert notification "+s.Type, err)
		}
	}
	fmt.Printf("seed: notifications (%d, %d unread)\n", len(specs), unread)
}

type ticketPlan struct {
	Ref             string
	Subject         string
	Status          string
	Priority        string
	Category        string
	CustomerIdx     int
	LinkedCancelled bool
	CreatedAgo      time.Duration
	LastAgo         time.Duration
	Bodies          []string
}

var ticketPlans = []ticketPlan{
	{
		Ref: "SUP-101", Subject: "Item damaged on arrival", Status: "OPEN",
		Priority: "HIGH", Category: "damaged", CustomerIdx: 0,
		CreatedAgo: 9 * day, LastAgo: 6 * h,
		Bodies: []string{
			"The package arrived with a torn box and the bottle inside was broken.",
			"I'm sorry about that. Could you share a photo of the damage?",
			"Just uploaded the photo to this ticket.",
			"Thanks, I've raised a refund on your payment method.",
		},
	},
	{
		Ref: "SUP-102", Subject: "Rider never arrived", Status: "OPEN",
		Priority: "HIGH", Category: "missing", CustomerIdx: 1,
		CreatedAgo: 7 * day, LastAgo: 20 * h,
		Bodies: []string{
			"My rider accepted the delivery but never showed up at pickup.",
			"Apologies for the delay. I've reassigned the delivery to another rider.",
			"Thanks, the new rider just called me.",
		},
	},
	{
		Ref: "SUP-103", Subject: "Wrong pickup address", Status: "IN_PROGRESS",
		Priority: "MEDIUM", Category: "general", CustomerIdx: 2,
		CreatedAgo: 5 * day, LastAgo: 28 * h,
		Bodies: []string{
			"The rider went to the wrong pickup address.",
			"Could you confirm the correct pickup point so we can update it?",
			"It's 5th Cross, Koramangala, not the office.",
		},
	},
	{
		Ref: "SUP-104", Subject: "Where is my refund?", Status: "IN_PROGRESS",
		Priority: "MEDIUM", Category: "payment", CustomerIdx: 0, LinkedCancelled: true,
		CreatedAgo: 3 * day, LastAgo: 40 * h,
		Bodies: []string{
			"My delivery was cancelled but I still don't see my refund.",
			"The cancellation fee has been waived and the refund is initiated.",
			"How long will it take to reflect?",
			"Refunds usually settle within 3-5 working days.",
		},
	},
	{
		Ref: "SUP-105", Subject: "App crashes when I open chat", Status: "RESOLVED",
		Priority: "LOW", Category: "app", CustomerIdx: 1,
		CreatedAgo: 2 * day, LastAgo: 30 * h,
		Bodies: []string{
			"The app crashes every time I open the chat screen.",
			"Thanks for reporting. Which app version are you on?",
			"Version 1.4.2 on Android.",
			"We've logged this with the team and will ship a fix in the next release.",
		},
	},
	{
		Ref: "SUP-106", Subject: "Change delivery address", Status: "CLOSED",
		Priority: "LOW", Category: "general", CustomerIdx: 2,
		CreatedAgo: 26 * h, LastAgo: 8 * h,
		Bodies: []string{
			"Can I change the dropoff address for my current delivery?",
			"Sure, please share the new dropoff address.",
			"It should be 3rd Floor, Embassy Tech Village, Outer Ring Rd.",
		},
	},
}

func seedTickets(db *gorm.DB, customers []uuid.UUID, supportID uuid.UUID, recs []deliveryRec) {
	now := time.Now().UTC()
	var cancelledID *uuid.UUID
	for _, d := range recs {
		if d.Status == "CANCELLED" {
			id := d.ID
			cancelledID = &id
			break
		}
	}
	totalMsgs := 0
	for _, tp := range ticketPlans {
		if _, ok := lookupID(db, `SELECT id FROM support_tickets WHERE reference = ?`, tp.Ref); ok {
			continue
		}
		created := now.Add(-tp.CreatedAgo)
		last := now.Add(-tp.LastAgo)
		ticketID := uuid.New()
		customerID := customers[tp.CustomerIdx%len(customers)]
		var assignee any
		if tp.Status != "OPEN" {
			assignee = supportID
		}
		var deliveryArg any
		if tp.LinkedCancelled && cancelledID != nil {
			deliveryArg = *cancelledID
		}
		var resolvedAt, closedAt *time.Time
		if tp.Status == "RESOLVED" {
			resolvedAt = &last
		}
		if tp.Status == "CLOSED" {
			closedAt = &last
		}
		if err := db.Exec(`INSERT INTO support_tickets (id, customer_id, assignee_id, delivery_id,
			subject, reference, status, priority, category, created_at, updated_at, resolved_at, closed_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			ticketID, customerID, assignee, deliveryArg, tp.Subject, tp.Ref, tp.Status,
			tp.Priority, tp.Category, created, last, resolvedAt, closedAt).Error; err != nil {
			fatal("insert ticket "+tp.Ref, err)
		}
		n := len(tp.Bodies)
		start := created.Add(10 * m)
		for k, body := range tp.Bodies {
			t := last
			if n > 1 {
				t = start.Add(time.Duration(float64(last.Sub(start)) * float64(k) / float64(n-1)))
			}
			sender := customerID
			if k%2 == 1 {
				sender = supportID
			}
			if err := db.Exec(`INSERT INTO support_messages (id, ticket_id, sender_id, body, is_internal, created_at)
				VALUES (?, ?, ?, ?, false, ?)`, uuid.New(), ticketID, sender, body, t).Error; err != nil {
				fatal("insert support message "+tp.Ref, err)
			}
			totalMsgs++
		}
	}
	fmt.Printf("seed: support tickets (%d) with messages (%d)\n", len(ticketPlans), totalMsgs)
}

func seedSavedAddresses(db *gorm.DB, userID uuid.UUID) {
	type savedAddr struct {
		Label   string
		Address string
		Lat     float64
		Lng     float64
	}
	saved := []savedAddr{
		{Label: "Home", Address: "12, 5th Cross, Koramangala, Bengaluru", Lat: 12.9352, Lng: 77.6245},
		{Label: "Work", Address: "Embassy Tech Village, Outer Ring Rd", Lat: 12.9855, Lng: 77.6682},
	}
	created := time.Now().UTC().Add(-20 * day)
	for _, a := range saved {
		if _, ok := lookupID(db, `SELECT id FROM saved_addresses WHERE user_id = ? AND label = ?`, userID, a.Label); ok {
			continue
		}
		if err := db.Exec(`INSERT INTO saved_addresses (id, user_id, label, address, lat, lng, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)`, uuid.New(), userID, a.Label, a.Address, a.Lat, a.Lng, created).Error; err != nil {
			fatal("insert saved address "+a.Label, err)
		}
	}
	fmt.Printf("seed: saved addresses (%d)\n", len(saved))
}

func printSummary(db *gorm.DB) {
	fmt.Println("seed: ----------------------------------------")
	fmt.Println("seed: summary")
	for _, t := range []string{"users", "riders", "deliveries", "delivery_items", "delivery_status_history", "payments", "ratings", "conversations", "messages", "notifications", "support_tickets", "support_messages", "saved_addresses"} {
		fmt.Printf("seed:   %-24s %d\n", t, countRows(db, t))
	}
	fmt.Println("seed: demo logins (password for all: " + seedPassword + ")")
	fmt.Printf("seed:   %-12s %-9s %-8s %s\n", "phone", "password", "role", "name")
	for _, u := range seedUsers {
		fmt.Printf("seed:   %-12s %-9s %-8s %s\n", u.Phone, seedPassword, u.Role, u.Name)
	}
	fmt.Println("seed: done")
}
