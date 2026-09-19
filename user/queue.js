/**
 * Hotel Operations - Field Staff Portal: Case Queue & Task Operations
 * Directory: /user/queue.js
 */

/**
 * Fetch and render department case queue directly from MySQL
 */
async function renderMyQueue() {
  const ctn = document.getElementById('queueContainer');
  if (!ctn) return;
  ctn.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">กำลังดึงข้อมูลจาก MySQL...</div>';

  try {
    const res = await fetch('/api/cases');
    const data = await res.json();
    const list = data.cases || [];

    const myItems = list.filter(c => c.deptTo === currentUser.dept || c.deptFrom === currentUser.dept);
    const badge = document.getElementById('queueBadge');
    const title = document.getElementById('queueTitle');
    const sub = document.getElementById('queueSub');

    if (badge) badge.innerText = myItems.filter(c => c.deptTo === currentUser.dept && c.status !== 'CLOSED').length;
    if (title) title.innerText = `คิวงานของแผนก ${getDeptTh(currentUser.dept)}`;
    if (sub) sub.innerText = `พบ ${myItems.length} รายการในฐานข้อมูล MySQL ที่เกี่ยวข้องกับแผนกคุณ`;

    ctn.innerHTML = '';

    if (myItems.length === 0) {
      ctn.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">ไม่มีงานค้างในแผนกของคุณในขณะนี้</div>`;
      return;
    }

    myItems.forEach(item => {
      const isMyDept = item.deptTo === currentUser.dept;
      const div = document.createElement('div');
      div.className = `case-card ${item.status === 'NEW' ? 'highlight' : ''}`;

      let assigneeHtml = '';
      if (item.assigneeName) {
        assigneeHtml = `
          <div class="assignee-box">
            <div class="assignee-name">
              <span>ผู้รับงาน:</span>
              <strong>${item.assigneeName} (#${item.assigneeCode})</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">(รับเมื่อ: ${item.acceptedAt || item.time})</span>
            </div>
            ${item.assigneePhone && item.assigneePhone !== '-' ? `<a href="tel:${item.assigneePhone}" class="assignee-call">โทร ${item.assigneePhone}</a>` : ''}
          </div>
        `;
      } else {
        assigneeHtml = `
          <div class="assignee-box" style="background:#FFFBEB; border-color:#FCD34D;">
            <span style="color:#92400E; font-weight:700;">ยังไม่มีผู้รับผิดชอบ (รอพนักงานกดรับงาน)</span>
          </div>
        `;
      }

      let btns = '';
      if (item.status === 'NEW' && isMyDept) {
        btns += `<button class="act-btn btn-accept" onclick="acceptCase('${item.id}')">กดรับงานนี้ (บันทึกชื่อฉัน)</button>`;
      }
      if (item.status === 'IN_PROGRESS' && isMyDept) {
        btns += `<button class="act-btn btn-done" onclick="openDoneModal('${item.id}')">ซ่อมเสร็จแล้ว (ปิดงานทันที)</button>`;
        btns += `<button class="act-btn btn-wait" onclick="waitParts('${item.id}')">รออะไหล่ (พักเวลา)</button>`;
      }
      if (item.status === 'WAITING_PARTS' && isMyDept) {
        btns += `<button class="act-btn btn-accept" onclick="resumeWork('${item.id}')">ได้อะไหล่แล้ว ดำเนินการต่อ</button>`;
      }
      if (item.status !== 'CLOSED') {
        btns += `<button class="act-btn" onclick="openTransModal('${item.id}')">โอนย้ายแผนก</button>`;
      }

      div.innerHTML = `
        <div class="case-header-row">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="case-id-txt">${item.id}</span>
            <span style="font-weight:700; font-size:0.95rem;">${item.loc}</span>
          </div>
          <span class="st-tag st-${item.status}">${getStTh(item.status)}</span>
        </div>
        <div class="case-subj-txt">${item.subject}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          ผู้แจ้ง: <strong>${item.reporterName} (#${item.reporterCode})</strong> แผนก${item.deptFrom} ➔ ถึง: <strong>${item.deptTo}</strong> • เวลา: ${item.time}
        </div>
        ${assigneeHtml}
        ${item.photo ? `<div style="margin-top:4px;"><img src="${item.photo}" style="height:64px; border-radius:6px; object-fit:cover;"></div>` : ''}
        <div class="case-act-row">
          ${btns || `<span style="font-size:0.8rem; color:#10B981; font-weight:600;">✓ ปิดงานเรียบร้อยแล้วโดย ${item.closedBy || item.assigneeName} (${item.closedAt || ''})</span>`}
        </div>
      `;
      ctn.appendChild(div);
    });

  } catch (err) {
    ctn.innerHTML = `<div style="text-align:center; padding:30px; color:#EF4444;">ไม่สามารถเชื่อมต่อข้อมูลจาก MySQL ได้ค่ะ</div>`;
  }
}

/**
 * Accept task and assign to current user in MySQL
 * @param {string} id
 */
async function acceptCase(id) {
  await fetch('/api/cases/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id })
  });
  await renderMyQueue();
}

/**
 * Set case to WAITING_PARTS status in MySQL
 * @param {string} id
 */
async function waitParts(id) {
  await fetch('/api/cases/wait-parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id })
  });
  await renderMyQueue();
}

/**
 * Resume case from WAITING_PARTS back to IN_PROGRESS in MySQL
 * @param {string} id
 */
async function resumeWork(id) {
  await fetch('/api/cases/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id })
  });
  await renderMyQueue();
}

/**
 * Open Task Completion Modal
 * @param {string} id
 */
function openDoneModal(id) {
  const inp = document.getElementById('doneCaseId');
  if (inp) inp.value = id;
  const m = document.getElementById('popDone');
  if (m) m.classList.add('show');
}

/**
 * Close Task Completion Modal
 */
function closeDoneModal() {
  const el = document.getElementById('popDone');
  if (el) el.classList.remove('show');
}

/**
 * Confirm Task Completion in MySQL
 */
async function confirmDone() {
  const id = document.getElementById('doneCaseId')?.value;
  const note = document.getElementById('doneNote')?.value;
  await fetch('/api/cases/done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id, note })
  });
  closeDoneModal();
  await renderMyQueue();
}
