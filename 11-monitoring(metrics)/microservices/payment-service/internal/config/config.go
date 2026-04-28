package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	ServiceName         string
	Environment         string
	Port                string
	LogLevel            string
	DatabaseURL         string
	RequestTimeout      time.Duration
	GatewayTimeout      time.Duration
	MaxRetries          int
	CircuitBreakerName  string
	GatewayFailureRatio float64
}

func Load() Config {
	return Config{
		ServiceName:         getEnv("SERVICE_NAME", "payment-service"),
		Environment:         getEnv("APP_ENV", "development"),
		Port:                getEnv("PORT", "8080"),
		LogLevel:            getEnv("LOG_LEVEL", "info"),
		DatabaseURL:         mustEnv("DATABASE_URL"),
		RequestTimeout:      getDurationEnv("REQUEST_TIMEOUT", 3*time.Second),
		GatewayTimeout:      getDurationEnv("GATEWAY_TIMEOUT", 1500*time.Millisecond),
		MaxRetries:          getIntEnv("MAX_RETRIES", 3),
		CircuitBreakerName:  getEnv("CIRCUIT_BREAKER_NAME", "payment-gateway"),
		GatewayFailureRatio: getFloatEnv("GATEWAY_FAILURE_RATIO", 0.25),
	}
}

func mustEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic("missing environment variable: " + key)
	}
	return value
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getIntEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getFloatEnv(key string, fallback float64) float64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
