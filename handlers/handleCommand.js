const handleCommand = async (ctx) => {
  const text = ctx.message && ctx.message.text;
  if (!text) return false; // Proceed with next middleware if no text message

  switch (text) {
    case "/start":
      ctx.scene.enter("startScene");
      return true;
    case "/change_language":
      ctx.scene.enter("changeLanguage");
      return true;
    case "/restart":
      ctx.session = {};
      ctx.scene.enter("startScene");
      return true;
    case "/help":
      ctx.reply(ctx.i18n.t("available_commands"), { parse_mode: "HTML" });
      return true;
    case "/contact_recruiter":
      ctx.scene.enter("contact_recruiter_scene");
      return true;
    case "/submit_application":
      ctx.scene.enter("submit_application_scene");
      return true;
    case "/view_all_job_listings":
      ctx.scene.enter("view_all_jobs_scene");
      return true;
    case "/select_job":
      ctx.scene.enter("select_job_scene");
      return true;
    default:
      return false; // Return false if no command matched
  }
};
module.exports = handleCommand;
