// powers the main library page (index.html)
// loads novels from both the data/ folder and localStorage then renders them as cards
// requires utils.js and store.js to be loaded first

// color and icon for each genre type, used on the novel cards
const genreColors = {
  cultivation: '#f0a500', tower: '#58a6ff', regression: '#f78166',
  system: '#3fb950', isekai: '#bc8cff', fantasy: '#db61a2',
  'sci-fi': '#39d0d8', 'light-novel': '#8b949e', 'web-novel': '#8b949e', other: '#f0a500'
};
const genreIcons = {
  cultivation: 'bi-fire', tower: 'bi-layers', regression: 'bi-arrow-counterclockwise',
  system: 'bi-hdd-stack', isekai: 'bi-globe2', fantasy: 'bi-stars',
  'sci-fi': 'bi-cpu', 'light-novel': 'bi-book', 'web-novel': 'bi-book', other: 'bi-collection'
};

let allNovels  = [];   // combined list from data folder + localStorage
let _dataNovels = [];  // tracks which novels came from the data/ folder
let _crossSearchMode = false;
let _sortMode = 'default'; // current sort: 'default' | 'az' | 'za' | 'chars' | 'recent'

// applies the current sort mode to a list and returns a new sorted copy
function applySortToList(list) {
  const copy = [...list];
  switch (_sortMode) {
    case 'az':    return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'za':    return copy.sort((a, b) => b.title.localeCompare(a.title));
    case 'chars': return copy.sort((a, b) => (b.stats?.characters || 0) - (a.stats?.characters || 0));
    case 'recent': return copy.sort((a, b) => (b._importedAt || 0) - (a._importedAt || 0));
    default:      return copy; // 'default' = original load order
  }
}

// called by the sort <select> in the toolbar
function sortLibrary(mode) {
  _sortMode = mode;
  filterLibrary();
}

// renders the "recently opened" chip strip above the library grid
function renderRecentlyViewed() {
  const container = document.getElementById('recently-viewed');
  if (!container) return;
  const recent = Store.getRecentViews();
  if (!recent.length) { container.style.display = 'none'; return; }
  container.style.display = '';
  container.innerHTML = `
    <div class="rv-label"><i class="bi bi-clock-history"></i> Recently Opened</div>
    <div class="rv-chips">
      ${recent.map(r => `
        <a class="rv-chip" href="wiki.html?novel=${Utils.escapeHtml(r.id)}" title="${Utils.escapeHtml(r.title)}">
          <span class="rv-chip-dot" style="background:${genreColors[r.type] || '#f0a500'}"></span>
          <span class="rv-chip-title">${Utils.escapeHtml(r.title)}</span>
          <span class="rv-chip-time">${Utils.timeAgo(r.viewedAt)}</span>
        </a>`).join('')}
    </div>`;
}

