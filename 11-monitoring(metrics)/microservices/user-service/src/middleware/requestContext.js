import { randomUUID } from "crypto";
import pinoHttp from "pino-http";
import { logger } from "../utils/logger.js";

export function requestContext(req, res, next) {
  const correlationId = req.headers["x-correlation-id"] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}

export const requestLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    correlationId: req.correlationId
  }),
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        correlationId: req.correlationId
      };
    }
  }
});
