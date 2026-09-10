/* =========================================================================
   APP — bootstraps the dashboard and coordinates all modules.
   ========================================================================= */
window.CBApp = (function () {
  const U = window.CBUtils;
  const St = window.CBState;
  let refreshInFlight = false;

  const DEFAULT_LOCATION = { name: 'New York', admin1: 'New York', country: 'United States', countryCode: 'US', lat: 40.7128, lon: -74.006, timezone: 'America/New_York' };

  async function init() {
    window.CBSettings.init({ onAutoRefreshChange: setupAutoRefresh });
    window.CBSearch.init(handleLocationSelected);
    window.CBNews.renderFilters(St.state.newsCategory, handleNewsCategory);
    wireChartTabs();
    wireFavoriteAndShare();
    document.getElementById('refresh-btn').addEventListener('click', () => loadEverything({ silent: false }));
    wirePresenterButton();

    St.on('recents-changed', window.CBSearch.renderSavedAndRecent);
    St.on('favorites-changed', () => { window.CBSearch.renderSavedAndRecent(); syncFavoriteButton(); });

    window.CBSearch.renderSavedAndRecent();
    setupAutoRefresh(St.state.settings.autoRefreshMs);

    const startLocation = St.state.location || DEFAULT_LOCATION;
    await handleLocationSelected(startLocation, { skipRecent: !!St.state.location });

    // Try to silently upgrade to the user's real location on first load only
    // if they have never picked one before.
    if (!St.state.location || St.state.location === DEFAULT_LOCATION) {
      // no-op: avoid surprising geolocation prompts on load; user can tap "My Location".
    }
  }

  async function handleLocationSelected(loc, opts = {}) {
    if (!loc) return;
    St.setLocation(loc);
    updateLocationHeader(loc);
    syncFavoriteButton();
    await loadEverything();
  }

  function updateLocationHeader(loc) {
    document.getElementById('current-location-name').textContent = window.CBSearch.locationLabel(loc);
    document.getElementById('current-location-meta').textContent =
      `${loc.countryCode ? loc.countryCode.toUpperCase() : ''} · ${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`;
  }

  async function loadEverything({ silent = true } = {}) {
    if (refreshInFlight) return;
    refreshInFlight = true;
    const loc = St.state.location;
    if (!silent) U.showToast('Refreshing…', 1500);

    try {
      const weather = await window.CBWeather.fetchForecast(loc.lat, loc.lon);
      weather.timezone = weather.timezone || loc.timezone;
      St.state.weather = weather;
      window.CBWeather.render(weather, St.state.settings);
      window.CBCharts.render(weather, St.state.settings, window.CBCharts.getTab());
      window.CBMap.setLocation(loc.lat, loc.lon, window.CBSearch.locationLabel(loc));
      window.CBMap.invalidateSize();
      stampUpdated();
    } catch (err) {
      console.error('Weather load failed', err);
      document.getElementById('current-weather-card').innerHTML =
        `<p class="muted">Current conditions couldn't be loaded. Check your connection and try refreshing.</p>`;
      U.showToast("Couldn't load weather data.");
    }

    try {
      const result = await window.CBAlerts.fetchAlerts(loc.lat, loc.lon, loc.countryCode);
      St.state.alerts = result.alerts;
      window.CBAlerts.render(result);
    } catch (err) {
      console.error('Alerts load failed', err);
    }

    loadNews();

    refreshInFlight = false;
  }

  async function loadNews() {
    const locName = St.state.location ? St.state.location.name : '';
    try {
      const articles = await window.CBNews.fetchNews(St.state.newsCategory, locName);
      window.CBNews.renderFeed(articles);
    } catch (err) {
      console.error('News load failed', err);
      window.CBNews.renderError();
    }
  }

  function handleNewsCategory(catId) {
    St.state.newsCategory = catId;
    window.CBNews.renderFilters(catId, handleNewsCategory);
    document.getElementById('news-feed').innerHTML = `<p class="muted">Loading news…</p>`;
    loadNews();
  }

  function stampUpdated() {
    const now = new Date();
    document.getElementById('last-updated').textContent =
      `Last updated: ${U.formatTime(now, St.state.settings.clock === '24')}`;
  }

  function wireChartTabs() {
    document.querySelectorAll('.chart-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
        window.CBCharts.render(St.state.weather, St.state.settings, btn.dataset.chart);
      });
    });
  }

  function syncFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    const isFav = St.isFavorite(St.state.location);
    btn.setAttribute('aria-pressed', String(isFav));
    btn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Save this location as a favorite');
  }

  function wireFavoriteAndShare() {
    document.getElementById('favorite-btn').addEventListener('click', () => {
      if (!St.state.location) return;
      St.toggleFavorite(St.state.location);
      syncFavoriteButton();
      U.showToast(St.isFavorite(St.state.location) ? 'Saved to favorites' : 'Removed from favorites');
    });

    document.getElementById('share-btn').addEventListener('click', async () => {
      const loc = St.state.location;
      if (!loc) return;
      const url = `${location.origin}${location.pathname}?lat=${loc.lat}&lon=${loc.lon}&name=${encodeURIComponent(loc.name)}`;
      const text = `Weather for ${window.CBSearch.locationLabel(loc)} — Craftboy Weather`;
      if (navigator.share) {
        try { await navigator.share({ title: 'Craftboy Weather', text, url }); } catch (e) { /* user cancelled */ }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        U.showToast('Link copied to clipboard');
      } else {
        U.showToast(url, 6000);
      }
    });
  }

  function wirePresenterButton() {
    const btn = document.getElementById('presenter-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window.CBPresenter.open(St.state.weather, St.state.alerts, St.state.location, St.state.settings);
    });
  }

  function setupAutoRefresh(ms) {
    clearInterval(St.state.autoRefreshTimer);
    if (ms && Number(ms) > 0) {
      St.state.autoRefreshTimer = setInterval(() => loadEverything({ silent: true }), Number(ms));
    }
  }

  function rerenderWeather() {
    if (St.state.weather) {
      window.CBWeather.render(St.state.weather, St.state.settings);
      window.CBCharts.render(St.state.weather, St.state.settings, window.CBCharts.getTab());
      stampUpdated();
    }
  }

  // Try to load the location from a shared URL (?lat=&lon=&name=) if present.
  function locationFromURL() {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat'));
    const lon = parseFloat(params.get('lon'));
    if (!isNaN(lat) && !isNaN(lon)) {
      return { name: params.get('name') || 'Shared location', admin1: '', country: '', countryCode: '', lat, lon };
    }
    return null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shared = locationFromURL();
    if (shared) St.state.location = shared;
    init();
  });

  return { rerenderWeather, loadEverything };
})();
