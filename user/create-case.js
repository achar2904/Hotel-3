/**
 * Hotel Operations - Field Staff Portal: Case Creation
 * Directory: /user/create-case.js
 */

let targetDept = 'ENG';
let hasPic = false;

/**
 * Select Target Department to receive the case
 * @param {string} d
 */
function pickDept(d) {
  targetDept = d;
  document.querySelectorAll('.dept-card-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.dept-card-btn[data-dept="${d}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  renderChips();
}

/**
 * Render Quick Issue Chips for currently selected department
 */
function renderChips() {
  const box = document.getElementById('chipBox');
  if (!box) return;
  box.innerHTML = '';

  const chips = CHIPS_DATA[targetDept] || [];
  chips.forEach(text => {
    const span = document.createElement('span');
    span.className = 'issue-chip';
    span.innerText = text;
    span.onclick = function() {
      document.querySelectorAll('.issue-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const inp = document.getElementById('inpSubject');
      if (inp) inp.value = text;
    };
    box.appendChild(span);
  });
}

/**
 * Select Quick Room Pill
 * @param {string} r
 */
function pickRoom(r) {
  document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) {
    window.event.target.classList.add('active');
  }
  const locInp = document.getElementById('inpLoc');
  if (locInp) locInp.value = 'ห้อง ' + r;
}

/**
 * Mock Camera Capture Section
 */
function mockCamera() {
  hasPic = true;
  const prev = document.getElementById('camPrev');
  if (prev) prev.style.display = 'block';
}

function delPhoto() {
  hasPic = false;
  const prev = document.getElementById('camPrev');
  if (prev) prev.style.display = 'none';
}

/**
 * Submit Case to MySQL Database (/api/cases)
 */
async function doSubmit() {
  const loc = document.getElementById('inpLoc')?.value.trim();
  const subj = document.getElementById('inpSubject')?.value.trim();
  if (!loc || !subj) {
    alert('กรุณาระบุเลขห้องและปัญหาที่พบค่ะ');
    return;
  }

  const btn = document.getElementById('btnSubmit');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'กำลังบันทึกลง MySQL...';
  }

  try {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loc,
        subject: subj,
        deptTo: targetDept,
        photo: hasPic ? 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80' : null
      })
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      alert('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถบันทึกข้อมูลได้ค่ะ'));
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'ส่งแจ้งเคสเข้า MySQL ทันที';
      }
      return;
    }

    const popCase = document.getElementById('popCaseId');
    const popSum = document.getElementById('popSummary');
    const popSuc = document.getElementById('popSuccess');
    if (popCase) popCase.innerText = result.caseId;
    if (popSum) popSum.innerText = result.summary;
    if (popSuc) popSuc.classList.add('show');

    const inpSubject = document.getElementById('inpSubject');
    if (inpSubject) inpSubject.value = '';
    delPhoto();
  } catch (err) {
    alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ MySQL ได้ค่ะ');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'ส่งแจ้งเคสเข้า MySQL ทันที';
    }
  }
}

/**
 * Close Case Submission Success Modal
 */
function closeSuccess() {
  const popSuc = document.getElementById('popSuccess');
  if (popSuc) popSuc.classList.remove('show');
  if (typeof switchView === 'function') {
    switchView('queue');
  }
}
