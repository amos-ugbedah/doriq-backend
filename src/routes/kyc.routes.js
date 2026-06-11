const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const db = admin.firestore();

// Helper functions
function maskSensitiveData(data) {
    if (!data) return null;
    if (data.length <= 6) return '****';
    return data.slice(0, 2) + '****' + data.slice(-3);
}

function validateIdNumberFormat(idNumber, countryCode) {
    if (!idNumber) return false;
    const cleaned = idNumber.replace(/[\s-]/g, '');
    const validators = {
        'US': (n) => /^\d{3}-?\d{2}-?\d{4}$/.test(n) || /^\d{9}$/.test(n),
        'GB': (n) => /^[A-Z]{2}\d{6}[A-Z]?$/.test(n) || /^\d{9}$/.test(n),
        'CA': (n) => /^\d{3}-?\d{3}-?\d{3}$/.test(n),
        'NG': (n) => /^\d{11}$/.test(n),
        'IN': (n) => /^\d{12}$/.test(n),
        'KE': (n) => /^\d{8}$/.test(n),
        'ZA': (n) => /^\d{13}$/.test(n),
        'GH': (n) => /^GHA-\d{9}-\d$/.test(n) || /^\d{10,12}$/.test(n)
    };
    if (validators[countryCode]) return validators[countryCode](cleaned);
    return cleaned.length >= 5;
}

// Helper to get user email from UID
async function getUserEmailFromUid(uid) {
    try {
        if (uid.includes('@')) return uid;
        const userRecord = await admin.auth().getUser(uid);
        return userRecord.email;
    } catch (error) {
        return uid;
    }
}

