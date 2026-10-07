package deliveries

import (
	"math"

	"pickky/backend/internal/config"
)

type Geo struct {
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Addr     string  `json:"addr"`
	Postcode string  `json:"postcode,omitempty"`
}

type QuoteLine struct {
	Label       string `json:"label"`
	AmountMinor int64  `json:"amount_minor"`
}

type Quote struct {
	DistanceKm  float64     `json:"distance_km"`
	EtaMinutes  int         `json:"eta_minutes"`
	PriceMinor  int64       `json:"price_minor"`
	Currency    string      `json:"currency"`
	Breakdown   []QuoteLine `json:"breakdown"`
}

// haversineKm mirrors mobile/src/utils/geo.ts exactly so quotes agree with
// anything the client computes locally for display.
func haversineKm(a, b Geo) float64 {
	const R = 6371.0
	dLat := (b.Lat - a.Lat) * math.Pi / 180
	dLng := (b.Lng - a.Lng) * math.Pi / 180
	s := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(a.Lat*math.Pi/180)*math.Cos(b.Lat*math.Pi/180)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * R * math.Asin(math.Min(1, math.Sqrt(s)))
}

func approxEtaMinutes(km float64, speedKmh float64) int {
	if speedKmh <= 0 {
		speedKmh = 22
	}
	eta := int(math.Round((km / speedKmh) * 60))
	if eta < 1 {
		return 1
	}
	return eta
}

// ComputeQuote prices on the server: route factor 1.3x on great-circle
// distance, floor-ed per-km charge plus base fare (never floats).
func ComputeQuote(cfg *config.Config, pickup, dropoff Geo) Quote {
	raw := math.Max(0.5, haversineKm(pickup, dropoff)*1.3)
	rounded := math.Round(raw*10) / 10
	distanceMinor := int64(math.Floor(raw * float64(cfg.Pricing.PerKMMinor)))
	price := cfg.Pricing.DefaultBaseMinor + distanceMinor
	if price < cfg.Pricing.DefaultBaseMinor {
		price = cfg.Pricing.DefaultBaseMinor
	}
	return Quote{
		DistanceKm: rounded,
		EtaMinutes: approxEtaMinutes(raw, 22),
		PriceMinor: price,
		Currency:   "INR",
		Breakdown: []QuoteLine{
			{Label: "Base fare", AmountMinor: cfg.Pricing.DefaultBaseMinor},
			{Label: "Distance (" + formatKm(rounded) + " km)", AmountMinor: distanceMinor},
		},
	}
}

func formatKm(km float64) string {
	// "8.2" style, one decimal — matches the client's display formatting.
	i := int64(km*10 + 0.5)
	if int64(km*10)%10 == 0 {
		return itoa(i / 10)
	}
	return itoa(i/10) + "." + itoa(i%10)
}

func itoa(v int64) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
