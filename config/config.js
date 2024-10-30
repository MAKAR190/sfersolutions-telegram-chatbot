require("dotenv").config();


module.exports = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  GOOGLE_CREDENTIALS: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
};
