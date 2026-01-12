class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundBuffers = new Map(); // To store pre-loaded sound data
        this.musicBuffers = new Map(); // To store decoded music tracks
        this.soundPath = 'assets/sounds/'; // Base path for sound files
        this.isLoading = false;
        this.loadQueue = []; // Used for simple checks, but loadingPromises is better
        this.loadingPromises = new Map(); // Dedupe loading promises

        // Master Gain Node for global volume control
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime); // Default to full volume
        this.masterGainNode.connect(this.audioContext.destination);

        // Music and SFX Gain Nodes
        this.musicGainNode = this.audioContext.createGain();
        this.musicGainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime); // Default music volume
        this.musicGainNode.connect(this.masterGainNode);

        this.sfxGainNode = this.audioContext.createGain();
        this.sfxGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime); // Default SFX volume
        this.sfxGainNode.connect(this.masterGainNode);

        this.musicTracks = [];
        this.musicTracksLoadedPromise = this._loadMusicTracks();
        this.currentTrackIndex = -1;
        this.currentTrackName = "None";
        this.musicSourceNode = null; // To hold the current music source
        this._isMusicPlaying = false;

        // Timer references for clean cancellation
        this.musicStartTimeout = null;
        this.musicNextTrackTimeout = null;

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
            'ui_start_game_02.wav',
            'fire_loop.wav'
        ];

        // Pre-load existing sounds
        this.preloadSounds(this.availableSounds);

        // Set up listener position (assuming player is at 0,0,0 initially, facing along Y-axis "North")
        // Game Coords: Z=Height, Y=North/South, X=East/West
        // WebAudio Coords: Y=Up, Z=Back/Front, X=Right/Left
        // Mapping: Game X -> WebAudio X, Game Z -> WebAudio Y, Game Y -> WebAudio Z

        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(0, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(0, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(0, this.audioContext.currentTime);
        } else { // Fallback for older browsers
            this.audioContext.listener.setPosition(0, 0, 0);
        }
        // Default orientation: facing "North" (Game -Y) -> WebAudio -Z
        // Up is Game +Z -> WebAudio +Y
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
        // Map Game Coordinates to WebAudio Coordinates
        // Game X -> WebAudio X
        // Game Z (Height) -> WebAudio Y (Up)
        // Game Y (Depth) -> WebAudio Z (Front/Back)

        if (this.audioContext.listener.positionX) {
            this.audioContext.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
            this.audioContext.listener.positionY.setValueAtTime(z, this.audioContext.currentTime);
            this.audioContext.listener.positionZ.setValueAtTime(y, this.audioContext.currentTime);
        } else {
            this.audioContext.listener.setPosition(x, z, y);
        }
    }

    async loadSound(soundName) {
        if (this.soundBuffers.has(soundName)) {
            return this.soundBuffers.get(soundName);
        }

        // Deduplicate in-flight requests
        if (this.loadingPromises.has(soundName)) {
            return this.loadingPromises.get(soundName);
        }

        const loadPromise = (async () => {
            try {
                const response = await fetch(this.soundPath + soundName);
                if (!response.ok) {
                    throw new Error(`Failed to load sound: ${soundName} - ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.soundBuffers.set(soundName, audioBuffer);
                // console.log(`Sound loaded: ${soundName}`);
                return audioBuffer;
            } catch (error) {
                console.error(`Error loading sound ${soundName}:`, error);
                return null;
            } finally {
                this.loadingPromises.delete(soundName);
            }
        })();

        this.loadingPromises.set(soundName, loadPromise);
        return loadPromise;
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

    playSound(soundName, { loop = false, volume = 1.0, duration = 0 } = {}) {
        // Ensure AudioContext is running (fix for suspended state on user interaction)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
        }

        const handle = {
            source: null,
            stop: function() {
                if (this.source) {
                    try { this.source.stop(); } catch(e) {}
                } else {
                    this.cancelled = true;
                }
            },
            cancelled: false
        };

        if (!this.soundBuffers.has(soundName)) {
            // console.warn(`Sound not loaded: ${soundName}. Attempting to load now...`);
            this.loadSound(soundName).then(buffer => {
                if (buffer && !handle.cancelled) {
                    handle.source = this._playBuffer(buffer, soundName, loop, volume, duration);
                }
            });
            return handle;
        }

        const audioBuffer = this.soundBuffers.get(soundName);
        handle.source = this._playBuffer(audioBuffer, soundName, loop, volume, duration);
        return handle;
    }

    _playBuffer(audioBuffer, soundName, loop, volume, duration) {
        if (!this.audioContext) return null;

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        source.loop = loop;
        source.start(0);

        if (duration > 0) {
            source.stop(this.audioContext.currentTime + duration / 1000);
        }

        // Cleanup on end
        source.onended = () => {
            source.disconnect();
            gainNode.disconnect();
        };
        return source;
    }

    stopSound(sourceNode) {
        if (sourceNode && typeof sourceNode.stop === 'function') {
            try {
                sourceNode.stop();
            } catch (e) {
                // console.warn("Error stopping sound:", e);
            }
        }
    }

    // --- Placeholder methods ---
    playUiSound(soundName, options = {}) { return this.playSound(soundName, options); }
    playFootstepSound(options = {}) {
        const footstepSounds = ['foot_grass_01.wav', 'foot_grass_02.wav'];
        return this.playSound(footstepSounds[Math.floor(Math.random() * footstepSounds.length)], options);
    }
    playHardLandingSound(options = {}) {
        const landingSounds = ['move_land_hard_01.wav', 'move_land_hard_02.wav', 'move_land_hard_03.wav', 'move_land_hard_04.wav'];
        return this.playSound(landingSounds[Math.floor(Math.random() * landingSounds.length)], options);
    }
    playUnarmedHitSound(options = {}) {
        const unarmedHitSounds = ['melee_unarmed_hit_01.wav', 'melee_unarmed_hit_02.wav'];
        return this.playSound(unarmedHitSounds[Math.floor(Math.random() * unarmedHitSounds.length)], options);
    }
    playCombatSound(soundName, options = {}) { return this.playSound(soundName, options); }
    playJumpSound(options = {}) { return this.playSound('ui_click_01.wav', options); } // Placeholder
    playSoftLandingSound(options = {}) { return this.playSound('ui_click_01.wav', { ...options, volume: options.volume ? options.volume * 0.7 : 0.7 }); }
    playClimbSound(options = {}) { return this.playSound('ui_click_01.wav', options); }
    playSwimLoop(options = {}) { return this.playSound('ui_click_01.wav', { ...options, loop: true }); }

    playSoundAtLocation(soundName, sourcePosition, options = {}) {
        // NOTE: listenerPosition argument removed. Use updateListenerPosition() to update global listener.

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
        }

        const handle = {
            source: null,
            panner: null,
            stop: function() {
                if (this.source) {
                    try { this.source.stop(); } catch(e) {}
                } else {
                    this.cancelled = true;
                }
            },
            cancelled: false
        };

        if (!this.soundBuffers.has(soundName)) {
            this.loadSound(soundName).then(buffer => {
                if (buffer && !handle.cancelled) {
                    const result = this._playBufferAtLocation(buffer, sourcePosition, options);
                    if (result) {
                        handle.source = result;
                        handle.panner = result.panner;
                    }
                }
            });
            return handle;
        }

        const audioBuffer = this.soundBuffers.get(soundName);
        const result = this._playBufferAtLocation(audioBuffer, sourcePosition, options);
        if (result) {
            handle.source = result;
            handle.panner = result.panner;
        }
        return handle;
    }

    _playBufferAtLocation(audioBuffer, sourcePosition, { loop = false, volume = 1.0, refDistance = 1, rolloffFactor = 1, maxDistance = 100, distanceModel = 'inverse', duration = 0 } = {}) {
        if (!this.audioContext) return null;

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = loop;

        const panner = this.audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = distanceModel;
        panner.refDistance = refDistance;
        panner.rolloffFactor = rolloffFactor;
        panner.maxDistance = maxDistance;

        // Apply Coordinate Mapping: Game -> WebAudio
        // X -> X
        // Y (Depth) -> Z
        // Z (Height) -> Y
        panner.positionX.setValueAtTime(sourcePosition.x, this.audioContext.currentTime);
        panner.positionY.setValueAtTime(sourcePosition.z, this.audioContext.currentTime);
        panner.positionZ.setValueAtTime(sourcePosition.y, this.audioContext.currentTime);

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        source.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        source.start(0);
        if (duration > 0) {
            source.stop(this.audioContext.currentTime + duration / 1000);
        }

        source.onended = () => {
             source.disconnect();
             panner.disconnect();
             gainNode.disconnect();
        };

        source.panner = panner;
        return source;
    }


    // --- Music Playback ---

    isMusicPlaying() {
        return this._isMusicPlaying;
    }

    async _loadMusicTracks() {
        // Try loading from manifest first (Robust)
        const manifestUrl = this.soundPath + 'music/manifest.json';
        try {
            const response = await fetch(manifestUrl);
            if (response.ok) {
                const tracks = await response.json();
                this.musicTracks = tracks.map(t => 'music/' + t);
                console.log(`Loaded music manifest: ${this.musicTracks.length} tracks.`);
                return;
            }
        } catch (e) {
            console.warn("Manifest load failed, falling back to directory listing (Fragile).");
        }

        // Fallback: Directory listing scraping (Fragile, existing logic)
        const musicDir = this.soundPath + 'music/';
        try {
            const response = await fetch(musicDir);
            if (!response.ok) throw new Error("Directory listing failed");
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = Array.from(doc.querySelectorAll('a'));
            const audioFiles = links
                .map(link => link.getAttribute('href'))
                .filter(href => href.match(/\.(mp3|wav|ogg)$/i))
                .map(href => 'music/' + href.split('/').pop());

            if (audioFiles.length > 0) {
                this.musicTracks = audioFiles.sort();
                console.log(`Discovered music tracks via scrape:`, this.musicTracks);
                return;
            }
        } catch (error) {
            console.error("Could not load music playlist:", error);
            this.musicTracks = [];
        }
    }

    async playMusic(delay = 0) {
        await this.musicTracksLoadedPromise;
        if (this.musicTracks.length === 0) {
            console.warn("No music tracks loaded.");
            return;
        }
        if (this._isMusicPlaying) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Clear any pending timers to avoid double starts
        if (this.musicStartTimeout) clearTimeout(this.musicStartTimeout);

        if (delay > 0) {
            this.musicStartTimeout = setTimeout(() => {
                this._isMusicPlaying = true;
                this.playNextTrack();
                this.musicStartTimeout = null;
            }, delay);
        } else {
            this._isMusicPlaying = true;
            this.playNextTrack();
        }
    }

    stopMusic() {
        // Cancel pending start
        if (this.musicStartTimeout) {
            clearTimeout(this.musicStartTimeout);
            this.musicStartTimeout = null;
        }
        // Cancel pending next track
        if (this.musicNextTrackTimeout) {
            clearTimeout(this.musicNextTrackTimeout);
            this.musicNextTrackTimeout = null;
        }

        if (this.musicSourceNode) {
            this.musicSourceNode.onended = null;
            try { this.musicSourceNode.stop(); } catch(e) {}
            this.musicSourceNode.disconnect();
            this.musicSourceNode = null;
        }
        this._isMusicPlaying = false;
        this.currentTrackName = "None";
        this._dispatchTrackChangedEvent();
    }

    skipTrack() {
        if (this.musicSourceNode) {
            this.musicSourceNode.onended = null;
            try { this.musicSourceNode.stop(); } catch(e) {}
        }
        if (this.musicNextTrackTimeout) clearTimeout(this.musicNextTrackTimeout);

        this._isMusicPlaying = true; // Ensure flag is set if we force skip
        this.playNextTrack();
    }

    toggleMusic() {
        if (this._isMusicPlaying || this.musicStartTimeout) {
            this.stopMusic();
        } else {
            this.playMusic();
        }
        return this._isMusicPlaying;
    }

    async playNextTrack() {
        if (!this._isMusicPlaying) return;

        if (this.musicTracks.length === 0) {
            this.stopMusic();
            return;
        }

        let nextTrackIndex = this.currentTrackIndex + 1;
        if (nextTrackIndex >= this.musicTracks.length) {
            nextTrackIndex = 0;
        }
        this.currentTrackIndex = nextTrackIndex;

        const trackPath = this.musicTracks[this.currentTrackIndex];
        this.currentTrackName = trackPath.split('/').pop().replace(/\.[^/.]+$/, "");
        this._dispatchTrackChangedEvent();

        try {
            let audioBuffer;
            if (this.musicBuffers.has(trackPath)) {
                audioBuffer = this.musicBuffers.get(trackPath);
            } else {
                const response = await fetch(this.soundPath + trackPath);
                if (!response.ok) throw new Error(`Failed to load music: ${trackPath}`);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                // Cache it
                this.musicBuffers.set(trackPath, audioBuffer);
            }

            if (!this._isMusicPlaying) return; // Stopped while loading

            // Stop previous if exists (safety)
            if (this.musicSourceNode) {
                try { this.musicSourceNode.stop(); } catch(e){}
                this.musicSourceNode.disconnect();
            }

            this.musicSourceNode = this.audioContext.createBufferSource();
            this.musicSourceNode.buffer = audioBuffer;
            this.musicSourceNode.connect(this.musicGainNode);
            this.musicSourceNode.start(0);

            this.musicSourceNode.onended = () => {
                this.musicSourceNode.disconnect();
                this.musicSourceNode = null;
                if (this._isMusicPlaying) {
                     this.musicNextTrackTimeout = setTimeout(() => this.playNextTrack(), 5000); // 5s gap
                }
            };
        } catch (error) {
            console.error(`Error playing music track ${trackPath}:`, error);
            if (this._isMusicPlaying) {
                this.musicNextTrackTimeout = setTimeout(() => this.playNextTrack(), 5000); // Retry/Skip
            }
        }
    }

    _dispatchTrackChangedEvent() {
        const event = new CustomEvent('trackchanged', {
            detail: { trackName: this.currentTrackName }
        });
        document.dispatchEvent(event);
    }

    // --- Volume Control ---
    setMasterVolume(volume) {
        if (this.masterGainNode) {
            const val = Math.max(0, Math.min(1, volume));
            this.masterGainNode.gain.setValueAtTime(val, this.audioContext.currentTime);
            // console.log(`Master volume: ${val}`);
        }
    }
    setMusicVolume(volume) {
        if (this.musicGainNode) {
            const val = Math.max(0, Math.min(1, volume));
            this.musicGainNode.gain.setValueAtTime(val, this.audioContext.currentTime);
        }
    }
    setSfxVolume(volume) {
        if (this.sfxGainNode) {
            const val = Math.max(0, Math.min(1, volume));
            this.sfxGainNode.gain.setValueAtTime(val, this.audioContext.currentTime);
        }
    }
    getMusicVolume() { return this.musicGainNode ? this.musicGainNode.gain.value : 1.0; }
    getSfxVolume() { return this.sfxGainNode ? this.sfxGainNode.gain.value : 1.0; }
}

console.log("AudioManager class defined. Instantiate it in your main game script.");
