import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["service", "method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register]
});

const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["service", "method", "route", "status_code"],
  registers: [register]
});

export function metricsMiddleware(serviceName) {
  return (req, res, next) => {
    const started = process.hrtime.bigint();

    res.on("finish", () => {
      const route = req.route?.path || req.baseUrl || req.path || "unknown";
      const statusCode = String(res.statusCode);
      const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;

      httpDuration
        .labels(serviceName, req.method, route, statusCode)
        .observe(durationSeconds);
      httpRequests.labels(serviceName, req.method, route, statusCode).inc();
    });

    next();
  };
}

export async function metricsHandler(_req, res) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}
