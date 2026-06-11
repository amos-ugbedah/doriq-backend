const { admin, db } = require("../config/firebase");
const axios = require("axios");

exports.getBanks = async (req, res) => {
    try {
        const { country } = req.params;
        const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
        
        const response = await axios.get(
            `https://api.flutterwave.com/v3/banks/${country}`,
            {
                headers: {
                    'Authorization': `Bearer ${FLW_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error("Get banks error:", error);
        res.status(500).json({ 
            status: "error", 
            message: error.response?.data?.message || "Failed to fetch banks" 
        });
    }
};