const { Scenes, Markup } = require("telegraf");
const { GOOGLE_SHEET_ID } = require("../config/config");
const { appendToSubscribersSheet } = require("../services/googleSheets");

const subscribeScene = new Scenes.WizardScene(
    "subscribe_scene",
    async (ctx) => {
      await ctx.reply(ctx.i18n.t("subscribe.enter_age"));
      return ctx.wizard.next();
    },
    async (ctx) => {
      const age = parseInt(ctx.message.text, 10);

      if (isNaN(age) || age < 17) {
        await ctx.reply(ctx.i18n.t("job_selection.invalid_age"));
        return;
      }

      ctx.scene.state.age = age;
      await ctx.reply(
          ctx.i18n.t("subscribe.select_gender"),
          Markup.inlineKeyboard([
            Markup.button.callback(
                ctx.i18n.t("subscribe.male"),
                `gender_${
                    ctx.session.language === "ua"
                        ? "ч"
                        : ctx.session.language === "ru"
                            ? "м"
                            : "m"
                }`
            ),
            Markup.button.callback(
                ctx.i18n.t("subscribe.female"),
                `gender_${
                    ctx.session.language === "ua"
                        ? "ж"
                        : ctx.session.language === "ru"
                            ? "ж"
                            : "f"
                }`
            ),
            Markup.button.callback(
                ctx.i18n.t("subscribe.other"),
                `gender_${
                    ctx.session.language === "ua"
                        ? "пари"
                        : ctx.session.language === "ru"
                            ? "пары"
                            : "couples"
                }`
            ),
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
      const rate = parseFloat(ctx.message.text);

      if (isNaN(rate) || rate <= 0) {
        await ctx.reply(ctx.i18n.t("subscribe.enter_rate_invalid")); // Add this translation
        return; // Stay on the current step until a valid rate is entered
      }

      ctx.scene.state.rate = rate;
      await ctx.reply(ctx.i18n.t("subscribe.enter_city"));
      return ctx.wizard.next();
    },
    async (ctx) => {
      ctx.scene.state.city = ctx.message.text;

      await appendToSubscribersSheet(
          GOOGLE_SHEET_ID,
          ctx.from.id.toString(),
          ctx.scene.state,
          ctx.from.username || "No Username",
          ctx.session.language,
      );

      await ctx.reply(ctx.i18n.t("subscribe.confirmation"));
      return ctx.scene.leave();
    }
);

module.exports = subscribeScene;
