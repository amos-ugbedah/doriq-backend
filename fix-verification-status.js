const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixVerificationStatus() {
    console.log('\n🔍 Checking verification status for ugbedahamos@gmail.com...\n');
    
    const userEmail = 'ugbedahamos@gmail.com';
    const userDoc = await db.collection('users').doc(userEmail).get();
    
    if (!userDoc.exists) {
        console.log('❌ User document not found!');
        return;
    }
    
    const userData = userDoc.data();
    console.log('Current user data:');
    console.log(`  - identityVerified: ${userData.identityVerified}`);
    console.log(`  - emailVerified: ${userData.emailVerified}`);
    console.log(`  - isAdmin: ${userData.isAdmin}`);
    console.log(`  - accountStatus: ${userData.accountStatus}`);
    
    // Fix the verification status
    if (userData.identityVerified !== true) {
        console.log('\n⚠️ identityVerified is not true. Fixing...');
        await db.collection('users').doc(userEmail).update({
            identityVerified: true,
            emailVerified: true,
            kycStatus: 'approved',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Fixed: identityVerified set to true');
    } else {
        console.log('\n✅ identityVerified is already true');
    }
    
    // Also check KYC requests collection
    const kycRequests = await db.collection('kyc_requests')
        .where('userId', '==', userEmail)
        .get();
    
    if (!kycRequests.empty) {
        for (const doc of kycRequests.docs) {
            const request = doc.data();
            if (request.status !== 'approved') {
                console.log(`\n⚠️ KYC request ${doc.id} has status: ${request.status}. Fixing...`);
                await db.collection('kyc_requests').doc(doc.id).update({
                    status: 'approved',
                    approvedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Fixed KYC request status to approved');
            }
        }
    } else {
        console.log('\nℹ️ No KYC request found. Creating one for admin...');
        await db.collection('kyc_requests').doc(`kyc_${userEmail}`).set({
            kycRequestId: `kyc_${userEmail}`,
            userId: userEmail,
            status: 'approved',
            submittedData: {
                fullName: userData.fullName || 'Admin User',
                country: userData.country || 'US'
            },
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: 'system'
        });
        console.log('✅ Created approved KYC request');
    }
    
    console.log('\n🎉 Verification status fixed!');
    console.log('\nUpdated user data:');
    const updatedDoc = await db.collection('users').doc(userEmail).get();
    console.log(`  - identityVerified: ${updatedDoc.data().identityVerified}`);
    console.log(`  - emailVerified: ${updatedDoc.data().emailVerified}`);
}

fixVerificationStatus().catch(console.error);
