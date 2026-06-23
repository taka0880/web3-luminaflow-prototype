document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('growthInput');
    const btn = document.getElementById('dropBtn');
    const crystal = document.getElementById('mainCrystal');
    const glow = document.getElementById('crystalGlow');
    const dropOrigin = document.getElementById('dropOrigin');
    const rippleContainer = document.getElementById('rippleContainer');
    const levelValue = document.getElementById('levelValue');
    
    let currentLevel = 1;
    let currentWidth = 120; // 初期の大きさ
    
    // 初期幅をセット
    document.documentElement.style.setProperty('--crystal-width', currentWidth + 'px');

    // Web Audio API
    let audioCtx = null;
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // 雫の音
    function playDropSound() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }

    // 吸収・成長の音
    function playAbsorbSound() {
        if (!audioCtx) return;
        const freqs = [523.25, 659.25, 783.99]; // C, E, G
        const duration = 1.5;
        
        freqs.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            // レベルに応じてピッチを少し上げる
            osc.frequency.value = freq * (1 + (currentLevel * 0.02));
            
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1 + (i * 0.1));
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + (i * 0.1));
            osc.stop(audioCtx.currentTime + duration);
        });
    }

    function handleAction() {
        const text = input.value.trim();
        if (!text) return;

        initAudio();
        input.value = '';
        input.blur();

        // 雫アニメーション
        const drop = document.createElement('div');
        drop.className = 'drop';
        dropOrigin.appendChild(drop);
        playDropSound();

        // 到達時処理
        setTimeout(() => {
            drop.remove();
            
            // アニメーションリスタート
            crystal.classList.remove('absorb');
            void crystal.offsetWidth;
            
            crystal.classList.add('absorb');
            
            createRipple();
            playAbsorbSound();
            levelUp();

        }, 900);
    }

    function createRipple() {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        rippleContainer.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 1000);
    }

    function levelUp() {
        currentLevel++;
        levelValue.textContent = currentLevel;
        
        // 色を変化させる (Hue Rotate)
        const hueValue = (currentLevel * 45) % 360;
        document.documentElement.style.setProperty('--current-hue', hueValue + 'deg');

        // 大きさを成長させる (1回につき5px大きく、最大300pxまで)
        currentWidth = Math.min(currentWidth + 5, 300);
        document.documentElement.style.setProperty('--crystal-width', currentWidth + 'px');
    }

    // イベントリスナー
    btn.addEventListener('click', handleAction);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAction();
        }
    });
});
