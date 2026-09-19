/**
 * Hotel Operations - Executive & Admin Control Portal: Main Orchestrator
 * Directory: /admin/app.js
 */

function switchNav(nav, btnEl) {
  document.querySelectorAll('.nav-tab-item').forEach(b => b.classList.remove('active'));
  document.getElementById('viewCases').style.display = 'none';
  document.getElementById('viewDaily').style.display = 'none';
  document.getElementById('viewRooms').style.display = 'none';
  document.getElementById('viewStaff').style.display = 'none';
  document.getElementById('viewUsers').style.display = 'none';

  const targetBtn = btnEl || (window.event && window.event.target ? window.event.target.closest('.nav-tab-item') : null) || document.querySelector(`.nav-tab-item[onclick*="${nav}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  if (nav === 'cases') {
    document.getElementById('viewCases').style.display = 'block';
    renderMasterTable();
  } else if (nav === 'daily') {
    document.getElementById('viewDaily').style.display = 'block';
    renderDailyStats();
  } else if (nav === 'rooms') {
    document.getElementById('viewRooms').style.display = 'block';
    renderRoomGrid();
  } else if (nav === 'staff') {
    document.getElementById('viewStaff').style.display = 'block';
    renderStaffTable();
  } else if (nav === 'users') {
    document.getElementById('viewUsers').style.display = 'block';
    loadUsersList();
  }
}

// Global Click Listener: Close Dropdown when clicking outside
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('adminDropdownWrap');
  if (wrap && !wrap.contains(e.target)) {
    wrap.classList.remove('is-open');
    const btn = document.getElementById('adminDropdownBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
});

// Global Keyboard Listener: Dismiss Dropdown and Modals with Escape Key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const wrap = document.getElementById('adminDropdownWrap');
    if (wrap) {
      wrap.classList.remove('is-open');
      const btn = document.getElementById('adminDropdownBtn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    document.querySelectorAll('.modal-wrap.show').forEach(m => m.classList.remove('show'));
  }
});

// Global Backdrop Click Listener: Dismiss Modal when clicking overlay backdrop
document.querySelectorAll('.modal-wrap').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });
});

// Run Admin Auth and Initial Render on Load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAdminAuth);
} else {
  checkAdminAuth();
}
