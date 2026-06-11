const bcrypt = require('bcrypt');

// ================= ID VALIDATION =================
function validateIdNumberFormat(idNumber, countryCode) {
    if (!idNumber) return false;

    const cleaned = idNumber.replace(/[\s-]/g, '');

    const validators = {
        US: (n) => /^\d{3}-?\d{2}-?\d{4}$/.test(n) || /^\d{9}$/.test(n),
        GB: (n) => /^[A-Z]{2}\d{6}[A-Z]?$/.test(n) || /^\d{9}$/.test(n),
        CA: (n) => /^\d{3}-?\d{3}-?\d{3}$/.test(n),
        NG: (n) => /^\d{11}$/.test(n),
        IN: (n) => /^\d{12}$/.test(n),
        KE: (n) => /^\d{8}$/.test(n),
        ZA: (n) => /^\d{13}$/.test(n),
        GH: (n) => /^GHA-\d{9}-\d$/.test(n) || /^\d{10,12}$/.test(n)
    };

    if (validators[countryCode]) {
        return validators[countryCode](cleaned);
    }

    return cleaned.length >= 5;
}

// ================= MASK SENSITIVE DATA =================
function maskSensitiveData(data) {
    if (!data) return null;

    if (data.length <= 6) {
        return '****';
    }

    return data.slice(0, 2) + '****' + data.slice(-3);
}

// ================= PIN HASHING =================
async function hashPin(pin) {
    return bcrypt.hash(pin, 10);
}

async function comparePin(pin, hashedPin) {
    if (!hashedPin) return false;
    return bcrypt.compare(pin, hashedPin);
}

// ================= BASIC EMAIL/PIN VALIDATION =================
function validateFourDigitPin(pin) {
    return /^\d{4}$/.test(pin);
}

// ================= EXPORTS =================
module.exports = {
    validateIdNumberFormat,
    maskSensitiveData,
    hashPin,
    comparePin,
    validateFourDigitPin
};