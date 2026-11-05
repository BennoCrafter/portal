/**
 * Status page: shows the server-side reachability check from /api/status
 * and refreshes it periodically while the tab is visible.
 */
import { $, escapeHtml } from "./util.js";

const STATUS_URL = "api/status";
const REFRESH_INTERVAL_MS = 15_000;

async function refresh() {
  try {
    const response = await fetch(STATUS_URL, { cache: "no-store" });
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || `HTTP ${response.status}`);
    render(report);
  } catch (error) {
    $("#summary").textContent = "Status unavailable";
    $("#services").innerHTML = `<p class="message error">${escapeHtml(error.message)}</p>`;
  }
}

function render({ checkedAt, summary, services }) {
  const time = new Date(checkedAt).toLocaleTimeString();
  $("#summary").textContent = `${summary.up} of ${summary.total} up · checked ${time}`;
  $("#services").innerHTML = services.length
    ? `<div class="service-list">${services.map(serviceHtml).join("")}</div>`
    : `<p class="message">No services yet. Add some in config.json.</p>`;
}

function serviceHtml(service) {
  const detail =
    service.status === "up"
      ? `HTTP ${service.httpStatus} · ${service.latencyMs} ms`
      : service.error || "Not reachable";
  const group = service.group ? `<span class="status-group">${escapeHtml(service.group)}</span>` : "";

  return `
    <a class="service" href="${escapeHtml(service.url)}">
      <span class="status-dot ${service.status}"></span>
      <div class="service-text">
        <div class="service-name">${escapeHtml(service.name)} ${group}</div>
        <div class="service-desc">${escapeHtml(service.url)}</div>
      </div>
      <span class="service-address status-detail ${service.status}">${escapeHtml(detail)}</span>
    </a>`;
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refresh();
});
setInterval(() => {
  if (!document.hidden) refresh();
}, REFRESH_INTERVAL_MS);

refresh();
