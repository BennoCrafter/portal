/**
 * Entry point: loads config.json, renders the portal and keeps it in sync
 * with the file (polling + reload when the tab becomes visible again).
 */
import { fetchConfigText } from "./config.js";
import { installIconFallback } from "./icons.js";
import { renderError, renderPortal } from "./portal.js";

const RELOAD_INTERVAL_MS = 15_000;

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

installIconFallback();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) reload();
});
setInterval(() => {
  if (!document.hidden) reload();
}, RELOAD_INTERVAL_MS);

reload();
