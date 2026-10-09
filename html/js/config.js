/**
 * Loading config.json.
 *
 * Shape:
 *   {
 *     title, titleImage, titleImageSize, subtitle,
 *     statusCheck: false,          // optional, hides the online dots
 *     services: [{ name, desc, port, path, host, protocol, url, icon, group, newTab, hidden }]
 *   }
 * Only `name` is required per service. See README.md for what each field does.
 */

const CONFIG_URL = "config.json";

/** Returns the raw file text so callers can cheaply detect whether anything changed. */
export async function fetchConfigText() {
  const response = await fetch(CONFIG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${CONFIG_URL}: HTTP ${response.status}`);
  return response.text();
}
