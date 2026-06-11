require("./config/firebase");

const express = require("express");
const cors = require("cors");

const adminRoutes = require("./routes/admin.routes");

const app = express();

/**
 * =========================
 * MIDDLEWARES
 * =========================
 */
app.use(cors({
    origin: "*",
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * =========================
 * ROUTES
 * =========================
 */
app.use("/api/admin", adminRoutes);

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Doriq backend running",
        timestamp: new Date().toISOString()
    });
});

/**
 * =========================
 * 404 HANDLER
 * =========================
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found"
    });
});

/**
 * =========================
 * GLOBAL ERROR HANDLER
 * =========================
 */
app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR:", err);

    res.status(500).json({
        success: false,
        error: err.message || "Internal server error"
    });
});

module.exports = app;