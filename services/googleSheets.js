const { google } = require("googleapis");
const { GOOGLE_CREDENTIALS } = require("../config/config");
const fuzz = require("fuzzball");
const {language} = require("googleapis/build/src/apis/language");
const auth = new google.auth.JWT(
  GOOGLE_CREDENTIALS.client_email,
  null,
  GOOGLE_CREDENTIALS.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

const appendToSheet = async (spreadsheetId, userId, values) => {
  try {

    if (!values || !Array.isArray(values) || values.length === 0) {
      console.error(
        "Error: 'values' is undefined or empty. Cannot append data."
      );
      return;
    }

    const sheets = google.sheets({ version: "v4", auth });
    const userIndex = await checkUserIdExists(spreadsheetId, userId);

    if (userIndex >= 0) {
      const updateRange = `Кандидати!A${userIndex}:L${userIndex}`;
      const request = {
        spreadsheetId: spreadsheetId,
        range: updateRange,
        valueInputOption: "RAW",
        resource: {
          values: [values],
        },
      };

      await sheets.spreadsheets.values.update(request);
    } else {
      const request = {
        spreadsheetId: spreadsheetId,
        range: "Кандидати!A2",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [values],
        },
      };

      await sheets.spreadsheets.values.append(request);
    }
  } catch (error) {
    console.error("Error appending to Google Sheets:", error);
  }
};

