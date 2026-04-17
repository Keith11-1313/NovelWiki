/* store.js — localStorage data manager */

const Store = {

  NOVELS_KEY: 'wiki_novels',

  /* ── Get all novels (metadata list) ── */
  getNovels() {
    try {
      return JSON.parse(localStorage.getItem(this.NOVELS_KEY) || '[]');
    } catch { return []; }
  },

  /* ── Get full novel data by id ── */
  getNovel(id) {
    try {
      return JSON.parse(localStorage.getItem('wiki_novel_' + id) || 'null');
    } catch { return null; }
  },

  /* ── Save a novel (full JSON from Qwen) ── */
  saveNovel(data) {
    const id = this._slugify(data.novel.title);
    const novels = this.getNovels();
    const existing = novels.findIndex(n => n.id === id);

    const meta = {
      id,
      title: data.novel.title,
      type: data.novel.type || 'other',
      genre_tags: data.novel.genre_tags || [],
      summary: data.novel.summary || '',
      world_name: data.novel.world_name || '',
      stats: {
        characters:         (data.characters         || []).length,
        techniques:         (data.techniques         || []).length,
        artifacts:          (data.artifacts          || []).length,
        locations:          (data.locations          || []).length,
        factions:           (data.factions           || []).length,
        beasts:             (data.beasts_and_creatures || []).length,
        arcs:               (data.arcs               || []).length,
        events:             (data.battles_and_events  || []).length,
      },
      savedAt: Date.now()
    };

    if (existing >= 0) novels[existing] = meta;
    else novels.push(meta);

    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    localStorage.setItem('wiki_novel_' + id, JSON.stringify(data));
    return id;
  },

  /* ── Merge analysis JSON into existing novel ── */
  mergeAnalysis(novelId, analysisData) {
    const novel = this.getNovel(novelId);
    if (!novel) return false;
    novel.analysis = analysisData.analysis || analysisData;
    localStorage.setItem('wiki_novel_' + novelId, JSON.stringify(novel));
    return true;
  },

  /* ── Delete a novel ── */
  deleteNovel(id) {
    const novels = this.getNovels().filter(n => n.id !== id);
    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    localStorage.removeItem('wiki_novel_' + id);
  },

  /* ── Get current novel id from URL ── */
  getCurrentId() {
    const params = new URLSearchParams(location.search);
    return params.get('novel');
  },

  /* ── Get current novel data ── */
  getCurrentNovel() {
    const id = this.getCurrentId();
    return id ? this.getNovel(id) : null;
  },

  /* ── Helpers ── */
  _slugify(str) {
    return (str || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  },

  findCharacter(novel, id) {
    return (novel.characters || []).find(c => c.id === id) || null;
  },
  findTechnique(novel, id) {
    return (novel.techniques || []).find(t => t.id === id) || null;
  },
  findArtifact(novel, id) {
    return (novel.artifacts || []).find(a => a.id === id) || null;
  },
  findLocation(novel, id) {
    return (novel.locations || []).find(l => l.id === id) || null;
  },
  findFaction(novel, id) {
    return (novel.factions || []).find(f => f.id === id) || null;
  },
  findBeast(novel, id) {
    return (novel.beasts_and_creatures || []).find(b => b.id === id) || null;
  },

  charName(novel, id) {
    const c = this.findCharacter(novel, id);
    return c ? c.name : id;
  }
};
