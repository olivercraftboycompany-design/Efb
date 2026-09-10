/* =========================================================================
   MAP MODULE — Leaflet map on free OpenStreetMap tiles, with a free
   RainViewer radar overlay. Other layers (temperature/wind/cloud tile
   imagery) require paid providers, so their buttons are shown but
   disabled with an honest explanation rather than faked.
   ========================================================================= */
window.CBMap = (function () {
  const CFG = window.CB_CONFIG;
  let map = null;
  let marker = null;
  let radarLayer = null;

  const LAYERS = [
    { id: 'radar', label: 'Radar', available: true },
    { id: 'temp', label: 'Temperature', available: false },
    { id: 'precip', label: 'Precipitation', available: false },
    { id: 'wind', label: 'Wind', available: false },
    { id: 'cloud', label: 'Cloud cover', available: false },
    { id: 'severe', label: 'Severe weather', available: false }
  ];

  function init() {
    if (map) return;
    map = L.map('weather-map', { zoomControl: true, attributionControl: false }).setView([39.5, -98.35], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);
    renderLayerButtons();
  }

  function renderLayerButtons() {
    const wrap = document.getElementById('map-layers');
    wrap.innerHTML = LAYERS.map(l => `
      <button type="button" class="map-layer-btn ${l.id === 'radar' ? 'active' : ''}" data-layer="${l.id}"
        ${l.available ? '' : 'disabled title="Requires a paid map data provider — not available in this free build."'}>
        ${l.label}
      </button>
    `).join('');
    const radarBtn = wrap.querySelector('[data-layer="radar"]');
    radarBtn.addEventListener('click', () => {
      if (radarLayer) removeRadar(); else loadRadar();
      radarBtn.classList.toggle('active');
    });
  }

  function setLocation(lat, lon, label) {
    if (!map) init();
    map.setView([lat, lon], 8);
    if (marker) marker.remove();
    marker = L.marker([lat, lon]).addTo(map);
    if (label) marker.bindPopup(label);
  }

  async function loadRadar() {
    try {
      const data = await window.CBUtils.fetchJSON(CFG.RAINVIEWER_INDEX);
      const frames = (data.radar && data.radar.past) || [];
      if (!frames.length) {
        window.CBUtils.showToast('Radar data is unavailable right now.');
        return;
      }
      const host = data.host;
      const frame = frames[frames.length - 1]; // latest frame
      radarLayer = L.tileLayer(`${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.55, zIndex: 5
      }).addTo(map);
    } catch (err) {
      console.error('RainViewer load failed', err);
      window.CBUtils.showToast('Radar layer could not be loaded.');
    }
  }

  function removeRadar() {
    if (radarLayer) { radarLayer.remove(); radarLayer = null; }
  }

  function invalidateSize() {
    if (map) setTimeout(() => map.invalidateSize(), 150);
  }

  return { init, setLocation, invalidateSize };
})();
