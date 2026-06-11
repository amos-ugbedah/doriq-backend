const { admin, db } = require("../config/firebase");

const logAdminAction = async (data) => {
    await db.collection("audit_logs").add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
};

module.exports = { logAdminAction };