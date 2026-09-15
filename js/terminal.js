window.AC = window.AC || {};

window.AC.terminal = (function() {
  function createCursor() {
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    cursor.innerHTML = '&#9608;'; // Block cursor
    return cursor;
  }

  return {
    start: function(containerEl, lines, onComplete) {
      if (!containerEl) return () => {};
      
      let cancelFlag = false;
      let currentLineIndex = 0;
      let currentCharIndex = 0;
      let currentLineEl = null;
      let cursorEl = createCursor();
      
      containerEl.innerHTML = '';
      containerEl.appendChild(cursorEl);

      const styleEl = document.createElement('style');
      if (!document.getElementById('ac-term-styles')) {
        styleEl.id = 'ac-term-styles';
        styleEl.innerHTML = `
          .ac-term-line { margin: 0; padding: 2px 0; font-family: monospace; }
          .ac-term-info { color: #f1c40f; }
          .ac-term-success { color: #2ecc71; }
          .ac-term-error { color: #e74c3c; }
          .ac-term-plain { color: #ecf0f1; }
          .cursor-blink { animation: ac-blink 1s step-end infinite; }
          @keyframes ac-blink { 50% { opacity: 0; } }
          .ac-term-flash-green { animation: ac-flash-g 0.5s ease-out; }
          @keyframes ac-flash-g { 0% { background: rgba(46, 204, 113, 0.5); } 100% { background: transparent; } }
          .ac-screen-flash { animation: ac-scr-flash 0.3s ease-out; }
          @keyframes ac-scr-flash { 0% { background: rgba(255, 255, 255, 0.8); } 100% { background: transparent; } }
        `;
        document.head.appendChild(styleEl);
      }

      function scrollToBottom() {
        containerEl.scrollTop = containerEl.scrollHeight;
      }

      function typeChar() {
        if (cancelFlag) return;
        
        const lineData = lines[currentLineIndex];
        if (currentCharIndex === 0) {
          currentLineEl = document.createElement('div');
          currentLineEl.className = `ac-term-line ac-term-${lineData.type}`;
          containerEl.insertBefore(currentLineEl, cursorEl);
        }

        if (currentCharIndex < lineData.text.length) {
          currentLineEl.textContent += lineData.text.charAt(currentCharIndex);
          currentCharIndex++;
          scrollToBottom();
          setTimeout(typeChar, Math.floor(Math.random() * 15) + 15);
        } else {
          if (lineData.text.includes('✓')) {
            currentLineEl.classList.add('ac-term-flash-green');
          }
          if (lineData.text.includes('SUCCESS') || lineData.text.includes('GRANTED')) {
            const overlay = document.createElement('div');
            overlay.className = 'ac-screen-flash';
            overlay.style.position = 'fixed';
            overlay.style.top = '0'; overlay.style.left = '0';
            overlay.style.width = '100vw'; overlay.style.height = '100vh';
            overlay.style.zIndex = '999999';
            overlay.style.pointerEvents = 'none';
            document.body.appendChild(overlay);
            setTimeout(() => { if (document.body.contains(overlay)) document.body.removeChild(overlay); }, 300);
          }
          
          currentLineIndex++;
          currentCharIndex = 0;
          
          if (currentLineIndex < lines.length) {
            setTimeout(typeChar, lineData.delay || 100);
          } else {
            if (onComplete) onComplete();
          }
        }
      }

      setTimeout(typeChar, 100);

      return function cancel() {
        cancelFlag = true;
      };
    },

    clear: function(containerEl) {
      if (containerEl) {
        containerEl.innerHTML = '';
        containerEl.appendChild(createCursor());
      }
    }
  };
})();
