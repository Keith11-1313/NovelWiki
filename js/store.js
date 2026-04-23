// handles all localStorage operations and loading novels from the data folder
// basically the database layer of this whole project

const Store = {

  NOVELS_KEY:  'wiki_novels',
  PUBLISH_KEY: 'wiki_publish_config',

  // returns list of all novels that aren't deleted
  getNovels() {
    try {
      return JSON.parse(localStorage.getItem(this.NOVELS_KEY) || '[]')
        .filter(n => !n.__deleted);
    } catch { return []; }
  },

  // same as getNovels but includes soft-deleted ones too
  // needed for the undo delete feature
  getAllNovelsRaw() {
    try { return JSON.parse(localStorage.getItem(this.NOVELS_KEY) || '[]'); }
    catch { return []; }
  },

  // gets the full novel data by id
  getNovel(id) {
    try {
      return JSON.parse(localStorage.getItem('wiki_novel_' + id) || 'null');
    } catch { return null; }
  },

  // saves a novel's full json to localStorage
  // also updates the metadata list that the library page uses
  saveNovel(data, preferredId = null) {
    const id = preferredId || data?.__meta?.id || this._createId();
    const novels  = this.getAllNovelsRaw();
    const existing = novels.findIndex(n => n.id === id);
    const savedAt  = Date.now();
    const fullData = {
      ...data,
      __meta: { ...(data.__meta || {}), id, savedAt }
    };

    // metadata summary for the library grid (lighter than storing the whole novel twice)
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

  // marks a novel as deleted without actually removing it
  // lets us show an undo toast before permanently deleting
  softDeleteNovel(id) {
    const novels = this.getAllNovelsRaw();
    const idx    = novels.findIndex(n => n.id === id);
    if (idx < 0) return false;
    novels[idx].__deleted   = true;
    novels[idx].__deletedAt = Date.now();
    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    return true;
  },

  // reverses a soft delete, used by the undo button in the toast
  undoDelete(id) {
    const novels = this.getAllNovelsRaw();
    const idx    = novels.findIndex(n => n.id === id);
    if (idx < 0) return false;
    delete novels[idx].__deleted;
    delete novels[idx].__deletedAt;
    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    return true;
  },

  // permanently removes a novel and all its related data from localStorage
  deleteNovel(id) {
    const novels = this.getAllNovelsRaw().filter(n => n.id !== id);
    localStorage.setItem(this.NOVELS_KEY, JSON.stringify(novels));
    localStorage.removeItem('wiki_novel_' + id);
    localStorage.removeItem('wiki_notes_' + id);
    localStorage.removeItem('wiki_progress_' + id);
  },

  // merges an analysis object into an existing novel entry
  mergeAnalysis(novelId, analysisData) {
    const novel = this.getNovel(novelId);
    if (!novel) return false;
    novel.analysis = analysisData.analysis || analysisData;
    localStorage.setItem('wiki_novel_' + novelId, JSON.stringify(novel));
    return true;
  },

  // reads the ?novel= param from the current url
  getCurrentId() {
    const params = new URLSearchParams(location.search);
    return params.get('novel');
  },

  // convenience function to get the current novel from the url
  getCurrentNovel() {
    const id = this.getCurrentId();
    return id ? this.getNovel(id) : null;
  },

  // generates a unique id for new novels
  _createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'novel-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  },

  // find helpers for each entity type, used by render.js a lot
  findCharacter(novel, id) { return (novel.characters        || []).find(c => c.id === id) || null; },
  findTechnique(novel, id) { return (novel.techniques        || []).find(t => t.id === id) || null; },
  findArtifact(novel, id)  { return (novel.artifacts         || []).find(a => a.id === id) || null; },
  findLocation(novel, id)  { return (novel.locations         || []).find(l => l.id === id) || null; },
  findFaction(novel, id)   { return (novel.factions          || []).find(f => f.id === id) || null; },
  findBeast(novel, id)     { return (novel.beasts_and_creatures || []).find(b => b.id === id) || null; },

  // returns a character's name from id, or just the id if not found
  charName(novel, id) {
    const c = this.findCharacter(novel, id);
    return c ? c.name : id;
  },

  // serializes a novel to a json string for downloading
  exportJSON(id) {
    const data = this.getNovel(id);
    if (!data) return null;
    return JSON.stringify(data, null, 2);
  },

  // loads novels from the data/ folder by reading data/index.json first
  // this is how pre-made novels get loaded without needing to import them manually
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
        } catch (_) { /* skip files that fail to load */ }
      }
      return results;
    } catch (_) { return []; }
  },

  // returns the first cover url to try (jpeg)
  // the img tag handles the rest of the fallbacks via onerror
  getCoverUrl(id) {
    const base = this._dataBase();
    return `${base}data/${id}.jpeg`;
  },

  // returns all cover image urls to try in order
  // supports jpeg, jpg, png, webp so basically any common format works
  getCoverFallbacks(id) {
    const base = this._dataBase();
    return [
      `${base}data/${id}.jpeg`,
      `${base}data/${id}.jpg`,
      `${base}data/${id}.png`,
      `${base}data/${id}.webp`,
    ];
  },

  // extracts the most vivid/saturated color from a cover image using canvas
  // used to set the accent color dynamically based on the novel's cover
  extractAccentFromImage(imgUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const SIZE = 64; // smaller = faster, good enough for color sampling
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

          // find the most saturated pixel that isnt too dark or too bright
          let bestR = 255, bestG = 80, bestB = 80, bestScore = -1;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            if (a < 200) continue;
            const brightness = (r + g + b) / 3;
            if (brightness < 30 || brightness > 235) continue;
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

  // builds a novelupdates.com url from the novel title
  // can be overridden if the manifest already has a source_url
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

  // figures out the base path of the project
  // needed so the data/ folder works even if the site is hosted in a subdirectory
  _dataBase() {
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      const m = s.src.match(/^(.*\/)js\/store\.js/);
      if (m) return m[1];
    }
    return './';
  },

  // estimates how much localStorage space is being used
  // shows a warning if its getting close to the 5mb browser limit
  getStorageUsage() {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        used += (key.length + (localStorage.getItem(key) || '').length) * 2; // UTF-16 bytes
      }
      const total   = 5 * 1024 * 1024; // typical 5mb limit
      const percent = Math.round((used / total) * 100);
      return { usedBytes: used, total, percent, warning: percent >= 70 };
    } catch { return { usedBytes: 0, total: 5242880, percent: 0, warning: false }; }
  },

  // --- per-entity notes (saved per novel) ---

  _notesKey(novelId) { return 'wiki_notes_' + novelId; },

  // returns the saved note for a specific entity, empty string if none
  getNote(novelId, entityId) {
    try {
      const all = JSON.parse(localStorage.getItem(this._notesKey(novelId)) || '{}');
      return all[entityId] || '';
    } catch { return ''; }
  },

  // saves or deletes a note for an entity
  // deletes if the text is empty so we dont store blank notes
  saveNote(novelId, entityId, text) {
    try {
      const all = JSON.parse(localStorage.getItem(this._notesKey(novelId)) || '{}');
      if (text.trim()) all[entityId] = text;
      else delete all[entityId];
      localStorage.setItem(this._notesKey(novelId), JSON.stringify(all));
    } catch {}
  },

  // --- reading progress tracker ---

  _progressKey(novelId) { return 'wiki_progress_' + novelId; },

  // loads saved reading progress (chapter + notes)
  getProgress(novelId) {
    try {
      return JSON.parse(localStorage.getItem(this._progressKey(novelId)) || 'null') || { chapter: '', notes: '', updatedAt: null };
    } catch { return { chapter: '', notes: '', updatedAt: null }; }
  },

  // saves current reading progress with a timestamp
  saveProgress(novelId, data) {
    try {
      localStorage.setItem(this._progressKey(novelId), JSON.stringify({ ...data, updatedAt: Date.now() }));
    } catch {}
  },

  // --- recently viewed tracker ---

  RECENT_KEY: 'wiki_recently_viewed',
  RECENT_MAX: 5, // only keep the last 5 so the list doesnt get too long

  // records that a novel was just opened
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

  // returns recently viewed novels, but filters out any that were deleted
  getRecentViews() {
    try {
      const liveIds = new Set(this.getNovels().map(n => n.id));
      return JSON.parse(localStorage.getItem(this.RECENT_KEY) || '[]')
        .filter(r => liveIds.has(r.id));
    } catch { return []; }
  },

};
