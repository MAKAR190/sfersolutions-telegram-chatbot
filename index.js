const { Telegraf, Scenes } = require("telegraf");
const TelegrafI18n = require("telegraf-i18n");
const { match } = require("telegraf-i18n");
const session = require("./middlewares/session");
const wizardScene = require("./scenes/base");
const changeLanguageScene = require("./scenes/change_language");
const questionnaireScene = require("./scenes/contact_recruiter");
const submitScene = require("./scenes/submit_application");
const viewAllJobsScene = require("./scenes/view_all_jobs");
const selectJobScene = require("./scenes/select_job");
const { TELEGRAM_TOKEN } = require("./config/config");
const { initializeCalendar } = require("./calendar");

const i18n = new TelegrafI18n({
  defaultLanguage: "en",
  directory: "./locales",
  useSession: true,
});

const bot = new Telegraf(TELEGRAM_TOKEN);
bot.use(session);
bot.use(i18n.middleware());

const stage = new Scenes.Stage([
  wizardScene,
  changeLanguageScene,
  questionnaireScene,
  submitScene,
  selectJobScene,
  viewAllJobsScene,
]);

bot.use(stage.middleware());
initializeCalendar(bot);

bot.start((ctx) => ctx.scene.enter("startScene"));
bot.hears(match("main_menu.change_language"), (ctx) =>
  ctx.scene.enter("changeLanguage")
);
bot.hears(match("main_menu.contact_recruiter"), (ctx) =>
  ctx.scene.enter("contact_recruiter_scene")
);
bot.hears(match("main_menu.submit_application"), (ctx) =>
  ctx.scene.enter("submit_application_scene")
);
bot.hears(match("main_menu.select_job"), (ctx) =>
  ctx.scene.enter("select_job_scene")
);
bot.hears(match("main_menu.view_all_jobs"), (ctx) =>
  ctx.scene.enter("view_all_jobs_scene")
);

bot.command("change_language", (ctx) => ctx.scene.enter("changeLanguage"));
bot.command("restart", (ctx) => {
  ctx.session = {};
  ctx.scene.enter("startScene");
});
bot.command("help", (ctx) =>
  ctx.reply(ctx.i18n.t("available_commands"), { parse_mode: "HTML" })
);
bot.command("contact_recruiter", (ctx) =>
  ctx.scene.enter("contact_recruiter_scene")
);
bot.command("submit_application", (ctx) =>
  ctx.scene.enter("submit_application_scene")
);
bot.command("view_all_job_listings", (ctx) =>
  ctx.scene.enter("view_all_jobs_scene")
);
bot.command("select_job", (ctx) => ctx.scene.enter("select_job_scene"));

bot
  .launch()
  .then(() => console.log("Bot is running"))
  .catch((err) => console.error("Failed to launch bot:", err));
