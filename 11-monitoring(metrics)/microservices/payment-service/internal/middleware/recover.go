package middleware

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog"
)

func Recover(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					logger.Error().
						Str("correlationId", GetCorrelationID(r.Context())).
						Interface("panic", recovered).
						Msg("request panic recovered")

					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_ = json.NewEncoder(w).Encode(map[string]any{
						"error": map[string]string{
							"message":       "Internal Server Error",
							"correlationId": GetCorrelationID(r.Context()),
						},
					})
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
