// manages the appearance/theme settings panel that shows on all pages
// loads saved preferences from localStorage and applies them as css variables
// must be loaded after utils.js since it depends on Utils.hexToRgba

// all available theme presets
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

// maps genre types to their colors (copied from genre.js so settings.js can use it standalone)
const GENRE_COLORS = {
  cultivation: '#f0a500', tower: '#58a6ff', regression: '#f78166',
  system: '#3fb950', isekai: '#bc8cff', fantasy: '#db61a2',
  'sci-fi': '#39d0d8', 'light-novel': '#8b949e', 'web-novel': '#8b949e', other: '#f0a500'
};

// default extra settings that arent tied to a theme preset
const SETTINGS_DEFAULTS = { useGenreAccent: true };

// applies a settings object to the root css variables so the whole ui updates instantly
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

  // if genre accent is disabled, pin the user's chosen accent on the body
  // so it overrides the genre-based css selector
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

// saves settings to localStorage
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

// loads saved settings and merges with defaults so missing fields dont break anything
function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return Object.assign({}, SETTINGS_DEFAULTS, THEMES[0], JSON.parse(stored));
  } catch (e) {}
  return Object.assign({}, SETTINGS_DEFAULTS, THEMES[0]);
}

// syncs the settings panel inputs to match a given settings object
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

// highlights the currently active theme chip in the settings panel
function markActivePreset(id) {
  document.querySelectorAll('.theme-preset').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === id);
  });
}

// grays out the custom accent row when genre accent is enabled
function updateAccentPickerVisibility() {
  const row    = document.getElementById('row-custom-accent');
  const isGenre = _current.useGenreAccent !== false;
  if (row) row.classList.toggle('accent-row-disabled', isGenre);
}

// current settings kept in memory so we dont have to re-read localStorage constantly
let _current = loadSettings();

// builds the settings panel html and syncs all inputs when the panel opens
function initSettingsPanel() {
  const container = document.getElementById('theme-presets');
  if (!container) return;

  container.innerHTML = THEMES.map(t => `
    <div class="theme-preset" data-theme="${t.id}" onclick="applyPreset('${t.id}')">
      <div class="theme-preset-swatch" style="background:${t.swatch}"></div>
      ${t.name}
    </div>`).join('');

  // genre chip only shows up on the wiki page since thats the only one with a genre
  const genre    = document.body.dataset.genre || '';
  const genreColor = GENRE_COLORS[genre] || '#ffffff';
  const chip     = document.getElementById('genre-accent-chip');
  const nameEl   = document.getElementById('genre-accent-name');
  if (chip)   chip.style.background = genreColor;
  if (nameEl) nameEl.textContent    = genre
    ? genre.charAt(0).toUpperCase() + genre.slice(1).replace(/-/g, ' ')
    : '';

  const genreRow = document.getElementById('row-genre-accent');
  if (genreRow) genreRow.style.display = genre ? '' : 'none';

  const toggle = document.getElementById('toggle-genre-accent');
  if (toggle) toggle.checked = _current.useGenreAccent !== false;

  syncPickersToSettings(_current);
  markActivePreset(_current.id || 'custom');
  updateAccentPickerVisibility();
}

// applies a named theme preset and updates everything
function applyPreset(id) {
  const t = THEMES.find(x => x.id === id);
  if (!t) return;
  _current = Object.assign({}, t);
  applySettings(_current);
  saveSettings(_current);
  syncPickersToSettings(_current);
  markActivePreset(id);
}

// called when a color picker changes value
function onColorPick(variable, value) {
  const hexInput = document.getElementById('hex-' + variable);
  if (hexInput) hexInput.value = value;
  applyVariable(variable, value);
}

// called when the hex text input changes
// validates that it's a proper hex color before applying
function onHexInput(variable, value) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
  const cp = document.getElementById('cp-' + variable);
  if (cp) cp.value = value;
  applyVariable(variable, value);
}

// updates the in-memory settings and saves when any color changes
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

// handles the border radius slider
function onRadiusChange(val) {
  const lbl = document.getElementById('range-radius-val');
  if (lbl) lbl.textContent = val + 'px';
  _current.radius = parseInt(val);
  _current.id     = 'custom';
  markActivePreset('custom');
  applySettings(_current);
  saveSettings(_current);
}

// handles the genre accent toggle (wiki page only)
function onToggleGenreAccent(checked) {
  _current.useGenreAccent = checked;
  _current.id = 'custom';
  markActivePreset('custom');
  applySettings(_current);
  saveSettings(_current);
  updateAccentPickerVisibility();
}

// resets everything back to the default dark editorial theme
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

// opens and closes the settings overlay
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

// apply saved settings right away on load so there's no flash of unstyled content
applySettings(_current);
document.addEventListener('DOMContentLoaded', () => applySettings(_current));

// press Esc to close the settings panel
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSettings();
});
