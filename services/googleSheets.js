const { google } = require("googleapis");
const { GOOGLE_CREDENTIALS } = require("../config/config");

const auth = new google.auth.JWT(
  GOOGLE_CREDENTIALS.client_email,
  null,
  GOOGLE_CREDENTIALS.private_key.replace(/\\n/g, "\n"), // Ensure newlines are correctly formatted
  ["https://www.googleapis.com/auth/spreadsheets"] // Scope
);

const appendToSheet = async (spreadsheetId, userId) => {
  try {
    const authClient = await auth.authorize(); // Authorize the client
    const sheets = google.sheets({ version: "v4", auth: authClient }); // Correct way to initialize sheets

    const request = {
      spreadsheetId: spreadsheetId,
      range: "Sheet1!A:C", // Adjust according to your sheet structure
      valueInputOption: "RAW",
      resource: {
        values: [[userId]], // Adjusting data to just include user ID for now
      },
    };

    await sheets.spreadsheets.values.append(request); // Making the API call
    console.log(`Data saved to sheet ${spreadsheetId} for user ${userId}`);
  } catch (error) {
    console.error("Error appending to Google Sheets:", error);
  }
};

module.exports = { appendToSheet };
