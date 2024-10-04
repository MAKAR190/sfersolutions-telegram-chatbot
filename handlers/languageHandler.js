const { appendToSheet } = require("../services/googleSheets");

const handleLanguageSelection = async (ctx) => {
  const language = ctx.message.text;
  await appendToSheet(
    process.env.GOOGLE_SHEET_ID,
    ctx.from.id,
  );

  ctx.reply(`Language set to ${language}.`);
};

module.exports = { handleLanguageSelection };
