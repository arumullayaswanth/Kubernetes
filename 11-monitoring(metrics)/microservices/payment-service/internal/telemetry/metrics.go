package telemetry

import "github.com/prometheus/client_golang/prometheus"

type Metrics struct {
	RequestDuration *prometheus.HistogramVec
	RequestsTotal   *prometheus.CounterVec
	GatewayAttempts *prometheus.CounterVec
}

func NewMetrics(registry *prometheus.Registry) *Metrics {
	metrics := &Metrics{
		RequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "http_request_duration_seconds",
				Help:    "HTTP request duration in seconds",
				Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1, 2, 5},
			},
			[]string{"service", "method", "route", "status_code"},
		),
		RequestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total HTTP requests",
			},
			[]string{"service", "method", "route", "status_code"},
		),
		GatewayAttempts: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "payment_gateway_attempts_total",
				Help: "External payment gateway attempts grouped by outcome",
			},
			[]string{"service", "outcome"},
		),
	}

	registry.MustRegister(metrics.RequestDuration, metrics.RequestsTotal, metrics.GatewayAttempts)
	return metrics
}
