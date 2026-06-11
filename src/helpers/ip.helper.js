const axios = require('axios');

// ================= IP → COUNTRY LOOKUP =================
async function getUserCountryFromIP(ip) {
    try {
        // Local/dev environments
        if (
            ip === '::1' ||
            ip === '127.0.0.1' ||
            ip === 'localhost'
        ) {
            return 'US';
        }

        // Primary provider
        const response = await axios.get(
            `http://ip-api.com/json/${ip}`,
            { timeout: 3000 }
        );

        if (response.data && response.data.status === 'success') {
            return response.data.countryCode;
        }

        // Fallback provider
        const fallbackRes = await axios.get(
            `https://ipapi.co/${ip}/json/`,
            { timeout: 3000 }
        );

        if (fallbackRes.data && fallbackRes.data.country_code) {
            return fallbackRes.data.country_code;
        }

        return 'US';
    } catch (error) {
        // Hard fallback (never break auth flow)
        return 'US';
    }
}

module.exports = {
    getUserCountryFromIP
};