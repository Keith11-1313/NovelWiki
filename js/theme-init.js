// theme-init.js — anti-FOUC theme loader
// Must be loaded in <head> before any CSS or body paint.
// Reads the saved wiki_appearance from localStorage and applies
// CSS custom properties immediately so there is no flash of the default theme.
//
// This is the canonical version — index.html, wiki.html, and import.html
// all reference this file instead of duplicating the logic inline.

(function () {
  var THEMES = {
    midnight:   { dark:  { bg: '#09090b', card: '#18181b', tp: '#fafafa',  ts: '#a1a1aa', ac: '#ffffff' },
                  light: { bg: '#fafafa',  card: '#ffffff', tp: '#09090b',  ts: '#71717a', ac: '#18181b' } },
    github:     { dark:  { bg: '#0d1117', card: '#161b22', tp: '#e6edf3',  ts: '#8b949e', ac: '#58a6ff' },
                  light: { bg: '#ffffff',  card: '#f6f8fa', tp: '#1f2328',  ts: '#656d76', ac: '#0969da' } },
    obsidian:   { dark:  { bg: '#1e1e1e', card: '#2d2d2d', tp: '#e0e0e0',  ts: '#999999', ac: '#7c3aed' },
                  light: { bg: '#faf8f5',  card: '#ffffff', tp: '#1c1917',  ts: '#78716c', ac: '#6d28d9' } },
    dracula:    { dark:  { bg: '#282a36', card: '#44475a', tp: '#f8f8f2',  ts: '#6272a4', ac: '#bd93f9' },
                  light: { bg: '#fffbeb',  card: '#f5f0d8', tp: '#1f1f1f',  ts: '#6c664b', ac: '#644ac9' } },
    nord:       { dark:  { bg: '#2e3440', card: '#3b4252', tp: '#eceff4',  ts: '#d8dee9', ac: '#88c0d0' },
                  light: { bg: '#eceff4',  card: '#e5e9f0', tp: '#2e3440',  ts: '#4c566a', ac: '#5e81ac' } },
    rosepine:   { dark:  { bg: '#191724', card: '#1f1d2e', tp: '#e0def4',  ts: '#908caa', ac: '#eb6f92' },
                  light: { bg: '#faf4ed',  card: '#fffaf3', tp: '#575279',  ts: '#9893a5', ac: '#d7827e' } },
    tokyonight: { dark:  { bg: '#1a1b26', card: '#24283b', tp: '#c0caf5',  ts: '#565f89', ac: '#7aa2f7' },
                  light: { bg: '#e1e2e7',  card: '#d5d6db', tp: '#3760bf',  ts: '#848cb5', ac: '#2e7de9' } },
    catppuccin: { dark:  { bg: '#1e1e2e', card: '#313244', tp: '#cdd6f4',  ts: '#a6adc8', ac: '#cba6f7' },
                  light: { bg: '#eff1f5',  card: '#e6e9ef', tp: '#4c4f69',  ts: '#7c7f93', ac: '#8839ef' } }
  };

  var OLD_MAP = {
    'default': 'midnight', 'github': 'github', 'linear': 'midnight',
    'vercel': 'midnight', 'notion': 'obsidian', 'slate': 'github',
    'violet': 'dracula', 'light': 'midnight'
  };

  function rgb(hex) {
    return parseInt(hex.slice(1, 3), 16) + ',' +
           parseInt(hex.slice(3, 5), 16) + ',' +
           parseInt(hex.slice(5, 7), 16);
  }
  function rgba(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function sysMode() {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
      ? 'light' : 'dark';
  }

  try {
    var raw = JSON.parse(localStorage.getItem('wiki_appearance') || '{}');
    // Support both new format (themeId) and old format (id)
    var themeId = raw.themeId || (raw.id ? (OLD_MAP[raw.id] || 'midnight') : 'midnight');
    var mode    = raw.mode
                  || (raw.bgBase && parseInt(raw.bgBase.slice(1, 3), 16) > 200 ? 'light' : null)
                  || sysMode();
    var p       = (THEMES[themeId] || THEMES.midnight)[mode];
    var accent  = raw.customAccent || p.ac;

    var s = document.documentElement.style;
    s.setProperty('--bg-base',        p.bg);
    s.setProperty('--bg-card',        p.card);
    s.setProperty('--text-primary',   p.tp);
    s.setProperty('--text-secondary', p.ts);
    s.setProperty('--accent',         accent);
    s.setProperty('--accent-rgb',     rgb(accent));
    s.setProperty('--accent-dim',     rgba(accent, 0.10));
    s.setProperty('--accent-border',  rgba(accent, 0.25));
    s.setProperty('--bg-base-rgb',    rgb(p.bg));

    document.documentElement.dataset.mode = mode;
  } catch (e) {}
}());
