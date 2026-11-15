/**
 * Update button and auto-update toggle for services with an `app` field.
 * The server only records requests; the host's `srv` does the actual update
 * and writes the result back, which we poll for while an update runs.
 */

const UPDATES_URL = "api/updates";
const POLL_INTERVAL_MS = 3000;

let state = { status: {}, auto: [] };
// app -> status.at seen when the update was requested; done once a newer, finished result appears
const pending = new Map();
let pollTimer = null;

export function updateControlsHtml() {
  return `
    <div class="update-controls">
      <button type="button" class="update-button">Update</button>
      <label class="auto-toggle" title="Update automatically every night">
        <input type="checkbox" class="auto-input"> Auto
      </label>
      <span class="update-state"></span>
    </div>`;
}

export async function refreshUpdates() {
  try {
    const response = await fetch(UPDATES_URL, { cache: "no-store" });
    if (response.ok) state = await response.json();
  } catch (error) {
    console.warn("Could not load update status:", error);
  }
  applyUpdateState();
}

export function applyUpdateState() {
  let running = false;
  for (const item of document.querySelectorAll(".service[data-app]")) {
    const app = item.dataset.app;
    const status = state.status[app];
    if (pending.has(app) && status && status.at > pending.get(app) && status.state !== "running") pending.delete(app);
    const busy = pending.has(app) || status?.state === "running";
    running ||= busy;

    const button = item.querySelector(".update-button");
    button.disabled = busy;
    button.textContent = busy ? "Updating…" : "Update";
    item.querySelector(".auto-input").checked = state.auto.includes(app);

    const label = item.querySelector(".update-state");
    label.textContent = busy || !status ? "" : `${status.state === "failed" ? "Failed" : "Updated"} ${timeAgo(status.at)}`;
    label.classList.toggle("failed", status?.state === "failed");
  }
  clearTimeout(pollTimer);
  if (running) pollTimer = setTimeout(refreshUpdates, POLL_INTERVAL_MS);
}

export function installUpdateControls() {
  document.addEventListener("click", async ({ target }) => {
    if (!target.classList.contains("update-button")) return;
    const app = target.closest(".service").dataset.app;
    pending.set(app, state.status[app]?.at ?? 0);
    applyUpdateState();
    if (!(await post(`api/update/${encodeURIComponent(app)}`))) pending.delete(app);
    refreshUpdates();
  });
  document.addEventListener("change", async ({ target }) => {
    if (!target.classList.contains("auto-input")) return;
    const app = target.closest(".service").dataset.app;
    await post(`api/autoupdate/${encodeURIComponent(app)}`, { enabled: target.checked });
    refreshUpdates();
  });
}

async function post(url, body = {}) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Portal": "1" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function timeAgo(seconds) {
  const diff = Math.round(seconds - Date.now() / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of [["day", 86400], ["hour", 3600], ["minute", 60]]) {
    if (Math.abs(diff) >= size) return format.format(Math.round(diff / size), unit);
  }
  return "just now";
}
