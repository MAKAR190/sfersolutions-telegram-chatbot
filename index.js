const { Telegraf } = require("telegraf");
const startCommand = require("./commands/start");
const { handleLanguageSelection } = require("./handlers/languageHandler");
const sessionMiddleware = require("./middlewares/session");
const { TELEGRAM_TOKEN } = require("./config/config");

const bot = new Telegraf(TELEGRAM_TOKEN);

// Apply middleware (session, logging, etc.)
bot.use(sessionMiddleware);

// Command handlers
bot.start(startCommand);

// Language selection handler
bot.hears(["English", "Русский", "Українська"], handleLanguageSelection);

// Launch bot
bot
  .launch()
  .then(() => console.log("Bot is running..."))
  .catch((err) => console.error("Error launching the bot:", err));
