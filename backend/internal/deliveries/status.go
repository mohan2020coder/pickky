package deliveries

// Delivery lifecycle states (server-validated).
type Status string

const (
	StatusDraft                Status = "DRAFT"
	StatusCreated              Status = "CREATED"
	StatusSearchingRider       Status = "SEARCHING_RIDER"
	StatusRiderAssigned        Status = "RIDER_ASSIGNED"
	StatusRiderArrivingPickup  Status = "RIDER_ARRIVING_PICKUP"
	StatusRiderArrivedPickup   Status = "RIDER_ARRIVED_PICKUP"
	StatusPickupVerification   Status = "PICKUP_VERIFICATION"
	StatusPickedUp             Status = "PICKED_UP"
	StatusInTransit            Status = "IN_TRANSIT"
	StatusNearDestination      Status = "NEAR_DESTINATION"
	StatusDeliveryVerification Status = "DELIVERY_VERIFICATION"
	StatusDelivered            Status = "DELIVERED"
	StatusCancelled            Status = "CANCELLED"
	StatusFailed               Status = "FAILED"
)

// ParseStatus converts a client-supplied string into a Status ("" when unknown).
func ParseStatus(s string) Status {
	switch Status(s) {
	case StatusDraft, StatusCreated, StatusSearchingRider, StatusRiderAssigned,
		StatusRiderArrivingPickup, StatusRiderArrivedPickup, StatusPickupVerification,
		StatusPickedUp, StatusInTransit, StatusNearDestination,
		StatusDeliveryVerification, StatusDelivered, StatusCancelled, StatusFailed:
		return Status(s)
	}
	return ""
}

// ActiveStatuses are the statuses included in the "active" scope and sync.
func ActiveStatuses() []Status {
	return []Status{
		StatusDraft, StatusCreated, StatusSearchingRider, StatusRiderAssigned,
		StatusRiderArrivingPickup, StatusRiderArrivedPickup, StatusPickupVerification,
		StatusPickedUp, StatusInTransit, StatusNearDestination, StatusDeliveryVerification,
	}
}
