/**
 * TRMNL YR Weather Plugin - Cloudflare Worker
 *
 * This worker fetches weather data from YR.no (Norwegian Meteorological Institute)
 * and sends it to your TRMNL device via webhook.
 *
 * Environment Variables Required:
 * - TRMNL_WEBHOOK_URL: Your TRMNL plugin webhook URL
 * - LOCATION_LAT: Latitude (max 4 decimals)
 * - LOCATION_LON: Longitude (max 4 decimals)
 * - LOCATION_NAME: Display name for location
 * - CONTACT_EMAIL: Your email for YR API User-Agent
 * 
 * Environment Variables Optional:
 * - LANGUAGE: "no" for Norwegian (default) or "en" for English
 */

// Weather code to icon mapping (YR.no uses MET Norway symbolcodes)
const WEATHER_ICONS = {
  'clearsky': '☀️',
  'fair': '🌤️',
  'partlycloudy': '⛅',
  'cloudy': '☁️',
  'rainshowers': '🌦️',
  'rain': '🌧️',
  'lightrain': '🌦️',
  'heavyrain': '⛈️',
  'sleet': '🌨️',
  'snow': '🌨️',
  'fog': '🌫️',
  'default': '🌡️'
};

// Get icon for weather symbol code
function getWeatherIcon(symbolCode) {
  if (!symbolCode) return WEATHER_ICONS.default;

  // YR symbol codes include day/night/polar variants (e.g., "clearsky_day")
  const baseCode = symbolCode.split('_')[0];
  return WEATHER_ICONS[baseCode] || WEATHER_ICONS.default;
}

// Weather descriptions in Norwegian and English
const WEATHER_DESCRIPTIONS = {
  no: {
    'clearsky': 'Klarvær',
    'fair': 'Lettskyet',
    'partlycloudy': 'Delvis skyet',
    'cloudy': 'Overskyet',
    'rainshowers': 'Regnbyger',
    'rain': 'Regn',
    'lightrain': 'Lett regn',
    'heavyrain': 'Kraftig regn',
    'sleet': 'Sludd',
    'snow': 'Snø',
    'fog': 'Tåke',
    'lightrainshowers': 'Lette regnbyger',
    'heavyrainshowers': 'Kraftige regnbyger',
    'lightrainshowersandthunder': 'Lett regn og torden',
    'rainshowersandthunder': 'Regnbyger og torden',
    'heavyrainshowersandthunder': 'Kraftig regn og torden',
    'snowshowers': 'Snøbyger',
    'lightsnowshowers': 'Lette snøbyger',
    'heavysnowshowers': 'Kraftige snøbyger',
    'sleetshowers': 'Sluddbyger',
    'lightsleetshowers': 'Lette sluddbyger',
    'heavysleetshowers': 'Kraftige sluddbyger',
    'unknown': 'Ukjent'
  },
  en: {
    'clearsky': 'Clear',
    'fair': 'Fair',
    'partlycloudy': 'Partly Cloudy',
    'cloudy': 'Cloudy',
    'rainshowers': 'Rain Showers',
    'rain': 'Rain',
    'lightrain': 'Light Rain',
    'heavyrain': 'Heavy Rain',
    'sleet': 'Sleet',
    'snow': 'Snow',
    'fog': 'Fog',
    'lightrainshowers': 'Light Rain',
    'heavyrainshowers': 'Heavy Rain',
    'lightrainshowersandthunder': 'Thunderstorm',
    'rainshowersandthunder': 'Thunderstorm',
    'heavyrainshowersandthunder': 'Heavy Thunderstorm',
    'snowshowers': 'Snow Showers',
    'lightsnowshowers': 'Light Snow',
    'heavysnowshowers': 'Heavy Snow',
    'sleetshowers': 'Sleet Showers',
    'lightsleetshowers': 'Light Sleet',
    'heavysleetshowers': 'Heavy Sleet',
    'unknown': 'Unknown'
  }
};

// Get weather description from symbol code
function getWeatherDescription(symbolCode, language = 'no') {
  if (!symbolCode) {
    return WEATHER_DESCRIPTIONS[language]?.unknown || 'Unknown';
  }

  const baseCode = symbolCode.split('_')[0];
  const langDescriptions = WEATHER_DESCRIPTIONS[language] || WEATHER_DESCRIPTIONS.no;
  
  return langDescriptions[baseCode] || baseCode;
}

