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

module.exports = {
  SUPPORTED_CURRENCIES
};