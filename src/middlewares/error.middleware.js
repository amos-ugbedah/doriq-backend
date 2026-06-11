// src/middlewares/error.middleware.js

/**
 * Global Error Handler Middleware
 * --------------------------------
 * Catches all unhandled errors from routes/controllers
 */

export const errorMiddleware = (err, req, res, next) => {
    console.error("🔥 Global Error:", err);

    // Default status code
    const statusCode = err.statusCode || 500;

    // Default message
    const message =
        err.message || "Internal Server Error";

    // Optional: handle Firebase errors cleanly
    if (err.code && err.code.startsWith("auth/")) {
        return res.status(401).json({
            success: false,
            message: "Authentication error",
            error: err.message,
        });
    }

    return res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack,
        }),
    });
};