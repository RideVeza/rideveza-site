// Remember which platform section(s) the visitor had open on a question-list
// page, so returning from a "Show me how" detail page restores the same open
// section instead of a collapsed list. A fresh entry from the index page (or a
// direct/refresh visit) always starts collapsed. Scoped per page and per
// browser tab (sessionStorage).
(function () {
  var groups = document.querySelectorAll("details.group[data-group]");
  if (!groups.length) return;

  var key = "ts-open:" + location.pathname;

  // Only restore when we arrived from a level-2 detail page (e.g.
  // gmail-login.html). Coming from index.html — or a direct/refresh visit —
  // should show a collapsed list. (The browser Back button restores open
  // sections on its own via the bfcache, without re-running this script.)
  var m = (document.referrer || "").match(/\/help\/mobile\/([a-z0-9-]+)\.html/i);
  var refPage = m ? m[1] : "";
  var fromDetail = refPage && ["index", "passkeys", "download-app"].indexOf(refPage) === -1;

  // Restore (or clear) open state before wiring up listeners so this doesn't re-save.
  if (fromDetail) {
    var saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(key) || "[]");
    } catch (e) {
      saved = [];
    }
    groups.forEach(function (g) {
      if (saved.indexOf(g.getAttribute("data-group")) !== -1) g.open = true;
    });
  } else {
    groups.forEach(function (g) {
      g.open = false;
    });
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  }

  function save() {
    var open = [];
    groups.forEach(function (g) {
      if (g.open) open.push(g.getAttribute("data-group"));
    });
    try {
      sessionStorage.setItem(key, JSON.stringify(open));
    } catch (e) {}
  }

  groups.forEach(function (g) {
    g.addEventListener("toggle", save);
  });
})();
