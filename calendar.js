// const Calendar = require("telegraf-calendar-telegram");
// const { GOOGLE_SHEET_ID } = require("./config/config");
// const { Markup } = require("telegraf");
// const {
//   appendToSheet,
//   updateStartDateById,
// } = require("./services/googleSheets");

// let calendars = {
//   startDateCalendar: null,
//   dateToMeetCalendar: null,
// };

// const initializeCalendars = (bot) => {
//   calendars.startDateCalendar = new Calendar(bot);
//   calendars.dateToMeetCalendar = new Calendar(bot);

//   // Calendar for setting startDate without time keyboard
//   calendars.startDateCalendar.setDateListener(async (ctx, date) => {
//     ctx.session.startDate = date;

//     updateStartDateById(GOOGLE_SHEET_ID, ctx.from.id, date);

//     await ctx.reply(ctx.i18n.t("date_selected_message"), {
//       parse_mode: "HTML",
//       reply_markup: Markup.keyboard([
//         [
//           Markup.button.text(ctx.i18n.t("main_menu.select_job")),
//           Markup.button.text(ctx.i18n.t("main_menu.view_all_jobs")),
//         ],
//         [
//           Markup.button.text(ctx.i18n.t("main_menu.contact_recruiter")),
//           Markup.button.text(ctx.i18n.t("main_menu.submit_application")),
//         ],
//         [Markup.button.text(ctx.i18n.t("main_menu.change_language"))],
//       ]).oneTime().reply_markup,
//     });
//   });

//   // Calendar for setting dateToMeet with time selection
//   calendars.dateToMeetCalendar.setDateListener(async (ctx, date) => {
//     ctx.session.dateToMeet = date;

//     // Prepare the time selection keyboard
//     const hours = Array.from(
//       { length: 9 },
//       (_, i) => (i + 9).toString().padStart(2, "0") + ":00"
//     );
//     const keyboard = hours.map((hour) =>
//       Markup.button.callback(hour, `time_${hour}`)
//     );

//     const inlineKeyboard = [];
//     for (let i = 0; i < keyboard.length; i += 3) {
//       inlineKeyboard.push(keyboard.slice(i, i + 3));
//     }

//     await ctx.reply(ctx.i18n.t("contact_recruiter_message"), {
//       parse_mode: "HTML",
//       reply_markup: Markup.inlineKeyboard(inlineKeyboard).reply_markup,
//     });

//     // Listen for time selection
//     bot.action(/^time_(\d{2}:\d{2})$/, async (ctx) => {
//       const selectedTime = ctx.match[1];
//       ctx.session.startTime = selectedTime;

//       await ctx.reply(ctx.i18n.t("questionnaire.selected_date"), {
//         parse_mode: "HTML",
//         reply_markup: Markup.keyboard([
//           [
//             Markup.button.text(ctx.i18n.t("main_menu.select_job")),
//             Markup.button.text(ctx.i18n.t("main_menu.view_all_jobs")),
//           ],
//           [
//             Markup.button.text(ctx.i18n.t("main_menu.contact_recruiter")),
//             Markup.button.text(ctx.i18n.t("main_menu.submit_application")),
//           ],
//           [Markup.button.text(ctx.i18n.t("main_menu.change_language"))],
//         ]).oneTime().reply_markup,
//       });
//       const recruiterUsername = 856647351;

//       if (ctx.session.applying && ctx.session.selectTime) {
//         const messageToRecruiter = `📢 Новий кандидат подав заявку на вакансію:
// - 📝 Назва вакансії: ${
//           ctx.session.selectedVacancy.title ||
//           ctx.session.selectedVacancy[0] ||
//           ""
//         }, ${
//           ctx.session.selectedVacancy.location || ctx.session.selectedVacancy[4]
//         }
// - 👤 Ім'я: ${ctx.session.fullName}, @${ctx.from.username}
// - 📞 Номер телефону: ${ctx.session.phoneNumber}
// - 🚚 Готовність до переїзду: ${ctx.session.relocationReadiness}
// - 📅 Готовий почати з: ${ctx.session.startDate}
// - 📅 Дата та час для зв'язку: ${ctx.session.dateToMeet}, ${selectedTime}
// `;
//         await ctx.telegram.sendMessage(recruiterUsername, messageToRecruiter);

//         // Debugging message
//         console.log("Message sent to recruiter:", messageToRecruiter);

