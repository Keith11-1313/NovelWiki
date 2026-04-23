/* store.js — localStorage data manager + data-folder loader */

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

  /* ── Data-folder: fetch manifest + all novels ── */
  async fetchDataFolderNovels() {
    try {
      const base = this._dataBase();
      const resp = await fetch(`${base}data/index.json`);
      if (!resp.ok) return [];
      const manifest = await resp.json();
      if (!Array.isArray(manifest)) return [];

      const results = [];
      for (const entry of manifest) {
        try {
          const nr = await fetch(`${base}data/${entry.file}`);
          if (!nr.ok) continue;
          const novelData = await nr.json();
          results.push({ manifest: entry, data: novelData });
        } catch (_) { /* skip bad files */ }
      }
      return results;
    } catch (_) { return []; }
  },

  /* ── Return best cover URL (tries jpeg, jpg, png, webp) ──
     Returns the first URL to try; the img tag chains onerror for fallbacks */
  getCoverUrl(id) {
    const base = this._dataBase();
    return `${base}data/${id}.jpeg`;
  },

  /* Returns the full list of cover candidates in order */
  getCoverFallbacks(id) {
    const base = this._dataBase();
    return [
      `${base}data/${id}.jpeg`,
      `${base}data/${id}.jpg`,
      `${base}data/${id}.png`,
      `${base}data/${id}.webp`,
    ];
  },

  /* ── Extract dominant accent color from a cover image via Canvas ── */
  extractAccentFromImage(imgUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const SIZE = 64; // downsample for speed
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

          // Find the most saturated, non-very-dark color
          let bestR = 255, bestG = 80, bestB = 80, bestScore = -1;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            if (a < 200) continue;
            const brightness = (r + g + b) / 3;
            if (brightness < 30 || brightness > 235) continue; // skip too dark/light
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const score = saturation * (1 - Math.abs(brightness - 128) / 128);
            if (score > bestScore) {
              bestScore = score;
              bestR = r; bestG = g; bestB = b;
            }
          }
          resolve({ r: bestR, g: bestG, b: bestB });
        } catch (_) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = imgUrl;
    });
  },

  /* ── Build NovelUpdates URL from novel title ── */
  getNovelUpdatesUrl(title, overrideUrl) {
    if (overrideUrl) return overrideUrl;
    if (!title) return null;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return `https://www.novelupdates.com/series/${slug}/`;
  },

  /* ── Detect base path (handles sub-directory deploy) ── */
  _dataBase() {
    // Works whether served from root or a sub-path
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      const m = s.src.match(/^(.*\/)js\/store\.js/);
      if (m) return m[1];
    }
    return './';
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
    try {
      const liveIds = new Set(this.getNovels().map(n => n.id));
      return JSON.parse(localStorage.getItem(this.RECENT_KEY) || '[]')
        .filter(r => liveIds.has(r.id));
    } catch { return []; }
  },

};
