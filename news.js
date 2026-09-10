/* =========================================================================
   NEWS MODULE — free, key-less news via Google News RSS converted to JSON
   by rss2json.com. No fake/hard-coded articles: if the feed fails or is
   empty, we say so instead of inventing content.
   ========================================================================= */
window.CBNews = (function () {
  const U = window.CBUtils;
  const CFG = window.CB_CONFIG;

  function buildQuery(categoryId, locationName) {
    const cat = window.CB_NEWS_CATEGORIES.find(c => c.id === categoryId) || window.CB_NEWS_CATEGORIES[1];
    if (categoryId === 'local' && locationName) {
      return `${locationName} weather`;
    }
    return cat.query;
  }

  async function fetchNews(categoryId, locationName) {
    const query = buildQuery(categoryId, locationName);
    const rssUrl = `${CFG.NEWS_RSS_BASE}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const apiUrl = `${CFG.RSS_TO_JSON}?rss_url=${encodeURIComponent(rssUrl)}&count=12`;
    const data = await U.fetchJSON(apiUrl);
    if (data.status !== 'ok') throw new Error('News feed unavailable');
    return (data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      source: item.author || (data.feed && data.feed.title) || 'News',
      pubDate: item.pubDate,
      summary: stripHTML(item.description).slice(0, 160),
      image: item.thumbnail || extractImage(item.description) || null
    }));
  }

  function stripHTML(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function extractImage(html) {
    if (!html) return null;
    const match = html.match(/<img[^>]+src="([^"]+)"/i);
    return match ? match[1] : null;
  }

  function renderFilters(activeId, onSelect) {
    const wrap = document.getElementById('news-filters');
    wrap.innerHTML = window.CB_NEWS_CATEGORIES.map(c =>
      `<button type="button" class="news-filter-btn ${c.id === activeId ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`
    ).join('');
    wrap.querySelectorAll('.news-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => onSelect(btn.dataset.cat));
    });
  }

  function renderFeed(articles) {
    const feed = document.getElementById('news-feed');
    if (!articles || !articles.length) {
      feed.innerHTML = `<p class="muted">No news articles could be found for this category right now.</p>`;
      return;
    }
    feed.innerHTML = articles.map(a => `
      <article class="news-card">
        ${a.image ? `<img class="news-img" src="${U.escapeHTML(a.image)}" alt="" loading="lazy">` : ''}
        <h3 class="news-headline">${U.escapeHTML(a.title)}</h3>
        <div class="news-meta">${U.escapeHTML(a.source)} · ${U.timeAgo(a.pubDate)}</div>
        ${a.summary ? `<p class="news-summary">${U.escapeHTML(a.summary)}…</p>` : ''}
        <a class="news-link" href="${U.escapeHTML(a.link)}" target="_blank" rel="noopener">Read more →</a>
      </article>
    `).join('');
  }

  function renderError() {
    document.getElementById('news-feed').innerHTML =
      `<p class="muted">News couldn't be loaded right now (the feed may be rate-limited). Try again shortly.</p>`;
  }

  return { fetchNews, renderFilters, renderFeed, renderError };
})();
