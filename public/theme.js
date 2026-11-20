/* yumm lab · theme: pick light/dark before first paint so the page never flashes the wrong one.
 * Loaded as a blocking file in <head> because the CSP forbids inline scripts.
 * A saved choice wins; otherwise follow the system. main.js owns the toggle after load. */
(() => {
  "use strict";
  let saved = null;
  try { saved = window.localStorage.getItem("yumm-theme"); } catch { /* storage blocked */ }
  const dark = saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();
