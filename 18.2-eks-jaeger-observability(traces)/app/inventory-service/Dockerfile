FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY . .
RUN go mod tidy && go mod download

ENV CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/inventory-service ./main.go

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=builder /out/inventory-service /app/inventory-service

ENV PORT=8081

EXPOSE 8081

USER nonroot:nonroot

ENTRYPOINT ["/app/inventory-service"]
