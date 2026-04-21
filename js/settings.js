/* settings.js — shared appearance/settings system for all pages
   Handles theme presets, color pickers, and CSS variable application.
   Must be loaded AFTER utils.js.
*/

/* ── Theme preset definitions ── */
const SETTINGS_KEY = 'wiki_appearance';

const THEMES = [
  {
    id: 'default',
    name: 'Dark Editorial',
    accent: '#ffffff',
    bgBase: '#000000',
    bgCard: '#1a1a1a',
    textPrimary: '#ffffff',
    textSecondary: '#767d88',
    radius: 6,
    swatch: 'linear-gradient(135deg,#ffffff,#767d88)'
  },
  {
    id: 'github',
    name: 'GitHub',
    accent: '#58a6ff',
    bgBase: '#0d1117',
    bgCard: '#161b22',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    radius: 6,
    swatch: 'linear-gradient(135deg,#0d1117,#58a6ff)'
  },
  {
    id: 'linear',
    name: 'Linear',
    accent: '#5e6ad2',
    bgBase: '#08090c',
    bgCard: '#111218',
    textPrimary: '#f0f0f5',
    textSecondary: '#9192a0',
    radius: 8,
    swatch: 'linear-gradient(135deg,#5e6ad2,#9b8def)'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    accent: '#ffffff',
    bgBase: '#000000',
    bgCard: '#111111',
    textPrimary: '#ededed',
    textSecondary: '#888888',
    radius: 4,
    swatch: 'linear-gradient(135deg,#111111,#444444)'
  },
  {
    id: 'notion',
    name: 'Notion Night',
    accent: '#e9a84c',
    bgBase: '#191919',
    bgCard: '#222222',
    textPrimary: '#ffffff',
    textSecondary: '#9b9b9b',
    radius: 4,
    swatch: 'linear-gradient(135deg,#191919,#e9a84c)'
  },
  {
    id: 'slate',
    name: 'Cool Slate',
    accent: '#58a6ff',
    bgBase: '#000000',
    bgCard: '#1a1a1a',
    textPrimary: '#ffffff',
    textSecondary: '#767d88',
    radius: 6,
    swatch: 'linear-gradient(135deg,#58a6ff,#3fd2ff)'
  },
  {
    id: 'violet',
    name: 'Violet',
    accent: '#bc8cff',
    bgBase: '#000000',
    bgCard: '#1a1a1a',
    textPrimary: '#ffffff',
    textSecondary: '#7d848e',
    radius: 6,
    swatch: 'linear-gradient(135deg,#bc8cff,#db61a2)'
  },
  {
    id: 'light',
    name: 'Light Mode',
    accent: '#2563eb',
    bgBase: '#f8f9fa',
    bgCard: '#ffffff',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    radius: 8,
    swatch: 'linear-gradient(135deg,#f8f9fa,#2563eb)'
  }
];

/* Genre → accent color map (mirrors genre.js) */
const GENRE_COLORS = {
  cultivation: '#f0a500', tower: '#58a6ff', regression: '#f78166',
  system: '#3fb950', isekai: '#bc8cff', fantasy: '#db61a2',
  'sci-fi': '#39d0d8', 'light-novel': '#8b949e', 'web-novel': '#8b949e', other: '#f0a500'
};

/* Settings defaults */
const SETTINGS_DEFAULTS = { useGenreAccent: true };

/* ── Apply a settings object to :root CSS variables ── */
function applySettings(s) {
  const r  = document.documentElement.style;
  const ar = parseInt(s.accent.slice(1, 3), 16);
  const ag = parseInt(s.accent.slice(3, 5), 16);
  const ab = parseInt(s.accent.slice(5, 7), 16);
  r.setProperty('--accent-rgb',     `${ar},${ag},${ab}`);
  r.setProperty('--accent',         s.accent);
  r.setProperty('--accent-dim',     Utils.hexToRgba(s.accent, 0.10));
  r.setProperty('--accent-border',  Utils.hexToRgba(s.accent, 0.25));
  r.setProperty('--bg-base',        s.bgBase);
  r.setProperty('--bg-card',        s.bgCard);
  r.setProperty('--text-primary',   s.textPrimary);
  r.setProperty('--text-secondary', s.textSecondary);
  r.setProperty('--radius',         s.radius + 'px');
  r.setProperty('--radius-lg',      (s.radius + 2) + 'px');

  /* Genre accent override: if user disabled it, pin accent on body so body
     inline style wins over body[data-genre] attribute selector */
  if (s.useGenreAccent === false) {
    document.body.style.setProperty('--accent',        s.accent);
    document.body.style.setProperty('--accent-rgb',    `${ar},${ag},${ab}`);
    document.body.style.setProperty('--accent-dim',    Utils.hexToRgba(s.accent, 0.10));
    document.body.style.setProperty('--accent-border', Utils.hexToRgba(s.accent, 0.25));
  } else {
    document.body.style.removeProperty('--accent');
    document.body.style.removeProperty('--accent-rgb');
    document.body.style.removeProperty('--accent-dim');
    document.body.style.removeProperty('--accent-border');
  }
}

/* ── Persist settings to localStorage ── */
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

/* ── Load & merge with defaults ── */
function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return Object.assign({}, SETTINGS_DEFAULTS, THEMES[0], JSON.parse(stored));
  } catch (e) {}
  return Object.assign({}, SETTINGS_DEFAULTS, THEMES[0]);
}

