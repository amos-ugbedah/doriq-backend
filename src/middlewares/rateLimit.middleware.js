const rateLimit = require("express-rate-limit");

const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests/min per admin
    message: {
        success: false,
        error: "Too many requests, slow down"
    }
});

module.exports = adminLimiter;