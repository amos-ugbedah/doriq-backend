const { admin, db } = require("../config/firebase");
const { createLedgerEntry, updateUserBalance } = require("../services/ledger.service");

/* =========================
   ADMIN CHECK - FIXED to properly check by email
========================= */
exports.checkAdmin = async (req, res) => {
    try {
        const { uid } = req.params;
        
        let userEmail = uid;
        
        if (!uid.includes('@')) {
            try {
                const userRecord = await admin.auth().getUser(uid);
                userEmail = userRecord.email;
            } catch (authError) {
                console.log("User not found in Auth, trying email as ID");
            }
        }
        
        let isAdmin = false;
        
        const userDoc = await db.collection("users").doc(userEmail).get();
        if (userDoc.exists && userDoc.data().isAdmin === true) {
            isAdmin = true;
        }
        
        const adminDoc = await db.collection("admins").doc(userEmail).get();
        if (adminDoc.exists && adminDoc.data().isAdmin === true) {
            isAdmin = true;
        }
        
        if (userEmail === "ugbedahamos@gmail.com") {
            isAdmin = true;
            
            if (!userDoc.exists) {
                await db.collection("users").doc(userEmail).set({
                    userId: userEmail,
                    email: userEmail,
                    fullName: "Admin User",
                    isAdmin: true,
                    emailVerified: true,
                    identityVerified: true,
                    accountStatus: "active",
                    balance: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else if (!userDoc.data().isAdmin) {
                await db.collection("users").doc(userEmail).update({ isAdmin: true });
            }
            
            if (!adminDoc.exists) {
                await db.collection("admins").doc(userEmail).set({
                    email: userEmail,
                    isAdmin: true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log(`Admin check for ${userEmail}: isAdmin = ${isAdmin}`);
        
        return res.json({
            success: true,
            isAdmin: isAdmin
        });
    } catch (error) {
        console.error("Admin check error:", error);
        return res.status(500).json({
            success: false,
            isAdmin: false,
            error: error.message
        });
    }
};

/* =========================
   DASHBOARD STATS
========================= */
exports.getStats = async (req, res) => {
    try {
        const usersSnap = await db.collection("users").get();
        
        // Get pending counts from different collections
        let pendingDeposits = 0;
        let pendingWithdrawals = 0;
        let openTickets = 0;
        
        try {
            const depositsSnap = await db.collection("deposits").where("status", "==", "pending").get();
            pendingDeposits = depositsSnap.size;
        } catch (e) { console.log("No deposits collection yet"); }
        
        try {
            const withdrawalsSnap = await db.collection("withdrawals").where("status", "in", ["pending", "processing"]).get();
            pendingWithdrawals = withdrawalsSnap.size;
        } catch (e) { console.log("No withdrawals collection yet"); }
        
        try {
            const ticketsSnap = await db.collection("support_tickets").where("status", "!=", "closed").get();
            openTickets = ticketsSnap.size;
        } catch (e) { console.log("No tickets collection yet"); }
        
        let totalBalance = 0;
        let verifiedUsers = 0;
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let totalFees = 0;

        usersSnap.forEach(doc => {
            const u = doc.data();
            totalBalance += u.balance || 0;
            if (u.identityVerified) verifiedUsers++;
            totalDeposits += u.totalDeposits || 0;
            totalWithdrawals += u.totalWithdrawn || 0;
            totalFees += u.totalFeesPaid || 0;
        });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        let recentVolume = 0;
        
        try {
            const recentTransactions = await db.collection("transactions")
                .where("createdAt", ">=", sevenDaysAgo)
                .get();
            recentTransactions.forEach(doc => {
                recentVolume += doc.data().amountUSD || doc.data().amount || 0;
            });
        } catch (e) { console.log("No transactions collection yet"); }

        const stats = {
            totalUsers: usersSnap.size,
            verifiedUsers,
            unverifiedUsers: usersSnap.size - verifiedUsers,
            totalBalance,
            totalDeposits,
            totalWithdrawals,
            totalFees,
            pendingDeposits,
            pendingWithdrawals,
            openTickets,
            recentVolume
        };

        return res.json({ success: true, stats });
    } catch (error) {
        console.error("Get stats error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   GET ALL USERS
========================= */
exports.getUsers = async (req, res) => {
    try {
        const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();

        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email || "",
            fullName: doc.data().fullName || "",
            country: doc.data().country || "US",
            currency: doc.data().currency || "USD",
            balance: doc.data().balance || 0,
            identityVerified: doc.data().identityVerified || false,
            isPremium: doc.data().isPremium || false,
            isAdmin: doc.data().isAdmin || false,
            hasTransactionPin: doc.data().hasTransactionPin || false,
            emailVerified: doc.data().emailVerified || false,
            totalDeposits: doc.data().totalDeposits || 0,
            totalWithdrawn: doc.data().totalWithdrawn || 0,
            accountStatus: doc.data().accountStatus || "active",
            createdAt: doc.data().createdAt
        }));

        return res.json({ success: true, users });
    } catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   GET ALL KYC REQUESTS WITH PROPER FILTERING
========================= */
exports.getAllKycRequests = async (req, res) => {
    try {
        const { status } = req.query;
        
        console.log(`📋 Fetching KYC requests with status filter: ${status || 'all'}`);
        
        // Get ALL kyc_requests first
        const snapshot = await db.collection("kyc_requests")
            .orderBy("submittedAt", "desc")
            .get();
        
        const allRequests = [];
        
        for (const doc of snapshot.docs) {
            const request = doc.data();
            const requestStatus = request.status || 'pending';
            
            // Determine if this request should be included based on filter
            let shouldInclude = false;
            
            if (!status || status === 'all') {
                shouldInclude = true;
            } else if (status === 'pending_review') {
                // Pending review includes both 'pending' and 'pending_review'
                shouldInclude = (requestStatus === 'pending' || requestStatus === 'pending_review');
            } else if (status === 'approved') {
                shouldInclude = (requestStatus === 'approved');
            } else if (status === 'rejected') {
                shouldInclude = (requestStatus === 'rejected');
            }
            
            if (shouldInclude) {
                // Get user data
                let userEmail = 'Unknown';
                let userName = request.submittedData?.fullName || 'Unknown';
                
                try {
                    const userDoc = await db.collection("users").doc(request.userId).get();
                    if (userDoc.exists) {
                        userEmail = userDoc.data().email || 'Unknown';
                        if (!userName || userName === 'Unknown') {
                            userName = userDoc.data().fullName || request.userId;
                        }
                    }
                } catch (userError) {
                    console.error(`Error fetching user:`, userError.message);
                }
                
                // Get documents
                let documents = [];
                try {
                    const docFiles = await db.collection("kyc_documents").doc(request.userId).get();
                    if (docFiles.exists) {
                        documents = docFiles.data().documents || [];
                    }
                } catch (docError) {
                    console.error(`Error fetching documents:`, docError.message);
                }
                
                allRequests.push({
                    id: doc.id,
                    kycRequestId: request.kycRequestId || doc.id,
                    userId: request.userId,
                    status: requestStatus,
                    submittedData: request.submittedData || {},
                    idFormatValid: request.idFormatValid || false,
                    hasDocuments: documents.length > 0,
                    documents: documents,
                    userEmail: userEmail,
                    userName: userName,
                    submittedAt: request.submittedAt,
                    approvedAt: request.approvedAt,
                    rejectedAt: request.rejectedAt,
                    rejectionReason: request.rejectionReason,
                    approvedBy: request.approvedBy,
                    rejectedBy: request.rejectedBy
                });
            }
        }
        
        console.log(`✅ Found ${allRequests.length} KYC requests for filter: ${status || 'all'}`);
        
        return res.json({ 
            success: true, 
            requests: allRequests 
        });
    } catch (error) {
        console.error("❌ Get all KYC requests error:", error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

/* =========================
   GET PENDING KYC REQUESTS
========================= */
exports.getKycRequests = async (req, res) => {
    try {
        console.log(`Fetching pending KYC requests`);
        
        const snapshot = await db.collection("kyc_requests")
            .orderBy("submittedAt", "desc")
            .get();

        const requests = [];
        for (const doc of snapshot.docs) {
            const request = doc.data();
            const requestStatus = request.status || 'pending';
            
            // Only include pending and pending_review
            if (requestStatus === 'pending' || requestStatus === 'pending_review') {
                
                let userEmail = 'Unknown';
                let userName = request.submittedData?.fullName || 'Unknown';
                
                try {
                    const userDoc = await db.collection("users").doc(request.userId).get();
                    if (userDoc.exists) {
                        userEmail = userDoc.data().email || 'Unknown';
                        if (!userName || userName === 'Unknown') {
                            userName = userDoc.data().fullName || request.userId;
                        }
                    }
                } catch (userError) {
                    console.error(`Error fetching user:`, userError.message);
                }
                
                let documents = [];
                try {
                    const docFiles = await db.collection("kyc_documents").doc(request.userId).get();
                    if (docFiles.exists) {
                        documents = docFiles.data().documents || [];
                    }
                } catch (docError) {
                    console.error(`Error fetching documents:`, docError.message);
                }
                
                requests.push({
                    id: doc.id,
                    kycRequestId: request.kycRequestId || doc.id,
                    userId: request.userId,
                    status: requestStatus,
                    submittedData: request.submittedData || {},
                    idFormatValid: request.idFormatValid || false,
                    hasDocuments: documents.length > 0,
                    documents: documents,
                    userEmail: userEmail,
                    userName: userName,
                    submittedAt: request.submittedAt,
                    rejectionReason: request.rejectionReason
                });
            }
        }

        console.log(`Found ${requests.length} pending KYC requests`);
        
        return res.json({ success: true, requests });
    } catch (error) {
        console.error("Get KYC requests error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   APPROVE KYC
========================= */
exports.approveKyc = async (req, res) => {
    try {
        const { kycRequestId, userId, notes } = req.body;
        
        console.log(`✅ Approving KYC for user: ${userId}`);
        
        // Update the KYC request
        await db.collection("kyc_requests").doc(kycRequestId).update({
            status: "approved",
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: req.user?.email || req.user?.uid || 'admin',
            adminNotes: notes || ""
        });

        // Update the user document
        await db.collection("users").doc(userId).update({
            identityVerified: true,
            kycStatus: "approved",
            kycApprovedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ KYC approved for ${userId}`);

        return res.json({ success: true, message: "KYC approved successfully" });
    } catch (error) {
        console.error("❌ Approve KYC error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   REJECT KYC
========================= */
exports.rejectKyc = async (req, res) => {
    try {
        const { kycRequestId, userId, reason } = req.body;
        
        console.log(`❌ Rejecting KYC for user: ${userId}, Reason: ${reason}`);
        
        // Update the KYC request
        await db.collection("kyc_requests").doc(kycRequestId).update({
            status: "rejected",
            rejectionReason: reason,
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedBy: req.user?.email || req.user?.uid || 'admin'
        });

        // Update the user document
        await db.collection("users").doc(userId).update({
            identityVerified: false,
            kycStatus: "rejected",
            kycRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            kycRejectionReason: reason
        });
        
        console.log(`❌ KYC rejected for ${userId}`);

        return res.json({ success: true, message: "KYC rejected" });
    } catch (error) {
        console.error("❌ Reject KYC error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   GET ALL PENDING DEPOSITS
========================= */
exports.getAllPendingDeposits = async (req, res) => {
    try {
        console.log(`Fetching pending deposits`);
        
        let deposits = [];
        
        // Try to get from pending_deposits collection
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
            console.log("No pending_deposits collection yet, checking deposits collection");
            
            // Try deposits collection instead
            const depositsSnapshot = await db.collection("deposits")
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .get();
            
            for (const doc of depositsSnapshot.docs) {
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
        }
        
        console.log(`Found ${deposits.length} pending deposits`);
        
        return res.json({ 
            success: true, 
            deposits: deposits 
        });
    } catch (error) {
        console.error("Get pending deposits error:", error);
        // Return empty array instead of error to prevent frontend crash
        return res.json({ 
            success: true, 
            deposits: [] 
        });
    }
};

/* =========================
   ADJUST BALANCE
========================= */
exports.adjustBalance = async (req, res) => {
    try {
        const { userId, amount, reason, isIncrement } = req.body;

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const currentBalance = userDoc.data().balance || 0;
        const adjustmentAmount = parseFloat(amount);
        const newBalance = isIncrement ? currentBalance + adjustmentAmount : currentBalance - adjustmentAmount;
        
        if (newBalance < 0) {
            return res.status(400).json({ success: false, error: "Balance cannot be negative" });
        }

        await userRef.update({ 
            balance: newBalance,
            lastBalanceUpdate: admin.firestore.FieldValue.serverTimestamp()
        });

        const transactionId = `ADJ_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        await db.collection("transactions").doc(transactionId).set({
            transactionId,
            userId,
            type: "admin_adjustment",
            amount: adjustmentAmount,
            isIncrement,
            previousBalance: currentBalance,
            newBalance,
            reason: reason || "Manual adjustment",
            adjustedBy: req.user?.email || req.user?.uid || 'admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({
            success: true,
            message: `Balance ${isIncrement ? 'increased' : 'decreased'} by ${adjustmentAmount}`,
            newBalance
        });
    } catch (error) {
        console.error("Adjust balance error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   TOGGLE PREMIUM
========================= */
exports.togglePremium = async (req, res) => {
    try {
        const { userId, isPremium } = req.body;

        await db.collection("users").doc(userId).update({
            isPremium: isPremium,
            premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            premiumUpdatedBy: req.user?.email || req.user?.uid || 'admin'
        });

        return res.json({
            success: true,
            message: `Premium status updated to ${isPremium}`
        });
    } catch (error) {
        console.error("Toggle premium error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   TOGGLE ACCOUNT STATUS
========================= */
exports.toggleAccountStatus = async (req, res) => {
    try {
        const { userId, status, reason } = req.body;
        const newStatus = status === "disabled" ? "disabled" : "active";

        await db.collection("users").doc(userId).update({
            accountStatus: newStatus,
            accountStatusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            accountStatusUpdatedBy: req.user?.email || req.user?.uid || 'admin',
            accountStatusReason: reason || ""
        });

        return res.json({
            success: true,
            message: `Account ${newStatus === "disabled" ? "disabled" : "enabled"} successfully`
        });
    } catch (error) {
        console.error("Toggle account status error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   GET ALL WITHDRAWALS
========================= */
exports.getAllWithdrawals = async (req, res) => {
    try {
        console.log(`Fetching all withdrawals`);
        
        let withdrawals = [];
        
        try {
            const withdrawalsSnapshot = await db.collection("withdrawals")
                .orderBy("createdAt", "desc")
                .limit(100)
                .get();
            
            for (const doc of withdrawalsSnapshot.docs) {
                const withdrawal = doc.data();
                let userName = 'Unknown';
                let userEmail = 'Unknown';
                
                try {
                    const userDoc = await db.collection("users").doc(withdrawal.userId).get();
                    if (userDoc.exists) {
                        userName = userDoc.data().fullName || 'Unknown';
                        userEmail = userDoc.data().email || 'Unknown';
                    }
                } catch (userError) {
                    console.error(`Error fetching user:`, userError.message);
                }
                
                withdrawals.push({
                    id: doc.id,
                    ...withdrawal,
                    userName: userName,
                    userEmail: userEmail
                });
            }
        } catch (e) {
            console.log("No withdrawals collection yet");
        }
        
        console.log(`Found ${withdrawals.length} withdrawals`);
        
        return res.json({ 
            success: true, 
            withdrawals: withdrawals 
        });
    } catch (error) {
        console.error("Get withdrawals error:", error);
        return res.json({ 
            success: true, 
            withdrawals: [] 
        });
    }
};

/* =========================
   UPDATE WITHDRAWAL STATUS
========================= */
exports.updateWithdrawal = async (req, res) => {
    try {
        const { withdrawalId, status, reason } = req.body;
        
        await db.collection("withdrawals").doc(withdrawalId).update({
            status: status,
            adminUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            adminNote: reason || '',
            updatedBy: req.user?.email || req.user?.uid || 'admin'
        });
        
        return res.json({ 
            success: true, 
            message: `Withdrawal ${status} successfully` 
        });
    } catch (error) {
        console.error("Update withdrawal error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   BAN USER
========================= */
exports.banUser = async (req, res) => {
    try {
        const { userId, reason, duration } = req.body;
        const adminEmail = req.headers['admin-email'] || req.user?.email || 'admin';
        
        // Find user by email or ID
        let userDoc = await db.collection("users").doc(userId).get();
        let actualUserId = userId;
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (userQuery.empty) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            userDoc = userQuery.docs[0];
            actualUserId = userDoc.id;
        }
        
        const userEmail = userDoc.data().email;
        
        // Calculate ban expiry if duration provided
        let banExpiresAt = null;
        if (duration && duration !== 'permanent') {
            const durationMap = { '1d': 1, '7d': 7, '14d': 14, '30d': 30 };
            const days = durationMap[duration];
            if (days) {
                banExpiresAt = new Date();
                banExpiresAt.setDate(banExpiresAt.getDate() + days);
            }
        }
        
        await db.collection("users").doc(actualUserId).update({
            accountStatus: 'banned',
            banReason: reason || 'Violation of terms of service',
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedBy: adminEmail,
            banExpiresAt: banExpiresAt
        });
        
        // Add to banned emails collection to prevent new signups
        await db.collection("banned_emails").doc(userEmail).set({
            email: userEmail,
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedBy: adminEmail,
            reason: reason || 'Violation of terms of service',
            banExpiresAt: banExpiresAt
        }, { merge: true });
        
        // Also ban in Firebase Auth
        try {
            await admin.auth().updateUser(actualUserId, { disabled: true });
        } catch (authError) {
            console.log('Could not disable in Auth:', authError.message);
        }
        
        res.json({ 
            success: true, 
            message: duration === 'permanent' ? 'User permanently banned' : `User banned for ${duration}`,
            banExpiresAt
        });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   SUSPEND USER
========================= */
exports.suspendUser = async (req, res) => {
    try {
        const { userId, reason, duration } = req.body;
        const adminEmail = req.headers['admin-email'] || req.user?.email || 'admin';
        
        // Find user
        let userDoc = await db.collection("users").doc(userId).get();
        let actualUserId = userId;
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (userQuery.empty) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            userDoc = userQuery.docs[0];
            actualUserId = userDoc.id;
        }
        
        // Calculate suspension expiry
        let suspendExpiresAt = null;
        const durationMap = { '1d': 1, '7d': 7, '14d': 14, '30d': 30 };
        const days = durationMap[duration];
        if (days) {
            suspendExpiresAt = new Date();
            suspendExpiresAt.setDate(suspendExpiresAt.getDate() + days);
        }
        
        await db.collection("users").doc(actualUserId).update({
            accountStatus: 'suspended',
            suspensionReason: reason || 'Temporary suspension',
            suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
            suspendedBy: adminEmail,
            suspensionExpiresAt: suspendExpiresAt
        });
        
        res.json({ 
            success: true, 
            message: `User suspended for ${duration}`,
            suspensionExpiresAt: suspendExpiresAt
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   RESTRICT USER
========================= */
exports.restrictUser = async (req, res) => {
    try {
        const { userId, reason, restrictions } = req.body;
        const adminEmail = req.headers['admin-email'] || req.user?.email || 'admin';
        
        // Find user
        let userDoc = await db.collection("users").doc(userId).get();
        let actualUserId = userId;
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (userQuery.empty) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            userDoc = userQuery.docs[0];
            actualUserId = userDoc.id;
        }
        
        const restrictionList = restrictions || ['withdrawals', 'send_money'];
        
        await db.collection("users").doc(actualUserId).update({
            accountStatus: 'restricted',
            restrictionReason: reason || 'Account restricted due to suspicious activity',
            restrictions: restrictionList,
            restrictedAt: admin.firestore.FieldValue.serverTimestamp(),
            restrictedBy: adminEmail
        });
        
        res.json({ 
            success: true, 
            message: 'User account restricted',
            restrictions: restrictionList
        });
    } catch (error) {
        console.error('Restrict user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   RESTORE USER
========================= */
exports.restoreUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const adminEmail = req.headers['admin-email'] || req.user?.email || 'admin';
        
        // Find user
        let userDoc = await db.collection("users").doc(userId).get();
        let actualUserId = userId;
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (userQuery.empty) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            userDoc = userQuery.docs[0];
            actualUserId = userDoc.id;
        }
        
        const userEmail = userDoc.data().email;
        
        await db.collection("users").doc(actualUserId).update({
            accountStatus: 'active',
            restoredAt: admin.firestore.FieldValue.serverTimestamp(),
            restoredBy: adminEmail,
            suspensionReason: admin.firestore.FieldValue.delete(),
            suspendedAt: admin.firestore.FieldValue.delete(),
            suspensionExpiresAt: admin.firestore.FieldValue.delete(),
            restrictionReason: admin.firestore.FieldValue.delete(),
            restrictions: admin.firestore.FieldValue.delete(),
            banReason: admin.firestore.FieldValue.delete(),
            bannedAt: admin.firestore.FieldValue.delete(),
            bannedBy: admin.firestore.FieldValue.delete(),
            banExpiresAt: admin.firestore.FieldValue.delete()
        });
        
        // Remove from banned emails if unbanned
        const bannedDoc = await db.collection("banned_emails").doc(userEmail).get();
        if (bannedDoc.exists) {
            await db.collection("banned_emails").doc(userEmail).delete();
        }
        
        // Re-enable in Firebase Auth if was disabled
        try {
            await admin.auth().updateUser(actualUserId, { disabled: false });
        } catch (authError) {
            console.log('Could not enable in Auth:', authError.message);
        }
        
        res.json({ success: true, message: 'User account restored to active status' });
    } catch (error) {
        console.error('Restore user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   DELETE USER (Permanent)
========================= */
exports.deleteUser = async (req, res) => {
    try {
        const { userId, reason } = req.body;
        const adminEmail = req.headers['admin-email'] || req.user?.email || 'admin';
        
        // Find user
        let userDoc = await db.collection("users").doc(userId).get();
        let actualUserId = userId;
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (userQuery.empty) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            userDoc = userQuery.docs[0];
            actualUserId = userDoc.id;
        }
        
        const userEmail = userDoc.data().email;
        
        // Save to deleted_users collection for record
        await db.collection("deleted_users").doc(actualUserId).set({
            originalEmail: userEmail,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: adminEmail,
            deletionReason: reason || 'Account deleted by admin',
            userData: userDoc.data()
        });
        
        // Add to banned_emails to prevent re-registration
        await db.collection("banned_emails").doc(userEmail).set({
            email: userEmail,
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedBy: adminEmail,
            reason: `Account deleted: ${reason || 'Violation of terms'}`,
            isDeleted: true
        });
        
        // Delete from Firestore users collection
        await db.collection("users").doc(actualUserId).delete();
        
        // Delete from Firebase Auth
        try {
            await admin.auth().deleteUser(actualUserId);
        } catch (authError) {
            console.log('Could not delete from Auth:', authError.message);
        }
        
        res.json({ 
            success: true, 
            message: 'User account permanently deleted. Email is blocked from re-registration.'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   TOGGLE ADMIN STATUS
========================= */
exports.toggleAdmin = async (req, res) => {
    try {
        const { userId, email, isAdmin } = req.body;
        const targetEmail = email || userId;
        
        const userDoc = await db.collection("users").doc(targetEmail).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        await db.collection("users").doc(targetEmail).update({
            isAdmin: isAdmin,
            adminUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            adminUpdatedBy: req.headers['admin-email'] || req.user?.email
        });
        
        if (isAdmin) {
            await db.collection("admins").doc(targetEmail).set({
                email: targetEmail,
                isAdmin: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } else {
            const adminDoc = await db.collection("admins").doc(targetEmail).get();
            if (adminDoc.exists) {
                await db.collection("admins").doc(targetEmail).delete();
            }
        }
        
        res.json({ success: true, message: `Admin status updated to ${isAdmin}` });
    } catch (error) {
        console.error('Toggle admin error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};