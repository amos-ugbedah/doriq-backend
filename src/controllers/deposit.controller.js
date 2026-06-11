const { admin, db } = require("../config/firebase");

/* =========================
   GET ALL PENDING DEPOSITS
========================= */
exports.getAllPendingDeposits = async (req, res) => {
    try {
        console.log(`Fetching pending deposits`);
        
        let deposits = [];
        
        try {
            const pendingSnapshot = await db.collection("pending_deposits")
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .get();
            
            for (const doc of pendingSnapshot.docs) {
                const deposit = doc.data();
                let userName = 'Unknown';
                let userEmail = 'Unknown';
                
                try {
                    const userDoc = await db.collection("users").doc(deposit.userId).get();
                    if (userDoc.exists) {
                        userName = userDoc.data().fullName || 'Unknown';
                        userEmail = userDoc.data().email || 'Unknown';
                    }
                } catch (userError) {
                    console.error(`Error fetching user:`, userError.message);
                }
                
                deposits.push({
                    id: doc.id,
                    ...deposit,
                    userName: userName,
                    userEmail: userEmail
                });
            }
        } catch (e) {
            console.log("No pending_deposits collection yet:", e.message);
        }
        
        console.log(`Found ${deposits.length} pending deposits`);
        
        return res.json({ 
            success: true, 
            deposits: deposits 
        });
    } catch (error) {
        console.error("Get pending deposits error:", error);
        return res.json({ 
            success: true, 
            deposits: [] 
        });
    }
};

/* =========================
   APPROVE DEPOSIT
========================= */
exports.approveDeposit = async (req, res) => {
    const { depositId, userId, amount, fee, netAmount } = req.body;
    
    try {
        const depositRef = db.collection("pending_deposits").doc(depositId);
        const depositDoc = await depositRef.get();
        
        if (!depositDoc.exists) {
            return res.status(404).json({ success: false, error: "Deposit not found" });
        }
        
        await depositRef.update({
            status: "approved",
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: req.user?.email || req.user?.uid || 'admin'
        });
        
        const finalNetAmount = netAmount || (parseFloat(amount) - parseFloat(fee || 0));
        
        await db.collection("users").doc(userId).update({
            balance: admin.firestore.FieldValue.increment(finalNetAmount),
            totalDeposits: admin.firestore.FieldValue.increment(parseFloat(amount)),
            totalFeesPaid: admin.firestore.FieldValue.increment(parseFloat(fee || 0)),
            lastTransaction: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const transactionId = `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        await db.collection("transactions").doc(transactionId).set({
            transactionId,
            userId,
            type: "deposit",
            amount: parseFloat(amount),
            fee: parseFloat(fee || 0),
            netAmount: finalNetAmount,
            status: "completed",
            approvedBy: req.user?.email || req.user?.uid || 'admin',
            depositId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return res.json({ 
            success: true, 
            message: "Deposit approved and credited" 
        });
    } catch (error) {
        console.error("Approve deposit error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   REJECT DEPOSIT
========================= */
exports.rejectDeposit = async (req, res) => {
    const { depositId, reason } = req.body;
    
    try {
        await db.collection("pending_deposits").doc(depositId).update({
            status: "rejected",
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedBy: req.user?.email || req.user?.uid || 'admin',
            rejectionReason: reason || ""
        });
        
        return res.json({ 
            success: true, 
            message: "Deposit rejected" 
        });
    } catch (error) {
        console.error("Reject deposit error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};