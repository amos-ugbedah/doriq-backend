const { admin, db } = require("../config/firebase");

/**
 * Verify Firebase ID Token and get user from Firestore
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Missing or invalid authorization token"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        
        // IMPORTANT: In your original server, userId is the EMAIL, not the Firebase UID
        const userEmail = decoded.email;
        
        // Get user from Firestore using email as document ID (matches your original structure)
        let userDoc = null;
        let role = "user";
        let userData = {};
        
        try {
            // Try to get user by email as document ID (your original structure)
            userDoc = await db.collection("users").doc(userEmail).get();
            
            if (!userDoc.exists) {
                // If not found, try to find by email field
                const userQuery = await db.collection("users").where("email", "==", userEmail).get();
                if (!userQuery.empty) {
                    userDoc = userQuery.docs[0];
                }
            }
            
            if (userDoc && userDoc.exists) {
                userData = userDoc.data();
                // Check if user is admin (either from isAdmin flag or admin collection)
                const isAdmin = userData.isAdmin === true || userData.email === "ugbedahamos@gmail.com";
                
                // Also check admin collection
                const adminDoc = await db.collection("admins").doc(userEmail).get();
                if (adminDoc.exists && adminDoc.data().isAdmin === true) {
                    role = "admin";
                    // Update user doc if needed
                    if (userDoc.exists && !userData.isAdmin) {
                        await db.collection("users").doc(userDoc.id).update({ isAdmin: true });
                    }
                } else if (isAdmin) {
                    role = "admin";
                }
            } else {
                // User not found in Firestore yet, create basic record
                const detectedCountry = "US"; // Default
                const userCurrency = "USD";
                await db.collection("users").doc(userEmail).set({
                    userId: userEmail,
                    email: userEmail,
                    fullName: decoded.name || userEmail.split('@')[0],
                    country: detectedCountry,
                    currency: userCurrency,
                    identityVerified: false,
                    emailVerified: decoded.email_verified || false,
                    balance: 0,
                    pendingBalance: 0,
                    accountStatus: 'active',
                    isAdmin: userEmail === "ugbedahamos@gmail.com",
                    hasTransactionPin: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (dbError) {
            console.error("Firestore error in auth:", dbError.message);
        }

        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            emailVerified: decoded.email_verified || false,
            role: role,
            userDocId: userDoc ? userDoc.id : userEmail,
            userData: userData
        };

        next();
    } catch (err) {
        console.error("Token verification error:", err.message);
        return res.status(401).json({
            success: false,
            error: "Unauthorized: Invalid or expired token"
        });
    }
};

/**
 * Require Admin Role Middleware
 */
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        // Double-check admin status from database
        const userDoc = await db.collection("users").doc(req.user.email).get();
        let isAdmin = false;
        
        if (userDoc.exists) {
            isAdmin = userDoc.data().isAdmin === true;
        }
        
        // Check admin collection as backup
        if (!isAdmin) {
            const adminDoc = await db.collection("admins").doc(req.user.email).get();
            isAdmin = adminDoc.exists && adminDoc.data().isAdmin === true;
        }
        
        if (!isAdmin && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                error: "Admin access required"
            });
        }

        // Ensure user has admin flag set in Firestore
        if (isAdmin && userDoc.exists && !userDoc.data().isAdmin) {
            await db.collection("users").doc(req.user.email).update({ isAdmin: true });
        }

        next();
    } catch (err) {
        console.error("Admin check error:", err.message);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

/**
 * Optional: Require Email Verified
 */
const requireEmailVerified = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const userDoc = await db.collection("users").doc(req.user.email).get();
        
        if (!userDoc.exists || userDoc.data().emailVerified !== true) {
            return res.status(403).json({
                success: false,
                error: "Email verification required"
            });
        }

        next();
    } catch (err) {
        console.error("Email verification check error:", err.message);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

/**
 * Optional: Require KYC Verified
 */
const requireKYCVerified = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const userDoc = await db.collection("users").doc(req.user.email).get();
        
        if (!userDoc.exists || userDoc.data().identityVerified !== true) {
            return res.status(403).json({
                success: false,
                error: "KYC verification required"
            });
        }

        next();
    } catch (err) {
        console.error("KYC check error:", err.message);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

/**
 * Optional: Require Transaction PIN Set
 */
const requireTransactionPin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const userDoc = await db.collection("users").doc(req.user.email).get();
        
        if (!userDoc.exists || userDoc.data().hasTransactionPin !== true) {
            return res.status(403).json({
                success: false,
                error: "Transaction PIN required"
            });
        }

        next();
    } catch (err) {
        console.error("Transaction PIN check error:", err.message);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

/**
 * Optional: Require Active Account
 */
const requireActiveAccount = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const userDoc = await db.collection("users").doc(req.user.email).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        const accountStatus = userDoc.data().accountStatus || "active";
        
        if (accountStatus === "disabled" || accountStatus === "suspended") {
            return res.status(403).json({
                success: false,
                error: "Account is disabled. Please contact support."
            });
        }

        next();
    } catch (err) {
        console.error("Account status check error:", err.message);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

/**
 * Combined: Full Authentication + Admin + Active Account
 */
const requireFullAdmin = [verifyToken, requireAdmin, requireActiveAccount];

module.exports = {
    verifyToken,
    requireAdmin,
    requireEmailVerified,
    requireKYCVerified,
    requireTransactionPin,
    requireActiveAccount,
    requireFullAdmin
};