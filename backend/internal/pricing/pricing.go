package pricing

import (
	"math"

	"pickky/backend/internal/config"
)

func Estimate(config *config.Config, distanceKm float64) int64 {
	d := math.Max(0, distanceKm)
	km := int64(math.Round(d))
	price := config.Pricing.DefaultBaseMinor + km*config.Pricing.PerKMMinor
	if price < config.Pricing.DefaultBaseMinor {
		price = config.Pricing.DefaultBaseMinor
	}
	return price
}
