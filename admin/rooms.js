/**
 * Hotel Operations - Executive & Admin Control Portal: 422 Rooms Inventory & Status Override
 * Directory: /admin/rooms.js
 */

// 422 Rooms Inventory from MySQL
async function renderRoomGrid() {
  const grid = document.getElementById('roomGridContainer');
  grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-muted);">กำลังโหลด 422 ห้องจากฐานข้อมูล MySQL...</div>';

  try {
    const res = await fetch('/api/rooms');
    const data = await res.json();
    cachedRooms = data.rooms || [];

    const total = cachedRooms.length;
    const maint = cachedRooms.filter(r => r.status === 'MAINTENANCE').length;
    const avail = total - maint;
    const rate = total > 0 ? ((avail / total) * 100).toFixed(1) : 0;

    document.getElementById('roomKpiTotal').innerText = total;
    document.getElementById('roomKpiAvail').innerText = avail;
    document.getElementById('roomKpiMaint').innerText = maint;
    document.getElementById('roomKpiRate').innerText = rate + '%';

    filterRoomsUI();
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:#EF4444;">โหลดข้อมูลห้องพักไม่สำเร็จค่ะ</div>`;
  }
}

function filterRoomsUI() {
  const q = (document.getElementById('searchRoomInp')?.value || '').trim().toLowerCase();
  const grid = document.getElementById('roomGridContainer');
  grid.innerHTML = '';

  const filtered = cachedRooms.filter(r => {
    const matchFloor = currentRoomFloor === 'ALL' || r.floor === Number(currentRoomFloor);
    const matchStatus = currentRoomStatus === 'ALL' || r.status === currentRoomStatus;
    const matchQ = !q || r.room_no.toLowerCase().includes(q);
    return matchFloor && matchStatus && matchQ;
  });

  document.getElementById('roomCountBadge').innerText = `แสดง ${filtered.length} จาก ${cachedRooms.length} ห้อง`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-muted);">ไม่พบห้องพักที่ตรงกับเงื่อนไขการค้นหาใน MySQL</div>`;
    return;
  }

  filtered.forEach(r => {
    const btn = document.createElement('button');
    const isMaint = r.status === 'MAINTENANCE';
    btn.className = `room-btn-tile ${isMaint ? 'maintenance' : 'available'}`;
    btn.title = `ห้อง ${r.room_no} (ชั้น ${r.floor}) - ${isMaint ? 'ปิดซ่อม: ' + (r.closed_reason || '') : 'พร้อมใช้งาน'}`;
    btn.onclick = () => openRoomDetail(r.room_no);

    btn.innerHTML = `
      <span class="room-num">${r.room_no}</span>
      <span class="room-floor-tag">ชั้น ${r.floor}</span>
      <span class="room-dot"></span>
    `;
    grid.appendChild(btn);
  });
}

function setRoomFloorFilter(f, el) {
  currentRoomFloor = f;
  document.querySelectorAll('#viewRooms .filter-pill').forEach(b => {
    if (b.innerText.includes('ชั้น') || b.innerText.includes('ทุกชั้น')) b.classList.remove('active');
  });
  el.classList.add('active');
  filterRoomsUI();
}

function setRoomStatusFilter(s, el) {
  currentRoomStatus = s;
  document.querySelectorAll('#viewRooms .filter-pill').forEach(b => {
    if (b.innerText.includes('ทั้งหมด') || b.innerText.includes('พร้อมใช้') || b.innerText.includes('ปิดซ่อม')) {
      b.classList.remove('active');
    }
  });
  el.classList.add('active');
  filterRoomsUI();
}

