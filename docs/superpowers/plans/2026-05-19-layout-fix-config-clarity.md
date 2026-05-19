# Layout Fix + Config Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bottom-clipping layout issue on the TRMNL half-panel display and make it obvious how to change and update the location.

**Architecture:** Three independent file edits — CSS size reductions in the Liquid template, improved inline comments in both wrangler config files, and a new "Updating your location" section in QUICKSTART.md. No functional logic changes anywhere.

**Tech Stack:** Liquid (TRMNL template), TOML (Cloudflare Wrangler config), Markdown

---

## File Map

| File | Change |
|---|---|
| `trmnl-template/display.liquid` | Reduce icon/temp font sizes and spacing |
| `cloudflare-worker/wrangler.toml` | Add labeled location block with comments |
| `cloudflare-worker/wrangler.example.toml` | Same comment improvements as wrangler.toml |
| `QUICKSTART.md` | Add "Updating your location" section |

---

### Task 1: Fix layout clipping in display.liquid

The plugin renders in a half-panel (~400×480px). The icon (200px) and temperature (100px) are too large — the UV rows and footer get cut off at the bottom of the physical device.

**Files:**
- Modify: `trmnl-template/display.liquid`

- [ ] **Step 1: Open the file and locate the CSS block**

  The CSS to change is inside the `<style>` tag, lines 8–88. The three relevant rules are `.weather-icon`, `.current-temp`, and `.layout`.

- [ ] **Step 2: Apply the size reductions**

  Replace the `.layout`, `.weather-icon`, and `.current-temp` rules with:

  ```css
  .layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 20px 0 20px;
    font-family: 'Inter', Arial, sans-serif;
  }

  .weather-icon {
    font-size: 140px;
    line-height: 0.8;
    margin-bottom: 10px;
  }

  .current-temp {
    font-size: 72px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 15px;
  }
  ```

- [ ] **Step 3: Verify the full template looks correct**

  Open `trmnl-template/display.liquid` in a browser (File → Open). Confirm the icon, temperature, both columns (with UV rows), and footer time/location are all visible without scrolling at an 800×480 viewport. You can simulate this in Chrome DevTools by setting a custom device size of 800×480.

- [ ] **Step 4: Commit**

  ```bash
  git add trmnl-template/display.liquid
  git commit -m "Fix layout clipping: reduce icon and temp sizes for half-panel display"
  ```

---

### Task 2: Improve location comments in wrangler.toml

The three location vars are buried in `[vars]` with no guidance on how to find coordinates. Make them impossible to miss.

**Files:**
- Modify: `cloudflare-worker/wrangler.toml`

- [ ] **Step 1: Replace the `[vars]` block**

  Replace the entire `[vars]` section (everything from `[vars]` to end of file) with:

  ```toml
  # ============================================================
  # CONFIGURATION — edit these values before deploying
  # ============================================================
  [vars]

  # Your TRMNL plugin webhook URL (from usetrmnl.com → Plugins → Private Plugins)
  TRMNL_WEBHOOK_URL = "https://usetrmnl.com/api/custom_plugins/YOUR-UUID-HERE"

  # --- Your Location ---
  # Find coordinates at https://www.latlong.net/ (max 4 decimal places)
  LOCATION_LAT = "59.9139"   # Latitude  (e.g. 59.9139 for Oslo)
  LOCATION_LON = "10.7522"   # Longitude (e.g. 10.7522 for Oslo)
  LOCATION_NAME = "Oslo"     # Display name shown on the TRMNL screen

  # Your email — required by YR.no API terms of service
  CONTACT_EMAIL = "your-email@example.com"

  # Language: "no" for Norwegian, "en" for English
  LANGUAGE = "no"

  # Example locations:
  # Oslo, Norway:   LOCATION_LAT = "59.9139"  LOCATION_LON = "10.7522"
  # Bergen, Norway: LOCATION_LAT = "60.3913"  LOCATION_LON = "5.3221"
  # London, UK:     LOCATION_LAT = "51.5074"  LOCATION_LON = "-0.1278"
  # New York, USA:  LOCATION_LAT = "40.7128"  LOCATION_LON = "-74.0060"
  ```

