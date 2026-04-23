/* wiki.js — Wiki SPA logic (extracted from wiki.html)
   Requires: utils.js, store.js, github.js, genre.js, search.js, render.js loaded before this.
   DOMPurify must also be loaded (from CDN).
*/

/* ════════════════════════════════════════
   HTML SANITIZER (uses DOMPurify)
═══════════════════════════════════════ */
function sanitizeHtml(html) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['onclick', 'oninput', 'onchange', 'data-page', 'data-theme',
                 'data-searchable', 'data-filters', 'data-filter-char-role',
                 'data-filterCharRole'],
      FORCE_BODY: false
    });
  }
  /* Fallback (no DOMPurify): strip scripts and dangerous attributes */
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, iframe, object, embed').forEach(n => n.remove());
  const safeOnclick   = /^(event\.stopPropagation\(\);\s*)?(Router\.go|Search\.navigateByIndex|toggleSidebar|R\._switchTab|R\.listFilter)\(/;
  const safeAccordion = /^this\.parentElement\.classList\.toggle\('open'\)$/;
  template.content.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const raw  = attr.value.trim();
      if (name.startsWith('on')) {
        const allowed = name === 'onclick' && (safeOnclick.test(raw) || safeAccordion.test(raw));
        const allowedInput = (name === 'oninput' || name === 'onchange') && /^R\.(listFilter|_switchTab)/.test(raw);
        if (!allowed && !allowedInput) node.removeAttribute(attr.name);
        return;
      }
      if (raw.toLowerCase().startsWith('javascript:')) node.removeAttribute(attr.name);
    });
  });
  return template.innerHTML;
}


/* ════════════════════════════════════════
   ROUTER
═══════════════════════════════════════ */
const Router = {
  novel: null,

  init(novel) {
    this.novel = novel;
    window.addEventListener('hashchange', () => this._resolve());
    this._resolve();
  },

  go(hash) { location.hash = hash; },

  _resolve() {
    const raw   = location.hash.replace('#', '') || 'overview';
    const parts = raw.split('/');
    const page  = parts[0];
    const id    = parts[1] || null;

    this._setActive(page);
    this._setBreadcrumb(page, id);
    this._render(page, id);

    if (window.innerWidth <= 900) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop')?.classList.remove('open');
    }
    window.scrollTo(0, 0);
    closeSearchDropdown();
  },

  _render(page, id) {
    const n   = this.novel;
    const out = document.getElementById('content');

    /* Fade out */
    out.classList.remove('content-visible');

    try {
      let html = '';
      switch (page) {
        case 'overview':   html = R.overview(n);                                    break;
        case 'characters': html = id ? R.characterDetail(n, id) : R.characterList(n); break;
        case 'power':      html = R.powerSystem(n);                                  break;
        case 'floors':     html = R.floorRecords(n);                                 break;
        case 'loops':      html = R.regressionLoops(n);                              break;
        case 'status':     html = R.statusWindows(n);                                break;
        case 'techniques': html = id ? R.techniqueDetail(n, id) : R.techniqueList(n); break;
        case 'artifacts':  html = id ? R.artifactDetail(n, id)  : R.artifactList(n); break;
        case 'pills':      html = R.pillList(n);                                     break;
        case 'bloodlines': html = R.bloodlineList(n);                                break;
        case 'bestiary':   html = id ? R.beastDetail(n, id)    : R.bestiaryList(n); break;
        case 'locations':  html = id ? R.locationDetail(n, id) : R.locationList(n); break;
        case 'realms':     html = R.realmList(n);                                    break;
        case 'factions':   html = id ? R.factionDetail(n, id)  : R.factionList(n);  break;
        case 'events':     html = R.eventsList(n);                                   break;
        case 'arcs':       html = R.arcTimeline(n);                                  break;
        case 'lore':       html = R.loreList(n);                                     break;
        case 'glossary':   html = R.glossary(n);                                     break;
        case 'analysis':   html = R.analysis(n);                                     break;
        case 'search':     html = R.searchResults(n, id ? decodeURIComponent(id) : ''); break;
        default:           html = R.overview(n);
      }
      out.innerHTML = sanitizeHtml(html);
    } catch (e) {
      out.innerHTML = `<div class="empty-state">
        <i class="bi bi-exclamation-triangle"></i>
        <h3>Render Error</h3>
        <p>${Utils.escapeHtml(e.message)}</p>
      </div>`;
      console.error('Render error on page:', page, e);
    }

    /* Fade in */
    requestAnimationFrame(() => out.classList.add('content-visible'));
  },

  _setActive(page) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  },

  _setBreadcrumb(page, id) {
    const novel  = this.novel.novel || {};
    const labels = {
      overview: 'Overview', characters: 'Characters', power: 'Power System',
      floors: 'Floor Records', loops: 'Regression Loops', status: 'Status Windows',
      techniques: 'Techniques', artifacts: 'Artifacts', pills: 'Pills & Resources',
      bloodlines: 'Bloodlines', bestiary: 'Bestiary', locations: 'Locations',
      realms: 'Realms', factions: 'Factions', events: 'Battles & Events',
      arcs: 'Story Arcs', lore: 'Lore & Prophecies', glossary: 'Glossary',
      analysis: 'AI Analysis', search: 'Search'
    };
    document.getElementById('hdr-novel').textContent = novel.title || 'Novel';
    document.getElementById('hdr-sep').style.display  = '';
    document.getElementById('hdr-page').textContent   = labels[page] || page;
    document.title = `${labels[page] || page} — ${novel.title || 'Wiki'}`;
  }
};


