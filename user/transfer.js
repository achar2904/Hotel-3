/**
 * Hotel Operations - Field Staff Portal: Case Transfer / Re-routing
 * Directory: /user/transfer.js
 */

/**
 * Open Cross-Department Case Transfer Modal
 * @param {string} id
 */
function openTransModal(id) {
  const idInp = document.getElementById('transCaseId');
  const reasonInp = document.getElementById('transReason');
  if (idInp) idInp.value = id;
  if (reasonInp) reasonInp.value = '';
  const m = document.getElementById('popTransfer');
  if (m) m.classList.add('show');
}

/**
 * Close Cross-Department Case Transfer Modal
 */
function closeTransModal() {
  const el = document.getElementById('popTransfer');
  if (el) el.classList.remove('show');
}

/**
 * Confirm Case Transfer to Target Department in MySQL
 */
async function confirmTransfer() {
  const id = document.getElementById('transCaseId')?.value;
  const to = document.getElementById('transDept')?.value;
  const r = document.getElementById('transReason')?.value.trim();
  if (!r) {
    alert('กรุณาระบุเหตุผลการโอนย้ายค่ะ');
    return;
  }

  await fetch('/api/cases/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id, toDept: to, reason: r })
  });
  closeTransModal();
  if (typeof renderMyQueue === 'function') {
    await renderMyQueue();
  }
}
