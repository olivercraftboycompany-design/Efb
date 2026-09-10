/* =========================================================================
   WEATHER MODULE — geocoding, forecast fetching, and rendering of the
   current-conditions hero card, detail tiles, hourly strip and 7-day list.
   ========================================================================= */
window.CBWeather = (function () {
  const U = window.CBUtils;
  const CFG = window.CB_CONFIG;

  /** Geocode a free-text query (city, ZIP, "City, State", etc.) via Open-Meteo. */
  async function geocode(query) {
    const url = `${CFG.GEOCODE_URL}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
    const data = await U.fetchJSON(url);
    return (data.results || []).map(r => ({
      name: r.name,
      admin1: r.admin1 || '',
      country: r.country || '',
      countryCode: r.country_code || '',
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone
    }));
  }

  /** Reverse-geocode lat/lon into a place name using BigDataCloud (free, no key). */
  async function reverseGeocode(lat, lon) {
    const url = `${CFG.REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const data = await U.fetchJSON(url);
    return {
      name: data.city || data.locality || data.principalSubdivision || 'Current location',
      admin1: data.principalSubdivision || '',
      country: data.countryName || '',
      countryCode: data.countryCode || '',
      lat, lon,
      timezone: undefined // filled in by the forecast response
    };
  }

  /** Pull current + hourly + daily forecast from Open-Meteo (free, no key). */
  async function fetchForecast(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: [
        'temperature_2m','apparent_temperature','relative_humidity_2m','weather_code',
        'wind_speed_10m','wind_direction_10m','cloud_cover','precipitation',
        'surface_pressure','is_day'
      ].join(','),
      hourly: [
        'temperature_2m','precipitation_probability','weather_code',
        'wind_speed_10m','visibility','uv_index'
      ].join(','),
      daily: [
        'weather_code','temperature_2m_max','temperature_2m_min',
        'precipitation_probability_max','wind_speed_10m_max','sunrise','sunset','uv_index_max'
      ].join(','),
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
      timezone: 'auto',
      forecast_days: 8
    });
    return U.fetchJSON(`${CFG.FORECAST_URL}?${params.toString()}`);
  }

  /* ---------------------------- RENDERING ---------------------------- */

  function render(weather, settings) {
    if (!weather) return;
    renderHero(weather, settings);
    renderDetails(weather, settings);
    renderHourly(weather, settings);
    renderDaily(weather, settings);
  }

  function renderHero(weather, settings) {
    const card = document.getElementById('current-weather-card');
    const c = weather.current;
    const tz = weather.timezone;
    const temp = U.formatTemp(c.temperature_2m, settings.tempUnit);
    const feels = U.formatTemp(c.apparent_temperature, settings.tempUnit);
    const unitSym = settings.tempUnit === 'fahrenheit' ? 'F' : 'C';

    card.innerHTML = `
      <div class="hero-main">
        <div class="hero-icon" aria-hidden="true">${U.weatherIcon(c.weather_code)}</div>
        <div>
          <div class="hero-temp">${temp}<sup>°${unitSym}</sup></div>
          <div class="hero-condition">${U.weatherLabel(c.weather_code)}</div>
          <div class="hero-feels">Feels like ${feels}°${unitSym}</div>
        </div>
      </div>
      <div class="hero-side">
        <div class="hero-stat"><span>Sunrise</span><b>${U.formatTime(weather.daily.sunrise[0], settings.clock === '24', tz)}</b></div>
        <div class="hero-stat"><span>Sunset</span><b>${U.formatTime(weather.daily.sunset[0], settings.clock === '24', tz)}</b></div>
        <div class="hero-stat"><span>UV index</span><b>${Math.round(weather.daily.uv_index_max?.[0] ?? 0)}</b></div>
        <div class="hero-stat"><span>Humidity</span><b>${Math.round(c.relative_humidity_2m)}%</b></div>
      </div>
    `;
  }

  function renderDetails(weather, settings) {
    const c = weather.current;
    const wind = U.formatWind(c.wind_speed_10m, settings.windUnit);
    const windUnitLabel = settings.windUnit === 'mph' ? 'mph' : 'km/h';
    const visKm = weather.hourly?.visibility?.[currentHourIndex(weather)] ?? null;
    const visMiles = visKm !== null ? (visKm / 1609.34).toFixed(1) : null;
    const visText = settings.windUnit === 'mph'
      ? (visMiles !== null ? `${visMiles} mi` : '—')
      : (visKm !== null ? `${Math.round(visKm / 1000)} km` : '—');

    const tiles = [
      { label: 'Feels like', value: `${U.formatTemp(c.apparent_temperature, settings.tempUnit)}°` },
      { label: 'Humidity', value: `${Math.round(c.relative_humidity_2m)}%` },
      { label: 'Wind', value: `${wind} <small>${windUnitLabel}</small>` },
      { label: 'Wind direction', value: U.windDirection(c.wind_direction_10m) },
      { label: 'Cloud cover', value: `${Math.round(c.cloud_cover)}%` },
      { label: 'Precipitation', value: `${(c.precipitation ?? 0).toFixed(1)} <small>mm</small>` },
      { label: 'Visibility', value: visText },
      { label: 'Pressure', value: `${Math.round(c.surface_pressure)} <small>hPa</small>` },
      { label: 'UV index', value: `${Math.round(weather.daily.uv_index_max?.[0] ?? 0)}` },
      { label: 'Sunrise', value: U.formatTime(weather.daily.sunrise[0], settings.clock === '24', weather.timezone) },
      { label: 'Sunset', value: U.formatTime(weather.daily.sunset[0], settings.clock === '24', weather.timezone) }
    ];

    document.getElementById('weather-details-grid').innerHTML = tiles.map(t => `
      <div class="detail-tile">
        <span class="detail-label">${t.label}</span>
        <div class="detail-value">${t.value}</div>
      </div>
    `).join('');
  }

  function currentHourIndex(weather) {
    const now = Date.now();
    const times = weather.hourly.time;
    let idx = times.findIndex(t => new Date(t).getTime() >= now);
    if (idx === -1) idx = times.length - 1;
    return Math.max(0, idx);
  }

  function renderHourly(weather, settings) {
    const startIdx = currentHourIndex(weather);
    const slice = [];
    for (let i = startIdx; i < Math.min(startIdx + 24, weather.hourly.time.length); i++) slice.push(i);

    document.getElementById('hourly-forecast').innerHTML = slice.map(i => {
      const t = weather.hourly.time[i];
      const label = i === startIdx ? 'Now' : U.formatTime(t, settings.clock === '24', weather.timezone);
      return `
        <div class="hour-tile">
          <div class="hour-time">${label}</div>
          <div class="hour-icon" aria-hidden="true">${U.weatherIcon(weather.hourly.weather_code[i])}</div>
          <div class="hour-temp">${U.formatTemp(weather.hourly.temperature_2m[i], settings.tempUnit)}°</div>
          <div class="hour-precip">💧 ${Math.round(weather.hourly.precipitation_probability[i] ?? 0)}%</div>
          <div class="hour-wind">${U.formatWind(weather.hourly.wind_speed_10m[i], settings.windUnit)} ${settings.windUnit}</div>
        </div>
      `;
    }).join('');
  }

  function renderDaily(weather, settings) {
    const d = weather.daily;
    const allHi = d.temperature_2m_max, allLo = d.temperature_2m_min;
    const minOfAll = Math.min(...allLo), maxOfAll = Math.max(...allHi);
    const span = Math.max(1, maxOfAll - minOfAll);

    document.getElementById('daily-forecast').innerHTML = d.time.map((date, i) => {
      const hi = U.formatTemp(allHi[i], settings.tempUnit);
      const lo = U.formatTemp(allLo[i], settings.tempUnit);
      const leftPct = ((allLo[i] - minOfAll) / span) * 100;
      const widthPct = ((allHi[i] - allLo[i]) / span) * 100;
      const dayLabel = i === 0 ? 'Today' : U.formatDayShort(date, weather.timezone);
      return `
        <div class="day-row">
          <div class="day-name">${dayLabel}<span class="day-date">${U.formatMonthDay(date, weather.timezone)}</span></div>
          <div class="day-cond"><span class="day-icon" aria-hidden="true">${U.weatherIcon(d.weather_code[i])}</span>${U.weatherLabel(d.weather_code[i])}</div>
          <div class="day-precip">💧${Math.round(d.precipitation_probability_max[i] ?? 0)}%</div>
          <div class="day-temps">
            <span class="day-lo">${lo}°</span>
            <span class="temp-bar" style="margin-left:${leftPct * 0.4}px; width:${Math.max(18, widthPct * 0.4)}px;"></span>
            <span class="day-hi">${hi}°</span>
          </div>
        </div>
      `;
    }).join('');
  }

  return { geocode, reverseGeocode, fetchForecast, render, currentHourIndex };
})();
