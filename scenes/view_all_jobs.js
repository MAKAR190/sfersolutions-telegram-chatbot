const { Scenes, Markup } = require("telegraf");
const {
  getVacancies,
  getVacanciesAbroad,
  getVacanciesByCity,
} = require("../services/googleSheets");
const { GOOGLE_SHEET_ID } = require("../config/config");
const { mainKeyboard } = require("../utils/keyboards");
const { getCalendar } = require("../calendar");
const handleCommand = require("../handlers/handleCommand");
const VACANCIES_PER_PAGE = 4;
function areKeyboardsEqual(keyboard1, keyboard2) {
  return JSON.stringify(keyboard1) === JSON.stringify(keyboard2);
}
const viewVacanciesScene = new Scenes.WizardScene(
  "view_all_jobs_scene",

  async (ctx) => {
    await ctx.reply(ctx.i18n.t("vacancies.welcome"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([
        [
          ctx.i18n.t("vacancies.all_vacancies"),
          ctx.i18n.t("vacancies.vacancies_abroad"),
        ],
        [
          ctx.i18n.t("vacancies.vacancies_by_city"),
          ctx.i18n.t("vacancies.return_main_menu"),
        ],
      ]).oneTime().reply_markup,
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const choice = ctx.message?.text;
    ctx.session.currentPage = 0;

    if (choice === ctx.i18n.t("vacancies.all_vacancies")) {
      ctx.session.searching = false;
      await fetchAndDisplayVacancies(ctx, "all");
    } else if (choice === ctx.i18n.t("vacancies.vacancies_abroad")) {
      ctx.session.searching = false;
      await fetchAndDisplayVacancies(ctx, "abroad");
    } else if (choice === ctx.i18n.t("vacancies.vacancies_by_city")) {
      ctx.session.cities = [];
      await ctx.reply(ctx.i18n.t("vacancies.search_city"), {
        parse_mode: "HTML",
      });
      ctx.session.searching = true;
      return ctx.wizard.next();
    } else if (choice === ctx.i18n.t("vacancies.return_main_menu")) {
      ctx.session.searching = false;
      await ctx.reply(ctx.i18n.t("main_menu.prompt"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
      return ctx.scene.leave();
    } else {
      ctx.session.searching = false;
      await ctx.reply(ctx.i18n.t("invalid_response"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
      return ctx.wizard.back();
    }
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const city = ctx.message?.text;
    ctx.session.cities.push(city);
    await ctx.reply(ctx.i18n.t("vacancies.add_another_city"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([[ctx.i18n.t("yes"), ctx.i18n.t("no")]])
        .resize()
        .oneTime().reply_markup,
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const response = ctx.message?.text;

    if (response === ctx.i18n.t("yes")) {
      await ctx.reply(ctx.i18n.t("vacancies.search_city"), {
        parse_mode: "HTML",
      });
      return ctx.wizard.selectStep(2);
    } else if (response === ctx.i18n.t("no")) {
      await fetchAndDisplayVacancies(ctx, "by_city", ctx.session.cities);
    } else {
      await ctx.reply(ctx.i18n.t("invalid_yes_or_no"), {
        parse_mode: "HTML",
      });
      ctx.wizard.cursor -= 1;
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    }
  }
);

async function fetchAndDisplayVacancies(ctx, type, cities = []) {
  if (type === "all") {
    ctx.session.vacancies = await getVacancies(
      GOOGLE_SHEET_ID,
      ctx.session.language
    );
  } else if (type === "abroad") {
    ctx.session.vacancies = await getVacanciesAbroad(
      GOOGLE_SHEET_ID,
      ctx.session.language
    );
  } else if (type === "by_city" && cities.length) {
    ctx.session.vacancies = await getVacanciesByCity(
      GOOGLE_SHEET_ID,
      cities,
      ctx.session.language
    );
  }

  if (ctx.session.vacancies.length === 0) {
    await ctx.reply(ctx.i18n.t("vacancies.no_vacancies_found"), {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(ctx).reply_markup,
    });
    return ctx.scene.leave();
  }

  ctx.session.currentPage = 0;
  await displayVacancies(ctx);
}

async function displayVacancies(ctx) {
  const { currentPage, vacancies } = ctx.session;
  const totalPages = Math.ceil(vacancies.length / VACANCIES_PER_PAGE);
  const start = currentPage * VACANCIES_PER_PAGE;
  const vacanciesToShow = vacancies.slice(start, start + VACANCIES_PER_PAGE);

  if (currentPage >= totalPages || currentPage < 0) {
    ctx.session.currentPage = Math.max(0, totalPages - 1);
    await ctx.reply(ctx.i18n.t("vacancies.no_more_vacancies"), {
      parse_mode: "HTML",
    });
    return;
  }

  const messageUA =
    ctx.i18n.t("vacancies.vacancies_display") +
    (currentPage + 1) +
    "/" +
    totalPages +
    "\n\n" +
    vacanciesToShow
      .map((vacancy, index) => {
        const title = ctx.session.searching
          ? vacancy.title || "Назва не вказана"
          : vacancy[0] || "Назва відсутня";

        const target = ctx.session.searching
          ? vacancy.gender || "Для всіх"
          : vacancy[1] || "N/A";

        const age = ctx.session.searching
          ? vacancy.age || "N/A"
          : vacancy[2] || "N/A";

        const town = ctx.session.searching
          ? vacancy.city || "Місце не вказано"
          : vacancy[3] || "Місто невідоме";
        const location = ctx.session.searching
          ? vacancy.location || "Місце не вказано"
          : vacancy[4] || "Місце невідоме";
        const salary = ctx.session.searching
          ? vacancy.salary || "Зарплата не вказана"
          : vacancy[5] || "N/A";
        const rate = ctx.session.searching
          ? vacancy.rate || "Ставка не вказана"
          : vacancy[7] || "N/A";
        const schedule = ctx.session.searching
          ? vacancy.schedule || "Розклад не вказаний"
          : vacancy[12] || "N/A";
        const tasks = ctx.session.searching
          ? vacancy.tasks || "Завдання не вказані"
          : vacancy[18] || "Завдання відсутні";

        let additionalInfo = "";
        if (vacancy.additionalOne) {
          additionalInfo += "\n - Житло: " + vacancy.additionalOne;
        }

        if (vacancy.additionalTwo) {
          additionalInfo += "\n - Доставка: " + vacancy.additionalTwo;
        }

        if (vacancy.additionalThree) {
          additionalInfo += "\n - Обіди: " + vacancy.additionalThree;
        }

        if (vacancy.additionalFour) {
          additionalInfo += "\n - Уніформа: " + vacancy.additionalFour;
        }

        if (vacancy[19]) {
          additionalInfo += "\n - Житло: " + vacancy[19];
        }

        if (vacancy[20]) {
          additionalInfo += "\n - Доставка: " + vacancy[20];
        }

        if (vacancy[21]) {
          additionalInfo += "\n - Обіди: " + vacancy[21];
        }

        if (vacancy[22]) {
          additionalInfo += "\n - Уніформа: " + vacancy[22];
        }

        const shiftInfo = ctx.session.searching
          ? ""
          : [
              vacancy[13] === "y" ? "\n- Денна" : "",
              vacancy[14] === "y" ? "\n- Нічна" : "",
              vacancy[15] === "y" ? "\n- Вечірня" : "",
            ]
              .filter(Boolean)
              .join(", ");

        const actualVacancyNumber = start + index + 1;

        return `<b>#${actualVacancyNumber} ${title}</b>
🎯 <b>Для кого</b>: ${target}, ${age}
📍 <b>Де</b>: ${town}, ${location}
💶 <b>Зарплата</b>: ${salary} zł/netto
💰 <b>Ставка</b>: ${rate} zł/netto\n
📅 <b>Розклад</b>: ${schedule} днів на тиждень \n<b>Зміни</b>: ${
          shiftInfo ? `${shiftInfo}` : ""
        }\n
✔️ <b>Завдання</b>: ${tasks}
${additionalInfo ? `➕ <b>Додатково</b>: \n${additionalInfo}` : ""}
___________________________________________`;
      })
      .join("\n\n");

  const messageRU =
    ctx.i18n.t("vacancies.vacancies_display") +
    (currentPage + 1) +
    "/" +
    totalPages +
    "\n\n" +
    vacanciesToShow
      .map((vacancy, index) => {
        const title = ctx.session.searching
          ? vacancy.title || "Название не указано"
          : vacancy[0] || "Название отсутствует";

        const target = ctx.session.searching
          ? vacancy.gender || "Для всех"
          : vacancy[1] || "N/A";

        const age = ctx.session.searching
          ? vacancy.age || "N/A"
          : vacancy[2] || "N/A";

        const town = ctx.session.searching
          ? vacancy.city || "Местоположение не указано"
          : vacancy[3] || "Город неизвестен";
        const location = ctx.session.searching
          ? vacancy.location || "Местоположение не указано"
          : vacancy[4] || "Место неизвестно";
        const salary = ctx.session.searching
          ? vacancy.salary || "Зарплата не указана"
          : vacancy[5] || "N/A";
        const rate = ctx.session.searching
          ? vacancy.rate || "Ставка не указана"
          : vacancy[7] || "N/A";
        const schedule = ctx.session.searching
          ? vacancy.schedule || "График не указан"
          : vacancy[12] || "N/A";
        const tasks = ctx.session.searching
          ? vacancy.tasks || "Задачи не указаны"
          : vacancy[18] || "Задачи отсутствуют";
        let additionalInfo = "";

        if (vacancy.additionalOne) {
          additionalInfo += "\n - Жилье: " + vacancy.additionalOne;
        }

        if (vacancy.additionalTwo) {
          additionalInfo += "\n - Доставка: " + vacancy.additionalTwo;
        }

        if (vacancy.additionalThree) {
          additionalInfo += "\n - Обеды: " + vacancy.additionalThree;
        }

        if (vacancy.additionalFour) {
          additionalInfo += "\n - Униформа: " + vacancy.additionalFour;
        }

        if (vacancy[19]) {
          additionalInfo += "\n - Жилье: " + vacancy[19];
        }

        if (vacancy[20]) {
          additionalInfo += "\n - Доставка: " + vacancy[20];
        }

        if (vacancy[21]) {
          additionalInfo += "\n - Обеды: " + vacancy[21];
        }

        if (vacancy[22]) {
          additionalInfo += "\n - Униформа: " + vacancy[22];
        }

        const shiftInfo = ctx.session.searching
          ? ""
          : [
              vacancy[13] === "y" ? "\n- Дневная" : "",
              vacancy[14] === "y" ? "\n- Ночная" : "",
              vacancy[15] === "y" ? "\n- Вечерняя" : "",
            ]
              .filter(Boolean)
              .join(", ");

        const actualVacancyNumber = start + index + 1;

        return `<b>#${actualVacancyNumber} ${title}</b>
🎯 <b>Для кого</b>: ${target}, ${age}
📍 <b>Где</b>: ${town}, ${location}
💶 <b>ЗП</b>: ${salary} zł/netto
💰 <b>Ставка</b>: ${rate} zł/netto\n
📅 <b>График</b>: ${schedule} дней в неделю \n<b>Смены</b>: ${
          shiftInfo ? `${shiftInfo}` : ""
        }\n
✔️ <b>Задачи</b>: ${tasks}
${additionalInfo ? `➕ <b>Дополнительно</b>: \n ${additionalInfo}` : ""}
___________________________________________`;
      })
      .join("\n\n");

  const message =
    ctx.i18n.t("vacancies.vacancies_display") +
    (currentPage + 1) +
    "/" +
    totalPages +
    "\n\n" +
    vacanciesToShow
      .map((vacancy, index) => {
        const title = ctx.session.searching
          ? vacancy.title || "Title not specified"
          : vacancy[0] || "No Title";

        const target = ctx.session.searching
          ? vacancy.gender || "For everyone"
          : vacancy[1] || "N/A";

        const age = ctx.session.searching
          ? vacancy.age || "N/A"
          : vacancy[2] || "N/A";

        const town = ctx.session.searching
          ? vacancy.city || "Location not specified"
          : vacancy[3] || "Unknown City";

        const location = ctx.session.searching
          ? vacancy.location || "Location not specified"
          : vacancy[4] || "Unknown Location";

        const salary = ctx.session.searching
          ? vacancy.salary || "Salary not specified"
          : vacancy[5] || "N/A";

        const rate = ctx.session.searching
          ? vacancy.rate || "Rate not specified"
          : vacancy[7] || "N/A";

        const schedule = ctx.session.searching
          ? vacancy.schedule || "Schedule not specified"
          : vacancy[12] || "N/A";

        const tasks = ctx.session.searching
          ? vacancy.tasks || "Tasks not specified"
          : vacancy[18] || "No tasks listed";
        let additionalInfo = "";

        if (vacancy.additionalOne) {
          additionalInfo += "\n - Housing: " + vacancy.additionalOne;
        }

        if (vacancy.additionalTwo) {
          additionalInfo += "\n - Transport: " + vacancy.additionalTwo;
        }

        if (vacancy.additionalThree) {
          additionalInfo += "\n - Meals: " + vacancy.additionalThree;
        }

        if (vacancy.additionalFour) {
          additionalInfo += "\n - Uniform: " + vacancy.additionalFour;
        }

        if (vacancy[19]) {
          additionalInfo += "\n - Housing: " + vacancy[19];
        }

        if (vacancy[20]) {
          additionalInfo += "\n - Transport: " + vacancy[20];
        }

        if (vacancy[21]) {
          additionalInfo += "\n - Meals: " + vacancy[21];
        }

        if (vacancy[22]) {
          additionalInfo += "\n - Uniform: " + vacancy[22];
        }

        const shiftInfo = ctx.session.searching
          ? ""
          : [
              vacancy[13] === "y" ? "\n- Day shifts" : "",
              vacancy[14] === "y" ? "\n- Night shifts" : "",
              vacancy[15] === "y" ? "\n- Evening shifts" : "",
            ]
              .filter(Boolean)
              .join(", ");

        const actualVacancyNumber = start + index + 1;

        return `<b>#${actualVacancyNumber} ${title}</b>
🎯 <b>For whom</b>: ${target}, ${age}
📍 <b>Where</b>: ${town}, ${location}
💶 <b>Salary</b>: ${salary} zł/netto
💰 <b>Rate</b>: ${rate} zł/netto\n
📅 <b>Schedule</b>: ${schedule} days a week \n<b>Shifts</b>: ${
          shiftInfo ? `${shiftInfo}` : ""
        }\n
✔️ <b>Tasks</b>: ${tasks}
${additionalInfo ? `➕ <b>Additional</b>: \n ${additionalInfo}` : ""}
___________________________________________`;
      })
      .join("\n\n");

  const inlineKeyboard = [];

  if (totalPages > 1) {
    const navigationButtons = [];
    if (currentPage > 0) {
      navigationButtons.push(
        Markup.button.callback(ctx.i18n.t("previous"), "prev")
      );
    }
    if (currentPage < totalPages - 1) {
      navigationButtons.push(
        Markup.button.callback(ctx.i18n.t("next"), "next")
      );
    }
    if (navigationButtons.length) inlineKeyboard.push(navigationButtons);
  }

  inlineKeyboard.push(
    ...vacanciesToShow.map((_, index) => [
      Markup.button.callback(
        `${ctx.i18n.t("vacancies.apply_button")} #${start + index + 1}`,
        `apply_${start + index}`
      ),
    ])
  );

  inlineKeyboard.push([
    Markup.button.callback(ctx.i18n.t("vacancies.return_main_menu"), "menu"),
  ]);

  if (ctx.callbackQuery) {
    const action = ctx.callbackQuery.data; // Access action directly from callback data

    // If the action starts with "apply_", do not edit the message
    if (action.startsWith("apply_")) {
      return; // Exit early, no further action needed
    }

    const currentMessageText = ctx.callbackQuery.message.text;
    const currentReplyMarkup = ctx.callbackQuery.message.reply_markup;

    // Determine the new message text based on the session language
    const newMessageText =
      ctx.session.language === "ua"
        ? messageUA
        : ctx.session.language === "ru"
        ? messageRU
        : message;

    // Create a new reply markup for the inline keyboard
    const newReplyMarkup = Markup.inlineKeyboard(inlineKeyboard).reply_markup;

    // Check if message text or reply markup has changed
    const textChanged = currentMessageText !== newMessageText;
    const markupChanged = !areKeyboardsEqual(
      currentReplyMarkup,
      newReplyMarkup
    );

    // Proceed with editing only if there's a change
    if (textChanged || markupChanged) {
      try {
        await ctx.editMessageText(newMessageText, {
          parse_mode: "HTML",
          reply_markup: newReplyMarkup,
        });
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
    }
  } else {
    // Send a new message if it's not a callback query
    await ctx.reply(
      ctx.session.language === "ua"
        ? messageUA
        : ctx.session.language === "ru"
        ? messageRU
        : message,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard(inlineKeyboard).reply_markup,
      }
    );
  }
}

viewVacanciesScene.action(/prev|next|apply_\d+|menu/, async (ctx) => {
  const action = ctx.match[0];

  if (action === "prev") {
    ctx.session.currentPage = Math.max(ctx.session.currentPage - 1, 0);
  } else if (action === "next") {
    ctx.session.currentPage = Math.min(
      ctx.session.currentPage + 1,
      Math.ceil(ctx.session.vacancies.length / VACANCIES_PER_PAGE) - 1
    );
  } else if (action.startsWith("apply_")) {
    const vacancyIndex = parseInt(action.split("_")[1], 10);
    ctx.session.selectedVacancy = ctx.session.vacancies[vacancyIndex];
    ctx.session.applying = true;

    ctx.scene.enter("applyScene");
  } else if (action === "menu") {
    await ctx.reply(ctx.i18n.t("main_menu.prompt"), {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(ctx).reply_markup,
    });
    return ctx.scene.leave();
  }

  await displayVacancies(ctx);
});

module.exports = viewVacanciesScene;
