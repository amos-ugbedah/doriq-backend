const { admin, db } = require("../config/firebase");
const { createLedgerEntry } = require("../services/ledger.service");

/* =========================
   GET ALL WITHDRAWALS
========================= */
exports.getAllWithdrawals = async (req, res) => {
    try {
        const snapshot = await db
            .collection("withdrawals")
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();

        const withdrawals = [];
        for (const doc of snapshot.docs) {
            const withdrawal = doc.data();
            const userDoc = await db.collection("users").doc(withdrawal.userId).get();
            
            withdrawals.push({
                id: doc.id,
                ...withdrawal,
                userName: userDoc.exists ? (userDoc.data().fullName || "Unknown") : "Unknown",
                userEmail: userDoc.exists ? userDoc.data().email || "" : ""
            });
        }

        return res.json({ success: true, withdrawals });
    } catch (error) {
        console.error("Get withdrawals error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   UPDATE WITHDRAWAL STATUS
========================= */
exports.updateWithdrawal = async (req, res) => {
    const { withdrawalId, status, reason } = req.body;

    try {
        const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);
        const doc = await withdrawalRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Withdrawal not found" });
        }

        const withdrawal = doc.data();

        if (withdrawal.status === "approved" || withdrawal.status === "rejected") {
            return res.status(400).json({
                success: false,
                error: "Withdrawal already processed"
            });
        }

        await withdrawalRef.update({
            status,
            adminUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: req.user.uid,
            adminNote: reason || ""
        });

        // If rejected → refund balance
        if (status === "rejected") {
            const userRef = db.collection("users").doc(withdrawal.userId);
            
            await db.runTransaction(async (tx) => {
                const userDoc = await tx.get(userRef);
                const currentBalance = userDoc.data().balance || 0;

                tx.update(userRef, {
                    balance: currentBalance + withdrawal.amount,
                    totalWithdrawn: admin.firestore.FieldValue.increment(-withdrawal.amount)
                });
            });

            await createLedgerEntry({
                userId: withdrawal.userId,
                type: "withdrawal_refund",
                amount: withdrawal.amount,
                meta: { withdrawalId, reason },
                adminId: req.user.uid
            });
        }

        return res.json({
            success: true,
            message: `Withdrawal ${status} successfully`
        });

    } catch (error) {
        console.error("Update withdrawal error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};