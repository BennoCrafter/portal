/** Renders the read-only service list. */
import { serviceIconHtml } from "./icons.js";
import { $, escapeHtml } from "./util.js";

const STATUS_TIMEOUT_MS = 4000;

export function renderPortal(config) {
  const title = config.title || "Portal";
  document.title = title;
  $("#title").textContent = title;
  $("#subtitle").textContent = config.subtitle || "";
  renderTitleImage(config.titleImage, config.titleImageSize, title);

  const visible = (config.services || []).filter((service) => !service.hidden);
  const container = $("#services");

  container.innerHTML = visible.length
    ? groupServices(visible).map(groupHtml).join("")
    : `<p class="message">No services yet. Add some in config.json.</p>`;

  if (config.statusCheck !== false) checkReachability(container);
}

/**
 * Optional image above the title. Accepts the same values as a service icon, but is never guessed.
 * `size` is its height: a number means pixels, a string any CSS length ("8rem", "20vh").
 */
function renderTitleImage(titleImage, size, title) {
  const box = $("#title-image");
  const value = String(titleImage ?? "").trim();
  box.hidden = !value;
  box.innerHTML = value ? serviceIconHtml({ icon: value, name: title }) : "";

  const length = typeof size === "number" ? `${size}px` : String(size ?? "").trim();
  if (length && CSS.supports("height", length)) box.style.setProperty("--title-image-size", length);
  else box.style.removeProperty("--title-image-size");
}

export function renderError(message) {
  $("#services").innerHTML = `<p class="message error">${escapeHtml(message)}</p>`;
}

/**
 * Grouping is optional: services without a `group` end up in an unnamed group,
 * which is rendered without a heading. Groups keep the order of first appearance.
 */
function groupServices(services) {
  const groups = new Map();
  for (const service of services) {
    const name = service.group || "";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(service);
  }
  return [...groups].map(([name, items]) => ({ name, items }));
}

function groupHtml({ name, items }) {
  const heading = name ? `<h2 class="group-title">${escapeHtml(name)}</h2>` : "";
  return `
    <section class="group">
      ${heading}
      <div class="service-list">${items.map(serviceHtml).join("")}</div>
    </section>`;
}

function serviceHtml(service) {
  const url = serviceUrl(service);
  const target = service.newTab ? ` target="_blank" rel="noopener"` : "";
  const description = service.desc ? `<div class="service-desc">${escapeHtml(service.desc)}</div>` : "";

  return `
    <a class="service" href="${escapeHtml(url)}"${target}>
      <div class="icon">${serviceIconHtml(service)}</div>
      <div class="service-text">
        <div class="service-name">${escapeHtml(service.name)}</div>
        ${description}
      </div>
      <span class="service-address">${escapeHtml(addressLabel(service, url))}</span>
      <span class="status-dot" title="Checking…"></span>
    </a>`;
}

/** `url` wins; otherwise build one from port/path on the host the portal itself was opened with. */
export function serviceUrl(service) {
  if (service.url) return service.url;
  const protocol = service.protocol || location.protocol.replace(":", "");
  const host = service.host || location.hostname;
  const port = service.port ? `:${service.port}` : "";
  return `${protocol}://${host}${port}${service.path || "/"}`;
}

/** Short label on the right: ":8001/path" for port-based services, the host for full URLs. */
function addressLabel(service, url) {
  if (service.port) {
    const path = service.path && service.path !== "/" ? service.path : "";
    return `:${service.port}${path}`;
  }
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/**
 * Best-effort online check. A `no-cors` request gives an opaque response we can't read,
 * but it resolves if *anything* answers and rejects if the connection is refused.
 */
function checkReachability(container) {
  for (const link of container.querySelectorAll("a.service")) {
    const dot = $(".status-dot", link);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), STATUS_TIMEOUT_MS);

    fetch(link.href, { mode: "no-cors", cache: "no-store", signal: abort.signal })
      .then(() => setStatus(dot, "up", "Reachable"))
      .catch(() => setStatus(dot, "down", "Not reachable"))
      .finally(() => clearTimeout(timer));
  }
}

function setStatus(dot, state, label) {
  dot.className = `status-dot ${state}`;
  dot.title = label;
}
