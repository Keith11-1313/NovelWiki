/* library.js — Library page logic (extracted from index.html)
   Requires: utils.js, store.js, github.js loaded before this file.
*/

/* ── Genre maps ── */
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

let allNovels = [];
let _crossSearchMode = false;

/* ── Render the recently-viewed chip strip ── */
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

/* ── Render the novel grid ── */
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

  grid.innerHTML = novels.map(n => {
    const color = genreColors[n.type] || '#f0a500';
    const icon  = genreIcons[n.type]  || 'bi-book';
    const s     = n.stats || {};
    return `
      <div class="novel-card" data-type="${Utils.escapeHtml(n.type || '')}" data-title="${Utils.escapeHtml(n.title || '')}" onclick="openNovel('${n.id}')">
        <div class="novel-card-top" style="background:${color}"></div>
        <div class="novel-card-body">
          <div class="novel-card-title">${Utils.escapeHtml(n.title)}</div>
          <div class="novel-card-genre">
            <span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}44">
              <i class="bi ${icon}"></i>${Utils.escapeHtml((n.type || 'other').replace(/-/g, ' '))}
            </span>
            ${(n.genre_tags || []).slice(0, 2).map(t => `<span class="badge badge-muted">${Utils.escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="novel-card-stats">
            ${s.characters  ? `<span class="novel-stat"><i class="bi bi-people"></i>${s.characters} chars</span>`      : ''}
            ${s.arcs        ? `<span class="novel-stat"><i class="bi bi-diagram-3"></i>${s.arcs} arcs</span>`          : ''}
            ${s.techniques  ? `<span class="novel-stat"><i class="bi bi-lightning"></i>${s.techniques} techniques</span>` : ''}
            ${s.locations   ? `<span class="novel-stat"><i class="bi bi-map"></i>${s.locations} locations</span>`      : ''}
          </div>
          ${n.__lastViewed ? `<div class="novel-card-viewed"><i class="bi bi-clock"></i> ${Utils.timeAgo(n.__lastViewed)}</div>` : ''}
        </div>
        <div class="novel-card-actions">
          <a href="wiki.html?novel=${n.id}" class="btn btn-secondary btn-sm" onclick="event.stopPropagation()">
            <i class="bi bi-book-open"></i>Open Wiki
          </a>
          <button class="btn btn-ghost btn-sm" title="Export as JSON" aria-label="Export as JSON"
            onclick="event.stopPropagation(); downloadNovel('${n.id}', '${Utils.escapeHtml(n.title)}')">
            <i class="bi bi-download" aria-hidden="true"></i>
          </button>
          <button class="btn btn-publish btn-sm" title="Publish to GitHub" aria-label="Publish to GitHub"
            onclick="event.stopPropagation(); openPublish('${n.id}', '${Utils.escapeHtml(n.title)}')">
            <i class="bi bi-cloud-upload" aria-hidden="true"></i>
          </button>
          <button class="btn btn-ghost btn-sm" title="Edit novel" aria-label="Edit novel"
            onclick="event.stopPropagation(); editNovel('${n.id}')">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn-danger btn-sm" title="Delete novel" aria-label="Delete novel"
            onclick="event.stopPropagation(); deleteNovel('${n.id}', '${Utils.escapeHtml(n.title)}')">
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

/* ── Filter by search + genre ── */
function filterLibrary() {
  const q     = document.getElementById('lib-search').value.toLowerCase().trim();
  const genre = document.getElementById('lib-genre').value;

  if (_crossSearchMode && q.length >= 2) {
    searchAllNovels(q);
    return;
  }

  const filtered = allNovels.filter(n => {
    const matchTitle = n.title.toLowerCase().includes(q);
    const matchGenre = !genre || n.type === genre;
    return matchTitle && matchGenre;
  });
  renderLibrary(filtered);
}

/* ── Cross-novel full-text search ── */
function searchAllNovels(q) {
  if (!q || q.length < 2) { renderLibrary(allNovels); return; }
  const term    = q.toLowerCase();
  const matched = [];

  allNovels.forEach(meta => {
    if (meta.title.toLowerCase().includes(term)) {
      matched.push({ ...meta, _matchType: 'title' });
      return;
    }
    // Deep search — load full novel data
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

/* ── Toggle cross-novel search mode ── */
function toggleCrossSearch() {
  _crossSearchMode = !_crossSearchMode;
  const btn = document.getElementById('cross-search-btn');
  if (btn) {
    btn.classList.toggle('active', _crossSearchMode);
    btn.title = _crossSearchMode ? 'Searching all novel content (slow)' : 'Search all novels';
  }
  filterLibrary();
}

/* ── Navigation helpers ── */
function openNovel(id) {
  Store.trackView(id);
  location.href = `wiki.html?novel=${id}`;
}

function editNovel(id) { location.href = `import.html?edit=${id}`; }

/* ── Soft-delete with undo toast ── */
function deleteNovel(id, title) {
  if (!Store.softDeleteNovel(id)) return;
  allNovels = Store.getNovels();
  filterLibrary();
  renderRecentlyViewed();

  Utils.showToast(`"${title}" deleted`, 'warning', 6000, () => {
    Store.undoDelete(id);
    allNovels = Store.getNovels();
    filterLibrary();
    renderRecentlyViewed();
    Utils.showToast(`"${title}" restored`, 'success', 3000);
  });

  // Permanently delete after 30 seconds if not undone
  setTimeout(() => {
    const check = Store.getAllNovelsRaw().find(n => n.id === id);
    if (check && check.__deleted) Store.deleteNovel(id);
  }, 30000);
}

/* ── Export JSON download ── */
function downloadNovel(id, title) {
  const json = Store.exportJSON(id);
  if (!json) { Utils.showToast('Export failed: novel not found', 'error'); return; }
  const filename = title.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.json';
  Utils.downloadFile(filename, json);
  Utils.showToast(`Exported "${title}"`, 'success', 3000);
}

/* ── Storage quota warning ── */
function checkStorageQuota() {
  const usage = Store.getStorageUsage();
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


/* ════════════════════════════════════════
   GITHUB PUBLISH
═══════════════════════════════════════ */
let _publishNovelId = null;

function openPublish(novelId, novelTitle) {
  _publishNovelId = novelId;
  const cfg = Store.getPublishConfig(novelId);
  document.getElementById('pub-owner').value = cfg.owner || '';
  document.getElementById('pub-repo').value  = cfg.repo  || '';
  document.getElementById('pub-path').value  = cfg.path  || `data/${novelTitle.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.getElementById('pub-token').value = cfg.token || Store.getRememberedToken(novelId) || '';
  const rememberEl = document.getElementById('pub-remember');
  if (rememberEl) rememberEl.checked = !!Store.getRememberedToken(novelId);
  setPublishStatus('idle', "Fill in the fields above to publish your novel's data to GitHub.");
  const lastEl = document.getElementById('pub-last');
  if (cfg.lastPublished) {
    lastEl.innerHTML = `<i class="bi bi-clock"></i> Last published: ${Utils.formatDate(cfg.lastPublished)}` +
      (cfg.lastUrl ? ` &nbsp;<a href="${cfg.lastUrl}" target="_blank" rel="noopener">View on GitHub <i class="bi bi-box-arrow-up-right"></i></a>` : '');
    lastEl.classList.remove('hidden');
  } else {
    lastEl.classList.add('hidden');
  }
  document.getElementById('publish-overlay').classList.add('open');
}

function closePublish() {
  document.getElementById('publish-overlay').classList.remove('open');
  _publishNovelId = null;
}

function handlePublishOverlayClick(e) {
  if (e.target === document.getElementById('publish-overlay')) closePublish();
}

function setPublishStatus(state, msg) {
  const el = document.getElementById('pub-status');
  el.className = `publish-status ${state}`;
  const iconMap = { idle: 'bi-info-circle', loading: 'bi-arrow-repeat', success: 'bi-check-circle-fill', error: 'bi-exclamation-triangle-fill' };
  el.innerHTML = `<i class="bi ${iconMap[state]}"></i><span>${msg}</span>`;
}

async function doPublish() {
  const owner  = document.getElementById('pub-owner').value.trim();
  const repo   = document.getElementById('pub-repo').value.trim();
  const path   = document.getElementById('pub-path').value.trim();
  const token  = document.getElementById('pub-token').value.trim();
  const remember = document.getElementById('pub-remember')?.checked || false;

  if (!owner || !repo || !path || !token) {
    setPublishStatus('error', 'Please fill in all fields before publishing.'); return;
  }

  const btn = document.getElementById('pub-btn');
  btn.disabled = true;
  setPublishStatus('loading', 'Publishing to GitHub…');

  const novelData = Store.getNovel(_publishNovelId);
  if (!novelData) {
    setPublishStatus('error', 'Novel data not found in local storage.');
    btn.disabled = false; return;
  }

  const cfg    = { owner, repo, path, token, rememberToken: remember };
  const result = await GitHub.publish(novelData, cfg);
  btn.disabled = false;

  if (result.ok) {
    const now      = Date.now();
    const savedCfg = { ...cfg, lastPublished: now, lastUrl: result.url };
    Store.savePublishConfig(_publishNovelId, savedCfg);
    setPublishStatus('success', 'Published successfully!');
    const lastEl = document.getElementById('pub-last');
    lastEl.innerHTML = `<i class="bi bi-clock"></i> Last published: ${Utils.formatDate(now)}` +
      (result.url ? ` &nbsp;<a href="${result.url}" target="_blank" rel="noopener">View on GitHub <i class="bi bi-box-arrow-up-right"></i></a>` : '');
    lastEl.classList.remove('hidden');
  } else {
    setPublishStatus('error', `Publish failed: ${result.error}`);
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePublish(); closeSettings(); }
});


/* ════════════════════════════════════════
   INIT
═══════════════════════════════════════ */
(function init() {
  allNovels = Store.getNovels();
  renderLibrary(allNovels);
  renderRecentlyViewed();
  checkStorageQuota();

  /* Auto-open publish modal if redirected from wiki */
  const params = new URLSearchParams(location.search);
  const pubId  = params.get('publish');
  if (pubId) {
    const novel = allNovels.find(n => n.id === pubId);
    if (novel) setTimeout(() => openPublish(pubId, novel.title), 100);
  }
})();
