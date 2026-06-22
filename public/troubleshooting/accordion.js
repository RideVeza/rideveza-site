// Remember which platform section(s) the visitor had open on a question-list
// page, so returning via "Back" restores the same open section instead of a
// collapsed list. Scoped per page and per browser tab (sessionStorage).
(function () {
  var groups = document.querySelectorAll("details.group[data-group]");
  if (!groups.length) return;

  var key = "ts-open:" + location.pathname;

  var saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(key) || "[]");
  } catch (e) {
    saved = [];
  }

  // Restore open state before wiring up listeners (so this doesn't re-save).
  groups.forEach(function (g) {
    if (saved.indexOf(g.getAttribute("data-group")) !== -1) g.open = true;
  });

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
