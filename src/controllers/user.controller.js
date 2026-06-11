const { admin, db } = require("../config/firebase");

/**
 * =========================
 * GET SINGLE USER
 * =========================
 */
exports.getUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Try to find user by email as document ID first
        let userDoc = await db.collection("users").doc(userId).get();
        
        // If not found, try to find by email field
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (!userQuery.empty) {
                userDoc = userQuery.docs[0];
            }
        }

        if (!userDoc || !userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userData = userDoc.data();
        
        return res.json({
            success: true,
            userId: userDoc.id,
            email: userData.email || "",
            fullName: userData.fullName || "",
            country: userData.country || "US",
            currency: userData.currency || "USD",
            symbol: userData.currency === "NGN" ? "₦" : "$",
            usdBalance: userData.balance || 0,
            identityVerified: userData.identityVerified || false,
            emailVerified: userData.emailVerified || false,
            isAdmin: userData.isAdmin || false,
            hasTransactionPin: userData.hasTransactionPin || false,
            accountStatus: userData.accountStatus || "active"
        });
    } catch (error) {
        console.error("Get user error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user",
            error: error.message
        });
    }
};

/**
 * =========================
 * CREATE USER
 * =========================
 */
exports.createUser = async (req, res) => {
    const { userId, email, fullName } = req.body;
    try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            // Get country from IP (simplified)
            const detectedCountry = "US";
            await db.collection("users").doc(userId).set({
                userId,
                email: email || userId,
                fullName: fullName || userId.split('@')[0],
                country: detectedCountry,
                currency: "USD",
                identityVerified: false,
                emailVerified: false,
                balance: 0,
                pendingBalance: 0,
                accountStatus: "active",
                isAdmin: email === "ugbedahamos@gmail.com",
                hasTransactionPin: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * =========================
 * GET TRANSACTIONS
 * =========================
 */
exports.getTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await db.collection("transactions")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();
        
        const result = [];
        transactions.forEach(doc => result.push({ id: doc.id, ...doc.data() }));
        res.json({ success: true, transactions: result });
    } catch (error) {
        console.error("Get transactions error:", error);
        res.json({ success: true, transactions: [] });
    }
};

/**
 * =========================
 * CONVERT BALANCE
 * =========================
 */
exports.convertBalance = async (req, res) => {
    try {
        const { userId } = req.params;
        const doc = await db.collection("users").doc(userId).get();
        const usdBalance = doc.exists ? (doc.data().balance || 0) : 0;
        const userCurrency = doc.exists ? (doc.data().currency || "USD") : "USD";
        
        // Simple conversion rates (you can add live rates later)
        const rates = { USD: 1, NGN: 1500, GBP: 0.78, EUR: 0.92, CAD: 1.35 };
        const rate = rates[userCurrency] || 1;
        const localBalance = usdBalance * rate;
        
        const symbols = { USD: "$", NGN: "₦", GBP: "£", EUR: "€", CAD: "C$" };
        
        res.json({
            usdBalance,
            localBalance,
            currency: userCurrency,
            currencySymbol: symbols[userCurrency] || "$"
        });
    } catch (error) {
        res.json({ usdBalance: 0, localBalance: 0, currency: "USD", currencySymbol: "$" });
    }
};

/**
 * =========================
 * GET ALL USERS (ADMIN)
 * =========================
 */
exports.handleGetAllUsers = async (req, res) => {
    try {
        const usersSnapshot = await db.collection("users").orderBy("createdAt", "desc").get();
        
        const users = [];
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            users.push({
                id: doc.id,
                userId: userData.userId || doc.id,
                email: userData.email || "",
                fullName: userData.fullName || "",
                firstName: userData.firstName || "",
                lastName: userData.lastName || "",
                country: userData.country || "US",
                currency: userData.currency || "USD",
                balance: userData.balance || 0,
                identityVerified: userData.identityVerified || false,
                emailVerified: userData.emailVerified || false,
                isAdmin: userData.isAdmin || false,
                isPremium: userData.isPremium || false,
                hasTransactionPin: userData.hasTransactionPin || false,
                accountStatus: userData.accountStatus || "active",
                totalDeposits: userData.totalDeposits || 0,
                totalWithdrawn: userData.totalWithdrawn || 0,
                createdAt: userData.createdAt,
                lastTransaction: userData.lastTransaction
            });
        }

        return res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error("Get all users error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message
        });
    }
};

