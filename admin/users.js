/**
 * Hotel Operations - Executive & Admin Control Portal: User & Access Management
 * Directory: /admin/users.js
 */

async function loadUsersList() {
  const tbody = document.getElementById('userTblBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">กำลังโหลดรายชื่อผู้ใช้จาก MySQL...</td></tr>';

  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#EF4444;">${data.message || 'โหลดข้อมูลไม่สำเร็จค่ะ'}</td></tr>`;
      return;
    }

    cachedUsers = data.users || [];
    filterUsersUI();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#EF4444;">ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้ค่ะ</td></tr>';
  }
}

function filterUsersUI() {
  const q = (document.getElementById('searchUserInp')?.value || '').trim().toLowerCase();
  const dept = document.getElementById('filterUserDept')?.value || 'ALL';
  const role = document.getElementById('filterUserRole')?.value || 'ALL';
  const tbody = document.getElementById('userTblBody');
  tbody.innerHTML = '';

  const filtered = cachedUsers.filter(u => {
    const matchQ = !q || (u.code && u.code.includes(q)) || (u.name && u.name.toLowerCase().includes(q));
    const matchDept = (dept === 'ALL') || (dept === 'ALL_DEPT' && u.dept === 'ALL') || (u.dept === dept);
    const matchRole = (role === 'ALL') || (u.role && u.role.toUpperCase() === role.toUpperCase());
    return matchQ && matchDept && matchRole;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">ไม่พบบัญชีผู้ใช้งานที่ตรงตามเงื่อนไขค้นหาค่ะ</td></tr>';
    return;
  }

  filtered.forEach(u => {
    const tr = document.createElement('tr');
    const roleUpper = (u.role || 'staff').toUpperCase();
    
    let actionButtons = '';
    if (currentRole === 'ADMIN') {
      actionButtons = `
        <div style="display:flex; gap:6px; align-items:center;">
          <button type="button" class="btn-action btn-sm" onclick="openEditUserModal('${u.code}')" style="background:#EEF2FF; border-color:#C7D2FE; color:#4338CA; font-weight:600;" title="แก้ไขสิทธิ์และข้อมูล">แก้ไขสิทธิ์</button>
          <button type="button" class="btn-action btn-sm" onclick="openResetPinModal('${u.code}')" style="background:#FEF2F2; border-color:#FECACA; color:#DC2626; font-weight:600;" title="รีเซ็ตรหัสผ่าน PIN">รี PIN</button>
        </div>
      `;
    } else {
      actionButtons = '<span style="font-size:0.75rem; color:var(--text-muted);">โหมดอ่านอย่างเดียว</span>';
    }

    tr.innerHTML = `
      <td><strong style="font-family:var(--font-en);">${u.code}</strong></td>
      <td><span style="font-weight:600;">${u.name}</span></td>
      <td><span class="tag dept-${u.dept}">${getDeptTh(u.dept)} (${u.dept})</span></td>
      <td><span class="role-indicator-badge role-${roleUpper}">${roleUpper}</span></td>
      <td>${u.phone || '-'}</td>
      <td>${u.is_active ? '<span class="status-active">ใช้งานปกติ</span>' : '<span class="status-inactive">ระงับใช้งาน</span>'}</td>
      <td style="font-size:0.8rem; color:var(--text-muted);">${u.last_login || '-'}</td>
      <td class="col-action">${actionButtons}</td>
    `;
    tbody.appendChild(tr);
  });
}

function openEditUserModal(code) {
  const user = cachedUsers.find(u => u.code === code);
  if (!user) return;

  document.getElementById('editUserCode').value = user.code;
  document.getElementById('editUserCodeBadge').innerText = `#${user.code}`;
  document.getElementById('editUserName').value = user.name || '';
  document.getElementById('editUserDept').value = user.dept || 'ENG';
  document.getElementById('editUserRole').value = (user.role || 'staff').toLowerCase();
  document.getElementById('editUserPhone').value = user.phone || '';
  document.getElementById('editUserStatus').value = user.is_active ? '1' : '0';

  document.getElementById('modalEditUser').classList.add('show');
}

async function saveUserEdit() {
  const code = document.getElementById('editUserCode').value;
  const name = document.getElementById('editUserName').value.trim();
  const dept = document.getElementById('editUserDept').value;
  const role = document.getElementById('editUserRole').value;
  const phone = document.getElementById('editUserPhone').value.trim();
  const isActive = document.getElementById('editUserStatus').value === '1';

  if (!name) {
    alert('กรุณากรอกชื่อ-นามสกุลพนักงานค่ะ');
    return;
  }

  const btn = document.getElementById('btnSaveUserEdit');
  btn.disabled = true;
  btn.innerText = 'กำลังบันทึกลง MySQL...';

  try {
    const res = await fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, dept, role, phone, isActive })
    });
    const data = await res.json();
    if (!data.success) {
      alert('เกิดข้อผิดพลาด: ' + data.message);
      return;
    }

    alert(`อัปเดตข้อมูลและสิทธิ์พนักงาน #${code} เรียบร้อยแล้วค่ะ`);
    closeModal('modalEditUser');
    await loadUsersList();
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ค่ะ');
  } finally {
    btn.disabled = false;
    btn.innerText = 'บันทึกการเปลี่ยนแปลง';
  }
}

