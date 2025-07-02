class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundBuffers = new Map(); // To store pre-loaded sound data
        this.soundPath = 'assets/sounds/'; // Base path for sound files
        this.isLoading = false;
        this.loadQueue = [];

        // Sounds that are already available as per the user's list
        this.availableSounds = [
            'ui_click_01.wav',
            'ui_error_01.wav',
            'ui_confirm_01.wav',
            'ui_console_toggle_01.wav',
            'foot_grass_01.wav',
            'foot_grass_02.wav',
            'move_land_hard_01.wav',
            'move_land_hard_02.wav',
            'move_land_hard_03.wav',
            'move_land_hard_04.wav',
            'melee_unarmed_swing_01.wav',
            'melee_unarmed_hit_01.wav',
            'melee_unarmed_hit_02.wav',
            'melee_armed_swing_01.wav',
            'ui_start_game_01.wav',
            'ui_start_game_02.wav'
        ];

        // Pre-load existing sounds
        this.preloadSounds(this.availableSounds);

        // Set up listener position (assuming player is at 0,0,0 initially, facing along Z-axis)
        // The game will need to call updateListenerPosition whenever the player moves/rotates.
        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(0, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(0, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(0, this.audioContext.currentTime);
        } else { // Fallback for older browsers
            this.audioContext.listener.setPosition(0, 0, 0);
        }
        // Default orientation: facing towards negative Z, Y is up.
        if (this.audioContext.listener.forwardX) {
            this.audioContext.listener.forwardX.setValueAtTime(0, this.audioContext.currentTime);
            this.audioContext.listener.forwardY.setValueAtTime(0, this.audioContext.currentTime);
            this.audioContext.listener.forwardZ.setValueAtTime(-1, this.audioContext.currentTime);
            this.audioContext.listener.upX.setValueAtTime(0, this.audioContext.currentTime);
            this.audioContext.listener.upY.setValueAtTime(1, this.audioContext.currentTime);
            this.audioContext.listener.upZ.setValueAtTime(0, this.audioContext.currentTime);
        } else { // Fallback for older browsers
            this.audioContext.listener.setOrientation(0, 0, -1, 0, 1, 0);
        }
    }

    updateListenerPosition(x, y, z) {
        // Ensure game's coordinate system (e.g. Y-up or Z-up) is correctly mapped
        // to Web Audio's default (Y-up, right-handed).
        // Assuming direct mapping for now: game X -> WebAudio X, game Y -> WebAudio Y, game Z -> WebAudio Z.
        // If your game's Z is height, and Y is depth, you might need to swap y and z.
        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(y, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(z, this.audioContext.currentTime);
        } else {
            this.audioContext.listener.setPosition(x, y, z);
        }
        // TODO: Update listener orientation if player rotation is a factor.
        // this.audioContext.listener.forwardX.setValueAtTime(lookDir.x, this.audioContext.currentTime);
        // this.audioContext.listener.forwardY.setValueAtTime(lookDir.y, this.audioContext.currentTime);
        // this.audioContext.listener.forwardZ.setValueAtTime(lookDir.z, this.audioContext.currentTime);
    }

    async loadSound(soundName) {
        if (this.soundBuffers.has(soundName)) {
            return this.soundBuffers.get(soundName);
        }

        // Prevent multiple loads of the same sound concurrently
        if (this.loadQueue.includes(soundName)) {
            console.warn(`Sound ${soundName} is already in the loading queue.`);
            // Wait for the existing load to complete
            return new Promise((resolve, reject) => {
                const interval = setInterval(() => {
                    if (this.soundBuffers.has(soundName)) {
                        clearInterval(interval);
                        resolve(this.soundBuffers.get(soundName));
                    }
                    // TODO: Add a timeout or error handling for sounds that never load
                }, 100);
            });
        }

        this.loadQueue.push(soundName);

        try {
            const response = await fetch(this.soundPath + soundName);
            if (!response.ok) {
                throw new Error(`Failed to load sound: ${soundName} - ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(soundName, audioBuffer);
            console.log(`Sound loaded: ${soundName}`);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading sound ${soundName}:`, error);
            this.soundBuffers.delete(soundName); // Remove placeholder if loading failed
            return null;
        } finally {
            // Remove from load queue
            this.loadQueue = this.loadQueue.filter(item => item !== soundName);
        }
    }

    async preloadSounds(soundNames) {
        if (this.isLoading) {
            console.warn("AudioManager is already preloading sounds.");
            return;
        }
        this.isLoading = true;
        console.log("Preloading sounds...");

        const loadPromises = soundNames.map(soundName => this.loadSound(soundName));

        try {
            await Promise.all(loadPromises);
            console.log("All specified sounds preloaded successfully.");
        } catch (error) {
            console.error("Error during sound preloading:", error);
        } finally {
            this.isLoading = false;
        }
    }

    playSound(soundName, { loop = false, volume = 1.0 } = {}) {
        if (!this.soundBuffers.has(soundName)) {
            console.warn(`Sound not loaded: ${soundName}. Attempting to load now...`);
            this.loadSound(soundName).then(buffer => {
                if (buffer) {
                    this._playBuffer(buffer, soundName, loop, volume);
                } else {
                    console.error(`Failed to play sound ${soundName} after attempting to load.`);
                }
            });
            return null;
        }

        const audioBuffer = this.soundBuffers.get(soundName);
        return this._playBuffer(audioBuffer, soundName, loop, volume);
    }

    _playBuffer(audioBuffer, soundName, loop, volume) {
        if (!this.audioContext) {
            console.error("AudioContext not initialized.");
            return null;
        }
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.loop = loop;
        source.start(0); // Play immediately

        source.onended = () => {
            // console.log(`Sound finished: ${soundName}`);
        };
        return source; // Return the source node so it can be controlled (e.g., stopped)
    }

    stopSound(sourceNode) {
        if (sourceNode && typeof sourceNode.stop === 'function') {
            try {
                sourceNode.stop();
            } catch (e) {
                console.warn("Error stopping sound, it may have already stopped:", e);
            }
        }
    }

    // --- Placeholder methods for specific sound categories ---

    playUiSound(soundName, options = {}) {
        return this.playSound(soundName, options);
    }

    playFootstepSound(options = {}) {
        const footstepSounds = ['foot_grass_01.wav', 'foot_grass_02.wav'];
        const randomFootstep = footstepSounds[Math.floor(Math.random() * footstepSounds.length)];
        return this.playSound(randomFootstep, options);
    }

    playHardLandingSound(options = {}) {
        const landingSounds = [
            'move_land_hard_01.wav',
            'move_land_hard_02.wav',
            'move_land_hard_03.wav',
            'move_land_hard_04.wav'
        ];
        const randomLandingSound = landingSounds[Math.floor(Math.random() * landingSounds.length)];
        return this.playSound(randomLandingSound, options);
    }

    playUnarmedHitSound(options = {}) {
        const unarmedHitSounds = ['melee_unarmed_hit_01.wav', 'melee_unarmed_hit_02.wav'];
        const randomHitSound = unarmedHitSounds[Math.floor(Math.random() * unarmedHitSounds.length)];
        return this.playSound(randomHitSound, options);
    }

    playCombatSound(soundName, options = {}) {
        // This can still be used for specific named combat sounds like swings
        return this.playSound(soundName, options);
    }

    playJumpSound(options = {}) {
        // TODO: Play move_jump_01.wav when available
        return this.playSound('ui_click_01.wav', options); // Placeholder
    }

    playSoftLandingSound(options = {}) {
        // TODO: Play move_land_soft_01.wav when available
        return this.playSound('ui_click_01.wav', { ...options, volume: options.volume ? options.volume * 0.7 : 0.7 }); // Placeholder, softer
    }

    playClimbSound(options = {}) {
        // TODO: Play move_climb_01.wav when available
        return this.playSound('ui_click_01.wav', options); // Placeholder
    }

    // Note: Looping sounds require storing the AudioBufferSourceNode to stop them later.
    // This is a simplified example for starting a loop.
    playSwimLoop(options = {}) {
        // TODO: Play move_swim_loop.wav when available
        console.warn("playSwimLoop called, playing placeholder. Implement proper loop management to stop it.");
        return this.playSound('ui_click_01.wav', { ...options, loop: true }); // Placeholder
    }

    playSoundAtLocation(soundName, sourcePosition, listenerPosition = { x: 0, y: 0, z: 0 }, options = {}) {
        if (!this.soundBuffers.has(soundName)) {
            console.warn(`Sound not loaded for playAtLocation: ${soundName}. Attempting to load now...`);
            this.loadSound(soundName).then(buffer => {
                if (buffer) {
                    this._playBufferAtLocation(buffer, sourcePosition, listenerPosition, options);
                } else {
                    console.error(`Failed to play sound ${soundName} at location after attempting to load.`);
                }
            });
            return null;
        }

        const audioBuffer = this.soundBuffers.get(soundName);
        return this._playBufferAtLocation(audioBuffer, sourcePosition, listenerPosition, options);
    }

    _playBufferAtLocation(audioBuffer, sourcePosition, listenerPosition,
        { loop = false, volume = 1.0, refDistance = 1, rolloffFactor = 1, maxDistance = 100, distanceModel = 'inverse' } = {}) {
        if (!this.audioContext) {
            console.error("AudioContext not initialized.");
            return null;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = loop;

        const panner = this.audioContext.createPanner();
        panner.panningModel = 'HRTF'; // More realistic spatialization
        panner.distanceModel = distanceModel; // 'linear', 'inverse', 'exponential'
        panner.refDistance = refDistance;         // Distance where volume is 1.0
        panner.rolloffFactor = rolloffFactor;   // How quickly volume drops
        panner.maxDistance = maxDistance;       // Distance beyond which volume doesn't decrease further

        // Assuming game coordinates map directly: X, Y, Z
        // WebAudio PannerNode: positionX, positionY, positionZ
        // WebAudio Listener: positionX, positionY, positionZ
        // If your game's Z is up, and WebAudio's Y is up:
        // panner.positionX.setValueAtTime(sourcePosition.x, this.audioContext.currentTime);
        // panner.positionY.setValueAtTime(sourcePosition.z, this.audioContext.currentTime); // Map game Z to WebAudio Y
        // panner.positionZ.setValueAtTime(-sourcePosition.y, this.audioContext.currentTime); // Map game Y to WebAudio -Z (if Y is depth into screen)

        // For now, direct mapping, assuming game Y is up, game Z is depth.
        // Web Audio: X (left/right), Y (up/down), Z (front/back, negative is towards listener)
        // If game: X (left/right), Y (depth away from camera), Z (up/down)
        // Then map: panner.X = game.X, panner.Y = game.Z, panner.Z = -game.Y
        // Let's assume player (listener) is at origin for simplicity in panner setting,
        // and listener position is handled by updateListenerPosition.
        // Panner position is relative to listener if listener is at (0,0,0).
        // More accurately, set panner to world coords, and listener to world coords.

        panner.positionX.setValueAtTime(sourcePosition.x, this.audioContext.currentTime);
        panner.positionY.setValueAtTime(sourcePosition.y, this.audioContext.currentTime); // Assuming game Y is height for now
        panner.positionZ.setValueAtTime(sourcePosition.z, this.audioContext.currentTime); // Assuming game Z is depth for now
        // Note: if player (listener) is not at (0,0,0) and facing -Z, these panner positions need to be relative OR listener position must be updated.
        // The listener position is updated via updateListenerPosition.

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        source.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(0);
        return source;
    }


    // --- Volume Control (Basic Example) ---
    setGlobalVolume(volume) {
        console.warn("Global volume control is not fully implemented yet. This is a placeholder.");
    }
}

console.log("AudioManager class defined. Instantiate it in your main game script.");
