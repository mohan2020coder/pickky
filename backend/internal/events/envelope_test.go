package events

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestNewPopulatesEnvelope(t *testing.T) {
	entityID := uuid.New()
	ev := New("delivery.created", "delivery", entityID, map[string]any{"status": "CREATED"})

	if ev.Event != "delivery.created" {
		t.Fatalf("unexpected event name %q", ev.Event)
	}
	if ev.EventID == uuid.Nil {
		t.Fatal("expected non-nil event id")
	}
	if ev.EntityType != "delivery" || ev.EntityID != entityID {
		t.Fatalf("entity mismatch: %q %v", ev.EntityType, ev.EntityID)
	}
	if ev.Timestamp.In(time.UTC).IsZero() {
		t.Fatal("timestamp must be set")
	}
	if delta := time.Since(ev.Timestamp); delta < 0 || delta > time.Minute {
		t.Fatalf("timestamps looks stale: %v ago", delta)
	}
}

func TestEnvelopeMarshals(t *testing.T) {
	ev := New("chat.message_created", "conversation", uuid.New(), map[string]any{"conversation_id": "conv_1"})
	raw, err := json.Marshal(ev)
	if err != nil {
		t.Fatal(err)
	}
	var back Envelope
	if err := json.Unmarshal(raw, &back); err != nil {
		t.Fatal(err)
	}
	if back.Event != ev.Event || back.EventID != ev.EventID || back.Sequence != ev.Sequence {
		t.Fatal("round-trip mismatch")
	}
}

func TestEnvelopesHaveUniqueIDs(t *testing.T) {
	a := New("rider.online", "rider", uuid.New(), nil)
	b := New("rider.online", "rider", uuid.New(), nil)
	if a.EventID == b.EventID {
		t.Fatal("expected distinct event ids")
	}
}