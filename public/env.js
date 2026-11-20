// https://www.jvandemo.com/how-to-use-environment-variables-to-configure-your-angular-application-without-a-rebuild/
(function (window) {
  // environment-dependent settings
  window.__env = window.__env || {};
  window.__env.version = "18.0.0";
  window.__env.apiUrl = "http://localhost:5050/api/";

  // enable thesaurus import in thesaurus list for admins
  window.__env.thesImportEnabled = true;
  // enable item metadata builders in item editor
  window.__env.hasMetadataBuilders = true;

  // taxonomy API URL
  window.__env.taxoUrl = "http://localhost:5050/api/";

  // context help for part/fragment editors (see README): URL template, or array
  // of templates in their search order (first match wins), with placeholders
  // {typeId}, {roleId}, {frRoleId}, {language}, {separator}, and optional [...] groups
  // window.__env.helpUrlTemplate = [
  //   "https://myproject.github.io/help[-{language}]/topics/{typeId}{separator}{roleId}{separator}{frRoleId}.html",
  //   "https://cadmus.github.io/help[-{language}]/topics/{typeId}{separator}{roleId}{separator}{frRoleId}.html",
  // ];
  // language for {language}: a code like "it", or "auto" for the browser language;
  // localized pages fall back to non-localized ones (default: none)
  // window.__env.helpUrlLanguage = "auto";
  // separator for {separator} (default: __)
  // window.__env.helpUrlSeparator = "__";
  // set to false to skip checking page availability (e.g. when CORS is not allowed)
  // window.__env.helpUrlCheck = true;

  window.__env.helpUrlTemplate = ["https://vedph.github.io/cadmus-help/parts/{typeId}{separator}{roleId}{separator}{frRoleId}.html"];
  window.__env.helpUrlCheck = true;
})(this);
