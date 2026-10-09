/**
 * Service icons. The `icon` field of a service can be:
 *   "paperless-ngx"   app logo from dashboard-icons (https://dashboardicons.com)
 *   "lucide:server"   generic icon from Lucide (https://lucide.dev/icons)
 *   "📄"              emoji / any short text
 *   "https://…"       image URL (also "/…", "./…", "data:…", or a file name like "logo.png")
 *   (empty)           try a dashboard-icons logo matching the service name
 * If an image fails to load, the first letter of the service name is shown instead.
 */
import { escapeHtml, slugify } from "./util.js";

const DASHBOARD_ICONS = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";
const LUCIDE = "https://cdn.jsdelivr.net/npm/lucide-static@latest";

const LUCIDE_PREFIX = "lucide:";
const IMAGE_URL = /^(https?:|\/|\.\/|data:)/;
const IMAGE_FILE = /\.(png|jpe?g|gif|svg|webp|avif|ico)$/i;
const PLAIN_NAME = /^[\w .-]+$/;

export function lucideUrl(name) {
  return `${LUCIDE}/icons/${slugify(name)}.svg`;
}

/** Lucide icon rendered as a CSS mask, so it inherits the text color. */
export function lucideGlyph(name) {
  return `<span class="glyph" style="--src: url('${lucideUrl(name)}')"></span>`;
}

/** Inner HTML for a service's `.icon` box. */
export function serviceIconHtml(service) {
  const icon = String(service.icon ?? "").trim();
  const fallbackLetter = escapeHtml((service.name || "?").trim().charAt(0).toUpperCase() || "?");

  if (icon.startsWith(LUCIDE_PREFIX)) {
    return lucideGlyph(icon.slice(LUCIDE_PREFIX.length));
  }
  if (IMAGE_URL.test(icon) || IMAGE_FILE.test(icon)) {
    return imageTag(icon, { fallbackLetter });
  }
  if (icon && !PLAIN_NAME.test(icon)) {
    return escapeHtml(icon); // emoji or other text
  }

  const slug = slugify(icon || service.name);
  if (!slug) return fallbackLetter;

  // Most dashboard-icons exist as SVG, some only as PNG — try both.
  return imageTag(`${DASHBOARD_ICONS}/svg/${slug}.svg`, {
    retryUrl: `${DASHBOARD_ICONS}/png/${slug}.png`,
    fallbackLetter,
  });
}

function imageTag(src, { retryUrl = "", fallbackLetter }) {
  const retry = retryUrl ? ` data-retry-url="${escapeHtml(retryUrl)}"` : "";
  return `<img class="service-icon" src="${escapeHtml(src)}" alt=""${retry} data-fallback="${fallbackLetter}">`;
}

/**
 * Handle broken icon images anywhere on the page: try the retry URL first,
 * then replace the image with the fallback letter. Image errors don't bubble,
 * hence the capture listener.
 */
export function installIconFallback() {
  document.addEventListener(
    "error",
    ({ target }) => {
      if (!(target instanceof HTMLImageElement) || !target.classList.contains("service-icon")) return;
      if (target.dataset.retryUrl) {
        target.src = target.dataset.retryUrl;
        delete target.dataset.retryUrl;
      } else {
        target.replaceWith(target.dataset.fallback || "?");
      }
    },
    true,
  );
}
