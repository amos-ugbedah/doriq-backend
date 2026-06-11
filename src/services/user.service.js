import admin from "firebase-admin";

const db = admin.firestore();
const usersRef = db.collection("users");

/**
 * Get user by UID
 */
export const getUserById = async (uid) => {
    const doc = await usersRef.doc(uid).get();

    if (!doc.exists) return null;

    return {
        id: doc.id,
        ...doc.data()
    };
};


/**
 * Get user by email
 */
export const getUserByEmail = async (email) => {
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];

    return {
        id: doc.id,
        ...doc.data()
    };
};


/**
 * Create new user profile in Firestore
 */
export const createUser = async (uid, data) => {
    const userData = {
        fullName: data.fullName || "",
        email: data.email || "",
        country: data.country || "",
        currency: data.currency || "USD",
        balance: 0,
        localBalance: 0,
        isPremium: false,
        identityVerified: false,
        accountStatus: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...data
    };

    await usersRef.doc(uid).set(userData);

    return {
        id: uid,
        ...userData
    };
};


/**
 * Update user fields (partial update)
 */
export const updateUser = async (uid, updates) => {
    await usersRef.doc(uid).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return await getUserById(uid);
};


/**
 * Adjust user balance (credit or debit)
 */
export const adjustUserBalance = async (uid, amount, isIncrement = true, reason = "") => {
    const user = await getUserById(uid);

    if (!user) {
        throw new Error("User not found");
    }

    const currentBalance = user.balance || 0;

    const newBalance = isIncrement
        ? currentBalance + amount
        : currentBalance - amount;

    if (newBalance < 0) {
        throw new Error("Insufficient balance");
    }

    await usersRef.doc(uid).update({
        balance: newBalance,
        lastBalanceAdjustment: {
            amount,
            isIncrement,
            reason,
            date: admin.firestore.FieldValue.serverTimestamp()
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return newBalance;
};


/**
 * Toggle premium status
 */
export const togglePremiumStatus = async (uid, isPremium) => {
    await usersRef.doc(uid).update({
        isPremium,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return await getUserById(uid);
};


/**
 * Toggle account status (active / disabled)
 */
export const toggleAccountStatus = async (uid, status) => {
    await usersRef.doc(uid).update({
        accountStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return await getUserById(uid);
};


/**
 * Get all users (admin use)
 */
export const getAllUsers = async () => {
    const snapshot = await usersRef.orderBy("createdAt", "desc").get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};