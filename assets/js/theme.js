/* Runs synchronously in <head>, before first paint, so a dark mode visitor
   never sees a flash of the light theme. Kept in its own file rather than
   inline so a strict script-src 'self' policy still allows it. */
(function () {
  var KEY = "es-theme";
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  var theme = saved || system;
  document.documentElement.setAttribute("data-theme", theme);
  window.__esTheme = { key: KEY, saved: saved, current: theme };
})();