/* ── Sync picker UI inputs to a settings object ── */
function syncPickersToSettings(s) {
  const set = (id, val) => {
    const cp  = document.getElementById('cp-' + id);
    const hex = document.getElementById('hex-' + id);
    if (cp)  cp.value  = val;
    if (hex) hex.value = val;
  };
  set('accent',         s.accent);
  set('bg-base',        s.bgBase);
  set('bg-card',        s.bgCard);
  set('text-primary',   s.textPrimary);
  set('text-secondary', s.textSecondary);

  const rng = document.getElementById('range-radius');
  const lbl = document.getElementById('range-radius-val');
  if (rng) rng.value         = s.radius;
  if (lbl) lbl.textContent   = s.radius + 'px';
}

/* ── Mark the active theme preset chip ── */
function markActivePreset(id) {
  document.querySelectorAll('.theme-preset').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === id);
  });
}

/* ── Update disabled state of the custom accent row ── */
function updateAccentPickerVisibility() {
  const row    = document.getElementById('row-custom-accent');
  const isGenre = _current.useGenreAccent !== false;
  if (row) row.classList.toggle('accent-row-disabled', isGenre);
}

/* Current in-memory settings (module-level singleton) */
let _current = loadSettings();

/* ── Initialise the settings panel UI (called on open) ── */
function initSettingsPanel() {
  const container = document.getElementById('theme-presets');
  if (!container) return;

  container.innerHTML = THEMES.map(t => `
    <div class="theme-preset" data-theme="${t.id}" onclick="applyPreset('${t.id}')">
      <div class="theme-preset-swatch" style="background:${t.swatch}"></div>
      ${t.name}
    </div>`).join('');

  /* Genre chip — only relevant on wiki page */
  const genre    = document.body.dataset.genre || '';
  const genreColor = GENRE_COLORS[genre] || '#ffffff';
  const chip     = document.getElementById('genre-accent-chip');
  const nameEl   = document.getElementById('genre-accent-name');
  if (chip)   chip.style.background = genreColor;
  if (nameEl) nameEl.textContent    = genre
    ? genre.charAt(0).toUpperCase() + genre.slice(1).replace(/-/g, ' ')
    : '';

  /* Show genre-accent row only when on wiki page */
  const genreRow = document.getElementById('row-genre-accent');
  if (genreRow) genreRow.style.display = genre ? '' : 'none';

  const toggle = document.getElementById('toggle-genre-accent');
  if (toggle) toggle.checked = _current.useGenreAccent !== false;

  syncPickersToSettings(_current);
  markActivePreset(_current.id || 'custom');
  updateAccentPickerVisibility();
}

/* ── Apply a named preset ── */
function applyPreset(id) {
  const t = THEMES.find(x => x.id === id);
  if (!t) return;
  _current = Object.assign({}, t);
  applySettings(_current);
  saveSettings(_current);
  syncPickersToSettings(_current);
  markActivePreset(id);
}

/* ── Color picker live update ── */
function onColorPick(variable, value) {
  const hexInput = document.getElementById('hex-' + variable);
  if (hexInput) hexInput.value = value;
  applyVariable(variable, value);
}

/* ── Hex text input update ── */
function onHexInput(variable, value) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
  const cp = document.getElementById('cp-' + variable);
  if (cp) cp.value = value;
  applyVariable(variable, value);
}

function applyVariable(variable, value) {
  const keyMap = {
    'accent': 'accent', 'bg-base': 'bgBase', 'bg-card': 'bgCard',
    'text-primary': 'textPrimary', 'text-secondary': 'textSecondary'
  };
  const key = keyMap[variable];
  if (key) _current[key] = value;
  _current.id = 'custom';
  markActivePreset('custom');
  applySettings(_current);
  saveSettings(_current);
}

/* ── Border radius slider ── */
function onRadiusChange(val) {
  const lbl = document.getElementById('range-radius-val');
  if (lbl) lbl.textContent = val + 'px';
  _current.radius = parseInt(val);
  _current.id     = 'custom';
  markActivePreset('custom');
  applySettings(_current);
  saveSettings(_current);
}

/* ── Genre accent toggle (wiki only) ── */
function onToggleGenreAccent(checked) {
  _current.useGenreAccent = checked;
  _current.id = 'custom';
  markActivePreset('custom');
  applySettings(_current);
  saveSettings(_current);
  updateAccentPickerVisibility();
}

/* ── Reset to default theme ── */
function resetSettings() {
  _current = Object.assign({}, SETTINGS_DEFAULTS, THEMES[0]);
  applySettings(_current);
  saveSettings(_current);
  syncPickersToSettings(_current);
  markActivePreset('default');
  const toggle = document.getElementById('toggle-genre-accent');
  if (toggle) toggle.checked = true;
  updateAccentPickerVisibility();
}

/* ── Open / close overlay ── */
function openSettings() {
  initSettingsPanel();
  document.getElementById('settings-overlay').classList.add('open');
}
function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('open');
}
function handleOverlayClick(e) {
  if (e.target === document.getElementById('settings-overlay')) closeSettings();
}

/* ── Boot: apply saved settings on page load ── */
applySettings(_current);
document.addEventListener('DOMContentLoaded', () => applySettings(_current));

/* Keyboard shortcut: Esc closes settings panel */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSettings();
});
