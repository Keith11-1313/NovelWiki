// manages the appearance/theme settings panel that shows on all pages
// loads saved preferences from localStorage and applies them as css variables
// must be loaded after utils.js since it depends on Utils.hexToRgba

const SETTINGS_KEY = 'wiki_appearance';

// ─── Color utility functions ──────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isLight(hex) { return luminance(hex) > 0.5; }

function lighten(hex, amount) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, l + amount));
}

function darken(hex, amount) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount));
}

function blendColors(hex1, hex2, ratio) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * ratio,
    c1.g + (c2.g - c1.g) * ratio,
    c1.b + (c2.b - c1.b) * ratio
  );
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Theme definitions (8 themes × 2 modes) ──────────────────────────────────

const THEMES = [
  {
    id: 'midnight', name: 'Midnight',
    radius: 6,
    dark:  { bgBase: '#09090b', bgCard: '#18181b', textPrimary: '#fafafa', textSecondary: '#a1a1aa', accent: '#ffffff' },
    light: { bgBase: '#fafafa', bgCard: '#ffffff', textPrimary: '#09090b', textSecondary: '#71717a', accent: '#18181b' },
    swatch: { dark: 'linear-gradient(135deg,#18181b,#fafafa)', light: 'linear-gradient(135deg,#fafafa,#18181b)' }
  },
  {
    id: 'github', name: 'GitHub',
    radius: 6,
    dark:  { bgBase: '#0d1117', bgCard: '#161b22', textPrimary: '#e6edf3', textSecondary: '#8b949e', accent: '#58a6ff' },
    light: { bgBase: '#ffffff', bgCard: '#f6f8fa', textPrimary: '#1f2328', textSecondary: '#656d76', accent: '#0969da' },
    swatch: { dark: 'linear-gradient(135deg,#0d1117,#58a6ff)', light: 'linear-gradient(135deg,#ffffff,#0969da)' }
  },
  {
    id: 'obsidian', name: 'Obsidian',
    radius: 8,
    dark:  { bgBase: '#1e1e1e', bgCard: '#2d2d2d', textPrimary: '#e0e0e0', textSecondary: '#999999', accent: '#7c3aed' },
    light: { bgBase: '#faf8f5', bgCard: '#ffffff', textPrimary: '#1c1917', textSecondary: '#78716c', accent: '#6d28d9' },
    swatch: { dark: 'linear-gradient(135deg,#2d2d2d,#7c3aed)', light: 'linear-gradient(135deg,#faf8f5,#6d28d9)' }
  },
  {
    id: 'dracula', name: 'Dracula',
    radius: 6,
    dark:  { bgBase: '#282a36', bgCard: '#44475a', textPrimary: '#f8f8f2', textSecondary: '#6272a4', accent: '#bd93f9' },
    light: { bgBase: '#fffbeb', bgCard: '#f5f0d8', textPrimary: '#1f1f1f', textSecondary: '#6c664b', accent: '#644ac9' },
    swatch: { dark: 'linear-gradient(135deg,#282a36,#bd93f9)', light: 'linear-gradient(135deg,#fffbeb,#644ac9)' }
  },
  {
    id: 'nord', name: 'Nord',
    radius: 4,
    dark:  { bgBase: '#2e3440', bgCard: '#3b4252', textPrimary: '#eceff4', textSecondary: '#d8dee9', accent: '#88c0d0' },
    light: { bgBase: '#eceff4', bgCard: '#e5e9f0', textPrimary: '#2e3440', textSecondary: '#4c566a', accent: '#5e81ac' },
    swatch: { dark: 'linear-gradient(135deg,#2e3440,#88c0d0)', light: 'linear-gradient(135deg,#eceff4,#5e81ac)' }
  },
  {
    id: 'rosepine', name: 'Rosé Pine',
    radius: 10,
    dark:  { bgBase: '#191724', bgCard: '#1f1d2e', textPrimary: '#e0def4', textSecondary: '#908caa', accent: '#eb6f92' },
    light: { bgBase: '#faf4ed', bgCard: '#fffaf3', textPrimary: '#575279', textSecondary: '#9893a5', accent: '#d7827e' },
    swatch: { dark: 'linear-gradient(135deg,#191724,#eb6f92)', light: 'linear-gradient(135deg,#faf4ed,#d7827e)' }
  },
  {
    id: 'tokyonight', name: 'Tokyo Night',
    radius: 8,
    dark:  { bgBase: '#1a1b26', bgCard: '#24283b', textPrimary: '#c0caf5', textSecondary: '#565f89', accent: '#7aa2f7' },
    light: { bgBase: '#e1e2e7', bgCard: '#d5d6db', textPrimary: '#3760bf', textSecondary: '#848cb5', accent: '#2e7de9' },
    swatch: { dark: 'linear-gradient(135deg,#1a1b26,#7aa2f7)', light: 'linear-gradient(135deg,#e1e2e7,#2e7de9)' }
  },
  {
    id: 'catppuccin', name: 'Catppuccin',
    radius: 10,
    dark:  { bgBase: '#1e1e2e', bgCard: '#313244', textPrimary: '#cdd6f4', textSecondary: '#a6adc8', accent: '#cba6f7' },
    light: { bgBase: '#eff1f5', bgCard: '#e6e9ef', textPrimary: '#4c4f69', textSecondary: '#7c7f93', accent: '#8839ef' },
    swatch: { dark: 'linear-gradient(135deg,#1e1e2e,#cba6f7)', light: 'linear-gradient(135deg,#eff1f5,#8839ef)' }
  }
];