/* ════════════════════════════════════════
   SIDEBAR BUILDER
═══════════════════════════════════════ */
function buildSidebar(novel) {
  const type    = novel.novel?.type || 'other';
  const modules = Genre.getModules(type);
  const nav     = document.getElementById('sb-nav');

  const sections = {
    novel:    { label: 'Novel',    icon: 'bi-book'      },
    world:    { label: 'World',    icon: 'bi-globe2'    },
    story:    { label: 'Story',    icon: 'bi-diagram-3' },
    analysis: { label: 'Analysis', icon: 'bi-cpu'       },
    genre:    { label: 'Extra',    icon: 'bi-puzzle'    },
  };

  const grouped = {};
  modules.forEach(m => {
    if (!grouped[m.section]) grouped[m.section] = [];
    grouped[m.section].push(m);
  });

  const countMap = {
    characters: 'characters', techniques: 'techniques', artifacts: 'artifacts',
    pills: 'pills_and_resources', bloodlines: 'bloodlines', bestiary: 'beasts_and_creatures',
    locations: 'locations', realms: 'realms_and_dimensions', factions: 'factions',
    events: 'battles_and_events', arcs: 'arcs', lore: 'prophecies_and_lore', glossary: 'terminology'
  };

  let html = '';
  Object.entries(grouped).forEach(([sec, items]) => {
    html += `<div class="sidebar-section-label">${sections[sec]?.label || sec}</div>`;
    items.forEach(m => {
      const key   = countMap[m.id];
      const count =
        m.id === 'floors'  ? (novel.power_system?.floor_records     || []).length :
        m.id === 'loops'   ? (novel.power_system?.regression_loops  || []).length :
        m.id === 'status'  ? (novel.characters || []).filter(c => c.system_stats).length :
        key ? (novel[key] || []).length : 0;
      html += `<a class="nav-item" data-page="${m.id}" onclick="Router.go('${m.id}')">
        <i class="bi ${m.icon}"></i>
        ${m.label}
        ${count > 0 ? `<span class="nav-badge">${count}</span>` : ''}
      </a>`;
    });
  });

  nav.innerHTML = html;
}


/* ════════════════════════════════════════
   SEARCH — live autocomplete
═══════════════════════════════════════ */
let _searchDropdownOpen = false;

