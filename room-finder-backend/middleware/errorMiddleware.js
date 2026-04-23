/**
 * Global Error Handler Middleware
 *
 * Express calls this whenever a controller calls next(error)
 * OR when an unhandled error occurs inside any route.
 *
 * It must have exactly FOUR parameters (err, req, res, next)
 * for Express to recognise it as an error handler.
 */
const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  // Log full error details on the server for debugging
  console.error("❌  Server Error:", err.stack || err.message);

  // Choose an HTTP status code
  // If a status was already set on the response, keep it; otherwise use 500
  const statusCode = res.statusCode && res.statusCode !== 200
    ? res.statusCode
    : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only expose the stack trace in development so production stays safe
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * 404 Handler Middleware
 *
 * Catches any request to a route that doesn't exist.
 * Place this AFTER all valid routes in server.js.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
