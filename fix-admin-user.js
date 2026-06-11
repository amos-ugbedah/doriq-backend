// save as fix-admin-final.js
const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        serviceAccount = require("./serviceAccountKey.json");
    }
} catch (error) {
    console.error("Error:", error);
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixAdmin() {
    const adminEmail = "ugbedahamos@gmail.com";
    
    try {
        // Update users collection
        await db.collection("users").doc(adminEmail).set({
            userId: adminEmail,
            email: adminEmail,
            fullName: "Admin User",
            isAdmin: true,
            emailVerified: true,
            identityVerified: true,
            accountStatus: "active",
            balance: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Update admins collection
        await db.collection("admins").doc(adminEmail).set({
            email: adminEmail,
            isAdmin: true,
            role: "super_admin",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log("✅ Admin user fixed!");
        
        // Verify
        const verifyUser = await db.collection("users").doc(adminEmail).get();
        console.log("User isAdmin:", verifyUser.data()?.isAdmin);
        
    } catch (error) {
        console.error("Error:", error);
    }
}

fixAdmin();