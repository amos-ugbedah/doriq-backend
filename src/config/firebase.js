const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let serviceAccount;

console.log("🔧 Initializing Firebase...");

// Debug: Check if environment variables are present
console.log("🔍 Checking environment variables:");
console.log("  - FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID ? "✅ Present" : "❌ Missing");
console.log("  - FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL ? "✅ Present" : "❌ Missing");
console.log("  - FIREBASE_PRIVATE_KEY_B64:", process.env.FIREBASE_PRIVATE_KEY_B64 ? "✅ Present" : "❌ Missing");
console.log("  - FIREBASE_PRIVATE_KEY (legacy):", process.env.FIREBASE_PRIVATE_KEY ? "✅ Present" : "❌ Missing");

// ===============================
// 1. BASE64 METHOD (MOST RELIABLE FOR HUGGING FACE)
// ===============================
if (process.env.FIREBASE_PRIVATE_KEY_B64) {
  console.log("📁 Loading Firebase from Base64 environment variable...");
  
  try {
    // Decode the Base64 string
    const decodedJson = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, "base64").toString("utf-8");
    const credentials = JSON.parse(decodedJson);
    
    serviceAccount = {
      type: credentials.type || "service_account",
      project_id: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
      private_key_id: credentials.private_key_id,
      private_key: credentials.private_key,
      client_email: credentials.client_email || process.env.FIREBASE_CLIENT_EMAIL,
      client_id: credentials.client_id,
      auth_uri: credentials.auth_uri || "https://accounts.google.com/o/oauth2/auth",
      token_uri: credentials.token_uri || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: credentials.auth_provider_x509_cert_url || "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: credentials.client_x509_cert_url
    };
    
    console.log("✅ Firebase loaded from Base64 (most reliable method)");
  } catch (error) {
    console.error("❌ Failed to parse Base64 credentials:", error.message);
    process.exit(1);
  }
}

// ===============================
// 2. LEGACY ENVIRONMENT VARIABLE METHOD
// ===============================
else if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  console.log("📁 Loading Firebase from legacy environment variables...");
  
  // Debug: Show first/last 30 chars of private key
  console.log("🔑 KEY START:", process.env.FIREBASE_PRIVATE_KEY?.slice(0, 40));
  console.log("🔑 KEY END:", process.env.FIREBASE_PRIVATE_KEY?.slice(-40));
  
  // Normalize private key
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  // Replace escaped newlines with actual newlines
  privateKey = privateKey.replace(/\\n/g, "\n");
  // Remove any surrounding quotes
  privateKey = privateKey.replace(/^"|"$/g, "");
  
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ""
  };
  
  console.log("✅ Firebase loaded from legacy environment variables");
}

// ===============================
// 3. FILE FALLBACK (LOCAL DEVELOPMENT ONLY)
// ===============================
else {
  console.log("📁 Loading Firebase from local serviceAccountKey.json...");
  
  try {
    const keyPath = path.join(__dirname, "../../serviceAccountKey.json");
    
    if (!fs.existsSync(keyPath)) {
      throw new Error("serviceAccountKey.json not found and no environment variables set");
    }
    
    serviceAccount = require(keyPath);
    
    // Fix escaped newlines in private key if present
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    
    console.log("✅ Firebase loaded from local file");
  } catch (error) {
    console.error("❌ Firebase config error:", error.message);
    console.error("Please ensure one of the following is configured:");
    console.error("  1. FIREBASE_PRIVATE_KEY_B64 (Base64 encoded service account)");
    console.error("  2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY");
    console.error("  3. serviceAccountKey.json file in the root directory");
    process.exit(1);
  }
}

// ===============================
// VALIDATION
// ===============================
const requiredFields = ["project_id", "client_email", "private_key"];

for (const field of requiredFields) {
  if (!serviceAccount?.[field]) {
    console.error(`❌ Missing Firebase field: ${field}`);
    console.error("Please check your credentials configuration");
    process.exit(1);
  }
}

// Additional validation for private key format
if (serviceAccount.private_key && !serviceAccount.private_key.includes("BEGIN PRIVATE KEY")) {
  console.error("❌ Private key appears to be invalid format");
  console.error("It should contain 'BEGIN PRIVATE KEY'");
  console.error("Key preview:", serviceAccount.private_key.slice(0, 50));
  process.exit(1);
}

console.log(`📌 Project ID: ${serviceAccount.project_id}`);
console.log(`📌 Client Email: ${serviceAccount.client_email}`);
console.log(`📌 Private Key Length: ${serviceAccount.private_key?.length || 0} characters`);

// ===============================
// INITIALIZE FIREBASE ADMIN
// ===============================
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    console.error("This usually indicates an invalid private key format");
    process.exit(1);
  }
}

const db = admin.firestore();
const auth = admin.auth();

console.log("🚀 Firebase is ready to use");

module.exports = {
  admin,
  db,
  auth,
};