const appendToSubscribersSheet = async (spreadsheetId, userId, sceneState, username, lang) => {
  try {
    const { age, gender, rate, city } = sceneState;

    if (!age || !gender || !rate || !city) {
      console.error("Error: Missing required values to append to the sheet.");
      return;
    }

    const values = [userId, username, age, gender, rate, city, lang]; // Customize this structure as needed.
    const sheets = google.sheets({ version: "v4", auth }); // Ensure `auth` is correctly configured.

    // Check if the user already exists in the sheet.
    const checkUserExists = async () => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Підписники!A:A", // Assumes user IDs are in column A.
      });

      const rows = response.data.values || [];
      return rows.findIndex((row) => row[0] === userId) + 1; // +1 because row indices in Sheets are 1-based.
    };

    const userRow = await checkUserExists();

    if (userRow > 0) {
      // Update existing user.
      const updateRange = `Підписники!A${userRow}:F${userRow}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: "RAW",
        resource: {
          values: [values],
        },
      });
      console.log(`User ${userId} updated at row ${userRow}.`);
    } else {
      // Append new user.
      const appendRange = "Підписники!A2";
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: appendRange,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [values],
        },
      });
      console.log(`User ${userId} added to the sheet.`);
    }
  } catch (error) {
    console.error("Error appending/updating Google Sheets:", error);
  }
};

const updateStartDateById = async (spreadsheetId, userId, startDate) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    const range = "Кандидати!A:L";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0]?.trim() === String(userId).trim()) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex !== -1) {
      const updateRange = `Кандидати!L${rowIndex - 1}`;
      const request = {
        spreadsheetId: spreadsheetId,
        range: updateRange,
        valueInputOption: "RAW",
        resource: {
          values: [[startDate]],
        },
      };

      await sheets.spreadsheets.values.update(request);
    } 

  } catch (error) {
    console.error("Error updating startDate in Google Sheets:", error);
  }
};

const checkUserIdExists = async (spreadsheetId, userId) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const range = "Кандидати!A:A";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];

    if (values.length === 0) {
      return -1;
    }

    const index = values.findIndex(
      (row) => row[0]?.trim() === String(userId).trim()
    );
    return index !== -1 ? index + 1 : -1;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return -1;
  }
};

const getVacancies = async (spreadsheetId, language) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    let range;
    switch (language) {
      case "en":
        range = "All Vacancies!E5:AA";
        break;
      case "ua":
        range = "Всі Вакансії!E5:AA";
        break;
      case "ru":
        range = "Все Вакансии!E5:AA";
        break;
      default:
        range = "All Vacancies!E5:AA";
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows;
  } catch (error) {
    console.error("Error fetching vacancies:", error);
    return [];
  }
};

const getVacanciesAbroad = async (spreadsheetId, language) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    let range;
    switch (language) {
      case "en":
        range = "Vacancies Abroad!E5:AA";
      case "ua":
        range = "Закордонні Вакансії!E5:AA";
        break;
      case "ru":
        range = "Заграничние Вакансии!E5:AA";
        break;
      default:
        range = "Vacancies Abroad!E5:AA";
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows;
  } catch (error) {
    console.error("Error fetching vacancies:", error);
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

const getVacanciesByCity = async (spreadsheetId, cities, language) => {
  try {
    const sheets = google.sheets({ version: "v4", auth }); // Ensure `auth` is defined

    // Determine the ranges based on the language
    let allVacanciesRange;
    let abroadVacanciesRange;

    switch (language) {
      case "en":
        allVacanciesRange = "All Vacancies!E5:AA"; // English sheet
        abroadVacanciesRange = "Vacancies Abroad!E5:AA"; // English abroad sheet
        break;
      case "ua":
        allVacanciesRange = "Всі Вакансії!E5:AA"; // Ukrainian sheet
        abroadVacanciesRange = "Закордонні Вакансії!E5:AA"; // Ukrainian abroad sheet
        break;
      case "ru":
        allVacanciesRange = "Все Вакансии!E5:AA"; // Russian sheet
        abroadVacanciesRange = "Заграничние Вакансии!E5:AA"; // Russian abroad sheet
        break;
      default:
        allVacanciesRange = "All Vacancies!E5:AA"; // Fallback to English
        abroadVacanciesRange = "Vacancies Abroad!E5:AA"; // Fallback to English abroad sheet
    }

    // Fetch All Vacancies
    const allResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: allVacanciesRange,
    });

    const allRows = allResponse.data.values || [];

    // Fetch Vacancies Abroad
    const abroadResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: abroadVacanciesRange,
    });

    const abroadRows = abroadResponse.data.values || [];

    // Combine both rows
    const combinedRows = [...allRows, ...abroadRows];

    if (combinedRows.length === 0) return [];

    const keys = [
      "title",
      "gender",
      "age",
      "city",
      "location",
      "salary",
      "valute",
      "rate",
      "valuteTwo",
      "premium",
      "addSalary",
      "studentsAddSalary",
      "schedule",
      "day",
      "night",
      "evening",
      "hoursPerDay",
      "hoursPerWeek",
      "tasks",
      "additionalOne",
      "additionalTwo",
      "additionalThree",
      "additionalFour",
    ];

    const dataObjects = combinedRows.map((row) => {
      const obj = {};
      keys.forEach((key, index) => (obj[key] = row[index] || ""));
      return obj;
    });

    const normalizedDataCities = dataObjects.map((vacancy) => ({
      ...vacancy,
      normalizedCity: normalizeCityName(vacancy.city),
    }));

    const results = cities.flatMap((city) => {
      const normalizedCity = normalizeCityName(city);

      return normalizedDataCities.filter((vacancy) => {
        const normalizedVacancyCity = vacancy.normalizedCity;

        // Matching logic
        return (
          // Exact match
          normalizedVacancyCity === normalizedCity ||
          // Check if the first three letters match
          normalizedVacancyCity.slice(0, 3) === normalizedCity.slice(0, 3) ||
          // Check if the normalized city name is part of the vacancy's city name
          normalizedVacancyCity.includes(normalizedCity) ||
          normalizedCity.includes(normalizedVacancyCity) ||
          // Check if the first three letters are the same
          normalizedVacancyCity.startsWith(normalizedCity.slice(0, 3)) ||
          normalizedCity.startsWith(normalizedVacancyCity.slice(0, 3))
        );
      });
    });

    return [...new Set(results)]; // Remove duplicates
  } catch (error) {
    console.error("Error fetching vacancies by city:", error);
    return [];
  }
};

const getVacanciesByJobOfferings = async (
  spreadsheetId,
  workHours,
  workingDays,
  shiftOption,
  language
) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Determine ranges based on the language
    let allVacanciesRange;
    let abroadVacanciesRange;

    switch (language) {
      case "en":
        allVacanciesRange = "All Vacancies!E5:AA"; // English sheet
        abroadVacanciesRange = "Vacancies Abroad!E5:AA"; // English abroad sheet
        break;
      case "ua":
        allVacanciesRange = "Всі Вакансії!E5:AA"; // Ukrainian sheet
        abroadVacanciesRange = "Закордонні Вакансії!E5:AA"; // Ukrainian abroad sheet
        break;
      case "ru":
        allVacanciesRange = "Все Вакансии!E5:AA"; // Russian sheet
        abroadVacanciesRange = "Заграничние Вакансии!E5:AA"; // Russian abroad sheet
        break;
      default:
        allVacanciesRange = "All Vacancies!E5:AA"; // Fallback to English
        abroadVacanciesRange = "Vacancies Abroad!E5:AA"; // Fallback to English abroad sheet
    }

    // Fetch All Vacancies
    const allResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: allVacanciesRange,
    });

    const allRows = allResponse.data.values || [];

    // Fetch Vacancies Abroad
    const abroadResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: abroadVacanciesRange,
    });

    const abroadRows = abroadResponse.data.values || [];

    // Combine both rows
    const combinedRows = [...allRows, ...abroadRows];

    if (combinedRows.length === 0) return [];

    const keys = [
      "title",
      "gender",
      "age",
      "city",
      "location",
      "salary",
      "valute",
      "rate",
      "valuteTwo",
      "premium",
      "addSalary",
      "studentsAddSalary",
      "schedule",
      "day",
      "night",
      "evening",
      "hoursPerDay",
      "hoursPerWeek",
      "tasks",
      "additionalOne",
      "additionalTwo",
      "additionalThree",
      "additionalFour",
    ];

    const dataObjects = combinedRows.map((row) => {
      const obj = {};
      keys.forEach((key, index) => (obj[key] = row[index] || ""));
      return obj;
    });

    const parseRange = (range) => {
      if (!range) return null;
      const parts = range.split("-").map((part) => parseInt(part.trim(), 10));
      return parts.length === 2 ? parts : [parts[0], parts[0]]; // Handle single values
    };

    const isWithinRange = (value, range) => {
      if (!range) return false;
      const [min, max] = range;
      return value >= min && value <= max;
    };

 

    const filteredResults = dataObjects.filter((vacancy) => {
      const workHoursRange = parseRange(vacancy.hoursPerDay);
      const workingDaysRange = parseRange(vacancy.schedule);

      const matchesWorkHours = isWithinRange(
        parseInt(workHours, 10),
        workHoursRange
      );

      const matchesWorkingDays = isWithinRange(
        parseInt(workingDays, 10),
        workingDaysRange
      );

      const matchesShiftOption =
        shiftOption === "shift_any" ||
        (shiftOption === "shift_day" && vacancy.day.trim() === "y") ||
        (shiftOption === "shift_night" && vacancy.night.trim() === "y") ||
        (shiftOption === "shift_evening" && vacancy.evening.trim() === "y");



      return matchesWorkHours && matchesWorkingDays && matchesShiftOption;
    });


    return [...new Set(filteredResults)];
  } catch (error) {
    console.error("Error fetching vacancies by job offerings:", error);
    return [];
  }
};

const getVacanciesByGenderAndAge = async (
  spreadsheetId,
  gender,
  ages,
  language
) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Determine ranges based on the language
    let allVacanciesRange;
    let abroadVacanciesRange;

    switch (language) {
      case "en":
        allVacanciesRange = "All Vacancies!E5:AA"; // English sheet
        abroadVacanciesRange = "Vacancies Abroad!E5:AA"; // English abroad sheet
        break;
      case "ua":
        allVacanciesRange = "Всі Вакансії!E5:AA"; // Ukrainian sheet
        abroadVacanciesRange = "Закордонні Вакансії!E5:AA"; // Ukrainian abroad sheet
        break;
      case "ru":
        allVacanciesRange = "Все Вакансии!E5:AA"; // Russian sheet
        abroadVacanciesRange = "Заграничние Вакансии!E5:AA"; // Russian abroad sheet
        break;
      default:
      
        allVacanciesRange = "All Vacancies!E5:AA"; // Fallback to English
        abroadVacanciesRange = "Vacancies Abroad!E5:AA"; // Fallback to English abroad sheet
    }

    // Fetch All Vacancies
    const allResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: allVacanciesRange,
    });

    const allRows = allResponse.data.values || [];

    // Fetch Vacancies Abroad
    const abroadResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: abroadVacanciesRange,
    });

    const abroadRows = abroadResponse.data.values || [];

    // Combine both rows
    const combinedRows = [...allRows, ...abroadRows];

    if (combinedRows.length === 0) return [];

    const keys = [
      "title",
      "gender",
      "age",
      "city",
      "location",
      "salary",
      "valute",
      "rate",
      "valuteTwo",
      "premium",
      "addSalary",
      "studentsAddSalary",
      "schedule",
      "day",
      "night",
      "evening",
      "hoursPerDay",
      "hoursPerWeek",
      "tasks",
      "additionalOne",
      "additionalTwo",
      "additionalThree",
      "additionalFour",
    ];
    const dataObjects = combinedRows.map((row) => {
      const obj = {};
      keys.forEach((key, index) => (obj[key] = row[index] || ""));
      return obj;
    });

    const parseRange = (range) => {
      if (!range) return null;
      const parts = range.split("-").map((part) => parseInt(part.trim(), 10));
      return parts.length === 2 ? parts : [parts[0], parts[0]]; // Handle single values
    };

    const isWithinRange = (value, range) => {
      if (!range) return false;
      const [min, max] = range;
      return value >= min && value <= max;
    };


    const filteredResults = dataObjects.filter((vacancy) => {
      const ageRange = parseRange(vacancy.age);

      // Check if at least one of the ages matches the age range of the vacancy
      const matchesAge = ages.some((age) =>
        isWithinRange(parseInt(age, 10), ageRange)
      );

      const normalizeGender = (g) => g.replace(/\s+/g, "").toLowerCase();
      const normalizedGender = normalizeGender(vacancy.gender);
      const normalizedInputGender = normalizeGender(gender);

      const genderOptions = normalizedGender.split(",").map(normalizeGender);
      const matchesGender = (() => {
        const male = language === "ua" ? "ч" : language === "ru" ? "м" : "m";
        const female = language === "ua" ? "ж" : language === "ru" ? "ж" : "f";
        const couple =
          language === "ua" ? "пари" : language === "ru" ? "пары" : "couples";

        if (normalizedInputGender === male) {
          return (
            genderOptions.includes(male) ||
            genderOptions.includes(`${male}/${female}`)
          );
        }
        if (normalizedInputGender === female) {
          return (
            genderOptions.includes(female) ||
            genderOptions.includes(`${male}/${female}`)
          );
        }
        if (normalizedInputGender === couple) {
          return genderOptions.includes(couple);
        }
        return false;
      })();

      const incompatibleGenderOptions = ["м/ж", "пары"];
      const isIncompatible = incompatibleGenderOptions.some(
        (option) => genderOptions.includes(option) && !matchesGender
      );



      return matchesAge && matchesGender && !isIncompatible;
    });


    return [...new Set(filteredResults)];
  } catch (error) {
    console.error("Error fetching vacancies by gender and age:", error);
    return [];
  }
};

const notifySubscribers = async (bot, SHEET_ID) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const subscribersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Підписники",
    });

    const subscribers = subscribersResponse.data.values;

    const vacanciesTables = {
      en: "All Vacancies",
      ua: "Всі вакансії",
      ru: "Все вакансии",
    };

    const vacancyMessages = {
      en: {
        title: "🌟 *Vacancies Available* 🌟",
        location: "📍 Location",
        rate: "💰 Rate",
        footer: "📩 Apply now and grab the opportunity!",
      },
      ua: {
        title: "🌟 *Доступні вакансії* 🌟",
        location: "📍 Локація",
        rate: "💰 Ставка",
        footer: "📩 Подайте заявку зараз та скористайтеся можливістю!",
      },
      ru: {
        title: "🌟 *Доступные вакансии* 🌟",
        location: "📍 Локация",
        rate: "💰 Оплата",
        footer: "📩 Подайте заявку прямо сейчас и воспользуйтесь шансом!",
      },
    };

    for (const [index, subscriber] of subscribers.slice(1).entries()) {
      const [userId, username, age, gender, rate, town, language, sentVacancyIds] = subscriber;

      const vacanciesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: vacanciesTables[language],
      });

      const vacancies = vacanciesResponse.data.values;
      if (!vacancies || vacancies.length <= 1) {
        console.log(`No vacancies found for user ${userId}`);
        continue;
      }

      const sentVacancyIdsArray = sentVacancyIds?.trim()
          ? sentVacancyIds.split(",").map((id) => id.trim())
          : [];

      const relevantVacancies = vacancies.slice(1).filter((vacancy) => {
        const [
          ,
          vacancyId,
          ,
          ,
          ,
          vacancyGender,
          vacancyAgeRange,
          vacancyTown,
          ,
          ,
          ,
          vacancyRate,
        ] = vacancy;

        const [minAge, maxAge] = vacancyAgeRange.split("-").map(Number);
        const townMatch = fuzz.ratio(town.toLowerCase(), vacancyTown.toLowerCase()) > 80;

        const validGender = vacancyGender.includes(gender);
        const validRate = parseFloat(rate.replace(",", ".")) <= parseFloat(vacancyRate.replace(",", "."));
        const validAge =
            (isNaN(minAge) || Number(age) >= minAge) &&
            (isNaN(maxAge) || Number(age) <= maxAge);

        return (
            validGender &&
            validAge &&
            validRate &&
            townMatch &&
            !sentVacancyIdsArray.includes(vacancyId.trim())
        );
      });

      if (relevantVacancies.length > 0) {
        const messages = relevantVacancies.map((vacancy, idx) => {
          const [
            ,
            vacancyId,
            ,
            vacancyTitle,
            ,
            ,
            ,
            vacancyLocation,
            ,
            ,
            ,
            vacancyRate,
          ] = vacancy;

          return {
            id: vacancyId,
            index: idx,
            message: `📝 *${vacancyTitle}*\n${vacancyMessages[language].location}: ${vacancyLocation}\n${vacancyMessages[language].rate}: ${vacancyRate} zł/hour\n\n`,
          };
        });

        const inlineKeyboard = [];
        for (let i = 0; i < messages.length; i += 2) {
          inlineKeyboard.push(
              messages.slice(i, i + 2).map(({ index }) => ({
                text: language == "ua" ? "Подати заявку " + (index + 1) : language == "ru" ? "Подать заявку " + (index + 1) : "Apply for " + (index + 1),
                callback_data: `apply_${index}`, // Pass vacancy index in callback data
              }))
          );
        }

        const consolidatedMessage = `${vacancyMessages[language].title}\n\n` +
            messages.map(({ message }) => message).join("\n") +
            `\n${vacancyMessages[language].footer}`;

        console.log(`Sending consolidated message to user ${userId}`);
        await bot.telegram.sendMessage(userId, consolidatedMessage, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: inlineKeyboard },
        });

        const newSentVacancyIds = [
          ...sentVacancyIdsArray,
          ...messages.map(({ id }) => id.trim()),
        ].join(",");

        const updateRange = `Підписники!H${index + 2}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: updateRange,
          valueInputOption: "RAW",
          resource: { values: [[newSentVacancyIds]] },
        });
      }
    }

    // Handle callback queries to apply for a vacancy
    bot.on("callback_query", async (ctx) => {
      try {
        const action = ctx.callbackQuery.data;
        if (action.startsWith("apply_")) {
          const vacancyIndex = parseInt(action.split("_")[1], 10);

          // Fetch the vacancies again from Google Sheets or your data source
          const vacanciesTables = {
            en: "All Vacancies",
            ua: "Всі вакансії",
            ru: "Все вакансии",
          };

          const language = ctx.session.language || 'en'; // Assuming you store the user's language in session

          // Re-fetch vacancies from Google Sheets based on the user's language
          const vacanciesResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: vacanciesTables[language],
          });

          const vacancies = vacanciesResponse.data.values;

          if (!vacancies || vacancies.length <= 1) {
            console.log("No vacancies found!");
            await ctx.answerCbQuery("No vacancies available. Please try again later.", { show_alert: true });
            return;
          }

          // Ensure that the index exists in the vacancies list
          ctx.session.selectedVacancy = vacancies[vacancyIndex + 4];
          console.log( ctx.session.selectedVacancy)// +1 because the first row is headers
          // Pass the selected vacancy directly to the next scene
          await ctx.answerCbQuery(); // Acknowledge the callback query
          ctx.scene.enter("applyScene"); // Pass selected vacancy data to the scene
        }
      } catch (error) {
        console.error("Error handling callback query:", error);
        await ctx.answerCbQuery("An error occurred. Please try again later.", { show_alert: true });
      }
    });

  } catch (error) {
    console.error("Error notifying subscribers:", error);
  }
};

