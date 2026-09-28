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

// Admin Smart Background Polling (Every 15s)
let adminPollingTimer = null;

async function runAdminBackgroundSync() {
  const anyModalOpen = document.querySelector('.modal-wrap.show');
  if (anyModalOpen) return; // Don't refresh while an edit modal is actively open

  const viewCases = document.getElementById('viewCases');
  const viewDaily = document.getElementById('viewDaily');
  const viewRooms = document.getElementById('viewRooms');
  const viewStaff = document.getElementById('viewStaff');

  if (viewCases && viewCases.style.display !== 'none' && typeof renderMasterTable === 'function') {
    renderMasterTable();
  } else if (viewDaily && viewDaily.style.display !== 'none' && typeof renderDailyStats === 'function') {
    renderDailyStats();
  } else if (viewRooms && viewRooms.style.display !== 'none' && typeof renderRoomGrid === 'function') {
    renderRoomGrid();
  } else if (viewStaff && viewStaff.style.display !== 'none' && typeof renderStaffTable === 'function') {
    renderStaffTable();
  }
}

function startAdminAutoSync() {
  if (adminPollingTimer) clearInterval(adminPollingTimer);
  adminPollingTimer = setInterval(runAdminBackgroundSync, 15000);
}

// Run Admin Auth and Initial Render on Load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    startAdminAutoSync();
  });
} else {
  checkAdminAuth();
  startAdminAutoSync();
}
