const Flutterwave = require(
  'flutterwave-node-v3'
);

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY,
  process.env.FLW_SECRET_KEY
);

const FLW_SECRET_KEY =
  process.env.FLW_SECRET_KEY;

const FLW_API_URL =
  'https://api.flutterwave.com/v3';

module.exports = {
  flw,
  FLW_SECRET_KEY,
  FLW_API_URL
};