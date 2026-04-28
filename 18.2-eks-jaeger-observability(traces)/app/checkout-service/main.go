package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"checkout-service/internal/observability"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
)

type inventoryResponse struct {
	Status       string `json:"status"`
	ItemID       string `json:"itemId"`
	ReservedQty  int    `json:"reservedQty"`
	Warehouse    string `json:"warehouse"`
	TraceID      string `json:"traceId"`
	AvailableQty int    `json:"availableQty"`
}

type application struct {
	logger       *slog.Logger
	tracer       oteltrace.Tracer
	ready        atomic.Bool
	service      string
	inventoryURL string
	httpClient   *http.Client
}

func main() {
	rand.Seed(time.Now().UnixNano())

	logger := observability.NewJSONLogger()
	serviceName := observability.EnvOrDefault("OTEL_SERVICE_NAME", "checkout-service")
	appEnv := observability.EnvOrDefault("APP_ENV", "production")
	port := observability.EnvOrDefault("PORT", "8080")
	inventoryURL := observability.EnvOrDefault("INVENTORY_SERVICE_URL", "http://inventory-service.observability.svc.cluster.local")

	tp, err := observability.InitTracerProvider(context.Background(), serviceName, appEnv, logger)
	if err != nil {
		logger.Error("failed to initialize OpenTelemetry, continuing with no-op tracer provider",
			slog.String("error", err.Error()),
		)
		tp = sdktrace.NewTracerProvider()
		otel.SetTracerProvider(tp)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if shutdownErr := tp.Shutdown(ctx); shutdownErr != nil {
			logger.Error("failed to shutdown OpenTelemetry tracer provider",
				slog.String("error", shutdownErr.Error()),
			)
		}
	}()

	app := &application{
		logger:       logger,
		tracer:       otel.Tracer(serviceName),
		service:      serviceName,
		inventoryURL: inventoryURL,
		httpClient: &http.Client{
			Timeout:   5 * time.Second,
			Transport: otelhttp.NewTransport(http.DefaultTransport),
		},
	}
	app.ready.Store(true)

	gin.SetMode(observability.EnvOrDefault("GIN_MODE", gin.ReleaseMode))
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(otelgin.Middleware(serviceName))
	router.Use(observability.RequestLogger(serviceName, logger))

	router.GET("/healthz", app.healthz)
	router.GET("/readyz", app.readyz)
	router.GET("/", app.root)
	router.GET("/work", app.work)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		app.logger.Info("checkout service started",
			slog.String("service", serviceName),
			slog.String("port", port),
			slog.String("inventory_url", inventoryURL),
			slog.String("environment", appEnv),
		)

		if serveErr := server.ListenAndServe(); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			app.logger.Error("http server exited unexpectedly",
				slog.String("error", serveErr.Error()),
			)
			os.Exit(1)
		}
	}()

	signalCh := make(chan os.Signal, 1)
	signal.Notify(signalCh, syscall.SIGTERM, syscall.SIGINT)
	sig := <-signalCh

	app.ready.Store(false)
	app.logger.Info("shutdown signal received",
		slog.String("signal", sig.String()),
	)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		app.logger.Error("graceful shutdown failed",
			slog.String("error", err.Error()),
		)
		os.Exit(1)
	}
}

func (a *application) healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (a *application) readyz(c *gin.Context) {
	if !a.ready.Load() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not-ready"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

func (a *application) root(c *gin.Context) {
	ctx, span := a.tracer.Start(c.Request.Context(), "checkout.root")
	defer span.End()

	syntheticDelayMs := 20 + rand.Intn(120)
	time.Sleep(time.Duration(syntheticDelayMs) * time.Millisecond)

	span.SetAttributes(
		attribute.Int("checkout.synthetic_delay_ms", syntheticDelayMs),
		attribute.String("inventory.service_url", a.inventoryURL),
	)

	traceID := observability.CurrentTraceID(ctx)
	a.logger.InfoContext(ctx, "handled checkout root",
		slog.String("path", "/"),
		slog.String("trace_id", traceID),
		slog.Int("synthetic_delay_ms", syntheticDelayMs),
	)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Checkout service is active",
		"service":      a.service,
		"traceId":      traceID,
		"inventoryUrl": a.inventoryURL,
	})
}

func (a *application) work(c *gin.Context) {
	ctx, span := a.tracer.Start(c.Request.Context(), "checkout.process_order")
	defer span.End()

	reservation, err := a.reserveInventory(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		a.logger.ErrorContext(ctx, "inventory reservation failed",
			slog.String("error", err.Error()),
			slog.String("trace_id", observability.CurrentTraceID(ctx)),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "inventory_reservation_failed"})
		return
	}

	time.Sleep(60 * time.Millisecond)
	span.SetAttributes(
		attribute.String("inventory.status", reservation.Status),
		attribute.String("inventory.warehouse", reservation.Warehouse),
	)

	traceID := observability.CurrentTraceID(ctx)
	a.logger.InfoContext(ctx, "checkout completed",
		slog.String("trace_id", traceID),
		slog.String("warehouse", reservation.Warehouse),
		slog.Int("reserved_qty", reservation.ReservedQty),
	)

	c.JSON(http.StatusOK, gin.H{
		"status":      "completed",
		"service":     a.service,
		"traceId":     traceID,
		"reservation": reservation,
	})
}

func (a *application) reserveInventory(ctx context.Context) (*inventoryResponse, error) {
	ctx, span := a.tracer.Start(ctx, "checkout.call_inventory_service")
	defer span.End()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.inventoryURL+"/reserve", nil)
	if err != nil {
		return nil, err
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("inventory service returned non-200 status")
	}

	var reservation inventoryResponse
	if err := json.NewDecoder(resp.Body).Decode(&reservation); err != nil {
		return nil, err
	}

	return &reservation, nil
}
