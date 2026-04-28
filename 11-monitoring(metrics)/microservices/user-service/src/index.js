import "express-async-errors";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { initDb, pool } from "./db/pool.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { metricsHandler, metricsMiddleware } from "./middleware/metrics.js";
import { requestContext, requestLogger } from "./middleware/requestContext.js";
import { usersRouter } from "./routes/users.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(express.json());
app.use(requestContext);
app.use(requestLogger);
app.use(metricsMiddleware(env.SERVICE_NAME));

app.get("/health/live", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/ready", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ready" });
});

app.get("/metrics", metricsHandler);
app.use("/api/users", usersRouter);

app.use(errorHandler);

async function start() {
  await initDb();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "user-service listening");
  });
}

start().catch((error) => {
  logger.fatal({ err: error }, "failed to start user-service");
  process.exit(1);
});
