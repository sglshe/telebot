window.AC = window.AC || {};

window.AC.anim = (function() {
  let ipScannerInterval = null;
  let logTickerInterval = null;
  
  if (!document.getElementById('ac-anim-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'ac-anim-styles';
    styleEl.innerHTML = `
      .ac-glitch { animation: ac-glitch-anim 0.2s cubic-bezier(.25, .46, .45, .94) both infinite; }
      @keyframes ac-glitch-anim {
        0% { transform: translate(0) }
        20% { transform: translate(-2px, 2px) }
        40% { transform: translate(-2px, -2px) }
        60% { transform: translate(2px, 2px) }
        80% { transform: translate(2px, -2px) }
        100% { transform: translate(0) }
      }
      .ac-screen-flash-eff { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999; pointer-events: none; animation: ac-flash-fade 0.5s ease-out forwards; }
      @keyframes ac-flash-fade { 0% { opacity: 0.8; } 100% { opacity: 0; } }
      .ac-fade-out { opacity: 0; transition: opacity 0.3s; }
      .ac-fade-in { opacity: 1; transition: opacity 0.3s; }
    `;
    document.head.appendChild(styleEl);
  }

  return {
    progressBars: function(containerEl, duration) {
      if (!containerEl) return;
      const bars = containerEl.querySelectorAll('.progress-fill');
      bars.forEach(bar => {
        const targetPct = Math.floor(Math.random() * 16) + 85; // 85 to 100
        bar.style.transition = `width ${duration}ms ease-out`;
        bar.style.width = '0%';
        setTimeout(() => {
          bar.style.width = `${targetPct}%`;
        }, 50);
      });
    },

    ipScanner: function(containerEl) {
      if (!containerEl) return () => {};
      containerEl.innerHTML = '';
      
      let cancelFlag = false;
      
      function addLine() {
        if (cancelFlag) return;
        const line = document.createElement('div');
        line.style.fontFamily = 'monospace';
        line.style.fontSize = '12px';
        line.style.color = Math.random() > 0.1 ? '#2ecc71' : '#e74c3c';
        line.textContent = `SCANNING [${window.AC.gen.fakeIp()}] ... ${Math.random() > 0.1 ? 'OPEN' : 'CLOSED'}`;
        containerEl.appendChild(line);
        containerEl.scrollTop = containerEl.scrollHeight;
        
        while (containerEl.children.length > 50) {
          containerEl.removeChild(containerEl.firstChild);
        }
        
        setTimeout(addLine, Math.floor(Math.random() * 300) + 300);
      }
      
      addLine();
      
      return function cancel() {
        cancelFlag = true;
      };
    },

    networkCanvas: function(canvasEl) {
      if (!canvasEl) return () => {};
      
      const ctx = canvasEl.getContext('2d');
      let nodes = [];
      const numNodes = 20;
      let width, height;
      let cancelFlag = false;
      let animFrameId = null;
      
      function resize() {
        width = canvasEl.parentElement.clientWidth || 300;
        height = canvasEl.parentElement.clientHeight || 200;
        canvasEl.width = width;
        canvasEl.height = height;
      }
      
      window.addEventListener('resize', resize);
      resize();
      
      for (let i = 0; i < numNodes; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          flashTime: 0
        });
      }
      
      function draw() {
        if (cancelFlag) return;
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#2ecc71';
        
        for (let i = 0; i < numNodes; i++) {
          let node = nodes[i];
          node.x += node.vx;
          node.y += node.vy;
          
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        for (let i = 0; i < numNodes; i++) {
          for (let j = i + 1; j < numNodes; j++) {
            let dx = nodes[i].x - nodes[j].x;
            let dy = nodes[i].y - nodes[j].y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 100) {
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              
              if (Math.random() < 0.001) {
                nodes[i].flashTime = Date.now() + 200;
              }
              
              if (nodes[i].flashTime > Date.now()) {
                ctx.strokeStyle = `rgba(231, 76, 60, ${1 - dist/100})`;
                ctx.lineWidth = 2;
              } else {
                ctx.strokeStyle = `rgba(46, 204, 113, ${0.3 * (1 - dist/100)})`;
                ctx.lineWidth = 1;
              }
              ctx.stroke();
            }
          }
        }
        
        animFrameId = requestAnimationFrame(draw);
      }
      
      draw();
      
      return function cancel() {
        cancelFlag = true;
        cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', resize);
      };
    },

    glitch: function(el, duration) {
      if (!el) return;
      el.classList.add('ac-glitch');
      setTimeout(() => {
        el.classList.remove('ac-glitch');
      }, duration);
    },

    screenFlash: function(color) {
      const overlay = document.createElement('div');
      overlay.className = 'ac-screen-flash-eff';
      overlay.style.backgroundColor = color || 'white';
      document.body.appendChild(overlay);
      setTimeout(() => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
      }, 500);
    },

    logTicker: function(containerEl) {
      if (!containerEl) return () => {};
      let cancelFlag = false;
      
      function tick() {
        if (cancelFlag) return;
        const line = document.createElement('div');
        line.textContent = window.AC.gen.fakeLogLine();
        line.style.whiteSpace = 'nowrap';
        line.style.marginRight = '20px';
        line.style.display = 'inline-block';
        containerEl.appendChild(line);
        
        while (containerEl.children.length > 20) {
          containerEl.removeChild(containerEl.firstChild);
        }
        
        setTimeout(tick, Math.floor(Math.random() * 3000) + 2000);
      }
      
      tick();
      
      return function cancel() {
        cancelFlag = true;
      };
    },

    countUp: function(el, target, duration) {
      if (!el) return;
      const start = parseInt(el.textContent) || 0;
      const increment = target / (duration / 16);
      let current = start;
      let lastTime = Date.now();
      
      function update() {
        const now = Date.now();
        const dt = now - lastTime;
        lastTime = now;
        
        current += increment * (dt / 16);
        if (current >= target) {
          el.textContent = Math.floor(target);
        } else {
          el.textContent = Math.floor(current);
          requestAnimationFrame(update);
        }
      }
      requestAnimationFrame(update);
    },

    screenTransition: function(fromEl, toEl, callback) {
      if (fromEl) {
        window.AC.anim.glitch(fromEl, 300);
        setTimeout(() => {
          fromEl.style.display = 'none';
          if (toEl) {
            toEl.style.display = 'block';
            window.AC.anim.glitch(toEl, 300);
          }
          if (callback) callback();
        }, 300);
      }
    }
  };
})();
