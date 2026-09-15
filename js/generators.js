window.AC = window.AC || {};

window.AC.gen = (function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const hex = '0123456789ABCDEF';
  
  const cities = ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Voronezh', 'Perm', 'Volgograd', 'Krasnodar', 'Tyumen'];
  const isps = ['Rostelecom', 'MTS', 'Beeline', 'MegaFon', 'Tele2', 'Dom.ru', 'TTK', 'ER-Telecom', 'Yota'];
  const browsers = ['Chrome Mobile 122.0', 'Safari Mobile 17.3', 'Samsung Internet 24.0', 'Yandex Browser Mobile 23.9', 'Opera Touch 7.4'];
  const osVariations = ['Android 13 (OneUI 5)', 'Android 14 (MIUI 14)', 'Android 13 (HyperOS)', 'iOS 16.6.1', 'iOS 17.2.1', 'iOS 17.4', 'Android 12 (ColorOS 12)'];
  const devices = ['POCO X3 Pro', 'POCO X5 Pro 5G', 'iPhone 13', 'iPhone 11', 'iPhone 14 Pro', 'Redmi Note 12', 'Redmi Note 10 Pro', 'Samsung Galaxy A54', 'Samsung Galaxy S22', 'iPad 9th Gen', 'iPad Air 5', 'Realme GT Neo 3'];
  const nameFragments = ['trader', 'karambit', 'gold', 'standoff', 'awp', 'headshot', 'legend', 'frost', 'dragon', 'ghost', 'shadow', 'ninja', 'knife', 'drop', 'king', 'case', 'butter', 'aim', 'rush', 'clan'];
  const namePrefixes = ['so2_', 'so2.', 'trade_', 'x_', '', '', '', 'pro_'];
  
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  function randomElement(arr) {
    return arr[randomInt(0, arr.length - 1)];
  }
  
  function randomString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomInt(0, chars.length - 1));
    }
    return result;
  }

  return {
    fakeUrl: function(target) {
      const domains = [
        'standooff2.com',
        'stand0ff2.com',
        'standoff2-promo.com',
        'standoff2event.ru',
        'standoff2.gift',
        'standoff-2.pro',
        'standoff2official.com',
        'standoff2-bonus.ru',
        'standoff2free.com',
        'standoff2gold.ru'
      ];
      const paths = ['/promo', '/gift', '/bonus', '/event', '/free-gold', '/inventory'];
      
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const path = paths[Math.floor(Math.random() * paths.length)];
      const ref = `AC-${(function(){let r='';const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';for(let i=0;i<6;i++)r+=c[Math.floor(Math.random()*c.length)];return r})()}`;
      
      return `https://${domain}${path}?ref=${ref}`;
    },
    
    fakeIp: function() {
      const firstOctets = [91, 185, 176, 213, 77, 109, 178];
      return `${randomElement(firstOctets)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`;
    },
    
    fakeCity: function() {
      return randomElement(cities);
    },
    
    fakeIsp: function() {
      return randomElement(isps);
    },
    
    fakeBrowser: function() {
      return randomElement(browsers);
    },
    
    fakeOs: function() {
      return randomElement(osVariations);
    },
    
    fakeDevice: function() {
      return randomElement(devices);
    },
    
    fakeSteamId: function() {
      return `STEAM_0:1:${randomInt(10000000, 99999999)}`;
    },
    
    fakeDate: function() {
      const now = new Date();
      const past = new Date(now.getTime() - randomInt(0, 7 * 24 * 60 * 60 * 1000));
      const dd = String(past.getDate()).padStart(2, '0');
      const mm = String(past.getMonth() + 1).padStart(2, '0');
      const yyyy = past.getFullYear();
      const hh = String(past.getHours()).padStart(2, '0');
      const min = String(past.getMinutes()).padStart(2, '0');
      return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
    },
    
    fakeUsername: function() {
      const prefix = Math.random() > 0.5 ? randomElement(namePrefixes) : '';
      const fragment = randomElement(nameFragments);
      const suffix = Math.random() > 0.5 ? randomInt(1, 9999).toString() : '';
      return `${prefix}${fragment}${suffix}` || 'user_unknown';
    },
    
    fakeAccountValue: function() {
      return `$${(Math.random() * 300).toFixed(2)}`;
    },
    
    fakeVictim: function() {
      return {
        ip: this.fakeIp(),
        city: this.fakeCity(),
        isp: this.fakeIsp(),
        browser: this.fakeBrowser(),
        os: this.fakeOs(),
        device: this.fakeDevice(),
        steamId: this.fakeSteamId(),
        date: this.fakeDate(),
        username: this.fakeUsername(),
        value: this.fakeAccountValue()
      };
    },
    
    terminalLines: function(target) {
      const lines = [
        { text: `Initializing ANTICHRIST LINK module for [${target}]...`, type: 'info' },
        { text: 'Connecting to proxy network...', type: 'plain' },
        { text: `[+] Proxy connection established (${this.fakeIp()})`, type: 'success' },
        { text: 'Bypassing regional restrictions...', type: 'plain' },
        { text: 'Loading payload templates...', type: 'info' },
        { text: '[-] Warning: Outdated signature detected. Updating...', type: 'error' },
        { text: '[+] Signature updated successfully ✓', type: 'success' },
        { text: 'Generating unique link hash...', type: 'plain' },
        { text: `Allocating namespace: AC-${randomString(6)}`, type: 'info' },
        { text: 'Injecting anti-bot protection...', type: 'plain' },
        { text: '[+] Cloudflare bypass: ENABLED ✓', type: 'success' },
        { text: `Deploying phishing assets for ${target}...`, type: 'info' },
        { text: 'Encrypting traffic stream...', type: 'plain' },
        { text: 'Allocating SSL certificates (Let\'s Encrypt)...', type: 'plain' },
        { text: '[+] SSL configured successfully', type: 'success' },
        { text: 'Propagating DNS records...', type: 'info' },
        { text: 'Awaiting DNS resolution...', type: 'plain' }
      ];

      const lineCount = randomInt(15, 25);
      const result = [];
      let totalLines = 0;
      
      for(let i=0; i<lines.length && totalLines < lineCount - 2; i++) {
        result.push({
          text: lines[i].text,
          type: lines[i].type,
          delay: randomInt(200, 800)
        });
        totalLines++;
      }
      
      while(totalLines < lineCount - 2) {
        result.push({
          text: `Processing chunk 0x${randomString(4)}...`,
          type: 'plain',
          delay: randomInt(100, 400)
        });
        totalLines++;
      }
      
      result.push({
        text: 'Finalizing deployment...',
        type: 'info',
        delay: 500
      });
      result.push({
        text: 'SUCCESS: Link Generated ✓',
        type: 'success',
        delay: 800
      });
      
      return result;
    },
    
    fakeVictimsList: function(count) {
      const victims = [];
      for (let i = 0; i < count; i++) {
        victims.push(this.fakeVictim());
      }
      return victims;
    },
    
    fakeNotification: function() {
      const ip = this.fakeIp();
      const events = [
        `Node RU-${randomInt(1,12)} reconnected. Latency: ${randomInt(12,89)}ms`,
        `Proxy chain rotated. New exit: ${ip}`,
        `SSL certificate auto-renewed for session #${randomString(4)}`,
        `Traffic anomaly detected on node ${randomInt(1,30)}. Resolved.`,
        `Blocklist updated: +${randomInt(10,80)} IPs added`,
        `Route optimized: ${randomElement(['Moscow','Frankfurt','Berlin','Amsterdam'])} → ${randomElement(['New York','Singapore','Tokyo','London'])}`,
        `System load: ${randomInt(15,65)}%. All nodes operational.`,
        `Backup proxy pool refreshed. ${randomInt(40,120)} proxies available.`
      ];
      return randomElement(events);
    },
    
    fakeLogLine: function() {
      const time = new Date().toTimeString().split(' ')[0];
      const events = [
        `Connected: proxy-ru${randomInt(1,20)}.antichrist.net`,
        `Ping: ${randomInt(10, 150)}ms`,
        `Connection dropped from ${this.fakeIp()}`,
        `Auto-renewed SSL for session #${randomString(4)}`,
        `Traffic spike detected on node ${randomInt(1,99)}`,
        `Route optimized: Moscow -> Frankfurt`,
        `Blocklist updated: +${randomInt(100,500)} IPs`
      ];
      return `[${time}] ${randomElement(events)}`;
    }
  };
})();
