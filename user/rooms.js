/**
 * Hotel Operations - Field Staff Portal: 422 Rooms View (Front Office & Staff)
 * Directory: /user/rooms.js
 */

let cachedUserRooms = [];
let cachedUserCases = [];
let userRoomFloor = 'ALL';
let userRoomStatus = 'ALL';
let selectedUserRoom = null;

/**
 * Fetch and Render 422 Rooms Grid from MySQL
 */
async function renderUserRoomGrid() {
  const container = document.getElementById('userRoomGridContainer');
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-muted);">กำลังโหลดข้อมูล 422 ห้องพักจากฐานข้อมูล MySQL...</div>';

  try {
    const [resRooms, resCases] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/cases')
    ]);

    const dataRooms = await resRooms.json();
    cachedUserRooms = dataRooms.rooms || [];

    const dataCases = await resCases.json();
    cachedUserCases = dataCases.cases || [];

    // Calculate Room Inventory KPIs
    const total = cachedUserRooms.length;
    const maint = cachedUserRooms.filter(r => r.status === 'MAINTENANCE').length;
    const avail = total - maint;
    const rate = total > 0 ? ((avail / total) * 100).toFixed(1) : 0;

    const elTotal = document.getElementById('userRoomTotal');
    const elAvail = document.getElementById('userRoomAvail');
    const elMaint = document.getElementById('userRoomMaint');
    const elRate = document.getElementById('userRoomRate');

    if (elTotal) elTotal.innerText = total;
    if (elAvail) elAvail.innerText = avail;
    if (elMaint) elMaint.innerText = maint;
    if (elRate) elRate.innerText = rate + '%';

    filterUserRoomsUI();
  } catch (err) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:#EF4444;">โหลดข้อมูลห้องพักจากเซิร์ฟเวอร์ไม่สำเร็จค่ะ</div>';
  }
}

/**
 * Filter and Display Room Tiles
 */
function filterUserRoomsUI() {
  const q = (document.getElementById('searchUserRoomInp')?.value || '').trim().toLowerCase();
  const container = document.getElementById('userRoomGridContainer');
  if (!container) return;

  container.innerHTML = '';

  const filtered = cachedUserRooms.filter(r => {
    const matchFloor = userRoomFloor === 'ALL' || r.floor === Number(userRoomFloor);
    const matchStatus = userRoomStatus === 'ALL' || r.status === userRoomStatus;
    const matchQ = !q || r.room_no.toLowerCase().includes(q);
    return matchFloor && matchStatus && matchQ;
  });

  const countBadge = document.getElementById('userRoomCountBadge');
  if (countBadge) {
    countBadge.innerText = `แสดง ${filtered.length} จาก ${cachedUserRooms.length} ห้อง`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-muted);">ไม่พบห้องพักที่ตรงกับเงื่อนไขการค้นหาค่ะ</div>';
    return;
  }

  filtered.forEach(r => {
    const btn = document.createElement('button');
    const isMaint = r.status === 'MAINTENANCE';
    btn.type = 'button';
    btn.className = `room-btn-tile ${isMaint ? 'maintenance' : 'available'}`;
    btn.title = `ห้อง ${r.room_no} (ชั้น ${r.floor}) - ${isMaint ? 'ปิดซ่อม: ' + (r.closed_reason || '') : 'พร้อมใช้งาน'}`;
    btn.onclick = () => openUserRoomDetail(r.room_no);

    btn.innerHTML = `
      <span class="room-num">${r.room_no}</span>
      <span class="room-floor-tag">ชั้น ${r.floor}</span>
      <span class="room-dot"></span>
    `;
    container.appendChild(btn);
  });
}

/**
 * Filter Rooms by Floor
 */
function setUserRoomFloorFilter(floor, btnEl) {
  userRoomFloor = floor;
  const parent = btnEl.parentElement;
  if (parent) {
    parent.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  }
  btnEl.classList.add('active');
  filterUserRoomsUI();
}

/**
 * Filter Rooms by Status (AVAILABLE / MAINTENANCE)
 */
