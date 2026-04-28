package main

import (
	"context"
	"errors"
	"log/slog"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"inventory-service/internal/observability"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
)

type application struct {
	logger  *slog.Logger
	tracer  oteltrace.Tracer
	ready   atomic.Bool
	service string
}

func main() {
	rand.Seed(time.Now().UnixNano())

	logger := observability.NewJSONLogger()
	serviceName := observability.EnvOrDefault("OTEL_SERVICE_NAME", "inventory-service")
	appEnv := observability.EnvOrDefault("APP_ENV", "production")
	port := observability.EnvOrDefault("PORT", "8081")

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
		logger:  logger,
		tracer:  otel.Tracer(serviceName),
		service: serviceName,
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
	router.GET("/reserve", app.reserve)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		app.logger.Info("inventory service started",
			slog.String("service", serviceName),
			slog.String("port", port),
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
	ctx, span := a.tracer.Start(c.Request.Context(), "inventory.root")
	defer span.End()

	traceID := observability.CurrentTraceID(ctx)
	c.JSON(http.StatusOK, gin.H{
		"message": "Inventory service is active",
		"service": a.service,
		"traceId": traceID,
	})
}

func (a *application) reserve(c *gin.Context) {
	ctx, span := a.tracer.Start(c.Request.Context(), "inventory.reserve")
	defer span.End()

	itemID := "sku-demo-1001"
	reservedQty := 2
	availableQty := 18
	warehouse := "warehouse-east-1"

	time.Sleep(45 * time.Millisecond)
	span.SetAttributes(
		attribute.String("inventory.item_id", itemID),
		attribute.Int("inventory.reserved_qty", reservedQty),
		attribute.Int("inventory.available_qty", availableQty),
		attribute.String("inventory.warehouse", warehouse),
	)

	traceID := observability.CurrentTraceID(ctx)
	a.logger.InfoContext(ctx, "inventory reserved",
		slog.String("item_id", itemID),
		slog.Int("reserved_qty", reservedQty),
		slog.String("warehouse", warehouse),
		slog.String("trace_id", traceID),
	)

	c.JSON(http.StatusOK, gin.H{
		"status":       "reserved",
		"service":      a.service,
		"itemId":       itemID,
		"reservedQty":  reservedQty,
		"availableQty": availableQty,
		"warehouse":    warehouse,
		"traceId":      traceID,
	})
}