- [ ] **Step 2: Verify the file is valid TOML**

  ```bash
  cd cloudflare-worker && npx wrangler deploy --dry-run 2>&1 | head -20
  ```

  Expected: no TOML parse errors. It may complain about missing credentials — that's fine, we only care that it parses correctly.

- [ ] **Step 3: Commit**

  ```bash
  git add cloudflare-worker/wrangler.toml
  git commit -m "Improve wrangler.toml location config comments"
  ```

---

### Task 3: Apply the same comment improvements to wrangler.example.toml

`wrangler.example.toml` is the file users copy when setting up fresh — it must match the improvements made to `wrangler.toml`.

**Files:**
- Modify: `cloudflare-worker/wrangler.example.toml`

- [ ] **Step 1: Replace the `[vars]` block**

  Replace the entire `[vars]` section (everything from `[vars]` to end of file) with the exact same block used in Task 2:

  ```toml
  # ============================================================
  # CONFIGURATION — edit these values before deploying
  # ============================================================
  [vars]

  # Your TRMNL plugin webhook URL (from usetrmnl.com → Plugins → Private Plugins)
  TRMNL_WEBHOOK_URL = "https://usetrmnl.com/api/custom_plugins/YOUR-UUID-HERE"

  # --- Your Location ---
  # Find coordinates at https://www.latlong.net/ (max 4 decimal places)
  LOCATION_LAT = "59.9139"   # Latitude  (e.g. 59.9139 for Oslo)
  LOCATION_LON = "10.7522"   # Longitude (e.g. 10.7522 for Oslo)
  LOCATION_NAME = "Oslo"     # Display name shown on the TRMNL screen

  # Your email — required by YR.no API terms of service
  CONTACT_EMAIL = "your-email@example.com"

  # Language: "no" for Norwegian, "en" for English
  LANGUAGE = "no"

  # Example locations:
  # Oslo, Norway:   LOCATION_LAT = "59.9139"  LOCATION_LON = "10.7522"
  # Bergen, Norway: LOCATION_LAT = "60.3913"  LOCATION_LON = "5.3221"
  # London, UK:     LOCATION_LAT = "51.5074"  LOCATION_LON = "-0.1278"
  # New York, USA:  LOCATION_LAT = "40.7128"  LOCATION_LON = "-74.0060"
  ```

- [ ] **Step 2: Verify both files are identical in their `[vars]` block**

  ```bash
  diff <(grep -A 999 '^\[vars\]' cloudflare-worker/wrangler.toml) \
       <(grep -A 999 '^\[vars\]' cloudflare-worker/wrangler.example.toml)
  ```

  Expected: no output (files are identical from `[vars]` onward).

- [ ] **Step 3: Commit**

  ```bash
  git add cloudflare-worker/wrangler.example.toml
  git commit -m "Sync wrangler.example.toml location comments with wrangler.toml"
  ```

---

### Task 4: Add "Updating your location" section to QUICKSTART.md

Users who already have the worker deployed need a clear answer to "how do I change the location?". Add a dedicated section after the existing Cloudflare deploy steps.

**Files:**
- Modify: `QUICKSTART.md`

- [ ] **Step 1: Add the section**

  Insert the following block immediately after the `Done! Your TRMNL will now show weather updates every 15 minutes.` line (after step 5 in the Cloudflare section, before the `---` separator):

  ```markdown
  ### Updating Your Location

  Already deployed and want to change the city? Three steps:

  1. Open `cloudflare-worker/wrangler.toml`
  2. Change the three location values:
     ```toml
     LOCATION_LAT = "60.3913"   # ← new latitude
     LOCATION_LON = "5.3221"    # ← new longitude
     LOCATION_NAME = "Bergen"   # ← new display name
     ```
     Find coordinates at https://www.latlong.net/
  3. Redeploy (takes ~5 seconds):
     ```bash
     cd cloudflare-worker
     npm run deploy
     ```

  The next scheduled run will use the new location.
  ```

- [ ] **Step 2: Verify the section renders correctly**

  ```bash
  cat QUICKSTART.md | grep -A 20 "Updating Your Location"
  ```

  Expected: the full section appears with the three steps.

- [ ] **Step 3: Commit**

  ```bash
  git add QUICKSTART.md
  git commit -m "Add 'Updating your location' section to QUICKSTART.md"
  ```

---

## Done

All four tasks are independent — they can be done in any order. Each commit is self-contained and safe to ship individually.
