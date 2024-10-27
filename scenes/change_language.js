const { Scenes } = require("telegraf");
const { WizardScene } = Scenes;
const { languageKeyboard, mainKeyboard } = require("../utils/keyboards");
const handleCommand = require("../handlers/handleCommand");

const changeLanguageScene = new WizardScene(
  "changeLanguage",
  async (ctx) => {
    await ctx.reply(ctx.i18n.t("select_language"), {
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

    const confirmationMessage = ctx.i18n.t("success");
    await ctx.reply(confirmationMessage, {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(ctx).reply_markup,
    });

    return ctx.scene.leave();
  }
);

module.exports = changeLanguageScene;
