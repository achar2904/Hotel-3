/**
 * Hotel Operations - Field Staff Portal: Application Entry & Event Controller
 * Directory: /user/app.js
 */

/**
 * Switch between "Create Case", "My Queue", and "Rooms" Views
 * @param {'create'|'queue'|'rooms'} v
 */
function switchView(v) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const viewCreate = document.getElementById('viewCreate');
  const viewQueue = document.getElementById('viewQueue');
  const viewRooms = document.getElementById('viewRooms');
  const tabCreate = document.getElementById('tabCreate');
  const tabQueue = document.getElementById('tabQueue');
  const tabRooms = document.getElementById('tabRooms');

  if (viewCreate) viewCreate.style.display = 'none';
  if (viewQueue) viewQueue.style.display = 'none';
  if (viewRooms) viewRooms.style.display = 'none';

  if (v === 'create') {
    if (tabCreate) tabCreate.classList.add('active');
    if (viewCreate) viewCreate.style.display = 'block';
  } else if (v === 'queue') {
    if (tabQueue) tabQueue.classList.add('active');
    if (viewQueue) viewQueue.style.display = 'block';
    if (typeof renderMyQueue === 'function') {
      renderMyQueue();
    }
  } else if (v === 'rooms') {
    if (tabRooms) tabRooms.classList.add('active');
    if (viewRooms) viewRooms.style.display = 'block';
    if (typeof renderUserRoomGrid === 'function') {
      renderUserRoomGrid();
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

// =========================================================================
// Smart Background Polling & Web Audio Alert Controller
// =========================================================================
let lastKnownCaseIds = new Set();
let isFirstPoll = true;
let userPollingTimer = null;

function playAudioAlert(isEmergency = false) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = isEmergency ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isEmergency ? 880 : 587.33, ctx.currentTime);
    if (isEmergency) {
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
    }

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isEmergency ? 0.5 : 0.35));

    osc.start();
    osc.stop(ctx.currentTime + (isEmergency ? 0.5 : 0.35));
  } catch (e) {
    // AudioContext requires interaction on some browsers
  }
}

async function runUserBackgroundSync() {
  if (typeof currentUser === 'undefined' || !currentUser || !currentUser.dept) return;

  try {
    const res = await fetch('/api/cases');
    const data = await res.json();
    const list = data.cases || [];

    const myDeptCases = list.filter(c => c.deptTo === currentUser.dept);
    const newCases = myDeptCases.filter(c => !lastKnownCaseIds.has(c.id) && c.status === 'NEW');

    if (!isFirstPoll && newCases.length > 0) {
      const hasEmergency = newCases.some(c => c.prio === 'EMERGENCY' || c.prio === 'URGENT');
      playAudioAlert(hasEmergency);
    }

    lastKnownCaseIds = new Set(list.map(c => c.id));
    isFirstPoll = false;

    // Update queue badge
    const badge = document.getElementById('queueBadge');
    if (badge) {
      badge.innerText = myDeptCases.filter(c => c.status !== 'CLOSED').length;
    }

    // Refresh active view silently
    const viewQueue = document.getElementById('viewQueue');
    if (viewQueue && viewQueue.style.display !== 'none' && typeof renderMyQueue === 'function') {
      renderMyQueue();
    }
  } catch (err) {
    // Silent fail on background poll
  }
}

function startUserAutoSync() {
  if (userPollingTimer) clearInterval(userPollingTimer);
  runUserBackgroundSync();
  userPollingTimer = setInterval(runUserBackgroundSync, 15000);
}

// Bootstrap application on DOM ready
function initApp() {
  if (typeof checkAuth === 'function') checkAuth();
  if (typeof pickDept === 'function') pickDept('ENG');
  if (typeof renderChips === 'function') renderChips();
  startUserAutoSync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