function openResetPinModal(code) {
  const user = cachedUsers.find(u => u.code === code);
  if (!user) return;

  document.getElementById('resetPinCode').value = user.code;
  document.getElementById('resetPinTargetInfo').innerHTML = `กำลังรีเซ็ตรหัสผ่าน PIN ให้กับ: <strong>${user.name} (#${user.code})</strong> • แผนก ${user.dept}`;
  document.getElementById('newPinInput').value = '';
  document.getElementById('modalResetPin').classList.add('show');
}

async function confirmResetPin() {
  const code = document.getElementById('resetPinCode').value;
  const newPin = document.getElementById('newPinInput').value.trim();

  if (!/^\d{6}$/.test(newPin)) {
    alert('รหัสผ่าน PIN ต้องเป็นตัวเลข 6 หลักเท่านั้นค่ะ (เช่น 123456)');
    return;
  }

  const btn = document.getElementById('btnConfirmResetPin');
  btn.disabled = true;
  btn.innerText = 'กำลังรีเซ็ตใน MySQL...';

  try {
    const res = await fetch('/api/users/reset-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, newPin })
    });
    const data = await res.json();
    if (!data.success) {
      alert('เกิดข้อผิดพลาด: ' + data.message);
      return;
    }

    alert(`รีเซ็ตรหัสผ่าน PIN สำหรับพนักงาน #${code} เป็น [ ${newPin} ] เรียบร้อยแล้วค่ะ`);
    closeModal('modalResetPin');
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ค่ะ');
  } finally {
    btn.disabled = false;
    btn.innerText = 'ยืนยันรีเซ็ตรหัสผ่าน';
  }
}

function openNewUserModal() {
  document.getElementById('newCode').value = '';
  document.getElementById('newPin').value = '123456';
  document.getElementById('newName').value = '';
  document.getElementById('newDept').value = 'ENG';
  document.getElementById('newRole').value = 'staff';
  document.getElementById('newPhone').value = '';
  document.getElementById('modalNewUser').classList.add('show');
}

async function saveNewUser() {
  const code = document.getElementById('newCode').value.trim();
  const pin = document.getElementById('newPin').value.trim();
  const name = document.getElementById('newName').value.trim();
  const dept = document.getElementById('newDept').value;
  const role = document.getElementById('newRole').value;
  const phone = document.getElementById('newPhone').value.trim();

  if (!/^\d{6}$/.test(code)) {
    alert('รหัสพนักงานต้องเป็นตัวเลข 6 หลักเท่านั้นค่ะ (เช่น 200103)');
    return;
  }
  if (!/^\d{6}$/.test(pin)) {
    alert('รหัสผ่านเริ่มต้น PIN ต้องเป็นตัวเลข 6 หลักค่ะ (เช่น 123456)');
    return;
  }
  if (!name) {
    alert('กรุณากรอกชื่อ-นามสกุลพนักงานค่ะ');
    return;
  }

  const btn = document.getElementById('btnSaveNewUser');
  btn.disabled = true;
  btn.innerText = 'กำลังบันทึกลง MySQL...';

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, pin, name, dept, role, phone })
    });
    const data = await res.json();
    if (!data.success) {
      alert('เกิดข้อผิดพลาด: ' + data.message);
      return;
    }

    alert(`เพิ่มบัญชีผู้ใช้ #${code} (${name}) ลงฐานข้อมูล MySQL สำเร็จแล้วค่ะ`);
    closeModal('modalNewUser');
    await loadUsersList();
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ค่ะ');
  } finally {
    btn.disabled = false;
    btn.innerText = 'บันทึกพนักงานใหม่';
  }
}
