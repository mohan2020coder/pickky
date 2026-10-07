package pricing

import (
	"testing"

	"pickky/backend/internal/config"
)

func testConfig() *config.Config {
	return &config.Config{
		Pricing: config.PricingConfig{
			DefaultBaseMinor: 4000,
			PerKMMinor:       1500,
		},
	}
}

func TestEstimateBase(t *testing.T) {
	if got := Estimate(testConfig(), 0); got != 4000 {
		t.Fatalf("expected 4000 for 0 km, got %d", got)
	}
	if got := Estimate(testConfig(), -5); got != 4000 {
		t.Fatalf("expected 4000 for negative km, got %d", got)
	}
}

func TestEstimatePerKM(t *testing.T) {
	cases := []struct {
		km   float64
		want int64
	}{
		{1, 5500},
		{8.4, 16000},
		{10, 19000},
		{0.4, 4000},
	}
	for _, c := range cases {
		if got := Estimate(testConfig(), c.km); got != c.want {
			t.Fatalf("km=%.1f: expected %d, got %d", c.km, c.want, got)
		}
	}
}

func TestEstimateFloorBase(t *testing.T) {
	cfg := testConfig()
	for km := 0.0; km < 1; km += 0.1 {
		if got := Estimate(cfg, km); got < 4000 {
			t.Fatalf("km=%.1f: price %d dropped below base", km, got)
		}
	}
}