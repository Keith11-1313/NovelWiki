/* github.js — GitHub Contents API integration for wiki publish + pull */

const GitHub = {

  API: 'https://api.github.com',

  _headers(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };
  },

  /**
   * Publish a novel's JSON to a GitHub repo.
   * @param {object} novelData - Full novel JSON object
   * @param {object} config    - { owner, repo, path, token }
   * @returns {Promise<{ok:boolean, url:string|null, error:string|null}>}
   */
  async publish(novelData, config) {
    const { owner, repo, path, token } = config;
    if (!owner || !repo || !path || !token) {
      return { ok: false, url: null, error: 'Missing required config fields (owner, repo, path, token).' };
    }

    const headers = this._headers(token);
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(novelData, null, 2))));

    // Check if file already exists (need SHA for updates)
    let sha = null;
    try {
      const checkResp = await fetch(
        `${this.API}/repos/${owner}/${repo}/contents/${path}`,
        { headers }
      );
      if (checkResp.ok) {
        const existing = await checkResp.json();
        sha = existing.sha || null;
      }
    } catch (_) { /* file doesn't exist yet — that's fine */ }

    // Create or update the file
    try {
      const body = {
        message: `Update wiki data: ${novelData?.novel?.title || path} [${new Date().toISOString()}]`,
        content,
        ...(sha ? { sha } : {})
      };

      const resp = await fetch(
        `${this.API}/repos/${owner}/${repo}/contents/${path}`,
        { method: 'PUT', headers, body: JSON.stringify(body) }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, url: null, error: err.message || `HTTP ${resp.status}` };
      }

      const result   = await resp.json();
      const htmlUrl  = result?.content?.html_url || `https://github.com/${owner}/${repo}/blob/main/${path}`;
      return { ok: true, url: htmlUrl, error: null };

    } catch (e) {
      return { ok: false, url: null, error: e.message || 'Network error' };
    }
  },

  /**
   * Pull (download) a novel's JSON from a GitHub repo.
   * @param {object} config - { owner, repo, path, token }
   * @returns {Promise<{ok:boolean, data:object|null, error:string|null}>}
   */
  async pull(config) {
    const { owner, repo, path, token } = config;
    if (!owner || !repo || !path) {
      return { ok: false, data: null, error: 'Missing required fields (owner, repo, path).' };
    }

    // Use raw URL (no auth needed for public repos, auth helps for private)
    const rawUrl = this.rawUrl(config);
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const resp    = await fetch(rawUrl, { headers });
      if (!resp.ok) {
        // Try the API endpoint as fallback (works for private repos with auth)
        if (!token) {
          return { ok: false, data: null, error: `HTTP ${resp.status} — try adding a token for private repos.` };
        }
        const apiResp = await fetch(
          `${this.API}/repos/${owner}/${repo}/contents/${path}`,
          { headers: this._headers(token) }
        );
        if (!apiResp.ok) {
          const err = await apiResp.json().catch(() => ({}));
          return { ok: false, data: null, error: err.message || `HTTP ${apiResp.status}` };
        }
        const fileInfo = await apiResp.json();
        const decoded  = JSON.parse(atob(fileInfo.content.replace(/\n/g, '')));
        return { ok: true, data: decoded, error: null };
      }

      const data = await resp.json();
      return { ok: true, data, error: null };

    } catch (e) {
      return { ok: false, data: null, error: e.message || 'Network error' };
    }
  },

  /**
   * List files in a repo directory.
   * @param {object} config - { owner, repo, path, token }
   * @returns {Promise<{ok:boolean, files:Array, error:string|null}>}
   */
  async listRepoFiles(config) {
    const { owner, repo, path = '', token } = config;
    if (!owner || !repo) {
      return { ok: false, files: [], error: 'Missing owner or repo.' };
    }
    try {
      const headers = token ? this._headers(token) : { 'Accept': 'application/vnd.github+json' };
      const resp = await fetch(
        `${this.API}/repos/${owner}/${repo}/contents/${path}`,
        { headers }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, files: [], error: err.message || `HTTP ${resp.status}` };
      }
      const items = await resp.json();
      const files = Array.isArray(items)
        ? items.filter(i => i.type === 'file' && i.name.endsWith('.json'))
            .map(i => ({ name: i.name, path: i.path, size: i.size }))
        : [];
      return { ok: true, files, error: null };
    } catch (e) {
      return { ok: false, files: [], error: e.message || 'Network error' };
    }
  },

  /**
   * Build the raw URL to load the published JSON from GitHub.
   * @param {object} config - { owner, repo, path }
   */
  rawUrl(config) {
    return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/main/${config.path}`;
  }
};
