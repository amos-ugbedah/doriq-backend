// src/config/brevo.js
const SibApiV3Sdk = require('sib-api-v3-sdk');

let brevoApi = null;

const SENDER_EMAIL = process.env.EMAIL_FROM || 'ugbedahamos@gmail.com';
const SENDER_NAME = process.env.EMAIL_FROM_NAME || 'Doriq';

try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    
    // Get API key from environment variable
    const brevoApiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;
    
    if (!brevoApiKey) {
        console.error('❌ BREVO_API_KEY not found in environment variables');
    } else {
        apiKey.apiKey = brevoApiKey;
        brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();
        console.log('✅ Brevo email client initialized');
    }
} catch (error) {
    console.error('❌ Brevo initialization error:', error.message);
}

module.exports = {
    brevoApi,
    SENDER_EMAIL,
    SENDER_NAME,
    SibApiV3Sdk
};