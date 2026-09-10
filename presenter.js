/* =========================================================================
   PRESENTER MODULE — "Weather Man Mode".
   Turns the current forecast into an auto-advancing, TV-broadcast-style
   full-screen presentation with a teleprompter caption and optional
   spoken narration (Web Speech API — free, built into the browser).
   Nothing here invents data: every line is generated from the same
   weather/alerts/location objects already on screen.
   ========================================================================= */
window.CBPresenter = (function () {
  const U = window.CBUtils;
  let overlay = null;
  let slides = [];
  let slideIndex = 0;
  let playing = true;
  let muted = false;
  let autoTimer = null;
  let weatherRef = null, alertsRef = null, locationRef = null, settingsRef = null;

  /* ---------------------------- SCRIPT BUILDING ---------------------------- */

  function partOfDay(weather) {
    try {
      const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: weather.timezone }).format(new Date()));
      if (hour < 12) return 'morning';
      if (hour < 18) return 'afternoon';
      return 'evening';
    } catch (e) { return 'day'; }
  }

  function placeName(location) {
    return [location.name, location.admin1 || location.country].filter(Boolean).join(', ');
  }

  function buildSlides(weather, alerts, location, settings) {
    const list = [];
    const tempUnit = settings.tempUnit === 'fahrenheit' ? 'F' : 'C';
    const c = weather.current;
    const temp = U.formatTemp(c.temperature_2m, settings.tempUnit);
    const feels = U.formatTemp(c.apparent_temperature, settings.tempUnit);
    const cond = U.weatherLabel(c.weather_code).toLowerCase();

    // 1. Cold open / current conditions
    list.push({
      type: 'intro',
      narration: `Good ${partOfDay(weather)}. I'm your Craftboy weather anchor with your latest forecast for ${placeName(location)}. Right now it's ${temp} degrees ${tempUnit === 'F' ? 'Fahrenheit' : 'Celsius'} and ${cond}, feeling like ${feels} degrees.`,
      render: () => `
        <div class="wm-hero">
          <div class="wm-icon">${U.weatherIcon(c.weather_code)}</div>
          <div class="wm-temp">${temp}°<span>${tempUnit}</span></div>
          <div class="wm-cond">${U.weatherLabel(c.weather_code)}</div>
          <div class="wm-place">${U.escapeHTML(placeName(location))}</div>
        </div>
      `
    });

    // 2. Alerts (only if present)
    if (alerts && alerts.length) {
      const top = alerts.slice(0, 3);
      list.push({
        type: 'alerts',
        narration: `Now, an important update. ${top.map(a => `A ${a.type} is in effect for ${a.area}.`).join(' ')} Please stay weather aware and follow official guidance.`,
        render: () => `
          <div class="wm-alerts">
            <h3>⚠ Active Alerts</h3>
            ${top.map(a => `
              <div class="wm-alert-row ${window.CBAlerts.levelClass(a.level)}">
                <strong>${U.escapeHTML(a.type)}</strong>
                <span>${U.escapeHTML(a.area)}</span>
              </div>
            `).join('')}
          </div>
        `
      });
    }

    // 3. Hourly outlook
    const startIdx = window.CBWeather.currentHourIndex(weather);
    const hours = [];
    for (let i = startIdx; i < Math.min(startIdx + 6, weather.hourly.time.length); i++) hours.push(i);
    const firstT = U.formatTemp(weather.hourly.temperature_2m[hours[0]], settings.tempUnit);
    const lastT = U.formatTemp(weather.hourly.temperature_2m[hours[hours.length - 1]], settings.tempUnit);
    const trend = lastT > firstT ? 'warming up' : lastT < firstT ? 'cooling off' : 'holding steady';
    const rainChance = Math.max(...hours.map(i => weather.hourly.precipitation_probability[i] ?? 0));
    list.push({
      type: 'hourly',
      narration: `Looking ahead through the next several hours, temperatures will be ${trend}, moving from around ${firstT} to ${lastT} degrees. ${rainChance >= 30 ? `There's up to a ${Math.round(rainChance)} percent chance of precipitation, so keep an umbrella handy.` : 'Precipitation chances stay low.'}`,
      render: () => `
        <div class="wm-hourly">
          <h3>Next few hours</h3>
          <div class="wm-hourly-row">
            ${hours.map(i => `
              <div class="wm-hour">
                <div>${U.formatTime(weather.hourly.time[i], settings.clock === '24', weather.timezone)}</div>
                <div class="wm-hour-icon">${U.weatherIcon(weather.hourly.weather_code[i])}</div>
                <div class="wm-hour-temp">${U.formatTemp(weather.hourly.temperature_2m[i], settings.tempUnit)}°</div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    });

    // 4. 7-day outlook
    const d = weather.daily;
    const highIdx = d.temperature_2m_max.indexOf(Math.max(...d.temperature_2m_max));
    const wetDay = d.precipitation_probability_max.findIndex(p => p >= 50);
    let dailyLine = `Over the coming week, expect the warmest day on ${U.formatDayShort(d.time[highIdx], weather.timezone)} near ${U.formatTemp(d.temperature_2m_max[highIdx], settings.tempUnit)} degrees.`;
    if (wetDay !== -1) dailyLine += ` Keep an eye on ${U.formatDayShort(d.time[wetDay], weather.timezone)} for a good chance of rain.`;
    list.push({
      type: 'daily',
      narration: `Here's the seven day outlook. ${dailyLine}`,
      render: () => `
        <div class="wm-daily">
          <h3>7-day outlook</h3>
          <div class="wm-daily-row">
            ${d.time.map((date, i) => `
              <div class="wm-day">
                <div>${i === 0 ? 'Today' : U.formatDayShort(date, weather.timezone)}</div>
                <div class="wm-day-icon">${U.weatherIcon(d.weather_code[i])}</div>
                <div class="wm-day-temps"><b>${U.formatTemp(d.temperature_2m_max[i], settings.tempUnit)}°</b> <span>${U.formatTemp(d.temperature_2m_min[i], settings.tempUnit)}°</span></div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    });

    // 5. Sign-off
    list.push({
      type: 'signoff',
      narration: `That's your Craftboy Weather forecast for ${placeName(location)}. Stay safe out there, and check back any time for the latest updates.`,
      render: () => `
        <div class="wm-signoff">
          <div class="wm-signoff-mark">☀️</div>
          <div class="wm-signoff-title">Craftboy Weather</div>
          <div class="wm-signoff-sub">Thanks for watching. Stay safe out there.</div>
        </div>
      `
    });

    return list;
  }

  /* ---------------------------- OVERLAY / DOM ---------------------------- */

  function buildOverlay() {
    const el = document.createElement('div');
    el.className = 'wm-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Weather Man presentation mode');
    el.innerHTML = `
      <div class="wm-topbar">
        <span class="wm-live">● ON AIR</span>
        <span class="wm-title">Craftboy Weather Man Mode</span>
        <button type="button" class="wm-icon-btn" id="wm-mute" aria-label="Toggle narration sound">🔊</button>
        <button type="button" class="wm-icon-btn" id="wm-exit" aria-label="Exit presentation mode">✕</button>
      </div>
      <div class="wm-stage" id="wm-stage"></div>
      <div class="wm-caption" id="wm-caption"></div>
      <div class="wm-controls">
        <button type="button" class="wm-icon-btn" id="wm-prev" aria-label="Previous slide">⟨</button>
        <button type="button" class="wm-icon-btn" id="wm-play" aria-label="Pause presentation">⏸</button>
        <div class="wm-dots" id="wm-dots"></div>
        <button type="button" class="wm-icon-btn" id="wm-next" aria-label="Next slide">⟩</button>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function renderDots() {
    const dots = overlay.querySelector('#wm-dots');
    dots.innerHTML = slides.map((_, i) => `<span class="wm-dot ${i === slideIndex ? 'active' : ''}"></span>`).join('');
  }

  function renderSlide() {
    const slide = slides[slideIndex];
    overlay.querySelector('#wm-stage').innerHTML = slide.render();
    overlay.querySelector('#wm-caption').textContent = slide.narration;
    renderDots();
    speak(slide.narration);
  }

  function speak(text) {
    window.speechSynthesis && window.speechSynthesis.cancel();
    clearTimeout(autoTimer);
    if (muted || !('speechSynthesis' in window)) {
      // No narration available/enabled: advance on a fixed timer instead.
      if (playing) autoTimer = setTimeout(advance, 7000);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.onend = () => { if (playing) autoTimer = setTimeout(advance, 900); };
    utter.onerror = () => { if (playing) autoTimer = setTimeout(advance, 3000); };
    window.speechSynthesis.speak(utter);
  }

  function advance() {
    slideIndex = (slideIndex + 1) % slides.length;
    renderSlide();
  }
  function back() {
    slideIndex = (slideIndex - 1 + slides.length) % slides.length;
    renderSlide();
  }

  function setPlaying(next) {
    playing = next;
    const btn = overlay.querySelector('#wm-play');
    btn.textContent = playing ? '⏸' : '▶';
    btn.setAttribute('aria-label', playing ? 'Pause presentation' : 'Resume presentation');
    if (playing) {
      renderSlide();
    } else {
      window.speechSynthesis && window.speechSynthesis.cancel();
      clearTimeout(autoTimer);
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') { clearTimeout(autoTimer); advance(); }
    else if (e.key === 'ArrowLeft') { clearTimeout(autoTimer); back(); }
    else if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
  }

  function open(weather, alerts, location, settings) {
    if (!weather || !location) {
      U.showToast('Load a location before starting Weather Man Mode.');
      return;
    }
    weatherRef = weather; alertsRef = alerts; locationRef = location; settingsRef = settings;
    slides = buildSlides(weather, alerts, location, settings);
    slideIndex = 0;
    playing = true;
    muted = false;

    overlay = buildOverlay();
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.querySelector('#wm-exit').addEventListener('click', close);
    overlay.querySelector('#wm-next').addEventListener('click', () => { clearTimeout(autoTimer); advance(); });
    overlay.querySelector('#wm-prev').addEventListener('click', () => { clearTimeout(autoTimer); back(); });
    overlay.querySelector('#wm-play').addEventListener('click', () => setPlaying(!playing));
    overlay.querySelector('#wm-mute').addEventListener('click', (e) => {
      muted = !muted;
      e.currentTarget.textContent = muted ? '🔇' : '🔊';
      e.currentTarget.setAttribute('aria-label', muted ? 'Unmute narration' : 'Mute narration');
      if (muted) window.speechSynthesis && window.speechSynthesis.cancel();
      if (playing) { clearTimeout(autoTimer); speak(slides[slideIndex].narration); }
    });

    document.addEventListener('keydown', onKeydown);

    // Fullscreen is a nice-to-have; fail silently where unsupported (e.g. iOS Safari).
    if (overlay.requestFullscreen) {
      overlay.requestFullscreen().catch(() => {});
    }

    renderSlide();
  }

  function close() {
    document.removeEventListener('keydown', onKeydown);
    window.speechSynthesis && window.speechSynthesis.cancel();
    clearTimeout(autoTimer);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (overlay) {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      overlay = null;
    }
  }

  return { open, close };
})();
