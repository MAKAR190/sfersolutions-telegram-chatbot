const { Scenes, Markup } = require("telegraf");
const { match } = require("telegraf-i18n");
const { backKeyboard } = require("../utils/keyboards");
const { getCalendar } = require("../calendar");
const { GOOGLE_SHEET_ID } = require("../config/config");
const handleCommand = require("../handlers/handleCommand");
const { checkUserIdExists } = require("../services/googleSheets");
const Papa = require("papaparse");
const fs = require("fs");

const CITIES_PER_PAGE = 5;

const loadCities = (ctx) => {
  try {
    const file = fs.readFileSync(
      process.cwd() +
        (ctx.session.language === "ua"
          ? "/polandUa.csv"
          : ctx.session.language === "ru"
          ? "/polandRu.csv"
          : "/poland.csv"),
      "utf8"
    );
    const results = Papa.parse(file, { header: false });
    return results.data.map((row) => row[0]);
  } catch (error) {
    console.error("Error reading the CSV file:", error);
    return [];
  }
};
const normalizeCityName = (city) => {
  const replacements = {
    ą: "a",
    ć: "c",
    ę: "e",
    ł: "l",
    ń: "n",
    ó: "o",
    ś: "s",
    ź: "z",
    ż: "z",
    Ą: "A",
    Ć: "C",
    Ę: "E",
    Ł: "L",
    Ń: "N",
    Ó: "O",
    Ś: "S",
    Ź: "Z",
    Ż: "Z",
  };

  return city
    .split("")
    .map((char) => replacements[char] || char)
    .join("")
    .toLowerCase();
};
const paginateCities = (cities, page) => {
  const start = (page - 1) * CITIES_PER_PAGE;
  return cities.slice(start, start + CITIES_PER_PAGE);
};
const displayCitySelection = async (ctx, page = 1, searchQuery = null) => {
  let cities = loadCities(ctx);

  const normalizedCities = cities.map(normalizeCityName);

  if (searchQuery) {
    const normalizedSearchQuery = normalizeCityName(searchQuery);

    cities = cities.filter((city, index) =>
      normalizedCities[index].includes(normalizedSearchQuery)
    );
  }

  const totalPages = Math.ceil(cities.length / CITIES_PER_PAGE);

  if (searchQuery && cities.length === 0) {
    await ctx.reply(ctx.i18n.t("questionnaire.search_city_fail"), {
      parse_mode: "HTML",
    });
    ctx.wizard.selectStep(6);
    ctx.wizard.state.searchMode = false;
    ctx.wizard.state.searchQuery = null;
    return displayCitySelection(ctx, 1, null);
  }

  const paginatedCities = paginateCities(cities, page);
  const cityButtons = paginatedCities.map((city) =>
    Markup.button.callback(city, `select_city_${city}`)
  );

  const paginationButtons = [];
  if (page > 1) {
    paginationButtons.push(
      Markup.button.callback(ctx.i18n.t("previous"), `prev_page_${page - 1}`)
    );
  }
  if (page < totalPages) {
    paginationButtons.push(
      Markup.button.callback(ctx.i18n.t("next"), `next_page_${page + 1}`)
    );
  }

  paginationButtons.push(
    Markup.button.callback(ctx.i18n.t("search"), "search_city")
  );

  const keyboard = [];
  for (let cityButton of cityButtons) {
    keyboard.push([cityButton]);
  }

  if (paginationButtons.length > 0) {
    keyboard.push(paginationButtons);
  }

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(ctx.i18n.t("questionnaire.city"), {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard(keyboard).oneTime().resize()
          .reply_markup,
      });
    } catch (error) {
      await ctx.reply(ctx.i18n.t("questionnaire.city"), {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard(keyboard).oneTime().resize()
          .reply_markup,
      });
    }
  } else {
    await ctx.reply(ctx.i18n.t("questionnaire.city"), {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard(keyboard).oneTime().resize()
        .reply_markup,
    });
  }
};
const handleGoBack = async (ctx) => {
  ctx.wizard.back();

  const currentStep = ctx.wizard.cursor;

  switch (currentStep) {
    case 1:
      await ctx.reply(ctx.i18n.t("questionnaire.intro"), {
        parse_mode: "HTML",
      });
      break;
    case 2:
      await ctx.reply(ctx.i18n.t("questionnaire.phone_number"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          Markup.button.contactRequest(
            ctx.i18n.t("questionnaire.share_contact")
          ),
          Markup.button.text(ctx.i18n.t("go_back")),
          Markup.button.text(ctx.i18n.t("cancel")),
        ])
          .oneTime()
          .resize().reply_markup,
      });
      break;
    case 3:
      await ctx.reply(ctx.i18n.t("questionnaire.age"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          Markup.button.text(ctx.i18n.t("go_back")),
          Markup.button.text(ctx.i18n.t("cancel")),
        ])
          .oneTime()
          .resize().reply_markup,
      });
      break;
    case 4:
      await ctx.reply(ctx.i18n.t("questionnaire.citizenship"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          Markup.button.text("Ukraine"),
          Markup.button.text("Poland"),
          Markup.button.text("Belarus"),
          Markup.button.text(ctx.i18n.t("go_back")),
          Markup.button.text(ctx.i18n.t("cancel")),
        ])
          .oneTime()
          .resize().reply_markup,
      });
      break;
    case 5:
      await ctx.reply(ctx.i18n.t("questionnaire.document"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          [
            Markup.button.text(ctx.i18n.t("questionnaire.docs.pesel")),
            Markup.button.text(ctx.i18n.t("questionnaire.docs.passport")),
          ],
          [
            Markup.button.text(ctx.i18n.t("questionnaire.docs.karta")),
            Markup.button.text(ctx.i18n.t("questionnaire.docs.student_doc")),
          ],
          [
            Markup.button.text(ctx.i18n.t("go_back")),
            Markup.button.text(ctx.i18n.t("cancel")),
          ],
        ])
          .oneTime()
          .resize().reply_markup,
      });
      break;
    case 6:
      await displayCitySelection(ctx, 1);
      break;
    case 7:
      await ctx.reply(
        ctx.i18n.t("questionnaire.relocate"), // New step for relocation readiness
        {
          parse_mode: "HTML",
          reply_markup: Markup.keyboard([
            Markup.button.text(ctx.i18n.t("questionnaire.yes")), // "Yes" button
            Markup.button.text(ctx.i18n.t("questionnaire.no")), // "No" button
            Markup.button.text(ctx.i18n.t("go_back")), // Back button
            Markup.button.text(ctx.i18n.t("cancel")), // Cancel button
          ])
            .oneTime()
            .resize().reply_markup,
        }
      );
    case 8:
      await ctx.reply(
        `${ctx.i18n.t("questionnaire.job_for_self")}\n${ctx.i18n.t(
          "questionnaire.number_of_people"
        )}`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.keyboard([
            Markup.button.text(ctx.i18n.t("questionnaire.only_myself")),
            Markup.button.text(ctx.i18n.t("questionnaire.not_only_myself")),
            Markup.button.text(ctx.i18n.t("go_back")),
            Markup.button.text(ctx.i18n.t("cancel")),
          ])
            .oneTime()
            .resize().reply_markup,
        }
      );
      break;
    case 9:
      await ctx.reply(ctx.i18n.t("questionnaire.not_ready_areas"), {
        parse_mode: "HTML",
        reply_markup: backKeyboard.reply_markup,
      });
      break;
    case 10:
      const calendar = getCalendar();
      await ctx.reply(ctx.i18n.t("questionnaire.start_date"), {
        parse_mode: "HTML",
        reply_markup: calendar.getCalendar().reply_markup,
      });
      break;
    default:
      await ctx.reply(ctx.i18n.t("questionnaire.intro"));
  }
};

