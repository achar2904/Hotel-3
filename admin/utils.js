/**
 * Hotel Operations - Executive & Admin Control Portal: Utilities & Shared State
 * Directory: /admin/utils.js
 */

// Shared State Variables
let currentRole = 'ADMIN';
let selectedDeptFilter = 'ALL';
let cachedCases = [];
let cachedRooms = [];
let currentRoomFloor = 'ALL';
let currentRoomStatus = 'ALL';
let selectedRoomNo = null;
let cachedUsers = [];

/**
 * Status translation to Thai
 * @param {string} s
 * @returns {string}
 */
function getStTh(s) {
  if (s === 'NEW') return 'รอรับเรื่อง';
  if (s === 'IN_PROGRESS') return 'กำลังทำ';
  if (s === 'WAITING_PARTS') return 'รออะไหล่';
  if (s === 'CLOSED') return 'ปิดงานแล้ว';
  return s || '-';
}

/**
 * Department translation to Thai
 * @param {string} d
 * @returns {string}
 */
function getDeptTh(d) {
  if (d === 'ENG') return 'ช่าง';
  if (d === 'HK') return 'แม่บ้าน';
  if (d === 'IT') return 'ไอที';
  if (d === 'FRONT') return 'ฟร้อนท์';
  if (d === 'ALL') return 'บริหารส่วนกลาง';
  return d || '-';
}

/**
 * Close modal by element ID
 * @param {string} id
 */
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}