// ─── Migration map for old-format localStorage ────────────────────────────────

const OLD_THEME_MAP = {
  'default': 'midnight', 'github': 'github', 'linear': 'midnight',
  'vercel': 'midnight', 'notion': 'obsidian', 'slate': 'github',
  'violet': 'dracula', 'light': 'midnight'
};

// ─── Genre accent colors ──────────────────────────────────────────────────────

const GENRE_COLORS = {
  cultivation: '#f0a500', tower: '#58a6ff', regression: '#f78166',
  system: '#3fb950', isekai: '#bc8cff', fantasy: '#db61a2',
  'sci-fi': '#39d0d8', 'light-novel': '#8b949e', 'web-novel': '#8b949e', other: '#f0a500'
};

const SETTINGS_DEFAULTS = { useGenreAccent: true };

// ─── Settings state ───────────────────────────────────────────────────────────

// Detect OS preference as default mode when nothing is saved
function getSystemMode() {
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
}

// ─── Derived token computation ────────────────────────────────────────────────

function computeDerivedTokens(palette, isDark) {
  const bg = palette.bgBase, card = palette.bgCard,
        tp = palette.textPrimary, accent = palette.accent;
  return {
    bgElevated:   isDark ? lighten(bg, 3)    : darken(bg, 3),
    bgHover:      isDark ? lighten(card, 6)  : darken(card, 4),
    border:       isDark ? lighten(bg, 12)   : darken(bg, 10),
    borderMuted:  isDark ? lighten(bg, 6)    : darken(bg, 5),
    textMuted:    blendColors(palette.textSecondary, bg, isDark ? 0.40 : 0.35),
    glassBg:      hexToRgba(tp, isDark ? 0.04 : 0.05),
    glassBorder:  hexToRgba(tp, isDark ? 0.08 : 0.10),
    accentHover:  isDark ? lighten(accent, 10) : darken(accent, 10),
    accentDim:    hexToRgba(accent, isDark ? 0.10 : 0.08),
    accentBorder: hexToRgba(accent, isDark ? 0.25 : 0.20),
  };
}

// ─── Apply settings to CSS variables ─────────────────────────────────────────

