/* store.js — localStorage data manager (enhanced) */

const Store = {

  NOVELS_KEY:  'wiki_novels',
  PUBLISH_KEY: 'wiki_publish_config',

  /* ── Get all novels (metadata list) ── */
  getNovels() {
    try {
      return JSON.parse(localStorage.getItem(this.NOVELS_KEY) || '[]')
        .filter(n => !n.__deleted);          // hide soft-deleted entries
    } catch { return []; }
  },

  /* ── Get all novel metadata including soft-deleted ── */
  getAllNovelsRaw() {
    try { return JSON.parse(localStorage.getItem(this.NOVELS_KEY) || '[]'); }
    catch { return []; }
  },

  /* ── Get full novel data by id ── */
  getNovel(id) {
    try {
      return JSON.parse(localStorage.getItem('wiki_novel_' + id) || 'null');
    } catch { return null; }
  },

  /* ── Save a novel (full JSON from AI extraction) ── */
  saveNovel(data, preferredId = null) {
    const id = preferredId || data?.__meta?.id || this._createId();
    const novels  = this.getAllNovelsRaw();
    const existing = novels.findIndex(n => n.id === id);
    const savedAt  = Date.now();
    const fullData = {
      ...data,
      __meta: { ...(data.__meta || {}), id, savedAt }
    };

    const meta = {
      id,
      title:      data.novel.title,
      type:       data.novel.type || 'other',
      genre_tags: data.novel.genre_tags || [],
      summary:    data.novel.summary || '',
      world_name: data.novel.world_name || '',
      stats: {
        characters: (data.characters          || []).length,
        techniques: (data.techniques          || []).length,
        artifacts:  (data.artifacts           || []).length,
        locations:  (data.locations           || []).length,
        factions:   (data.factions            || []).length,
        beasts:     (data.beasts_and_creatures || []).length,
        arcs:       (data.arcs                || []).length,
        events:     (data.battles_and_events   || []).length,
      },
      savedAt
    };

    if (existing >= 0) novels[existing] = meta;
    else novels.push(meta);

    try {
      localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
      localStorage.setItem('wiki_novel_' + id, JSON.stringify(fullData));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw e;
    }
    return id;
  },

  /* ── Soft-delete: marks novel as deleted but keeps data for undo ── */
  softDeleteNovel(id) {
    const novels = this.getAllNovelsRaw();
    const idx    = novels.findIndex(n => n.id === id);
    if (idx < 0) return false;
    novels[idx].__deleted   = true;
    novels[idx].__deletedAt = Date.now();
    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    return true;
  },

  /* ── Undo soft-delete ── */
  undoDelete(id) {
    const novels = this.getAllNovelsRaw();
    const idx    = novels.findIndex(n => n.id === id);
    if (idx < 0) return false;
    delete novels[idx].__deleted;
    delete novels[idx].__deletedAt;
    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    return true;
  },

  /* ── Permanently remove a novel ── */
  deleteNovel(id) {
    const novels = this.getAllNovelsRaw().filter(n => n.id !== id);
    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    localStorage.removeItem('wiki_novel_' + id);
    localStorage.removeItem('wiki_notes_' + id);
    localStorage.removeItem('wiki_progress_' + id);
  },

  /* ── Merge analysis JSON into existing novel ── */
  mergeAnalysis(novelId, analysisData) {
    const novel = this.getNovel(novelId);
    if (!novel) return false;
    novel.analysis = analysisData.analysis || analysisData;
    localStorage.setItem('wiki_novel_' + novelId, JSON.stringify(novel));
    return true;
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
  _createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'novel-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  },

  findCharacter(novel, id) { return (novel.characters        || []).find(c => c.id === id) || null; },
  findTechnique(novel, id) { return (novel.techniques        || []).find(t => t.id === id) || null; },
  findArtifact(novel, id)  { return (novel.artifacts         || []).find(a => a.id === id) || null; },
  findLocation(novel, id)  { return (novel.locations         || []).find(l => l.id === id) || null; },
  findFaction(novel, id)   { return (novel.factions          || []).find(f => f.id === id) || null; },
  findBeast(novel, id)     { return (novel.beasts_and_creatures || []).find(b => b.id === id) || null; },

  charName(novel, id) {
    const c = this.findCharacter(novel, id);
    return c ? c.name : id;
  },

  /* ── Export a novel as a JSON string ── */
  exportJSON(id) {
    const data = this.getNovel(id);
    if (!data) return null;
    return JSON.stringify(data, null, 2);
  },

  /* ── Storage usage estimation ── */
  getStorageUsage() {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        used += (key.length + (localStorage.getItem(key) || '').length) * 2; // UTF-16 bytes
      }
      const total   = 5 * 1024 * 1024; // 5 MB typical limit
      const percent = Math.round((used / total) * 100);
      return { usedBytes: used, total, percent, warning: percent >= 70 };
    } catch { return { usedBytes: 0, total: 5242880, percent: 0, warning: false }; }
  },

  /* ── Notes per entity (stored per novel) ── */
  _notesKey(novelId) { return 'wiki_notes_' + novelId; },

  getNote(novelId, entityId) {
    try {
      const all = JSON.parse(localStorage.getItem(this._notesKey(novelId)) || '{}');
      return all[entityId] || '';
    } catch { return ''; }
  },

  saveNote(novelId, entityId, text) {
    try {
      const all = JSON.parse(localStorage.getItem(this._notesKey(novelId)) || '{}');
      if (text.trim()) all[entityId] = text;
      else delete all[entityId];
      localStorage.setItem(this._notesKey(novelId), JSON.stringify(all));
    } catch {}
  },

  /* ── Reading progress tracker ── */
  _progressKey(novelId) { return 'wiki_progress_' + novelId; },

  getProgress(novelId) {
    try {
      return JSON.parse(localStorage.getItem(this._progressKey(novelId)) || 'null') || { chapter: '', notes: '', updatedAt: null };
    } catch { return { chapter: '', notes: '', updatedAt: null }; }
  },

  saveProgress(novelId, data) {
    try {
      localStorage.setItem(this._progressKey(novelId), JSON.stringify({ ...data, updatedAt: Date.now() }));
    } catch {}
  },

  /* ── Recently viewed tracker ── */
  RECENT_KEY: 'wiki_recently_viewed',
  RECENT_MAX: 5,

  trackView(novelId) {
    try {
      const novels  = this.getNovels();
      const meta    = novels.find(n => n.id === novelId);
      if (!meta) return;
      let recent = JSON.parse(localStorage.getItem(this.RECENT_KEY) || '[]');
      recent = recent.filter(r => r.id !== novelId);
      recent.unshift({ id: novelId, title: meta.title, type: meta.type, viewedAt: Date.now() });
      recent = recent.slice(0, this.RECENT_MAX);
      localStorage.setItem(this.RECENT_KEY, JSON.stringify(recent));
    } catch {}
  },

  getRecentViews() {
    try { return JSON.parse(localStorage.getItem(this.RECENT_KEY) || '[]'); }
    catch { return []; }
  },

  /* ── GitHub publish config (token now session-only by default) ── */
  getPublishConfig(novelId) {
    try {
      const all = JSON.parse(localStorage.getItem(this.PUBLISH_KEY) || '{}');
      const cfg = all[novelId] || { owner: '', repo: '', path: '', lastPublished: null, lastUrl: null };
      // Token lives in sessionStorage (cleared on tab close)
      cfg.token = sessionStorage.getItem('wiki_pub_token_' + novelId) || '';
      return cfg;
    } catch { return { owner: '', repo: '', path: '', token: '', lastPublished: null, lastUrl: null }; }
  },

  savePublishConfig(novelId, cfg) {
    try {
      const { token, rememberToken, ...rest } = cfg;
      const all = JSON.parse(localStorage.getItem(this.PUBLISH_KEY) || '{}');
      all[novelId] = rest;
      localStorage.setItem(this.PUBLISH_KEY, JSON.stringify(all));
      // Store token in session (always) and optionally in localStorage
      if (token) {
        sessionStorage.setItem('wiki_pub_token_' + novelId, token);
        if (rememberToken) {
          const tokenStore = JSON.parse(localStorage.getItem('wiki_pub_tokens') || '{}');
          tokenStore[novelId] = token;
          localStorage.setItem('wiki_pub_tokens', JSON.stringify(tokenStore));
        }
      }
    } catch {}
  },

  /* Retrieve remembered token from localStorage */
  getRememberedToken(novelId) {
    try {
      const all = JSON.parse(localStorage.getItem('wiki_pub_tokens') || '{}');
      return all[novelId] || '';
    } catch { return ''; }
  }
};
