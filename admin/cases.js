/**
 * Hotel Operations - Executive & Admin Control Portal: Master Cases Table & Actions
 * Directory: /admin/cases.js
 */

// Master Table from MySQL
async function renderMasterTable() {
  try {
    const res = await fetch('/api/cases');
    const data = await res.json();
    cachedCases = data.cases || [];

    // KPIs
    document.getElementById('kpiTotal').innerText = cachedCases.length;
    document.getElementById('kpiNew').innerText = cachedCases.filter(c => c.status === 'NEW').length;
    document.getElementById('kpiProg').innerText = cachedCases.filter(c => c.status === 'IN_PROGRESS').length;
    document.getElementById('kpiWait').innerText = cachedCases.filter(c => c.status === 'WAITING_PARTS').length;
    document.getElementById('kpiClosed').innerText = cachedCases.filter(c => c.status === 'CLOSED').length;

    filterCasesUI();
  } catch (err) {
    document.getElementById('masterTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#EF4444;">โหลดข้อมูลจาก MySQL ไม่สำเร็จค่ะ</td></tr>`;
  }
}

function filterCasesUI() {
  const q = (document.getElementById('searchInp').value || '').toLowerCase();
  const tbody = document.getElementById('masterTableBody');
  tbody.innerHTML = '';

  const filtered = cachedCases.filter(c => {
    const matchDept = selectedDeptFilter === 'ALL' || c.deptTo === selectedDeptFilter || c.deptFrom === selectedDeptFilter;
    const matchQ = !q || (c.id + c.loc + c.subject + c.reporterName + (c.assigneeName || '')).toLowerCase().includes(q);
    return matchDept && matchQ;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">ไม่พบข้อมูลเคสที่ตรงกับเงื่อนไขใน MySQL</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const tr = document.createElement('tr');
    let assigneeDisplay = '';
    if (c.assigneeName) {
      assigneeDisplay = `<strong>${c.assigneeName}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(#${c.assigneeCode})</span>`;
    } else {
      assigneeDisplay = `<span style="color:#D97706; font-weight:700;">ยังไม่มีคนรับ</span>`;
    }

    let actions = '';
    if (currentRole === 'ADMIN') {
      if (c.status !== 'CLOSED') {
        actions += `<button class="btn-action" onclick="openReroute('${c.id}')">สลับแผนก</button> `;
        actions += `<button class="btn-action btn-danger" onclick="forceClose('${c.id}')">บังคับปิด</button>`;
      } else {
        actions += `<span style="font-size:0.75rem; color:#10B981; font-weight:600;">ปิดเรียบร้อย</span>`;
      }
    } else {
      actions = `<span style="font-size:0.75rem; color:var(--text-muted);">ดูอย่างเดียว</span>`;
    }

    tr.innerHTML = `
      <td><strong>${c.id}</strong><div style="font-size:0.72rem; color:var(--text-muted);">${c.time}</div></td>
      <td><strong>${c.loc}</strong></td>
      <td><span style="font-size:0.75rem; background:#F1F5F9; padding:2px 6px; border-radius:4px;">${c.deptFrom} ➔ ${c.deptTo}</span></td>
      <td>${c.subject}</td>
      <td>${c.reporterName} <span style="font-size:0.72rem; color:var(--text-muted);">(#${c.reporterCode})</span></td>
      <td>${assigneeDisplay}</td>
      <td><span class="tag tag-${c.status}">${getStTh(c.status)}</span></td>
      <td class="col-action">${actions}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setDeptFilter(d, el) {
  selectedDeptFilter = d;
  document.querySelectorAll('#viewCases .filter-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  filterCasesUI();
}

// Admin Override Actions
function openReroute(id) {
  document.getElementById('rerouteCaseId').value = id;
  document.getElementById('modalReroute').classList.add('show');
}

async function confirmReroute() {
  const id = document.getElementById('rerouteCaseId').value;
  const dept = document.getElementById('rerouteDeptSelect').value;

  await fetch('/api/cases/reroute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id, toDept: dept })
  });

  document.getElementById('modalReroute').classList.remove('show');
  await renderMasterTable();
}

async function forceClose(id) {
  if (confirm('คุณต้องการบังคับปิดเคสนี้ในฐานะ Admin ใช่หรือไม่? (จะบันทึกลง MySQL)')) {
    await fetch('/api/cases/force-close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: id })
    });
    await renderMasterTable();
  }
}
