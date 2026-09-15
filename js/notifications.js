window.AC = window.AC || {};

window.AC.notify = (function() {
  let container = null;
  let randomIntervalId = null;

  function initContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'ac-notify-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.pointerEvents = 'none'; // allow clicking through empty space
    document.body.appendChild(container);

    const styleEl = document.createElement('style');
    styleEl.id = 'ac-notify-styles';
    styleEl.innerHTML = `
      .ac-toast {
        background: rgba(10, 10, 10, 0.9);
        color: #fff;
        padding: 15px 20px;
        border-radius: 4px;
        min-width: 250px;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        font-family: monospace;
        font-size: 13px;
        pointer-events: auto;
        animation: ac-toast-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        position: relative;
        overflow: hidden;
      }
      .ac-toast::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        box-shadow: inset 0 0 10px rgba(255,255,255,0.1);
        animation: ac-toast-pulse 2s infinite;
        pointer-events: none;
      }
      @keyframes ac-toast-in {
        0% { transform: translateX(120%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
      }
      @keyframes ac-toast-out {
        0% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(120%); opacity: 0; }
      }
      @keyframes ac-toast-pulse {
        0% { opacity: 0.2; }
        50% { opacity: 1; }
        100% { opacity: 0.2; }
      }
      .ac-toast.hiding {
        animation: ac-toast-out 0.3s ease-in forwards;
      }
      .ac-toast-alert { border-left: 4px solid #e74c3c; }
      .ac-toast-success { border-left: 4px solid #2ecc71; }
      .ac-toast-info { border-left: 4px solid #00cec9; }
      .ac-toast-close {
        cursor: pointer;
        opacity: 0.7;
        margin-left: 15px;
        font-size: 16px;
        line-height: 1;
      }
      .ac-toast-close:hover { opacity: 1; }
    `;
    document.head.appendChild(styleEl);
  }

  return {
    show: function(message, type) {
      initContainer();
      
      const typeClass = type === 'alert' ? 'ac-toast-alert' : 
                        type === 'success' ? 'ac-toast-success' : 
                        'ac-toast-info';
                        
      const toast = document.createElement('div');
      toast.className = `ac-toast ${typeClass}`;
      
      const textSpan = document.createElement('span');
      textSpan.textContent = message;
      
      const closeBtn = document.createElement('span');
      closeBtn.className = 'ac-toast-close';
      closeBtn.innerHTML = '&times;';
      
      toast.appendChild(textSpan);
      toast.appendChild(closeBtn);
      
      container.appendChild(toast);
      
      function dismiss() {
        if (!toast.classList.contains('hiding')) {
          toast.classList.add('hiding');
          setTimeout(() => {
            if (toast.parentElement === container) {
              container.removeChild(toast);
            }
          }, 300);
        }
      }
      
      closeBtn.addEventListener('click', dismiss);
      
      setTimeout(dismiss, 5000);
    },
    
    startRandom: function() {
      if (randomIntervalId) return () => {};
      
      const scheduleNext = () => {
        const delay = Math.floor(Math.random() * 60000) + 30000; // 30-90s
        randomIntervalId = setTimeout(() => {
          if (window.AC.gen) {
            const types = ['alert', 'success', 'info'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.show(window.AC.gen.fakeNotification(), type);
          }
          scheduleNext();
        }, delay);
      };
      
      scheduleNext();
      
      return function cancel() {
        if (randomIntervalId) {
          clearTimeout(randomIntervalId);
          randomIntervalId = null;
        }
      };
    },
    
    stopRandom: function() {
      if (randomIntervalId) {
        clearTimeout(randomIntervalId);
        randomIntervalId = null;
      }
    }
  };
})();
