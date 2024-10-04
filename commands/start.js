const startCommand = (ctx) => {
  ctx.reply("Welcome! Choose your desirable language:", {
    reply_markup: {
      keyboard: [
        [{ text: "English" }, { text: "Русский" }, { text: "Українська" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
};

module.exports = startCommand;
