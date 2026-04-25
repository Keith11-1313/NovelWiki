// the main logic for the wiki page (wiki.html)
// handles routing between sections, the sidebar, search, notes, and chapter tracking
// requires utils.js, store.js, genre.js, search.js, and render.js to be loaded first
// DOMPurify also needs to be loaded from CDN for the html sanitizer

// sanitizes rendered html before inserting it into the dom
// uses dompurify if available, falls back to a basic manual filter
function sanitizeHtml(html) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['onclick', 'oninput', 'onchange', 'data-page', 'data-theme',
                 'data-searchable', 'data-filters', 'data-filter-char-role',
                 'data-filterCharRole'],
      FORCE_BODY: false
    });
  }
  // manual fallback: strips script tags and dangerous event attributes
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


// ----- ROUTER -----
// handles hash-based navigation between wiki sections
// e.g. #characters, #characters/some-character-id
const Router = {
  novel: null,

  // sets up the hash listener and resolves the initial route
  init(novel) {
    this.novel = novel;
    window.addEventListener('hashchange', () => this._resolve());
    this._resolve();
  },

  // navigates to a section by setting the url hash
  go(hash) { location.hash = hash; },

  // reads the current hash and renders the matching page
  _resolve() {
    const raw   = location.hash.replace('#', '') || 'overview';
    const parts = raw.split('/');
    const page  = parts[0];
    const id    = parts[1] || null;

    this._setActive(page);
    this._setBreadcrumb(page, id);
    this._render(page, id);

    // close the sidebar on mobile when navigating
    if (window.innerWidth <= 900) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop')?.classList.remove('open');
    }
    window.scrollTo(0, 0);
    closeSearchDropdown();
  },

  // calls the right render function from render.js based on the page name
  _render(page, id) {
    const n   = this.novel;
    const out = document.getElementById('content');

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

    requestAnimationFrame(() => out.classList.add('content-visible'));
  },

  // highlights the active nav item in the sidebar
  _setActive(page) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  },

  // updates the breadcrumb header and document title when the page changes
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


// ----- SIDEBAR -----
// builds the sidebar navigation based on which modules apply to the current genre
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

  // maps module ids to the novel data keys so we can show counts on the nav items
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


// ----- SEARCH -----
// live search dropdown that shows as the user types in the search box
let _searchDropdownOpen = false;

// debounced so it doesnt hit the search index on every single keypress
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

  // store results so keyboard navigation can reference them by index
  Search.setResults(results);

  dropdown.classList.add('open');
  _searchDropdownOpen = true;
}, 150);

function handleSearchInput(e) {
  _doLiveSearch(e.target.value.trim());
}

// pressing enter goes to the full search results page
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

// closes dropdown when clicking anywhere outside the search area
document.addEventListener('click', e => {
  if (!e.target.closest('#search-input') && !e.target.closest('#search-dropdown')) {
    closeSearchDropdown();
  }
});


// ----- MOBILE SIDEBAR -----
// toggles the sidebar slide-in on small screens
function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const bd  = document.getElementById('sidebar-backdrop');
  const open = sb.classList.toggle('open');
  bd?.classList.toggle('open', open);
}

// tapping the backdrop closes the sidebar
document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
});


// ----- KEYBOARD SHORTCUTS -----
document.addEventListener('keydown', e => {
  // press / to focus the search bar (common wiki shortcut)
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
  }
  // esc closes any open modal or panel
  if (e.key === 'Escape') {
    closeSettings();
    closeSearchDropdown();
    closeNoteModal();
    closeChapterModal();
  }
});


// ----- NOTES PER ENTITY -----
// lets users save personal notes on any character, technique, etc.
let _noteEntityId  = null;
let _currentNovelId_wiki = null; // set during init

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

// close the note modal when clicking outside it
document.getElementById('note-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('note-modal')) closeNoteModal();
});


// ----- CHAPTER TRACKER -----
// saves what chapter the user is currently reading
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


// ----- PRINT -----
function printPage() { window.print(); }


// ----- INIT -----
// loads the novel and sets everything up
// falls back to the data/ folder if the novel isnt in localStorage
(async function init() {
  const id = Store.getCurrentId();
  if (!id) { location.href = 'index.html'; return; }

  // try localStorage first, then fetch from data/ folder
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

  // attach meta info so render.js can read the cover url
  const fallbacks = Store.getCoverFallbacks(id);
  novel.__meta = { id };

  Store.trackView(id);

  // apply the genre accent color first (may be overridden later by the cover image color)
  Genre.applyAccent(novel.novel?.type);

  // populate the sidebar header text
  document.getElementById('sb-title').textContent = novel.novel?.title || 'Novel';
  document.getElementById('sb-genre').textContent = (novel.novel?.type || '').replace(/-/g, ' ');

  buildSidebar(novel);
  Search.build(novel);

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearch);
  }

  Router.init(novel);

  // show the chapter in the tooltip if user has progress saved
  const progress = Store.getProgress(id);
  if (progress.chapter) {
    const chBtn = document.getElementById('wiki-chapter-btn');
    if (chBtn) chBtn.title = `Reading: ${progress.chapter}`;
  }

  // async: find the working cover url and extract the accent color from it
  (async () => {
    let workingCover = null;
    for (const url of fallbacks) {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (r.ok) { workingCover = url; break; }
      } catch (_) {}
    }
    if (!workingCover) return;

    // store the cover url so the overview page can reference it
    novel.__meta._coverUrl = workingCover;

    const color = await Store.extractAccentFromImage(workingCover);
    if (!color) return;

    // override the genre accent with a color pulled from the actual cover image
    const root = document.documentElement;
    root.style.setProperty('--accent', `rgb(${color.r},${color.g},${color.b})`);
    root.style.setProperty('--accent-rgb', `${color.r},${color.g},${color.b}`);
    root.style.setProperty('--accent-hover', `rgb(${Math.min(color.r+30,255)},${Math.min(color.g+30,255)},${Math.min(color.b+30,255)})`);

    // re-render the current section so it picks up the new accent color
    if (typeof Router !== 'undefined' && Router.current) {
      Router.go(Router.current, true);
    }
  })();
})();
