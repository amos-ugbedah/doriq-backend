const { validateIdNumberFormat, maskSensitiveData } = require('./security.helper');

// ================= DETERMINE KYC STATUS =================
function determineKycStatus({ hasDocuments, idValid }) {
    // Priority:
    // 1. No documents → pending
    // 2. Has documents → pending_review
    // 3. Invalid ID + no docs → pending

    if (hasDocuments) {
        return 'pending_review';
    }

    if (!hasDocuments && idValid) {
        return 'pending';
    }

    return 'pending';
}

// ================= FORMAT KYC SUBMISSION DATA =================
function buildKycSubmissionData({
    firstName,
    lastName,
    country,
    phoneNumber,
    email,
    idNumber,
    documentType
}) {
    return {
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: `${firstName || ''} ${lastName || ''}`.trim(),
        country: country || 'US',
        phoneNumber: phoneNumber || '',
        email: email || '',
        idNumber: idNumber ? maskSensitiveData(idNumber) : null,
        documentType: documentType || 'national_id'
    };
}

// ================= VALIDATE KYC INPUT =================
function validateKycInput({ idNumber, country }) {
    const finalCountry = country || 'US';
    const idValid = validateIdNumberFormat(idNumber, finalCountry);

    return {
        country: finalCountry,
        idValid
    };
}

// ================= BUILD KYC RESPONSE MESSAGE =================
function buildKycResponseMessage({ hasDocuments, idValid }) {
    if (hasDocuments) {
        return "Documents submitted. Admin will review within 24-48 hours.";
    }

    if (idValid) {
        return "ID format verified. Please upload your identification document.";
    }

    return "Please provide a valid ID number and upload your document.";
}

// ================= EXPORTS =================
module.exports = {
    determineKycStatus,
    buildKycSubmissionData,
    validateKycInput,
    buildKycResponseMessage
};