// renders the novel cards in the grid
function renderLibrary(novels) {
  const grid  = document.getElementById('novel-grid');
  const empty = document.getElementById('lib-empty');
  document.getElementById('lib-count').textContent = `${novels.length} novel${novels.length !== 1 ? 's' : ''}`;

  if (!novels.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = novels.map((n, idx) => {
    const color    = genreColors[n.type] || '#f0a500';
    const icon     = genreIcons[n.type]  || 'bi-book';
    const s        = n.stats || {};
    const id       = n.id;

    // build cover image with multiple format fallbacks
    const fallbacks = Store.getCoverFallbacks(id);
    const fb1 = fallbacks[1] || '';
    const fb2 = fallbacks[2] || '';
    const fb3 = fallbacks[3] || '';

    const statsHtml = [
      s.characters  ? `<span class="novel-stat"><i class="bi bi-people"></i>${s.characters} chars</span>`      : '',
      s.arcs        ? `<span class="novel-stat"><i class="bi bi-diagram-3"></i>${s.arcs} arcs</span>`          : '',
      s.techniques  ? `<span class="novel-stat"><i class="bi bi-lightning"></i>${s.techniques} tech</span>`    : '',
      s.locations   ? `<span class="novel-stat"><i class="bi bi-map"></i>${s.locations} loc</span>`            : '',
    ].filter(Boolean).slice(0, 3).join('');

    return `
      <div class="novel-card fade-in-up" style="--i:${(idx % 8) + 1}" data-type="${Utils.escapeHtml(n.type || '')}" data-title="${Utils.escapeHtml(n.title || '')}" onclick="openNovel('${n.id}')">
        <div class="novel-card-cover-wrap">
          <img
            src="${fallbacks[0]}"
            alt=""
            onerror="
              var f=['${fb1}','${fb2}','${fb3}'];
              var i=this.dataset.fi=parseInt(this.dataset.fi||0)+1;
              if(f[i-1])this.src=f[i-1];else this.style.display='none';
            "
          >
          <div class="novel-card-overlay"></div>
          <div class="novel-card-genre-badge">
            <span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}44;backdrop-filter:blur(12px)">
              <i class="bi ${icon}"></i>${Utils.escapeHtml((n.type || 'other').replace(/-/g, ' '))}
            </span>
          </div>
          <div class="novel-card-info">
            <div class="novel-card-title">${Utils.escapeHtml(n.title)}</div>
            <div class="novel-card-stats">${statsHtml}</div>
          </div>
        </div>
        <div class="novel-card-actions">
          <a href="wiki.html?novel=${n.id}" class="btn btn-secondary btn-sm" style="flex:1;justify-content:center" onclick="event.stopPropagation()">
            <i class="bi bi-book-open"></i>Open Wiki
          </a>
          <button class="btn btn-ghost btn-sm" title="Export" onclick="event.stopPropagation(); downloadNovel('${n.id}', '${Utils.escapeHtml(n.title)}')">
            <i class="bi bi-download"></i>
          </button>
          ${!n._fromDataFolder ? `
          <button class="btn btn-ghost btn-sm" title="Edit" onclick="event.stopPropagation(); editNovel('${n.id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-danger btn-sm" title="Delete" onclick="event.stopPropagation(); deleteNovel('${n.id}', '${Utils.escapeHtml(n.title)}')">
            <i class="bi bi-trash"></i>
          </button>` : ''}
        </div>
      </div>`;
  }).join('');
}

// filters the grid by search text and selected genre
function filterLibrary() {
  const q     = document.getElementById('lib-search').value.toLowerCase().trim();
  const genre = document.getElementById('lib-genre').value;

  // if cross-search mode is on and there's enough text, do a deep content search instead
  if (_crossSearchMode && q.length >= 2) {
    searchAllNovels(q);
    return;
  }

  const filtered = allNovels.filter(n => {
    const matchTitle = n.title.toLowerCase().includes(q);
    const matchGenre = !genre || n.type === genre;
    return matchTitle && matchGenre;
  });
  renderLibrary(applySortToList(filtered));
}

// searches across all novels' full content, not just titles
// this is the slow mode since it reads full novel data from localStorage for each
function searchAllNovels(q) {
  if (!q || q.length < 2) { renderLibrary(allNovels); return; }
  const term    = q.toLowerCase();
  const matched = [];

  allNovels.forEach(meta => {
    if (meta.title.toLowerCase().includes(term)) {
      matched.push({ ...meta, _matchType: 'title' });
      return;
    }
    const data = Store.getNovel(meta.id);
    if (!data) return;

    const searchable = [
      meta.title,
      meta.summary || '',
      ...(data.characters || []).map(c => [c.name, ...(c.aliases || []), c.description || ''].join(' ')),
      ...(data.techniques  || []).map(t => [t.name, t.description || ''].join(' ')),
      ...(data.locations   || []).map(l => [l.name, l.description || ''].join(' ')),
      ...(data.factions    || []).map(f => [f.name, f.description || ''].join(' ')),
    ].join(' ').toLowerCase();

    if (searchable.includes(term)) matched.push({ ...meta, _matchType: 'content' });
  });

  renderLibrary(matched);
}

// toggles the cross-novel search mode on/off
function toggleCrossSearch() {
  _crossSearchMode = !_crossSearchMode;
  const btn = document.getElementById('cross-search-btn');
  if (btn) {
    btn.classList.toggle('active', _crossSearchMode);
    btn.title = _crossSearchMode ? 'Searching all novel content (slow)' : 'Search all novels';
  }
  filterLibrary();
}

// navigation helpers
function openNovel(id) {
  Store.trackView(id);
  location.href = `wiki.html?novel=${id}`;
}
function editNovel(id) { location.href = `import.html?edit=${id}`; }

// soft-deletes and shows an undo toast for 6 seconds
// after that it permanently removes the novel
function deleteNovel(id, title) {
  if (!Store.softDeleteNovel(id)) return;
  allNovels = allNovels.filter(n => n.id !== id);
  filterLibrary();
  renderRecentlyViewed();

  Utils.showToast(`"${title}" deleted`, 'warning', 6000, () => {
    Store.undoDelete(id);
    allNovels = [..._dataNovels, ...Store.getNovels()];
    filterLibrary();
    renderRecentlyViewed();
    Utils.showToast(`"${title}" restored`, 'success', 3000);
  });

  // permanently delete after the toast timeout if undo wasnt clicked
  setTimeout(() => {
    const check = Store.getAllNovelsRaw().find(n => n.id === id);
    if (check && check.__deleted) Store.deleteNovel(id);
  }, 30000);
}

// exports the novel as a downloadable json file
function downloadNovel(id, title) {
  let json = Store.exportJSON(id);
  if (!json) {
    Utils.showToast('Export failed: novel not found', 'error'); return;
  }
  const filename = title.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.json';
  Utils.downloadFile(filename, json);
  Utils.showToast(`Exported "${title}"`, 'success', 3000);
}

// checks if localStorage is getting full and shows a warning banner
function checkStorageQuota() {
  const usage  = Store.getStorageUsage();
  const banner = document.getElementById('storage-warning');
  if (!banner) return;
  if (usage.warning) {
    const usedMB = (usage.usedBytes / (1024 * 1024)).toFixed(1);
    banner.innerHTML = `
      <i class="bi bi-exclamation-triangle-fill"></i>
      <strong>Storage ${usage.percent}% full</strong> (${usedMB} MB used).
      Consider exporting and deleting older novels to free space.
    `;
    banner.style.display = '';
  } else {
    banner.style.display = 'none';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSettings();
});

// loads everything when the page opens
// fetches data folder novels first, then merges with localStorage novels
(async function init() {
  const grid = document.getElementById('novel-grid');
  if (grid) {
    // Show 4 skeleton cards while data loads
    grid.innerHTML = Array.from({ length: 4 }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-cover"></div>
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>`).join('');
  }

  // load novels from the data/ folder (pre-made ones that ship with the project)
  const fetched = await Store.fetchDataFolderNovels();
  _dataNovels = fetched.map(({ manifest, data }) => {
    const novel = data.novel || {};
    const id    = manifest.id;

    // save to localStorage so wiki.js can load it later by id
    Store.saveNovel(data, id);

    return {
      id,
      title:      novel.title      || id,
      type:       novel.type       || 'other',
      genre_tags: novel.genre_tags || [],
      summary:    novel.summary    || '',
      world_name: novel.world_name || '',
      stats: {
        characters: (data.characters          || []).length,
        techniques: (data.techniques          || []).length,
        artifacts:  (data.artifacts           || []).length,
        locations:  (data.locations           || []).length,
        factions:   (data.factions            || []).length,
        beasts:     (data.beasts_and_creatures || []).length,
        arcs:       (data.arcs                || []).length,
        events:     (data.battles_and_events  || []).length,
      },
      _fromDataFolder: true,
      _coverUrl: Store.getCoverUrl(id),
    };
  });

  // combine with localStorage novels, skip any that were already loaded from the data folder
  const dataIds    = new Set(_dataNovels.map(n => n.id));
  const localNovels = Store.getNovels().filter(n => !dataIds.has(n.id));

  allNovels = [..._dataNovels, ...localNovels];

  renderLibrary(allNovels);
  renderRecentlyViewed();
  checkStorageQuota();
})();
