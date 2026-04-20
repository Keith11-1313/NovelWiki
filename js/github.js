/* github.js — GitHub Contents API integration for wiki publish */

const GitHub = {

  API: 'https://api.github.com',

  /**
   * Publish a novel's JSON to a GitHub repo.
   * @param {object} novelData  - Full novel JSON object
   * @param {object} config     - { owner, repo, path, token }
   * @returns {Promise<{ok:boolean, url:string|null, error:string|null}>}
   */
  async publish(novelData, config) {
    const { owner, repo, path, token } = config;
    if (!owner || !repo || !path || !token) {
      return { ok: false, url: null, error: 'Missing required config fields (owner, repo, path, token).' };
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };

    const content = btoa(unescape(encodeURIComponent(
      JSON.stringify(novelData, null, 2)
    )));

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

      const result = await resp.json();
      const htmlUrl = result?.content?.html_url || `https://github.com/${owner}/${repo}/blob/main/${path}`;
      return { ok: true, url: htmlUrl, error: null };

    } catch (e) {
      return { ok: false, url: null, error: e.message || 'Network error' };
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