// ================= KYC UPLOAD ENDPOINT =================
router.post('/upload-kyc-document', async (req, res) => {
    const { userId, documentType, documentImage, selfieImage } = req.body;
    try {
        const UPLOADS_DIR = path.join(__dirname, '../uploads');
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        
        const savedFiles = [];
        if (documentImage) {
            let base64Data = documentImage;
            if (documentImage.includes('base64,')) {
                base64Data = documentImage.split('base64,')[1];
            }
            const docFileName = `doc_${userId}_${Date.now()}.jpg`;
            const docPath = path.join(UPLOADS_DIR, docFileName);
            fs.writeFileSync(docPath, Buffer.from(base64Data, 'base64'));
            savedFiles.push({ type: 'document', path: `/uploads/${docFileName}`, uploadedAt: new Date().toISOString() });
        }
        if (selfieImage) {
            let base64Data = selfieImage;
            if (selfieImage.includes('base64,')) {
                base64Data = selfieImage.split('base64,')[1];
            }
            const selfieFileName = `selfie_${userId}_${Date.now()}.jpg`;
            const selfiePath = path.join(UPLOADS_DIR, selfieFileName);
            fs.writeFileSync(selfiePath, Buffer.from(base64Data, 'base64'));
            savedFiles.push({ type: 'selfie', path: `/uploads/${selfieFileName}`, uploadedAt: new Date().toISOString() });
        }
        
        await db.collection('kyc_documents').doc(userId).set({
            userId, documents: savedFiles, documentType: documentType || 'national_id',
            status: 'pending_review', uploadedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        res.json({ success: true, message: 'Documents uploaded successfully', files: savedFiles });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload documents' });
    }
});

// ================= KYC VERIFICATION ENDPOINT =================
router.post('/verify-kyc', async (req, res) => {
    const { userId, country, firstName, lastName, phoneNumber, email, idNumber, documentType, idValid } = req.body;
    try {
        // Convert UID to email for storage
        let targetUserId = userId;
        if (!userId.includes('@')) {
            const userEmail = await getUserEmailFromUid(userId);
            if (userEmail && userEmail.includes('@')) targetUserId = userEmail;
        }
        
        const finalCountry = country || "US";
        const idFormatValid = idValid === true || validateIdNumberFormat(idNumber, finalCountry);
        const docSnapshot = await db.collection('kyc_documents').doc(userId).get();
        const hasDocuments = docSnapshot.exists && docSnapshot.data().documents?.length > 0;
        
        const verificationStatus = hasDocuments ? 'pending_review' : 'pending';
        const kycRequestId = `KYC_${Date.now()}_${targetUserId}`;
        
        await db.collection('kyc_requests').doc(kycRequestId).set({
            kycRequestId, userId: targetUserId, status: verificationStatus,
            submittedData: {
                firstName: firstName || '', lastName: lastName || '',
                fullName: `${firstName || ''} ${lastName || ''}`.trim(),
                country: finalCountry, phoneNumber: phoneNumber || '', email: email || '',
                idNumber: idNumber ? maskSensitiveData(idNumber) : null, documentType: documentType || 'national_id'
            },
            idFormatValid: idFormatValid, hasDocuments: hasDocuments,
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('users').doc(targetUserId).set({
            identityVerified: false, kycStatus: verificationStatus, kycRequestId,
            fullName: `${firstName || ''} ${lastName || ''}`.trim(), firstName: firstName || '', lastName: lastName || '',
            country: finalCountry, phoneNumber: phoneNumber || '', email: email || '',
            kycSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(idNumber && { idNumberSubmitted: maskSensitiveData(idNumber) })
        }, { merge: true });
        
        let responseMessage = hasDocuments ? "Documents submitted. Admin will review within 24-48 hours."
            : idFormatValid ? "ID format verified. Please upload your identification document."
            : "Please provide a valid ID number and upload your document.";
        
        res.json({ success: true, verified: false, status: verificationStatus, requiresDocumentUpload: !hasDocuments, message: responseMessage });
    } catch (error) {
        console.error('KYC Error:', error);
        res.status(500).json({ error: "KYC verification failed" });
    }
});

// ================= VALIDATE ID FORMAT =================
router.post('/validate-id', async (req, res) => {
    const { idNumber, countryCode } = req.body;
    const isValid = validateIdNumberFormat(idNumber, countryCode);
    const formatHints = {
        'US': 'Format: XXX-XX-XXXX (9 digits)', 'GB': 'Format: AA123456C (9 characters)',
        'CA': 'Format: XXX-XXX-XXX (9 digits)', 'NG': 'Format: 11 digits (e.g., 12345678901)',
        'IN': 'Format: 12 digits (Aadhaar)', 'KE': 'Format: 8 digits', 'ZA': 'Format: 13 digits'
    };
    const formatHint = formatHints[countryCode] || 'Check your document number format';
    res.json({ valid: isValid, formatHint, message: isValid ? 'Valid ID format' : `Invalid ID format. ${formatHint}` });
});

// ================= ADMIN: GET ALL KYC REQUESTS =================
router.get('/all-kyc-requests', async (req, res) => {
    try {
        const { status } = req.query;
        let query = db.collection('kyc_requests').orderBy('submittedAt', 'desc');
        
        if (status && status !== 'all') {
            if (status === 'pending_review') {
                query = query.where('status', 'in', ['pending', 'pending_review']);
            } else {
                query = query.where('status', '==', status);
            }
        }
        
        const kycSnapshot = await query.limit(100).get();
        const requests = [];
        
        for (const doc of kycSnapshot.docs) {
            const request = doc.data();
            const docFiles = await db.collection('kyc_documents').doc(request.userId).get();
            
            requests.push({
                id: doc.id,
                ...request,
                documents: docFiles.exists ? docFiles.data().documents : []
            });
        }
        
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Admin KYC error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================= ADMIN: APPROVE KYC =================
router.post('/approve-kyc', async (req, res) => {
    const { kycRequestId, userId, notes } = req.body;
    try {
        await db.collection('kyc_requests').doc(kycRequestId).update({
            status: 'approved', approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: req.headers['admin-email'] || 'admin', adminNotes: notes || ''
        });
        await db.collection('users').doc(userId).update({
            identityVerified: true, kycStatus: 'approved', kycApprovedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true, message: "KYC approved successfully" });
    } catch (error) {
        console.error('Approve KYC error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================= ADMIN: REJECT KYC =================
router.post('/reject-kyc', async (req, res) => {
    const { kycRequestId, userId, reason } = req.body;
    try {
        await db.collection('kyc_requests').doc(kycRequestId).update({
            status: 'rejected', rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedBy: req.headers['admin-email'] || 'admin', rejectionReason: reason
        });
        await db.collection('users').doc(userId).update({
            identityVerified: false, kycStatus: 'rejected',
            kycRejectedAt: admin.firestore.FieldValue.serverTimestamp(), kycRejectionReason: reason
        });
        res.json({ success: true, message: "KYC rejected" });
    } catch (error) {
        console.error('Reject KYC error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;