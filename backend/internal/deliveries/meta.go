package deliveries

// Status display metadata — mirrors mobile/src/constants/delivery.ts so
// notification text matches what the app renders.
type statusInfo struct {
	Label       string
	Description string
	Event       string
}

var statusMeta = map[Status]statusInfo{
	StatusDraft:                {Label: "Draft", Description: "Not submitted yet.", Event: "delivery.created"},
	StatusCreated:              {Label: "Delivery created", Description: "Your delivery request has been created.", Event: "delivery.created"},
	StatusSearchingRider:       {Label: "Finding a rider", Description: "Matching you with a nearby rider.", Event: "delivery.rider_searching"},
	StatusRiderAssigned:        {Label: "Rider assigned", Description: "Your rider is getting ready.", Event: "delivery.rider_assigned"},
	StatusRiderArrivingPickup:  {Label: "Rider heading to pickup", Description: "Your rider is on the way to the pickup point.", Event: "delivery.rider_arriving"},
	StatusRiderArrivedPickup:   {Label: "Rider arrived at pickup", Description: "Your rider has reached the pickup location.", Event: "delivery.rider_arrived"},
	StatusPickupVerification:   {Label: "Pickup verification", Description: "Share the pickup OTP to start the delivery.", Event: "delivery.pickup_verification_required"},
	StatusPickedUp:             {Label: "Item picked up", Description: "Your item has been picked up.", Event: "delivery.picked_up"},
	StatusInTransit:            {Label: "On the way", Description: "Your item is on the way to the destination.", Event: "delivery.in_transit"},
	StatusNearDestination:      {Label: "Near destination", Description: "Your rider is close to the destination.", Event: "delivery.near_destination"},
	StatusDeliveryVerification: {Label: "Delivery verification", Description: "Share the delivery OTP to complete.", Event: "delivery.delivery_verification_required"},
	StatusDelivered:            {Label: "Delivered", Description: "Your item was delivered successfully.", Event: "delivery.delivered"},
	StatusCancelled:            {Label: "Cancelled", Description: "This delivery was cancelled.", Event: "delivery.cancelled"},
	StatusFailed:               {Label: "Failed", Description: "This delivery could not be completed.", Event: "delivery.failed"},
}

// allowed mirrors the authoritative transition map of the mobile mock
// backend (mobile/src/api/mock/db.ts). Terminal states accept nothing.
var allowed = map[Status][]Status{
	StatusDraft:                {StatusCreated, StatusCancelled},
	StatusCreated:              {StatusSearchingRider, StatusCancelled},
	StatusSearchingRider:       {StatusRiderAssigned, StatusCancelled, StatusFailed},
	StatusRiderAssigned:        {StatusRiderArrivingPickup, StatusRiderArrivedPickup, StatusCancelled},
	StatusRiderArrivingPickup:  {StatusRiderArrivedPickup, StatusCancelled},
	StatusRiderArrivedPickup:   {StatusPickupVerification, StatusCancelled},
	StatusPickupVerification:   {StatusPickedUp, StatusCancelled},
	StatusPickedUp:             {StatusInTransit},
	StatusInTransit:            {StatusNearDestination, StatusDeliveryVerification},
	StatusNearDestination:      {StatusDeliveryVerification, StatusInTransit},
	StatusDeliveryVerification: {StatusDelivered, StatusFailed},
	StatusDelivered:            {},
	StatusCancelled:            {},
	StatusFailed:              {},
}

// ValidTransition reports whether from -> to is a legal state change.
func ValidTransition(from, to Status) bool {
	if from == to {
		return true
	}
	for _, s := range allowed[from] {
		if s == to {
			return true
		}
	}
	return false
}

// IsTerminal reports whether a status is final.
func IsTerminal(s Status) bool {
	return s == StatusDelivered || s == StatusCancelled || s == StatusFailed
}

func infoFor(s Status) statusInfo {
	if v, ok := statusMeta[s]; ok {
		return v
	}
	return statusInfo{Label: string(s), Description: "", Event: "delivery.status_changed"}
}
