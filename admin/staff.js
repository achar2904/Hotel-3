/**
 * Hotel Operations - Executive & Admin Control Portal: Staff Workload Tracker
 * Directory: /admin/staff.js
 */

// Staff Table from MySQL
async function renderStaffTable() {
  const tbody = document.getElementById('staffTblBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">กำลังคำนวณภาระงานจาก MySQL...</td></tr>';

  try {
    const res = await fetch('/api/staff');
    const data = await res.json();
    const staff = data.staff || [];

    tbody.innerHTML = '';
    if (staff.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">ไม่พบข้อมูลพนักงานในระบบ</td></tr>';
      return;
    }

    staff.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${u.code}</strong></td>
        <td>${u.name}</td>
        <td><span style="font-weight:600;">${u.dept}</span></td>
        <td>${u.activeTask !== '-' ? `<code>${u.activeTask}</code>` : '<span style="color:var(--text-muted);">- ว่าง -</span>'}</td>
        <td><strong style="color:${u.pending > 0 ? '#D97706' : '#64748B'};">${u.pending} งาน</strong></td>
        <td><strong style="color:#10B981;">${u.done} งาน</strong></td>
        <td>${u.phone}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#EF4444;">โหลดข้อมูลไม่สำเร็จ</td></tr>';
  }
}
