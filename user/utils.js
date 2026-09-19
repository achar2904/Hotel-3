/**
 * Hotel Operations - Field Staff Portal: Utilities & Data Constants
 * Directory: /user/utils.js
 */

// Global User State
const currentUser = {
  code: '',
  name: '',
  dept: '',
  phone: ''
};

// Thai translations for department codes
const DEPT_NAMES_TH = {
  ENG: 'ช่าง',
  HK: 'แม่บ้าน',
  IT: 'ไอที',
  FRONT: 'ฟร้อนท์',
  ALL: 'บริหารส่วนกลาง'
};

// Thai translations for case statuses
const STATUS_NAMES_TH = {
  NEW: 'รอรับเรื่อง',
  IN_PROGRESS: 'กำลังทำ',
  WAITING_PARTS: 'รออะไหล่',
  CLOSED: 'ปิดงานแล้ว'
};

// Quick issue shortcut chips grouped by target department
const CHIPS_DATA = {
  ENG: [
    'แอร์ไม่เย็น',
    'ท่อน้ำรั่ว/ตัน',
    'ไฟดับ/ปลั๊กเสีย',
    'ลูกบิดประตูเสีย',
    'เครื่องทำน้ำอุ่นเสีย',
    'เฟอร์นิเจอร์ชำรุด'
  ],
  HK: [
    'ทำความสะอาดด่วน',
    'ขอผ้าปู/ผ้าเช็ดตัวเพิ่ม',
    'เติมของใช้ในห้อง',
    'ขยะล้น',
    'เช็ดกระจก'
  ],
  IT: [
    'Wi-Fi ใช้งานไม่ได้',
    'คอมพิวเตอร์เปิดไม่ติด',
    'เครื่องพิมพ์ขัดข้อง',
    'โทรศัพท์ภายในเสีย',
    'ทีวีไม่เชื่อมเน็ต'
  ],
  FRONT: [
    'ช่วยยกกระเป๋า',
    'เรียกรถรับส่ง',
    'บริการโทรปลุก',
    'เช็คบิลด่วน'
  ]
};

/**
 * Returns Thai name for a given department code
 * @param {string} deptCode
 * @returns {string}
 */
function getDeptTh(deptCode) {
  return DEPT_NAMES_TH[deptCode] || deptCode || '-';
}

/**
 * Returns Thai name for a given case status
 * @param {string} statusCode
 * @returns {string}
 */
function getStTh(statusCode) {
  return STATUS_NAMES_TH[statusCode] || statusCode || '-';
}
