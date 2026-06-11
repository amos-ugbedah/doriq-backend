const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ID Format Validation
function validateIdNumberFormat(idNumber, countryCode, documentType) {
    if (!idNumber) return false;
    const cleaned = idNumber.replace(/[\s-]/g, '');
    
    const countryValidators = {
        'US': (num) => /^\d{3}-?\d{2}-?\d{4}$/.test(num) || /^\d{9}$/.test(num),
        'GB': (num) => /^[A-Z]{2}\d{6}[A-Z]?$/.test(num) || /^\d{9}$/.test(num),
        'CA': (num) => /^\d{3}-?\d{3}-?\d{3}$/.test(num),
        'AU': (num) => /^\d{8,9}$/.test(num),
        'DE': (num) => /^\d{10,11}$/.test(num),
        'FR': (num) => /^\d{13,15}$/.test(num),
        'IT': (num) => /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(num),
        'ES': (num) => /^\d{8}[A-Z]$/.test(num),
        'NL': (num) => /^\d{9}$/.test(num),
        'IN': (num) => /^\d{12}$/.test(num),
        'JP': (num) => /^\d{12}$/.test(num),
        'BR': (num) => /^\d{11}$/.test(num),
        'NG': (num) => /^\d{11}$/.test(num),
        'KE': (num) => /^\d{8}$/.test(num),
        'ZA': (num) => /^\d{13}$/.test(num),
        'GH': (num) => /^GHA-\d{9}-\d$/.test(num) || /^\d{10,12}$/.test(num)
    };
    
    if (countryValidators[countryCode]) {
        return countryValidators[countryCode](cleaned);
    }
    return cleaned.length >= 5;
}

function maskSensitiveData(data) {
    if (!data) return null;
    if (data.length <= 6) return '****';
    return data.slice(0, 2) + '****' + data.slice(-3);
}

function saveBase64Image(base64String, filename) {
    let base64Data = base64String;
    if (base64String.includes('base64,')) {
        base64Data = base64String.split('base64,')[1];
    }
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return `/uploads/${filename}`;
}

module.exports = {
    UPLOADS_DIR,
    validateIdNumberFormat,
    maskSensitiveData,
    saveBase64Image
};