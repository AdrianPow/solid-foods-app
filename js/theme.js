// Which look the app uses on this phone: the phone's own setting (the
// default), or always light or always dark.
//
// index.html loads this before the page draws, so a chosen theme is there
// from the first frame. app.js imports it too, for the single-file build.
// (No imports or exports, so it runs either way.)
(function () {
  var KEY = "first-bites:theme";
  var BAR = { light: "#2f6f3a", dark: "#121611" };

  function read() {
    try {
      var saved = localStorage.getItem(KEY);
      return saved === "light" || saved === "dark" ? saved : "system";
    } catch (e) {
      return "system";
    }
  }

  function apply(theme) {
    var root = document.documentElement;
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
    else delete root.dataset.theme;
    // The browser's own bars follow the choice too.
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var own = /dark/.test(metas[i].media) ? "dark" : "light";
      metas[i].content = BAR[theme === "system" ? own : theme];
    }
  }

  function set(theme) {
    try {
      if (theme === "light" || theme === "dark") localStorage.setItem(KEY, theme);
      else localStorage.removeItem(KEY);
    } catch (e) {
      // Storage blocked: the choice lasts until the app is closed.
    }
    apply(theme);
  }

  apply(read());
  window.firstBitesTheme = { get: read, set: set };
})();
