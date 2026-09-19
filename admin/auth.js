/**
 * Hotel Operations - Executive & Admin Control Portal: Authentication & Header
 * Directory: /admin/auth.js
 */

// Client Admin Auth Guard
async function checkAdminAuth() {
  let data;
  try {
    const res = await fetch('/api/me');
    if (!res.ok) {
      window.location.href = '/?error=login_required&from=admin';
      return;
    }
    data = await res.json();
    if (!data.authenticated || !data.user) {
      window.location.href = '/?error=login_required&from=admin';
      return;
    }

    if (data.user.role !== 'ADMIN' && data.user.role !== 'OWNER') {
      window.location.href = '/?error=admin_forbidden';
      return;
    }
  } catch (authErr) {
    window.location.href = '/?error=login_required&from=admin';
    return;
  }

  // Safe UI initialization (rendering errors will not trigger a redirect loop)
  try {
    currentRole = data.user.role;
    const userTxt = document.getElementById('adminUserTxt');
    const badge = document.getElementById('roleBadge');
    const icon = document.getElementById('roleIcon');
    const banner = document.getElementById('ownerBanner');
    const dropName = document.getElementById('dropdownAdminName');
    const dropRole = document.getElementById('dropdownAdminRole');

    if (userTxt) userTxt.innerText = data.user.name;
    if (dropName) dropName.innerText = data.user.name;
    if (dropRole) dropRole.innerText = `รหัส #${data.user.code} • ${data.user.role === 'OWNER' ? 'ผู้บริหาร (Owner)' : 'ผู้ดูแลระบบ (Admin)'}`;

    const btnOpenNewUser = document.getElementById('btnOpenNewUser');
    if (currentRole === 'OWNER') {
      if (badge) {
        badge.className = 'role-indicator-badge role-OWNER';
        badge.innerText = 'OWNER (อ่านอย่างเดียว)';
      }
      if (icon) icon.innerText = '';
      if (banner) banner.style.display = 'flex';
      if (btnOpenNewUser) btnOpenNewUser.style.display = 'none';
    } else {
      if (badge) {
        badge.className = 'role-indicator-badge role-ADMIN';
        badge.innerText = 'ADMIN (จัดการได้ 100%)';
      }
      if (icon) icon.innerText = '';
      if (banner) banner.style.display = 'none';
      if (btnOpenNewUser) btnOpenNewUser.style.display = 'inline-flex';
    }

    await Promise.all([
      renderMasterTable(),
      renderDailyStats(),
      renderRoomGrid(),
      renderStaffTable()
    ]);
  } catch (uiErr) {
    console.error('Error rendering admin UI components:', uiErr);
  }
}

function toggleAdminDropdown(e) {
  if (e) e.stopPropagation();
  const wrap = document.getElementById('adminDropdownWrap');
  if (wrap) {
    const isOpen = wrap.classList.toggle('is-open');
    const btn = document.getElementById('adminDropdownBtn');
    if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
}

async function doLogout() {
  if (confirm('คุณต้องการออกจากระบบใช่หรือไม่คะ?')) {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/?logged_out=1';
  }
}
