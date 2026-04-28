package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"payment-service/internal/middleware"
	"payment-service/internal/models"
	"payment-service/internal/service"
	"payment-service/internal/telemetry"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"
)

type Handler struct {
	logger      zerolog.Logger
	service     *service.PaymentService
	repository  *service.Repository
	metrics     *telemetry.Metrics
	serviceName string
}

func New(logger zerolog.Logger, paymentService *service.PaymentService, repository *service.Repository, metrics *telemetry.Metrics, serviceName string) *Handler {
	return &Handler{
		logger:      logger,
		service:     paymentService,
		repository:  repository,
		metrics:     metrics,
		serviceName: serviceName,
	}
}

func (h *Handler) Router() http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.CorrelationID)
	router.Use(middleware.Recover(h.logger))
	router.Use(h.metricsMiddleware)

	router.Get("/health/live", h.live)
	router.Get("/health/ready", h.ready)
	router.Handle("/metrics", promhttp.Handler())
	router.Get("/api/payments", h.listPayments)
	router.Post("/api/payments", h.createPayment)
	router.Get("/api/payments/{paymentID}", h.getPayment)
	return router
}

func (h *Handler) live(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ready(w http.ResponseWriter, r *http.Request) {
	if err := h.repository.Ping(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (h *Handler) listPayments(w http.ResponseWriter, r *http.Request) {
	payments, err := h.service.ListPayments(r.Context())
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": payments})
}

func (h *Handler) getPayment(w http.ResponseWriter, r *http.Request) {
	payment, err := h.service.GetPayment(r.Context(), chi.URLParam(r, "paymentID"))
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	if payment == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{
			"error": map[string]string{
				"message":       "Payment not found",
				"correlationId": middleware.GetCorrelationID(r.Context()),
			},
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": payment})
}

func (h *Handler) createPayment(w http.ResponseWriter, r *http.Request) {
	var request models.CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": map[string]string{
				"message":       "Invalid request payload",
				"correlationId": middleware.GetCorrelationID(r.Context()),
			},
		})
		return
	}

	if request.OrderID == "" || request.Amount <= 0 || request.Method == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": map[string]string{
				"message":       "orderId, amount, and method are required",
				"correlationId": middleware.GetCorrelationID(r.Context()),
			},
		})
		return
	}

	payment, err := h.service.CreatePayment(r.Context(), request)
	if err != nil {
		statusCode := http.StatusBadGateway
		if errors.Is(err, service.ErrCircuitOpen) {
			statusCode = http.StatusServiceUnavailable
		}
		h.logger.Error().
			Err(err).
			Str("correlationId", middleware.GetCorrelationID(r.Context())).
			Str("orderId", request.OrderID).
			Msg("payment processing failed")

		writeJSON(w, statusCode, map[string]any{
			"data":  payment,
			"error": err.Error(),
		})
		return
	}

	h.logger.Info().
		Str("correlationId", middleware.GetCorrelationID(r.Context())).
		Str("paymentId", payment.ID).
		Str("orderId", payment.OrderID).
		Msg("payment processed")

	writeJSON(w, http.StatusCreated, map[string]any{"data": payment})
}

func (h *Handler) internalError(w http.ResponseWriter, r *http.Request, err error) {
	h.logger.Error().
		Err(err).
		Str("correlationId", middleware.GetCorrelationID(r.Context())).
		Msg("request failed")

	writeJSON(w, http.StatusInternalServerError, map[string]any{
		"error": map[string]string{
			"message":       "Internal Server Error",
			"correlationId": middleware.GetCorrelationID(r.Context()),
		},
	})
}

func (h *Handler) metricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(recorder, r)

		routePattern := chi.RouteContext(r.Context()).RoutePattern()
		if routePattern == "" {
			routePattern = r.URL.Path
		}

		duration := time.Since(start).Seconds()
		code := strconv.Itoa(recorder.statusCode)
		h.metrics.RequestDuration.WithLabelValues(h.serviceName, r.Method, routePattern, code).Observe(duration)
		h.metrics.RequestsTotal.WithLabelValues(h.serviceName, r.Method, routePattern, code).Inc()
	})
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
