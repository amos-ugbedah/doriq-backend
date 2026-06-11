const axios = require('axios');

// ================= CURRENCY CACHE =================
let cachedExchangeRates = null;
let lastRateFetch = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ================= SUPPORTED CURRENCY MAP =================
const SUPPORTED_CURRENCIES = {
    USD: { symbol: '$', name: 'US Dollar', rate: 1, isPrimary: true },
    NGN: { symbol: '₦', name: 'Nigerian Naira', rate: 1500, isPrimary: false },
    GBP: { symbol: '£', name: 'British Pound', rate: 0.78, isPrimary: false },
    EUR: { symbol: '€', name: 'Euro', rate: 0.92, isPrimary: false },
    CAD: { symbol: 'C$', name: 'Canadian Dollar', rate: 1.35, isPrimary: false },
    GHS: { symbol: '₵', name: 'Ghanaian Cedi', rate: 15, isPrimary: false },
    KES: { symbol: 'KSh', name: 'Kenyan Shilling', rate: 130, isPrimary: false },
    ZAR: { symbol: 'R', name: 'South African Rand', rate: 18.5, isPrimary: false },
    INR: { symbol: '₹', name: 'Indian Rupee', rate: 83, isPrimary: false },
    JPY: { symbol: '¥', name: 'Japanese Yen', rate: 150, isPrimary: false },
    AUD: { symbol: 'A$', name: 'Australian Dollar', rate: 1.5, isPrimary: false },
    CNY: { symbol: '¥', name: 'Chinese Yuan', rate: 7.2, isPrimary: false }
};

// ================= FETCH LIVE RATES =================
async function fetchLiveExchangeRates() {
    const now = Date.now();

    if (
        cachedExchangeRates &&
        lastRateFetch &&
        (now - lastRateFetch) < CACHE_DURATION
    ) {
        return cachedExchangeRates;
    }

    try {
        const response = await axios.get(
            'https://api.exchangerate-api.com/v4/latest/USD',
            { timeout: 5000 }
        );

        if (response.data && response.data.rates) {
            cachedExchangeRates = response.data.rates;
            lastRateFetch = now;
            return cachedExchangeRates;
        }

        throw new Error('Invalid exchange rate response');
    } catch (error) {
        // fallback (important for resilience)
        if (cachedExchangeRates) return cachedExchangeRates;

        return {
            USD: 1,
            NGN: 1500,
            GBP: 0.78,
            EUR: 0.92,
            CAD: 1.35,
            GHS: 15,
            KES: 130,
            ZAR: 18.5,
            INR: 83,
            JPY: 150,
            AUD: 1.5,
            CNY: 7.2
        };
    }
}

// ================= CONVERT CURRENCY =================
async function convertCurrencyLive(amount, fromCurrency, toCurrency) {
    const rates = await fetchLiveExchangeRates();

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    const amountInUSD = amount / fromRate;
    const converted = amountInUSD * toRate;

    return {
        original: amount,
        converted,
        rate: toRate / fromRate,
        usdValue: amountInUSD,
        rates
    };
}

// ================= COUNTRY → CURRENCY =================
function getCurrencyForCountry(countryCode) {
    const map = {
        NG: 'NGN',
        US: 'USD',
        GB: 'GBP',
        CA: 'CAD',
        GH: 'GHS',
        KE: 'KES',
        ZA: 'ZAR',
        FR: 'EUR',
        DE: 'EUR',
        IT: 'EUR',
        ES: 'EUR',
        NL: 'EUR',
        IN: 'INR',
        JP: 'JPY',
        AU: 'AUD',
        CN: 'CNY'
    };

    return map[countryCode] || 'USD';
}

// ================= EXPORTS =================
module.exports = {
    SUPPORTED_CURRENCIES,
    fetchLiveExchangeRates,
    convertCurrencyLive,
    getCurrencyForCountry
};