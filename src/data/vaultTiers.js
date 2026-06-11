const VAULT_TIERS = {
  STARTER: {
    days: 30,
    rate: 0.02,
    ratePercent: 2,
    name: 'Starter Vault'
  },
  GROWTH: {
    days: 90,
    rate: 0.075,
    ratePercent: 7.5,
    name: 'Growth Vault'
  },
  WEALTH: {
    days: 365,
    rate: 0.12,
    ratePercent: 12,
    name: 'Wealth Vault'
  }
};

module.exports = {
  VAULT_TIERS
};