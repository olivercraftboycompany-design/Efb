/* =========================================================================
   STATE — single source of truth for the current location, settings,
   and cached API responses. Other modules read/write through this object.
   ========================================================================= */
window.CBState = (function () {
  const { STORAGE_KEYS, AUTOREFRESH_DEFAULT_MS } = window.CB_CONFIG;

  const defaultSettings = {
    theme: 'dark',
    tempUnit: 'fahrenheit',
    windUnit: 'mph',
    clock: '12',
    autoRefreshMs: AUTOREFRESH_DEFAULT_MS
  };

  const state = {
    settings: Object.assign({}, defaultSettings, window.CBUtils.loadJSON(STORAGE_KEYS.settings, {})),
    favorites: window.CBUtils.loadJSON(STORAGE_KEYS.favorites, []),
    recents: window.CBUtils.loadJSON(STORAGE_KEYS.recents, []),
    location: window.CBUtils.loadJSON(STORAGE_KEYS.lastLocation, null), // {name, admin1, country, lat, lon, timezone}
    weather: null,     // last Open-Meteo forecast response
    alerts: [],        // normalized NWS alerts
    newsCategory: 'weather',
    autoRefreshTimer: null,
    listeners: {}
  };

  function on(event, cb) {
    (state.listeners[event] = state.listeners[event] || []).push(cb);
  }
  function emit(event, payload) {
    (state.listeners[event] || []).forEach(cb => {
      try { cb(payload); } catch (e) { console.error(e); }
    });
  }

  function saveSettings() { window.CBUtils.saveJSON(STORAGE_KEYS.settings, state.settings); }
  function saveFavorites() { window.CBUtils.saveJSON(STORAGE_KEYS.favorites, state.favorites); }
  function saveRecents() { window.CBUtils.saveJSON(STORAGE_KEYS.recents, state.recents); }
  function saveLastLocation() { window.CBUtils.saveJSON(STORAGE_KEYS.lastLocation, state.location); }

  function locationKey(loc) {
    return loc ? `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}` : '';
  }

  function setLocation(loc) {
    state.location = loc;
    saveLastLocation();
    addRecent(loc);
    emit('location-changed', loc);
  }

  function addRecent(loc) {
    const key = locationKey(loc);
    state.recents = state.recents.filter(r => locationKey(r) !== key);
    state.recents.unshift(loc);
    state.recents = state.recents.slice(0, window.CB_CONFIG.RECENT_SEARCH_LIMIT);
    saveRecents();
    emit('recents-changed', state.recents);
  }

  function isFavorite(loc) {
    if (!loc) return false;
    return state.favorites.some(f => locationKey(f) === locationKey(loc));
  }

  function toggleFavorite(loc) {
    const key = locationKey(loc);
    if (isFavorite(loc)) {
      state.favorites = state.favorites.filter(f => locationKey(f) !== key);
    } else {
      state.favorites.unshift(loc);
    }
    saveFavorites();
    emit('favorites-changed', state.favorites);
    return isFavorite(loc);
  }

  function removeFavorite(loc) {
    state.favorites = state.favorites.filter(f => locationKey(f) !== locationKey(loc));
    saveFavorites();
    emit('favorites-changed', state.favorites);
  }

  function updateSetting(key, value) {
    state.settings[key] = value;
    saveSettings();
    emit('settings-changed', state.settings);
  }

  return {
    state, on, emit, setLocation, addRecent, isFavorite, toggleFavorite,
    removeFavorite, updateSetting, locationKey
  };
})();