const getDataFromSubscriber = async (userID) => {
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Fetch data from the spreadsheet
    const subscriberResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Підписники",  // Make sure this range matches the sheet and the data you're working with
    });

    // Get all rows from the sheet
    const rows = subscriberResponse.data.values;

    if (rows.length) {
      // Iterate through rows to find the user by userID (first column)
      const userRow = rows.find(row => row[0] === userID);

      if (userRow) {
        // Return user data as an object with specific keys
        return {
          userID: userRow[0],
          nickname: userRow[1], // Second column (Nickname)
          age: userRow[2], // Third column (Age)
          gender: userRow[3], // Fourth column (Gender)
          rate: userRow[4], // Fifth column (Rate)
          town: userRow[5], // Sixth column (Town)
        };
      } else {
        // Handle the case where the user is not found
        console.log('User not found');
        return null;
      }
    } else {
      console.log('No data found in the sheet');
      return null;
    }
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    return null;
  }
};





module.exports = {
  appendToSheet,
  appendToSubscribersSheet,
  checkUserIdExists,
  getVacancies,
  getVacanciesAbroad,
  updateStartDateById,
  getVacanciesByCity,
  getVacanciesByJobOfferings,
  getVacanciesByGenderAndAge,
  notifySubscribers,
  getDataFromSubscriber
};
