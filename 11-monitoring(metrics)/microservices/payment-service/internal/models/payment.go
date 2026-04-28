package models

import "time"

type Payment struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"orderId"`
	Amount    float64   `json:"amount"`
	Method    string    `json:"method"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type CreatePaymentRequest struct {
	OrderID string  `json:"orderId"`
	Amount  float64 `json:"amount"`
	Method  string  `json:"method"`
}
