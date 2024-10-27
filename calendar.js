const Calendar = require("telegraf-calendar-telegram");
const { GOOGLE_SHEET_ID } = require("./config/config");
const { Markup } = require("telegraf");
const {
  appendToSheet,
  updateStartDateById,
} = require("./services/googleSheets");
let calendar;

const initializeCalendar = (bot) => {
  calendar = new Calendar(bot);
  calendar.setDateListener(async (context, date) => {
    context.session.startDate = date;
    const hours = Array.from(
      { length: 9 },
      (_, i) => (i + 9).toString().padStart(2, "0") + ":00"
    );
    const keyboard = hours.map((hour) =>
      Markup.button.callback(hour, `time_${hour}`)
    );

    const inlineKeyboard = [];
    for (let i = 0; i < keyboard.length; i += 3) {
      inlineKeyboard.push(keyboard.slice(i, i + 3));
    }

    await context.reply(context.i18n.t("questionnaire.select_time"), {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard(inlineKeyboard).reply_markup,
    });

    const recruiterUsername = 856647351;
    bot.action(/^time_(\d{2}:\d{2})$/, async (ctx) => {
      context.session.startTime = ctx.match[1];
      await ctx.answerCbQuery();

      await ctx.reply(context.i18n.t("questionnaire.selected_date"), {
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
          [Markup.button.text(ctx.i18n.t("main_menu.change_language"))],
        ]).oneTime().reply_markup,
      });

      if (ctx.session.applying) {
        const messageToRecruiter = `
    📢 Новий кандидат подав заявку на вакансію:
    📝 Назва вакансії: ${
      ctx.session.selectedVacancy.title || ctx.session.selectedVacancy[0] || ""
    }, ${ctx.session.selectedVacancy.location || ctx.session.selectedVacancy[4]}
    👤 Ім'я: ${ctx.session.fullName}, @${ctx.from.username}
    📞 Номер телефону: ${ctx.session.phoneNumber}
    🚚 Готовність до переїзду: ${ctx.session.relocationReadiness}
    📅 Дата та час зустрічі: ${ctx.session.startDate}, ${ctx.session.startTime}
`;
        await ctx.telegram.sendMessage(recruiterUsername, messageToRecruiter);

        await ctx.reply(ctx.i18n.t("application.application_received"), {
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
            [Markup.button.text(ctx.i18n.t("main_menu.change_language"))],
          ]).oneTime().reply_markup,
        });

        ctx.session.applying = false;
        delete ctx.session.selectedVacancy;
        delete ctx.session.fullName;
        delete ctx.session.phoneNumber;
        delete ctx.session.relocationReadiness;
        delete ctx.session.startDate;
        delete ctx.session.startTime;
        return;
      }

      const {
        fullName,
        phoneNumber,
        age,
        citizenship,
        document,
        city,
        numberOfPeople,
        notReadyAreas,
        relocate,
      } = context.session;

      const rowData = [
        context.from.id,
        "@" + context.from.username,
        phoneNumber,
        fullName,
        age,
        citizenship,
        document,
        city,
        relocate,
        numberOfPeople,
        notReadyAreas,
        `${context.session.startDate} ${context.session.startTime}`,
      ];

      const messageToRecruiter = !context.session.skipped
        ? `
📋 Нові дані про кандидата:\n
- 👤 Повне ім'я: ${fullName}, @${ctx.from.username}
- 📞 Номер телефону: ${phoneNumber}
- 🎂 Вік: ${age}
- 🏳️ Громадянство: ${citizenship}\n
- 📄 Документ в Польщі: ${document}
- 🌆 Місто пошуку роботи: ${city}, Готовий до переїзду: ${relocate}
- 👥 Кількість людей (якщо застосовується): ${numberOfPeople}
- 🚫 Не готовий працювати в: ${notReadyAreas}
- 📅 Готовий почати з: ${context.session.startDate}, ${context.session.startTime}
`
        : `
📋 Нова запланована зустрія з кандидатом, який вже був зареєстрований:\n
- Нік: @${ctx.from.username}
- 📅 Готовий почати з: ${context.session.startDate} ${context.session.startTime}
`;

      await ctx.telegram.sendMessage(recruiterUsername, messageToRecruiter);

      if (context.session.skipped) {
        context.session.skipped = false;
        await updateStartDateById(
          GOOGLE_SHEET_ID,
          ctx.from.id,
          `${context.session.startDate} ${context.session.startTime}`
        );
      } else {
        await appendToSheet(GOOGLE_SHEET_ID, ctx.from.id, rowData);
      }

      await ctx.reply(context.i18n.t("questionnaire.thank_you"), {
        parse_mode: "HTML",
      });

      if (!ctx.session.contactProcess) return;
      ctx.scene.enter("contact_recruiter_scene");
    });
  });
};

const getCalendar = () => {
  if (!calendar) {
    throw new Error(
      "Calendar is not initialized. Call initializeCalendar first."
    );
  }
  return calendar;
};

module.exports = { initializeCalendar, getCalendar };
