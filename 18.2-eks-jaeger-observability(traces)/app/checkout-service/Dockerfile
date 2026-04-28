FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY . .
RUN go mod tidy && go mod download

ENV CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/checkout-service ./main.go

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=builder /out/checkout-service /app/checkout-service

ENV PORT=8080

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/app/checkout-service"]
