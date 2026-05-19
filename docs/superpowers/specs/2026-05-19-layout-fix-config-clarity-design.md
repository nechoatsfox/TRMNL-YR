# Design: Layout Fix + Config Clarity

**Date:** 2026-05-19

## Problem

1. **Layout clipping** — the weather plugin renders in a half-panel (~400×480px). The current font sizes (icon 200px, temp 100px) plus padding push the UV rows and footer off-screen. The last 1–2 lines are cut off on the physical device.

2. **Config friction** — location is set via three env vars (`LOCATION_LAT`, `LOCATION_LON`, `LOCATION_NAME`) in `wrangler.toml`. The current comments don't guide a new user on how to find coordinates or which values to change.

## Solution

### 1. Layout fix (`trmnl-template/display.liquid`)

Reduce sizes while keeping the exact same structure (centered icon, large temp, two-column today/tomorrow, pinned footer):

| Property | Before | After |
|---|---|---|
| Weather icon font-size | 200px | 140px |
| Weather icon margin-bottom | 20px | 10px |
| Current temp font-size | 100px | 72px |
| Current temp margin-bottom | 30px | 15px |
| Layout top padding | 30px | 10px |

No structural changes — same two-column layout and footer.

### 2. Config clarity (`cloudflare-worker/wrangler.toml` + `wrangler.example.toml`)

- Add a clearly labeled `# --- Your Location ---` block around the three location vars
- Add an inline comment on each var explaining what it is
- Add a tip comment pointing to latlong.net to find coordinates
- No functional changes — just documentation

### 3. Updating a running worker (`cloudflare-worker/package.json` + `QUICKSTART.md`)

Mechanism: edit `wrangler.toml` + run `wrangler deploy` (~5s redeploy).

- Add an `npm run deploy` script to `package.json` as a shortcut for `wrangler deploy`
- Add an "Updating your location" section to `QUICKSTART.md` with exact steps:
  1. Open `wrangler.toml`
  2. Change `LOCATION_LAT`, `LOCATION_LON`, `LOCATION_NAME`
  3. Run `npm run deploy` (or `wrangler deploy`)

## Files Changed

- `trmnl-template/display.liquid` — CSS value tweaks only
- `cloudflare-worker/wrangler.toml` — comment improvements only
- `cloudflare-worker/wrangler.example.toml` — same comment improvements
- `cloudflare-worker/package.json` — add `deploy` script
- `QUICKSTART.md` — add "Updating your location" section
