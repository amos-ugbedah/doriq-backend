const { admin, db } = require("../config/firebase");

/* =========================
   GET ALL TICKETS
========================= */
exports.getTickets = async (req, res) => {
    try {
        const snapshot = await db.collection("tickets").get();

        const tickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.json({ success: true, tickets });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

/* =========================
   UPDATE TICKET
========================= */
exports.updateTicket = async (req, res) => {
    const { ticketId, status, response } = req.body;

    try {
        const ticketRef = db.collection("tickets").doc(ticketId);

        await ticketRef.update({
            status,
            adminResponse: response || "",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: req.user.uid
        });

        return res.json({
            success: true,
            message: "Ticket updated"
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};