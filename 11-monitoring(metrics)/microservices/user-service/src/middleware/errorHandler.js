export function errorHandler(err, req, res, _next) {
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        details: err.issues,
        correlationId: req.correlationId
      }
    });
  }

  req.log.error(
    {
      err,
      correlationId: req.correlationId
    },
    "request failed"
  );

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.expose ? err.message : "Internal Server Error",
      correlationId: req.correlationId
    }
  });
}
