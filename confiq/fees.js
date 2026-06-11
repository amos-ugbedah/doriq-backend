// backend/config/fees.js
module.exports = {
  // Platform fee on incoming funds (deposits/payments received)
  INCOMING_FEE_PERCENTAGE: 15, // 15% cut for you
  
  // Withdrawal fees to bank
  WITHDRAWAL_FEES: {
    'NGN': { flat: 100, percentage: 0.5 }, // ₦100 + 0.5%
    'USD': { flat: 2, percentage: 1 },     // $2 + 1%
    'EUR': { flat: 1.5, percentage: 1 },   // €1.50 + 1%
    'GBP': { flat: 1.5, percentage: 1 }    // £1.50 + 1%
  },
  
  // Crypto withdrawal fees (if you allow crypto payouts)
  CRYPTO_WITHDRAWAL_FEE: {
    'ARBITRUM_USDT': 1.5, // $1.50 flat fee
    'TRC20_USDT': 2.0     // $2.00 flat fee
  },
  
  // Minimum withdrawal amounts
  MIN_WITHDRAWAL: {
    'NGN': 1000,
    'USD': 10,
    'EUR': 10,
    'GBP': 10
  }
};