/* =========================================================================
   SEARCH MODULE — location search box with live suggestions, geolocation,
   and the saved-locations / recent-searches sidebar lists.
   ========================================================================= */
window.CBSearch = (function () {
  const U = window.CBUtils;
  let activeIndex = -1;
  let currentResults = [];
  let onSelectCallback = null;

  function locationLabel(loc) {
    return [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
  }

  function init(onSelect) {
    onSelectCallback = onSelect;
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    const list = document.getElementById('search-suggestions');

    const runSearch = U.debounce(async (query) => {
      if (!query || query.trim().length < 2) { hideSuggestions(); return; }
      try {
        currentResults = await window.CBWeather.geocode(query.trim());
        renderSuggestions(currentResults);
      } catch (err) {
        console.error('Geocode failed', err);
      }
    }, 350);

    input.addEventListener('input', () => {
      clearBtn.classList.toggle('hidden', !input.value);
      runSearch(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (list.classList.contains('hidden')) return;
      const items = list.querySelectorAll('li');
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); highlight(items); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); highlight(items); }
      else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0) selectResult(currentResults[activeIndex]); }
      else if (e.key === 'Escape') { hideSuggestions(); }
    });

    clearBtn.addEventListener('click', () => {
      input.value = ''; clearBtn.classList.add('hidden'); hideSuggestions(); input.focus();
    });

    document.getElementById('search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (currentResults[0]) selectResult(currentResults[0]);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-form')) hideSuggestions();
    });

    document.getElementById('locate-btn').addEventListener('click', useMyLocation);
  }

  function highlight(items) {
    items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
    if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function renderSuggestions(results) {
    const list = document.getElementById('search-suggestions');
    activeIndex = -1;
    if (!results.length) {
      list.innerHTML = `<li class="muted">No matching locations found</li>`;
      list.classList.remove('hidden');
      return;
    }
    list.innerHTML = results.map((r, i) => `
      <li role="option" data-index="${i}">
        <span>${U.escapeHTML(r.name)}</span>
        <span class="sug-sub">${U.escapeHTML([r.admin1, r.country].filter(Boolean).join(', '))}</span>
      </li>
    `).join('');
    list.querySelectorAll('li[data-index]').forEach(li => {
      li.addEventListener('click', () => selectResult(results[Number(li.dataset.index)]));
    });
    list.classList.remove('hidden');
  }

  function hideSuggestions() {
    document.getElementById('search-suggestions').classList.add('hidden');
  }

  function selectResult(loc) {
    if (!loc) return;
    document.getElementById('search-input').value = locationLabel(loc);
    document.getElementById('clear-search').classList.remove('hidden');
    hideSuggestions();
    onSelectCallback && onSelectCallback(loc);
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      U.showToast("Your browser doesn't support geolocation.");
      return;
    }
    U.showToast('Locating you…', 2000);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const loc = await window.CBWeather.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        onSelectCallback && onSelectCallback(loc);
      } catch (err) {
        console.error(err);
        U.showToast('Could not determine your location name.');
      }
    }, (err) => {
      console.error(err);
      U.showToast('Location access was denied or unavailable.');
    }, { enableHighAccuracy: false, timeout: 10000 });
  }

  function renderSavedAndRecent() {
    const { favorites, recents, location } = window.CBState.state;
    const favWrap = document.getElementById('saved-locations');
    const recentWrap = document.getElementById('recent-searches');

    favWrap.innerHTML = favorites.length ? favorites.map(chip).join('') :
      `<p class="muted small">No saved locations yet. Tap the star next to a location to save it.</p>`;

    const recentFiltered = recents.filter(r => !favorites.some(f => window.CBState.locationKey(f) === window.CBState.locationKey(r)));
    recentWrap.innerHTML = recentFiltered.length ? recentFiltered.map(chip).join('') :
      `<p class="muted small">No recent searches.</p>`;

    function chip(loc) {
      const key = window.CBState.locationKey(loc);
      return `
        <div class="place-chip" data-key="${key}">
          <span>${U.escapeHTML(locationLabel(loc))}</span>
          <button type="button" aria-label="Remove">✕</button>
        </div>
      `;
    }

    [favWrap, recentWrap].forEach(wrap => {
      wrap.querySelectorAll('.place-chip').forEach(chipEl => {
        const key = chipEl.dataset.key;
        const loc = [...favorites, ...recents].find(l => window.CBState.locationKey(l) === key);
        chipEl.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') return;
          onSelectCallback && onSelectCallback(loc);
        });
        chipEl.querySelector('button').addEventListener('click', () => {
          if (favorites.some(f => window.CBState.locationKey(f) === key)) {
            window.CBState.removeFavorite(loc);
          } else {
            window.CBState.state.recents = window.CBState.state.recents.filter(r => window.CBState.locationKey(r) !== key);
            U.saveJSON(window.CB_CONFIG.STORAGE_KEYS.recents, window.CBState.state.recents);
            renderSavedAndRecent();
          }
        });
      });
    });
  }

  return { init, selectResult, renderSavedAndRecent, locationLabel, useMyLocation };
})();
