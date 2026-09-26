// https://www.jvandemo.com/how-to-use-environment-variables-to-configure-your-angular-application-without-a-rebuild/
(function (window) {
  window.__env = window.__env || {};

  // environment-dependent settings
  window.__env.apiUrl = "http://localhost:5050/api/";
  window.__env.taxoUrl = "http://localhost:5050/api/";
  window.__env.version = '18.0.0';
  // enable thesaurus import in thesaurus list for admins
  window.__env.thesImportEnabled = true;
  // enable item metadata builders in item editor
  window.__env.hasMetadataBuilders = true;
  // context help for part/fragment editors: URL template with placeholders
  // {typeId}, {roleId}, {frRoleId}, {separator}, and optional [...] groups
  // window.__env.helpUrlTemplate =
  //   "https://www.mysite.com/help/topics/{typeId}{separator}{roleId}{separator}{frRoleId}.html";
  // separator for {separator} (default: __)
  // window.__env.helpUrlSeparator = "__";
  // set to false to skip checking page availability (e.g. when CORS is not allowed)
  // window.__env.helpUrlCheck = true;
})(this);