//         await ctx.reply(ctx.i18n.t("application.application_received"), {
//           parse_mode: "HTML",
//           reply_markup: Markup.keyboard([
//             [
//               Markup.button.text(ctx.i18n.t("main_menu.select_job")),
//               Markup.button.text(ctx.i18n.t("main_menu.view_all_jobs")),
//             ],
//             [
//               Markup.button.text(ctx.i18n.t("main_menu.contact_recruiter")),
//               Markup.button.text(ctx.i18n.t("main_menu.submit_application")),
//             ],
//             [Markup.button.text(ctx.i18n.t("main_menu.change_language"))],
//           ]).oneTime().reply_markup,
//         });

//         // Clear session data after processing
//         ctx.session.applying = false;
//         delete ctx.session.selectedVacancy;
//         delete ctx.session.fullName;
//         delete ctx.session.phoneNumber;
//         delete ctx.session.relocationReadiness;
//         delete ctx.session.startTime;

//         return;
//       } else {
//         const {
//           fullName,
//           phoneNumber,
//           age,
//           citizenship,
//           document,
//           city,
//           numberOfPeople,
//           notReadyAreas,
//           relocate,
//         } = ctx.session;

//         const rowData = [
//           ctx.from.id,
//           "@" + ctx.from.username,
//           phoneNumber,
//           fullName,
//           age,
//           citizenship,
//           document,
//           city,
//           relocate,
//           numberOfPeople,
//           notReadyAreas,
//         ];

//         // Ensure this is a valid username
//         const messageToRecruiter = `📢 Новий кандидат подав заявку на вакансію:
// - 📝 Назва вакансії: ${
//           ctx.session.selectedVacancy.title ||
//           ctx.session.selectedVacancy[0] ||
//           ""
//         }, ${
//           ctx.session.selectedVacancy.location || ctx.session.selectedVacancy[4]
//         }
// - 👤 Ім'я: ${ctx.session.fullName}, @${ctx.from.username}
// - 📞 Номер телефону: ${ctx.session.phoneNumber}
// - 🚚 Готовність до переїзду: ${ctx.session.relocationReadiness}
// - 📅 Готовий почати з: ${ctx.session.startDate}
// - 📅 Дата та час для зв'язку: ${ctx.session.dateToMeet}, ${selectedTime}
// `;
//         if (ctx.session.skipped) {
//           ctx.session.skipped = false;

//           await updateStartDateById(
//             GOOGLE_SHEET_ID,
//             ctx.from.id,
//             `${ctx.session.startDate} ${selectedTime}`
//           );

//           console.log(
//             "Updated start date in Google Sheets for user:",
//             ctx.from.id
//           );
//         } else {
//           await appendToSheet(GOOGLE_SHEET_ID, ctx.from.id, rowData);

//           console.log(
//             "Data appended to Google Sheets for user:",
//             ctx.from.id,
//             rowData
//           );
//         }

//         await ctx.reply(ctx.i18n.t("questionnaire.thank_you"), {
//           parse_mode: "HTML",
//         });

//         await ctx.reply("@makkentoshh");

//         await ctx.telegram.sendMessage(recruiterUsername, messageToRecruiter);
//         console.log("Message sent to recruiter:", messageToRecruiter);

//         await ctx.reply(ctx.i18n.t("questionnaire.thank_you"), {
//           parse_mode: "HTML",
//         });

//         // Clear session data
//         delete ctx.session.dateToMeet;
//         delete ctx.session.startTime;

//         if (!ctx.session.contactProcess) return;
//         ctx.scene.enter("contact_recruiter_scene");
//       }
//     });
//   });
// };

// const getCalendar = (type) => {
//   if (type === "startDate") {
//     if (!calendars.startDateCalendar) {
//       throw new Error(
//         "StartDate calendar is not initialized. Call initializeCalendars first."
//       );
//     }
//     return calendars.startDateCalendar;
//   } else if (type === "dateToMeet") {
//     if (!calendars.dateToMeetCalendar) {
//       throw new Error(
//         "DateToMeet calendar is not initialized. Call initializeCalendars first."
//       );
//     }
//     return calendars.dateToMeetCalendar;
//   } else {
//     throw new Error(
//       "Invalid calendar type specified. Use 'startDate' or 'dateToMeet'."
//     );
//   }
// };

