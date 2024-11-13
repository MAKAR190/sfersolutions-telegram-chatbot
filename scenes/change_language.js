const { Scenes } = require("telegraf");
const { WizardScene } = Scenes;
const { languageKeyboard, mainKeyboard } = require("../utils/keyboards");
const handleCommand = require("../handlers/handleCommand");

const changeLanguageScene = new WizardScene(
  "changeLanguage",
  async (ctx) => {
    const userId = ctx.from.id;

    await ctx.telegram.sendMessage(userId, ctx.i18n.t("select_language"), {
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
    const confirmationMessage = ctx.i18n.t("success");

    await ctx.telegram.sendMessage(userId, confirmationMessage, {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(ctx).reply_markup,
    });

    return ctx.scene.leave();
  }
);

module.exports = changeLanguageScene;