function applySettings(s) {
  const theme  = THEMES.find(t => t.id === s.themeId) || THEMES[0];
  const mode   = s.mode || 'dark';
  const palette = theme[mode];
  const isDark  = !isLight(palette.bgBase);
  const derived = computeDerivedTokens(palette, isDark);

  const accent = s.customAccent || palette.accent;
  const { r: ar, g: ag, b: ab } = hexToRgb(accent);
  const { r: br, g: bg_, b: bb } = hexToRgb(palette.bgBase);

  const r = document.documentElement.style;

  // Base palette
  r.setProperty('--bg-base',        palette.bgBase);
  r.setProperty('--bg-card',        palette.bgCard);
  r.setProperty('--text-primary',   palette.textPrimary);
  r.setProperty('--text-secondary', palette.textSecondary);
  r.setProperty('--radius',         theme.radius + 'px');
  r.setProperty('--radius-lg',      (theme.radius + 2) + 'px');

  // Accent
  r.setProperty('--accent',         accent);
  r.setProperty('--accent-rgb',     `${ar},${ag},${ab}`);
  r.setProperty('--accent-dim',     derived.accentDim);
  r.setProperty('--accent-border',  derived.accentBorder);
  r.setProperty('--accent-hover',   derived.accentHover);

  // bg-base as rgb for rgba() usage in CSS
  r.setProperty('--bg-base-rgb',    `${br},${bg_},${bb}`);

  // Derived tokens
  r.setProperty('--bg-elevated',    derived.bgElevated);
  r.setProperty('--bg-hover',       derived.bgHover);
  r.setProperty('--border',         derived.border);
  r.setProperty('--border-muted',   derived.borderMuted);
  r.setProperty('--text-muted',     derived.textMuted);
  r.setProperty('--glass-bg',       derived.glassBg);
  r.setProperty('--glass-border',   derived.glassBorder);

  // Pin accent on body if genre accent is disabled
  if (s.useGenreAccent === false) {
    document.body.style.setProperty('--accent',        accent);
    document.body.style.setProperty('--accent-rgb',    `${ar},${ag},${ab}`);
    document.body.style.setProperty('--accent-dim',    derived.accentDim);
    document.body.style.setProperty('--accent-border', derived.accentBorder);
  } else {
    document.body.style.removeProperty('--accent');
    document.body.style.removeProperty('--accent-rgb');
    document.body.style.removeProperty('--accent-dim');
    document.body.style.removeProperty('--accent-border');
  }

  // data-mode attribute lets CSS :root selectors react if needed
  document.documentElement.dataset.mode = mode;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

function migrateOldSettings(old) {
  // Old format: { id: 'github', accent: '#58a6ff', bgBase: '#0d1117', ... }
  const newThemeId = OLD_THEME_MAP[old.id] || 'midnight';
  const mode = old.bgBase && isLight(old.bgBase) ? 'light' : 'dark';
  const migrated = {
    themeId: newThemeId,
    mode,
    useGenreAccent: old.useGenreAccent !== false
  };
  // preserve manually chosen accent as custom override
  if (old.id === 'custom' && old.accent) migrated.customAccent = old.accent;
  return migrated;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // detect old format (has 'id' but not 'themeId')
      if (parsed.id && !parsed.themeId) {
        return Object.assign({ mode: getSystemMode(), useGenreAccent: true }, SETTINGS_DEFAULTS, migrateOldSettings(parsed));
      }
      return Object.assign({ themeId: 'midnight', mode: getSystemMode(), useGenreAccent: true }, SETTINGS_DEFAULTS, parsed);
    }
  } catch (e) {}
  return { themeId: 'midnight', mode: getSystemMode(), useGenreAccent: true };
}

// ─── In-memory state ──────────────────────────────────────────────────────────

let _current = loadSettings();

// ─── Toggle Day / Night mode ──────────────────────────────────────────────────