// module.exports = { initializeCalendars, getCalendar };

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

  calendar.setDateListener(async (ctx, date) => {
    // Check if startDate is already set, if not, assign the new date
    if (!ctx.session.startDate) {
      ctx.session.startDate = date; // Set startDate only once
      console.log("startDate set to:", ctx.session.startDate);
    } else {
      console.log("startDate already set:", ctx.session.startDate);
    }

    // Prepare the time selection keyboard
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

    // Send a reply if selectTime is set
    if (ctx.session.selectTime) {
      await ctx.reply(ctx.i18n.t("contact_recruiter_message"), {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard(inlineKeyboard).reply_markup,
      });
    }

    // Listen for time selection
    bot.action(/^time_(\d{2}:\d{2})$/, async (ctx) => {
      const selectedTime = ctx.match[1];

      // Assign selected time and date for the meeting
      ctx.session.startTime = selectedTime;
      ctx.session.dateToMeet = date; // Set dateToMeet separately

      await ctx.answerCbQuery();
      await ctx.reply(ctx.i18n.t("questionnaire.selected_date"), {
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

      const recruiterUsername = 7250308341; // Ensure this is a valid username
      if (ctx.session.applying && ctx.session.selectTime) {
        const messageToRecruiter = `📢 Новий кандидат подав заявку на вакансію:
    📝 Назва вакансії: ${
      ctx.session.selectedVacancy.title || ctx.session.selectedVacancy[0] ||   ctx.session.selectedVacancy.vacancyTitle  || ""
    }, ${ctx.session.selectedVacancy.location || ctx.session.selectedVacancy[4] ||  ctx.session.selectedVacancy.vacancyLocation }
    👤 Ім'я: ${ctx.session.fullName}, @${ctx.from.username}
    📞 Номер телефону: ${ctx.session.phoneNumber}
    🚚 Готовність до переїзду: ${ctx.session.relocationReadiness}
    📅 Готовий почати з: ${ctx.session.startDate}
    📅 Дата та час для зв'язку: ${ctx.session.dateToMeet}, ${selectedTime}
`;
        await ctx.telegram.sendMessage(recruiterUsername, messageToRecruiter);

        // Debugging message
        console.log("Message sent to recruiter:", messageToRecruiter);

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
        ctx.session.skipped = false;
        delete ctx.session.selectedVacancy;
        delete ctx.session.fullName;
        delete ctx.session.phoneNumber;
        delete ctx.session.relocationReadiness;
        delete ctx.session.startTime;
        // Optionally retain startDate if needed
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
      } = ctx.session;

      const rowData = [
        ctx.from.id,
        ctx.from.username ? "@" + ctx.from.username : "No Username",
        phoneNumber,
        fullName,
        age,
        citizenship,
        document,
        city,
        relocate,
        numberOfPeople,
        notReadyAreas,
        `${ctx.session.startDate} ${selectedTime}`,
      ];

      if (!ctx.session.applying && ctx.session.selectTime) {
        const messageToRecruiter = !ctx.session.skipped
          ? `📋 Нові дані про кандидата:\n
- 👤 Повне ім'я: ${fullName}, @${ctx.from.username}
- 📞 Номер телефону: ${phoneNumber}
- 🎂 Вік: ${age}
- 🏳️ Громадянство: ${citizenship}\n
- 📄 Документ в Польщі: ${document}
- 🌆 Місто пошуку роботи: ${city}, Готовий до переїзду: ${relocate}
- 👥 Кількість людей (якщо застосовується): ${numberOfPeople}
- 🚫 Не готовий працювати в: ${notReadyAreas}
- 📅 Готовий почати з: ${ctx.session.startDate},
- 📅 Дата та час для зв'язку: ${ctx.session.dateToMeet}, ${selectedTime}
`
          : `📋 Нова запланована зустріч з кандидатом, який вже був зареєстрований:\n
- Нік:${ctx.from.username ? "@" + ctx.from.username : "No Username"},
- ID в гугл таблиці: ${ctx.from.id}
📅 Дата та час для зв'язку: ${ctx.session.dateToMeet}, ${selectedTime}
`;
        await ctx.telegram.sendMessage(recruiterUsername, messageToRecruiter);

        // Debugging message
        console.log("Message sent to recruiter:", messageToRecruiter);
      }

      if (ctx.session.skipped) {
        ctx.session.skipped = false;
        await updateStartDateById(
          GOOGLE_SHEET_ID,
          ctx.from.id,
          `${ctx.session.startDate} ${selectedTime}`
        );
        console.log(
          "Updated start date in Google Sheets for user:",
          ctx.from.id
        );
      } else {
        await appendToSheet(GOOGLE_SHEET_ID, ctx.from.id, rowData);
        console.log(
          "Data appended to Google Sheets for user:",
          ctx.from.id,
          rowData
        );
      }

      await ctx.reply(ctx.i18n.t("questionnaire.thank_you"), {
        parse_mode: "HTML",
      });

      await ctx.reply("@sfersolution_work");

      if (ctx.session.selectTime) {
        ctx.session.selectTime = false;
      }

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
