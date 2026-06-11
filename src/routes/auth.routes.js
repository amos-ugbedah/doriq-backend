const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

/**
 * Safe wrapper for error handling
 */
const safe = (fn, name) => {
    return async (req, res, next) => {
        if (typeof fn !== "function") {
            console.error(`❌ ROUTE ERROR: ${name} is not a function`);
            return res.status(500).json({
                success: false,
                error: `Internal server error: Missing handler ${name}`
            });
        }
        try {
            await fn(req, res, next);
        } catch (error) {
            console.error(`Error in ${name}:`, error.message);
            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    error: error.message || "Internal server error"
                });
            }
        }
    };
};

/* =========================
   EMAIL CHECK (PREVENTS DUPLICATES)
========================= */
router.post(
    "/check-email",
    safe(authController.checkEmail, "checkEmail")
);

/* =========================
   EMAIL VERIFICATION
========================= */
router.post(
    "/send-verification-code",
    safe(authController.sendVerificationCode, "sendVerificationCode")
);

router.post(
    "/verify-email-code",
    safe(authController.verifyEmailCode, "verifyEmailCode")
);

router.post(
    "/resend-verification-code",
    safe(authController.resendVerificationCode, "resendVerificationCode")
);

router.post(
    "/get-verification-by-email",
    safe(authController.getVerificationByEmail, "getVerificationByEmail")
);

router.get(
    "/check-verification/:email",
    safe(authController.checkVerification, "checkVerification")
);

/* =========================
   TRANSACTION PIN
========================= */
router.post(
    "/set-transaction-pin",
    safe(authController.setTransactionPin, "setTransactionPin")
);

router.post(
    "/verify-transaction-pin",
    safe(authController.verifyTransactionPin, "verifyTransactionPin")
);

router.get(
    "/has-transaction-pin/:userId",
    safe(authController.hasTransactionPin, "hasTransactionPin")
);

router.post(
    "/reset-transaction-pin",
    safe(authController.resetTransactionPin, "resetTransactionPin")
);

router.post(
    "/request-pin-reset",
    safe(authController.requestPinReset, "requestPinReset")
);

module.exports = router;