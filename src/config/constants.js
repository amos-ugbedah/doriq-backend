const PLATFORM_FEE_PERCENTAGE = 15;

const WITHDRAWAL_FEES = {
  NGN: { flat: 100, percentage: 0.5 },
  USD: { flat: 2, percentage: 1 },
  EUR: { flat: 1.5, percentage: 1 },
  GBP: { flat: 1.5, percentage: 1 },
  CAD: { flat: 2, percentage: 1 }
};

const MIN_WITHDRAWAL = {
  NGN: 1000,
  USD: 10,
  EUR: 10,
  GBP: 10,
  CAD: 15
};

module.exports = {
  PLATFORM_FEE_PERCENTAGE,
  WITHDRAWAL_FEES,
  MIN_WITHDRAWAL
};