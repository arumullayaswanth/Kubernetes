package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"payment-service/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type PaymentService struct {
	repository     *Repository
	gateway        *Gateway
	maxRetries     int
	gatewayTimeout time.Duration
}

func NewPaymentService(repository *Repository, gateway *Gateway, maxRetries int, gatewayTimeout time.Duration) *PaymentService {
	return &PaymentService{
		repository:     repository,
		gateway:        gateway,
		maxRetries:     maxRetries,
		gatewayTimeout: gatewayTimeout,
	}
}

func (s *PaymentService) CreatePayment(ctx context.Context, request models.CreatePaymentRequest) (*models.Payment, error) {
	payment := &models.Payment{
		ID:        uuid.NewString(),
		OrderID:   request.OrderID,
		Amount:    request.Amount,
		Method:    request.Method,
		Status:    "pending",
		CreatedAt: time.Now().UTC(),
	}

	var lastErr error
	for attempt := 1; attempt <= s.maxRetries; attempt++ {
		gatewayCtx, cancel := context.WithTimeout(ctx, s.gatewayTimeout)
		err := s.gateway.Charge(gatewayCtx, *payment)
		cancel()
		if err == nil {
			payment.Status = "processed"
			break
		}

		lastErr = err
		if errors.Is(err, ErrCircuitOpen) {
			payment.Status = "deferred"
			break
		}

		time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
	}

	if payment.Status == "pending" && lastErr != nil {
		payment.Status = "failed"
	}

	if err := s.repository.CreatePayment(ctx, *payment); err != nil {
		return nil, err
	}

	if payment.Status == "processed" || payment.Status == "deferred" {
		return payment, nil
	}

	return payment, fmt.Errorf("payment gateway failed after retries: %w", lastErr)
}

func (s *PaymentService) ListPayments(ctx context.Context) ([]models.Payment, error) {
	return s.repository.ListPayments(ctx)
}

func (s *PaymentService) GetPayment(ctx context.Context, paymentID string) (*models.Payment, error) {
	payment, err := s.repository.GetPayment(ctx, paymentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return payment, nil
}
