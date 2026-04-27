// handles full-text search across all the wiki data for a single novel
// builds an index on load and searches through it on every keystroke

const Search = {

  _index: [],         // flattened list of all searchable entries
  _lastResults: [],   // stored so we can navigate to a result by index

  // same html escape as utils but local copy since search.js loads standalone sometimes
  escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // creates a flat array of all searchable items from the novel data
  // each entry has a type, icon, id, name, and a short snippet
  build(novel) {
    this._index = [];
    const n = novel;

    const add = (type, icon, id, name, snippet) =>
      this._index.push({ type, icon, id, name, snippet: snippet || '' });

    (n.characters || []).forEach(c =>
      add('Character', 'bi-person', c.id, c.name,
        [c.description, c.background, c.personality].filter(Boolean).join(' ').slice(0, 120)));

    (n.techniques || []).forEach(t =>
      add('Technique', 'bi-lightning', t.id, t.name,
        [t.type, t.tier, t.description].filter(Boolean).join(' · ').slice(0, 120)));

    (n.artifacts || []).forEach(a =>
      add('Artifact', 'bi-gem', a.id, a.name,
        [a.type, a.grade, a.description].filter(Boolean).join(' · ').slice(0, 120)));

    (n.pills_and_resources || []).forEach(p =>
      add('Resource', 'bi-capsule', p.id, p.name,
        [p.type, p.grade, (p.effects || []).join(', ')].filter(Boolean).join(' · ').slice(0, 120)));

    (n.bloodlines || []).forEach(b =>
      add('Bloodline', 'bi-droplet', b.id, b.name,
        (b.lore || '').slice(0, 120)));

    (n.beasts_and_creatures || []).forEach(b =>
      add('Beast', 'bi-bug', b.id, b.name,
        [b.rank, b.type, b.description].filter(Boolean).join(' · ').slice(0, 120)));

    (n.locations || []).forEach(l =>
      add('Location', 'bi-map', l.id, l.name,
        [l.type, l.description].filter(Boolean).join(' · ').slice(0, 120)));

    (n.realms_and_dimensions || []).forEach(r =>
      add('Realm', 'bi-globe2', r.id, r.name,
        (r.description || '').slice(0, 120)));

    (n.factions || []).forEach(f =>
      add('Faction', 'bi-shield', f.id, f.name,
        [f.type, f.alignment, f.description].filter(Boolean).join(' · ').slice(0, 120)));

    (n.battles_and_events || []).forEach(e =>
      add('Event', 'bi-crosshair', e.id, e.name,
        (e.summary || '').slice(0, 120)));

    (n.prophecies_and_lore || []).forEach(l =>
      add('Lore', 'bi-journal-text', l.id, l.title,
        (l.content || '').slice(0, 120)));

    (n.terminology || []).forEach(t =>
      add('Term', 'bi-alphabet', t.term, t.term,
        (t.definition || '').slice(0, 120)));
  },

  // searches the index for entries that match the query string
  // requires at least 2 characters to avoid noisy results
  query(q) {
    if (!q || q.length < 2) return [];
    const term = q.toLowerCase();
    return this._index.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.snippet.toLowerCase().includes(term)
    );
  },

  // wraps the matching part of the text in a highlight span
  highlight(text, q) {
    if (!text) return '';
    const escaped = this.escapeHtml(text);
    if (!q) return escaped;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(re, '<span class="search-highlight">$1</span>');
  },

  // saves results so they can be accessed by index (for keyboard navigation)
  setResults(results) {
    this._lastResults = Array.isArray(results) ? results : [];
  },

  // groups results by their type (Character, Technique, etc.)
  // makes it easier to render them in sections
  group(results) {
    const groups = {};
    results.forEach(r => {
      if (!groups[r.type]) groups[r.type] = { icon: r.icon, items: [] };
      groups[r.type].items.push(r);
    });
    return groups;
  },

  // figures out where to link based on result type and navigates there
  navigate(result, novelId) {
    const base = `wiki.html?novel=${novelId}`;
    const routes = {
      Character: `${base}#characters/${result.id}`,
      Technique: `${base}#techniques/${result.id}`,
      Artifact:  `${base}#artifacts/${result.id}`,
      Beast:     `${base}#bestiary/${result.id}`,
      Location:  `${base}#locations/${result.id}`,
      Faction:   `${base}#factions/${result.id}`,
      Resource:  `${base}#pills`,
      Bloodline: `${base}#bloodlines`,
      Realm:     `${base}#realms`,
      Event:     `${base}#events`,
      Lore:      `${base}#lore`,
      Term:      `${base}#glossary`,
    };
    location.href = routes[result.type] || base;
  },

  // navigates to a result by its position in the last result set
  // used by the dropdown items which just pass their index
  navigateByIndex(index, novelId) {
    const result = this._lastResults[index];
    if (result) this.navigate(result, novelId);
  }
};
