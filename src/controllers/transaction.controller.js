import {
    createDeposit,
    approveDeposit,
    rejectDeposit,
    createWithdrawal,
    updateWithdrawalStatus,
    rejectWithdrawal,
    getAllDeposits,
    getAllWithdrawals,
    getAllTransactions
} from "../services/transaction.service.js";


/**
 * =========================
 * GET ALL DEPOSITS (ADMIN)
 * =========================
 */
export const handleGetAllDeposits = async (req, res) => {
    try {
        const { status } = req.query;

        const deposits = await getAllDeposits(status);

        return res.json({
            success: true,
            deposits
        });
    } catch (error) {
        console.error("Get deposits error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch deposits"
        });
    }
};


/**
 * =========================
 * APPROVE DEPOSIT
 * =========================
 */
export const handleApproveDeposit = async (req, res) => {
    try {
        const { depositId } = req.body;

        if (!depositId) {
            return res.status(400).json({
                success: false,
                message: "depositId is required"
            });
        }

        await approveDeposit(depositId);

        return res.json({
            success: true,
            message: "Deposit approved successfully"
        });
    } catch (error) {
        console.error("Approve deposit error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to approve deposit"
        });
    }
};


/**
 * =========================
 * REJECT DEPOSIT
 * =========================
 */
export const handleRejectDeposit = async (req, res) => {
    try {
        const { depositId, reason } = req.body;

        if (!depositId) {
            return res.status(400).json({
                success: false,
                message: "depositId is required"
            });
        }

        await rejectDeposit(depositId, reason);

        return res.json({
            success: true,
            message: "Deposit rejected successfully"
        });
    } catch (error) {
        console.error("Reject deposit error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reject deposit"
        });
    }
};


/**
 * =========================
 * GET ALL WITHDRAWALS
 * =========================
 */
export const handleGetAllWithdrawals = async (req, res) => {
    try {
        const { status } = req.query;

        const withdrawals = await getAllWithdrawals(status);

        return res.json({
            success: true,
            withdrawals
        });
    } catch (error) {
        console.error("Get withdrawals error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch withdrawals"
        });
    }
};


/**
 * =========================
 * UPDATE WITHDRAWAL STATUS
 * =========================
 */
export const handleUpdateWithdrawal = async (req, res) => {
    try {
        const { withdrawalId, status } = req.body;

        if (!withdrawalId || !status) {
            return res.status(400).json({
                success: false,
                message: "withdrawalId and status are required"
            });
        }

        await updateWithdrawalStatus(withdrawalId, status);

        return res.json({
            success: true,
            message: `Withdrawal ${status} successfully`
        });
    } catch (error) {
        console.error("Update withdrawal error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update withdrawal"
        });
    }
};


/**
 * =========================
 * REJECT WITHDRAWAL (WITH REFUND)
 * =========================
 */
export const handleRejectWithdrawal = async (req, res) => {
    try {
        const { withdrawalId, reason } = req.body;

        if (!withdrawalId) {
            return res.status(400).json({
                success: false,
                message: "withdrawalId is required"
            });
        }

        await rejectWithdrawal(withdrawalId, reason);

        return res.json({
            success: true,
            message: "Withdrawal rejected and refunded"
        });
    } catch (error) {
        console.error("Reject withdrawal error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reject withdrawal"
        });
    }
};


/**
 * =========================
 * GET ALL TRANSACTIONS (AUDIT)
 * =========================
 */
export const handleGetAllTransactions = async (req, res) => {
    try {
        const transactions = await getAllTransactions();

        return res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error("Get transactions error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch transactions"
        });
    }
};