// Format weather data for TRMNL
function formatWeatherData(weatherData, locationName, language = 'no') {
  const timeseries = weatherData.properties.timeseries;

  // Current weather (first entry)
  const current = timeseries[0];
  const currentData = current.data.instant.details;
  const next1h = current.data.next_1_hours || current.data.next_6_hours;
  const next6h = current.data.next_6_hours || current.data.next_12_hours;

  // Find tomorrow's weather (approximately 24 hours from now)
  let tomorrowIndex = timeseries.findIndex((entry, index) => {
    if (index === 0) return false;
    const hours = (new Date(entry.time) - new Date(current.time)) / (1000 * 60 * 60);
    return hours >= 20 && hours <= 28;
  });

  // Use fallback if not found (findIndex returns -1 if not found)
  if (tomorrowIndex < 0) {
    tomorrowIndex = Math.min(8, timeseries.length - 1);
  }

  const tomorrow = timeseries[tomorrowIndex];
  const tomorrowData = tomorrow.data.instant.details;
  const tomorrowNext6h = tomorrow.data.next_6_hours || tomorrow.data.next_12_hours;

  // Get temperature range for today (next 24 hours)
  const todayTemps = timeseries.slice(0, 24).map(t => t.data.instant.details.air_temperature);
  const todayMin = Math.min(...todayTemps);
  const todayMax = Math.max(...todayTemps);

  // Get temperature range for tomorrow (using the correct index)
  const tomorrowTemps = timeseries.slice(tomorrowIndex, tomorrowIndex + 24).map(t => t.data.instant.details.air_temperature);
  const tomorrowMin = Math.min(...tomorrowTemps);
  const tomorrowMax = Math.max(...tomorrowTemps);

  // Get current time
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    // Current conditions
    current_temp: Math.round(currentData.air_temperature),
    current_condition: getWeatherDescription(next1h?.summary?.symbol_code || next6h?.summary?.symbol_code, language),
    current_icon: getWeatherIcon(next1h?.summary?.symbol_code || next6h?.summary?.symbol_code),
    temp_low: Math.round(todayMin),
    temp_high: Math.round(todayMax),
    uv_index: Math.round(currentData.ultraviolet_index_clear_sky || 0),

    // Tomorrow's forecast (without icon)
    tomorrow_condition: getWeatherDescription(tomorrowNext6h?.summary?.symbol_code, language),
    tomorrow_temp_low: Math.round(tomorrowMin),
    tomorrow_temp_high: Math.round(tomorrowMax),
    tomorrow_uv_index: Math.round(tomorrowData.ultraviolet_index_clear_sky || 0),

    // Additional data
    location_name: locationName,
    current_time: timeStr,
    humidity: Math.round(currentData.relative_humidity || 0),
    wind_speed: Math.round(currentData.wind_speed || 0),

    // Raw data for debugging
    last_updated: new Date().toISOString()
  };
}

// Fetch weather from YR.no
async function fetchYRWeather(lat, lon, contactEmail) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': `TRMNL-YR-Plugin/1.0 ${contactEmail}`
    }
  });

  if (!response.ok) {
    throw new Error(`YR API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Send data to TRMNL webhook
async function sendToTRMNL(webhookUrl, weatherData) {
  const payload = {
    merge_variables: weatherData
  };

  console.log('Sending payload to TRMNL:', JSON.stringify(payload, null, 2));

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  console.log('TRMNL response:', response.status, responseText);

  if (!response.ok) {
    throw new Error(`TRMNL webhook error: ${response.status} ${response.statusText} - ${responseText}`);
  }

  return responseText;
}

// Main handler
export default {
  async fetch(request, env) {
    try {
      // Validate required environment variables
      const requiredVars = ['TRMNL_WEBHOOK_URL', 'LOCATION_LAT', 'LOCATION_LON', 'LOCATION_NAME', 'CONTACT_EMAIL'];
      const missing = requiredVars.filter(v => !env[v]);

      if (missing.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Missing environment variables',
            missing
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Round coordinates to 4 decimals (YR requirement)
      const lat = parseFloat(env.LOCATION_LAT).toFixed(4);
      const lon = parseFloat(env.LOCATION_LON).toFixed(4);
      const language = (env.LANGUAGE || 'no').toLowerCase();

      // Fetch weather from YR
      console.log(`Fetching weather for ${lat}, ${lon}`);
      const weatherData = await fetchYRWeather(lat, lon, env.CONTACT_EMAIL);

      // Format for TRMNL
      const formattedData = formatWeatherData(weatherData, env.LOCATION_NAME, language);

      // Send to TRMNL
      console.log('Sending to TRMNL:', formattedData);
      await sendToTRMNL(env.TRMNL_WEBHOOK_URL, formattedData);

      return new Response(
        JSON.stringify({
          success: true,
          data: formattedData,
          message: 'Weather data sent to TRMNL successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({
          error: error.message,
          stack: error.stack
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  },

  // Scheduled handler for cron triggers
  async scheduled(event, env, ctx) {
    try {
      const lat = parseFloat(env.LOCATION_LAT).toFixed(4);
      const lon = parseFloat(env.LOCATION_LON).toFixed(4);
      const language = (env.LANGUAGE || 'no').toLowerCase();

      const weatherData = await fetchYRWeather(lat, lon, env.CONTACT_EMAIL);
      const formattedData = formatWeatherData(weatherData, env.LOCATION_NAME, language);
      await sendToTRMNL(env.TRMNL_WEBHOOK_URL, formattedData);

      console.log('Scheduled update successful:', formattedData);
    } catch (error) {
      console.error('Scheduled update error:', error);
    }
  }
};
