module inventory-service

go 1.25

require (
	github.com/gin-gonic/gin v1.11.0
	go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin v0.67.0
	go.opentelemetry.io/otel v1.42.0
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.42.0
	go.opentelemetry.io/otel/sdk v1.42.0
)
