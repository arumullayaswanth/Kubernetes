FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/payment-service ./cmd/server

FROM alpine:3.20
RUN adduser -D appuser
USER appuser
WORKDIR /app
COPY --from=builder /bin/payment-service /app/payment-service
EXPOSE 8080
CMD ["/app/payment-service"]
