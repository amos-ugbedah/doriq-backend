const axios = require('axios');

let cachedExchangeRates = null;
let lastRateFetch = null;
const CACHE_DURATION = 5 * 60 * 1000;

const fetchLiveExchangeRates = async () => {
    const now = Date.now();
    if (cachedExchangeRates && lastRateFetch && (now - lastRateFetch) < CACHE_DURATION) {
        return cachedExchangeRates;
    }
    
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
        if (response.data && response.data.rates) {
            cachedExchangeRates = response.data.rates;
            lastRateFetch = now;
            console.log('✅ Live exchange rates fetched successfully');
            return cachedExchangeRates;
        }
        throw new Error('Invalid response from exchange API');
    } catch (error) {
        console.log('⚠️ Primary exchange API failed, trying fallback...');
        
        try {
            const fallbackRes = await axios.get('https://api.frankfurter.app/latest?from=USD', { timeout: 5000 });
            if (fallbackRes.data && fallbackRes.data.rates) {
                cachedExchangeRates = fallbackRes.data.rates;
                lastRateFetch = now;
                console.log('✅ Fallback exchange rates fetched successfully');
                return cachedExchangeRates;
            }
            throw new Error('Fallback API also failed');
        } catch (fallbackError) {
            console.log('⚠️ Using cached/fallback rates');
            if (cachedExchangeRates) return cachedExchangeRates;
            
            return {
                USD: 1, NGN: 1500, GBP: 0.78, EUR: 0.92, CAD: 1.35,
                GHS: 15, KES: 130, ZAR: 18.5, INR: 83, JPY: 150,
                CNY: 7.2, AUD: 1.5, CHF: 0.85, SEK: 10.5, NOK: 10.2
            };
        }
    }
};

const convertCurrencyLive = async (amount, fromCurrency, toCurrency) => {
    const rates = await fetchLiveExchangeRates();
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    const inUSD = amount / fromRate;
    const converted = inUSD * toRate;
    
    return {
        original: amount,
        originalCurrency: fromCurrency,
        converted: converted,
        convertedCurrency: toCurrency,
        rate: toRate / fromRate,
        usdValue: inUSD,
        rates: rates
    };
};

module.exports = { fetchLiveExchangeRates, convertCurrencyLive };