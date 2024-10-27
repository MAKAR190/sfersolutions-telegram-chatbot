require("dotenv").config();

module.exports = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  GOOGLE_CREDENTIALS: require("../sfersolutions-021bdf2d161c.json"),
};
