/**
 * Hotel Operations - Field Staff Portal: Application Entry & Event Controller
 * Directory: /user/app.js
 */

/**
 * Switch between "Create Case" and "My Queue" Views
 * @param {'create'|'queue'} v
 */
function switchView(v) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const viewCreate = document.getElementById('viewCreate');
  const viewQueue = document.getElementById('viewQueue');
  const tabCreate = document.getElementById('tabCreate');
  const tabQueue = document.getElementById('tabQueue');

  if (viewCreate) viewCreate.style.display = 'none';
  if (viewQueue) viewQueue.style.display = 'none';

  if (v === 'create') {
    if (tabCreate) tabCreate.classList.add('active');
    if (viewCreate) viewCreate.style.display = 'block';
  } else {
    if (tabQueue) tabQueue.classList.add('active');
    if (viewQueue) viewQueue.style.display = 'block';
    if (typeof renderMyQueue === 'function') {
      renderMyQueue();
    }
  }
}

// Global Click Listener: Close Dropdown when clicking outside
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('userDropdownWrap');
  if (wrap && !wrap.contains(e.target)) {
    wrap.classList.remove('is-open');
    const btn = document.getElementById('userDropdownBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
});

// Global Keyboard Listener: Dismiss Modals and Menus with Escape Key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap) {
      wrap.classList.remove('is-open');
      const btn = document.getElementById('userDropdownBtn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    document.querySelectorAll('.modal-overlay.show').forEach(modal => {
      modal.classList.remove('show');
    });
  }
});

// Global Backdrop Click Listener: Dismiss Modal when clicking overlay backdrop
document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });
});

// Bootstrap application on DOM ready
function initApp() {
  if (typeof checkAuth === 'function') checkAuth();
  if (typeof pickDept === 'function') pickDept('ENG');
  if (typeof renderChips === 'function') renderChips();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
