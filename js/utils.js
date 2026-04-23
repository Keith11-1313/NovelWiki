// shared helper functions that basically every page uses
// just put everything reusable here so i dont repeat myself

const Utils = {

  // replaces special html characters so they wont break the layout
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // converts a hex color like #ff304f into rgba() so i can control opacity
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  // formats a unix timestamp into a readable date string
  // returns a dash if theres no timestamp
  formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  },

  // shows how long ago something happened like "2h ago" or "just now"
  timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  },

  // wraps a function so it only runs after the user stops typing for a bit
  // helped a lot with the search input lag
  debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // triggers a file download in the browser
  // used for exporting novel data as json
  downloadFile(filename, content, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // shows a popup notification at the bottom of the screen
  // supports info, success, warning, and error types
  // optionally shows an undo button if you pass a callback
  showToast(message, type = 'info', duration = 4000, onUndo = null) {
    // remove any toast thats already showing
    document.querySelectorAll('.wiki-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `wiki-toast wiki-toast-${type}`;

    const icons = { info: 'bi-info-circle', success: 'bi-check-circle', warning: 'bi-exclamation-triangle', error: 'bi-x-circle' };
    toast.innerHTML = `
      <i class="bi ${icons[type] || 'bi-info-circle'}"></i>
      <span>${Utils.escapeHtml(message)}</span>
      ${onUndo ? `<button class="toast-undo-btn" id="toast-undo-btn">Undo</button>` : ''}
      <button class="toast-close-btn" id="toast-close-btn"><i class="bi bi-x"></i></button>
    `;

    document.body.appendChild(toast);

    // fade it in
    requestAnimationFrame(() => toast.classList.add('visible'));

    let hideTimer = setTimeout(() => toast.classList.remove('visible'), duration);
    setTimeout(() => { if (!document.body.contains(toast)) return; toast.remove(); }, duration + 400);

    toast.querySelector('#toast-close-btn')?.addEventListener('click', () => {
      clearTimeout(hideTimer);
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    });

    if (onUndo) {
      toast.querySelector('#toast-undo-btn')?.addEventListener('click', () => {
        clearTimeout(hideTimer);
        onUndo();
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
      });
    }

    return toast;
  }
};

// makes badge rows scroll sideways when the user scrolls vertically on them
// needed this because horizontal scroll on mobile is annoying otherwise
document.addEventListener('wheel', (e) => {
  const row = e.target.closest('.badge-row-scroll');
  if (!row) return;
  if (row.scrollWidth <= row.clientWidth) return; // nothing to scroll
  e.preventDefault();
  row.scrollLeft += e.deltaY || e.deltaX;
}, { passive: false });
