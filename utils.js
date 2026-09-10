/* =========================================================================
   UTILS — small shared helpers used across modules.
   ========================================================================= */
window.CBUtils = (function () {

  /** Fetch JSON with a timeout and a friendly error on failure. */
  async function fetchJSON(url, { timeout = 12000, headers = {} } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal, headers });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function showToast(message, ms = 4000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add('hidden'), ms);
  }

  function celsiusToF(c) { return (c * 9) / 5 + 32; }
  function kmhToMph(k) { return k * 0.621371; }

  function formatTemp(celsius, unit) {
    if (celsius === null || celsius === undefined || isNaN(celsius)) return '—';
    const val = unit === 'fahrenheit' ? celsiusToF(celsius) : celsius;
    return Math.round(val);
  }

  function formatWind(kmh, unit) {
    if (kmh === null || kmh === undefined || isNaN(kmh)) return '—';
    const val = unit === 'mph' ? kmhToMph(kmh) : kmh;
    return Math.round(val);
  }

  function windDirection(deg) {
    if (deg === null || deg === undefined || isNaN(deg)) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function formatTime(dateInput, is24h, timeZone) {
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const opts = { hour: 'numeric', minute: '2-digit', hour12: !is24h };
    if (timeZone) opts.timeZone = timeZone;
    return d.toLocaleTimeString('en-US', opts);
  }

  function formatDayShort(dateInput, timeZone) {
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    const opts = { weekday: 'short' };
    if (timeZone) opts.timeZone = timeZone;
    return d.toLocaleDateString('en-US', opts);
  }

  function formatMonthDay(dateInput, timeZone) {
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    const opts = { month: 'short', day: 'numeric' };
    if (timeZone) opts.timeZone = timeZone;
    return d.toLocaleDateString('en-US', opts);
  }

  function timeAgo(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  }

  function weatherIcon(code) {
    const entry = window.CB_WEATHER_CODES[code];
    return entry ? entry.icon : '🌡️';
  }

  function weatherLabel(code) {
    const entry = window.CB_WEATHER_CODES[code];
    return entry ? entry.label : 'Unknown';
  }

  /* ---- localStorage helpers (safe against private-mode / disabled storage) ---- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore quota/privacy errors */ }
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    fetchJSON, showToast, formatTemp, formatWind, windDirection,
    formatTime, formatDayShort, formatMonthDay, timeAgo,
    weatherIcon, weatherLabel, loadJSON, saveJSON, debounce, escapeHTML,
    celsiusToF, kmhToMph
  };
})();
