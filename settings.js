/* =========================================================================
   SETTINGS MODULE — theme toggle, unit toggles, clock format, auto-refresh
   interval, and the settings dialog open/close behavior.
   ========================================================================= */
window.CBSettings = (function () {
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
  }

  function wireSegmented(id, settingKey, onChange) {
    const group = document.getElementById(id);
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', 'false'));
        btn.setAttribute('aria-checked', 'true');
        const value = btn.dataset.value;
        const parsed = isNaN(Number(value)) ? value : Number(value);
        window.CBState.updateSetting(settingKey, parsed);
        onChange && onChange(parsed);
      });
    });
  }

  function syncSegmented(id, value) {
    const group = document.getElementById(id);
    group.querySelectorAll('button').forEach(b => {
      const match = String(b.dataset.value) === String(value);
      b.setAttribute('aria-checked', String(match));
    });
  }

  function init({ onAutoRefreshChange } = {}) {
    const settings = window.CBState.state.settings;
    applyTheme(settings.theme);
    syncSegmented('theme-toggle', settings.theme);
    syncSegmented('unit-temp-toggle', settings.tempUnit);
    syncSegmented('unit-wind-toggle', settings.windUnit);
    syncSegmented('unit-clock-toggle', settings.clock);
    syncSegmented('autorefresh-toggle', settings.autoRefreshMs);

    wireSegmented('theme-toggle', 'theme', applyTheme);
    wireSegmented('unit-temp-toggle', 'tempUnit', () => window.CBApp && window.CBApp.rerenderWeather());
    wireSegmented('unit-wind-toggle', 'windUnit', () => window.CBApp && window.CBApp.rerenderWeather());
    wireSegmented('unit-clock-toggle', 'clock', () => window.CBApp && window.CBApp.rerenderWeather());
    wireSegmented('autorefresh-toggle', 'autoRefreshMs', (ms) => onAutoRefreshChange && onAutoRefreshChange(ms));

    const dialog = document.getElementById('settings-dialog');
    const overlay = document.getElementById('settings-overlay');
    const openBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-settings');

    function open() {
      dialog.setAttribute('open', '');
      overlay.classList.remove('hidden');
      closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }
    function close() {
      dialog.removeAttribute('open');
      overlay.classList.add('hidden');
      openBtn.focus();
      document.removeEventListener('keydown', onKeydown);
    }
    function onKeydown(e) { if (e.key === 'Escape') close(); }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
  }

  return { init, applyTheme };
})();