function openRoomDetail(roomNo) {
  selectedRoomNo = roomNo;
  const r = cachedRooms.find(x => x.room_no === roomNo);
  if (!r) return;

  const modal = document.getElementById('modalRoomDetail');
  document.getElementById('modalRoomTitle').innerText = `ห้อง ${r.room_no} (ชั้น ${r.floor})`;
  document.getElementById('modalRoomSubtitle').innerText = `${r.building} • ${r.room_type}`;

  const badgeContainer = document.getElementById('modalRoomStatusBadge');
  if (r.status === 'AVAILABLE') {
    badgeContainer.innerHTML = `<span class="tag tag-CLOSED" style="font-size:0.85rem; padding:4px 10px;">พร้อมใช้งาน (AVAILABLE)</span>`;
  } else {
    badgeContainer.innerHTML = `<span class="tag tag-NEW" style="font-size:0.85rem; padding:4px 10px;">ปิดซ่อมบำรุง (MAINTENANCE)</span>`;
  }

  document.getElementById('modalRoomReason').innerHTML = `<strong>สาเหตุ / บันทึกล่าสุด:</strong> ${r.closed_reason || (r.status === 'AVAILABLE' ? 'ห้องว่าง สภาพสมบูรณ์ พร้อมเปิดรับแขก' : 'ปิดซ่อมบำรุง')}`;
  document.getElementById('modalRoomUpdated').innerText = `อัปเดตล่าสุด: ${r.updated_time || 'วันนี้'}`;

  const adminCtrl = document.getElementById('modalAdminControls');
  const ownerNotice = document.getElementById('modalOwnerNotice');
  if (currentRole === 'OWNER') {
    adminCtrl.style.display = 'none';
    ownerNotice.style.display = 'block';
  } else {
    adminCtrl.style.display = 'block';
    ownerNotice.style.display = 'none';
    document.getElementById('radioAvail').checked = (r.status === 'AVAILABLE');
    document.getElementById('radioMaint').checked = (r.status === 'MAINTENANCE');
    document.getElementById('modalStatusReasonInp').value = r.closed_reason || '';
  }

  // Filter cases for this room
  const roomCases = cachedCases.filter(c => c.loc && (c.loc.includes(roomNo) || c.loc.includes(' ' + roomNo)));
  const timelineBox = document.getElementById('modalIncidentTimeline');
  timelineBox.innerHTML = '';

  if (roomCases.length === 0) {
    timelineBox.innerHTML = `
      <div style="text-align:center; padding:20px; background:#F8FAFC; border-radius:var(--r-md); border:1px dashed var(--border-subtle); color:var(--text-muted);">
        ไม่พบประวัติเคสที่แจ้งเข้ามาของห้องนี้ในระบบ MySQL ค่ะ
      </div>
    `;
  } else {
    roomCases.forEach(c => {
      const card = document.createElement('div');
      card.className = `timeline-card dept-${c.deptTo}`;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong>${c.id} — ${c.subject}</strong>
          <span class="tag tag-${c.status}">${getStTh(c.status)}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          เส้นทาง: <strong>${c.deptFrom} ➔ ${c.deptTo}</strong> • เวลา: <strong>${c.time}</strong> • ผู้แจ้ง: ${c.reporterName}
        </div>
      `;
      timelineBox.appendChild(card);
    });
  }

  modal.classList.add('show');
}

function closeRoomModal() {
  const modal = document.getElementById('modalRoomDetail');
  if (modal) modal.classList.remove('show');
}

async function saveRoomStatusChange() {
  if (!selectedRoomNo) return;
  if (currentRole !== 'ADMIN') {
    alert('สิทธิ์เฉพาะแอดมิน (Admin) เท่านั้นค่ะ');
    return;
  }

  const radio = document.querySelector('input[name="roomStatusRadio"]:checked');
  const newStatus = radio ? radio.value : 'AVAILABLE';
  const reasonInp = document.getElementById('modalStatusReasonInp').value.trim();
  const defaultReason = (newStatus === 'AVAILABLE') ? 'เปิดห้องพักพร้อมใช้งาน สภาพสมบูรณ์' : 'คำสั่งแอดมิน: ปิดซ่อมบำรุง';
  const reason = reasonInp || defaultReason;

  const res = await fetch('/api/rooms/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomNo: selectedRoomNo,
      status: newStatus,
      reason
    })
  });

  const result = await res.json();
  if (!result.success) {
    alert('เกิดข้อผิดพลาด: ' + result.message);
    return;
  }

  await renderRoomGrid();
  openRoomDetail(selectedRoomNo);
  alert(`บันทึกสถานะห้อง ${selectedRoomNo} ลงฐานข้อมูล MySQL เรียบร้อยแล้วค่ะ`);
}
