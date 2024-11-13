const { Scenes, Markup } = require("telegraf");

const subscribeScene = new Scenes.WizardScene(
  "subscribe_scene",
  async (ctx) => {
    await ctx.reply(ctx.i18n.t("subscribe.enter_age"));
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.scene.state.age = ctx.message.text;
    await ctx.reply(
      ctx.i18n.t("subscribe.select_gender"),
      Markup.inlineKeyboard([
        Markup.button.callback(ctx.i18n.t("subscribe.male"), "gender_male"),
        Markup.button.callback(ctx.i18n.t("subscribe.female"), "gender_female"),
        Markup.button.callback(ctx.i18n.t("subscribe.other"), "gender_other"),
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.callbackQuery) {
      ctx.scene.state.gender = ctx.callbackQuery.data.split("_")[1];
      await ctx.answerCbQuery();
    } else {
      return ctx.reply(ctx.i18n.t("subscribe.select_gender_error"));
    }

    await ctx.reply(ctx.i18n.t("subscribe.enter_rate"));
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.scene.state.rate = ctx.message.text;
    await ctx.reply(ctx.i18n.t("subscribe.enter_city"));
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.scene.state.city = ctx.message.text;

    await ctx.reply(
      ctx.i18n.t("subscribe.confirmation", {
        age: ctx.scene.state.age,
        gender: ctx.scene.state.gender,
        rate: ctx.scene.state.rate,
        city: ctx.scene.state.city,
      })
    );

    // Save user's preferences in the database if needed

    return ctx.scene.leave();
  }
);

module.exports = subscribeScene;
