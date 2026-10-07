package deliveries

import "testing"

func TestValidTransitions(t *testing.T) {
	cases := []struct {
		from, to Status
		want     bool
	}{
		// happy path
		{StatusCreated, StatusSearchingRider, true},
		{StatusSearchingRider, StatusRiderAssigned, true},
		{StatusRiderAssigned, StatusRiderArrivingPickup, true},
		{StatusRiderArrivingPickup, StatusRiderArrivedPickup, true},
		{StatusRiderArrivedPickup, StatusPickupVerification, true},
		{StatusPickupVerification, StatusPickedUp, true},
		{StatusPickedUp, StatusInTransit, true},
		{StatusInTransit, StatusNearDestination, true},
		{StatusNearDestination, StatusDeliveryVerification, true},
		{StatusDeliveryVerification, StatusDelivered, true},

		// cancellations before pickup
		{StatusSearchingRider, StatusCancelled, true},
		{StatusRiderAssigned, StatusCancelled, true},
		{StatusRiderArrivedPickup, StatusCancelled, true},
		{StatusPickupVerification, StatusCancelled, true},

		// failure paths
		{StatusSearchingRider, StatusFailed, true},
		{StatusDeliveryVerification, StatusFailed, true},

		// shortcuts the rider flow must NOT allow
		{StatusRiderAssigned, StatusFailed, false},
		{StatusRiderAssigned, StatusPickedUp, false},
		{StatusCreated, StatusPickedUp, false},
		{StatusSearchingRider, StatusDelivered, false},
		{StatusInTransit, StatusCancelled, false},
		{StatusPickedUp, StatusCancelled, false},

		// terminal states accept nothing
		{StatusDelivered, StatusCancelled, false},
		{StatusDelivered, StatusInTransit, false},
		{StatusCancelled, StatusRiderAssigned, false},
		{StatusFailed, StatusSearchingRider, false},
	}
	for _, tc := range cases {
		if got := ValidTransition(tc.from, tc.to); got != tc.want {
			t.Errorf("%s -> %s: got %v, want %v", tc.from, tc.to, got, tc.want)
		}
	}
}

func TestIsTerminal(t *testing.T) {
	terminal := []Status{StatusDelivered, StatusCancelled, StatusFailed}
	for _, s := range terminal {
		if !IsTerminal(s) {
			t.Errorf("%s should be terminal", s)
		}
	}
	active := []Status{
		StatusDraft, StatusCreated, StatusSearchingRider, StatusRiderAssigned,
		StatusRiderArrivingPickup, StatusRiderArrivedPickup, StatusPickupVerification,
		StatusPickedUp, StatusInTransit, StatusNearDestination, StatusDeliveryVerification,
	}
	for _, s := range active {
		if IsTerminal(s) {
			t.Errorf("%s should not be terminal", s)
		}
	}
}

func TestInfoForEveryStatus(t *testing.T) {
	all := []Status{
		StatusDraft, StatusCreated, StatusSearchingRider, StatusRiderAssigned,
		StatusRiderArrivingPickup, StatusRiderArrivedPickup, StatusPickupVerification,
		StatusPickedUp, StatusInTransit, StatusNearDestination, StatusDeliveryVerification,
		StatusDelivered, StatusCancelled, StatusFailed,
	}
	for _, s := range all {
		info := infoFor(s)
		if info.Label == "" {
			t.Errorf("%s has no label", s)
		}
		if info.Event == "" {
			t.Errorf("%s has no event name", s)
		}
	}
}