/**
 * =========================
 * UPDATE USER PROFILE
 * =========================
 */
exports.handleUpdateUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;
        
        // Find user document
        let userRef = db.collection("users").doc(uid);
        let userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            // Try to find by email field
            const userQuery = await db.collection("users").where("email", "==", uid).get();
            if (!userQuery.empty) {
                userRef = db.collection("users").doc(userQuery.docs[0].id);
                userDoc = userQuery.docs[0];
            } else {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
        }
        
        // Allowed fields to update
        const allowedUpdates = [
            "fullName", "firstName", "lastName", "phoneNumber", 
            "country", "currency", "address", "dateOfBirth"
        ];
        
        const updateData = {};
        for (const field of allowedUpdates) {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        }
        
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        
        await userRef.update(updateData);
        
        const updatedDoc = await userRef.get();
        const updatedUser = updatedDoc.data();

        return res.json({
            success: true,
            message: "User updated successfully",
            user: {
                id: updatedDoc.id,
                email: updatedUser.email || "",
                fullName: updatedUser.fullName || "",
                firstName: updatedUser.firstName || "",
                lastName: updatedUser.lastName || "",
                phoneNumber: updatedUser.phoneNumber || "",
                country: updatedUser.country || "US",
                currency: updatedUser.currency || "USD"
            }
        });
    } catch (error) {
        console.error("Update user error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update user",
            error: error.message
        });
    }
};

/**
 * =========================
 * ADJUST USER BALANCE
 * =========================
 */
