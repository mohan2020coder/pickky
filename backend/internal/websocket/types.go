package websocket

import "encoding/json"

// ClientMessage is the exact frame vocabulary the React Native client speaks.
type ClientMessage struct {
	Action string          `json:"action"`
	Room   string          `json:"room,omitempty"`
	Data   json.RawMessage `json:"data,omitempty"`
}

type LocationPayload struct {
	DeliveryID string  `json:"delivery_id"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	Heading    float64 `json:"heading"`
	Speed      float64 `json:"speed"`
	Accuracy   float64 `json:"accuracy"`
}

type ChatMessagePayload struct {
	ConversationID string `json:"conversation_id"`
	Body           string `json:"body"`
	ClientID       string `json:"client_id"`
}

type TypingPayload struct {
	ConversationID string `json:"conversation_id"`
	Typing         bool   `json:"typing"`
}

// Hooks let the hub delegate domain work to the modules that own it without
// importing them (keeps the realtime layer free of business logic).
type Hooks struct {
	AuthorizeRoom func(userID string, roles []string, room string) bool
	OnLocation    func(userID string, p LocationPayload) error
	OnChatMessage func(userID string, p ChatMessagePayload) (any, error)
	OnTyping      func(userID string, p TypingPayload) error
	OnPing        func(userID string)
}
