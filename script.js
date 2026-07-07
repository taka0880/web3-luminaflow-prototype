document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const inputEffort = document.getElementById('inputEffort');
    const btnEffort = document.getElementById('btnEffort');
    const inputGuilt = document.getElementById('inputGuilt');
    const btnGuilt = document.getElementById('btnGuilt');
    
    const crystal = document.getElementById('mainCrystal');
    const glow = document.getElementById('crystalGlow');
    const dropOrigin = document.getElementById('dropOrigin');
    const rippleContainer = document.getElementById('rippleContainer');
    
    const levelValue = document.getElementById('levelValue');
    const streakValue = document.getElementById('streakValue');
    
    const aiMessageCrystal = document.getElementById('aiMessageCrystal');
    const aiMessageTranslator = document.getElementById('aiMessageTranslator');
    
    const translatorMachine = document.getElementById('translatorMachine');
    const sandStrata = document.getElementById('sandStrata');
    const btnMixSand = document.getElementById('btnMixSand');
    const generatedSandArt = document.getElementById('generatedSandArt');
    
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const bgLayers = document.querySelectorAll('.bg-layer');

    const openLogBtn = document.getElementById('openLogBtn');
    const closeLogBtn = document.getElementById('closeLogBtn');
    const logModal = document.getElementById('logModal');
    const logListContainer = document.getElementById('logListContainer');
    const pomodoroBtn = document.getElementById('pomodoroBtn');
    
    // State
    let timerInterval = null;
    let timeLeft = 25 * 60;
    let isTimerRunning = false;
    
    let currentLevel = parseInt(localStorage.getItem('crystalLevel')) || 1;
    let currentWidth = parseFloat(localStorage.getItem('crystalWidth')) || 120;
    let streakDays = parseInt(localStorage.getItem('crystalStreak')) || 1;
    let lastActionDate = localStorage.getItem('crystalLastDate') || null;
    let growthLogs = JSON.parse(localStorage.getItem('crystalLogs')) || [];
    
    // 砂絵はリロードのたびにリセットする（エフェメラルな体験）
    let sandLayers = [];
    let currentMixScale = 5;
    
    // Initialize UI
    levelValue.textContent = currentLevel;
    streakValue.textContent = streakDays;
    document.documentElement.style.setProperty('--crystal-width', currentWidth + 'px');
    
    // Colors
    const colorPalette = ['#38bdf8', '#818cf8', '#a855f7', '#f472b6', '#fbbf24', '#34d399', '#fb7185', '#38bdf8'];
    const sandColors = ['#fde047', '#fbcfe8', '#a7f3d0', '#bfdbfe', '#ddd6fe', '#fed7aa']; // Pastel for Guilt

    function updateCrystalVisuals() {
        const activeColors = [];
        // レベル5ごとに1色追加されるように、ゆっくりとした変化にする
        const numColors = Math.floor((currentLevel - 1) / 5) + 1;
        
        for (let i = 0; i < numColors; i++) {
            activeColors.push(colorPalette[i % colorPalette.length]);
        }
        let gradient = activeColors[0];
        if (activeColors.length > 1) {
            gradient = `linear-gradient(to top, ${activeColors.join(', ')})`;
        }
        document.documentElement.style.setProperty('--crystal-gradient', gradient);
        const latestColor = activeColors[activeColors.length - 1];
        document.documentElement.style.setProperty('--glow-color', latestColor);
    }
    
    function renderSandLayers() {
        sandStrata.innerHTML = '';
        sandLayers.forEach(color => addSandLayerToDOM(color));
    }

    function addSandLayerToDOM(color) {
        const layer = document.createElement('div');
        layer.className = 'sand-layer';
        
        // のっぺりした単色ではなく、光と影のグラデーションをつけて立体感を出す
        layer.style.background = `linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, ${color} 20%, ${color} 70%, rgba(0,0,0,0.4) 100%)`;
        
        // 自然な地層に見せるためのランダムな傾きとカーブ
        const waveType = Math.floor(Math.random() * 4);
        if (waveType === 0) layer.style.borderRadius = '50% 50% 0 0 / 100% 100% 0 0';      // 左右対称の丘
        else if (waveType === 1) layer.style.borderRadius = '80% 20% 0 0 / 100% 100% 0 0'; // 左寄り
        else if (waveType === 2) layer.style.borderRadius = '20% 80% 0 0 / 100% 100% 0 0'; // 右寄り
        else if (waveType === 3) layer.style.borderRadius = '50% 50% 0 0 / 50% 50% 0 0';   // なだらか
        
        // 厚みや重なり具合もランダムにして「絵」っぽさを出す
        layer.style.height = `${25 + Math.random() * 20}px`;
        layer.style.marginBottom = `-${12 + Math.random() * 12}px`;
        
        sandStrata.prepend(layer); // 最新の層が上に重なるように
    }
    
    updateCrystalVisuals();
    renderSandLayers();

    function updateStreak() {
        const today = new Date().toDateString();
        if (lastActionDate !== today) {
            if (lastActionDate) {
                const lastDate = new Date(lastActionDate);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (lastDate.toDateString() === yesterday.toDateString()) {
                    streakDays++;
                } else {
                    streakDays = 1; 
                }
            } else {
                streakDays = 1;
            }
            lastActionDate = today;
            streakValue.textContent = streakDays;
            localStorage.setItem('crystalStreak', streakDays);
            localStorage.setItem('crystalLastDate', lastActionDate);
        }
    }

    // Audio
    let audioCtx = null;
    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
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
    function playAbsorbSound() {
        if (!audioCtx) return;
        const freqs = [523.25, 659.25, 783.99];
        const duration = 1.5;
        freqs.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
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

    // AI Replies
    const effortReplies = [
        '素晴らしい努力です！その行動が確実に結晶を輝かせています。', 
        '継続は力なり。今日の積み重ねが未来のあなたを作ります！', 
        '最高です！この調子で成長の雫を貯めていきましょう。'
    ];
    const guiltReplies = [
        '脳を休ませる時間も大切です。またここから始めましょう！', 
        'インプットの時間は終わりました。さあ、アウトプットの結晶を育てましょう。',
        '体が休息を求めていた証拠です。自分を責めず、今からの行動を褒めてあげてくださいね。'
    ];
    function getAiResponse(type) {
        if (type === 'guilt') return guiltReplies[Math.floor(Math.random() * guiltReplies.length)];
        return effortReplies[Math.floor(Math.random() * effortReplies.length)];
    }

    function showAiMessage(msgBox, msg) {
        msgBox.textContent = msg;
        msgBox.classList.add('show');
        setTimeout(() => msgBox.classList.remove('show'), 6000);
    }

    function spawnSandParticles(color, count=20) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'sand-particle';
            particle.style.backgroundColor = color;
            particle.style.left = `calc(50% + ${(Math.random() - 0.5) * 80}px)`;
            particle.style.top = '40%';
            particle.style.animationDelay = `${Math.random() * 0.5}s`;
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 1500);
        }
    }

    function handleEffort(isPomodoro = false) {
        const text = isPomodoro ? "ポモドーロ完了！" : inputEffort.value.trim();
        if (!text && !isPomodoro) return;
        initAudio();
        inputEffort.value = ''; inputEffort.blur();

        const drop = document.createElement('div');
        drop.className = `drop effort`;
        dropOrigin.appendChild(drop);
        playDropSound();

        setTimeout(() => {
            drop.remove();
            // Log & Crystal
            const now = new Date();
            const dateStr = `${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
            growthLogs.unshift({ date: dateStr, text: text });
            localStorage.setItem('crystalLogs', JSON.stringify(growthLogs));
            crystal.classList.remove('absorb'); void crystal.offsetWidth; crystal.classList.add('absorb');
            playAbsorbSound();
            
            // Sand Generation (Effort = Crystal Color)
            const effortColor = colorPalette[(currentLevel - 1) % colorPalette.length];
            spawnSandParticles(effortColor, 15);
            setTimeout(() => {
                sandLayers.push(effortColor);
                addSandLayerToDOM(effortColor);
            }, 1000);

            // Level Up
            currentLevel++;
            localStorage.setItem('crystalLevel', currentLevel);
            levelValue.textContent = currentLevel;
            updateCrystalVisuals();
            
            // 大きくなりすぎて画像が荒くならないよう、最大サイズを制限しつつ、1回の成長幅を極小（0.5px）にする
            currentWidth = Math.min(currentWidth + 0.5, 220);
            localStorage.setItem('crystalWidth', currentWidth);
            document.documentElement.style.setProperty('--crystal-width', currentWidth + 'px');
            updateStreak();

            showAiMessage(aiMessageCrystal, getAiResponse('effort'));
        }, 1000);
    }

    function handleGuilt() {
        const text = inputGuilt.value.trim();
        if (!text) return;
        initAudio();
        inputGuilt.value = ''; inputGuilt.blur();

        translatorMachine.classList.add('translating');
        playDropSound();

        setTimeout(() => {
            translatorMachine.classList.remove('translating');
            
            showAiMessage(aiMessageTranslator, getAiResponse('guilt'));

            // Sand Generation (Guilt = Pastel Color)
            const guiltColor = sandColors[Math.floor(Math.random() * sandColors.length)];
            spawnSandParticles(guiltColor, 25);
            playAbsorbSound();

            setTimeout(() => {
                sandLayers.push(guiltColor);
                addSandLayerToDOM(guiltColor);
                
                const now = new Date();
                const dateStr = `${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
                growthLogs.unshift({ date: dateStr, text: `[浄化] ${text}` });
                localStorage.setItem('crystalLogs', JSON.stringify(growthLogs));
                updateStreak();
            }, 1000);
        }, 2000);
    }

    // Nav Switcher
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            viewSections.forEach(v => v.classList.remove('active'));
            btn.classList.add('active');
            
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            if (bgLayers) {
                bgLayers.forEach(bg => bg.classList.remove('active'));
                const bgTarget = document.getElementById('bg-' + targetId);
                if (bgTarget) bgTarget.classList.add('active');
            }
        });
    });

    // Listeners
    btnEffort.addEventListener('click', () => handleEffort(false));
    inputEffort.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleEffort(false); });
    btnGuilt.addEventListener('click', handleGuilt);
    inputGuilt.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGuilt(); });

    // Mix Sand Action (AI Art Generation Simulation)
    if(btnMixSand) {
        btnMixSand.addEventListener('click', () => {
            initAudio();
            playDropSound();
            
            btnMixSand.disabled = true;
            btnMixSand.textContent = "🔄 AIが記録を分析中...";
            
            // 少し待ってから生成完了
            setTimeout(() => {
                btnMixSand.textContent = "🎨 今日の砂絵が完成しました";
                
                // 3つの画像からランダムに1つ選ぶ（プロトタイプ用の擬似AI生成）
                const images = ['sand_art_1.png', 'sand_art_2.png', 'sand_art_3.png'];
                const randomImage = images[Math.floor(Math.random() * images.length)];
                
                generatedSandArt.src = randomImage;
                
                // 地層をフェードアウトして、アートをフェードイン
                sandStrata.style.opacity = '0';
                setTimeout(() => {
                    generatedSandArt.classList.add('visible');
                }, 500);
            }, 3000);
        });
    }

    // Pomodoro
    function toggleTimer() {
        initAudio();
        if (isTimerRunning) {
            clearInterval(timerInterval); isTimerRunning = false;
            pomodoroBtn.textContent = `🍅 25:00`; pomodoroBtn.classList.remove('active');
            crystal.style.animation = '';
        } else {
            isTimerRunning = true;
            pomodoroBtn.classList.add('active');
            crystal.style.animation = 'wrapperPulse 4s infinite alternate ease-in-out';
            timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    pomodoroBtn.textContent = `🍅 ${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`;
                } else {
                    clearInterval(timerInterval); isTimerRunning = false; timeLeft = 25 * 60;
                    pomodoroBtn.textContent = '🍅 25:00'; pomodoroBtn.classList.remove('active');
                    crystal.style.animation = '';
                    handleEffort(true);
                }
            }, 1000);
        }
    }
    pomodoroBtn.addEventListener('click', toggleTimer);

    // Logs
    openLogBtn.addEventListener('click', () => {
        logListContainer.innerHTML = '';
        if (growthLogs.length === 0) {
            logListContainer.innerHTML = '<p style="text-align:center; color:#64748b; margin-top:2rem;">まだ記録がありません</p>';
        } else {
            growthLogs.forEach(log => {
                const div = document.createElement('div');
                div.className = 'log-item';
                div.innerHTML = `<div class="log-date">${log.date}</div><div class="log-text">${log.text}</div>`;
                logListContainer.appendChild(div);
            });
        }
        logModal.classList.add('show');
    });
    closeLogBtn.addEventListener('click', () => logModal.classList.remove('show'));
});
