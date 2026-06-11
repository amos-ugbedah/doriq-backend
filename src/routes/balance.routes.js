const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

router.get("/convert-balance/:uid", async (req, res) => {
    try {
        const { uid } = req.params;

        const doc = await admin.firestore().collection("users").doc(uid).get();

        if (!doc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        const data = doc.data();

        return res.json({
            balance: data.balance || 0
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed" });
    }
});

module.exports = router;