const _doLiveSearch = Utils.debounce((q) => {
  if (!q || q.length < 2) { closeSearchDropdown(); return; }
  const results = Search.query(q).slice(0, 8);
  if (!results.length) { closeSearchDropdown(); return; }

  const dropdown = document.getElementById('search-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = results.map((r, i) => `
    <div class="search-drop-item" onclick="Search.navigateByIndex(${i}, '${Store.getCurrentId()}')">
      <i class="bi ${r.icon}"></i>
      <div class="search-drop-info">
        <div class="search-drop-name">${Search.highlight(r.name, q)}</div>
        ${r.snippet ? `<div class="search-drop-snip">${Search.highlight(r.snippet.slice(0, 60), q)}</div>` : ''}
      </div>
      <span class="search-drop-type">${r.type}</span>
    </div>`).join('');

  /* Store result set for keyboard navigation */
  Search.setResults(results);

  dropdown.classList.add('open');
  _searchDropdownOpen = true;
}, 150);

function handleSearchInput(e) {
  _doLiveSearch(e.target.value.trim());
}

function handleSearch(e) {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    if (q) Router.go(`search/${encodeURIComponent(q)}`);
    closeSearchDropdown();
  }
  if (e.key === 'Escape') closeSearchDropdown();
}

function closeSearchDropdown() {
  document.getElementById('search-dropdown')?.classList.remove('open');
  _searchDropdownOpen = false;
}

/* Close dropdown on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('#search-input') && !e.target.closest('#search-dropdown')) {
    closeSearchDropdown();
  }
});


/* ════════════════════════════════════════
   MOBILE SIDEBAR
═══════════════════════════════════════ */
function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const bd  = document.getElementById('sidebar-backdrop');
  const open = sb.classList.toggle('open');
  bd?.classList.toggle('open', open);
}

/* Close sidebar when clicking backdrop */
document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
});


/* ════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════ */
document.addEventListener('keydown', e => {
  /* / focuses search bar */
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
  }
  /* Esc closes modals */
  if (e.key === 'Escape') {
    closeSettings();
    closeSearchDropdown();
    closeNoteModal();
    closeChapterModal();
  }
});


/* ════════════════════════════════════════
   NOTES PER ENTITY
═══════════════════════════════════════ */
let _noteEntityId  = null;
let _currentNovelId_wiki = null; // set by init()

function openNoteModal(entityId, entityName) {
  _noteEntityId = entityId;
  const text = Store.getNote(_currentNovelId_wiki, entityId);
  const modal = document.getElementById('note-modal');
  const title = document.getElementById('note-modal-title');
  const ta    = document.getElementById('note-textarea');
  if (!modal || !ta) return;
  if (title) title.textContent = `Notes — ${entityName || entityId}`;
  ta.value = text;
  modal.classList.add('open');
  ta.focus();
}

function saveNote() {
  const ta = document.getElementById('note-textarea');
  if (!ta || !_noteEntityId) return;
  Store.saveNote(_currentNovelId_wiki, _noteEntityId, ta.value);
  closeNoteModal();
  Utils.showToast('Note saved', 'success', 2500);
}

function closeNoteModal() {
  document.getElementById('note-modal')?.classList.remove('open');
  _noteEntityId = null;
}

document.getElementById('note-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('note-modal')) closeNoteModal();
});


/* ════════════════════════════════════════
   CHAPTER TRACKER
═══════════════════════════════════════ */
function openChapterModal() {
  const progress = Store.getProgress(_currentNovelId_wiki);
  const modal    = document.getElementById('chapter-modal');
  if (!modal) return;
  document.getElementById('chapter-input').value  = progress.chapter  || '';
  document.getElementById('chapter-notes').value  = progress.notes    || '';
  if (progress.updatedAt) {
    document.getElementById('chapter-updated').textContent = `Last updated: ${Utils.formatDate(progress.updatedAt)}`;
  }
  modal.classList.add('open');
}

function saveChapter() {
  const chapter = document.getElementById('chapter-input')?.value.trim() || '';
  const notes   = document.getElementById('chapter-notes')?.value        || '';
  Store.saveProgress(_currentNovelId_wiki, { chapter, notes });
  closeChapterModal();
  Utils.showToast('Progress saved', 'success', 2500);
}

function closeChapterModal() {
  document.getElementById('chapter-modal')?.classList.remove('open');
}

document.getElementById('chapter-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('chapter-modal')) closeChapterModal();
});


/* ════════════════════════════════════════
   PRINT PAGE
═══════════════════════════════════════ */
function printPage() { window.print(); }



/* ════════════════════════════════════════
   INIT (async — supports data-folder fallback)
═══════════════════════════════════════ */
(async function init() {
  const id = Store.getCurrentId();
  if (!id) { location.href = 'index.html'; return; }

  /* Try localStorage first, then fall back to data/ folder */
  let novel = Store.getNovel(id);
  if (!novel) {
    try {
      const base = Store._dataBase();
      const resp = await fetch(`${base}data/${id}.json`);
      if (resp.ok) {
        const data = await resp.json();
        Store.saveNovel(data, id);
        novel = Store.getNovel(id);
      }
    } catch (_) {}
  }

  if (!novel) {
    document.getElementById('content').innerHTML = `
      <div class="empty-state">
        <i class="bi bi-exclamation-triangle"></i>
        <h3>Novel Not Found</h3>
        <p>This novel was not found in your library.</p>
        <a href="index.html" class="btn btn-primary mt-16"><i class="bi bi-arrow-left"></i>Back to Library</a>
      </div>`;
    return;
  }

  _currentNovelId_wiki    = id;
  window._currentNovelId  = id;

  /* Attach meta so render.js can read cover/source info */
  const fallbacks = Store.getCoverFallbacks(id);
  const nuUrl     = Store.getNovelUpdatesUrl(novel.novel?.title);
  novel.__meta = { id, _sourceUrl: nuUrl };

  /* Track this view */
  Store.trackView(id);

  /* Apply genre accent first (will be overridden by image color if found) */
  Genre.applyAccent(novel.novel?.type);

  /* Sidebar info */
  document.getElementById('sb-title').textContent = novel.novel?.title || 'Novel';
  document.getElementById('sb-genre').textContent = (novel.novel?.type || '').replace(/-/g, ' ');

  /* Build sidebar nav */
  buildSidebar(novel);

  /* Build search index */
  Search.build(novel);

  /* Hook up live search input */
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearch);
  }

  /* Start router */
  Router.init(novel);

  /* Show chapter tracker progress badge if data exists */
  const progress = Store.getProgress(id);
  if (progress.chapter) {
    const chBtn = document.getElementById('wiki-chapter-btn');
    if (chBtn) chBtn.title = `Reading: ${progress.chapter}`;
  }

  /* ── Async: find working cover URL, then extract accent color ── */
  (async () => {
    let workingCover = null;
    for (const url of fallbacks) {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (r.ok) { workingCover = url; break; }
      } catch (_) {}
    }
    if (!workingCover) return;

    /* Attach found cover to __meta so router can re-render overview with correct URL */
    novel.__meta._coverUrl = workingCover;

    const color = await Store.extractAccentFromImage(workingCover);
    if (!color) return;

    /* Apply dynamic accent */
    const root = document.documentElement;
    root.style.setProperty('--accent', `rgb(${color.r},${color.g},${color.b})`);
    root.style.setProperty('--accent-rgb', `${color.r},${color.g},${color.b}`);
    root.style.setProperty('--accent-hover', `rgb(${Math.min(color.r+30,255)},${Math.min(color.g+30,255)},${Math.min(color.b+30,255)})`);

    /* Re-render current page to pick up the new accent */
    if (typeof Router !== 'undefined' && Router.current) {
      Router.go(Router.current, true);
    }
  })();
})();