function setUserRoomStatusFilter(status, btnEl) {
  userRoomStatus = status;
  const parent = btnEl.parentElement;
  if (parent) {
    parent.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  }
  btnEl.classList.add('active');
  filterUserRoomsUI();
}

/**
 * Open Room Detail Modal
 */
function openUserRoomDetail(roomNo) {
  selectedUserRoom = roomNo;
  const r = cachedUserRooms.find(x => x.room_no === roomNo);
  if (!r) return;

  const modal = document.getElementById('popRoomDetail');
  const title = document.getElementById('userModalRoomTitle');
  const sub = document.getElementById('userModalRoomSubtitle');
  const badge = document.getElementById('userModalRoomStatusBadge');
  const reason = document.getElementById('userModalRoomReason');
  const updated = document.getElementById('userModalRoomUpdated');

  if (title) title.innerText = `ห้อง ${r.room_no} (ชั้น ${r.floor})`;
  if (sub) sub.innerText = `${r.building} • ${r.room_type}`;

  if (badge) {
    if (r.status === 'AVAILABLE') {
      badge.innerHTML = '<span class="tag tag-CLOSED" style="font-size:0.85rem; padding:4px 10px;">พร้อมใช้งาน (AVAILABLE)</span>';
    } else {
      badge.innerHTML = '<span class="tag tag-NEW" style="font-size:0.85rem; padding:4px 10px;">ปิดซ่อมบำรุง (MAINTENANCE)</span>';
    }
  }

  if (reason) {
    reason.innerHTML = `<strong>สาเหตุ / บันทึกล่าสุด:</strong> ${r.closed_reason || (r.status === 'AVAILABLE' ? 'ห้องว่าง สภาพสมบูรณ์ พร้อมเปิดรับแขก' : 'ปิดซ่อมบำรุง')}`;
  }
  if (updated) {
    updated.innerText = `อัปเดตล่าสุด: ${r.updated_time || 'วันนี้'}`;
  }

  // Cross-reference cases related to this room
  const roomCases = cachedUserCases.filter(c => c.loc && (c.loc.includes(roomNo) || c.loc.includes(' ' + roomNo)));
  const timeline = document.getElementById('userModalRoomTimeline');

  if (timeline) {
    timeline.innerHTML = '';
    if (roomCases.length === 0) {
      timeline.innerHTML = '<div style="text-align:center; padding:16px; background:#F8FAFC; border-radius:var(--r-md); border:1px dashed var(--border-subtle); color:var(--text-muted); font-size:0.85rem;">ไม่พบประวัติเคสที่แจ้งเข้ามาของห้องนี้ค่ะ</div>';
    } else {
      roomCases.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'background:#FFFFFF; border:1px solid var(--border-subtle); border-radius:var(--r-md); padding:10px 12px; font-size:0.85rem;';
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong>${c.id} — ${c.subject}</strong>
            <span class="tag tag-${c.status}">${getStTh(c.status)}</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted);">
            เส้นทาง: <strong>${c.deptFrom} ➔ ${c.deptTo}</strong> • เวลา: <strong>${c.time}</strong> • ผู้แจ้ง: ${c.reporterName}
          </div>
        `;
        timeline.appendChild(item);
      });
    }
  }

  if (modal) modal.classList.add('show');
}

/**
 * Close Room Detail Modal
 */
function closeUserRoomModal() {
  const modal = document.getElementById('popRoomDetail');
  if (modal) modal.classList.remove('show');
}

/**
 * Quick Report Case for the Selected Room
 */
function quickReportForRoom() {
  if (!selectedUserRoom) return;
  closeUserRoomModal();

  if (typeof switchView === 'function') {
    switchView('create');
  }

  if (typeof pickRoom === 'function') {
    pickRoom(selectedUserRoom);
  } else {
    const locInp = document.getElementById('inpLoc');
    if (locInp) locInp.value = `ห้อง ${selectedUserRoom}`;
  }

  const subjInp = document.getElementById('inpSubject');
  if (subjInp) subjInp.focus();
}
