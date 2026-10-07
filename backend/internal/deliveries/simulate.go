package deliveries

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"

	"pickky/backend/internal/config"
)

// Simulator drives a delivery through the rider half of its lifecycle when no
// real rider picks it up: it assigns a rider, moves them to the pickup, waits
// for the customer's pickup OTP, moves them to the destination, then waits for
// the delivery OTP. All movement is published exactly like real GPS updates.
//
// Every scheduled step re-reads the delivery and no-ops if a real rider or the
// customer has already moved the state forward.
type Simulator struct {
	svc  *Service
	cfg  *config.Config
	log  *slog.Logger
	mu   sync.Mutex
	stop map[uuid.UUID]chan struct{}
}

func NewSimulator(svc *Service, cfg *config.Config, log *slog.Logger) *Simulator {
	if log == nil {
		log = slog.Default()
	}
	return &Simulator{svc: svc, cfg: cfg, log: log, stop: map[uuid.UUID]chan struct{}{}}
}

func (s *Simulator) enabled() bool { return s.cfg != nil && s.cfg.Simulate }

// OnCreated nudges a brand-new delivery into SEARCHING_RIDER. This is the
// normal booking flow (not rider theatre), so it runs even with simulation
// disabled.
func (s *Simulator) OnCreated(d *Delivery) {
	s.after(d.ID, 900*time.Millisecond, func(d *Delivery) {
		if d.Status == StatusCreated {
			_ = s.svc.ApplyStatus(context.Background(), d, StatusSearchingRider, "Matching you with a nearby rider.")
		}
	})
}

// OnStatus schedules whatever the simulated rider does next.
func (s *Simulator) OnStatus(d *Delivery) {
	if !s.enabled() {
		return
	}
	switch d.Status {
	case StatusSearchingRider:
		// If no real rider accepted within the offer window, auto-assign one.
		s.after(d.ID, 4*time.Second, func(d *Delivery) {
			if d.Status != StatusSearchingRider || d.RiderID != nil {
				return
			}
			riderID, ok := s.pickRider(d.ID)
			if !ok {
				return
			}
			if _, err := s.svc.AssignRider(context.Background(), d, riderID, ""); err != nil {
				s.log.Warn("sim assign failed", "delivery", d.Reference, "err", err)
			}
		})
	case StatusRiderAssigned:
		s.after(d.ID, 2500*time.Millisecond, func(d *Delivery) {
			if d.Status != StatusRiderAssigned {
				return
			}
			if err := s.svc.ApplyStatus(context.Background(), d, StatusRiderArrivingPickup, "Rider heading to pickup"); err != nil {
				return
			}
			s.startMover(d, true)
		})
	case StatusRiderArrivedPickup:
		s.after(d.ID, 2*time.Second, func(d *Delivery) {
			if d.Status != StatusRiderArrivedPickup {
				return
			}
			_ = s.svc.ApplyStatus(context.Background(), d, StatusPickupVerification, "Waiting for pickup OTP")
		})
	case StatusPickedUp:
		s.after(d.ID, 2500*time.Millisecond, func(d *Delivery) {
			if d.Status != StatusPickedUp {
				return
			}
			if err := s.svc.ApplyStatus(context.Background(), d, StatusInTransit, "On the way"); err != nil {
				return
			}
			s.startMover(d, false)
		})
	case StatusNearDestination:
		s.after(d.ID, 2*time.Second, func(d *Delivery) {
			if d.Status != StatusNearDestination {
				return
			}
			_ = s.svc.ApplyStatus(context.Background(), d, StatusDeliveryVerification, "Waiting for delivery OTP")
		})
	case StatusDelivered, StatusCancelled, StatusFailed:
		s.stopMover(d.ID)
	}
}

// after runs fn(delay) unless the delivery reached a terminal state meanwhile.
func (s *Simulator) after(id uuid.UUID, delay time.Duration, fn func(*Delivery)) {
	time.AfterFunc(delay, func() {
		var d Delivery
		if err := s.svc.db.WithContext(context.Background()).First(&d, "id = ?", id).Error; err != nil {
			return
		}
		if IsTerminal(d.Status) {
			return
		}
		fn(&d)
	})
}

// pickRider chooses a verified rider for the simulation — preferring online
// riders, then any verified rider from the seed data.
func (s *Simulator) pickRider(deliveryID uuid.UUID) (uuid.UUID, bool) {
	ctx := context.Background()
	var ids []uuid.UUID
	online, err := s.svc.presence.OnlineRiderIDs(ctx)
	if err == nil && len(online) > 0 {
		ids = online
	} else {
		s.svc.db.WithContext(ctx).Table("riders").
			Where("is_verified AND NOT is_suspended").Pluck("user_id", &ids)
	}
	for _, id := range ids {
		var assigned int64
		s.svc.db.WithContext(ctx).Table("deliveries").
			Where("rider_id = ?", id).Count(&assigned)
		if assigned < 3 {
			return id, true
		}
	}
	if len(ids) > 0 {
		return ids[0], true
	}
	return uuid.Nil, false
}

// ---------- movement ----------

func (s *Simulator) startMover(d *Delivery, toPickup bool) {
	if !s.enabled() || d.RiderID == nil {
		return
	}
	s.stopMover(d.ID)
	stop := make(chan struct{})
	s.mu.Lock()
	s.stop[d.ID] = stop
	s.mu.Unlock()

	riderID := *d.RiderID
	pickup := Geo{Lat: d.PickupLat, Lng: d.PickupLng}
	dropoff := Geo{Lat: d.DropoffLat, Lng: d.DropoffLng}
	origin := pickup
	if toPickup {
		// Start the rider a little west of pickup so there is distance to cover.
		origin = Geo{Lat: pickup.Lat - 0.010, Lng: pickup.Lng - 0.012}
	}
	target := pickup
	if !toPickup {
		origin, target = pickup, dropoff
	}

	go func() {
		tick := time.NewTicker(time.Second)
		defer tick.Stop()
		step := 0
		for {
			select {
			case <-stop:
				return
			case <-tick.C:
			}
			var d2 Delivery
			if err := s.svc.db.WithContext(context.Background()).First(&d2, "id = ?", d.ID).Error; err != nil {
				return
			}
			want := StatusRiderArrivingPickup
			if !toPickup {
				want = StatusInTransit
			}
			if d2.Status != want {
				return
			}
			step++
			const stepsToArrive = 6
			frac := float64(step) / stepsToArrive
			if frac >= 1 {
				frac = 1
			}
			lat := origin.Lat + (target.Lat-origin.Lat)*frac
			lng := origin.Lng + (target.Lng-origin.Lng)*frac
			_ = s.svc.HandleLocation(context.Background(), riderID, LocationUpdate{
				DeliveryID: d.ID, Lat: lat, Lng: lng,
				Heading: 45, Speed: 8, Accuracy: 6,
			})
			if frac >= 1 {
				if toPickup {
					_ = s.svc.ApplyStatus(context.Background(), &d2, StatusRiderArrivedPickup, "Rider arrived at pickup")
				} else {
					_ = s.svc.ApplyStatus(context.Background(), &d2, StatusNearDestination, "Near destination")
				}
				s.stopMover(d.ID)
				return
			}
		}
	}()
}

func (s *Simulator) stopMover(id uuid.UUID) {
	s.mu.Lock()
	if ch, ok := s.stop[id]; ok {
		select {
		case <-ch:
		default:
			close(ch)
		}
		delete(s.stop, id)
	}
	s.mu.Unlock()
}
