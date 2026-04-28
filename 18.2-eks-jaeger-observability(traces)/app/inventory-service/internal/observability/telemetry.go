package observability

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
)

func NewJSONLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

func InitTracerProvider(ctx context.Context, serviceName string, appEnv string, logger *slog.Logger) (*sdktrace.TracerProvider, error) {
	exporter, err := otlptracehttp.New(ctx)
	if err != nil {
		return nil, err
	}

	sampleRatio := traceSampleRatio(logger)
	res, err := resource.New(ctx,
		resource.WithFromEnv(),
		resource.WithProcess(),
		resource.WithHost(),
		resource.WithAttributes(
			attribute.String("service.name", serviceName),
			attribute.String("service.namespace", "observability"),
			attribute.String("deployment.environment", appEnv),
			attribute.String("cloud.provider", "aws"),
			attribute.String("cloud.platform", "aws_eks"),
		),
	)
	if err != nil {
		return nil, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(sampleRatio))),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
		),
	)

	logger.Info("OpenTelemetry initialized",
		slog.String("service", serviceName),
		slog.Float64("sampling_ratio", sampleRatio),
	)

	return tp, nil
}

func RequestLogger(service string, logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		latency := time.Since(start)
		traceID := CurrentTraceID(c.Request.Context())
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		fields := []any{
			slog.String("service", service),
			slog.String("method", c.Request.Method),
			slog.String("path", path),
			slog.Int("status", c.Writer.Status()),
			slog.Int64("latency_ms", latency.Milliseconds()),
			slog.String("client_ip", c.ClientIP()),
			slog.String("trace_id", traceID),
		}

		if len(c.Errors) > 0 || c.Writer.Status() >= http.StatusInternalServerError {
			logger.Error("request failed", fields...)
			return
		}

		logger.Info("request handled", fields...)
	}
}

func CurrentTraceID(ctx context.Context) string {
	span := oteltrace.SpanFromContext(ctx)
	if !span.SpanContext().HasTraceID() {
		return ""
	}

	return span.SpanContext().TraceID().String()
}

func EnvOrDefault(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func traceSampleRatio(logger *slog.Logger) float64 {
	raw := strings.TrimSpace(os.Getenv("OTEL_TRACES_SAMPLER_ARG"))
	if raw == "" {
		return 0.2
	}

	ratio, err := strconv.ParseFloat(raw, 64)
	if err != nil || ratio < 0 || ratio > 1 {
		logger.Warn("invalid OTEL_TRACES_SAMPLER_ARG, using default",
			slog.String("value", raw),
		)
		return 0.2
	}

	return ratio
}
