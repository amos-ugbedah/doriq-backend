const { admin, db } = require("../config/firebase");
const bcrypt = require("bcrypt");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const axios = require("axios");

// Brevo setup
let brevoApi = null;
const SENDER_EMAIL = process.env.EMAIL_FROM || "ugbedahamos@gmail.com";
const SENDER_NAME = process.env.EMAIL_FROM_NAME || "Doriq";

try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();
    console.log("✅ Brevo email client initialized");
} catch (error) {
    console.error("❌ Brevo initialization error:", error.message);
}

// Helper functions
async function getUserCountryFromIP(ip) {
    try {
        if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") return "US";
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
        if (response.data && response.data.status === "success") return response.data.countryCode;
        return "US";
    } catch (error) {
        return "US";
    }
}

function getCurrencyForCountry(countryCode) {
    const map = {
        "NG": "NGN", "US": "USD", "GB": "GBP", "CA": "CAD",
        "GH": "GHS", "KE": "KES", "ZA": "ZAR", "FR": "EUR",
        "DE": "EUR", "IT": "EUR", "ES": "EUR", "NL": "EUR",
        "IN": "INR", "JP": "JPY", "AU": "AUD", "CN": "CNY"
    };
    return map[countryCode] || "USD";
}

/* =========================
   CHECK IF EMAIL EXISTS (PREVENTS DUPLICATE ACCOUNTS)
========================= */
exports.checkEmail = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check in Firestore users collection
        const userDoc = await db.collection("users").doc(normalizedEmail).get();
        if (userDoc.exists) {
            return res.json({ exists: true, source: 'firestore' });
        }
        
        // Check in Firebase Auth
        let authExists = false;
        try {
            const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
            authExists = true;
        } catch (error) {
            // User not found in Auth - that's fine
            if (error.code !== 'auth/user-not-found') {
                console.error('Auth check error:', error);
            }
        }
        
        // Check pending verifications collection
        let pendingExists = false;
        try {
            const pendingDoc = await db.collection("email_verifications").doc(normalizedEmail).get();
            pendingExists = pendingDoc.exists;
        } catch (error) {
            // Collection might not exist
        }
        
        res.json({ 
            exists: authExists || pendingExists,
            source: authExists ? 'auth' : (pendingExists ? 'pending' : 'none')
        });
        
    } catch (error) {
        console.error("Check email error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   SEND VERIFICATION CODE
========================= */
exports.sendVerificationCode = async (req, res) => {
    const { email, userId, userName } = req.body;
    try {
        const targetEmail = (email || userId).toLowerCase().trim();
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000;
        const hashedCode = await bcrypt.hash(verificationCode, 10);

        await db.collection("email_verifications").doc(targetEmail).set({
            email: targetEmail,
            code: hashedCode,
            expiresAt,
            userId: targetEmail,
            userName: userName,
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`🔑 Verification code for ${targetEmail}: ${verificationCode}`);

        if (brevoApi) {
            try {
                let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
                sendSmtpEmail.subject = "Verify Your DORIQ Account";
                sendSmtpEmail.to = [{ email: targetEmail, name: userName || "User" }];
                sendSmtpEmail.htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #3b82f6;">Verify Your DORIQ Account</h1>
                        <p>Hello ${userName || "User"},</p>
                        <p>Your verification code is:</p>
                        <div style="background: #1e293b; color: white; font-size: 32px; padding: 20px; text-align: center; border-radius: 12px; letter-spacing: 5px;">
                            <strong>${verificationCode}</strong>
                        </div>
                        <p>This code will expire in <strong>15 minutes</strong>.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <hr>
                        <p style="color: #666; font-size: 12px;">© 2026 DORIQ - Global Financial Services</p>
                    </div>
                `;
                sendSmtpEmail.sender = { email: SENDER_EMAIL, name: SENDER_NAME };
                await brevoApi.sendTransacEmail(sendSmtpEmail);
                console.log(`✅ Email sent to ${targetEmail}`);
            } catch (emailError) {
                console.error("Email error:", emailError.message);
            }
        }

        res.json({
            success: true,
            message: "Verification code sent",
            userId: targetEmail,
            devCode: verificationCode
        });
    } catch (error) {
        console.error("Send verification error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   VERIFY EMAIL CODE
========================= */
exports.verifyEmailCode = async (req, res) => {
    const { userId, code, email } = req.body;
    const targetEmail = (email || userId).toLowerCase().trim();
    try {
        const doc = await db.collection("email_verifications").doc(targetEmail).get();
        if (!doc.exists) {
            return res.status(400).json({ error: "No verification request found" });
        }

        const data = doc.data();
        if (data.attempts >= 5) {
            await db.collection("email_verifications").doc(targetEmail).delete();
            return res.status(400).json({ error: "Too many failed attempts" });
        }

        const isValid = await bcrypt.compare(code, data.code);
        if (!isValid) {
            await db.collection("email_verifications").doc(targetEmail).update({
                attempts: admin.firestore.FieldValue.increment(1)
            });
            return res.status(400).json({
                error: `Invalid code. ${4 - data.attempts} attempts remaining`
            });
        }

        if (Date.now() > data.expiresAt) {
            await db.collection("email_verifications").doc(targetEmail).delete();
            return res.status(400).json({ error: "Code expired" });
        }

        const userDoc = await db.collection("users").doc(targetEmail).get();
        if (!userDoc.exists) {
            const clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            const detectedCountry = await getUserCountryFromIP(clientIP);
            const userCurrency = getCurrencyForCountry(detectedCountry);
            await db.collection("users").doc(targetEmail).set({
                userId: targetEmail,
                email: targetEmail,
                fullName: data.userName || targetEmail.split("@")[0],
                country: detectedCountry,
                currency: userCurrency,
                identityVerified: false,
                emailVerified: true,
                balance: 0,
                pendingBalance: 0,
                accountStatus: "active",
                isAdmin: targetEmail === "ugbedahamos@gmail.com",
                hasTransactionPin: false,
                emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Created new user: ${targetEmail}, isAdmin: ${targetEmail === "ugbedahamos@gmail.com"}`);
        } else {
            await db.collection("users").doc(targetEmail).update({
                emailVerified: true,
                emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        await db.collection("email_verifications").doc(targetEmail).delete();
        res.json({ success: true, message: "Email verified!", userId: targetEmail });
    } catch (error) {
        console.error("Verify email error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   RESEND VERIFICATION CODE
========================= */
exports.resendVerificationCode = async (req, res) => {
    const { userId, email, userName } = req.body;
    const targetEmail = (email || userId).toLowerCase().trim();
    try {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000;
        const hashedCode = await bcrypt.hash(verificationCode, 10);
        await db.collection("email_verifications").doc(targetEmail).set({
            email: targetEmail,
            code: hashedCode,
            expiresAt,
            userId: targetEmail,
            userName: userName,
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`🔑 New code for ${targetEmail}: ${verificationCode}`);
        res.json({
            success: true,
            message: "New code sent",
            userId: targetEmail,
            devCode: verificationCode
        });
    } catch (error) {
        console.error("Resend verification error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   GET VERIFICATION BY EMAIL
========================= */
exports.getVerificationByEmail = async (req, res) => {
    const { email } = req.body;
    try {
        const targetEmail = email.toLowerCase().trim();
        const doc = await db.collection("email_verifications").doc(targetEmail).get();
        if (doc.exists) {
            return res.json({ success: true, exists: true, userId: targetEmail, email: targetEmail });
        }
        const userDoc = await db.collection("users").doc(targetEmail).get();
        if (userDoc.exists && !userDoc.data().emailVerified) {
            return res.json({ success: true, exists: true, userId: targetEmail, email: targetEmail });
        }
        res.json({ success: true, exists: false });
    } catch (error) {
        console.error("Get verification error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   CHECK VERIFICATION
========================= */
exports.checkVerification = async (req, res) => {
    const { email } = req.params;
    try {
        const targetEmail = email.toLowerCase().trim();
        const userDoc = await db.collection("users").doc(targetEmail).get();
        res.json({ verified: userDoc.exists ? userDoc.data().emailVerified === true : false });
    } catch (error) {
        console.error("Check verification error:", error);
        res.json({ verified: false });
    }
};

/* =========================
   SET TRANSACTION PIN
========================= */
exports.setTransactionPin = async (req, res) => {
    const { userId, pin } = req.body;
    try {
        console.log(`Setting transaction PIN for user: ${userId}`);
        
        if (!pin || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({ error: "PIN must be exactly 4 digits" });
        }
        
        const hashedPin = await bcrypt.hash(pin, 10);
        const targetId = userId.toLowerCase().trim();
        
        let userRef = db.collection("users").doc(targetId);
        let userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", targetId).get();
            if (!userQuery.empty) {
                userRef = db.collection("users").doc(userQuery.docs[0].id);
                userDoc = userQuery.docs[0];
                console.log(`Found user by email: ${userQuery.docs[0].id}`);
            }
        }
        
        if (!userDoc.exists) {
            console.error(`User not found: ${targetId}`);
            return res.status(404).json({ error: "User not found" });
        }
        
        await userRef.update({
            transactionPin: hashedPin,
            hasTransactionPin: true,
            pinSetAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Transaction PIN set successfully for user: ${targetId}`);
        res.json({ success: true, message: "Transaction PIN set successfully" });
    } catch (error) {
        console.error("Set transaction PIN error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   VERIFY TRANSACTION PIN
========================= */
exports.verifyTransactionPin = async (req, res) => {
    const { userId, pin } = req.body;
    try {
        console.log(`Verifying transaction PIN for user: ${userId}`);
        
        const targetId = userId.toLowerCase().trim();
        let userDoc = await db.collection("users").doc(targetId).get();
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", targetId).get();
            if (!userQuery.empty) {
                userDoc = userQuery.docs[0];
            }
        }
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const isValid = await bcrypt.compare(pin, userDoc.data().transactionPin);
        if (isValid) {
            res.json({ success: true, message: "PIN verified" });
        } else {
            res.status(401).json({ error: "Invalid PIN" });
        }
    } catch (error) {
        console.error("Verify transaction PIN error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   HAS TRANSACTION PIN
========================= */
exports.hasTransactionPin = async (req, res) => {
    const { userId } = req.params;
    try {
        console.log(`Checking if user has transaction PIN: ${userId}`);
        
        const targetId = userId.toLowerCase().trim();
        let userDoc = await db.collection("users").doc(targetId).get();
        
        if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("email", "==", targetId).get();
            if (!userQuery.empty) {
                userDoc = userQuery.docs[0];
            }
        }
        
        const hasPin = userDoc.exists ? userDoc.data().hasTransactionPin === true : false;
        res.json({ hasPin: hasPin });
    } catch (error) {
        console.error("Has transaction PIN error:", error);
        res.json({ hasPin: false });
    }
};

/* =========================
   RESET TRANSACTION PIN
========================= */
exports.resetTransactionPin = async (req, res) => {
    const { userId, newPin, verificationCode } = req.body;
    try {
        if (!newPin || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ error: "PIN must be exactly 4 digits" });
        }
        
        const targetId = userId.toLowerCase().trim();
        const verificationDoc = await db.collection("pin_reset_requests").doc(targetId).get();
        if (!verificationDoc.exists || verificationDoc.data().code !== verificationCode) {
            return res.status(401).json({ error: "Invalid verification code" });
        }
        if (Date.now() > verificationDoc.data().expiresAt) {
            await db.collection("pin_reset_requests").doc(targetId).delete();
            return res.status(401).json({ error: "Verification code expired" });
        }
        const hashedPin = await bcrypt.hash(newPin, 10);
        await db.collection("users").doc(targetId).update({
            transactionPin: hashedPin,
            hasTransactionPin: true,
            pinResetAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await db.collection("pin_reset_requests").doc(targetId).delete();
        res.json({ success: true, message: "PIN reset successfully" });
    } catch (error) {
        console.error("Reset PIN error:", error);
        res.status(500).json({ error: error.message });
    }
};

/* =========================
   REQUEST PIN RESET
========================= */
exports.requestPinReset = async (req, res) => {
    const { email } = req.body;
    try {
        const targetEmail = email.toLowerCase().trim();
        const usersSnapshot = await db.collection("users").where("email", "==", targetEmail).get();
        if (usersSnapshot.empty) {
            return res.status(404).json({ error: "User not found" });
        }
        const userId = usersSnapshot.docs[0].id;
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000;
        await db.collection("pin_reset_requests").doc(userId).set({
            code: resetCode,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({
            success: true,
            code: resetCode,
            message: "Use this code to reset PIN: " + resetCode
        });
    } catch (error) {
        console.error("Request PIN reset error:", error);
        res.status(500).json({ error: error.message });
    }
};