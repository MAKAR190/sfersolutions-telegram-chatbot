const { Markup } = require("telegraf");

const languageKeyboard = Markup.keyboard([
  [Markup.button.text("🇬🇧 English")],
  [Markup.button.text("🇺🇦 Українська")],
  [Markup.button.text("Русский")],
])
  .resize()
  .oneTime();


const backKeyboard = (ctx) =>
  Markup.keyboard([
    Markup.button.text(ctx.i18n.t("go_back")),
    Markup.button.text(ctx.i18n.t("cancel")),
  ])
    .oneTime()
    .resize();
module.exports = {
  languageKeyboard,
  mainKeyboard,
  backKeyboard,
};
