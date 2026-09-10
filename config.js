/* =========================================================================
   CONFIG — API endpoints and static lookup tables.
   All APIs used here are free and require no API key.
   ========================================================================= */
window.CB_CONFIG = {
  // Open-Meteo: free weather + geocoding, no key required.
  GEOCODE_URL: 'https://geocoding-api.open-meteo.com/v1/search',
  FORECAST_URL: 'https://api.open-meteo.com/v1/forecast',

  // BigDataCloud: free reverse-geocoding (lat/lon -> place name), no key.
  REVERSE_GEOCODE_URL: 'https://api.bigdatacloud.net/data/reverse-geocode-client',

  // National Weather Service: free, no key, US locations only.
  NWS_ALERTS_URL: 'https://api.weather.gov/alerts/active',
  NWS_POINTS_URL: 'https://api.weather.gov/points',

  // News: Google News RSS (free, public) converted to JSON via rss2json (free tier, no key for light use).
  RSS_TO_JSON: 'https://api.rss2json.com/v1/api.json',
  NEWS_RSS_BASE: 'https://news.google.com/rss/search',

  // RainViewer: free radar tile metadata, no key.
  RAINVIEWER_INDEX: 'https://api.rainviewer.com/public/weather-maps.json',

  AUTOREFRESH_DEFAULT_MS: 600000, // 10 minutes
  RECENT_SEARCH_LIMIT: 6,

  STORAGE_KEYS: {
    favorites: 'craftboy_favorites',
    recents: 'craftboy_recents',
    settings: 'craftboy_settings',
    lastLocation: 'craftboy_last_location'
  }
};

/* WMO weather codes -> { icon (emoji), label }. Used by Open-Meteo current/hourly/daily. */
window.CB_WEATHER_CODES = {
  0:  { icon:'☀️', label:'Clear sky' },
  1:  { icon:'🌤️', label:'Mostly clear' },
  2:  { icon:'⛅', label:'Partly cloudy' },
  3:  { icon:'☁️', label:'Overcast' },
  45: { icon:'🌫️', label:'Fog' },
  48: { icon:'🌫️', label:'Rime fog' },
  51: { icon:'🌦️', label:'Light drizzle' },
  53: { icon:'🌦️', label:'Drizzle' },
  55: { icon:'🌧️', label:'Dense drizzle' },
  56: { icon:'🌧️', label:'Freezing drizzle' },
  57: { icon:'🌧️', label:'Dense freezing drizzle' },
  61: { icon:'🌦️', label:'Light rain' },
  63: { icon:'🌧️', label:'Rain' },
  65: { icon:'🌧️', label:'Heavy rain' },
  66: { icon:'🌧️', label:'Freezing rain' },
  67: { icon:'🌧️', label:'Heavy freezing rain' },
  71: { icon:'🌨️', label:'Light snow' },
  73: { icon:'🌨️', label:'Snow' },
  75: { icon:'❄️', label:'Heavy snow' },
  77: { icon:'❄️', label:'Snow grains' },
  80: { icon:'🌦️', label:'Light showers' },
  81: { icon:'🌧️', label:'Showers' },
  82: { icon:'⛈️', label:'Violent showers' },
  85: { icon:'🌨️', label:'Snow showers' },
  86: { icon:'❄️', label:'Heavy snow showers' },
  95: { icon:'⛈️', label:'Thunderstorm' },
  96: { icon:'⛈️', label:'Thunderstorm w/ hail' },
  99: { icon:'⛈️', label:'Severe thunderstorm w/ hail' }
};

window.CB_NEWS_CATEGORIES = [
  { id:'local',   label:'Local',          query:'local weather' },
  { id:'weather', label:'Weather',        query:'weather forecast' },
  { id:'severe',  label:'Severe Weather', query:'severe weather warning' },
  { id:'national',label:'National',       query:'United States weather' },
  { id:'world',   label:'World',          query:'world weather disaster' },
  { id:'science', label:'Science',        query:'weather science meteorology' },
  { id:'climate', label:'Climate',        query:'climate change' }
];

window.CB_SEVERITY_ORDER = ['Emergency','Warning','Watch','Advisory','Statement'];
