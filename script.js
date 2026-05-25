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

    // State
    let currentMode = 'before'; // 'before' or 'after'
    let isWaterFlowing = false;
    let audioContext = null;
    let isSystemReady = false;

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
                updateStatus('LuminaFlow モード：光のガイドに手をかざしてください。');
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

    function startWater() {
        if (isWaterFlowing) return;
        isWaterFlowing = true;
        waterStream.classList.add('flowing');
        
        if (currentMode === 'after') {
            // LuminaFlow: Instant, satisfying response
            playSuccessBeep();
            updateStatus('検知成功！適温の水が出ています。', 'success');
        } else {
            // Before: Finally got it working
            updateStatus('反応しました。（水が出るまで遅延）', 'success');
        }
    }

    function stopWater() {
        if (!isWaterFlowing) return;
        isWaterFlowing = false;
        waterStream.classList.remove('flowing');
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
                startWater();
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
