// SAFE CLEANUP SCRIPT - Only removes duplicate Firestore documents
// Run with: node cleanup-duplicate-users.js

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
let serviceAccount;
const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(keyPath)) {
    serviceAccount = require(keyPath);
    console.log('✅ Using service account from file');
} else {
    console.error('❌ serviceAccountKey.json not found!');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupDuplicateUsers() {
    console.log('\n🔍 Scanning for users with email: ugbedahamos@gmail.com\n');
    
    const targetEmail = 'ugbedahamos@gmail.com';
    
    // Find all documents with this email
    const usersSnapshot = await db.collection('users').get();
    
    const matchingDocs = [];
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email === targetEmail || doc.id === targetEmail) {
            matchingDocs.push({
                id: doc.id,
                data: data,
                hasAdminFlag: data.isAdmin === true,
                hasEmailVerified: data.emailVerified === true,
                createdAt: data.createdAt?.toDate?.() || new Date(0)
            });
        }
    });
    
    console.log(`📊 Found ${matchingDocs.length} document(s) for ${targetEmail}:\n`);
    
    if (matchingDocs.length === 0) {
        console.log('❌ No documents found for this email!');
        return;
    }
    
    matchingDocs.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`);
        console.log(`  - ID: ${doc.id}`);
        console.log(`  - isAdmin: ${doc.hasAdminFlag}`);
        console.log(`  - emailVerified: ${doc.hasEmailVerified}`);
        console.log(`  - Created: ${doc.createdAt.toLocaleString()}`);
        console.log(`  - Full Name: ${doc.data.fullName || 'N/A'}`);
        console.log('  ---');
    });
    
    if (matchingDocs.length === 1) {
        console.log('✅ Only one document found. No duplicates to clean up!\n');
        // Still ensure admin flag is set
        const doc = matchingDocs[0];
        if (!doc.hasAdminFlag) {
            await db.collection('users').doc(doc.id).update({
                isAdmin: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Updated document ${doc.id} with isAdmin: true`);
        }
        
        // Also update admins collection
        await db.collection('admins').doc(targetEmail).set({
            email: targetEmail,
            isAdmin: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`✅ Updated admins collection`);
        return;
    }
    
    // Find document to keep (prefer one with isAdmin=true)
    let keepDoc = matchingDocs.find(d => d.hasAdminFlag === true);
    if (!keepDoc) {
        keepDoc = matchingDocs[0]; // Keep the first one
    }
    
    console.log(`\n✨ Will KEEP document: ${keepDoc.id}`);
    console.log(`   (isAdmin: ${keepDoc.hasAdminFlag})`);
    console.log('\n🗑️ Documents to DELETE:');
    
    const deleteDocs = matchingDocs.filter(d => d.id !== keepDoc.id);
    deleteDocs.forEach(doc => {
        console.log(`  - ${doc.id} (isAdmin: ${doc.hasAdminFlag})`);
    });
    
    console.log('\n⚠️  This will DELETE duplicate documents from Firestore.');
    console.log('⚠️  Your code and other data will NOT be affected.\n');
    
    // Delete duplicates
    for (const doc of deleteDocs) {
        await db.collection('users').doc(doc.id).delete();
        console.log(`  ✅ Deleted: ${doc.id}`);
    }
    
    // Ensure kept document has admin status
    await db.collection('users').doc(keepDoc.id).update({
        isAdmin: true,
        emailVerified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`\n✅ Updated kept document: ${keepDoc.id} (isAdmin: true)`);
    
    // Update admins collection
    await db.collection('admins').doc(targetEmail).set({
        email: targetEmail,
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅ Updated admins collection for: ${targetEmail}`);
    
    console.log('\n🎉 Cleanup complete! The correct user is now recognized as admin.\n');
}

cleanupDuplicateUsers().catch(console.error);