function toggleMode() {
  _current.mode = _current.mode === 'dark' ? 'light' : 'dark';
  applySettings(_current);
  saveSettings(_current);
  syncDayNightToggle();
  updateSwatches();
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function syncDayNightToggle() {
  const toggle = document.getElementById('toggle-day-night');
  if (toggle) toggle.checked = _current.mode === 'light';
  const label = document.getElementById('day-night-label');
  if (label) label.textContent = _current.mode === 'light' ? 'Day Mode' : 'Night Mode';
  const icon = document.getElementById('day-night-icon');
  if (icon) {
    icon.className = _current.mode === 'light' ? 'bi bi-sun day-night-icon' : 'bi bi-moon day-night-icon';
  }
}

function updateSwatches() {
  // Update theme preset swatches to show current-mode swatch
  document.querySelectorAll('.theme-preset').forEach(el => {
    const id = el.dataset.theme;
    const theme = THEMES.find(t => t.id === id);
    if (!theme) return;
    const sw = el.querySelector('.theme-preset-swatch');
    if (sw) sw.style.background = theme.swatch[_current.mode];
  });
}

function syncPickersToSettings(s) {
  const theme   = THEMES.find(t => t.id === s.themeId) || THEMES[0];
  const palette = theme[s.mode || 'dark'];
  const accent  = s.customAccent || palette.accent;

  const set = (id, val) => {
    const cp  = document.getElementById('cp-' + id);
    const hex = document.getElementById('hex-' + id);
    if (cp)  cp.value  = val;
    if (hex) hex.value = val;
  };
  set('accent',         accent);
  set('bg-base',        palette.bgBase);
  set('bg-card',        palette.bgCard);
  set('text-primary',   palette.textPrimary);
  set('text-secondary', palette.textSecondary);

  const rng = document.getElementById('range-radius');
  const lbl = document.getElementById('range-radius-val');
  if (rng) rng.value       = theme.radius;
  if (lbl) lbl.textContent = theme.radius + 'px';
}

function markActivePreset(id) {
  document.querySelectorAll('.theme-preset').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === id);
  });
}

function updateAccentPickerVisibility() {
  const row = document.getElementById('row-custom-accent');
  const isGenre = _current.useGenreAccent !== false;
  if (row) row.classList.toggle('accent-row-disabled', isGenre);
}

// ─── Settings panel construction ─────────────────────────────────────────────

function initSettingsPanel() {
  const container = document.getElementById('theme-presets');
  if (!container) return;

  container.innerHTML = THEMES.map(t => `
    <div class="theme-preset" data-theme="${t.id}" onclick="applyPreset('${t.id}')">
      <div class="theme-preset-swatch" style="background:${t.swatch[_current.mode]}"></div>
      ${t.name}
    </div>`).join('');

  // genre chip — only on wiki page
  const genre     = document.body.dataset.genre || '';
  const genreColor = GENRE_COLORS[genre] || '#ffffff';
  const chip      = document.getElementById('genre-accent-chip');
  const nameEl    = document.getElementById('genre-accent-name');
  if (chip)   chip.style.background = genreColor;
  if (nameEl) nameEl.textContent    = genre
    ? genre.charAt(0).toUpperCase() + genre.slice(1).replace(/-/g, ' ')
    : '';

  const genreRow = document.getElementById('row-genre-accent');
  if (genreRow) genreRow.style.display = genre ? '' : 'none';

  const genreToggle = document.getElementById('toggle-genre-accent');
  if (genreToggle) genreToggle.checked = _current.useGenreAccent !== false;

  syncDayNightToggle();
  syncPickersToSettings(_current);
  markActivePreset(_current.themeId || 'midnight');
  updateAccentPickerVisibility();
}

// ─── Preset application ───────────────────────────────────────────────────────

function applyPreset(id) {
  const t = THEMES.find(x => x.id === id);
  if (!t) return;
  _current.themeId = id;
  delete _current.customAccent; // clear custom accent when a preset is picked
  applySettings(_current);
  saveSettings(_current);
  syncPickersToSettings(_current);
  markActivePreset(id);
}

// ─── Color picker handlers ────────────────────────────────────────────────────

