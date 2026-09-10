/* =========================================================================
   ALERTS MODULE — fetches official NOAA/NWS alerts (US only, free, no key)
   and renders the alert bar + sidebar alerts panel.
   ========================================================================= */
window.CBAlerts = (function () {
  const U = window.CBUtils;
  const CFG = window.CB_CONFIG;
  let countdownTimer = null;

  /** NWS alerts are only issued for US points. Non-US locations get an empty, labeled result. */
  async function fetchAlerts(lat, lon, countryCode) {
    if (countryCode && countryCode.toUpperCase() !== 'US') {
      return { alerts: [], supported: false };
    }
    try {
      const url = `${CFG.NWS_ALERTS_URL}?point=${lat},${lon}`;
      const data = await U.fetchJSON(url, {
        headers: { 'Accept': 'application/geo+json' }
      });
      const alerts = (data.features || []).map(normalize).sort(bySeverity);
      return { alerts, supported: true };
    } catch (err) {
      console.error('NWS alerts fetch failed', err);
      return { alerts: [], supported: true, error: true };
    }
  }

  function classify(event, nwsSeverity) {
    const e = (event || '').toLowerCase();
    if (e.includes('emergency')) return 'Emergency';
    if (e.includes('warning')) return 'Warning';
    if (e.includes('watch')) return 'Watch';
    if (e.includes('advisory')) return 'Advisory';
    if (e.includes('statement')) return 'Statement';
    // fall back to NWS's own severity field
    if (nwsSeverity === 'Extreme' || nwsSeverity === 'Severe') return 'Warning';
    if (nwsSeverity === 'Moderate') return 'Watch';
    return 'Advisory';
  }

  function normalize(feature) {
    const p = feature.properties || {};
    const level = classify(p.event, p.severity);
    return {
      id: feature.id,
      type: p.event || 'Weather Alert',
      level,
      area: p.areaDesc || 'Affected area not specified',
      start: p.effective || p.onset || null,
      end: p.expires || p.ends || null,
      description: p.description || '',
      instructions: p.instruction || '',
      source: p.senderName || 'National Weather Service',
      headline: p.headline || ''
    };
  }

  function bySeverity(a, b) {
    const order = window.CB_SEVERITY_ORDER;
    return order.indexOf(a.level) - order.indexOf(b.level);
  }

  function levelClass(level) {
    return `sev-${(level || '').toLowerCase()}`;
  }

  function render(result) {
    renderBar(result);
    renderPanel(result);
  }

  function renderBar({ alerts }) {
    const bar = document.getElementById('alert-bar');
    if (!alerts || !alerts.length) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }
    const top = alerts[0];
    bar.className = `alert-bar ${levelClass(top.level)}`;
    bar.innerHTML = `⚠️ ${U.escapeHTML(top.type)} — ${U.escapeHTML(top.area)}. Tap for details.`;
    bar.onclick = () => document.getElementById('alerts-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPanel({ alerts, supported, error }) {
    const panel = document.getElementById('alerts-panel');
    clearInterval(countdownTimer);

    if (error) {
      panel.innerHTML = `<p class="muted">Alerts could not be retrieved right now. Try refreshing.</p>`;
      return;
    }
    if (!supported) {
      panel.innerHTML = `<p class="muted">No active weather alerts for this location.</p><p class="muted small">Official alert feeds are currently only available for US locations (NOAA/NWS).</p>`;
      return;
    }
    if (!alerts.length) {
      panel.innerHTML = `<p class="muted">No active weather alerts for this location.</p>`;
      return;
    }

    panel.innerHTML = alerts.map((a, i) => `
      <div class="alert-card ${levelClass(a.level)}" id="alert-${i}">
        <div class="alert-top">
          <span class="alert-type">${U.escapeHTML(a.type)}</span>
          <span class="alert-badge">${U.escapeHTML(a.level)}</span>
        </div>
        <div class="alert-meta">${U.escapeHTML(a.area)}</div>
        <div class="alert-meta">
          ${a.start ? `Starts ${U.escapeHTML(new Date(a.start).toLocaleString())}` : ''}
          ${a.end ? ` · Ends ${U.escapeHTML(new Date(a.end).toLocaleString())}` : ''}
        </div>
        <div class="alert-countdown" data-end="${a.end || ''}"></div>
        <div class="alert-desc">
          <p>${U.escapeHTML(a.description).replace(/\n/g, '<br>')}</p>
          ${a.instructions ? `<p><strong>What to do:</strong> ${U.escapeHTML(a.instructions).replace(/\n/g, '<br>')}</p>` : ''}
          <p class="alert-source">Source: ${U.escapeHTML(a.source)}</p>
        </div>
        <button type="button" class="alert-toggle" data-target="alert-${i}">Show details</button>
      </div>
    `).join('');

    panel.querySelectorAll('.alert-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = document.getElementById(btn.dataset.target);
        const expanded = card.classList.toggle('expanded');
        btn.textContent = expanded ? 'Hide details' : 'Show details';
      });
    });

    tickCountdowns();
    countdownTimer = setInterval(tickCountdowns, 60000);
  }

  function tickCountdowns() {
    document.querySelectorAll('.alert-countdown').forEach(el => {
      const end = el.dataset.end;
      if (!end) { el.textContent = ''; return; }
      const diffMs = new Date(end).getTime() - Date.now();
      if (diffMs <= 0) { el.textContent = 'Expired'; return; }
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      el.textContent = hrs > 0 ? `Expires in ${hrs}h ${mins}m` : `Expires in ${mins}m`;
    });
  }

  return { fetchAlerts, render, levelClass };
})();
