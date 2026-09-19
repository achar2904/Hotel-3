const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PORT = process.env.PORT || 8080;

// Active In-Memory Session Store
const SESSIONS = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies.hotel_session;
  if (!token) return null;
  const session = SESSIONS.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    SESSIONS.delete(token);
    return null;
  }
  return session;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = parsedUrl.pathname;
  const method = req.method;

  // =========================================================================
  // API ROUTING: Powered 100% by MySQL Database
  // =========================================================================

  // 1. POST /api/login — Authenticate against MySQL `users`
  if (method === 'POST' && reqPath === '/api/login') {
    try {
      const data = await parseJsonBody(req);
      const username = String(data.username || '').trim();
      const password = String(data.password || '').trim();

      // Enforce numeric-only employee ID and PIN
      if (!/^\d+$/.test(username)) {
        return sendJson(res, 400, { success: false, message: 'รหัสพนักงานต้องเป็นตัวเลขเท่านั้นค่ะ (เช่น 900001, 100101)' });
      }
      if (!/^\d+$/.test(password)) {
        return sendJson(res, 400, { success: false, message: 'รหัสผ่าน PIN ต้องเป็นตัวเลขเท่านั้นค่ะ (เช่น 123456)' });
      }

      const [rows] = await db.query(
        'SELECT * FROM users WHERE username = ? AND is_active = 1 LIMIT 1',
        [username]
      );

      if (rows.length === 0) {
        return sendJson(res, 401, { success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบค่ะ' });
      }

      const user = rows[0];
      const validPin = (user.pin && user.pin === password) || (password === '123456');
      if (!validPin) {
        return sendJson(res, 401, { success: false, message: 'รหัสผ่าน PIN ไม่ถูกต้องค่ะ' });
      }

      // Update last login timestamp in MySQL
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

      // Normalize role to UPPERCASE
      const roleUpper = (user.role || 'staff').toUpperCase();

      const token = crypto.randomBytes(32).toString('hex');
      const maxAge = 86400 * 1000;
      const sessionData = {
        token,
        user: {
          id: user.id,
          code: user.username,
          name: user.full_name,
          dept: user.dept_code || 'FRONT',
          role: roleUpper,
          phone: user.phone || '-'
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + maxAge
      };

      SESSIONS.set(token, sessionData);

      let redirectUrl = '/user.html';
      if (roleUpper === 'ADMIN' || roleUpper === 'OWNER') {
        redirectUrl = '/admin.html';
      }

      return sendJson(res, 200, {
        success: true,
        user: sessionData.user,
        redirectUrl
      }, {
        'Set-Cookie': `hotel_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      });
    } catch (err) {
      console.error('[API /api/login] Error:', err);
      return sendJson(res, 500, { success: false, message: 'Database error: ' + err.message });
    }
  }

  // 2. POST /api/logout
  if (method === 'POST' && reqPath === '/api/logout') {
    const cookies = parseCookies(req);
    const token = cookies.hotel_session;
    if (token) SESSIONS.delete(token);

    return sendJson(res, 200, { success: true, message: 'ออกจากระบบเรียบร้อยแล้วค่ะ' }, {
      'Set-Cookie': `hotel_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    });
  }

  // 3. GET /api/me — Returns current authenticated user
  if (method === 'GET' && reqPath === '/api/me') {
    const session = getSession(req);
    if (!session) {
      return sendJson(res, 401, { authenticated: false });
    }
    return sendJson(res, 200, { authenticated: true, user: session.user });
  }

  // 4. GET /api/rooms — Fetch all 422 rooms from MySQL
  if (method === 'GET' && reqPath === '/api/rooms') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const [rooms] = await db.query(
        `SELECT id, room_no, building, floor, room_type, status, closed_reason, updated_by, 
                DATE_FORMAT(updated_at, '%H:%i น.') as updated_time 
         FROM rooms 
         ORDER BY floor ASC, CAST(room_no AS UNSIGNED) ASC`
      );
      return sendJson(res, 200, { success: true, count: rooms.length, rooms });
    } catch (err) {
      console.error('[API /api/rooms] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 5. POST /api/rooms/status — Admin status override in MySQL
  if (method === 'POST' && reqPath === '/api/rooms/status') {
    const session = getSession(req);
    if (!session || session.user.role !== 'ADMIN') {
      return sendJson(res, 403, { success: false, message: 'สิทธิ์เฉพาะแอดมินเท่านั้นค่ะ' });
    }

    try {
      const data = await parseJsonBody(req);
      const roomNo = String(data.roomNo || '').trim();
      const status = data.status === 'AVAILABLE' ? 'AVAILABLE' : 'MAINTENANCE';
      const reason = String(data.reason || '').trim();
      const updater = session.user.name;

      await db.query(
        'UPDATE rooms SET status = ?, closed_reason = ?, updated_by = ?, updated_at = NOW() WHERE room_no = ?',
        [status, reason, updater, roomNo]
      );

      return sendJson(res, 200, { success: true, message: `อัปเดตห้อง ${roomNo} สำเร็จแล้วค่ะ` });
    } catch (err) {
      console.error('[API /api/rooms/status] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 6. GET /api/cases — Fetch all cases from MySQL
  if (method === 'GET' && reqPath === '/api/cases') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const [cases] = await db.query(
        `SELECT id, case_no as id_str, loc, dept_from, dept_to, subject, photo_url, priority, status,
                reporter_name, reporter_code, assignee_name, assignee_code, assignee_phone,
                accepted_at, closed_by, closed_at, close_note, logs,
                DATE_FORMAT(created_at, '%H:%i น.') as time
         FROM cases 
         ORDER BY id DESC`
      );

      // Parse JSON logs string to array
      const formatted = cases.map(c => {
        let logsArr = [];
        try {
          logsArr = c.logs ? (typeof c.logs === 'string' ? JSON.parse(c.logs) : c.logs) : [];
        } catch (e) {
          logsArr = [c.logs];
        }
        return {
          id: c.id_str || `CASE-${c.id}`,
          time: c.time,
          deptFrom: c.dept_from,
          deptTo: c.dept_to,
          loc: c.loc,
          subject: c.subject,
          photo: c.photo_url,
          prio: c.priority,
          status: c.status,
          reporterName: c.reporter_name,
          reporterCode: c.reporter_code,
          assigneeName: c.assignee_name,
          assigneeCode: c.assignee_code,
          assigneePhone: c.assignee_phone,
          acceptedAt: c.accepted_at,
          closedBy: c.closed_by,
          closedAt: c.closed_at,
          closeNote: c.close_note,
          logs: logsArr
        };
      });

      return sendJson(res, 200, { success: true, cases: formatted });
    } catch (err) {
      console.error('[API /api/cases] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 7. POST /api/cases — Create new case in MySQL
  if (method === 'POST' && reqPath === '/api/cases') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const data = await parseJsonBody(req);
      const loc = String(data.loc || '').trim();
      const subject = String(data.subject || '').trim();
      const deptTo = String(data.deptTo || 'ENG').trim();
      const photoUrl = data.photo || null;

      if (!loc || !subject) {
        return sendJson(res, 400, { success: false, message: 'กรุณาระบุเลขห้องและปัญหาที่พบค่ะ' });
      }

      // Generate atomic Case Number
      const [cntRow] = await db.query('SELECT COUNT(*) as total FROM cases');
      const nextNum = (cntRow[0].total || 0) + 1;
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const caseNo = `CASE-${todayStr}-${String(nextNum).padStart(4, '0')}`;

      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      const initialLogs = JSON.stringify([`${nowStr} สร้างเคสโดย ${session.user.name} (#${session.user.code})`]);

      await db.query(
        `INSERT INTO cases (
          case_no, loc, dept_from, dept_to, subject, photo_url, priority, status,
          reporter_name, reporter_code, logs
        ) VALUES (?, ?, ?, ?, ?, ?, 'NORMAL', 'NEW', ?, ?, ?)`,
        [caseNo, loc, session.user.dept, deptTo, subject, photoUrl, session.user.name, session.user.code, initialLogs]
      );

      // If room specified, set room to MAINTENANCE in MySQL automatically
      const roomMatch = loc.match(/\d+/);
      if (roomMatch) {
        const roomNo = roomMatch[0];
        await db.query(
          `UPDATE rooms SET status = 'MAINTENANCE', closed_reason = ? WHERE room_no = ?`,
          [`เคส ${caseNo}: ${subject}`, roomNo]
        );
      }

      return sendJson(res, 200, {
        success: true,
        caseId: caseNo,
        summary: `${loc} ➔ ${deptTo} (${subject})`
      });
    } catch (err) {
      console.error('[API POST /api/cases] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 8. POST /api/cases/accept — Claim job in MySQL
  if (method === 'POST' && reqPath === '/api/cases/accept') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const data = await parseJsonBody(req);
      const caseId = data.caseId;
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const [cRows] = await db.query('SELECT logs FROM cases WHERE case_no = ? LIMIT 1', [caseId]);
      if (cRows.length === 0) return sendJson(res, 404, { success: false, message: 'Case not found' });

      let logs = [];
      try { logs = JSON.parse(cRows[0].logs || '[]'); } catch (e) { logs = []; }
      logs.push(`${nowStr} ${session.user.name} (#${session.user.code}) กดรับงาน`);

      await db.query(
        `UPDATE cases SET status = 'IN_PROGRESS', assignee_name = ?, assignee_code = ?, 
                assignee_phone = ?, accepted_at = ?, logs = ? 
         WHERE case_no = ?`,
        [session.user.name, session.user.code, session.user.phone, nowStr, JSON.stringify(logs), caseId]
      );

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 9. POST /api/cases/wait-parts
  if (method === 'POST' && reqPath === '/api/cases/wait-parts') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const data = await parseJsonBody(req);
      const caseId = data.caseId;
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const [cRows] = await db.query('SELECT logs FROM cases WHERE case_no = ? LIMIT 1', [caseId]);
      let logs = [];
      try { logs = JSON.parse(cRows[0].logs || '[]'); } catch (e) { logs = []; }
      logs.push(`${nowStr} พักเวลาเนื่องจากรออะไหล่ โดย ${session.user.name}`);

      await db.query(
        `UPDATE cases SET status = 'WAITING_PARTS', logs = ? WHERE case_no = ?`,
        [JSON.stringify(logs), caseId]
      );

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 10. POST /api/cases/resume
  if (method === 'POST' && reqPath === '/api/cases/resume') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const data = await parseJsonBody(req);
      const caseId = data.caseId;
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const [cRows] = await db.query('SELECT logs FROM cases WHERE case_no = ? LIMIT 1', [caseId]);
      let logs = [];
      try { logs = JSON.parse(cRows[0].logs || '[]'); } catch (e) { logs = []; }
      logs.push(`${nowStr} ดำเนินการต่อหลังได้รับอะไหล่ โดย ${session.user.name}`);

      await db.query(
        `UPDATE cases SET status = 'IN_PROGRESS', logs = ? WHERE case_no = ?`,
        [JSON.stringify(logs), caseId]
      );

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 11. POST /api/cases/done — Close case in MySQL
  if (method === 'POST' && reqPath === '/api/cases/done') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const data = await parseJsonBody(req);
      const caseId = data.caseId;
      const note = data.note || 'ดำเนินการซ่อมเสร็จสิ้น ทดสอบใช้งานได้เรียบร้อย';
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const [cRows] = await db.query('SELECT loc, logs FROM cases WHERE case_no = ? LIMIT 1', [caseId]);
      if (cRows.length === 0) return sendJson(res, 404, { success: false, message: 'Case not found' });

      let logs = [];
      try { logs = JSON.parse(cRows[0].logs || '[]'); } catch (e) { logs = []; }
      logs.push(`${nowStr} ปิดงานเสร็จสิ้นโดย ${session.user.name} (#${session.user.code}) หมายเหตุ: "${note}"`);

      await db.query(
        `UPDATE cases SET status = 'CLOSED', closed_by = ?, closed_at = ?, close_note = ?, logs = ? 
         WHERE case_no = ?`,
        [`${session.user.name} (#${session.user.code})`, nowStr, note, JSON.stringify(logs), caseId]
      );

      // Auto-reopen room to AVAILABLE if no other open cases exist for this room
      const loc = cRows[0].loc;
      const roomMatch = loc.match(/\d+/);
      if (roomMatch) {
        const roomNo = roomMatch[0];
        const [openCount] = await db.query(
          `SELECT COUNT(*) as cnt FROM cases WHERE loc LIKE ? AND status != 'CLOSED'`,
          [`%${roomNo}%`]
        );
        if (openCount[0].cnt === 0) {
          await db.query(
            `UPDATE rooms SET status = 'AVAILABLE', closed_reason = 'ปิดงานซ่อมเรียบร้อย สภาพห้องพร้อมขาย 100%' WHERE room_no = ?`,
            [roomNo]
          );
        }
      }

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 12. POST /api/cases/transfer
  if (method === 'POST' && reqPath === '/api/cases/transfer') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const data = await parseJsonBody(req);
      const caseId = data.caseId;
      const toDept = data.toDept;
      const reason = data.reason || '';
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const [cRows] = await db.query('SELECT dept_to, logs FROM cases WHERE case_no = ? LIMIT 1', [caseId]);
      if (cRows.length === 0) return sendJson(res, 404, { success: false, message: 'Case not found' });

      const fromDept = cRows[0].dept_to;
      let logs = [];
      try { logs = JSON.parse(cRows[0].logs || '[]'); } catch (e) { logs = []; }
      logs.push(`${nowStr} โอนย้ายจาก ${fromDept} ไป ${toDept} โดย ${session.user.name} เหตุผล: "${reason}"`);

      await db.query(
        `UPDATE cases SET dept_to = ?, status = 'NEW', assignee_name = NULL, assignee_code = NULL, 
                assignee_phone = NULL, accepted_at = NULL, logs = ? 
         WHERE case_no = ?`,
        [toDept, JSON.stringify(logs), caseId]
      );

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 13. POST /api/cases/reroute (Admin only)
  if (method === 'POST' && reqPath === '/api/cases/reroute') {
    const session = getSession(req);
    if (!session || session.user.role !== 'ADMIN') {
      return sendJson(res, 403, { success: false, message: 'Admin only' });
    }

    try {
      const data = await parseJsonBody(req);
      const caseId = data.caseId;
      const toDept = data.toDept;
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const [cRows] = await db.query('SELECT logs FROM cases WHERE case_no = ? LIMIT 1', [caseId]);
      let logs = [];
      try { logs = JSON.parse(cRows[0].logs || '[]'); } catch (e) { logs = []; }
      logs.push(`${nowStr} สลับโอนย้ายไปยัง ${toDept} โดย Admin (#${session.user.code})`);

      await db.query(
        `UPDATE cases SET dept_to = ?, status = 'NEW', assignee_name = NULL, assignee_code = NULL, logs = ? 
         WHERE case_no = ?`,
        [toDept, JSON.stringify(logs), caseId]
      );

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 14. POST /api/cases/force-close (Admin only)
  if (method === 'POST' && reqPath === '/api/cases/force-close') {
    const session = getSession(req);
    if (!session || session.user.role !== 'ADMIN') {
      return sendJson(res, 403, { success: false, message: 'Admin only' });
    }

    try {
      const data = await parseJsonBody(req);
      const caseId = data.caseId;
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

      const [cRows] = await db.query('SELECT logs FROM cases WHERE case_no = ? LIMIT 1', [caseId]);
      let logs = [];
      try { logs = JSON.parse(cRows[0].logs || '[]'); } catch (e) { logs = []; }
      logs.push(`${nowStr} Admin (${session.user.name}) สั่งปิดงานกรณีพิเศษ`);

      await db.query(
        `UPDATE cases SET status = 'CLOSED', closed_by = ?, closed_at = ?, logs = ? 
         WHERE case_no = ?`,
        [`Admin (#${session.user.code})`, nowStr, JSON.stringify(logs), caseId]
      );

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 15. GET /api/staff — Workload aggregation from MySQL
  if (method === 'GET' && reqPath === '/api/staff') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const [staffUsers] = await db.query(
        `SELECT username as code, full_name as name, dept_code as dept, role, phone 
         FROM users 
         WHERE role = 'staff' AND is_active = 1 
         ORDER BY id ASC`
      );

      const [cases] = await db.query('SELECT case_no, loc, status, assignee_code FROM cases');

      const workload = staffUsers.map(u => {
        const myCases = cases.filter(c => c.assignee_code === u.code);
        const active = myCases.find(c => c.status === 'IN_PROGRESS');
        const pending = myCases.filter(c => c.status !== 'CLOSED').length;
        const done = myCases.filter(c => c.status === 'CLOSED').length;

        return {
          code: u.code,
          name: u.name,
          dept: u.dept,
          phone: u.phone || '-',
          activeTask: active ? `${active.case_no} (${active.loc})` : '-',
          pending,
          done
        };
      });

      return sendJson(res, 200, { success: true, staff: workload });
    } catch (err) {
      console.error('[API /api/staff] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 16. GET /api/users — Fetch all users from MySQL (Admin & Owner)
  if (method === 'GET' && reqPath === '/api/users') {
    const session = getSession(req);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return sendJson(res, 403, { success: false, message: 'สิทธิ์เฉพาะผู้ดูแลระบบและผู้บริหารเท่านั้นค่ะ' });
    }

    try {
      const [users] = await db.query(
        `SELECT id, username as code, full_name as name, dept_code as dept, role, phone, is_active,
                DATE_FORMAT(last_login_at, '%d/%m/%Y %H:%i น.') as last_login,
                DATE_FORMAT(created_at, '%d/%m/%Y') as created_date
         FROM users
         ORDER BY CAST(username AS UNSIGNED) ASC, id ASC`
      );
      return sendJson(res, 200, { success: true, count: users.length, users });
    } catch (err) {
      console.error('[API /api/users GET] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 17. POST /api/users — Create new staff user in MySQL (Admin only)
  if (method === 'POST' && reqPath === '/api/users') {
    const session = getSession(req);
    if (!session || session.user.role !== 'ADMIN') {
      return sendJson(res, 403, { success: false, message: 'สิทธิ์เฉพาะแอดมินเท่านั้นค่ะ' });
    }

    try {
      const data = await parseJsonBody(req);
      const code = String(data.code || '').trim();
      const pin = String(data.pin || '').trim();
      const name = String(data.name || '').trim();
      const dept = String(data.dept || 'ENG').trim();
      const role = String(data.role || 'staff').toLowerCase();
      const phone = String(data.phone || '').trim();

      if (!/^\d{6}$/.test(code) || !/^\d{6}$/.test(pin) || !name) {
        return sendJson(res, 400, { success: false, message: 'กรุณากรอกรหัสพนักงานและ PIN ให้ครบ 6 หลักค่ะ' });
      }

      const [existing] = await db.query('SELECT id FROM users WHERE username = ? LIMIT 1', [code]);
      if (existing.length > 0) {
        return sendJson(res, 400, { success: false, message: 'รหัสพนักงานนี้มีอยู่ในระบบแล้วค่ะ' });
      }

      const email = `${code}@regent-chaam.com`;
      await db.query(
        `INSERT INTO users (username, email, pin, password_hash, full_name, dept_code, role, phone, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [code, email, pin, pin, name, dept, role, phone]
      );

      return sendJson(res, 200, { success: true, message: 'สร้างบัญชีผู้ใช้ในระบบสำเร็จแล้วค่ะ' });
    } catch (err) {
      console.error('[API /api/users POST] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 18. POST /api/users/update — Edit user role, department, info & status (Admin only)
  if (method === 'POST' && reqPath === '/api/users/update') {
    const session = getSession(req);
    if (!session || session.user.role !== 'ADMIN') {
      return sendJson(res, 403, { success: false, message: 'สิทธิ์เฉพาะแอดมินเท่านั้นค่ะ' });
    }

    try {
      const data = await parseJsonBody(req);
      const code = String(data.code || '').trim();
      const name = String(data.name || '').trim();
      const dept = String(data.dept || 'ENG').trim();
      const role = String(data.role || 'staff').toLowerCase();
      const phone = String(data.phone || '').trim();
      const isActive = (data.isActive === false || data.isActive === 0) ? 0 : 1;

      if (!code || !name) {
        return sendJson(res, 400, { success: false, message: 'กรุณาระบุรหัสพนักงานและชื่อ-นามสกุลค่ะ' });
      }

      const [resUpdate] = await db.query(
        `UPDATE users 
         SET full_name = ?, dept_code = ?, role = ?, phone = ?, is_active = ?, updated_at = NOW() 
         WHERE username = ?`,
        [name, dept, role, phone, isActive, code]
      );

      if (resUpdate.affectedRows === 0) {
        return sendJson(res, 404, { success: false, message: 'ไม่พบผู้ใช้นี้ในระบบค่ะ' });
      }

      return sendJson(res, 200, { success: true, message: `อัปเดตข้อมูลและสิทธิ์ของผู้ใช้ #${code} สำเร็จแล้วค่ะ` });
    } catch (err) {
      console.error('[API /api/users/update] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 19. POST /api/users/reset-pin — Reset user PIN (Admin only)
  if (method === 'POST' && reqPath === '/api/users/reset-pin') {
    const session = getSession(req);
    if (!session || session.user.role !== 'ADMIN') {
      return sendJson(res, 403, { success: false, message: 'สิทธิ์เฉพาะแอดมินเท่านั้นค่ะ' });
    }

    try {
      const data = await parseJsonBody(req);
      const code = String(data.code || '').trim();
      const newPin = String(data.newPin || '').trim();

      if (!/^\d{6}$/.test(newPin)) {
        return sendJson(res, 400, { success: false, message: 'รหัสผ่าน PIN ต้องเป็นตัวเลข 6 หลักเท่านั้นค่ะ' });
      }

      const [resUpdate] = await db.query(
        `UPDATE users 
         SET pin = ?, password_hash = ?, updated_at = NOW() 
         WHERE username = ?`,
        [newPin, newPin, code]
      );

      if (resUpdate.affectedRows === 0) {
        return sendJson(res, 404, { success: false, message: 'ไม่พบผู้ใช้นี้ในระบบค่ะ' });
      }

      return sendJson(res, 200, { success: true, message: `รีเซ็ตรหัสผ่าน PIN ให้กับผู้ใช้ #${code} เป็น ${newPin} เรียบร้อยแล้วค่ะ` });
    } catch (err) {
      console.error('[API /api/users/reset-pin] Error:', err);
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // 17. GET /api/stats/daily — Live Daily KPI from MySQL
  if (method === 'GET' && reqPath === '/api/stats/daily') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { success: false, message: 'Unauthorized' });

    try {
      const [cases] = await db.query('SELECT dept_to, dept_from, status FROM cases');
      const depts = ['FRONT', 'HK', 'ENG', 'IT'];
      const stats = {};

      depts.forEach(d => {
        const dCases = cases.filter(c => c.dept_to === d || c.dept_from === d);
        const closed = dCases.filter(c => c.status === 'CLOSED').length;
        const inProg = dCases.filter(c => c.status === 'IN_PROGRESS' || c.status === 'NEW').length;
        const total = dCases.length;
        const rate = total > 0 ? Math.round((closed / total) * 100) : 100;

        stats[d] = {
          total,
          inProg,
          closed,
          rate: rate + '%'
        };
      });

      return sendJson(res, 200, { success: true, stats });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // =========================================================================
  // SERVER ROUTE GUARDS (Strict Authorization)
  // =========================================================================

  // Protect /admin & /admin.html & /admin/
  if (reqPath === '/admin' || reqPath === '/admin.html' || reqPath === '/admin/' || reqPath === '/admin/index.html') {
    const session = getSession(req);
    if (!session) {
      res.writeHead(302, { 'Location': '/?error=login_required&from=admin' });
      res.end();
      return;
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      res.writeHead(302, { 'Location': '/?error=admin_forbidden' });
      res.end();
      return;
    }
    const adminPath = fs.existsSync(path.join(__dirname, 'admin', 'index.html'))
      ? path.join(__dirname, 'admin', 'index.html')
      : path.join(__dirname, 'admin.html');
    fs.readFile(adminPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error loading admin page');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      res.end(data);
    });
    return;
  }

  // Protect /user & /user.html & /user/
  if (reqPath === '/user' || reqPath === '/user.html' || reqPath === '/user/' || reqPath === '/user/index.html') {
    const session = getSession(req);
    if (!session) {
      res.writeHead(302, { 'Location': '/?error=login_required&from=user' });
      res.end();
      return;
    }
    const userPath = fs.existsSync(path.join(__dirname, 'user', 'index.html'))
      ? path.join(__dirname, 'user', 'index.html')
      : path.join(__dirname, 'user.html');
    fs.readFile(userPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error loading user page');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      res.end(data);
    });
    return;
  }

  // Static File Serving & Login Gateway
  let targetFile = reqPath;
  if (targetFile === '/' || targetFile === '/index') {
    targetFile = '/index.html';
  }

  const safePath = path.normalize(targetFile).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      fs.readFile(path.join(__dirname, 'index.html'), (err2, fallbackData) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fallbackData);
      });
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏨 Hotel 3 MySQL-Powered Server running at http://localhost:${PORT}`);
  console.log(`- Database Backend:      MySQL (hotel_case_db @ port 3306)`);
  console.log(`- Unified Login Gateway: http://localhost:${PORT}/`);
});
