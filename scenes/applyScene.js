const { Markup, Scenes } = require("telegraf");
const { updateStartDateById, appendToSheet } = require("../services/googleSheets"); // Assuming functions to update Google Sheets are imported
const handleCommand = require("../handlers/handleCommand");
const { GOOGLE_SHEET_ID } = require("../config/config");

const recruiterUsername = -1002380136376;

const applyScene = new Scenes.WizardScene(
    "applyScene",
    // Step 1: Ask for full name
    async (ctx) => {
      ctx.session.applying = true;
      await ctx.reply(ctx.i18n.t("application.ask_full_name"), {
        parse_mode: "HTML",
      });
      return ctx.wizard.next();
    },

    // Step 2: Capture full name
    async (ctx) => {
      if (await handleCommand(ctx)) return;
      if (ctx.message && ctx.message.text) {
        ctx.session.fullName = ctx.message.text;
        await ctx.reply(ctx.i18n.t("application.ask_phone"), {
          parse_mode: "HTML",
          reply_markup: Markup.keyboard([
            [Markup.button.contactRequest(ctx.i18n.t("questionnaire.share_contact"))],
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

    // Step 3: Capture phone number
    async (ctx) => {
      if (await handleCommand(ctx)) return;
      const phoneNumberRegex =
          /^\+?\d{1,3}[\s-]?(\(?\d{1,4}\)?[\s-]?)*\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}$/;

      if (ctx.message && ctx.message.contact && ctx.message.contact.phone_number) {
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

    // Step 4: Capture relocation readiness
    async (ctx) => {
      if (await handleCommand(ctx)) return;
      if (ctx.message && ctx.message.text) {
        ctx.session.relocationReadiness = ctx.message.text;
        ctx.session.selectTime = false;

        // Ask the user for their preferred date
        await ctx.reply(ctx.i18n.t("questionnaire.ask_preferred_date"), {
          parse_mode: "HTML",
        });
      }
      return ctx.wizard.next();
    },

    // Step 5: Capture preferred date
    async (ctx) => {
      if (await handleCommand(ctx)) return;

      if (ctx.message && ctx.message.text) {
        // Validate and store the preferred date
        const preferredDate = ctx.message.text;
        const isValidDate = Date.parse(preferredDate);

        if (!isValidDate) {
          await ctx.reply(ctx.i18n.t("invalid_date"), {
            parse_mode: "HTML",
          });
          return;
        }

        // Store the preferred date in session
        ctx.session.preferredDate = preferredDate;

        // Now ask for time (if needed)
        await ctx.reply(ctx.i18n.t("questionnaire.ask_preferred_time"), {
          parse_mode: "HTML",
        });

        return ctx.wizard.next();
      }
    },

    // Step 6: Finalize and send data to recruiter
    async (ctx) => {
      if (await handleCommand(ctx)) return;

      const preferredDateTime = ctx.session.preferredDate;

      // Prepare message to send to recruiter
      const messageToRecruiter = `📢 Новий кандидат подав заявку на вакансію:
📝 Назва вакансії: ${
          ctx.session.selectedVacancy.title || ctx.session.selectedVacancy[0] || ctx.session.selectedVacancy.vacancyTitle || ""
      }, ${ctx.session.selectedVacancy.location || ctx.session.selectedVacancy[4] || ctx.session.selectedVacancy.vacancyLocation}
👤 Ім'я: ${ctx.session.fullName}, @${ctx.from.username}
📞 Номер телефону: ${ctx.session.phoneNumber}
🚚 Готовність до переїзду: ${ctx.session.relocationReadiness}
📅 Дата та час для зв'язку: ${preferredDateTime}
`;

      // Send message to recruiter
      await ctx.telegram.sendMessage(recruiterUsername, messageToRecruiter);

      // Debugging message
      console.log("Message sent to recruiter:", messageToRecruiter);

      // Send acknowledgment to user
      await ctx.reply(ctx.i18n.t("application.application_received"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          [Markup.button.text(ctx.i18n.t("main_menu.select_job")), Markup.button.text(ctx.i18n.t("main_menu.view_all_jobs"))],
          [Markup.button.text(ctx.i18n.t("main_menu.contact_recruiter")), Markup.button.text(ctx.i18n.t("main_menu.submit_application"))],
          [Markup.button.text(ctx.i18n.t("main_menu.change_language"))],
        ])
            .oneTime()
            .reply_markup,
      });

      // Reset the session flags after the application is completed
      ctx.session.applying = false;
      ctx.session.skipped = false;
      delete ctx.session.selectedVacancy;
      delete ctx.session.fullName;
      delete ctx.session.phoneNumber;
      delete ctx.session.relocationReadiness;
      delete ctx.session.startTime;
      delete ctx.session.preferredDate; // Clean up the session date

      return;
    },

    // Step 7: Update Google Sheets with user application data
    async (ctx) => {
      const { fullName, phoneNumber, age, citizenship, document, city, relocate, numberOfPeople, notReadyAreas } = ctx.session;
      const preferredDateTime = ctx.session.preferredDate;

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
        `${ctx.session.startDate} ${preferredDateTime}`,
      ];

      if (ctx.session.skipped) {
        ctx.session.skipped = false;
        await updateStartDateById(GOOGLE_SHEET_ID, ctx.from.id, `${ctx.session.startDate} ${preferredDateTime}`);
        console.log("Updated start date in Google Sheets for user:", ctx.from.id);
      } else {
        await appendToSheet(GOOGLE_SHEET_ID, ctx.from.id, rowData);
        console.log("Data appended to Google Sheets for user:", ctx.from.id, rowData);
      }

      await ctx.reply(ctx.i18n.t("questionnaire.thank_you"), {
        parse_mode: "HTML",
      });

      if (ctx.session.selectTime) {
        ctx.session.selectTime = false;
      }

      if (!ctx.session.contactProcess) return;
      ctx.scene.enter("contactProcess");
      return;
    }
);

module.exports = applyScene;