const questionnaireScene = new Scenes.WizardScene(
  "submit_application_scene",

  async (ctx) => {
    const userIdExists = await checkUserIdExists(GOOGLE_SHEET_ID, ctx.from.id);

    if (userIdExists !== -1) {
      await ctx.reply(ctx.i18n.t("questionnaire.skip_questionnaire"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          Markup.button.text(ctx.i18n.t("questionnaire.yes")),
          Markup.button.text(ctx.i18n.t("questionnaire.no")),
        ])
          .oneTime()
          .resize().reply_markup,
      });
    } else {
      await ctx.reply(ctx.i18n.t("questionnaire.intro"), {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          Markup.button.text(ctx.i18n.t("cancel")),
        ])
          .oneTime()
          .resize().reply_markup,
      });
    }

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message && ctx.message.text) {
      if (ctx.message.text === ctx.i18n.t("questionnaire.yes")) {
        ctx.session.skipped = true;
        ctx.session.selectTime = true;

        await ctx.reply(ctx.i18n.t("questionnaire.skip_success"), {
          parse_mode: "HTML",
          reply_markup: getCalendar().getCalendar().reply_markup,
        });
        ctx.session.contactProcess = false;
        delete ctx.session.startDate;

        return ctx.scene.leave();
      } else if (ctx.message.text === ctx.i18n.t("questionnaire.no")) {
        await ctx.reply(ctx.i18n.t("questionnaire.intro"), {
          parse_mode: "HTML",
          reply_markup: Markup.keyboard([
            Markup.button.text(ctx.i18n.t("cancel")),
          ])
            .oneTime()
            .resize().reply_markup,
        });
        ctx.wizard.cursor = 0;
        return ctx.wizard.next();
      }
    }

    if (ctx.message && ctx.message.text) {
      ctx.session.fullName = ctx.message.text;
    }

    await ctx.reply(ctx.i18n.t("questionnaire.phone_number"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([
        Markup.button.contactRequest(ctx.i18n.t("questionnaire.share_contact")),
        Markup.button.text(ctx.i18n.t("go_back")),
        Markup.button.text(ctx.i18n.t("cancel")),
      ])
        .oneTime()
        .resize().reply_markup,
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    const phoneNumberRegex =
      /^\+?\d{1,3}[\s-]?(\(?\d{1,4}\)?[\s-]?)*\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}$/;

    if (await handleCommand(ctx)) return;

    if (ctx.message) {
      if (ctx.message.contact) {
        ctx.session.phoneNumber = ctx.message.contact.phone_number;
      } else if (ctx.message.text === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      } else {
        const enteredPhoneNumber = ctx.message.text;

        if (!phoneNumberRegex.test(enteredPhoneNumber)) {
          await ctx.reply(ctx.i18n.t("invalid_phone_number"), {
            parse_mode: "HTML",
          });
          ctx.wizard.back();
          return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        ctx.session.phoneNumber = enteredPhoneNumber;
      }
    }

    await ctx.reply(ctx.i18n.t("questionnaire.age"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([
        Markup.button.text(ctx.i18n.t("go_back")),
        Markup.button.text(ctx.i18n.t("cancel")),
      ])
        .oneTime()
        .resize(),
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      const userInput = ctx.message.text;

      const agePattern = /^[0-9]{1,2}$/;

      if (userInput === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }

      if (agePattern.test(userInput)) {
        ctx.session.age = userInput;
      } else {
        await ctx.reply(ctx.i18n.t("questionnaire.age_invalid"), {
          parse_mode: "HTMl",
        });

        await ctx.reply(ctx.i18n.t("questionnaire.age"), {
          parse_mode: "HTML",
          reply_markup: Markup.keyboard([
            Markup.button.text(ctx.i18n.t("go_back")),
            Markup.button.text(ctx.i18n.t("cancel")),
          ])
            .oneTime()
            .resize().reply_markup,
        });
        return ctx.wizard.selectStep(3);
      }
    }

    await ctx.reply(ctx.i18n.t("questionnaire.citizenship"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([
        [
          Markup.button.text("🇺🇦 Ukraine"),
          Markup.button.text("🇮🇳 India"),
          Markup.button.text("🇨🇴 Colombia"),
        ],
        [
          Markup.button.text("🇲🇩 Moldova"),
          Markup.button.text("🇬🇪 Georgia"),
          Markup.button.text("🇦🇲 Armenia"),
        ],
        [
          Markup.button.text("🇧🇾 Belarus"),
          Markup.button.text(ctx.i18n.t("go_back")),
          Markup.button.text(ctx.i18n.t("cancel")),
        ],
      ])
        .oneTime()
        .resize().reply_markup,
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      if (ctx.message.text === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }

      ctx.session.citizenship = ctx.message.text;
    }

    await ctx.reply(ctx.i18n.t("questionnaire.document"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([
        [
          Markup.button.text(ctx.i18n.t("questionnaire.docs.pesel")),
          Markup.button.text(ctx.i18n.t("questionnaire.docs.passport")),
        ],
        [
          Markup.button.text(ctx.i18n.t("questionnaire.docs.karta")),
          Markup.button.text(ctx.i18n.t("questionnaire.docs.student_doc")),
        ],
        [
          Markup.button.text(ctx.i18n.t("go_back")),
          Markup.button.text(ctx.i18n.t("cancel")),
        ],
      ])
        .oneTime()
        .resize().reply_markup,
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      if (ctx.message.text === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }

      ctx.session.document = ctx.message.text;
    }
    const citySelectionKeyboard = Markup.keyboard([
      [
        Markup.button.text(ctx.i18n.t("go_back")),
        Markup.button.text(ctx.i18n.t("cancel")),
      ],
    ])
      .oneTime()
      .resize();

    await ctx.reply(ctx.i18n.t("success"), {
      parse_mode: "HTML",
      reply_markup: citySelectionKeyboard.reply_markup,
    });

    await displayCitySelection(ctx, 1);
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message && ctx.message.text === ctx.i18n.t("go_back")) {
      return handleGoBack(ctx);
    }
    const callbackData = ctx.callbackQuery?.data;

    ctx.wizard.state.searchMode = false;

    if (callbackData) {
      if (callbackData.startsWith("select_city_")) {
        const cityName = callbackData.split("_")[2];
        ctx.session.city = cityName;
        ctx.wizard.next();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      }

      if (
        callbackData.startsWith("next_page_") ||
        callbackData.startsWith("prev_page_")
      ) {
        const pageNumber = parseInt(callbackData.split("_")[2]);
        return displayCitySelection(
          ctx,
          pageNumber,
          ctx.wizard.state.searchQuery || null
        );
      }

      if (callbackData === "search_city") {
        await ctx.reply(ctx.i18n.t("questionnaire.search_city"), {
          parse_mode: "HTMl",
        });
        ctx.wizard.state.searchMode = true;
        return ctx.wizard.next();
      }

      if (callbackData === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }
    } else if (ctx.message && ctx.message.text) {
      const typedCity = ctx.message.text;
      ctx.session.city = typedCity;
      ctx.wizard.cursor += 2;
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    }
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message && ctx.message.text === ctx.i18n.t("go_back")) {
      ctx.wizard.cursor -= 2;
      return handleGoBack(ctx);
    }

    if (ctx.wizard.state.searchMode && ctx.message && ctx.message.text) {
      const query = ctx.message.text;

      ctx.wizard.state.searchQuery = query;
      await displayCitySelection(ctx, 1, query);
      return;
    }

    if (ctx.callbackQuery && ctx.callbackQuery.data) {
      const callbackData = ctx.callbackQuery.data;

      if (callbackData.startsWith("select_city_")) {
        const cityName = callbackData.split("_")[2];
        ctx.session.city = cityName;
        ctx.wizard.next();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      }

      if (
        callbackData.startsWith("next_page_") ||
        callbackData.startsWith("prev_page_")
      ) {
        const pageNumber = parseInt(callbackData.split("_")[2]);
        return displayCitySelection(
          ctx,
          pageNumber,
          ctx.wizard.state.searchQuery || null
        );
      }

      if (callbackData === "search_city") {
        await ctx.reply(ctx.i18n.t("questionnaire.search_city"), {
          parse_mode: "HTML",
        });
        ctx.wizard.state.searchMode = true;
        return;
      }
    }

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      if (ctx.message.text === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }

      ctx.session.city = ctx.message.text;
    }

    await ctx.reply(
      ctx.i18n.t("questionnaire.relocate"), // Ensure you have this translation in your i18n file
      {
        parse_mode: "HTML",
        reply_markup: Markup.keyboard([
          Markup.button.text(ctx.i18n.t("questionnaire.yes")), // "Yes" button
          Markup.button.text(ctx.i18n.t("questionnaire.no")), // "No" button
          Markup.button.text(ctx.i18n.t("go_back")), // Back button
          Markup.button.text(ctx.i18n.t("cancel")), // Cancel button
        ])
          .oneTime()
          .resize().reply_markup,
      }
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      if (ctx.message.text === ctx.i18n.t("go_back")) {
        ctx.wizard.cursor -= 2;
        return handleGoBack(ctx);
      }
      ctx.session.relocate = ctx.message.text;

      await ctx.reply(
        `${ctx.i18n.t("questionnaire.job_for_self")}\n` +
          `${ctx.i18n.t("questionnaire.number_of_people")}`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.keyboard([
            Markup.button.text(ctx.i18n.t("questionnaire.only_myself")),
            Markup.button.text(ctx.i18n.t("questionnaire.not_only_myself")),
            Markup.button.text(ctx.i18n.t("go_back")),
            Markup.button.text(ctx.i18n.t("cancel")),
          ])
            .oneTime()
            .resize().reply_markup,
        }
      );
    }

    return ctx.wizard.next();
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      if (ctx.message.text === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }

      if (ctx.message.text === ctx.i18n.t("questionnaire.only_myself")) {
        ctx.session.numberOfPeople = 1;
        ctx.wizard.next();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      } else if (
        ctx.message.text === ctx.i18n.t("questionnaire.not_only_myself")
      ) {
        await ctx.reply(ctx.i18n.t("questionnaire.number_of_people_prompt"), {
          parse_mode: "HTML",
          reply_markup: Markup.keyboard([
            Markup.button.text(ctx.i18n.t("go_back")),
            Markup.button.text(ctx.i18n.t("cancel")),
          ])
            .oneTime()
            .resize().reply_markup,
        });
        ;
        return ctx.wizard.next();
      }
    }
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      if (ctx.message.text === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }

      ctx.session.numberOfPeople = ctx.message.text;
    }

    await ctx.reply(ctx.i18n.t("questionnaire.not_ready_areas"), {
      parse_mode: "HTML",
      reply_markup: Markup.keyboard([Markup.button.text(ctx.i18n.t("cancel"))])
        .oneTime()
        .resize().reply_markup,
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (await handleCommand(ctx)) return;
    if (ctx.message) {
      if (ctx.message.text === ctx.i18n.t("go_back")) {
        return handleGoBack(ctx);
      }

      ctx.session.notReadyAreas = ctx.message.text;
    }
    ctx.session.selectTime = false;
    const calendar = getCalendar();
    // Ask for the start date
    await ctx.reply(ctx.i18n.t("questionnaire.start_date"), {
      parse_mode: "HTML",
      reply_markup: calendar.getCalendar().reply_markup,
    });

    return ctx.wizard.next(); // Move to the next step
  },
  async (ctx) => {
    if (await handleCommand(ctx)) return;
    ctx.session.selectTime = true;
    const calendar = getCalendar();

    // Here you might want to save the selected date to `startDate`
    if (ctx.session.startDate) {
      ctx.session.dateToMeet = ctx.session.startDate; // Save dateToMeet as the selected start date
      delete ctx.session.startDate; // Ensure startDate is cleared after using it
    }

    await ctx.reply(ctx.i18n.t("contact_recruiter_message"), {
      parse_mode: "HTML",
      reply_markup: calendar.getCalendar().reply_markup,
    });

    // You might want to leave the scene here or proceed with other steps
    return ctx.scene.leave();
  }
);

questionnaireScene.hears(match("cancel"), (ctx) => {
  ctx.session.contactProcess = false;
  ctx.reply(ctx.i18n.t("cancel"), {
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

  delete ctx.session.startDate;

  return ctx.scene.leave();
});

module.exports = questionnaireScene;
