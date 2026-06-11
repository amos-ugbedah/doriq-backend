const fs = require('fs');
const path = require('path');

// ================= UPLOAD DIRECTORY =================
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
function ensureUploadsDir() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
}

// Run immediately on import
ensureUploadsDir();

// ================= SAVE BASE64 IMAGE =================
function saveBase64Image(base64String, filename) {
    let base64Data = base64String;

    if (!base64String) return null;

    // Remove metadata prefix if present
    if (base64String.includes('base64,')) {
        base64Data = base64String.split('base64,')[1];
    }

    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(
        filePath,
        Buffer.from(base64Data, 'base64')
    );

    return `/uploads/${filename}`;
}

// ================= GENERATE SAFE FILENAME =================
function generateFileName(prefix, userId, ext = 'jpg') {
    return `${prefix}_${userId}_${Date.now()}.${ext}`;
}

// ================= EXPORTS =================
module.exports = {
    UPLOADS_DIR,
    saveBase64Image,
    generateFileName,
    ensureUploadsDir
};