function onColorPick(variable, value) {
  const hexInput = document.getElementById('hex-' + variable);
  if (hexInput) hexInput.value = value;
  applyVariable(variable, value);
}

function onHexInput(variable, value) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
  const cp = document.getElementById('cp-' + variable);
  if (cp) cp.value = value;
  applyVariable(variable, value);
}

function applyVariable(variable, value) {
  // For accent, store as customAccent override
  if (variable === 'accent') {
    _current.customAccent = value;
  }
  // For other variables, we'd need to update the underlying palette —
  // instead, mark as custom so the user knows the preset is overridden.
  // The CSS var is applied directly via applySettings.
  applySettings(_current);
  saveSettings(_current);
  markActivePreset(''); // deselect preset chip to show "custom"
}

function onRadiusChange(val) {
  const lbl = document.getElementById('range-radius-val');
  if (lbl) lbl.textContent = val + 'px';
  // Override radius on the current theme temporarily
  _current._radiusOverride = parseInt(val);
  // Apply radius override directly
  document.documentElement.style.setProperty('--radius', val + 'px');
  document.documentElement.style.setProperty('--radius-lg', (parseInt(val) + 2) + 'px');
  saveSettings(_current);
}

function onToggleGenreAccent(checked) {
  _current.useGenreAccent = checked;
  applySettings(_current);
  saveSettings(_current);
  updateAccentPickerVisibility();
}

