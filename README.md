# TRMNL YR Weather Plugin

A weather plugin for [TRMNL](https://usetrmnl.com) e-ink displays using data from [YR.no](https://yr.no) (Norwegian Meteorological Institute). This plugin fetches accurate weather forecasts and displays them in a clean, readable format on your TRMNL device.

![Weather Display Preview](preview.png)

## Features

- **Current Weather**: Temperature, conditions, UV index
- **Today's Forecast**: High/low temperatures
- **Tomorrow's Forecast**: Conditions and temperature range
- **Auto-updates**: Scheduled updates via cron/Cloudflare Workers
- **Two Deployment Options**: Cloudflare Workers or Docker
- **Free & Open Source**: Uses YR.no's free weather API

## Data Source

This plugin uses the [YR.no weather API](https://developer.yr.no/), which provides high-quality weather forecasts from the Norwegian Meteorological Institute. The API is free to use but requires proper identification in the User-Agent header.

## Deployment Options

Choose the deployment method that works best for you:

### Option 1: Cloudflare Workers (Recommended for simplicity)

**Pros:**
- Free tier includes 100,000 requests/day
- Built-in cron scheduling
- No server maintenance
- Global edge network

**Cons:**
- Requires Cloudflare account
- Limited to Cloudflare's execution environment

### Option 2: Docker (Recommended for self-hosting)

**Pros:**
- Full control over deployment
- Run on your own infrastructure
- Easy to customize
- Can expose via reverse proxy

**Cons:**
- Requires running Docker container
- Need to manage updates yourself

---

## Setup Instructions

### Prerequisites

1. **TRMNL Device & Account**
   - Sign up at [usetrmnl.com](https://usetrmnl.com)
   - Create a new Private Plugin in your TRMNL dashboard

2. **Get Your Location Coordinates**
   - Find your latitude and longitude (max 4 decimals)
   - Use [latlong.net](https://www.latlong.net/) or Google Maps

3. **Your Contact Email**
   - Required by YR.no API for User-Agent header
   - Use a valid email address

---

## Option 1: Cloudflare Workers Deployment

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

### Step 3: Configure Environment Variables

Edit `cloudflare-worker/wrangler.toml` and set your values in the `[vars]` section:

```toml
[vars]
TRMNL_WEBHOOK_URL = "https://usetrmnl.com/api/custom_plugins/YOUR-UUID-HERE"
LOCATION_LAT = "59.9139"
LOCATION_LON = "10.7522"
LOCATION_NAME = "Oslo"
CONTACT_EMAIL = "your-email@example.com"
```

**To get your TRMNL Webhook URL:**
1. Go to your TRMNL dashboard
2. Navigate to your Private Plugin
3. Copy the Webhook URL from the plugin settings

### Step 4: Deploy

```bash
cd cloudflare-worker
wrangler deploy
```

### Step 5: Test

Trigger a manual update:

```bash
curl https://trmnl-yr-weather.YOUR-SUBDOMAIN.workers.dev
```

The worker will automatically run every 15 minutes via the cron schedule.

### Step 6: Adjust Update Frequency (Optional)

Edit the cron schedule in `wrangler.toml`:

```toml
[triggers]
crons = ["*/15 * * * *"]  # Every 15 minutes (safe for free TRMNL tier)
```

**TRMNL Rate Limits:**
- Free: 12 updates/hour
- TRMNL+: 30 updates/hour

---

## Option 2: Docker Deployment

### Step 1: Clone and Configure

```bash
cd docker-solution
cp .env.example .env
```

Edit `.env` with your settings:

```env
TRMNL_WEBHOOK_URL=https://usetrmnl.com/api/custom_plugins/YOUR-UUID-HERE
LOCATION_LAT=59.9139
LOCATION_LON=10.7522
LOCATION_NAME=Oslo
CONTACT_EMAIL=your-email@example.com
```

### Step 2: Build and Run

```bash
docker-compose up -d
```

### Step 3: Verify

Check logs:

```bash
docker-compose logs -f
```

Test the HTTP endpoint:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/update
```

### Step 4: Expose to Internet (Optional)

If you want to trigger updates remotely, expose via a reverse proxy (nginx, Caddy, Traefik) or use a service like Cloudflare Tunnel.

Example Caddy configuration:

```
trmnl-weather.yourdomain.com {
    reverse_proxy localhost:8080
}
```

### Step 5: Manual Update

You can also run manual updates:

```bash
docker exec trmnl-yr-weather python app.py update
```

---

## TRMNL Plugin Configuration

### Step 1: Create the Plugin in TRMNL Dashboard

1. Go to [TRMNL Dashboard](https://usetrmnl.com/dashboard)
2. Navigate to **Plugins** → **Private Plugins**
3. Click **Create New Private Plugin**

### Step 2: Configure the Plugin

- **Plugin Name**: YR Weather
- **Strategy**: `deep_merge` (combines updates)
- **Markup**: Copy the contents of `trmnl-template/display.liquid`

### Step 3: Add to Your Playlist

1. Go to **Playlists** in your TRMNL dashboard
2. Add your new YR Weather plugin
3. Set refresh interval (recommended: 15 minutes)

### Step 4: Copy Webhook URL

Copy the webhook URL from your plugin settings and use it in your deployment configuration.

---

## Customization

### Modifying the Display Template

Edit `trmnl-template/display.liquid` to customize the layout:

- Change fonts, sizes, colors in the `<style>` section
- Rearrange layout elements
- Add additional weather data fields

Available variables from the webhook:
- `current_temp` - Current temperature
- `current_condition` - Weather description
- `current_icon` - Weather emoji
- `temp_low` / `temp_high` - Today's temperature range
- `uv_index` - UV index
- `tomorrow_condition` - Tomorrow's weather
- `tomorrow_temp_low` / `tomorrow_temp_high` - Tomorrow's temps
- `tomorrow_uv_index` - Tomorrow's UV index
- `location_name` - Location name
- `current_time` - Current time (HH:MM)
- `humidity` - Relative humidity %
- `wind_speed` - Wind speed (m/s)

### Adding More Weather Data

The YR.no API provides extensive weather data. Modify the worker/app to extract additional fields:

- Precipitation amount
- Wind direction
- Cloud cover percentage
- Atmospheric pressure
- Dew point

See the [YR.no API documentation](https://developer.yr.no/doc/ForecastJSON/) for available fields.

---

## Troubleshooting

### 403 Forbidden from YR.no

**Cause**: Missing or invalid User-Agent header

**Fix**: Ensure `CONTACT_EMAIL` is set to a valid email address

### No Data Appearing on TRMNL

**Check:**
1. Verify webhook URL is correct
2. Check worker/container logs for errors
3. Ensure coordinates are valid (max 4 decimals)
4. Verify TRMNL plugin is in your active playlist

### Rate Limiting

**TRMNL Limits:**
- Free: 12 updates/hour
- TRMNL+: 30 updates/hour

**Solution**: Adjust cron schedule to stay within limits

### Weather Data Incorrect

**Cause**: Wrong coordinates or timezone issues

**Fix**:
- Verify lat/lon coordinates
- Check that coordinates use max 4 decimal places
- YR.no uses UTC times internally

---

## Example Locations

```
# Norway
Oslo: 59.9139, 10.7522
Bergen: 60.3913, 5.3221
Tromsø: 69.6492, 18.9553

# Europe
London, UK: 51.5074, -0.1278
Paris, France: 48.8566, 2.3522
Berlin, Germany: 52.5200, 13.4050

# North America
New York, USA: 40.7128, -74.0060
San Francisco, USA: 37.7749, -122.4194
Vancouver, Canada: 49.2827, -123.1207
```

---

## Development

### Testing Locally

**Cloudflare Workers:**

```bash
cd cloudflare-worker
wrangler dev
```

**Docker:**

```bash
cd docker-solution
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py update
```

### Debugging

Enable verbose logging by setting environment variable:

```bash
export LOG_LEVEL=DEBUG
```

---

## API References

- **TRMNL Webhooks**: https://docs.usetrmnl.com/go/private-plugins/webhooks
- **TRMNL Templates**: https://docs.usetrmnl.com/go/private-plugins/templates
- **YR.no API**: https://developer.yr.no/doc/GettingStarted/
- **YR.no Forecast JSON**: https://developer.yr.no/doc/ForecastJSON/

---

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

---

## License

MIT License - Feel free to use and modify for your own purposes.

---

## Acknowledgments

- **YR.no** - For providing free, high-quality weather data
- **TRMNL** - For creating an awesome e-ink display platform
- **Norwegian Meteorological Institute** - For their excellent weather forecasting

---

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review TRMNL documentation
3. Check YR.no API status
4. Open an issue in this repository

---

## Changelog

### v1.0.0 (2026-01-05)
- Initial release
- Cloudflare Workers support
- Docker deployment option
- Current weather and tomorrow's forecast
- Auto-updating via cron
