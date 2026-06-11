const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
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
   USER ROUTES
========================= */
router.get(
    "/:userId",
    safe(userController.getUser, "getUser")
);

router.post(
    "/create",
    safe(userController.createUser, "createUser")
);

router.get(
    "/transactions/:userId",
    safe(userController.getTransactions, "getTransactions")
);

router.get(
    "/convert-balance/:userId",
    safe(userController.convertBalance, "convertBalance")
);

// Current user profile (requires auth)
router.get(
    "/profile/me",
    verifyToken,
    safe(userController.handleGetCurrentUser, "handleGetCurrentUser")
);

// Admin routes
router.get(
    "/admin/all",
    verifyToken,
    safe(userController.handleGetAllUsers, "handleGetAllUsers")
);

router.put(
    "/admin/update/:uid",
    verifyToken,
    safe(userController.handleUpdateUser, "handleUpdateUser")
);

router.post(
    "/admin/adjust-balance",
    verifyToken,
    safe(userController.handleAdjustBalance, "handleAdjustBalance")
);

router.post(
    "/admin/toggle-premium",
    verifyToken,
    safe(userController.handleTogglePremium, "handleTogglePremium")
);

router.post(
    "/admin/toggle-status",
    verifyToken,
    safe(userController.handleToggleAccountStatus, "handleToggleAccountStatus")
);

router.get(
    "/admin/search/:email",
    verifyToken,
    safe(userController.handleGetUserByEmail, "handleGetUserByEmail")
);

module.exports = router;