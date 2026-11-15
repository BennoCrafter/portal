/**
 * Entry point: loads config.json, renders the portal and keeps it in sync
 * with the file (polling + reload when the tab becomes visible again).
 */
import { fetchConfigText } from "./config.js";
import { installIconFallback } from "./icons.js";
import { renderError, renderPortal } from "./portal.js";
import { installUpdateControls, refreshUpdates } from "./updates.js";

const RELOAD_INTERVAL_MS = 15_000;
const VIEW_KEY = "portal.view";

let config = null;
let lastConfigText = "";

async function reload() {
  try {
    const text = await fetchConfigText();
    if (text === lastConfigText) return;
    config = JSON.parse(text);
    lastConfigText = text;
    renderPortal(config);
  } catch (error) {
    // Keep showing the last good config if a later reload fails (e.g. file mid-edit).
    if (config) console.warn("Config reload failed, keeping last good version:", error);
    else renderError(error.message);
  }
}

/** Grid or list layout, remembered per browser (storage can be unavailable, e.g. private windows). */
function setView(view) {
  document.body.dataset.view = view;
  for (const button of document.querySelectorAll("[data-view]:is(button)")) {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  }
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {}
}

function savedView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

installIconFallback();
installUpdateControls();
setView(savedView());
document.querySelector(".view-toggle").addEventListener("click", ({ target }) => {
  if (target.dataset.view) setView(target.dataset.view);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) reload().then(refreshUpdates);
});
setInterval(() => {
  if (!document.hidden) reload().then(refreshUpdates);
}, RELOAD_INTERVAL_MS);

reload().then(refreshUpdates);