function onToggleDayNight(checked) {
  _current.mode = checked ? 'light' : 'dark';
  applySettings(_current);
  saveSettings(_current);
  syncDayNightToggle();
  syncPickersToSettings(_current);
  updateSwatches();
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetSettings() {
  _current = { themeId: 'midnight', mode: 'dark', useGenreAccent: true };
  applySettings(_current);
  saveSettings(_current);
  syncPickersToSettings(_current);
  markActivePreset('midnight');
  syncDayNightToggle();
  updateSwatches();
  const toggle = document.getElementById('toggle-genre-accent');
  if (toggle) toggle.checked = true;
  updateAccentPickerVisibility();
}

// ─── Settings modal injection ─────────────────────────────────────────────────
// Builds and appends the settings overlay to <body> on first open.
// Avoids duplicating the markup across every HTML page.

function injectSettingsModal() {
  if (document.getElementById('settings-overlay')) return; // already present

  const isWiki    = document.body.classList.contains('page-wiki');
  const genreRow  = isWiki ? `
      <div class="settings-section-label">Genre Accent</div>
      <div class="settings-row" id="row-genre-accent">
        <div>
          <div class="settings-row-label" style="display:flex;align-items:center;gap:8px;">
            Match Genre Color
            <span class="genre-chip" id="genre-accent-chip"></span>
            <span id="genre-accent-name" style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);"></span>
          </div>
          <div class="settings-row-sub">Auto-apply accent based on novel genre</div>
        </div>
        <label class="toggle-wrap" aria-label="Use genre accent color">
          <input type="checkbox" id="toggle-genre-accent" class="toggle-input" onchange="onToggleGenreAccent(this.checked)">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
      </div>` : '';

  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.id = 'settings-overlay';
  overlay.setAttribute('onclick', 'handleOverlayClick(event)');
  overlay.innerHTML = `
    <div class="settings-panel">
      <div class="settings-header">
        <div class="settings-title">Appearance</div>
        <button class="settings-close" onclick="closeSettings()" aria-label="Close settings"><i class="bi bi-x" aria-hidden="true"></i></button>
      </div>

      <div class="settings-section-label" style="margin-top:0">Mode</div>
      <div class="day-night-row">
        <div class="day-night-left">
          <i class="bi bi-moon day-night-icon" id="day-night-icon"></i>
          <span class="day-night-label" id="day-night-label">Night Mode</span>
        </div>
        <label class="toggle-wrap" aria-label="Toggle day or night mode">
          <input type="checkbox" id="toggle-day-night" class="toggle-input" onchange="onToggleDayNight(this.checked)">
          <span class="dn-track"><span class="dn-thumb"></span></span>
        </label>
      </div>

      <div class="settings-section-label">Theme</div>
      <div class="theme-presets" id="theme-presets"></div>

      ${genreRow}

      <div class="settings-section-label">Accent Color</div>
      <div class="settings-row" id="row-custom-accent">
        <div>
          <div class="settings-row-label">Primary Accent</div>
          <div class="settings-row-sub">Used for highlights, links &amp; active states</div>
        </div>
        <div class="color-picker-wrap">
          <input type="color" id="cp-accent" oninput="onColorPick('accent', this.value)">
          <input type="text" class="color-picker-hex" id="hex-accent" maxlength="7" placeholder="#ff304f" oninput="onHexInput('accent', this.value)">
        </div>
      </div>

      <div class="settings-section-label">Background Colors</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Base Background</div>
          <div class="settings-row-sub">Page root color</div>
        </div>
        <div class="color-picker-wrap">
          <input type="color" id="cp-bg-base" oninput="onColorPick('bg-base', this.value)">
          <input type="text" class="color-picker-hex" id="hex-bg-base" maxlength="7" placeholder="#07080c" oninput="onHexInput('bg-base', this.value)">
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Card Background</div>
          <div class="settings-row-sub">Panels and cards</div>
        </div>
        <div class="color-picker-wrap">
          <input type="color" id="cp-bg-card" oninput="onColorPick('bg-card', this.value)">
          <input type="text" class="color-picker-hex" id="hex-bg-card" maxlength="7" placeholder="#0d101a" oninput="onHexInput('bg-card', this.value)">
        </div>
      </div>

      <div class="settings-section-label">Text Colors</div>
      <div class="settings-row">
        <div><div class="settings-row-label">Primary Text</div></div>
        <div class="color-picker-wrap">
          <input type="color" id="cp-text-primary" oninput="onColorPick('text-primary', this.value)">
          <input type="text" class="color-picker-hex" id="hex-text-primary" maxlength="7" placeholder="#f4f7fb" oninput="onHexInput('text-primary', this.value)">
        </div>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-label">Secondary Text</div></div>
        <div class="color-picker-wrap">
          <input type="color" id="cp-text-secondary" oninput="onColorPick('text-secondary', this.value)">
          <input type="text" class="color-picker-hex" id="hex-text-secondary" maxlength="7" placeholder="#bfd1f2" oninput="onHexInput('text-secondary', this.value)">
        </div>
      </div>

      <div class="settings-section-label">UI Scale</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Border Radius</div>
          <div class="settings-row-sub">Corner rounding (px)</div>
        </div>
        <div class="range-wrap">
          <input type="range" id="range-radius" min="0" max="32" step="2" value="6" oninput="onRadiusChange(this.value)">
          <span class="range-value" id="range-radius-val">6px</span>
        </div>
      </div>

      <div class="settings-actions">
        <button class="btn btn-ghost" onclick="resetSettings()"><i class="bi bi-arrow-counterclockwise"></i> Reset</button>
        <button class="btn btn-primary" onclick="closeSettings()"><i class="bi bi-check2"></i> Done</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

// ─── Panel open/close ─────────────────────────────────────────────────────────

function openSettings() {
  injectSettingsModal();
  initSettingsPanel();
  document.getElementById('settings-overlay').classList.add('open');
}
function closeSettings() {
  document.getElementById('settings-overlay')?.classList.remove('open');
}
function handleOverlayClick(e) {
  if (e.target === document.getElementById('settings-overlay')) closeSettings();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

// Apply saved settings immediately on load (before DOMContentLoaded) to minimize FOUC
applySettings(_current);
document.addEventListener('DOMContentLoaded', () => applySettings(_current));

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSettings();
  // Shift+D → toggle Day/Night (not when typing in an input)
  if (e.key === 'D' && e.shiftKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    toggleMode();
  }
});
