/* utils.js — shared utility functions used across all pages */

const Utils = {

  /* Escape HTML entities */
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /* Convert hex color to rgba string */
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  /* Format a timestamp (ms) to a human-readable string */
  formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  },

  /* Format a timestamp as relative time ("2 hours ago") */
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

  /* Debounce a function call */
  debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /* Download a string as a file */
  downloadFile(filename, content, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /* Show a toast notification */
  showToast(message, type = 'info', duration = 4000, onUndo = null) {
    // Remove any existing toast of the same class
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

    // Animate in
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

/* Redirect vertical wheel scroll to horizontal on badge-row-scroll elements */
document.addEventListener('wheel', (e) => {
  const row = e.target.closest('.badge-row-scroll');
  if (!row) return;
  if (row.scrollWidth <= row.clientWidth) return; // nothing to scroll
  e.preventDefault();
  row.scrollLeft += e.deltaY || e.deltaX;
}, { passive: false });
