const { Scenes } = require("telegraf");
const { languageKeyboard, mainKeyboard } = require("../utils/keyboards");
const handleCommand = require("../handlers/handleCommand");

const startScene = new Scenes.WizardScene(
  "startScene",
  async (ctx) => {
    const userId = ctx.from.id;

    const welcomeMessage = ctx.i18n.t("start");
    await ctx.telegram.sendMessage(userId, welcomeMessage, {
      parse_mode: "HTML",
      reply_markup: languageKeyboard.reply_markup,
    });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;

    const selectedLanguage = ctx.message.text;

    ctx.session.language =
      selectedLanguage === "🇬🇧 English"
        ? "en"
        : selectedLanguage === "Русский"
        ? "ru"
        : selectedLanguage === "🇺🇦 Українська"
        ? "ua"
        : "en";

    ctx.i18n.locale(ctx.session.language);

    const userId = ctx.from.id;
    const confirmationMessage = ctx.i18n.t("welcome");
    await ctx.telegram.sendMessage(userId, confirmationMessage, {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(ctx).reply_markup,
    });

    return ctx.scene.leave();
  }
);

module.exports = startScene;
