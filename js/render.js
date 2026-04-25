/* render.js — all page renderers for the wiki SPA */

const R = {

  /* ══════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════ */

  arr: (v) => Array.isArray(v) ? v : [],
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  safe(v, fallback = '—') {
    const normalized = v === null || v === undefined ? '' : String(v);
    const value = normalized.trim() ? normalized : fallback;
    return this.escapeHtml(value);
  },
  html(value, fallback = '—') {
    const content = value === null || value === undefined || value === '' ? fallback : value;
    return { __html: content };
  },

  badge(text, cls) {
    if (!text) return '';
    const c = cls || ('badge-' + String(text).toLowerCase().replace(/[^a-z0-9]/g, ''));
    return `<span class="badge ${c}">${this.safe(text)}</span>`;
  },

  gradeBadge(grade) {
    if (!grade) return '';
    const g = grade.toLowerCase();
    const map = {
      common: 'badge-common', uncommon: 'badge-uncommon', low: 'badge-common',
      rare: 'badge-rare', mid: 'badge-uncommon', high: 'badge-rare',
      epic: 'badge-epic', king: 'badge-epic',
      legendary: 'badge-legendary', emperor: 'badge-legendary',
      mythic: 'badge-mythic', ancestral: 'badge-mythic',
      divine: 'badge-divine', immortal: 'badge-divine',
      ancient: 'badge-ancient', s: 'badge-divine', 'ss': 'badge-ancient'
    };
    const cls = Object.keys(map).find(k => g.includes(k));
    return `<span class="badge ${cls ? map[cls] : 'badge-muted'}">${this.safe(grade)}</span>`;
  },

  roleBadge(role) {
    const cls = { protagonist: 'badge-protagonist', antagonist: 'badge-antagonist', supporting: 'badge-supporting', minor: 'badge-minor' };
    return `<span class="badge ${cls[role] || 'badge-muted'}">${this.safe(role, '?')}</span>`;
  },

  statusBadge(status) {
    return `<span class="badge badge-${(status || 'unknown').toLowerCase()}">${this.safe(status, 'Unknown')}</span>`;
  },

  alignBadge(align) {
    return `<span class="badge badge-${(align || 'neutral').toLowerCase()}">${this.safe(align, 'Neutral')}</span>`;
  },

  charLink(novel, id) {
    if (!id) return '';
    const name = Store.charName(novel, id);
    return `<a class="link-tag" onclick="Router.go('characters/${id}')">${this.safe(name)}</a>`;
  },

  charLinks(novel, ids) {
    return this.arr(ids).map(id => this.charLink(novel, id)).join('');
  },

  navLink(hash, label) {
    return `<a class="link-tag link-tag-neutral" onclick="Router.go('${hash}')">${this.safe(label)}</a>`;
  },

  pills(items, cls = 'badge-muted') {
    return this.arr(items).map(i => `<span class="badge ${cls}">${this.safe(i)}</span>`).join('');
  },

  infoList(items, icon = 'bi-dot', cls = 'accent') {
    if (!items || !items.length) return '<span class="text-muted">—</span>';
    return `<ul class="info-list">${this.arr(items).map(i => `<li class="info-list-item ${cls}"><i class="bi ${icon}"></i><span>${this.safe(i)}</span></li>`).join('')
      }</ul>`;
  },

  section(title, icon, content) {
    return `<div class="mb-24">
      <div class="section-title"><i class="bi ${icon}"></i>${title}</div>
      ${content}
    </div>`;
  },

  accordion(title, icon, content, open = false) {
    return `<div class="accordion-item ${open ? 'open' : ''}">
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
        <i class="bi ${icon} acc-icon"></i>
        <span class="accordion-title">${title}</span>
        <i class="bi bi-chevron-down accordion-arrow"></i>
      </div>
      <div class="accordion-body">${content}</div>
    </div>`;
  },

  emptyState(title, msg, icon = 'bi-inbox') {
    return `<div class="empty-state"><i class="bi ${icon}"></i><h3>${title}</h3><p>${msg}</p></div>`;
  },

  filterBar(searchId, selects = []) {
    const sels = selects.map(s =>
      `<select class="filter-select" id="${s.id}" onchange="${s.fn}">
        <option value="">All ${s.label}</option>
        ${s.options.map(o => `<option value="${this.safe(o)}">${this.safe(o)}</option>`).join('')}
      </select>`).join('');
    return `<div class="filter-bar">
      <div class="filter-search"><i class="bi bi-search"></i>
        <input type="text" id="${searchId}" placeholder="Search..." oninput="R.listFilter('${searchId}')">
      </div>${sels}
    </div>`;
  },

  listFilter(inputId) {
    const q = document.getElementById(inputId).value.toLowerCase();
    document.querySelectorAll('[data-searchable]').forEach(el => {
      const matchesQuery = el.dataset.searchable.toLowerCase().includes(q);
      const filters = this.arr(el.dataset.filters?.split('|'));
      const matchesFilters = filters.every(filterId => {
        const control = document.getElementById(filterId);
        if (!control || !control.value) return true;
        const filterKey = 'filter' + filterId.replace(/(^|-)([a-z])/g, (_, __, char) => char.toUpperCase());
        return (el.dataset[filterKey] || '').toLowerCase() === control.value.toLowerCase();
      });
      el.style.display = matchesQuery && matchesFilters ? '' : 'none';
    });
  },

  detail(rows) {
    return `<table class="detail-table">${rows.filter(r => r[1] !== null && r[1] !== undefined && r[1] !== '').map(r =>
      `<tr><td>${this.safe(r[0])}</td><td>${this._detailValue(r[1])}</td></tr>`
    ).join('')
      }</table>`;
  },

  _detailValue(value) {
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, '__html')) {
      return value.__html;
    }
    return this.safe(value);
  },


  /* ══════════════════════════════════════
     OVERVIEW
  ═══════════════════════════════════════ */

  overview(novel) {
    const n = novel.novel || {};
    const modules = Genre.getModules(novel.novel.type);
    const stats = {
      Characters: (novel.characters || []).length,
      Techniques: (novel.techniques || []).length,
      Artifacts:  (novel.artifacts  || []).length,
      Beasts:     (novel.beasts_and_creatures || []).length,
      Locations:  (novel.locations  || []).length,
      Factions:   (novel.factions   || []).length,
      Arcs:       (novel.arcs       || []).length,
      Events:     (novel.battles_and_events || []).length,
    };

    const statBoxes = Object.entries(stats)
      .filter(([,v]) => v > 0)
      .map(([k, v]) => `<div class="stat-box"><div class="stat-box-value">${v}</div><div class="stat-box-label">${k}</div></div>`)
      .join('');

    const hubCards = modules.filter(m => m.id !== 'overview').map(m => {
      const count = this._moduleCount(novel, m.id);
      return `<a class="hub-card" onclick="Router.go('${m.id}')">
        <i class="bi ${m.icon}"></i>
        <span class="hub-card-label">${m.label}</span>
        ${count > 0 ? `<span class="hub-card-count">${count} entries</span>` : ''}
      </a>`;
    }).join('');

    const genreTag = n.type ? `<span class="badge badge-accent" style="font-size:12px;padding:5px 12px">${this.safe(n.type).replace(/-/g,' ')}</span>` : '';
    const themeTags = (n.themes || []).map(t => `<span class="badge badge-muted">${this.safe(t)}</span>`).join('');

    /* Cover image + NovelUpdates link */
    const novelId  = novel.__meta?.id || '';
    const coverUrl = novel.__meta?._coverUrl || null;
    const fallbacks = novelId ? Store.getCoverFallbacks(novelId) : [];

    const imgSrc = coverUrl || (fallbacks[0] || '');

    /* Build onerror chain for the hidden loader img: updates the hero bg on each fallback */
    const heroId = 'overview-hero-' + (novelId || 'main');
    const buildFallbackChain = (idx) => {
      if (idx >= fallbacks.length) return `document.getElementById('${heroId}').style.backgroundImage=''`;
      return `(function(){var el=document.getElementById('${heroId}');el.style.backgroundImage='url('+JSON.stringify('${fallbacks[idx]}')+')';this.src='${fallbacks[idx]}';this.onerror=function(){${buildFallbackChain(idx+1)}};})()`;
    };
    const loaderOnError = fallbacks.length > 1
      ? `(function(){var el=document.getElementById('${heroId}');el.style.backgroundImage='url('+JSON.stringify('${fallbacks[1]}')+')';this.src='${fallbacks[1]}';this.onerror=function(){${buildFallbackChain(2)}};}).call(this)`
      : `document.getElementById('${heroId}').style.backgroundImage=''`;

    const heroBgStyle = imgSrc
      ? `background-image:url('${imgSrc.replace(/'/g,"\\'")}');background-size:cover;background-position:center top;`
      : '';

    /* Hidden img just to drive fallback chain */
    const loaderImg = imgSrc ? `<img src="${imgSrc}" alt="" aria-hidden="true" onerror="${loaderOnError}" style="display:none;position:absolute">` : '';

    return `<div class="fade-in">
      <!-- World hero banner -->
      <div id="${heroId}" class="char-hero mb-24" style="position:relative;overflow:hidden;padding:0;${heroBgStyle}align-items:stretch;flex-direction:column;min-height:260px;">
        ${loaderImg}
        <!-- Dark overlay -->
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(5,7,15,.45) 0%,rgba(5,7,15,.82) 55%,rgba(5,7,15,.97) 100%),radial-gradient(circle at top right,rgba(var(--accent-rgb),.22),transparent 55%);pointer-events:none"></div>
        <!-- Content -->
        <div style="position:relative;z-index:1;padding:36px 32px;display:flex;flex-direction:column;gap:16px;width:100%;box-sizing:border-box">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;flex-wrap:wrap;gap:16px">
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin-bottom:8px">
                <i class="bi bi-globe2"></i>&nbsp;${this.safe(n.world_name, 'Unknown World')}
              </div>
              <div class="page-title" style="margin-bottom:8px;text-shadow:0 2px 12px rgba(0,0,0,.7)">${this.safe(n.title, 'Novel')}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${genreTag}${themeTags}</div>

            </div>
            <div class="stat-row" style="margin:0">${statBoxes}</div>
          </div>
          ${n.summary ? `<div style="font-size:14px;color:var(--text-secondary);line-height:1.8;max-width:820px;border-top:1px solid rgba(255,255,255,.08);padding-top:18px">${this.safe(n.summary)}</div>` : ''}
        </div>
      </div>

      <div class="section-title"><i class="bi bi-compass"></i>Navigate the Wiki</div>
      <div class="hub-grid">${hubCards}</div>
    </div>`;



  },

  _moduleCount(novel, id) {
    const map = {
      characters: 'characters', techniques: 'techniques', artifacts: 'artifacts',
      pills: 'pills_and_resources', bloodlines: 'bloodlines', bestiary: 'beasts_and_creatures',
      locations: 'locations', realms: 'realms_and_dimensions', factions: 'factions',
      events: 'battles_and_events', arcs: 'arcs', lore: 'prophecies_and_lore', glossary: 'terminology'
    };
    if (id === 'floors') return (novel.power_system?.floor_records || []).length;
    if (id === 'loops') return (novel.power_system?.regression_loops || []).length;
    if (id === 'status') return this.arr(novel.characters).filter(c => c.system_stats).length;
    const key = map[id];
    return key ? (novel[key] || []).length : 0;
  },


  /* ══════════════════════════════════════
     CHARACTERS
  ═══════════════════════════════════════ */

  characterList(novel) {
    const chars = this.arr(novel.characters);
    if (!chars.length) return this.emptyState('No Characters', 'Add novel data to see characters.', 'bi-people');

    const roles = [...new Set(chars.map(c => c.role).filter(Boolean))];
    const cards = chars.map(c => {
      const initials = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      return `<div class="card card-clickable" data-searchable="${this.safe(c.name)} ${this.safe((c.aliases || []).join(' '))} ${this.safe(c.role || '')}" data-filters="char-role" data-filterCharRole="${this.safe(c.role || '')}" onclick="Router.go('characters/${c.id}')">
        <div class="card-header">
          <div>
            <div class="card-title">${this.safe(c.name)}</div>
            <div class="card-meta">${this.arr(c.aliases).join(' · ') || '—'}</div>
          </div>
          <div style="width:44px;height:44px;border-radius:10px;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#000;flex-shrink:0">${initials}</div>
        </div>
        <div class="badge-row-scroll mb-8">
          ${this.roleBadge(c.role)} ${this.statusBadge(c.status)}
          ${c.current_power_level ? `<span class="badge badge-accent"><i class="bi bi-bar-chart-steps"></i>${c.current_power_level}</span>` : ''}
        </div>
        <div class="card-body">${(c.description || '').slice(0, 100)}${c.description?.length > 100 ? '...' : ''}</div>
      </div>`;
    }).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-people"></i>Characters</div>
      <div class="page-subtitle">${chars.length} characters found</div>
      ${this.filterBar('char-search', roles.length ? [{ id: 'char-role', label: 'Roles', fn: "R.listFilter('char-search')", options: roles }] : [])}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },

  characterDetail(novel, id) {
    const c = Store.findCharacter(novel, id);
    if (!c) return this.emptyState('Character Not Found', '', 'bi-person-x');

    const initials = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const progression = this.arr(c.power_progression).map((p, i, arr) => {
      const isCurrent = i === arr.length - 1;
      return `<div class="progression-item">
        <div class="progression-dot ${isCurrent ? 'current' : 'reached'}"></div>
        <span class="progression-stage">${p.stage}</span>
        <span class="progression-chapter">${p.chapter || ''}</span>
      </div>`;
    }).join('');

    const relationships = this.arr(c.relationships).map(r =>
      `<div class="relation-item">
        <span class="relation-type">${r.type || '?'}</span>
        <span class="relation-name" onclick="Router.go('characters/${r.character_id}')">${Store.charName(novel, r.character_id)}</span>
      </div>`
    ).join('');

    const ownedArtifacts = this.arr(c.owned_artifacts).map(aid => {
      const a = Store.findArtifact(novel, aid);
      return a ? `<a class="link-tag" onclick="Router.go('artifacts/${aid}')">${a.name}</a>` : '';
    }).join('');

    const factions = this.arr(c.faction_ids).map(fid => {
      const f = Store.findFaction(novel, fid);
      return f ? `<a class="link-tag link-tag-neutral" onclick="Router.go('factions/${fid}')">${f.name}</a>` : '';
    }).join('');

    const systemStats = c.system_stats && c.system_stats.class ? `
      <div class="card card-accent mb-16">
        <div class="section-title"><i class="bi bi-hdd-stack"></i>Status Window</div>
        ${this.detail([
          ['Class', c.system_stats.class],
          ['Level', c.system_stats.level],
          ['Skills', this.arr(c.system_stats.unique_skills).join(', ')]
        ])}
        ${c.system_stats.stats ? `<div class="stat-row mt-16">
          ${Object.entries(c.system_stats.stats).map(([k, v]) =>
            `<div class="stat-box"><div class="stat-box-value">${v}</div><div class="stat-box-label">${k}</div></div>`
          ).join('')}
        </div>` : ''}
      </div>` : '';

    /* Infobox: avatar + attribute table side-by-side */
    const infoboxRows = [
      ['Role',       this.html(this.roleBadge(c.role))],
      ['Status',     this.html(this.statusBadge(c.status))],
      ['Gender',     c.gender],
      ['Age',        c.age],
      ['First Seen', c.first_appearance],
      ['Peak Power', c.current_power_level],
      ['Path',       c.cultivation_path],
      ['Factions',   factions ? this.html(factions) : null],
    ].filter(r => r[1] !== null && r[1] !== undefined && r[1] !== '');

    return `<div class="fade-in">
      <button class="back-btn" onclick="Router.go('characters')"><i class="bi bi-arrow-left"></i>Back to Characters</button>

      <!-- Fandom infobox -->
      <div class="char-hero mb-24">
        <!-- Avatar column -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;flex-shrink:0">
          <div class="char-avatar">${initials}</div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:center">
            ${this.roleBadge(c.role)}
            ${this.statusBadge(c.status)}
          </div>
        </div>
        <!-- Info column -->
        <div class="char-info" style="flex:1;min-width:0">
          <div class="char-name">${this.safe(c.name)}</div>
          ${this.arr(c.aliases).length ? `<div class="char-aliases"><i class="bi bi-quote"></i> ${this.arr(c.aliases).join(' &middot; ')}</div>` : ''}
          <div class="char-badges mb-16">
            ${c.cultivation_path ? `<span class="badge badge-accent"><i class="bi bi-fire"></i>${c.cultivation_path}</span>` : ''}
            ${this.arr(c.tags).map(t => `<span class="badge badge-muted">${t}</span>`).join('')}
          </div>
          <!-- Attribute table -->
          <table class="detail-table">
            ${infoboxRows.map(r => `<tr>
              <td>${this.safe(r[0])}</td>
              <td>${this._detailValue(r[1])}</td>
            </tr>`).join('')}
          </table>
        </div>
      </div>

      ${systemStats}

      ${progression ? `<div class="card mb-16">
        <div class="section-title"><i class="bi bi-bar-chart-steps"></i>Power Progression</div>
        <div class="progression">${progression}</div>
      </div>` : ''}

      ${this.accordion('Background & Lore', 'bi-journal-text', `<div class="lore-text">${this.safe(c.background, 'No background recorded.')}</div><hr class="divider">${this.safe(c.personality, '')}`, true)}
      ${this.accordion('Special Abilities', 'bi-lightning', this.infoList(c.special_abilities, 'bi-lightning-charge', 'accent'))}
      ${relationships ? this.accordion('Relationships', 'bi-arrow-left-right', `<div class="relationship-list">${relationships}</div>`) : ''}
      ${ownedArtifacts ? this.accordion('Artifacts & Items', 'bi-gem', `<div class="tags-wrap">${ownedArtifacts}</div>`) : ''}
    </div>`;
  },


  /* ══════════════════════════════════════
     POWER SYSTEM
  ═══════════════════════════════════════ */

  powerSystem(novel) {
    const ps = novel.power_system || {};
    const tiers = this.arr(ps.tiers);
    const consts = this.arr(ps.special_constitutions);
    const daos = this.arr(ps.daos_or_paths);
    const floors = this.arr(ps.floor_records);
    const loops = this.arr(ps.regression_loops);

    const tierTable = tiers.length ? `
      <div class="table-wrapper mb-24">
        <table class="wiki-table">
          <thead><tr>
            <th>Rank</th><th>Stage</th><th>Sub-Stages</th>
            <th>Power Feats</th><th>Notable Individuals</th>
            <th>Breakthrough Req.</th><th>Lifespan</th>
          </tr></thead>
          <tbody>
            ${tiers.map((t, i) => `<tr class="tier-row-${Math.min(i + 1, 9)}">
              <td><span class="tier-rank tier-${Math.min(i + 1, 9)}">${t.rank || i + 1}</span></td>
              <td><strong>${this.safe(t.name)}</strong><br><span class="text-sm text-muted">${t.description || ''}</span></td>
              <td><div class="tags-wrap">${this.arr(t.sub_stages).map(s => `<span class="badge badge-muted">${s}</span>`).join('')}</div></td>
              <td>${this.infoList(t.power_feats, 'bi-check-circle', 'accent')}</td>
              <td><div class="tags-wrap">${this.charLinks(novel, t.notable_individuals)}</div></td>
              <td class="text-sm">${this.safe(t.breakthrough_requirements, '—')}</td>
              <td class="text-sm">${this.safe(t.lifespan_extension, '—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '';

    const constCards = consts.map(c => `
      <div class="card card-clickable">
        <div class="card-header">
          <div>
            <div class="card-title">${this.safe(c.name)}</div>
            <div class="card-meta">Special Constitution</div>
          </div>
          ${this.gradeBadge(c.rarity)}
        </div>
        <p class="card-body mb-12">${this.safe(c.description)}</p>
        <div class="grid-2">
          <div><div class="text-xs text-muted font-bold mb-8">ADVANTAGES</div>${this.infoList(c.advantages, 'bi-check-circle-fill', 'success')}</div>
          <div><div class="text-xs text-muted font-bold mb-8">DISADVANTAGES</div>${this.infoList(c.disadvantages, 'bi-x-circle-fill', 'danger')}</div>
        </div>
        ${c.known_bearers?.length ? `<div class="mt-16"><div class="text-xs text-muted font-bold mb-8">KNOWN BEARERS</div><div class="tags-wrap">${this.charLinks(novel, c.known_bearers)}</div></div>` : ''}
        ${c.lore ? `<p class="lore-text mt-16">${c.lore}</p>` : ''}
      </div>`).join('');

    const daoCards = daos.map(d => `
      <div class="card">
        <div class="card-title mb-8">${this.safe(d.name)}</div>
        <p class="card-body mb-12">${this.safe(d.description)}</p>
        ${d.known_practitioners?.length ? `<div class="tags-wrap mb-8">${this.charLinks(novel, d.known_practitioners)}</div>` : ''}
        ${d.associated_techniques?.length ? `<div class="tags-wrap">${this.arr(d.associated_techniques).map(tid => {
      const t = Store.findTechnique(novel, tid);
      return t ? `<a class="link-tag link-tag-neutral" onclick="Router.go('techniques/${tid}')">${t.name}</a>` : '';
    }).join('')}</div>` : ''}
      </div>`).join('');

    const floorRows = floors.map(f => `<tr>
      <td><strong>Floor ${f.floor}</strong></td>
      <td>${this.safe(f.boss_name)}</td>
      <td class="text-sm">${this.safe(f.clear_method)}</td>
      <td>${f.first_clear ? this.charLink(novel, f.first_clear) : '—'}</td>
      <td class="text-sm">${this.arr(f.notable_events).join('; ')}</td>
    </tr>`).join('');

    const loopRows = loops.map(l => `<tr>
      <td><strong>Loop ${l.loop_number}</strong></td>
      <td class="text-sm">${this.safe(l.trigger)}</td>
      <td>${this.infoList(l.key_changes, 'bi-arrow-right', 'accent')}</td>
      <td class="text-sm">${this.safe(l.outcome)}</td>
    </tr>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-bar-chart-steps"></i>${Genre.powerLabel(novel.novel?.type)}</div>
      <div class="page-subtitle">${this.safe(ps.name, '')} · ${this.safe(ps.description, '').slice(0, 120)}</div>

      ${tierTable ? this.section('Cultivation Tiers', 'bi-bar-chart-steps', tierTable) : ''}

      ${consts.length ? this.section('Special Constitutions & Divine Bodies', 'bi-stars', `<div class="grid-auto">${constCards}</div>`) : ''}

      ${daos.length ? this.section('Daos & Cultivation Paths', 'bi-compass', `<div class="grid-auto">${daoCards}</div>`) : ''}

      ${floors.length ? this.section('Floor Records', 'bi-layers', `<div class="table-wrapper">
        <table class="wiki-table"><thead><tr>
          <th>Floor</th><th>Boss</th><th>Clear Method</th><th>First Clear</th><th>Notable Events</th>
        </tr></thead><tbody>${floorRows}</tbody></table></div>`) : ''}

      ${loops.length ? this.section('Regression Loops', 'bi-arrow-counterclockwise', `<div class="table-wrapper">
        <table class="wiki-table"><thead><tr>
          <th>Loop</th><th>Trigger</th><th>Key Changes</th><th>Outcome</th>
        </tr></thead><tbody>${loopRows}</tbody></table></div>`) : ''}
    </div>`;
  },


  /* ══════════════════════════════════════
     TECHNIQUES
  ═══════════════════════════════════════ */

  techniqueList(novel) {
    const list = this.arr(novel.techniques);
    if (!list.length) return this.emptyState('No Techniques', '', 'bi-lightning');
    const types = [...new Set(list.map(t => t.type).filter(Boolean))];

    const cards = list.map(t => `
      <div class="card card-clickable" data-searchable="${t.name} ${t.type} ${t.tier} ${this.arr(t.known_users).map(u => Store.charName(novel, u)).join(' ')}" onclick="Router.go('techniques/${t.id}')">
        <div class="card-header">
          <div><div class="card-title">${this.safe(t.name)}</div><div class="card-meta">${this.safe(t.origin, 'Unknown origin')}</div></div>
          ${this.gradeBadge(t.tier)}
        </div>
        <div class="badge-row-scroll mb-8">${t.type ? `<span class="badge badge-accent">${t.type}</span>` : ''}${t.rank_required ? `<span class="badge badge-muted">${t.rank_required}</span>` : ''}</div>
        <p class="card-body">${(t.description || '').slice(0, 100)}...</p>
        ${t.known_users?.length ? `<div class="tags-wrap mt-8">${this.charLinks(novel, t.known_users)}</div>` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-lightning"></i>Techniques & Skills</div>
      <div class="page-subtitle">${list.length} entries</div>
      ${this.filterBar('tech-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },

  techniqueDetail(novel, id) {
    const t = Store.findTechnique(novel, id);
    if (!t) return this.emptyState('Not Found', '', 'bi-exclamation-circle');
    return `<div class="fade-in">
      <button class="back-btn" onclick="Router.go('techniques')"><i class="bi bi-arrow-left"></i>Back to Techniques</button>
      <div class="card card-accent mb-24">
        <div class="flex justify-between items-center mb-12">
          <div class="page-title" style="font-size:22px;margin-bottom:0">${this.safe(t.name)}</div>
          <div class="flex gap-4">${t.type ? `<span class="badge badge-accent">${t.type}</span>` : ''}${this.gradeBadge(t.tier)}</div>
        </div>
        ${this.detail([
      ['Minimum Rank', t.rank_required],
      ['Origin', t.origin],
      ['Known Users', t.known_users?.length ? this.html(`<div class="tags-wrap">${this.charLinks(novel, t.known_users)}</div>`) : null],
    ])}
      </div>
      <div class="grid-2 mb-16">
        ${this.section('Description', 'bi-text-paragraph', `<p class="lore-text">${this.safe(t.description)}</p>`)}
        <div>
          ${this.section('Effects', 'bi-check-circle-fill', this.infoList(t.effects, 'bi-check-circle-fill', 'success'))}
          ${this.section('Weaknesses', 'bi-x-circle-fill', this.infoList(t.weaknesses, 'bi-x-circle-fill', 'danger'))}
        </div>
      </div>
      ${t.lore ? this.accordion('Lore & History', 'bi-journal-text', `<p class="lore-text">${t.lore}</p>`, true) : ''}
    </div>`;
  },


  /* ══════════════════════════════════════
     ARTIFACTS
  ═══════════════════════════════════════ */

  artifactList(novel) {
    const list = this.arr(novel.artifacts);
    if (!list.length) return this.emptyState('No Artifacts', '', 'bi-gem');
    const cards = list.map(a => `
      <div class="card card-clickable" data-searchable="${a.name} ${a.type} ${a.grade}" onclick="Router.go('artifacts/${a.id}')">
        <div class="card-header">
          <div><div class="card-title">${this.safe(a.name)}</div><div class="card-meta">${this.safe(a.type)}</div></div>
          ${this.gradeBadge(a.grade)}
        </div>
        <p class="card-body mb-8">${(a.description || '').slice(0, 90)}...</p>
        ${a.current_owner ? `<div class="text-xs text-muted mb-4">Owner</div><div>${this.charLink(novel, a.current_owner)}</div>` : ''}
        ${a.spirit_intelligence && a.spirit_intelligence !== 'None' ? `<span class="badge badge-epic mt-8"><i class="bi bi-chat-dots"></i>Spirit: ${a.spirit_intelligence}</span>` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-gem"></i>Artifacts & Items</div>
      <div class="page-subtitle">${list.length} entries</div>
      ${this.filterBar('art-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },

  artifactDetail(novel, id) {
    const a = Store.findArtifact(novel, id);
    if (!a) return this.emptyState('Not Found', '', 'bi-exclamation-circle');
    const prevOwners = this.arr(a.previous_owners).map(pid => this.charLink(novel, pid)).join('');
    return `<div class="fade-in">
      <button class="back-btn" onclick="Router.go('artifacts')"><i class="bi bi-arrow-left"></i>Back to Artifacts</button>
      <div class="card card-accent mb-24">
        <div class="flex justify-between items-center mb-12">
          <div class="page-title" style="font-size:22px;margin-bottom:0"><i class="bi bi-gem"></i>${this.safe(a.name)}</div>
          <div class="flex gap-4">${a.type ? `<span class="badge badge-muted">${a.type}</span>` : ''}${this.gradeBadge(a.grade)}</div>
        </div>
        ${this.detail([
      ['Description', a.description],
      ['Origin', a.origin],
      ['Current Owner', this.html(a.current_owner ? this.charLink(novel, a.current_owner) : '—')],
      ['Previous Owners', this.html(prevOwners || '—')],
      ['Spirit Intelligence', a.spirit_intelligence],
    ])}
      </div>
      ${this.section('Abilities', 'bi-lightning', this.infoList(a.abilities, 'bi-lightning-charge', 'accent'))}
      ${a.lore ? this.accordion('Lore & History', 'bi-journal-text', `<p class="lore-text">${a.lore}</p>`, true) : ''}
    </div>`;
  },


  /* ══════════════════════════════════════
     PILLS & RESOURCES
  ═══════════════════════════════════════ */

  pillList(novel) {
    const list = this.arr(novel.pills_and_resources);
    if (!list.length) return this.emptyState('No Resources', '', 'bi-capsule');
    const cards = list.map(p => `
      <div class="card" data-searchable="${p.name} ${p.type} ${p.rarity}">
        <div class="card-header">
          <div><div class="card-title">${this.safe(p.name)}</div><div class="card-meta">${this.safe(p.type)}</div></div>
          <div class="flex gap-4 flex-col items-center">${this.gradeBadge(p.grade)}<span class="badge badge-muted">${this.safe(p.rarity)}</span></div>
        </div>
        <div class="mb-8">${this.infoList(p.effects, 'bi-plus-circle', 'success')}</div>
        ${p.side_effects?.length ? `<div class="mb-8">${this.infoList(p.side_effects, 'bi-exclamation-triangle', 'danger')}</div>` : ''}
        ${p.ingredients?.length ? `<div class="text-xs text-muted mb-4">Ingredients</div><div class="badge-row-scroll">${this.pills(p.ingredients, 'badge-muted')}</div>` : ''}
        ${p.used_by?.length ? `<div class="tags-wrap mt-8">${this.charLinks(novel, p.used_by)}</div>` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-capsule"></i>Pills & Resources</div>
      <div class="page-subtitle">${list.length} entries</div>
      ${this.filterBar('pill-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },


  /* ══════════════════════════════════════
     BLOODLINES
  ═══════════════════════════════════════ */

  bloodlineList(novel) {
    const list = this.arr(novel.bloodlines);
    if (!list.length) return this.emptyState('No Bloodlines', '', 'bi-dna');
    const cards = list.map(b => `
      <div class="card">
        <div class="card-title mb-4">${this.safe(b.name)}</div>
        <div class="card-meta mb-12">Origin: ${this.safe(b.origin, 'Unknown')}</div>
        ${b.purity_levels?.length ? `<div class="mb-12">
          <div class="text-xs text-muted font-bold mb-8">PURITY LEVELS</div>
          ${this.arr(b.purity_levels).map(pl => `
            <div class="mb-8 card-sm" style="border:1px solid var(--border);border-radius:6px;overflow:hidden">
              <strong class="text-sm" style="display:block;margin-bottom:6px">${pl.level}</strong>
              <div class="badge-row-scroll">${this.arr(pl.abilities).map(a => `<span class="badge badge-accent">${a}</span>`).join('')}</div>
            </div>`).join('')}
        </div>` : ''}
        ${b.known_bearers?.length ? `<div class="tags-wrap">${this.charLinks(novel, b.known_bearers)}</div>` : ''}
        ${b.lore ? `<p class="lore-text mt-12">${b.lore}</p>` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-dna"></i>Bloodlines</div>
      <div class="page-subtitle">${list.length} bloodlines</div>
      <div class="grid-auto">${cards}</div>
    </div>`;
  },


  /* ══════════════════════════════════════
     BESTIARY
  ═══════════════════════════════════════ */

  bestiaryList(novel) {
    const list = this.arr(novel.beasts_and_creatures);
    if (!list.length) return this.emptyState('No Beasts', '', 'bi-bug');
    const cards = list.map(b => `
      <div class="card card-clickable" data-searchable="${b.name} ${b.type} ${b.rank}" onclick="Router.go('bestiary/${b.id}')">
        <div class="card-header">
          <div><div class="card-title">${this.safe(b.name)}</div><div class="card-meta">${this.safe(b.type)}</div></div>
          <div class="flex flex-col gap-4">${this.gradeBadge(b.rank)}</div>
        </div>
        <p class="card-body mb-8">${(b.description || '').slice(0, 100)}...</p>
        ${b.tame_difficulty && b.tame_difficulty !== 'N/A' ? `<span class="badge badge-muted"><i class="bi bi-hand-index"></i>Tame: ${b.tame_difficulty}</span>` : ''}
        ${b.named_individuals?.length ? `<div class="mt-8"><span class="text-xs text-muted">${b.named_individuals.length} named individual(s)</span></div>` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-bug"></i>Bestiary</div>
      <div class="page-subtitle">${list.length} creatures catalogued</div>
      ${this.filterBar('beast-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },

  beastDetail(novel, id) {
    const b = Store.findBeast(novel, id);
    if (!b) return this.emptyState('Not Found', '', 'bi-exclamation-circle');
    const namedRows = this.arr(b.named_individuals).map(ni => `
      <div class="relation-item">
        <span class="relation-type">${ni.owner ? Store.charName(novel, ni.owner) : 'Wild'}</span>
        <span>${ni.name}</span>
        <span class="text-sm text-muted ml-auto">${ni.notes || ''}</span>
      </div>`).join('');

    return `<div class="fade-in">
      <button class="back-btn" onclick="Router.go('bestiary')"><i class="bi bi-arrow-left"></i>Back to Bestiary</button>
      <div class="card card-accent mb-24">
        <div class="flex justify-between items-center mb-12">
          <div class="page-title" style="font-size:22px;margin-bottom:0"><i class="bi bi-bug"></i>${this.safe(b.name)}</div>
          <div class="flex gap-4">${b.type ? `<span class="badge badge-muted">${b.type}</span>` : ''}${this.gradeBadge(b.rank)}</div>
        </div>
        ${this.detail([
      ['Description', b.description],
      ['Tameability', b.tame_difficulty],
      ['Habitat', this.html(this.arr(b.habitat).map(lid => { const l = Store.findLocation(novel, lid); return l ? `<a class="link-tag link-tag-neutral" onclick="Router.go('locations/${lid}')">${this.safe(l.name)}</a>` : ''; }).join('') || '—')],
      ['Drops', this.arr(b.drops).join(', ') || '—'],
    ])}
      </div>
      ${this.section('Abilities', 'bi-lightning', this.infoList(b.abilities, 'bi-lightning-charge', 'accent'))}
      ${namedRows ? this.section('Named Individuals', 'bi-person-badge', `<div class="relationship-list">${namedRows}</div>`) : ''}
      ${b.lore ? this.accordion('Lore', 'bi-journal-text', `<p class="lore-text">${b.lore}</p>`, true) : ''}
    </div>`;
  },


  /* ══════════════════════════════════════
     LOCATIONS
  ═══════════════════════════════════════ */

  locationList(novel) {
    const list = this.arr(novel.locations);
    if (!list.length) return this.emptyState('No Locations', '', 'bi-map');
    const cards = list.map(l => `
      <div class="card card-clickable" data-searchable="${l.name} ${l.type}" onclick="Router.go('locations/${l.id}')">
        <div class="card-header">
          <div><div class="card-title">${this.safe(l.name)}</div><div class="card-meta">${this.safe(l.type)}</div></div>
          <span class="badge ${l.is_accessible === 'Open' ? 'badge-alive' : l.is_accessible === 'Destroyed' ? 'badge-dead' : 'badge-muted'}">${this.safe(l.is_accessible, '?')}</span>
        </div>
        <p class="card-body">${(l.description || '').slice(0, 100)}...</p>
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-map"></i>Locations</div>
      <div class="page-subtitle">${list.length} locations</div>
      ${this.filterBar('loc-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },

  locationDetail(novel, id) {
    const l = Store.findLocation(novel, id);
    if (!l) return this.emptyState('Not Found', '', 'bi-exclamation-circle');
    return `<div class="fade-in">
      <button class="back-btn" onclick="Router.go('locations')"><i class="bi bi-arrow-left"></i>Back to Locations</button>
      <div class="card card-accent mb-24">
        <div class="flex justify-between items-center mb-12">
          <div class="page-title" style="font-size:22px;margin-bottom:0"><i class="bi bi-map"></i>${this.safe(l.name)}</div>
          <div class="flex gap-4">${l.type ? `<span class="badge badge-muted">${l.type}</span>` : ''}<span class="badge ${l.is_accessible === 'Open' ? 'badge-alive' : l.is_accessible === 'Destroyed' ? 'badge-dead' : 'badge-muted'}">${l.is_accessible || ''}</span></div>
        </div>
        <p class="lore-text">${this.safe(l.description)}</p>
      </div>
      ${l.dangers?.length ? this.section('Dangers', 'bi-exclamation-triangle', this.infoList(l.dangers, 'bi-exclamation-triangle', 'danger')) : ''}
      ${l.factions_present?.length ? this.section('Factions Present', 'bi-shield', `<div class="tags-wrap">${this.arr(l.factions_present).map(fid => { const f = Store.findFaction(novel, fid); return f ? `<a class="link-tag link-tag-neutral" onclick="Router.go('factions/${fid}')">${f.name}</a>` : '' }).join('')}</div>`) : ''}
      ${l.notable_characters?.length ? this.section('Notable Characters', 'bi-people', `<div class="tags-wrap">${this.charLinks(novel, l.notable_characters)}</div>`) : ''}
      ${l.lore ? this.accordion('Lore & History', 'bi-journal-text', `<p class="lore-text">${l.lore}</p>`, true) : ''}
    </div>`;
  },


  /* ══════════════════════════════════════
     REALMS
  ═══════════════════════════════════════ */

  realmList(novel) {
    const list = this.arr(novel.realms_and_dimensions).sort((a, b) => (b.hierarchy_rank || 0) - (a.hierarchy_rank || 0));
    if (!list.length) return this.emptyState('No Realms', '', 'bi-globe2');
    const rungs = list.map((r, i) => {
      const colors = ['var(--grade-common)', 'var(--grade-uncommon)', 'var(--grade-rare)', 'var(--grade-epic)', 'var(--grade-legendary)', 'var(--grade-mythic)', 'var(--grade-divine)'];
      const color = colors[Math.min(i, colors.length - 1)];
      return `<div class="realm-rung">
        <div class="realm-rank-badge" style="background:${color}">${r.hierarchy_rank || '?'}</div>
        <div class="card" style="flex:1">
          <div class="card-title mb-4">${this.safe(r.name)}</div>
          <p class="card-body mb-8">${this.safe(r.description)}</p>
          ${r.access_methods?.length ? `<div class="text-xs text-muted mb-4">ACCESS</div><div class="tags-wrap">${this.pills(r.access_methods, 'badge-muted')}</div>` : ''}
          ${r.lore ? `<p class="lore-text mt-8">${r.lore}</p>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-globe2"></i>Realms & Dimensions</div>
      <div class="page-subtitle">Cosmology hierarchy — highest to lowest</div>
      <div class="cosmology-ladder">${rungs}</div>
    </div>`;
  },


  /* ══════════════════════════════════════
     FACTIONS
  ═══════════════════════════════════════ */

  factionList(novel) {
    const list = this.arr(novel.factions);
    if (!list.length) return this.emptyState('No Factions', '', 'bi-shield');
    const cards = list.map(f => `
      <div class="card card-clickable" data-searchable="${f.name} ${f.type}" onclick="Router.go('factions/${f.id}')">
        <div class="card-header">
          <div><div class="card-title">${this.safe(f.name)}</div><div class="card-meta">${this.safe(f.type)}</div></div>
          <div class="flex flex-col gap-4">${this.alignBadge(f.alignment)}<span class="badge badge-muted">${this.safe(f.standing, '?')}</span></div>
        </div>
        <p class="card-body mb-8">${(f.description || '').slice(0, 100)}...</p>
        ${f.leader ? `<div class="text-xs text-muted mb-4">Leader</div>${this.charLink(novel, f.leader)}` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-shield"></i>Factions</div>
      <div class="page-subtitle">${list.length} factions</div>
      ${this.filterBar('fac-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },

  factionDetail(novel, id) {
    const f = Store.findFaction(novel, id);
    if (!f) return this.emptyState('Not Found', '', 'bi-exclamation-circle');
    const hq = f.headquarters ? Store.findLocation(novel, f.headquarters) : null;
    return `<div class="fade-in">
      <button class="back-btn" onclick="Router.go('factions')"><i class="bi bi-arrow-left"></i>Back to Factions</button>
      <div class="card card-accent mb-24">
        <div class="flex justify-between items-center mb-12">
          <div class="page-title" style="font-size:22px;margin-bottom:0"><i class="bi bi-shield"></i>${this.safe(f.name)}</div>
          <div class="flex gap-4">${f.type ? `<span class="badge badge-muted">${f.type}</span>` : ''} ${this.alignBadge(f.alignment)} <span class="badge badge-muted">${f.standing || ''}</span></div>
        </div>
        <p class="lore-text mb-12">${this.safe(f.description)}</p>
        ${this.detail([
      ['Leader', this.html(f.leader ? this.charLink(novel, f.leader) : '—')],
      ['Headquarters', this.html(hq ? `<a class="link-tag link-tag-neutral" onclick="Router.go('locations/${f.headquarters}')">${this.safe(hq.name)}</a>` : '—')],
      ['Allies', this.html(this.arr(f.allied_factions).map(fid => { const fc = Store.findFaction(novel, fid); return fc ? `<a class="link-tag link-tag-neutral" onclick="Router.go('factions/${fid}')">${this.safe(fc.name)}</a>` : '' }).join('') || '—')],
      ['Enemies', this.html(this.arr(f.enemy_factions).map(fid => { const fc = Store.findFaction(novel, fid); return fc ? `<a class="link-tag" onclick="Router.go('factions/${fid}')">${this.safe(fc.name)}</a>` : '' }).join('') || '—')],
    ])}
      </div>
      ${f.notable_members?.length ? this.section('Notable Members', 'bi-people', `<div class="tags-wrap">${this.charLinks(novel, f.notable_members)}</div>`) : ''}
      ${f.history ? this.accordion('History', 'bi-clock-history', `<p class="lore-text">${f.history}</p>`, true) : ''}
      ${f.lore ? this.accordion('Lore', 'bi-journal-text', `<p class="lore-text">${f.lore}</p>`) : ''}
    </div>`;
  },


  /* ══════════════════════════════════════
     EVENTS & BATTLES
  ═══════════════════════════════════════ */

  eventsList(novel) {
    const list = this.arr(novel.battles_and_events);
    if (!list.length) return this.emptyState('No Events', '', 'bi-crosshair');
    const cards = list.map(e => `
      <div class="card" data-searchable="${e.name} ${e.type}">
        <div class="card-header">
          <div><div class="card-title">${this.safe(e.name)}</div><div class="card-meta">${this.safe(e.chapters)}</div></div>
          <span class="badge badge-accent">${this.safe(e.type, 'event')}</span>
        </div>
        <p class="card-body mb-8">${this.safe(e.summary)}</p>
        ${e.participants?.length ? `<div class="text-xs text-muted mb-4">Participants</div><div class="tags-wrap mb-8">${this.charLinks(novel, e.participants)}</div>` : ''}
        ${e.outcome ? `<div class="quote-block">${e.outcome}</div>` : ''}
        ${e.casualties?.length ? `<div class="text-xs text-muted mb-4">Casualties</div><div class="tags-wrap">${this.charLinks(novel, e.casualties)}</div>` : ''}
        ${e.lore_revealed?.length ? this.infoList(e.lore_revealed, 'bi-lightbulb', 'accent') : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-crosshair"></i>Battles & Events</div>
      <div class="page-subtitle">${list.length} entries</div>
      ${this.filterBar('ev-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },


  /* ══════════════════════════════════════
     ARCS TIMELINE
  ═══════════════════════════════════════ */

  arcTimeline(novel) {
    const list = this.arr(novel.arcs);
    if (!list.length) return this.emptyState('No Arcs', '', 'bi-diagram-3');
    const items = list.map(a => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="card">
          <div class="timeline-chapter">${this.safe(a.chapters, '')}</div>
          <div class="timeline-title">${this.safe(a.title)}</div>
          <p class="timeline-body mb-12">${this.safe(a.summary)}</p>
          ${a.power_level_context ? `<div class="quote-block"><i class="bi bi-bar-chart-steps"></i> <strong>MC Power Level:</strong> ${a.power_level_context}</div>` : ''}
          ${a.major_gains?.length ? `<div class="mt-12"><div class="text-xs text-muted font-bold mb-8">MAJOR GAINS</div>${this.infoList(a.major_gains, 'bi-plus-circle', 'accent')}</div>` : ''}
          ${a.characters_introduced?.length ? `<div class="mt-12"><div class="text-xs text-muted font-bold mb-8">CHARACTERS INTRODUCED</div><div class="tags-wrap">${this.charLinks(novel, a.characters_introduced)}</div></div>` : ''}
        </div>
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-diagram-3"></i>Story Arcs</div>
      <div class="page-subtitle">${list.length} arcs</div>
      <div class="timeline mt-24">${items}</div>
    </div>`;
  },


  /* ══════════════════════════════════════
     LORE & PROPHECIES
  ═══════════════════════════════════════ */

  loreList(novel) {
    const list = this.arr(novel.prophecies_and_lore);
    if (!list.length) return this.emptyState('No Lore', '', 'bi-journal-text');
    const cards = list.map(l => `
      <div class="card" data-searchable="${l.title} ${l.type}">
        <div class="card-header">
          <div><div class="card-title">${this.safe(l.title)}</div><div class="card-meta">Source: ${this.safe(l.source, 'Unknown')}</div></div>
          <div class="flex flex-col gap-4 items-center">
            <span class="badge badge-accent">${this.safe(l.type)}</span>
            <span class="badge ${l.fulfilled === 'Yes' ? 'badge-alive' : l.fulfilled === 'No' ? 'badge-dead' : 'badge-muted'}">${this.safe(l.fulfilled, '?')}</span>
          </div>
        </div>
        ${l.content ? `<div class="quote-block">${l.content}</div>` : ''}
        <p class="lore-text mb-8">${this.safe(l.significance)}</p>
        ${l.related_characters?.length ? `<div class="tags-wrap">${this.charLinks(novel, l.related_characters)}</div>` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-journal-text"></i>Lore & Prophecies</div>
      <div class="page-subtitle">${list.length} entries</div>
      ${this.filterBar('lore-search')}
      <div class="grid-auto">${cards}</div>
    </div>`;
  },


  /* ══════════════════════════════════════
     GLOSSARY
  ═══════════════════════════════════════ */

  glossary(novel) {
    const list = this.arr(novel.terminology).sort((a, b) => a.term.localeCompare(b.term));
    if (!list.length) return this.emptyState('No Terms', '', 'bi-alphabet');
    const rows = list.map(t => `
      <tr data-searchable="${t.term} ${t.category} ${t.definition}">
        <td><strong>${this.safe(t.term)}</strong></td>
        <td>${t.category ? `<span class="badge badge-muted">${t.category}</span>` : ''}</td>
        <td>${this.safe(t.definition)}</td>
      </tr>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-alphabet"></i>Glossary</div>
      <div class="page-subtitle">${list.length} terms</div>
      ${this.filterBar('glos-search')}
      <div class="table-wrapper">
        <table class="wiki-table">
          <thead><tr><th>Term</th><th>Category</th><th>Definition</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  },


  /* ══════════════════════════════════════
     AI ANALYSIS HUB
  ═══════════════════════════════════════ */

  analysis(novel) {
    const an = novel.analysis;
    if (!an) return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-cpu"></i>AI Analysis</div>
      ${this.emptyState('No Analysis Data', 'Run the AI analysis and import the result.', 'bi-cpu')}
    </div>`;

    const tabs = [
      { id: 'combat', icon: 'bi-person-arms-up', label: 'Combat Analysis' },
      { id: 'rankings', icon: 'bi-trophy', label: 'Power Rankings' },
      { id: 'relations', icon: 'bi-arrow-left-right', label: 'Relationships' },
      { id: 'foreshadow', icon: 'bi-eye', label: 'Foreshadowing' },
      { id: 'patterns', icon: 'bi-repeat', label: 'Plot Patterns' },
      { id: 'themes', icon: 'bi-journal-richtext', label: 'Themes' },
      { id: 'questions', icon: 'bi-question-circle', label: 'Open Questions' },
    ].map((t, i) =>
      `<button class="analysis-tab ${i === 0 ? 'active' : ''}" onclick="R._switchTab('${t.id}',this)">
        <i class="bi ${t.icon}"></i>${t.label}
      </button>`
    ).join('');

    /* Combat */
    const combatHtml = this.arr(an.character_analyses).map(ca => {
      const char = Store.findCharacter(novel, ca.character_id);
      const movesHtml = this.arr(ca.move_breakdown).map(m => `
        <div class="move-card">
          <div class="move-card-header">
            <span class="move-name">${this.safe(m.move_name)}</span>
            <span class="badge badge-accent">${this.safe(m.type)}</span>
            ${m.chapter_first_used ? `<span class="badge badge-muted">${m.chapter_first_used}</span>` : ''}
          </div>
          <p class="move-meta mb-4">${this.safe(m.description)}</p>
          <p class="text-sm text-muted">${this.safe(m.conditions_used)}</p>
          ${m.opponents_defeated_with?.length ? `<div class="tags-wrap mt-8"><span class="text-xs text-muted">Defeated: </span>${this.charLinks(novel, m.opponents_defeated_with)}</div>` : ''}
        </div>`).join('');

      const wld = ca.win_loss_draw || {};
      return `${this.accordion(
        char ? char.name : ca.character_id,
        'bi-person-arms-up',
        `<p class="lore-text mb-16">${this.safe(ca.fighting_style)}</p>
        ${this.section('Move Breakdown', 'bi-list-ul', movesHtml || '<span class="text-muted">No moves recorded.</span>')}
        ${ca.strategic_tendencies?.length ? this.section('Strategic Tendencies', 'bi-diagram-3', this.infoList(ca.strategic_tendencies, 'bi-caret-right-fill', 'accent')) : ''}
        <div class="record-bar mb-16">
          <div class="record-item record-wins"><div class="record-value">${wld.wins || 0}</div><div class="record-label">Wins</div></div>
          <div class="record-item record-losses"><div class="record-value">${wld.losses || 0}</div><div class="record-label">Losses</div></div>
          <div class="record-item record-draws"><div class="record-value">${wld.draws || 0}</div><div class="record-label">Draws</div></div>
        </div>
        ${ca.power_scaling_notes ? `<p class="lore-text">${ca.power_scaling_notes}</p>` : ''}
        ${ca.character_arc_analysis ? `<hr class="divider"><p class="lore-text">${ca.character_arc_analysis}</p>` : ''}`
      )}`;
    }).join('');

    /* Rankings */
    const rankingsHtml = this.arr(an.power_rankings).map(pr => `
      <div class="card mb-16">
        <div class="card-title mb-4">${this.safe(pr.title)}</div>
        <div class="card-meta mb-12">${this.safe(pr.methodology)}</div>
        ${this.arr(pr.entries).map(e => `
          <div class="relation-item mb-8">
            <span class="tier-rank tier-${Math.min(e.rank, 7)}">${e.rank}</span>
            <span class="relation-name" onclick="Router.go('characters/${e.character_id}')">${Store.charName(novel, e.character_id)}</span>
            <span class="badge badge-muted">${this.safe(e.peak_power)}</span>
            <span class="text-sm text-muted">${this.safe(e.reasoning)}</span>
          </div>`).join('')}
      </div>`).join('');

    /* Relationships */
    const relHtml = this.arr(an.relationship_dynamics).map(rd => {
      const names = this.arr(rd.characters).map(id => Store.charName(novel, id)).join(' & ');
      return `${this.accordion(names, 'bi-arrow-left-right',
        `<div class="flex gap-8 mb-12">${rd.dynamic_type ? `<span class="badge badge-accent">${rd.dynamic_type}</span>` : ''}</div>
        <p class="lore-text mb-12">${this.safe(rd.analysis)}</p>
        ${rd.thematic_significance ? `<div class="quote-block">${rd.thematic_significance}</div>` : ''}`
      )}`;
    }).join('');

    /* Foreshadowing */
    const fsRows = this.arr(an.foreshadowing_analysis).map(f => `
      <tr>
        <td class="text-sm">${this.safe(f.hint)}</td>
        <td><span class="badge badge-muted">${this.safe(f.chapter_hinted)}</span></td>
        <td class="text-sm">${this.safe(f.payoff)}</td>
        <td><span class="badge badge-muted">${this.safe(f.chapter_payoff)}</span></td>
        <td><span class="badge badge-${(f.quality || '').toLowerCase()}">${this.safe(f.quality)}</span></td>
      </tr>`).join('');

    /* Plot Patterns */
    const patternsHtml = this.arr(an.plot_patterns).map(p => `
      <div class="card mb-12">
        <div class="card-title mb-4">${this.safe(p.pattern)} <span class="badge badge-muted">${(p.occurrences || []).length}x</span></div>
        <div class="tags-wrap mb-8">${this.pills(p.occurrences, 'badge-muted')}</div>
        <p class="card-body">${this.safe(p.analysis)}</p>
      </div>`).join('');

    /* Themes */
    const ta = an.thematic_analysis || {};
    const themesHtml = `
      ${ta.central_themes?.length ? this.section('Central Themes', 'bi-bookmark-fill', `<div class="tags-wrap">${this.pills(ta.central_themes, 'badge-accent')}</div>`) : ''}
      ${ta.motifs?.length ? this.section('Motifs', 'bi-repeat', `<div class="tags-wrap">${this.pills(ta.motifs, 'badge-muted')}</div>`) : ''}
      ${ta.author_message ? `<div class="quote-block">${ta.author_message}</div>` : ''}
      ${this.arr(an.world_building_insights).map(i => `
        <div class="card mb-12">
          <div class="card-title mb-4">${this.safe(i.insight)}</div>
          <div class="tags-wrap mb-8">${this.pills(i.evidence, 'badge-muted')}</div>
          <p class="card-body">${this.safe(i.significance)}</p>
        </div>`).join('')}`;

    /* Questions */
    const questionsHtml = this.arr(an.unanswered_questions).map(q => `
      <div class="card mb-12">
        <div class="card-title mb-4"><i class="bi bi-question-circle text-accent"></i> ${this.safe(q.question)}</div>
        <div class="card-meta mb-8">${this.safe(q.context)}</div>
        ${q.theories?.length ? `<div class="text-xs text-muted font-bold mb-8">THEORIES</div>${this.infoList(q.theories, 'bi-lightbulb', 'accent')}` : ''}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-cpu"></i>AI Analysis</div>
      <div class="page-subtitle">Deep-dive analysis generated by AI</div>
      <div class="analysis-tabs">${tabs}</div>
      <div id="tab-combat"     class="analysis-panel active">${combatHtml || this.emptyState('No Data', '')}</div>
      <div id="tab-rankings"   class="analysis-panel">${rankingsHtml || this.emptyState('No Data', '')}</div>
      <div id="tab-relations"  class="analysis-panel">${relHtml || this.emptyState('No Data', '')}</div>
      <div id="tab-foreshadow" class="analysis-panel">
        ${fsRows ? `<div class="table-wrapper"><table class="wiki-table">
          <thead><tr><th>Hint</th><th>Hinted</th><th>Payoff</th><th>Payoff At</th><th>Quality</th></tr></thead>
          <tbody>${fsRows}</tbody></table></div>` : this.emptyState('No Data', '')}
      </div>
      <div id="tab-patterns"   class="analysis-panel">${patternsHtml || this.emptyState('No Data', '')}</div>
      <div id="tab-themes"     class="analysis-panel">${themesHtml || this.emptyState('No Data', '')}</div>
      <div id="tab-questions"  class="analysis-panel">${questionsHtml || this.emptyState('No Data', '')}</div>
    </div>`;
  },

  _switchTab(id, btn) {
    document.querySelectorAll('.analysis-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.analysis-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById('tab-' + id);
    if (panel) panel.classList.add('active');
  },


  /* ══════════════════════════════════════
     SEARCH RESULTS
  ═══════════════════════════════════════ */

  floorRecords(novel) {
    const floors = this.arr(novel.power_system?.floor_records);
    if (!floors.length) return this.emptyState('No Floor Records', 'No tower floor data was imported yet.', 'bi-layers');

    const rows = floors.map(f => `<tr>
      <td><strong>Floor ${this.safe(f.floor, '?')}</strong></td>
      <td>${this.safe(f.boss_name)}</td>
      <td class="text-sm">${this.safe(f.clear_method)}</td>
      <td>${f.first_clear ? this.charLink(novel, f.first_clear) : '—'}</td>
      <td class="text-sm">${this.safe(this.arr(f.notable_events).join('; '), '—')}</td>
    </tr>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-layers"></i>Floor Records</div>
      <div class="page-subtitle">${floors.length} recorded floors</div>
      <div class="table-wrapper">
        <table class="wiki-table">
          <thead><tr><th>Floor</th><th>Boss</th><th>Clear Method</th><th>First Clear</th><th>Notable Events</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  regressionLoops(novel) {
    const loops = this.arr(novel.power_system?.regression_loops);
    if (!loops.length) return this.emptyState('No Regression Loops', 'No regression loop data was imported yet.', 'bi-arrow-counterclockwise');

    const rows = loops.map(l => `<tr>
      <td><strong>Loop ${this.safe(l.loop_number, '?')}</strong></td>
      <td class="text-sm">${this.safe(l.trigger)}</td>
      <td>${this.infoList(l.key_changes, 'bi-arrow-right', 'accent')}</td>
      <td class="text-sm">${this.safe(l.outcome)}</td>
    </tr>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-arrow-counterclockwise"></i>Regression Loops</div>
      <div class="page-subtitle">${loops.length} loops recorded</div>
      <div class="table-wrapper">
        <table class="wiki-table">
          <thead><tr><th>Loop</th><th>Trigger</th><th>Key Changes</th><th>Outcome</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  statusWindows(novel) {
    const chars = this.arr(novel.characters).filter(c => c.system_stats);
    if (!chars.length) return this.emptyState('No Status Windows', 'No character status-window data was imported yet.', 'bi-hdd-stack');

    const cards = chars.map(c => {
      const stats = c.system_stats?.stats || {};
      return `<div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${this.safe(c.name)}</div>
            <div class="card-meta">${this.safe(c.system_stats?.class, 'Unknown Class')}</div>
          </div>
          <span class="badge badge-accent">Level ${this.safe(c.system_stats?.level, '?')}</span>
        </div>
        ${Object.keys(stats).length ? `<div class="stat-row mb-16">
          ${Object.entries(stats).map(([key, value]) => `<div class="stat-box"><div class="stat-box-value">${this.safe(value)}</div><div class="stat-box-label">${this.safe(key)}</div></div>`).join('')}
        </div>` : ''}
        ${c.system_stats?.unique_skills?.length ? `<div class="tags-wrap">${this.pills(c.system_stats.unique_skills, 'badge-muted')}</div>` : '<span class="text-muted">No unique skills recorded.</span>'}
      </div>`;
    }).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-hdd-stack"></i>Status Windows</div>
      <div class="page-subtitle">${chars.length} characters with system stats</div>
      <div class="grid-auto">${cards}</div>
    </div>`;
  },

  searchResults(novel, query) {
    const results = Search.query(query);
    Search.setResults(results);
    const groups = Search.group(results.map((item, index) => ({ ...item, __resultIndex: index })));

    if (!results.length) return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-search"></i>Search Results</div>
      ${this.emptyState('No Results', 'Try a different search term', 'bi-search')}
    </div>`;

    const html = Object.entries(groups).map(([type, g]) => `
      <div class="search-result-group">
        <div class="search-result-type"><i class="bi ${g.icon}"></i>${type} (${g.items.length})</div>
        ${g.items.map(item => `
          <div class="search-result-item" onclick="Search.navigateByIndex(${item.__resultIndex}, '${Store.getCurrentId()}')">
            <div class="search-result-title">${Search.highlight(item.name, query)}</div>
            <div class="search-result-snippet">${Search.highlight(item.snippet, query)}</div>
          </div>`).join('')}
      </div>`).join('');

    return `<div class="fade-in">
      <div class="page-title"><i class="bi bi-search"></i>Search Results</div>
      <div class="page-subtitle">${results.length} results for "<strong>${query}</strong>"</div>
      ${html}
    </div>`;
  }

};
