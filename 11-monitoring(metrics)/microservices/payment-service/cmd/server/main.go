package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"payment-service/internal/config"
	"payment-service/internal/handlers"
	"payment-service/internal/logging"
	"payment-service/internal/service"
	"payment-service/internal/telemetry"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

func main() {
	cfg := config.Load()
	logger := logging.New(cfg.ServiceName, cfg.LogLevel)

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to postgres")
	}
	defer pool.Close()

	repository := service.NewRepository(pool)
	if err := repository.Init(context.Background()); err != nil {
		logger.Fatal().Err(err).Msg("failed to initialize payment table")
	}

	registry := prometheus.NewRegistry()
	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)
	metrics := telemetry.NewMetrics(registry)
	gateway := service.NewGateway(cfg.CircuitBreakerName, cfg.GatewayFailureRatio, metrics, cfg.ServiceName)
	paymentService := service.NewPaymentService(repository, gateway, cfg.MaxRetries, cfg.GatewayTimeout)
	handler := handlers.New(logger, paymentService, repository, metrics, cfg.ServiceName)

	prometheus.DefaultRegisterer = registry
	prometheus.DefaultGatherer = registry

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler.Router(),
		ReadHeaderTimeout: cfg.RequestTimeout,
	}

	go func() {
		logger.Info().Str("port", cfg.Port).Msg("payment-service listening")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("payment-service failed")
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	logger.Info().Msg("payment-service stopped")
}