exports.handleAdjustBalance = async (req, res) => {
    try {
        const { userId, amount, isIncrement, reason } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({
                success: false,
                message: "userId and amount are required"
            });
        }

        // Find user by email
        let userRef = db.collection("users").doc(userId);
        let userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (!userQuery.empty) {
                userRef = db.collection("users").doc(userQuery.docs[0].id);
                userDoc = userQuery.docs[0];
            } else {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
        }

        const currentBalance = userDoc.data().balance || 0;
        const adjustmentAmount = parseFloat(amount);
        const newBalance = isIncrement ? currentBalance + adjustmentAmount : currentBalance - adjustmentAmount;
        
        if (newBalance < 0) {
            return res.status(400).json({
                success: false,
                message: "Balance cannot be negative"
            });
        }

        await userRef.update({
            balance: newBalance,
            lastBalanceUpdate: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create transaction record
        const transactionId = `ADJ_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        await db.collection("transactions").doc(transactionId).set({
            transactionId,
            userId: userDoc.id,
            type: "balance_adjustment",
            amount: adjustmentAmount,
            isIncrement,
            previousBalance: currentBalance,
            newBalance,
            reason: reason || "Manual adjustment",
            adjustedBy: req.user?.email || "admin",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({
            success: true,
            message: `Balance ${isIncrement ? 'increased' : 'decreased'} by ${adjustmentAmount}`,
            previousBalance: currentBalance,
            newBalance
        });
    } catch (error) {
        console.error("Adjust balance error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to adjust balance"
        });
    }
};

/**
 * =========================
 * TOGGLE PREMIUM STATUS
 * =========================
 */
exports.handleTogglePremium = async (req, res) => {
    try {
        const { userId, isPremium } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        // Find user
        let userRef = db.collection("users").doc(userId);
        let userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (!userQuery.empty) {
                userRef = db.collection("users").doc(userQuery.docs[0].id);
                userDoc = userQuery.docs[0];
            } else {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
        }

        await userRef.update({
            isPremium: isPremium === true,
            premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            premiumUpdatedBy: req.user?.email || "admin"
        });

        const updatedDoc = await userRef.get();
        const user = updatedDoc.data();

        return res.json({
            success: true,
            message: `User ${isPremium ? "upgraded to" : "removed from"} premium`,
            user: {
                id: updatedDoc.id,
                email: user.email,
                isPremium: user.isPremium
            }
        });
    } catch (error) {
        console.error("Toggle premium error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update premium status",
            error: error.message
        });
    }
};

/**
 * =========================
 * TOGGLE ACCOUNT STATUS
 * =========================
 */
exports.handleToggleAccountStatus = async (req, res) => {
    try {
        const { userId, status } = req.body;

        if (!userId || !status) {
            return res.status(400).json({
                success: false,
                message: "userId and status are required"
            });
        }

        const validStatuses = ["active", "disabled", "suspended"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be: active, disabled, or suspended"
            });
        }

        // Find user
        let userRef = db.collection("users").doc(userId);
        let userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userId).get();
            if (!userQuery.empty) {
                userRef = db.collection("users").doc(userQuery.docs[0].id);
                userDoc = userQuery.docs[0];
            } else {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
        }

        await userRef.update({
            accountStatus: status,
            accountStatusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            accountStatusUpdatedBy: req.user?.email || "admin"
        });

        const updatedDoc = await userRef.get();
        const user = updatedDoc.data();

        return res.json({
            success: true,
            message: `Account ${status === "active" ? "activated" : status}`,
            user: {
                id: updatedDoc.id,
                email: user.email,
                accountStatus: user.accountStatus
            }
        });
    } catch (error) {
        console.error("Toggle account status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update account status",
            error: error.message
        });
    }
};

/**
 * =========================
 * SEARCH USER BY EMAIL
 * =========================
 */
exports.handleGetUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Try to find by email as document ID first
        let userDoc = await db.collection("users").doc(email).get();
        
        // If not found, try to find by email field
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", email).get();
            if (!userQuery.empty) {
                userDoc = userQuery.docs[0];
            }
        }

        if (!userDoc || !userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userData = userDoc.data();

        return res.json({
            success: true,
            user: {
                id: userDoc.id,
                userId: userData.userId || userDoc.id,
                email: userData.email || "",
                fullName: userData.fullName || "",
                firstName: userData.firstName || "",
                lastName: userData.lastName || "",
                country: userData.country || "US",
                currency: userData.currency || "USD",
                balance: userData.balance || 0,
                identityVerified: userData.identityVerified || false,
                emailVerified: userData.emailVerified || false,
                isAdmin: userData.isAdmin || false,
                isPremium: userData.isPremium || false,
                accountStatus: userData.accountStatus || "active",
                phoneNumber: userData.phoneNumber || "",
                createdAt: userData.createdAt
            }
        });
    } catch (error) {
        console.error("Get user by email error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user",
            error: error.message
        });
    }
};

/**
 * =========================
 * GET USER PROFILE (Current User)
 * =========================
 */
exports.handleGetCurrentUser = async (req, res) => {
    try {
        // Get user from auth middleware
        const userEmail = req.user?.email;
        
        if (!userEmail) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Find user by email
        let userDoc = await db.collection("users").doc(userEmail).get();
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", userEmail).get();
            if (!userQuery.empty) {
                userDoc = userQuery.docs[0];
            }
        }

        if (!userDoc || !userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const userData = userDoc.data();

        return res.json({
            success: true,
            user: {
                id: userDoc.id,
                email: userData.email || "",
                fullName: userData.fullName || "",
                firstName: userData.firstName || "",
                lastName: userData.lastName || "",
                country: userData.country || "US",
                currency: userData.currency || "USD",
                balance: userData.balance || 0,
                identityVerified: userData.identityVerified || false,
                emailVerified: userData.emailVerified || false,
                isAdmin: userData.isAdmin || false,
                isPremium: userData.isPremium || false,
                hasTransactionPin: userData.hasTransactionPin || false,
                accountStatus: userData.accountStatus || "active",
                phoneNumber: userData.phoneNumber || "",
                totalDeposits: userData.totalDeposits || 0,
                totalWithdrawn: userData.totalWithdrawn || 0,
                createdAt: userData.createdAt
            }
        });
    } catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user profile",
            error: error.message
        });
    }
};