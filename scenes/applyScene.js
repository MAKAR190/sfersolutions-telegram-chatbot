const { Scenes, Markup } = require("telegraf");
const { getCalendar } = require("../calendar");
const { mainKeyboard } = require("../utils/keyboards");
const handleCommand = require("../handlers/handleCommand");

const applyScene = new Scenes.WizardScene(
  "applyScene",
  async (ctx) => {
    await ctx.reply(ctx.i18n.t("application.ask_full_name"), {
      parse_mode: "HTML",
    });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message && ctx.message.text) {
      ctx.session.fullName = ctx.message.text;
      await ctx.reply(ctx.i18n.t("application.ask_phone"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          [
            Markup.button.contactRequest(
              ctx.i18n.t("questionnaire.share_contact")
            ),
          ],
        ])
          .resize()
          .oneTime().reply_markup,
      });
    } else {
      await ctx.reply(ctx.i18n.t("invalid response"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
    }

    return ctx.wizard.next();
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const phoneNumberRegex =
      /^\+?\d{1,3}[\s-]?(\(?\d{1,4}\)?[\s-]?)*\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}$/;

    if (
      ctx.message &&
      ctx.message.contact &&
      ctx.message.contact.phone_number
    ) {
      ctx.session.phoneNumber = ctx.message.contact.phone_number;
    } else if (ctx.message && ctx.message.text) {
      const enteredPhoneNumber = ctx.message.text;

      if (!phoneNumberRegex.test(enteredPhoneNumber)) {
        await ctx.reply(ctx.i18n.t("invalid_phone_number"), {
          parse_mode: "HTML",
        });

        ctx.wizard.back();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      }

      ctx.session.phoneNumber = enteredPhoneNumber;
    } else {
      await ctx.reply(ctx.i18n.t("invalid response"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
      return ctx.scene.leave();
    }
    await ctx.reply(ctx.i18n.t("application.ask_relocation"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([[ctx.i18n.t("yes"), ctx.i18n.t("no")]])
        .resize()
        .oneTime().reply_markup,
    });

    return ctx.wizard.next();
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message && ctx.message.text) {
      ctx.session.relocationReadiness = ctx.message.text;
      ctx.session.selectTime = false;

      const calendar = getCalendar();
      await ctx.reply(ctx.i18n.t("questionnaire.start_date"), {
        parse_mode: "HTML",
        reply_markup: calendar.getCalendar().reply_markup,
      });
    }
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    ctx.session.selectTime = true;
    const calendar = getCalendar();
    await ctx.reply(ctx.i18n.t("contact_recruiter_message"), {
      parse_mode: "HTML",
      reply_markup: calendar.getCalendar().reply_markup,
    });

    return ctx.scene.leave();
  }
);

module.exports = applyScene;
