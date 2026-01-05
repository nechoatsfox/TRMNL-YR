#!/usr/bin/env python3
"""
TRMNL YR Weather Plugin - Docker/Python Solution

This script fetches weather data from YR.no and sends it to TRMNL.
Can be run as a Flask server or as a scheduled cron job.
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import requests
from flask import Flask, jsonify

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
TRMNL_WEBHOOK_URL = os.getenv('TRMNL_WEBHOOK_URL')
LOCATION_LAT = os.getenv('LOCATION_LAT')
LOCATION_LON = os.getenv('LOCATION_LON')
LOCATION_NAME = os.getenv('LOCATION_NAME', 'Unknown')
CONTACT_EMAIL = os.getenv('CONTACT_EMAIL')

# Weather icon mapping
WEATHER_ICONS = {
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
}

WEATHER_DESCRIPTIONS = {
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
}


def get_weather_icon(symbol_code: Optional[str]) -> str:
    """Get weather icon emoji from YR symbol code."""
    if not symbol_code:
        return '🌡️'
    base_code = symbol_code.split('_')[0]
    return WEATHER_ICONS.get(base_code, '🌡️')


def get_weather_description(symbol_code: Optional[str]) -> str:
    """Get weather description from YR symbol code."""
    if not symbol_code:
        return 'Unknown'
    base_code = symbol_code.split('_')[0]
    return WEATHER_DESCRIPTIONS.get(base_code, base_code.title())


def fetch_yr_weather(lat: str, lon: str, contact_email: str) -> Dict[str, Any]:
    """Fetch weather data from YR.no API."""
    # Round to 4 decimals as required by YR
    lat = f"{float(lat):.4f}"
    lon = f"{float(lon):.4f}"

    url = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}"

    headers = {
        'User-Agent': f'TRMNL-YR-Plugin/1.0 {contact_email}'
    }

    logger.info(f"Fetching weather for {lat}, {lon}")
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()

    return response.json()


def format_weather_data(weather_data: Dict[str, Any], location_name: str) -> Dict[str, Any]:
    """Format YR weather data for TRMNL."""
    timeseries = weather_data['properties']['timeseries']

    # Current weather
    current = timeseries[0]
    current_data = current['data']['instant']['details']
    next_1h = current['data'].get('next_1_hours') or current['data'].get('next_6_hours', {})
    next_6h = current['data'].get('next_6_hours') or current['data'].get('next_12_hours', {})

    # Find tomorrow's weather (approximately 24 hours from now)
    current_time = datetime.fromisoformat(current['time'].replace('Z', '+00:00'))
    tomorrow_index = 0

    for i, entry in enumerate(timeseries[1:], 1):
        entry_time = datetime.fromisoformat(entry['time'].replace('Z', '+00:00'))
        hours_diff = (entry_time - current_time).total_seconds() / 3600
        if 20 <= hours_diff <= 28:
            tomorrow_index = i
            break

    if tomorrow_index == 0:
        tomorrow_index = min(8, len(timeseries) - 1)

    tomorrow = timeseries[tomorrow_index]
    tomorrow_data = tomorrow['data']['instant']['details']
    tomorrow_next_6h = tomorrow['data'].get('next_6_hours') or tomorrow['data'].get('next_12_hours', {})

    # Temperature ranges
    today_temps = [t['data']['instant']['details']['air_temperature'] for t in timeseries[:24]]
    today_min = min(today_temps)
    today_max = max(today_temps)

    tomorrow_temps = [t['data']['instant']['details']['air_temperature']
                      for t in timeseries[tomorrow_index:tomorrow_index + 24]]
    tomorrow_min = min(tomorrow_temps) if tomorrow_temps else today_min
    tomorrow_max = max(tomorrow_temps) if tomorrow_temps else today_max

    # Current time
    now = datetime.now()
    time_str = now.strftime('%H:%M')

    # Get symbol codes
    current_symbol = (next_1h.get('summary', {}).get('symbol_code') or
                      next_6h.get('summary', {}).get('symbol_code'))
    tomorrow_symbol = tomorrow_next_6h.get('summary', {}).get('symbol_code')

    return {
        # Current conditions
        'current_temp': round(current_data['air_temperature']),
        'current_condition': get_weather_description(current_symbol),
        'current_icon': get_weather_icon(current_symbol),
        'temp_low': round(today_min),
        'temp_high': round(today_max),
        'uv_index': round(current_data.get('ultraviolet_index_clear_sky', 0)),

        # Tomorrow's forecast
        'tomorrow_condition': get_weather_description(tomorrow_symbol),
        'tomorrow_icon': get_weather_icon(tomorrow_symbol),
        'tomorrow_temp_low': round(tomorrow_min),
        'tomorrow_temp_high': round(tomorrow_max),
        'tomorrow_uv_index': round(tomorrow_data.get('ultraviolet_index_clear_sky', 0)),

        # Additional data
        'location_name': location_name,
        'current_time': time_str,
        'humidity': round(current_data.get('relative_humidity', 0)),
        'wind_speed': round(current_data.get('wind_speed', 0)),

        # Metadata
        'last_updated': datetime.now().isoformat()
    }


def send_to_trmnl(webhook_url: str, weather_data: Dict[str, Any]) -> None:
    """Send formatted weather data to TRMNL webhook."""
    payload = {
        'merge_variables': weather_data
    }

    logger.info("Sending to TRMNL webhook")
    response = requests.post(
        webhook_url,
        json=payload,
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    response.raise_for_status()
    logger.info("Successfully sent to TRMNL")


def update_weather() -> Dict[str, Any]:
    """Main function to fetch and send weather data."""
    # Validate configuration
    required_vars = {
        'TRMNL_WEBHOOK_URL': TRMNL_WEBHOOK_URL,
        'LOCATION_LAT': LOCATION_LAT,
        'LOCATION_LON': LOCATION_LON,
        'CONTACT_EMAIL': CONTACT_EMAIL
    }

    missing = [k for k, v in required_vars.items() if not v]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    try:
        # Fetch weather from YR
        weather_data = fetch_yr_weather(LOCATION_LAT, LOCATION_LON, CONTACT_EMAIL)

        # Format for TRMNL
        formatted_data = format_weather_data(weather_data, LOCATION_NAME)

        # Send to TRMNL
        send_to_trmnl(TRMNL_WEBHOOK_URL, formatted_data)

        return {
            'success': True,
            'data': formatted_data,
            'message': 'Weather data sent to TRMNL successfully'
        }

    except Exception as e:
        logger.error(f"Error updating weather: {e}", exc_info=True)
        raise


# Flask app for HTTP endpoint
app = Flask(__name__)


@app.route('/update', methods=['GET', 'POST'])
def update_endpoint():
    """HTTP endpoint to trigger weather update."""
    try:
        result = update_weather()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    # If run directly, do a single update
    if len(sys.argv) > 1 and sys.argv[1] == 'update':
        try:
            result = update_weather()
            print(json.dumps(result, indent=2))
            sys.exit(0)
        except Exception as e:
            logger.error(f"Failed to update weather: {e}")
            sys.exit(1)
    else:
        # Run Flask server
        port = int(os.getenv('PORT', 8080))
        app.run(host='0.0.0.0', port=port)
