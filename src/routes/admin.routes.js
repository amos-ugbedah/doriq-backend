const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const depositController = require("../controllers/deposit.controller");
const withdrawalController = require("../controllers/withdrawal.controller");
const ticketController = require("../controllers/ticket.controller");

const { verifyToken, requireAdmin } = require("../middlewares/auth.middleware");

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
   ADMIN CHECK - NO requireAdmin NEEDED (circular dependency fix)
========================= */
router.get(
    "/check/:uid",
    verifyToken,
    safe(adminController.checkAdmin, "checkAdmin")
);

/* =========================
   PROTECTED ADMIN ROUTES
========================= */
router.get(
    "/stats",
    verifyToken,
    requireAdmin,
    safe(adminController.getStats, "getStats")
);

router.get(
    "/users",
    verifyToken,
    requireAdmin,
    safe(adminController.getUsers, "getUsers")
);

/* =========================
   KYC MANAGEMENT
========================= */
router.get(
    "/kyc-requests",
    verifyToken,
    requireAdmin,
    safe(adminController.getKycRequests, "getKycRequests")
);

router.get(
    "/all-kyc-requests",
    verifyToken,
    requireAdmin,
    safe(adminController.getAllKycRequests, "getAllKycRequests")
);

router.post(
    "/approve-kyc",
    verifyToken,
    requireAdmin,
    safe(adminController.approveKyc, "approveKyc")
);

router.post(
    "/reject-kyc",
    verifyToken,
    requireAdmin,
    safe(adminController.rejectKyc, "rejectKyc")
);

/* =========================
   USER MANAGEMENT
========================= */
router.post(
    "/adjust-balance",
    verifyToken,
    requireAdmin,
    safe(adminController.adjustBalance, "adjustBalance")
);

router.post(
    "/toggle-premium",
    verifyToken,
    requireAdmin,
    safe(adminController.togglePremium, "togglePremium")
);

router.post(
    "/toggle-account-status",
    verifyToken,
    requireAdmin,
    safe(adminController.toggleAccountStatus, "toggleAccountStatus")
);

/* =========================
   USER MANAGEMENT (Ban/Suspend/Restrict/Delete)
========================= */
router.post(
    "/ban-user",
    verifyToken,
    requireAdmin,
    safe(adminController.banUser, "banUser")
);

router.post(
    "/suspend-user",
    verifyToken,
    requireAdmin,
    safe(adminController.suspendUser, "suspendUser")
);

router.post(
    "/restrict-user",
    verifyToken,
    requireAdmin,
    safe(adminController.restrictUser, "restrictUser")
);

router.post(
    "/restore-user",
    verifyToken,
    requireAdmin,
    safe(adminController.restoreUser, "restoreUser")
);

router.post(
    "/delete-user",
    verifyToken,
    requireAdmin,
    safe(adminController.deleteUser, "deleteUser")
);

router.post(
    "/toggle-admin",
    verifyToken,
    requireAdmin,
    safe(adminController.toggleAdmin, "toggleAdmin")
);

/* =========================
   DEPOSIT MANAGEMENT
========================= */
router.get(
    "/all-pending-deposits",
    verifyToken,
    requireAdmin,
    safe(depositController.getAllPendingDeposits, "getAllPendingDeposits")
);

router.post(
    "/approve-deposit",
    verifyToken,
    requireAdmin,
    safe(depositController.approveDeposit, "approveDeposit")
);

router.post(
    "/reject-deposit",
    verifyToken,
    requireAdmin,
    safe(depositController.rejectDeposit, "rejectDeposit")
);

/* =========================
   WITHDRAWAL MANAGEMENT
========================= */
router.get(
    "/all-withdrawals",
    verifyToken,
    requireAdmin,
    safe(withdrawalController.getAllWithdrawals, "getAllWithdrawals")
);

router.post(
    "/update-withdrawal",
    verifyToken,
    requireAdmin,
    safe(withdrawalController.updateWithdrawal, "updateWithdrawal")
);

/* =========================
   SUPPORT TICKETS
========================= */
router.get(
    "/support-tickets",
    verifyToken,
    requireAdmin,
    safe(ticketController.getTickets, "getTickets")
);

router.post(
    "/update-ticket",
    verifyToken,
    requireAdmin,
    safe(ticketController.updateTicket, "updateTicket")
);

module.exports = router;