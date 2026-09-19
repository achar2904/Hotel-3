const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  console.log('--- Connecting to MySQL Server ---');
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    multipleStatements: true
  });

  console.log('--- Running init-mysql.sql ---');
  const sql = fs.readFileSync(path.join(__dirname, 'init-mysql.sql'), 'utf-8');
  await connection.query(sql);

  console.log('--- Seeding all 422 Hotel Rooms ---');
  const floorRanges = [
    { floor: 1, start: 101, end: 185 },
    { floor: 2, start: 201, end: 285 },
    { floor: 3, start: 301, end: 385 },
    { floor: 4, start: 401, end: 485 },
    { floor: 5, start: 501, end: 582 }
  ];

  const roomValues = [];
  floorRanges.forEach(fl => {
    for (let r = fl.start; r <= fl.end; r++) {
      const roomNo = String(r);
      let status = 'AVAILABLE';
      let reason = 'ห้องว่าง สภาพสมบูรณ์ พร้อมเปิดรับแขก';
      let roomType = fl.floor >= 5 ? 'Executive Suite' : (fl.floor >= 3 ? 'Deluxe Room' : 'Standard Room');

      if (roomNo === '102') {
        status = 'MAINTENANCE';
        reason = 'แอร์ไม่เย็น มีเสียงดังผิดปกติ (CASE-20260908-0001)';
      } else if (roomNo === '305') {
        status = 'MAINTENANCE';
        reason = 'สัญญาณ Wi-Fi ไม่ขึ้นในห้องพัก (CASE-20260908-0002)';
      } else if (roomNo === '412') {
        status = 'MAINTENANCE';
        reason = 'ปิดห้องตามรอบบำรุงรักษา ทาสีผนังและตรวจสุขภัณฑ์';
      } else if (roomNo === '201') {
        status = 'AVAILABLE';
        reason = 'ทำความสะอาดด่วนเสร็จสิ้นเรียบร้อย สภาพห้องพร้อมขาย 100%';
      }

      roomValues.push([roomNo, 'Regent Main Wing', fl.floor, roomType, status, reason]);
    }
  });

  console.log(`Generated ${roomValues.length} room rows. Inserting into MySQL...`);
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('TRUNCATE TABLE rooms;');
  await connection.query(
    'INSERT INTO rooms (room_no, building, floor, room_type, status, closed_reason) VALUES ?',
    [roomValues]
  );
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  const [countRes] = await connection.query('SELECT COUNT(*) as cnt FROM rooms;');
  console.log(`✅ Success! Total rooms currently in MySQL: ${countRes[0].cnt}`);

  const [usersRes] = await connection.query('SELECT username, full_name, role, dept_code FROM users;');
  console.log('✅ Users in MySQL:', usersRes);

  await connection.end();
  console.log('--- Database Setup Finished Successfully ---');
}

seedDatabase().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
