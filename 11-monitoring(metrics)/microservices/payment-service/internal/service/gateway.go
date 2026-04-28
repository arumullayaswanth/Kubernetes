package service

import (
	"context"
	"errors"
	"math/rand"
	"time"

	"payment-service/internal/models"
	"payment-service/internal/telemetry"

	"github.com/sony/gobreaker"
)

var ErrCircuitOpen = errors.New("payment gateway circuit open")

type Gateway struct {
	breaker      *gobreaker.CircuitBreaker
	failureRatio float64
	metrics      *telemetry.Metrics
	serviceName  string
}

func NewGateway(name string, failureRatio float64, metrics *telemetry.Metrics, serviceName string) *Gateway {
	settings := gobreaker.Settings{
		Name:        name,
		MaxRequests: 2,
		Interval:    10 * time.Second,
		Timeout:     15 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			return counts.Requests >= 5 && counts.TotalFailures >= 3
		},
	}

	return &Gateway{
		breaker:      gobreaker.NewCircuitBreaker(settings),
		failureRatio: failureRatio,
		metrics:      metrics,
		serviceName:  serviceName,
	}
}

func (g *Gateway) Charge(ctx context.Context, payment models.Payment) error {
	_, err := g.breaker.Execute(func() (any, error) {
		delay := time.Duration(200+rand.Intn(400)) * time.Millisecond
		select {
		case <-ctx.Done():
			g.metrics.GatewayAttempts.WithLabelValues(g.serviceName, "timeout").Inc()
			return nil, ctx.Err()
		case <-time.After(delay):
		}

		if rand.Float64() < g.failureRatio {
			g.metrics.GatewayAttempts.WithLabelValues(g.serviceName, "failure").Inc()
			return nil, errors.New("gateway temporary failure")
		}

		g.metrics.GatewayAttempts.WithLabelValues(g.serviceName, "success").Inc()
		return payment.ID, nil
	})

	if errors.Is(err, gobreaker.ErrOpenState) || errors.Is(err, gobreaker.ErrTooManyRequests) {
		return ErrCircuitOpen
	}

	return err
}
