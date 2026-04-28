package httpclient

import "time"

type GatewayClient struct {
	Timeout time.Duration
}

func NewGatewayClient(timeout time.Duration) *GatewayClient {
	return &GatewayClient{Timeout: timeout}
}
