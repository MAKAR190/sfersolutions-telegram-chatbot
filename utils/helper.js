const getUserLanguage = (ctx, defaultLang = "English") => {
  return ctx.session?.language || defaultLang;
};

module.exports = { getUserLanguage };
