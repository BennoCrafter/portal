# portal
Quick overview for local ports in one place.

## Run
```sh
docker compose up -d
```
A tiny Python server (`server.py`, stdlib only) serves the app from `html/` and your data from a separate folder.

## Data
Code and data are kept apart. Change location of data in `docker-compose.yml`

## Configure
Edit `config.json` in the data folder. Open pages pick up changes automatically. 

```json
{
  "title": "homeserver",
  "subtitle": "",
  "services": [
    { "name": "Sample service 1", "desc": "Service description 1", "port": 8001, "icon": "lucide:server" },
    { "name": "NAS", "url": "nas.local:5000", "icon": "synology" }
  ]
}
```

| Field      | Meaning |
|------------|---------|
| `name`     | Title (required) |
| `desc`     | Short description |
| `port`     | Port on the current host; use this or `url` (link = `<current protocol>://<current host>:<port><path>`) |
| `path`     | Optional path, default `/` |
| `host` / `protocol` | Override host or protocol (e.g. `"protocol": "https"`) |
| `url`      | Instead of `port`: any address — `"https://cloud.example.com"`, `"nas.local:5000"` (protocol optional, defaults to the current one) or a path on this host like `"/grafana/"`. Overrides port/host/path |
| `icon`     | See below. Empty = guess from the name |
| `group`    | Optional section heading; services without a group are listed without one |
| `newTab`   | `true` to open in a new tab |
| `hidden`   | `true` to hide without deleting |

Top-level `titleImage` shows an image above the title (a logo URL, a file in the data folder like `"data/logo.png"`, or any value an `icon` accepts — see below). `titleImageSize` sets its height: a number in pixels (`120`, the size on a small screen — it grows with the window like the rest of the page) or any CSS length (`"8rem"`, `"20vh"`); default scales from 4 to 6rem with the window. Top-level `statusCheck: false` hides the green/red reachability dot.

### Status
`/status` shows whether each service answers, `/api/status` returns the same as JSON (`checkedAt`, `summary` with `total`/`up`/`down`, and per service `name`, `group`, `url`, `status` `"up"`/`"down"`, `httpStatus`, `latencyMs`, `error`). The server makes the checks itself; any HTTP response counts as up. Port-based services are checked on `STATUS_HOST` (set to the Docker host in `docker-compose.yml`), otherwise on the host the portal was opened with.

### Icons
- App logos from [dashboard-icons](https://dashboardicons.com): `"paperless-ngx"`, `"jellyfin"`, `"home-assistant"`, …
- Generic icons from [Lucide](https://lucide.dev/icons): `"lucide:server"`, `"lucide:database"`, …
- An emoji (`"📄"`) or an image URL.

Icons load from the jsDelivr CDN. If an icon can't load, the first letter of the name is shown instead.

## Development
No build step: plain HTML, CSS and native ES modules.

```
server.py            static file server: html/ at /, DATA_DIR at /data/, /api/status (stdlib only)
default_config.json  template copied to DATA_DIR/config.json on first start
html/
  index.html         page skeleton
  status.html        /status page
  css/style.css      all styles (theme variables at the top)
  js/
    main.js          entry point: loads config, polls for changes
    portal.js        renders the service list + online check
    status.js        renders /status from /api/status
    icons.js         icon resolution (dashboard-icons, Lucide, emoji, URLs) + fallbacks
    config.js        loads config.json
    util.js          small helpers ($, escapeHtml, slugify)
```

Run locally without Docker: `PORT=8080 python3 server.py` (uses `./data`, ignored by git), then open http://localhost:8080.
