document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('growthInput');
    const btn = document.getElementById('dropBtn');
    const crystal = document.getElementById('mainCrystal');
    const glow = document.getElementById('crystalGlow');
    const dropOrigin = document.getElementById('dropOrigin');
    const rippleContainer = document.getElementById('rippleContainer');
    const levelValue = document.getElementById('levelValue');
    const streakValue = document.getElementById('streakValue');
    
    // LocalStorageからデータを復元（なければ初期値）
    let currentLevel = parseInt(localStorage.getItem('crystalLevel')) || 1;
    let currentWidth = parseInt(localStorage.getItem('crystalWidth')) || 120;
    let streakDays = parseInt(localStorage.getItem('crystalStreak')) || 1;
    let lastActionDate = localStorage.getItem('crystalLastDate') || null;
    
    // UIとスタイルの初期化
    levelValue.textContent = currentLevel;
    streakValue.textContent = streakDays;
    document.documentElement.style.setProperty('--crystal-width', currentWidth + 'px');
    
    // 追加されていく色のパレット (美しい魔法の色)
    const colorPalette = [
        '#38bdf8', // 1: Cyan
        '#818cf8', // 2: Indigo
        '#a855f7', // 3: Purple
        '#f472b6', // 4: Pink
        '#fbbf24', // 5: Amber/Gold
        '#34d399', // 6: Emerald
        '#fb7185', // 7: Rose
        '#38bdf8'  // 8: Loop back
    ];

    function updateCrystalVisuals() {
        // 現在のレベルに応じてパレットから色を取得（最大数を超えたらループ）
        const activeColors = [];
        for (let i = 0; i < currentLevel; i++) {
            activeColors.push(colorPalette[i % colorPalette.length]);
        }
        
        // 色が一つの場合は単色、複数の場合は下から上へのグラデーション
        let gradient = activeColors[0];
        if (activeColors.length > 1) {
            // CSSのlinear-gradientで色が積み重なるように表現
            gradient = `linear-gradient(to top, ${activeColors.join(', ')})`;
        }
        
        document.documentElement.style.setProperty('--crystal-gradient', gradient);
        
        // 一番新しい色をグロウエフェクトに適用（透明度付き）
        const latestColor = activeColors[activeColors.length - 1];
        // 簡易的なHex -> rgba変換（実際にはCSS変数を上書き）
        document.documentElement.style.setProperty('--glow-color', latestColor);
    }
    
    // 初期ビジュアルセット
    updateCrystalVisuals();

    // 継続日数の更新ロジック
    function updateStreak() {
        const today = new Date().toDateString();
        if (lastActionDate !== today) {
            if (lastActionDate) {
                const lastDate = new Date(lastActionDate);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                // 最後にアクションしたのが昨日なら+1、それより前なら1にリセット
                if (lastDate.toDateString() === yesterday.toDateString()) {
                    streakDays++;
                } else {
                    streakDays = 1; 
                }
            } else {
                // 初回
                streakDays = 1;
            }
            lastActionDate = today;
            streakValue.textContent = streakDays;
            
            // 保存
            localStorage.setItem('crystalStreak', streakDays);
            localStorage.setItem('crystalLastDate', lastActionDate);
        }
    }

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
        
        // 色を追加していく
        updateCrystalVisuals();

        // 大きさを成長させる (1回につき2px大きく、最大300pxまで)
        currentWidth = Math.min(currentWidth + 2, 300);
        document.documentElement.style.setProperty('--crystal-width', currentWidth + 'px');
        
        // データの保存とストリーク更新
        localStorage.setItem('crystalLevel', currentLevel);
        localStorage.setItem('crystalWidth', currentWidth);
        updateStreak();
    }

    // イベントリスナー
    btn.addEventListener('click', handleAction);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAction();
        }
    });
});
