// COMPLETE SCRIPT TO REMOVE DUPLICATE USER ACCOUNTS
// Keeps only ONE user per email address
// Run with: node remove-duplicate-users.js

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

async function removeDuplicateUsers() {
    console.log('\n🔍 Scanning for duplicate user accounts...\n');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    // Group users by email
    const emailMap = new Map();
    
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        const email = (data.email || doc.id).toLowerCase().trim();
        
        if (!emailMap.has(email)) {
            emailMap.set(email, []);
        }
        
        emailMap.get(email).push({
            id: doc.id,
            data: data,
            hasAdminFlag: data.isAdmin === true,
            hasEmailVerified: data.emailVerified === true,
            hasBalance: (data.balance || 0) > 0,
            createdAt: data.createdAt?.toDate?.() || new Date(0),
            fullName: data.fullName || 'N/A'
        });
    });
    
    // Find duplicates (emails with more than one account)
    const duplicates = [];
    for (const [email, accounts] of emailMap) {
        if (accounts.length > 1) {
            duplicates.push({ email, accounts });
        }
    }
    
    if (duplicates.length === 0) {
        console.log('✅ No duplicate accounts found! Every email has a single account.\n');
        return;
    }
    
    console.log(`📊 Found ${duplicates.length} email(s) with multiple accounts:\n`);
    
    // Display all duplicates
    for (const dup of duplicates) {
        console.log(`\n📧 Email: ${dup.email} (${dup.accounts.length} accounts)`);
        console.log('=' .repeat(50));
        
        dup.accounts.forEach((account, idx) => {
            console.log(`\n  Account ${idx + 1}:`);
            console.log(`    - Document ID: ${account.id}`);
            console.log(`    - Full Name: ${account.fullName}`);
            console.log(`    - isAdmin: ${account.hasAdminFlag}`);
            console.log(`    - Email Verified: ${account.hasEmailVerified}`);
            console.log(`    - Has Balance: $${account.data.balance || 0}`);
            console.log(`    - Created: ${account.createdAt.toLocaleString()}`);
        });
        
        // Determine which account to KEEP
        let keepAccount = null;
        
        // Priority 1: Account with isAdmin = true
        keepAccount = dup.accounts.find(a => a.hasAdminFlag === true);
        
        // Priority 2: Account with email verified
        if (!keepAccount) {
            keepAccount = dup.accounts.find(a => a.hasEmailVerified === true);
        }
        
        // Priority 3: Account with balance (has transaction history)
        if (!keepAccount) {
            keepAccount = dup.accounts.find(a => a.hasBalance === true);
        }
        
        // Priority 4: Most recent account
        if (!keepAccount) {
            keepAccount = dup.accounts.reduce((latest, current) => 
                current.createdAt > latest.createdAt ? current : latest
            );
        }
        
        console.log(`\n  ✨ Will KEEP account: ${keepAccount.id}`);
        console.log(`     Reason: ${keepAccount.hasAdminFlag ? 'Has admin privileges' : 
                                   keepAccount.hasEmailVerified ? 'Email verified' :
                                   keepAccount.hasBalance ? 'Has balance/activity' :
                                   'Most recent account'}`);
        
        console.log(`\n  🗑️ Will DELETE ${dup.accounts.length - 1} account(s):`);
        const toDelete = dup.accounts.filter(a => a.id !== keepAccount.id);
        toDelete.forEach(acc => {
            console.log(`     - ${acc.id} (${acc.fullName})`);
        });
        
        dup.keepAccount = keepAccount;
        dup.toDelete = toDelete;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  WARNING: This will DELETE duplicate user documents from Firestore.');
    console.log('⚠️  This action CANNOT be undone!');
    console.log('='.repeat(60));
    
    // Ask for confirmation
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    readline.question('\nType "DELETE ALL DUPLICATES" to confirm removal: ', async (answer) => {
        if (answer !== 'DELETE ALL DUPLICATES') {
            console.log('\n❌ Cancelled. No changes were made.');
            readline.close();
            process.exit(0);
            return;
        }
        
        console.log('\n🗑️ Deleting duplicate accounts...\n');
        
        // Process each duplicate email
        for (const dup of duplicates) {
            console.log(`\n📧 Processing: ${dup.email}`);
            
            // Delete duplicate accounts
            for (const account of dup.toDelete) {
                await db.collection('users').doc(account.id).delete();
                console.log(`  ✅ Deleted: ${account.id}`);
                
                // Also delete from Firebase Auth if possible
                try {
                    await admin.auth().deleteUser(account.id);
                    console.log(`  ✅ Also deleted from Firebase Auth: ${account.id}`);
                } catch (authError) {
                    // User might not exist in Auth or might be using email as ID
                    if (authError.code !== 'auth/user-not-found') {
                        console.log(`  ⚠️ Could not delete from Auth: ${authError.message}`);
                    }
                }
            }
            
            // Update the kept account
            const keepAccount = dup.keepAccount;
            const updates = {
                email: dup.email,
                emailVerified: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // Ensure admin status for ugbedahamos@gmail.com
            if (dup.email === 'ugbedahamos@gmail.com') {
                updates.isAdmin = true;
                console.log(`  👑 Setting admin status for ${dup.email}`);
            }
            
            await db.collection('users').doc(keepAccount.id).update(updates);
            console.log(`  ✅ Updated kept account: ${keepAccount.id}`);
            
            // Update admins collection
            if (dup.email === 'ugbedahamos@gmail.com') {
                await db.collection('admins').doc(dup.email).set({
                    email: dup.email,
                    isAdmin: true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`  ✅ Updated admins collection`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('🎉 CLEANUP COMPLETE!');
        console.log('='.repeat(50));
        console.log(`\n📊 Summary:`);
        console.log(`   - ${duplicates.length} email(s) with duplicates processed`);
        let totalDeleted = 0;
        duplicates.forEach(dup => totalDeleted += dup.toDelete.length);
        console.log(`   - ${totalDeleted} duplicate account(s) deleted`);
        console.log(`   - ${duplicates.length} primary account(s) kept and updated`);
        
        console.log('\n✨ All duplicate accounts have been removed!');
        console.log('🔐 The admin account (ugbedahamos@gmail.com) now has proper admin status.\n');
        
        readline.close();
    });
}

removeDuplicateUsers().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
});
