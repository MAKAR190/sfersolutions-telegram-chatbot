const { Markup } = require("telegraf");

const languageKeyboard = Markup.keyboard([
  [Markup.button.text("🇬🇧 English")],
  [Markup.button.text("🇺🇦 Українська")],
  [Markup.button.text("Русский")],
])
  .resize()
  .oneTime();

bot.use((ctx, next) => {
    if (ctx.updateType === "message") {
        const messageText = ctx.message.text;

        // Check if the message is a command or button press from the main menu
        const mainMenuCommands = [
            ctx.i18n.t("main_menu.select_job"),
            ctx.i18n.t("main_menu.view_all_jobs"),
            ctx.i18n.t("main_menu.contact_recruiter"),
            ctx.i18n.t("main_menu.submit_application"),
            ctx.i18n.t("main_menu.subscribe"),
            ctx.i18n.t("main_menu.change_language")
        ];

        // If the message is a button press from the main menu
        if (mainMenuCommands.includes(messageText)) {
            // You can add specific logic based on the button clicked
            if (messageText === ctx.i18n.t("main_menu.select_job")) {
                // Handle "Select Job" button press
            } else if (messageText === ctx.i18n.t("main_menu.view_all_jobs")) {
                // Handle "View All Jobs" button press
            }
            // Add more checks for other buttons here
        }
        // If it's a normal text message (not a command or main menu button)
        else if (ctx.message.text && !ctx.message.text.startsWith("/")) {
            ctx.reply(ctx.i18n.t("recruiter_will_contact_soon"), {
                reply_to_message_id: ctx.message.message_id,
            });
        }
    }
    return next();
});


const backKeyboard = (ctx) =>
  Markup.keyboard([
    Markup.button.text(ctx.i18n.t("go_back")),
    Markup.button.text(ctx.i18n.t("cancel")),
  ])
    .oneTime()
    .resize();
module.exports = {
  languageKeyboard,
  mainKeyboard,
  backKeyboard,
};
