const { Markup } = require("telegraf");

const languageKeyboard = Markup.keyboard([
  [Markup.button.text("🇬🇧 English")],
  [Markup.button.text("🇺🇦 Українська")],
  [Markup.button.text("Русский")],
])
  .resize()
  .oneTime();

const mainKeyboard = (ctx) =>
  Markup.keyboard([
    [
      Markup.button.text(ctx.i18n.t("main_menu.select_job")),
      Markup.button.text(ctx.i18n.t("main_menu.view_all_jobs")),
    ],
    [
      Markup.button.text(ctx.i18n.t("main_menu.contact_recruiter")),
      Markup.button.text(ctx.i18n.t("main_menu.submit_application")),
    ],
    [Markup.button.text(ctx.i18n.t("main_menu.change_language"))],
  ]).oneTime();

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
