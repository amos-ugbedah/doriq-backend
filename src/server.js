require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

// Import route modules
const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const kycRoutes = require("./routes/kyc.routes");
const bankRoutes = require("./routes/bank.routes");

const app = express();

// Configure CORS properly - ADD VERCEL DOMAIN
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'https://doriq.vercel.app',
    'https://doriq-*.vercel.app',
    'https://*.vercel.app',
    'https://ugbedah001-doriq.hf.space'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(allowed => origin === allowed || origin.endsWith('.vercel.app'))) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Still allow for now, log it
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'admin-email']
}));

app.use(express.json({ limit: "10mb" }));

// Create uploads directory
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

/**
 * =========================
 * FIREBASE INITIALIZATION
 * =========================
 */
let serviceAccount;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("✅ Firebase service account loaded from environment variable");
    } else {
        const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = require(serviceAccountPath);
            console.log("✅ Firebase service account loaded from file");
        } else {
            console.log("⚠️ No service account file found, using default config");
            serviceAccount = {
                project_id: process.env.FIREBASE_PROJECT_ID || "doriq-e0e2a",
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                private_key: process.env.FIREBASE_PRIVATE_KEY
            };
        }
    }
} catch (error) {
    console.error("❌ Failed to load Firebase service account:", error.message);
    serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID || "doriq-e0e2a",
        client_email: process.env.FIREBASE_CLIENT_EMAIL
    };
}

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin SDK initialized");
    } catch (error) {
        console.error("❌ Firebase initialization failed:", error.message);
    }
}

const db = admin.firestore();

// Helper function to get user email from UID
async function getUserEmailFromUid(uid) {
    try {
        if (uid.includes('@')) {
            return uid;
        }
        const userRecord = await admin.auth().getUser(uid);
        return userRecord.email;
    } catch (error) {
        console.error("Error getting user email:", error.message);
        return null;
    }
}

/**
 * =========================
 * API ROUTES
 * =========================
 */
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", kycRoutes);
app.use("/api", bankRoutes);

/**
 * =========================
 * COMPATIBILITY ROUTES
 * =========================
 */

// Convert balance compatibility
app.get("/api/convert-balance/:userId", async (req, res) => {
    try {
        let { userId } = req.params;
        
        if (!userId.includes('@')) {
            const email = await getUserEmailFromUid(userId);
            if (email) userId = email;
        }
        
        const doc = await db.collection("users").doc(userId).get();
        const usdBalance = doc.exists ? (doc.data().balance || 0) : 0;
        const userCurrency = doc.exists ? (doc.data().currency || "USD") : "USD";
        
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
        console.error("Convert balance error:", error);
        res.json({ usdBalance: 0, localBalance: 0, currency: "USD", currencySymbol: "$" });
    }
});

// Admin check compatibility
app.get("/api/admin/check/:userId", async (req, res) => {
    try {
        let { userId } = req.params;
        let isAdmin = false;
        
        if (!userId.includes('@')) {
            const email = await getUserEmailFromUid(userId);
            if (email) userId = email;
        }
        
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists && userDoc.data().isAdmin === true) {
            isAdmin = true;
        }
        
        const adminDoc = await db.collection("admins").doc(userId).get();
        if (adminDoc.exists && adminDoc.data().isAdmin === true) {
            isAdmin = true;
        }
        
        if (userId === "ugbedahamos@gmail.com") {
            isAdmin = true;
        }
        
        console.log(`Compat admin check for ${userId}: ${isAdmin}`);
        res.json({ isAdmin });
    } catch (error) {
        console.error("Compat admin check error:", error);
        res.json({ isAdmin: false });
    }
});

