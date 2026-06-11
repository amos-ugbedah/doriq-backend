import admin from "firebase-admin";

const db = admin.firestore();

const transactionsRef = db.collection("transactions");
const depositsRef = db.collection("deposits");
const withdrawalsRef = db.collection("withdrawals");


/**
 * =========================
 * CREATE TRANSACTION RECORD
 * =========================
 */
export const createTransaction = async (data) => {
    const transaction = {
        userId: data.userId,
        type: data.type, // deposit | withdrawal | transfer | adjustment
        amount: data.amount,
        currency: data.currency || "USD",
        status: data.status || "pending",
        reference: data.reference || `TX-${Date.now()}`,
        metadata: data.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await transactionsRef.add(transaction);

    return {
        id: docRef.id,
        ...transaction
    };
};


/**
 * =========================
 * DEPOSITS
 * =========================
 */
export const createDeposit = async (data) => {
    const deposit = {
        userId: data.userId,
        userName: data.userName || "",
        userEmail: data.userEmail || "",
        amount: data.amount,
        currency: data.currency || "USD",
        fee: data.fee || 0,
        feePercentage: data.feePercentage || 0,
        netAmount: data.netAmount || data.amount,
        status: "pending",
        reference: data.reference || `DEP-${Date.now()}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const doc = await depositsRef.add(deposit);

    return {
        id: doc.id,
        ...deposit
    };
};


/**
 * Approve deposit
 */
export const approveDeposit = async (depositId) => {
    const docRef = depositsRef.doc(depositId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("Deposit not found");
    }

    const deposit = doc.data();

    await docRef.update({
        status: "approved",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // credit user balance
    const userRef = db.collection("users").doc(deposit.userId);

    await userRef.update({
        balance: admin.firestore.FieldValue.increment(deposit.netAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return true;
};


/**
 * Reject deposit
 */
export const rejectDeposit = async (depositId, reason = "") => {
    await depositsRef.doc(depositId).update({
        status: "rejected",
        rejectionReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return true;
};


/**
 * =========================
 * WITHDRAWALS
 * =========================
 */
export const createWithdrawal = async (data) => {
    const withdrawal = {
        userId: data.userId,
        userName: data.userName || "",
        userEmail: data.userEmail || "",
        amount: data.amount,
        currency: data.currency || "USD",
        status: "processing",
        method: data.method || "bank",
        destination: data.destination || {},
        reference: data.reference || `WDR-${Date.now()}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const doc = await withdrawalsRef.add(withdrawal);

    return {
        id: doc.id,
        ...withdrawal
    };
};


/**
 * Update withdrawal status
 */
export const updateWithdrawalStatus = async (withdrawalId, status) => {
    const docRef = withdrawalsRef.doc(withdrawalId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("Withdrawal not found");
    }

    await docRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return true;
};


/**
 * Reject withdrawal (refund user)
 */
export const rejectWithdrawal = async (withdrawalId, reason = "") => {
    const docRef = withdrawalsRef.doc(withdrawalId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("Withdrawal not found");
    }

    const withdrawal = doc.data();

    // refund user balance
    const userRef = db.collection("users").doc(withdrawal.userId);

    await userRef.update({
        balance: admin.firestore.FieldValue.increment(withdrawal.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await docRef.update({
        status: "rejected",
        rejectionReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return true;
};


/**
 * =========================
 * FETCH FUNCTIONS (ADMIN)
 * =========================
 */
export const getAllDeposits = async (status = null) => {
    let query = depositsRef.orderBy("createdAt", "desc");

    if (status) {
        query = query.where("status", "==", status);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};


export const getAllWithdrawals = async (status = null) => {
    let query = withdrawalsRef.orderBy("createdAt", "desc");

    if (status) {
        query = query.where("status", "==", status);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};


/**
 * Get all transactions (admin audit view)
 */
export const getAllTransactions = async () => {
    const snapshot = await transactionsRef.orderBy("createdAt", "desc").get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};