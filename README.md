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
    { "name": "Sample service 1", "desc": "Service description 1", "port": 8001, "icon": "lucide:server" }
  ]
}
```

| Field      | Meaning |
|------------|---------|
| `name`     | Title (required) |
| `desc`     | Short description |
| `port`     | Port on the current host (link = `<current protocol>://<current host>:<port><path>`) |
| `path`     | Optional path, default `/` |
| `host` / `protocol` | Override host or protocol (e.g. `"protocol": "https"`) |
| `url`      | Full URL; overrides port/host/path entirely |
| `icon`     | See below. Empty = guess from the name |
| `group`    | Optional section heading; services without a group are listed without one |
| `newTab`   | `true` to open in a new tab |
| `hidden`   | `true` to hide without deleting |

Top-level `titleImage` shows an image above the title (a logo URL, a file in the data folder like `"data/logo.png"`, or any value an `icon` accepts — see below). `titleImageSize` sets its height: a number in pixels (`120`) or any CSS length (`"8rem"`, `"20vh"`); default scales from 4 to 6rem with the window. Top-level `statusCheck: false` hides the green/red reachability dot.

### Icons
- App logos from [dashboard-icons](https://dashboardicons.com): `"paperless-ngx"`, `"jellyfin"`, `"home-assistant"`, …
- Generic icons from [Lucide](https://lucide.dev/icons): `"lucide:server"`, `"lucide:database"`, …
- An emoji (`"📄"`) or an image URL.

Icons load from the jsDelivr CDN. If an icon can't load, the first letter of the name is shown instead.

## Development
No build step: plain HTML, CSS and native ES modules.

```
server.py            static file server: html/ at /, DATA_DIR at /data/ (stdlib only)
default_config.json  template copied to DATA_DIR/config.json on first start
html/
  index.html         page skeleton
  css/style.css      all styles (theme variables at the top)
  js/
    main.js          entry point: loads config, polls for changes
    portal.js        renders the service list + online check
    icons.js         icon resolution (dashboard-icons, Lucide, emoji, URLs) + fallbacks
    config.js        loads config.json
    util.js          small helpers ($, escapeHtml, slugify)
```

Run locally without Docker: `PORT=8080 python3 server.py` (uses `./data`, ignored by git), then open http://localhost:8080.
