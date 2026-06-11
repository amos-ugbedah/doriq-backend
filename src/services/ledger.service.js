// src/services/ledger.service.js
const { admin, db } = require("../config/firebase");

/**
 * Ledger Types
 * - deposit_credit
 * - withdrawal_debit
 * - admin_adjustment
 * - kyc_bonus
 */

const createLedgerEntry = async ({
    userId,
    type,
    amount,
    currency = "USD",
    meta = {},
    adminId = null
}) => {
    try {
        const entry = {
            userId,
            type,
            amount,
            currency,
            meta,
            adminId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("ledger").add(entry);

        return true;
    } catch (error) {
        console.error("Ledger error:", error);
        throw new Error("Ledger entry failed");
    }
};

/**
 * Safe balance update (atomic logic placeholder)
 */
const updateUserBalance = async (userId, amount, mode = "increment") => {
    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (tx) => {
        const doc = await tx.get(userRef);

        if (!doc.exists) throw new Error("User not found");

        const current = doc.data().balance || 0;

        const newBalance =
            mode === "increment"
                ? current + amount
                : current - amount;

        if (newBalance < 0) throw new Error("Insufficient balance");

        tx.update(userRef, {
            balance: newBalance,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });
};

module.exports = {
    createLedgerEntry,
    updateUserBalance
};