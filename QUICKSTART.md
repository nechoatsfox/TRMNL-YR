# Quick Start Guide

Get your TRMNL YR Weather plugin up and running in 5 minutes!

## What You Need

1. ✅ TRMNL device and account
2. ✅ Your location coordinates (latitude, longitude)
3. ✅ Your email address
4. ✅ Choose: Cloudflare account OR Docker

---

## Fastest Setup: Cloudflare Workers

### 1. Get Your TRMNL Webhook URL

```
1. Go to https://usetrmnl.com/dashboard
2. Click "Plugins" → "Private Plugins" → "Create New"
3. Name it "YR Weather"
4. Copy the Webhook URL (looks like: https://usetrmnl.com/api/custom_plugins/XXXX...)
5. Set Strategy to "deep_merge"
6. Paste the contents of trmnl-template/display.liquid into the Markup field
7. Save the plugin
```

### 2. Find Your Coordinates

- Go to https://www.latlong.net/
- Search for your city
- Copy lat/lon (e.g., 59.9139, 10.7522)
- Use max 4 decimal places

### 3. Deploy to Cloudflare

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Edit wrangler.toml with your settings
cd cloudflare-worker
nano wrangler.toml  # or use your favorite editor

# Set these values:
TRMNL_WEBHOOK_URL = "your-webhook-url-here"
LOCATION_LAT = "59.9139"
LOCATION_LON = "10.7522"
LOCATION_NAME = "Oslo"
CONTACT_EMAIL = "your-email@example.com"

# Deploy!
wrangler deploy
```

### 4. Test It

```bash
# Trigger manual update
curl https://trmnl-yr-weather.YOUR-SUBDOMAIN.workers.dev

# Check your TRMNL dashboard - data should appear!
```

### 5. Add to Playlist

```
1. In TRMNL dashboard, go to "Playlists"
2. Add your "YR Weather" plugin
3. Set display duration (e.g., 30 seconds)
4. Save
```

Done! Your TRMNL will now show weather updates every 15 minutes.

---

## Alternative: Docker Setup

### 1. Get Webhook URL (same as above)

Follow step 1 from Cloudflare setup.

### 2. Configure Docker

```bash
cd docker-solution
cp .env.example .env
nano .env  # Edit with your values
```

Set these in `.env`:
```env
TRMNL_WEBHOOK_URL=your-webhook-url
LOCATION_LAT=59.9139
LOCATION_LON=10.7522
LOCATION_NAME=Oslo
CONTACT_EMAIL=your@email.com
```

### 3. Run

```bash
docker-compose up -d
```

### 4. Verify

```bash
# Check it's running
docker-compose ps

# View logs
docker-compose logs -f

# Test update
curl http://localhost:8080/update
```

### 5. Add to Playlist (same as above)

Follow step 5 from Cloudflare setup.

Done!

---

## Common Issues

**"403 Forbidden" from YR.no**
- Make sure CONTACT_EMAIL is set to a real email

**Nothing showing on TRMNL**
- Check the webhook URL is correct
- Verify the plugin is in your active playlist
- Look at worker/container logs for errors

**"Rate limited"**
- Default is 15-minute updates (safe for free tier)
- TRMNL free allows 12 updates/hour
- TRMNL+ allows 30 updates/hour

---

## Next Steps

- Customize the display template (`trmnl-template/display.liquid`)
- Change update frequency in cron settings
- Add more weather data fields
- See full README.md for advanced options

---

## Getting Help

1. Read the troubleshooting section in README.md
2. Check TRMNL docs: https://docs.usetrmnl.com
3. Check YR.no docs: https://developer.yr.no
4. Open an issue on GitHub

Enjoy your weather display! 🌦️
