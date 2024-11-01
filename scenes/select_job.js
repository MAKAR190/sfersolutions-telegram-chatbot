const { Scenes, Markup } = require("telegraf");
const {
  getVacanciesByCity,
  getVacanciesByJobOfferings,
  getVacanciesByGenderAndAge,
} = require("../services/googleSheets");
const { GOOGLE_SHEET_ID } = require("../config/config");
const { mainKeyboard } = require("../utils/keyboards");
const handleCommand = require("../handlers/handleCommand");
const VACANCIES_PER_PAGE = 4;
function areKeyboardsEqual(keyboard1, keyboard2) {
  return JSON.stringify(keyboard1) === JSON.stringify(keyboard2);
}
const selectJobScene = new Scenes.WizardScene(
  "select_job_scene",
  async (ctx) => {
    await ctx.reply(
      ctx.i18n.t("job_selection.please_choose"),

      {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          [
            ctx.i18n.t("job_selection.choose_by_city"),
            ctx.i18n.t("job_selection.choose_by_job"),
          ],
          [
            ctx.i18n.t("job_selection.choose_by_gender_age"),
            ctx.i18n.t("go_back"),
          ],
        ]).oneTime().reply_markup,
      }
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const selectedOption = ctx.message.text;
    ctx.session.cities = [];
    ctx.session.searching = false;

    if (selectedOption === ctx.i18n.t("job_selection.choose_by_city")) {
      await ctx.reply(ctx.i18n.t("job_selection.city_selection"), {
        parse_mode: "HTML",
      });
      ctx.session.searching = true;
      return ctx.wizard.next();
    } else if (selectedOption === ctx.i18n.t("job_selection.choose_by_job")) {
      ctx.session.searching = false; // Set searching to false for job offerings
      ctx.wizard.cursor += 2;
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    } else if (
      selectedOption === ctx.i18n.t("job_selection.choose_by_gender_age")
    ) {
      ctx.session.searching = false; // Set searching to false for job offerings
      ctx.wizard.cursor += 6;
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    } else if (selectedOption === ctx.i18n.t("go_back")) {
      ctx.reply(ctx.i18n.t("go_back"), {
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
      return ctx.scene.leave();
    } else {
      await ctx.reply(ctx.i18n.t("invalid_response"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
      return ctx.scene.leave();
    }
  },

  // Step 3: Handle city input
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.session.searching) {
      const city = ctx.message.text;
      ctx.session.cities.push(city); // Save city input

      await ctx.reply(ctx.i18n.t("job_selection.add_another_city"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([[ctx.i18n.t("yes")], [ctx.i18n.t("no")]])
          .resize()
          .oneTime().reply_markup,
      });
      return ctx.wizard.next(); // Move to next step
    } else {
      return ctx.wizard.next(); // Just in case, we can proceed to work hours
    }
  },

  // Step 4: Confirm if the user wants to add another city
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.session.searching) {
      const response = ctx.message.text;
      if (response === ctx.i18n.t("yes")) {
        await ctx.reply(ctx.i18n.t("job_selection.enter_another_city"), {
          parse_mode: "HTML",
        });
        return ctx.wizard.selectStep(2); // Go back to ask for city
      } else if (response === ctx.i18n.t("no")) {
        await fetchAndDisplayVacancies(ctx, ctx.session.cities);
      } else {
        await ctx.reply(ctx.i18n.t("invalid_yes_or_no"), {
          parse_mode: "HTML",
        });
        ctx.wizard.cursor -= 1;
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      }
    } else {
      // If the user chose by job offerings, proceed to the next step (work hours)
      await ctx.reply(ctx.i18n.t("job_selection.enter_work_hours"), {
        parse_mode: "HTML",
      });
      return ctx.wizard.next(); // Move to the next step for work hours
    }
  },

  // Step 5: Handle hours of work input
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const workHours = parseInt(ctx.message.text, 10);

    // Validate hours input
    if (isNaN(workHours) || workHours < 1 || workHours > 20) {
      await ctx.reply(ctx.i18n.t("job_selection.invalid_hours"), {
        parse_mode: "HTML",
      });
      return ctx.wizard.selectStep(4); // Go back to ask for hours
    }

    ctx.session.workHours = workHours; // Save work hours input

    await ctx.reply(ctx.i18n.t("job_selection.enter_working_days"), {
      parse_mode: "HTML",
    });
    return ctx.wizard.next(); // Move to the next step
  },

  // Step 6: Handle working days input with validation
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const workingDays = parseInt(ctx.message.text, 10);

    // Validate working days input
    if (isNaN(workingDays) || workingDays < 1 || workingDays > 7) {
      await ctx.reply(ctx.i18n.t("job_selection.invalid_days"), {
        parse_mode: "HTML",
      });
      return ctx.wizard.selectStep(5); // Go back to ask for working days
    }

    ctx.session.workingDays = workingDays; // Save working days input

    // Provide inline keyboard for shift options
    const shiftOptionsKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.shift_options.day_night"),
          "shift_day_night"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.shift_options.day"),
          "shift_day"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.shift_options.night"),
          "shift_night"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.shift_options.evening"),
          "shift_evening"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.shift_options.any"),
          "shift_any"
        ),
      ],
    ]);

    await ctx.reply(ctx.i18n.t("job_selection.select_shift"), {
      parse_mode: "HTML",
      reply_markup: shiftOptionsKeyboard.reply_markup,
    });
    return ctx.wizard.next(); // Move to the next step
  },

  // Step 7: Handle shift options selection
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (!ctx.callbackQuery) {
      await ctx.reply(ctx.i18n.t("invalid_response"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
      return ctx.scene.leave();
    }
    const shiftOption = ctx.callbackQuery.data;

    ctx.session.shiftOptions = shiftOption;

    const workHours = ctx.session.workHours; // Retrieved from session
    const workingDays = ctx.session.workingDays; // Retrieved from session
    const shiftOptions = ctx.session.shiftOptions; // Retrieved from session

    const vacancies = await getVacanciesByJobOfferings(
      GOOGLE_SHEET_ID,
      workHours,
      workingDays,
      shiftOptions,
      ctx.session.language
    );

    ctx.session.vacancies = vacancies;
    ctx.session.currentPage = 0;

    if (vacancies.length === 0) {
      await ctx.reply(ctx.i18n.t("job_selection.no_vacancies"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
      return ctx.scene.leave();
    } else {
      await displayVacancies(ctx);
    }

    await ctx.reply(
      ctx.i18n.t("vacancies.middle_message"),
      Markup.removeKeyboard()
    );

    ctx.session.workHours = null;
    ctx.session.workingDays = null;
    ctx.session.shiftOptions = null;
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const genderKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.gender_options.male"),
          `gender_${
            ctx.session.language === "ua"
              ? "ч"
              : ctx.session.language === "ru"
              ? "м"
              : "m"
          }`
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.gender_options.female"),
          `gender_${
            ctx.session.language === "ua"
              ? "ж"
              : ctx.session.language === "ru"
              ? "ж"
              : "f"
          }`
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("job_selection.gender_options.couple"),
          `gender_${
            ctx.session.language === "ua"
              ? "пари"
              : ctx.session.language === "ru"
              ? "пары"
              : "couples"
          }`
        ),
      ],
    ]);

    await ctx.reply(ctx.i18n.t("job_selection.select_gender"), {
      parse_mode: "HTML",
      reply_markup: genderKeyboard.reply_markup,
    });
    return ctx.wizard.next(); // Move to the next step for age input
  },

  // Step 2: Handle the gender selection and ask for age
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.callbackQuery) {
      if (ctx.callbackQuery.data) {
        ctx.session.gender = ctx.callbackQuery.data.split("_")[1]; // Save gender in session

        if (ctx.session.gender === "пари" || ctx.session.gender === "couples") {
          ctx.session.ages = []; // Initialize ages array
          await ctx.reply(ctx.i18n.t("job_selection.ask_for_ages"), {
            parse_mode: "HTML",
          }); // Ask for ages of both individuals
          return ctx.wizard.next(); // Move to the next step for age input
        }

        await ctx.reply(ctx.i18n.t("job_selection.gender_selected"), {
          parse_mode: "HTML",
        });
        return ctx.wizard.next(); // Move to the next step for age input
      } else {
        await ctx.reply(ctx.i18n.t("invalid_response"), {
          parse_mode: "HTML",
          reply_markup: mainKeyboard(ctx).reply_markup,
        });
        return ctx.scene.leave();
      }
    }
  },

  // Step 3: Handle age input
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    const age = parseInt(ctx.message.text, 10); // Get user input for age

    if (isNaN(age) || age < 17 || age > 70) {
      await ctx.reply(ctx.i18n.t("job_selection.invalid_age"), {
        parse_mode: "HTML",
      });
      ctx.wizard.cursor -= 2;
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    }

    // Ensure ages is initialized before pushing
    if (!ctx.session.ages) {
      ctx.session.ages = []; // Initialize if it is undefined
    }

    ctx.session.ages.push(age); // Save age in session

    if (
      ctx.session.ages.length < 2 &&
      (ctx.session.gender === "пари" || ctx.session.gender === "couples")
    ) {
      await ctx.reply(ctx.i18n.t("job_selection.ask_for_next_age"), {
        parse_mode: "HTML",
      }); // Ask for the next age
      return; // Wait for the next age input
    }

    // Now that both ages are collected, proceed with fetching vacancies
    const vacancies = await getVacanciesByGenderAndAge(
      GOOGLE_SHEET_ID,
      ctx.session.gender,
      ctx.session.ages, // Pass both ages
      ctx.session.language
    );

    ctx.session.vacancies = vacancies;
    ctx.session.currentPage = 0;

    if (vacancies.length === 0) {
      await ctx.reply(ctx.i18n.t("job_selection.no_vacancies"), {
        parse_mode: "HTML",
        reply_markup: mainKeyboard(ctx).reply_markup,
      });
      return ctx.scene.leave();
    } else {
      await displayVacancies(ctx);
    }

    // Clear session data after processing
    ctx.session.gender = null;
    ctx.session.ages = null; // Reset ages
  }
);

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

  const message =
    ctx.i18n.t("vacancies.vacancies_display") +
    (currentPage + 1) +
    "/" +
    totalPages +
    "\n\n" +
    vacanciesToShow
      .map((vacancy, index) => {
        const title = vacancy.title;
        const target = vacancy.gender || "For everyone";
        const age = vacancy.age;
        const town = vacancy.city || "Location not specified";
        const location = vacancy.location || "Location not specified";
        const salary = vacancy.salary || "Salary not specified";
        const rate = vacancy.rate || "Rate not specified";
        const schedule = vacancy.schedule || "Schedule not specified";
        const tasks = vacancy.tasks || "Tasks not specified";
        let additionalInfo = "";

        // Check each additional field and append it to the additionalInfo string if it exists
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

        const shiftInfo = [
          vacancy.day === "y" ? "\n- Day shifts" : "",
          vacancy.night === "y" ? "\n- Night shifts" : "",
          vacancy.evening === "y" ? "\n- Evening shifts" : "",
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
${additionalInfo ? `➕ <b>Additional</b>: ${additionalInfo}` : ""}
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
        const title = vacancy.title;
        const target = vacancy.gender || "Для всех";
        const age = vacancy.age;
        const town = vacancy.city || "Местоположение не указано";
        const location = vacancy.location || "Местоположение не указано";
        const salary = vacancy.salary || "ЗП не указана";
        const rate = vacancy.rate || "Ставка не указана";
        const schedule = vacancy.schedule || "График не указан";
        const tasks = vacancy.tasks || "Задачи не указаны";
        let additionalInfo = "";

        // Check each additional field and append it to the additionalInfo string if it exists
        if (vacancy.additionalOne) {
          additionalInfo += "\n - Жилье: " + vacancy.additionalOne;
        }

        if (vacancy.additionalTwo) {
          additionalInfo += "\n - Довоз: " + vacancy.additionalTwo;
        }

        if (vacancy.additionalThree) {
          additionalInfo += "\n - Обеды: " + vacancy.additionalThree;
        }

        if (vacancy.additionalFour) {
          additionalInfo += "\n - Униформа: " + vacancy.additionalFour;
        }
        const shiftInfo = [
          vacancy.day === "y" ? "\n- Дневные" : "",
          vacancy.night === "y" ? "\n- Ночные" : "",
          vacancy.evening === "y" ? "\n- Вечерние" : "",
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
${additionalInfo ? `➕ <b>Дополнительно</b>: ${additionalInfo}` : ""}
___________________________________________`;
      })
      .join("\n\n");

  const messageUA =
    ctx.i18n.t("vacancies.vacancies_display") +
    (currentPage + 1) +
    "/" +
    totalPages +
    "\n\n" +
    vacanciesToShow
      .map((vacancy, index) => {
        const title = vacancy.title;
        const target = vacancy.gender || "Для всіх";
        const age = vacancy.age;
        const town = vacancy.city || "Місце не вказано";
        const location = vacancy.location || "Місце не вказано";
        const salary = vacancy.salary || "Зарплата не вказана";
        const rate = vacancy.rate || "Ставка не вказана";
        const schedule = vacancy.schedule || "Розклад не вказано";
        const tasks = vacancy.tasks || "Завдання не вказано";
        let additionalInfo = "";

        // Check each additional field and append it to the additionalInfo string if it exists
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

        const shiftInfo = [
          vacancy.day === "y" ? "\n- Денна" : "",
          vacancy.night === "y" ? "\n- Нічна" : "",
          vacancy.evening === "y" ? "\n- Вечірня" : "",
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
${additionalInfo ? `➕ <b>Додатково</b>: ${additionalInfo}` : ""}
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
    const action = ctx.callbackQuery.data;

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

async function fetchAndDisplayVacancies(ctx, cities) {
  ctx.session.vacancies = await getVacanciesByCity(
    GOOGLE_SHEET_ID,
    cities,
    ctx.session.language
  );

  if (ctx.session.vacancies.length === 0) {
    await ctx.reply(ctx.i18n.t("job_selection.no_vacancies"), {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(ctx).reply_markup,
    });
    return ctx.scene.leave();
  }

  ctx.session.currentPage = 0;
  await displayVacancies(ctx);
}

selectJobScene.action(/prev|next|apply_\d+|menu/, async (ctx) => {
  const action = ctx.match[0];

  // Navigation or application handling as previously defined
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
    ctx.session.applying = false; // Reset applying state
    return ctx.scene.leave();
  }

  // Display vacancies again after navigation
  await displayVacancies(ctx);
});

module.exports = selectJobScene;
