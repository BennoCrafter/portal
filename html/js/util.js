/** Small DOM and string helpers shared by all modules. */

export const $ = (selector, root = document) => root.querySelector(selector);

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape a value for safe use inside HTML text or attribute values. */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** "Home Assistant" -> "home-assistant" */
export function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
