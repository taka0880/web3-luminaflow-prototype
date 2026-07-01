document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('growthInput');
    const btnEffort = document.getElementById('dropBtnEffort');
    const btnGuilt = document.getElementById('dropBtnGuilt');
    const crystal = document.getElementById('mainCrystal');
    const glow = document.getElementById('crystalGlow');
    const dropOrigin = document.getElementById('dropOrigin');
    const rippleContainer = document.getElementById('rippleContainer');
    const levelValue = document.getElementById('levelValue');
    const streakValue = document.getElementById('streakValue');
    const openLogBtn = document.getElementById('openLogBtn');
    const closeLogBtn = document.getElementById('closeLogBtn');
    const logModal = document.getElementById('logModal');
    const logListContainer = document.getElementById('logListContainer');
    const pomodoroBtn = document.getElementById('pomodoroBtn');
    const aiMessage = document.getElementById('aiMessage');
    
    // Pomodoro State
    let timerInterval = null;
    let timeLeft = 25 * 60; // 25 minutes
    let isTimerRunning = false;
    
    // LocalStorageからデータを復元（レベルと大きさは毎回リセット）
    let currentLevel = 1;
    let currentWidth = 120;
    let streakDays = parseInt(localStorage.getItem('crystalStreak')) || 1;
    let lastActionDate = localStorage.getItem('crystalLastDate') || null;
    let growthLogs = JSON.parse(localStorage.getItem('crystalLogs')) || [];
    
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

function renderLogs() {
    logListContainer.innerHTML = '';
    if (growthLogs.length === 0) {
        logListContainer.innerHTML = '<p style="text-align:center; color:#64748b; margin-top:2rem;">まだ記録がありません</p>';
        return;
    }
    growthLogs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item';
        // その時点のレベルの色を左端のボーダー色にすることも可能だが、今回は一律primaryカラーに
        div.innerHTML = `<div class="log-date">${log.date}</div><div class="log-text">${log.text}</div>`;
        logListContainer.appendChild(div);
    });
}

// AI Logic (Separated by Action Type)
    const effortReplies = [
        '素晴らしい努力です！その行動が確実に結晶を輝かせています。', 
        '継続は力なり。今日の積み重ねが未来のあなたを作ります！', 
        '最高です！この調子で成長の雫を貯めていきましょう。',
        'その行動があなたの魅力的な結晶を育てています！'
    ];
    
    const guiltReplies = [
        '脳を休ませる時間も大切です。またここから始めましょう！', 
        'インプットの時間は終わりました。さあ、アウトプットの結晶を育てましょう。',
        '体が休息を求めていた証拠です。自分を責めず、今からの行動を褒めてあげてくださいね。', 
        '今このアプリを開いて記録したこと自体が、大きな一歩です。素晴らしい！',
        '過去は変えられませんが、今の行動は選べます。ナイスです！'
    ];

    function getAiResponse(type) {
        if (type === 'guilt') {
            return guiltReplies[Math.floor(Math.random() * guiltReplies.length)];
        } else {
            return effortReplies[Math.floor(Math.random() * effortReplies.length)];
        }
    }

    function showAiMessage(msg) {
        aiMessage.textContent = msg;
        aiMessage.classList.add('show');
        setTimeout(() => {
            aiMessage.classList.remove('show');
        }, 6000); // 6秒後に消える
    }

    function handleAction(type = 'effort', isPomodoro = false, forcedText = null) {
        const text = forcedText !== null ? forcedText : input.value.trim();
        if (!text && !isPomodoro) return;

        if (!isPomodoro) {
            initAudio();
            input.value = '';
            input.blur();
        }

        // 雫アニメーション
        const drop = document.createElement('div');
        drop.className = `drop ${type}`;
        dropOrigin.appendChild(drop);
        playDropSound();

        // 到達時処理
        setTimeout(() => {
            drop.remove();
            
            // ログの保存
            const now = new Date();
            const dateStr = `${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
            growthLogs.unshift({ date: dateStr, text: text });
            localStorage.setItem('crystalLogs', JSON.stringify(growthLogs));
            
            // アニメーションリスタート
            crystal.classList.remove('absorb');
            void crystal.offsetWidth;
            
            crystal.classList.add('absorb');
            
            createRipple();
            playAbsorbSound();
            levelUp();

            // AIメッセージ表示
            const reply = getAiResponse(type);
            showAiMessage(reply);

        }, 2000);
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function toggleTimer() {
        initAudio();
        if (isTimerRunning) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            pomodoroBtn.textContent = `🍅 ${formatTime(timeLeft)}`;
            pomodoroBtn.classList.remove('active');
            crystal.style.animation = ''; // 鼓動停止
        } else {
            isTimerRunning = true;
            pomodoroBtn.classList.add('active');
            // 集中モード中はクリスタルがゆっくり脈打つ
            crystal.style.animation = 'wrapperPulse 4s infinite alternate ease-in-out';
            
            timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    pomodoroBtn.textContent = `🍅 ${formatTime(timeLeft)}`;
                } else {
                    clearInterval(timerInterval);
                    isTimerRunning = false;
                    timeLeft = 25 * 60;
                    pomodoroBtn.textContent = '🍅 25:00';
                    pomodoroBtn.classList.remove('active');
                    crystal.style.animation = '';
                    // ポモドーロ完了時、自動で大きく成長（努力扱い）
                    handleAction('effort', true, "ポモドーロ（25分集中）を完了した！");
                }
            }, 1000);
        }
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
        
        // データの保存とストリーク更新（レベル等は保存しない）
        updateStreak();
    }

    // イベントリスナー
    btnEffort.addEventListener('click', () => handleAction('effort'));
    btnGuilt.addEventListener('click', () => handleAction('guilt'));
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // エンターキーの場合はデフォルトで努力とする
            handleAction('effort');
        }
    });

    pomodoroBtn.addEventListener('click', toggleTimer);

    openLogBtn.addEventListener('click', () => {
        renderLogs();
        logModal.classList.add('show');
    });

    closeLogBtn.addEventListener('click', () => {
        logModal.classList.remove('show');
    });
});
