/* =========================================================================
   CHARTS MODULE — renders the temperature / precipitation / wind trend
   chart from the 48-hour Open-Meteo hourly arrays using Chart.js.
   ========================================================================= */
window.CBCharts = (function () {
  const U = window.CBUtils;
  let chart = null;
  let activeTab = 'temp';

  function gridColor() {
    const dark = document.body.getAttribute('data-theme') !== 'light';
    return dark ? 'rgba(150,168,204,.12)' : 'rgba(30,45,75,.10)';
  }
  function textColor() {
    const dark = document.body.getAttribute('data-theme') !== 'light';
    return dark ? '#8C9AB5' : '#4C5A72';
  }

  function buildDataset(weather, settings, tab) {
    const startIdx = window.CBWeather.currentHourIndex(weather);
    const count = 24;
    const times = weather.hourly.time.slice(startIdx, startIdx + count);
    const labels = times.map(t => U.formatTime(t, settings.clock === '24', weather.timezone));

    if (tab === 'temp') {
      const values = weather.hourly.temperature_2m.slice(startIdx, startIdx + count)
        .map(v => U.formatTemp(v, settings.tempUnit));
      return { labels, datasets: [{ label: `Temperature (°${settings.tempUnit === 'fahrenheit' ? 'F' : 'C'})`, data: values, borderColor: '#49D7E8', backgroundColor: 'rgba(73,215,232,.15)', tension: .35, fill: true, pointRadius: 0 }] };
    }
    if (tab === 'precip') {
      const values = weather.hourly.precipitation_probability.slice(startIdx, startIdx + count);
      return { labels, datasets: [{ label: 'Precipitation chance (%)', data: values, backgroundColor: '#49D7E8', borderRadius: 4 }] , type:'bar'};
    }
    // wind
    const values = weather.hourly.wind_speed_10m.slice(startIdx, startIdx + count)
      .map(v => U.formatWind(v, settings.windUnit));
    return { labels, datasets: [{ label: `Wind (${settings.windUnit})`, data: values, borderColor: '#9C87F5', backgroundColor: 'rgba(156,135,245,.15)', tension: .35, fill: true, pointRadius: 0 }] };
  }

  function render(weather, settings, tab) {
    if (!weather) return;
    activeTab = tab || activeTab;
    const ctx = document.getElementById('trend-chart');
    const { labels, datasets, type } = buildDataset(weather, settings, activeTab);
    const chartType = type || (activeTab === 'precip' ? 'bar' : 'line');

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: chartType,
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: textColor(), maxTicksLimit: 8 } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor() } }
        }
      }
    });
  }

  function setTab(tab) { activeTab = tab; }
  function getTab() { return activeTab; }

  return { render, setTab, getTab };
})();
