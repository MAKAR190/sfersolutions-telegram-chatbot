const { Scenes, Markup } = require("telegraf");
const { match } = require("telegraf-i18n");
const { mainKeyboard } = require("../utils/keyboards");

const questionnaireScene = new Scenes.WizardScene(
  "contact_recruiter_scene",
  async (ctx) => {
    if (!ctx.session.contactProcess) {
      ctx.session.contactProcess = true;
      await ctx.scene.enter("submit_application_scene");
    } else {
      ctx.wizard.next();
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    }
  },

  async (ctx) => {
    ctx.session.contactProcess = false;

    const userId = ctx.from.id;

    await ctx.telegram.sendMessage(userId, "+48789753753", {
      parse_mode: "HTML",
    });

    await ctx.telegram.sendMessage(userId, "Anna", {
      parse_mode: "HTML",
    });

    await ctx.telegram.sendMessage(userId, ctx.i18n.t("main_menu.select_job"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([
        [
          Markup.button.text(ctx.i18n.t("main_menu.select_job")),
          Markup.button.text(ctx.i18n.t("main_menu.view_all_jobs")),
        ],
        [
          Markup.button.text(ctx.i18n.t("main_menu.contact_recruiter")),
          Markup.button.text(ctx.i18n.t("main_menu.submit_application")),
        ],
        [
          Markup.button.text(ctx.i18n.t("main_menu.subscribe")),
          Markup.button.text(ctx.i18n.t("main_menu.change_language")),
        ],
      ]).oneTime().reply_markup,
    });

    delete ctx.session.fullName;
    delete ctx.session.phoneNumber;
    delete ctx.session.age;
    delete ctx.session.citizenship;
    delete ctx.session.document;
    delete ctx.session.city;
    delete ctx.session.numberOfPeople;
    delete ctx.session.notReadyAreas;
    delete ctx.session.startDate;
    delete ctx.session.contactProcess;
    delete ctx.session.dateToMeet;
    delete ctx.session.skipped;

    return ctx.scene.leave();
  }
);

questionnaireScene.hears(match("cancel"), async (ctx) => {
  const userId = ctx.from.id;
  await ctx.telegram.sendMessage(userId, ctx.i18n.t("cancel"), {
    parse_mode: "HTML",
    reply_markup: mainKeyboard(ctx).reply_markup,
  });
  ctx.session.contactProcess = false;
  return ctx.scene.leave();
});

questionnaireScene.command("help", (ctx) => {
  const userId = ctx.from.id;
  ctx.telegram.sendMessage(userId, ctx.i18n.t("available_commands"), {
    parse_mode: "HTML",
    reply_markup: mainKeyboard(ctx).reply_markup,
  });
});

questionnaireScene.command("cancel", (ctx) => {
  const userId = ctx.from.id;
  ctx.telegram.sendMessage(userId, ctx.i18n.t("cancel"), {
    parse_mode: "HTML",
    reply_markup: mainKeyboard(ctx).reply_markup,
  });
  ctx.session.contactProcess = false;
  return ctx.scene.leave();
});

module.exports = questionnaireScene;
