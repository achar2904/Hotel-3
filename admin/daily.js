/**
 * Hotel Operations - Executive & Admin Control Portal: Daily Departmental KPI
 * Directory: /admin/daily.js
 */

// Daily KPI Stats from MySQL
async function renderDailyStats() {
  try {
    const res = await fetch('/api/stats/daily');
    const data = await res.json();
    const s = data.stats || {};

    if (s.FRONT) {
      document.getElementById('dailyFrontTotal').innerText = s.FRONT.total + ' เคส';
      document.getElementById('dailyFrontProg').innerText = s.FRONT.inProg + ' เคส';
      document.getElementById('dailyFrontClosed').innerText = s.FRONT.closed + ' เคส';
      document.getElementById('dailyFrontRate').innerText = s.FRONT.rate;
    }
    if (s.HK) {
      document.getElementById('dailyHkTotal').innerText = s.HK.total + ' เคส';
      document.getElementById('dailyHkProg').innerText = s.HK.inProg + ' เคส';
      document.getElementById('dailyHkClosed').innerText = s.HK.closed + ' เคส';
      document.getElementById('dailyHkRate').innerText = s.HK.rate;
    }
    if (s.ENG) {
      document.getElementById('dailyEngTotal').innerText = s.ENG.total + ' เคส';
      document.getElementById('dailyEngProg').innerText = s.ENG.inProg + ' เคส';
      document.getElementById('dailyEngClosed').innerText = s.ENG.closed + ' เคส';
      document.getElementById('dailyEngRate').innerText = s.ENG.rate;
    }
    if (s.IT) {
      document.getElementById('dailyItTotal').innerText = s.IT.total + ' เคส';
      document.getElementById('dailyItProg').innerText = s.IT.inProg + ' เคส';
      document.getElementById('dailyItClosed').innerText = s.IT.closed + ' เคส';
      document.getElementById('dailyItRate').innerText = s.IT.rate;
    }
  } catch (err) {}
}
