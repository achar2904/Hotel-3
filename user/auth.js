/**
 * Hotel Operations - Field Staff Portal: Authentication & User Profile
 * Directory: /user/auth.js
 */

// Backward compatibility alias
window.user = currentUser;

/**
 * Client Auth Guard & Profile Loader from MySQL Session (/api/me)
 */
async function checkAuth() {
  let data;
  try {
    const res = await fetch('/api/me');
    if (!res.ok) {
      window.location.href = '/?error=login_required&from=user';
      return;
    }
    data = await res.json();
    if (!data.authenticated || !data.user) {
      window.location.href = '/?error=login_required&from=user';
      return;
    }
  } catch (authErr) {
    window.location.href = '/?error=login_required&from=user';
    return;
  }

  try {
    currentUser.code = data.user.code;
    currentUser.name = data.user.name;
    currentUser.dept = data.user.dept;
    currentUser.phone = data.user.phone || '-';

    const nameEl = document.getElementById('userNameTxt');
    const avatarEl = document.getElementById('avatarTxt');
    const deptEl = document.getElementById('userDeptTxt');
    const repEl = document.getElementById('reporterInfo');
    const dropName = document.getElementById('dropdownUserName');
    const dropDept = document.getElementById('dropdownUserDept');

    if (nameEl) nameEl.innerText = currentUser.name;
    if (avatarEl) avatarEl.innerText = currentUser.name.charAt(0);
    if (deptEl) deptEl.innerText = `แผนก${getDeptTh(currentUser.dept)} • #${currentUser.code}`;
    if (repEl) repEl.innerText = `ผู้แจ้ง: แผนก${getDeptTh(currentUser.dept)} (#${currentUser.code})`;
    if (dropName) dropName.innerText = currentUser.name;
    if (dropDept) dropDept.innerText = `แผนก${getDeptTh(currentUser.dept)} • #${currentUser.code}`;

    // Permission: Allow Front Office (FRONT), Admin, and Owner to view 422 rooms
    const tabRooms = document.getElementById('tabRooms');
    if (tabRooms) {
      if (currentUser.dept === 'FRONT' || currentUser.dept === 'ALL' || currentUser.role === 'ADMIN' || currentUser.role === 'OWNER') {
        tabRooms.style.display = 'inline-flex';
      } else {
        tabRooms.style.display = 'none';
      }
    }

    // Auto-navigate based on department specialty
    if (currentUser.dept === 'ENG' || currentUser.dept === 'IT') {
      if (typeof switchView === 'function') switchView('queue');
    } else {
      if (typeof switchView === 'function') switchView('create');
    }

    if (typeof renderMyQueue === 'function') {
      await renderMyQueue();
    }
  } catch (uiErr) {
    console.error('Error rendering user UI:', uiErr);
  }
}

/**
 * Toggle User Header Dropdown Menu
 * @param {Event} e
 */
function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const wrap = document.getElementById('userDropdownWrap');
  if (wrap) {
    const isOpen = wrap.classList.toggle('is-open');
    const btn = document.getElementById('userDropdownBtn');
    if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
}

/**
 * Logout User Session (/api/logout)
 */
async function doLogout() {
  if (confirm('คุณต้องการออกจากระบบใช่หรือไม่คะ?')) {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/?logged_out=1';
  }
}
