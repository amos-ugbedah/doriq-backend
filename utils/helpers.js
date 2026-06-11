const axios = require('axios');

const getUserCountryFromIP = async (ip) => {
    try {
        if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return 'US';
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
        if (response.data && response.data.status === 'success') return response.data.countryCode;
        const fallbackRes = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
        if (fallbackRes.data && fallbackRes.data.country_code) return fallbackRes.data.country_code;
        return 'US';
    } catch (error) {
        return 'US';
    }
};

const getCurrencyForCountry = (countryCode) => {
    const currencyMap = {
        'NG': 'NGN', 'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'GH': 'GHS', 'KE': 'KES',
        'ZA': 'ZAR', 'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
        'IN': 'INR', 'JP': 'JPY', 'AU': 'AUD', 'CN': 'CNY', 'CH': 'CHF', 'SE': 'SEK',
        'NO': 'NOK', 'DK': 'DKK'
    };
    return currencyMap[countryCode] || 'USD';
};

const calculatePlatformFee = (amount) => {
    const fee = amount * 0.15;
    return { fee, userReceives: amount - fee, feePercentage: 15 };
};

const calculateWithdrawalFee = (amount, currency) => {
    const config = { 'NGN': { flat: 100, percentage: 0.5 }, 'USD': { flat: 2, percentage: 1 },
        'EUR': { flat: 1.5, percentage: 1 }, 'GBP': { flat: 1.5, percentage: 1 }, 'CAD': { flat: 2, percentage: 1 } };
    const feeConfig = config[currency] || config['USD'];
    const fee = feeConfig.flat + (amount * feeConfig.percentage / 100);
    return { fee, userReceives: amount - fee, flatFee: feeConfig.flat, percentageFee: feeConfig.percentage };
};

module.exports = { getUserCountryFromIP, getCurrencyForCountry, calculatePlatformFee, calculateWithdrawalFee };