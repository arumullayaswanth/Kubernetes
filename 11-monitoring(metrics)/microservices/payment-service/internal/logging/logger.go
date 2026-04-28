package logging

import (
	"os"

	"github.com/rs/zerolog"
)

func New(serviceName string, level string) zerolog.Logger {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnixMs
	logger := zerolog.New(os.Stdout).With().Timestamp().Str("service", serviceName).Logger()

	parsedLevel, err := zerolog.ParseLevel(level)
	if err == nil {
		logger = logger.Level(parsedLevel)
	}

	return logger
}
