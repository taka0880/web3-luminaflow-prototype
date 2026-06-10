document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startAudioBtn = document.getElementById('startAudioBtn');
    const controls = document.getElementById('modeControls');
    const simulator = document.getElementById('simulator');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const sink = document.querySelector('.sink');
    const waterStream = document.getElementById('waterStream');
    const sensorDot = document.getElementById('sensorDot');
    const statusText = document.getElementById('statusText');
    const progressRing = document.getElementById('progressRing');
    const guideText = document.getElementById('guideText');
    const scoreValue = document.getElementById('scoreValue');
    const waterSavedValue = document.getElementById('waterSavedValue');
    const aiCoachPanel = document.querySelector('.ai-coach-panel');
    const aiMessage = document.getElementById('aiMessage');

    // State
    let currentMode = 'before'; // 'before' or 'after'
    let isWaterFlowing = false;
    let audioContext = null;
    let isSystemReady = false;

    // V2 Logic State
    const requiredWashTime = 5000; // 5 seconds for demo
    let washStartTime = 0;
    let washAnimationFrame = null;
    let isWashComplete = false;
    let currentScore = 0;
    let currentWaterSaved = 0.0;
    const maxDashOffset = 565.48; // Circle circumference

    // V3 AI Coach State
    const aiMessages = {
        success: [
            "素晴らしい手洗いです！ウイルスをしっかり落とせましたね。",
            "完璧です！今日の節水量も順調に伸びています。地球にも優しいですね。",
            "お見事です！光のナビゲートに従うことで、無駄なく水を使えていますよ。",
            "パーフェクト！この調子で清潔な習慣を維持しましょう。"
        ],
        interrupted: [
            "おや、少し短かったようです。しっかり洗うとより効果的ですよ。",
            "惜しい！次はリングが一周するまで手をかざし続けてみましょう。",
            "手洗いは毎日の積み重ねが大切です。次回は最後まで頑張りましょう！"
        ],
        idle: [
            "AIコーチが待機中... 手をかざして手洗いを始めてください。",
            "LuminaFlow AIへようこそ。あなたの手洗いをサポートします。"
        ]
    };
    let aiTypingTimeout = null;

    // V3 AI Coach Functions
    function setAIMessage(category) {
        if (!aiCoachPanel || !aiMessage) return;
        const msgs = aiMessages[category];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        
        if (aiTypingTimeout) clearTimeout(aiTypingTimeout);
        aiCoachPanel.classList.add('ai-thinking');
        aiMessage.textContent = "AIが分析中...";
        
        aiTypingTimeout = setTimeout(() => {
            aiCoachPanel.classList.remove('ai-thinking');
            typeText(aiMessage, msg, 0);
        }, 800 + Math.random() * 500);
    }
    
    function typeText(element, text, index) {
        if (index === 0) element.textContent = "";
        if (index < text.length) {
            element.textContent += text.charAt(index);
            aiTypingTimeout = setTimeout(() => {
                typeText(element, text, index + 1);
            }, 30 + Math.random() * 40);
        }
    }

    // --- Audio System ---
    function initAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            isSystemReady = true;
            
            // UI Updates
            startAudioBtn.classList.add('hidden');
            controls.classList.remove('disabled');
            simulator.classList.remove('disabled');
            
            // Play a startup sound
            playBeep(440, 0.1, 'sine');
            updateStatus('システム準備完了。モードを選択してください。');
        } catch (e) {
            console.error('AudioContext creation failed', e);
            alert('音声の初期化に失敗しました。ブラウザが対応していない可能性があります。');
        }
    }

    // Gentle electronic beep for 'After' mode
    function playSuccessBeep() {
        if (!audioContext) return;
        
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        osc.type = 'sine';
        // A nice, reassuring double chime
        osc.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1); // A6
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
    }

    // V2 Magical completion chime
    function playCompletionSound() {
        if (!audioContext) return;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        freqs.forEach((freq, i) => {
            setTimeout(() => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.start();
                osc.stop(audioContext.currentTime + 0.5);
            }, i * 100);
        });
    }

    // Generic beep function
    function playBeep(frequency, duration, type) {
        if (!audioContext) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + duration);
    }

    startAudioBtn.addEventListener('click', initAudio);

    // --- Mode Switching ---
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isSystemReady) return;
            
            // Update buttons
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update state
            currentMode = btn.dataset.mode;
            
            // Update Simulator UI
            if (currentMode === 'after') {
                simulator.classList.add('mode-after');
                updateStatus('LuminaFlow V3：光のガイドにかざして手洗いを始めてください。');
                resetProgress();
                setAIMessage('idle');
            } else {
                simulator.classList.remove('mode-after');
                updateStatus('従来の自動水栓モード：センサーの反応を試してください。');
            }
            
            stopWater();
        });
    });

    // --- Simulation Logic ---

    function updateStatus(text, type = 'normal') {
        statusText.textContent = text;
        sensorDot.className = 'indicator-dot';
        if (type === 'success') {
            sensorDot.classList.add('active');
        } else if (type === 'error') {
            sensorDot.classList.add('error');
        }
    }

    // V2 Timer Logic
    function updateProgress() {
        if (!isWaterFlowing || currentMode !== 'after' || isWashComplete) return;
        
        const elapsed = Date.now() - washStartTime;
        const progress = Math.min(elapsed / requiredWashTime, 1);
        
        if (progressRing) {
            const offset = maxDashOffset - (progress * maxDashOffset);
            progressRing.style.strokeDashoffset = offset;
        }
        
        if (progress >= 1 && !isWashComplete) {
            completeWashing();
        } else {
            washAnimationFrame = requestAnimationFrame(updateProgress);
        }
    }

    function completeWashing() {
        isWashComplete = true;
        if (progressRing) progressRing.classList.add('success');
        if (guideText) {
            guideText.textContent = '手洗い完了！';
            guideText.classList.add('success');
        }
        
        // Update Score Dashboard
        currentScore++;
        if (scoreValue) {
            scoreValue.textContent = currentScore;
            scoreValue.classList.remove('highlight');
            void scoreValue.offsetWidth; // reflow
            scoreValue.classList.add('highlight');
        }
        
        playCompletionSound();
        updateStatus('正しい手洗いが完了しました！', 'success');
        setAIMessage('success');
    }

    function resetProgress() {
        isWashComplete = false;
        if (progressRing) {
            progressRing.style.strokeDashoffset = maxDashOffset;
            progressRing.classList.remove('success');
        }
        if (guideText) {
            guideText.textContent = 'ここにかざす';
            guideText.classList.remove('success');
        }
        if (washAnimationFrame) {
            cancelAnimationFrame(washAnimationFrame);
            washAnimationFrame = null;
        }
    }

    function startWater() {
        if (isWaterFlowing) return;
        isWaterFlowing = true;
        waterStream.classList.add('flowing');
        
        if (currentMode === 'after') {
            // LuminaFlow V2: Instant response and timer start
            playSuccessBeep();
            updateStatus('手洗いタイマー開始...', 'success');
            if (!isWashComplete) {
                washStartTime = Date.now();
                updateProgress();
            }
        } else {
            // Before: Finally got it working
            updateStatus('反応しました。（水が出るまで遅延）', 'success');
        }
    }

    function stopWater() {
        if (!isWaterFlowing) return;
        isWaterFlowing = false;
        waterStream.classList.remove('flowing');
        
        if (currentMode === 'after') {
            if (washAnimationFrame) {
                cancelAnimationFrame(washAnimationFrame);
                washAnimationFrame = null;
            }
            
            if (isWashComplete) {
                // Increase eco feedback every time water stops after a successful wash
                currentWaterSaved += 1.2;
                if (waterSavedValue) {
                    waterSavedValue.textContent = currentWaterSaved.toFixed(1);
                    const parent = waterSavedValue.parentElement;
                    parent.classList.remove('highlight');
                    void parent.offsetWidth;
                    parent.classList.add('highlight');
                }
            } else {
                // Interrupted hand wash
                resetProgress();
                setAIMessage('interrupted');
            }
        }
        
        updateStatus('待機中...');
    }

    // Handle mouse/touch movement over the sink
    let beforeModeTimeout = null;

    function handleInteraction(x, y) {
        if (!isSystemReady) return;

        const sinkRect = sink.getBoundingClientRect();
        // Relative coordinates (0 to 1)
        const relX = (x - sinkRect.left) / sinkRect.width;
        const relY = (y - sinkRect.top) / sinkRect.height;

        if (currentMode === 'before') {
            // Before Mode: Small, hidden sensor area right under the faucet, frustrating logic
            const isNearSensor = (relX > 0.4 && relX < 0.6) && (relY > 0.1 && relY < 0.3);
            
            if (isNearSensor) {
                // Random failure/delay logic to simulate frustration
                if (!isWaterFlowing && !beforeModeTimeout) {
                    updateStatus('センサーが何かを検知...？', 'normal');
                    beforeModeTimeout = setTimeout(() => {
                        // 50% chance to just fail
                        if (Math.random() > 0.5) {
                            startWater();
                        } else {
                            updateStatus('反応がありません。手を振り直してください。', 'error');
                        }
                        beforeModeTimeout = null;
                    }, 800); // 800ms annoying delay
                }
            } else {
                if (beforeModeTimeout) {
                    clearTimeout(beforeModeTimeout);
                    beforeModeTimeout = null;
                }
                stopWater();
                if (!isWaterFlowing) updateStatus('センサーの反応がありません。');
            }

        } else if (currentMode === 'after') {
            // After Mode: LuminaFlow. Huge hit area corresponding to the light guide.
            // Center is roughly 0.5, 0.5. Guide is large.
            const distFromCenter = Math.sqrt(Math.pow(relX - 0.5, 2) + Math.pow(relY - 0.5, 2));
            
            // Broad area (radius ~0.4)
            if (distFromCenter < 0.35) {
                if (!isWaterFlowing) {
                    // Start fresh if coming back after a completed wash
                    if (isWashComplete) resetProgress();
                    startWater();
                }
            } else {
                stopWater();
            }
        }
    }

    // Event Listeners for Interaction
    sink.addEventListener('mousemove', (e) => {
        handleInteraction(e.clientX, e.clientY);
    });

    sink.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        handleInteraction(touch.clientX, touch.clientY);
    });

    sink.addEventListener('mouseleave', () => {
        if (beforeModeTimeout) {
            clearTimeout(beforeModeTimeout);
            beforeModeTimeout = null;
        }
        stopWater();
        if (isSystemReady) updateStatus('待機中...');
    });
    
    sink.addEventListener('touchend', () => {
        if (beforeModeTimeout) {
            clearTimeout(beforeModeTimeout);
            beforeModeTimeout = null;
        }
        stopWater();
        if (isSystemReady) updateStatus('待機中...');
    });
});
