const { google } = require("googleapis");
const { GOOGLE_CREDENTIALS } = require("../config/config");

const auth = new google.auth.JWT(
  GOOGLE_CREDENTIALS.client_email,
  null,
  GOOGLE_CREDENTIALS.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

const appendToSheet = async (spreadsheetId, userId, values) => {
  try {
    console.log("Attempting to save the following values:", values);

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
      console.log(
        `Updated data for user ${userId} in row ${userIndex + 1}:`,
        values
      );
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
      console.log(`Data saved to sheet ${spreadsheetId}:`, values);
    }
  } catch (error) {
    console.error("Error appending to Google Sheets:", error);
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
      console.log(
        `Updated startDate for user ${userId} to ${startDate} in row ${rowIndex}`
      );
    } else {
      console.log(`User ID ${userId} not found.`);
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
        console.log("Unsupported language. Defaulting to English.");
        range = "All Vacancies!E5:AA";
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No vacancies found.");
      return [];
    }
    console.log(rows);

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
        console.log("Unsupported language. Defaulting to English.");
        range = "Vacancies Abroad!E5:AA";
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No vacancies found.");
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
        console.log("Unsupported language. Defaulting to English.");
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
        console.log("Unsupported language. Defaulting to English.");
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

    console.log("Searching for:", {
      workHours: parseInt(workHours, 10),
      workingDays: parseInt(workingDays, 10),
      shiftOption,
    });

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

      console.log("Checking vacancy:", vacancy, {
        matchesWorkHours,
        matchesWorkingDays,
        matchesShiftOption,
      });

      return matchesWorkHours && matchesWorkingDays && matchesShiftOption;
    });

    console.log("Filtered Results:", filteredResults);

    return [...new Set(filteredResults)];
  } catch (error) {
    console.error("Error fetching vacancies by job offerings:", error);
    return [];
  }
};
const getVacanciesByGenderAndAge = async (
  spreadsheetId,
  gender,
  ages, // Now accepts an array of ages
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
        console.log("Unsupported language. Defaulting to English.");
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

    console.log("Searching for:", { gender, ages });

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

      console.log("Checking vacancy:", vacancy, {
        matchesAge,
        matchesGender,
        isIncompatible,
      });

      return matchesAge && matchesGender && !isIncompatible;
    });

    console.log("Filtered Results:", filteredResults);

    return [...new Set(filteredResults)];
  } catch (error) {
    console.error("Error fetching vacancies by gender and age:", error);
    return [];
  }
};
module.exports = {
  appendToSheet,
  checkUserIdExists,
  getVacancies,
  getVacanciesAbroad,
  updateStartDateById,
  getVacanciesByCity,
  getVacanciesByJobOfferings,
  getVacanciesByGenderAndAge,
};