// Admin status endpoint
app.get("/api/admin/status", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const userEmail = decoded.email;
        
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
            if (!userDoc.exists || !userDoc.data().isAdmin) {
                await db.collection("users").doc(userEmail).set({
                    email: userEmail,
                    isAdmin: true,
                    fullName: "Admin User",
                    balance: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
        
        console.log(`Admin status for ${userEmail}: ${isAdmin}`);
        res.json({ 
            success: true, 
            isAdmin,
            user: {
                email: userEmail,
                uid: decoded.uid
            }
        });
    } catch (error) {
        console.error("Admin status error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user by email or UID
app.get("/api/user/:userId", async (req, res) => {
    try {
        let { userId } = req.params;
        
        if (!userId.includes('@')) {
            const email = await getUserEmailFromUid(userId);
            if (email) userId = email;
        }
        
        const doc = await db.collection("users").doc(userId).get();
        if (!doc.exists) {
            return res.json({ success: true, country: 'US', currency: 'USD', symbol: '$', isNewUser: true });
        }
        
        const data = doc.data();
        res.json({ 
            success: true, 
            userId: userId,
            country: data.country || 'US', 
            currency: data.currency || 'USD',
            symbol: data.currency === 'NGN' ? '₦' : '$',
            usdBalance: data.balance || 0,
            email: data.email || '',
            fullName: data.fullName || '',
            identityVerified: data.identityVerified || false,
            emailVerified: data.emailVerified || false,
            isAdmin: data.isAdmin || false,
            hasTransactionPin: data.hasTransactionPin || false,
            accountStatus: data.accountStatus || 'active'
        });
    } catch (err) {
        console.error("Get user error:", err);
        res.json({ success: true, country: 'US', currency: 'USD', symbol: '$' });
    }
});

// Create user endpoint
app.post("/api/user/create", async (req, res) => {
    try {
        const { userId, email, fullName } = req.body;
        const userEmail = email || userId;
        
        const existingDoc = await db.collection("users").doc(userEmail).get();
        if (existingDoc.exists) {
            return res.json({ success: true, message: "User already exists" });
        }
        
        await db.collection("users").doc(userEmail).set({
            userId: userEmail,
            email: userEmail,
            fullName: fullName || userEmail.split('@')[0],
            country: "US",
            currency: "USD",
            identityVerified: false,
            emailVerified: true,
            balance: 0,
            pendingBalance: 0,
            accountStatus: "active",
            isAdmin: userEmail === "ugbedahamos@gmail.com",
            hasTransactionPin: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, message: "User created" });
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check verification
app.get("/api/auth/check-verification/:userId", async (req, res) => {
    try {
        let { userId } = req.params;
        
        if (!userId.includes('@')) {
            const email = await getUserEmailFromUid(userId);
            if (email) userId = email;
        }
        
        const userDoc = await db.collection("users").doc(userId).get();
        res.json({ verified: userDoc.exists ? (userDoc.data().emailVerified === true || userDoc.data().identityVerified === true) : false });
    } catch (error) {
        console.error("Check verification error:", error);
        res.json({ verified: false });
    }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/health", (req, res) => {
    res.json({ status: "OK", message: "Doriq backend is running", timestamp: new Date().toISOString() });
});

// Handle 404
app.use("*", (req, res) => {
    res.status(404).json({ success: false, error: "Route not found" });
});

/**
 * =========================
 * START SERVER
 * =========================
 */
const PORT = process.env.PORT || 7860;

const server = app.listen(PORT, () => {
    console.log(`\n🚀 DORIQ Server running on port ${PORT}`);
    console.log(`📍 Health: http://localhost:${PORT}/api/health`);
    console.log(`📍 Root Health: http://localhost:${PORT}/health`);
    console.log(`✅ Admin email: ugbedahamos@gmail.com`);
    console.log(`📋 Routes loaded:`);
    console.log(`   - /api/admin/*`);
    console.log(`   - /api/auth/*`);
    console.log(`   - /api/user/*`);
    console.log(`   - /api/user/create`);
    console.log(`   - /api/banks/:country`);
    console.log(`   - /api/convert-balance/:userId`);
    console.log(`   - /api/admin/check/:userId`);
    console.log(`   - /api/admin/status`);
    console.log(`   - /api/auth/check-verification/:userId`);
});

process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down server...");
    server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
    });
});

process.on("SIGTERM", () => {
    console.log("\n🛑 SIGTERM received...");
    server.close(() => {
        console.log("✅ Server terminated");
        process.exit(0);
    });
});