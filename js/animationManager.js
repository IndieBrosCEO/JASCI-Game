// js/animationManager.js

class AnimationManager {
    constructor(gameState) {
        this.gameState = gameState;
        if (!this.gameState.activeAnimations) {
            this.gameState.activeAnimations = [];
        }
        // Initialize isAnimationPlaying if it's not already set by gameState.js
        if (this.gameState.isAnimationPlaying === undefined) {
            this.gameState.isAnimationPlaying = false;
        }
    }

    playAnimation(animationType, data) {
        const attackerName = data.attacker ? (data.attacker === this.gameState ? "Player" : (data.attacker.name || data.attacker.id)) : (data.entity === this.gameState ? "Player" : (data.entity ? (data.entity.name || data.entity.id) : "N/A"));
        console.log(`[AnimationManager] playAnimation ENTERED. Type: ${animationType}, Attacker/Entity: ${attackerName}`);
        // Safely log data
        let dataForLog = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (key === 'entity' || key === 'attacker' || key === 'defender') {
                    if (data[key]) {
                        dataForLog[key] = data[key].id || data[key].name || `[${key}_object]`;
                    } else {
                        dataForLog[key] = null;
                    }
                } else if (key === 'gameState' || data[key] === window.gameState) {
                    dataForLog[key] = '[gameState_reference]';
                } else if (typeof data[key] === 'object' && data[key] !== null) {
                    // For other objects, we'll let the replacer handle them or they'll be stringified if simple enough.
                    dataForLog[key] = data[key];
                } else {
                    dataForLog[key] = data[key];
                }
            }
        }

        const customReplacer = (key, value) => {
            if (value === window.gameState) {
                return '[gameState_global_ref]';
            }
            // Add more checks here if other complex objects (like items from assetManager)
            // are passed directly in `data` and cause stringify issues.
            // For example:
            // if (value && value.constructor && (value.constructor.name === 'Item' || value.constructor.name === 'Weapon')) {
            //     return `[${value.constructor.name}:${value.id || value.name || 'unknown'}]`;
            // }
            return value;
        };

        try {
            console.log('[AnimationManager] playAnimation REQUEST:', animationType,
                'Data (processed):', JSON.stringify(dataForLog, customReplacer, 2), // Using 2 for pretty print
                'Current active before add:', this.gameState.activeAnimations.length,
                'isAnimationPlaying Flag Before:', this.gameState.isAnimationPlaying);
        } catch (e) {
            console.error('[AnimationManager] playAnimation REQUEST: Error stringifying dataForLog - ', e);
            // Fallback log if stringify still fails (e.g. due to properties within dataForLog still being complex)
            console.log('[AnimationManager] playAnimation REQUEST (Fallback log):', animationType,
                'Data Keys:', Object.keys(data), // Log only keys of original data
                'Current active before add:', this.gameState.activeAnimations.length,
                'isAnimationPlaying Flag Before:', this.gameState.isAnimationPlaying);
        }

        let animationInstance;

        switch (animationType) {
            case 'movement':
                animationInstance = new MovementAnimation(animationType, data, this.gameState);
                break;
            case 'meleeSwing': // NEW CASE
                animationInstance = new MeleeSwingAnimation(animationType, data, this.gameState);
                break;
            case 'rangedBullet':
                animationInstance = new RangedBulletAnimation(animationType, data, this.gameState);
                break;
            case 'throwing':
                animationInstance = new ThrowingAnimation(animationType, data, this.gameState);
                break;
            case 'explosion':
                animationInstance = new ExplosionAnimation(animationType, data, this.gameState);
                break;
            case 'grapple': // Added by Jules
                animationInstance = new GrappleAnimation(animationType, data, this.gameState);
                break;
            case 'flamethrower': // Added by Jules
                animationInstance = new FlamethrowerAnimation(animationType, data, this.gameState);
                break;
            case 'taser': // Added by Jules
                animationInstance = new TaserAnimation(animationType, data, this.gameState);
                break;
            case 'launcherProjectile': // Added by Jules
                animationInstance = new LauncherProjectileAnimation(animationType, data, this.gameState);
                break;
            case 'gasCloud': // Added by Jules
                animationInstance = new GasCloudAnimation(animationType, data, this.gameState);
                break;
            case 'whipCrack': // Added by Jules
                animationInstance = new WhipCrackAnimation(animationType, data, this.gameState);
                break;
            case 'liquidSplash': // Added by Jules
                animationInstance = new LiquidSplashAnimation(animationType, data, this.gameState);
                break;
            case 'chainsawAttack': // Added by Jules
                animationInstance = new ChainsawAttackAnimation(animationType, data, this.gameState);
                break;
            case 'fall': // Added for falling animation
                animationInstance = new FallAnimation(animationType, data, this.gameState);
                break;
            case 'diceRoll': // Added for combat sequence
                animationInstance = new DiceRollAnimation(animationType, data, this.gameState);
                break;
            case 'modifierPopup': // Added for combat sequence
                animationInstance = new ModifierPopupAnimation(animationType, data, this.gameState);
                break;
            case 'hitMissLabel': // Added for combat sequence
                animationInstance = new HitMissLabelAnimation(animationType, data, this.gameState);
                break;
            default:
                console.warn(`AnimationManager: Unknown animation type: ${animationType}. Using generic Animation.`);
                animationInstance = new Animation(animationType, data, this.gameState);
                break;
        }

        this.gameState.activeAnimations.push(animationInstance);
        console.log('[AnimationManager] playAnimation PUSHED:', animationType, 'New active count:', this.gameState.activeAnimations.length);
        this.gameState.isAnimationPlaying = true; // Set flag when an animation starts
        console.log('[AnimationManager] playAnimation END: isAnimationPlaying SET TO TRUE. Flag:', this.gameState.isAnimationPlaying);

        // Ensure a render is scheduled immediately when an animation starts
        if (window.mapRenderer) {
            window.mapRenderer.scheduleRender();
        }

        return animationInstance.promise;
    }

    isAnimationPlaying() {
        return this.gameState.isAnimationPlaying === true;
    }

    updateAnimations() {

        if (!this.gameState.activeAnimations || this.gameState.activeAnimations.length === 0) {
            if (this.gameState.isAnimationPlaying) {
                this.gameState.isAnimationPlaying = false;
                console.log('[AnimationManager] All animations done, isAnimationPlaying SET TO FALSE. Flag:', this.gameState.isAnimationPlaying);
            }
            return;
        }

        if (!this.gameState.isAnimationPlaying) {
            this.gameState.isAnimationPlaying = true;
            // console.log("AnimationManager: Active animations present, ensuring isAnimationPlaying is true."); // Kept original info log
        }

        for (let i = this.gameState.activeAnimations.length - 1; i >= 0; i--) {
            const animation = this.gameState.activeAnimations[i];
            console.log('[AnimationManager] Updating animation:', animation.type, 'Sprite:', animation.sprite, 'Start time:', animation.startTime, 'Duration:', animation.duration);
            animation.update();

            if (animation.isFinished()) {
                console.log('[AnimationManager] Animation FINISHED:', animation.type, 'Sprite:', animation.sprite, 'Duration:', animation.duration, 'Resolve Promise.');
                animation.resolvePromise();
                console.log('[AnimationManager] SPLICING animation:', animation.type, 'Old active count:', this.gameState.activeAnimations.length);
                this.gameState.activeAnimations.splice(i, 1);
            }
        }
        console.log('[AnimationManager] updateAnimations LOOP END. Active:', this.gameState.activeAnimations.length, 'isAnimationPlaying Flag:', this.gameState.isAnimationPlaying);
        if (this.gameState.activeAnimations.length === 0 && this.gameState.isAnimationPlaying) {
            this.gameState.isAnimationPlaying = false;
            console.log('[AnimationManager] All animations done, isAnimationPlaying SET TO FALSE. Flag:', this.gameState.isAnimationPlaying);
        }
    }
}

class Animation {
    constructor(type, data, gameStateRef) {
        this.type = type;
        this.data = data;
        this.gameState = gameStateRef;
        this.startTime = Date.now();
        this.duration = data.duration || 1000; // Default duration
        this.finished = false;

        this.x = data.x !== undefined ? data.x : (data.startPos ? data.startPos.x : 0);
        this.y = data.y !== undefined ? data.y : (data.startPos ? data.startPos.y : 0);
        // Determine Z coordinate
        if (data.z !== undefined) {
            this.z = data.z;
        } else if (data.startPos && data.startPos.z !== undefined) {
            this.z = data.startPos.z;
        } else if (data.entity && data.entity.mapPos && data.entity.mapPos.z !== undefined) {
            this.z = data.entity.mapPos.z;
        } else if (data.attacker && data.attacker.mapPos && data.attacker.mapPos.z !== undefined) {
            this.z = data.attacker.mapPos.z;
        } else if (this.gameState && this.gameState.playerPos && this.gameState.playerPos.z !== undefined && (data.entity === this.gameState || data.attacker === this.gameState)) {
            // If entity/attacker is player, use player's Z
            this.z = this.gameState.playerPos.z;
        } else {
            this.z = 0; // Default Z if not specified
        }
        this.sprite = data.sprite || '';
        this.color = data.color || 'white';
        this.visible = data.visible !== undefined ? data.visible : true;

        this.promise = new Promise((resolve) => {
            this.resolvePromise = resolve;
        });

        // ADD THIS LOG:
        const entityNameForLog = data.entity ? (data.entity === this.gameState ? "Player" : (data.entity.name || data.entity.id)) : (data.attacker ? (data.attacker === this.gameState ? "Player" : (data.attacker.name || data.attacker.id)) : "N/A");
        console.log(`[Animation CONSTRUCTOR] New Animation: Type=${this.type}, Visible=${this.visible}, X=${this.x}, Y=${this.y}, Z=${this.z}, Duration=${this.duration}, Entity/Attacker=${entityNameForLog}`);

        // Safely log data, similar to AnimationManager.playAnimation
        let dataForLog = {};
        if (typeof data === 'object' && data !== null) {
            for (const key in data) {
                if (Object.hasOwnProperty.call(data, key)) {
                    const value = data[key];
                    if (key === 'entity' || key === 'attacker' || key === 'defender' || key === 'target') {
                        if (value) {
                            dataForLog[key] = value.id || value.name || `[${key}_object_no_id_name]`;
                        } else {
                            dataForLog[key] = null;
                        }
                    } else if (value === window.gameState || value === this.gameState) {
                        dataForLog[key] = '[gameState_reference]';
                    } else if (key === 'pendingCombatAction' && typeof value === 'object' && value !== null) {
                        dataForLog[key] = '{...pendingCombatAction_details...}'; // Placeholder for complex object
                    } else if (typeof value === 'function') {
                        dataForLog[key] = '[function]';
                    } else {
                        // For simple serializable properties or complex ones that stringify can handle if not circular
                        dataForLog[key] = value;
                    }
                }
            }
        } else {
            dataForLog = data; // If data is not an object (e.g. primitive), log as is
        }

        const customReplacerForAnimation = (key, value) => {
            if (value === window.gameState || value === this.gameState) { // Check against this.gameState as well
                return '[gameState_global_ref]';
            }
            // Add more specific checks if 'pendingCombatAction' or other known complex objects
            // are directly inside 'data' and need custom handling beyond what dataForLog does.
            // This basic replacer primarily handles direct gameState references.
            // The main protection comes from dataForLog not deeply copying problematic structures.
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Heuristic: if an object still has an 'entity' key that refers to something complex,
                // or a 'pendingCombatAction' key, it might be part of a circular path not caught by dataForLog.
                // This is a fallback; ideally, dataForLog pre-processes these.
                if (value.entity && (value.entity === window.gameState || value.entity === this.gameState || value.entity === this.data.entity)) {
                    return '[Circular:object_with_entity_ref]';
                }
                if (value.pendingCombatAction) {
                    return '[Circular:object_with_pendingCombatAction]';
                }
            }
            return value;
        };

        try {
            console.log('[Animation] CREATED:', this.type, 'Duration:', this.duration, 'Sprite:', this.sprite, 'Pos: (', this.x, ',', this.y, '), Visible:', this.visible, 'Data:', JSON.stringify(dataForLog, customReplacerForAnimation, 2));
        } catch (e) {
            console.error('[Animation] CREATED: Error stringifying dataForLog - ', e);
            // Fallback log if stringify still fails
            console.log('[Animation] CREATED (Fallback log):', this.type, 'Data Keys:', (typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A'));
        }
    }

    update() {
        const timeNow = Date.now();
        console.log('[Animation] Update:', this.type, 'Sprite:', this.sprite, 'Now:', timeNow, 'Start:', this.startTime, 'Elapsed:', (timeNow - this.startTime), 'Duration:', this.duration, 'Finished:', this.finished);
        if (timeNow - this.startTime >= this.duration) {
            this.finished = true;
            this.visible = false;
            console.log('[Animation] Update - FINISHED set for:', this.type, 'Sprite:', this.sprite);
        }
    }

    isFinished() {
        return this.finished;
    }
}

class MovementAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        // console.log(`MovementAnimation created for entity (sprite ${this.sprite}) from ${this.startPos.x},${this.startPos.y} to ${this.endPos.x},${this.endPos.y}`);
    }

    update() {
        const attackerName = this.data.attacker ? (this.data.attacker === this.gameState ? "Player" : (this.data.attacker.name || this.data.attacker.id)) : "N/A";
        if (attackerName === "Player") { // Log only for player for now to reduce noise
            console.log(`[MeleeSwingAnimation UPDATE] For Player. Finished: ${this.finished}, Visible: ${this.visible}, SpriteIdx: ${this.currentSpriteIndex}`);
        }
        if (this.finished) {
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        const progress = Math.min(elapsedTime / this.duration, 1);

        if (progress < 0.5) {
            this.x = this.startPos.x;
            this.y = this.startPos.y;
        } else {
            this.x = this.endPos.x;
            this.y = this.endPos.y;
        }
        this.visible = true; // Active frame is visible

        console.log('[MovementAnimation] Update Specifics - Progress:', progress, 'X:', this.x, 'Y:', this.y, 'Visible:', this.visible, 'Finished:', this.finished);

        super.update(); // Call base class update LAST
        // Optional: console.log('[MovementAnimation] Update END - Visible:', this.visible, 'Finished:', this.finished);
    }
}

class MeleeSwingAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data contains: attacker, x, y, originalSprite, originalColor, duration
        super(type, data, gameStateRef);
        this.swingSprites = ['/', '-', '\\', '|']; // Using double backslash for literal backslash
        this.currentSpriteIndex = 0;
        this.frameDuration = Math.floor(this.duration / this.swingSprites.length);
        this.lastFrameTime = this.startTime;

        // Animation occurs at the attacker's position
        this.x = data.x;
        this.y = data.y;
        this.sprite = this.swingSprites[0]; // Initial sprite for the swing
        this.color = 'white'; // Swing effect color
        this.visible = true;
        // console.log(`MeleeSwingAnimation created at ${this.x},${this.y} for duration ${this.duration}`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        let progress = (now - this.startTime) / this.duration;
        if (progress > 1) progress = 1;

        if (now - this.lastFrameTime >= this.frameDuration) {
            this.currentSpriteIndex++;
            if (this.currentSpriteIndex < this.swingSprites.length) {
                this.sprite = this.swingSprites[this.currentSpriteIndex];
                this.lastFrameTime = now;
            }
            // If currentSpriteIndex goes beyond swingSprites.length, it just means the "swing" part is done,
            // but the animation might still be within its overall duration.
            // The base Animation.update() will handle marking it finished when duration is met.
        }
        this.visible = true; // Active frame is visible

        console.log('[MeleeSwingAnimation] Update Specifics - Progress:', progress.toFixed(2), 'FrameIdx:', this.currentSpriteIndex, 'Sprite:', this.sprite, 'Visible:', this.visible, 'Finished:', this.finished);

        super.update(); // Call base class update LAST
        // Optional: console.log('[MeleeSwingAnimation] Update END - Visible:', this.visible, 'Finished:', this.finished);
    }
}

class RangedBulletAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data includes: startPos, endPos, sprite, color, duration
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        // Use data.projectileSprite if available, otherwise data.sprite, then default (Jules)
        this.sprite = data.projectileSprite || data.sprite || '*';
        this.color = data.color || 'yellow'; // Default bullet color
        this.visible = true;
        console.log(`[RangedBulletAnimation CONSTRUCTOR] Created: from (${this.startPos.x},${this.startPos.y}) to (${this.endPos.x},${this.endPos.y}), sprite: ${this.sprite}`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;

        if (progress >= 1) {
            progress = 1;
            // Let super.update() handle finished and visible based on duration
        } else {
            this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
            this.visible = true; // Active frame is visible
        }

        console.log('[RangedBulletAnimation] Update Specifics - Progress:', progress.toFixed(2), 'X:', this.x.toFixed(2), 'Y:', this.y.toFixed(2), 'Visible:', this.visible, 'Finished:', this.finished);

        super.update(); // Call base class update LAST
        // Optional: console.log('[RangedBulletAnimation] Update END - Visible:', this.visible, 'Finished:', this.finished);
    }
}

class ThrowingAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data includes: startPos, endPos, sprite, color, duration
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.sprite = data.sprite || 'o'; // Default throwing sprite
        this.color = data.color || 'grey'; // Default throwing color
        this.visible = true;
        // console.log(`ThrowingAnimation created: from (${this.startPos.x},${this.startPos.y}) to (${this.endPos.x},${this.endPos.y}), sprite: ${this.sprite}`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;

        if (progress >= 1) {
            progress = 1;
            // Let super.update() handle finished and visible based on duration
        } else {
            this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
            this.visible = true; // Active frame is visible
        }

        console.log('[ThrowingAnimation] Update Specifics - Progress:', progress.toFixed(2), 'X:', this.x.toFixed(2), 'Y:', this.y.toFixed(2), 'Visible:', this.visible, 'Finished:', this.finished);

        super.update(); // Call base class update LAST
        // Optional: console.log('[ThrowingAnimation] Update END - Visible:', this.visible, 'Finished:', this.finished);
    }
}


// Make sure MeleeSwingAnimation is available
window.MeleeSwingAnimation = MeleeSwingAnimation;
window.RangedBulletAnimation = RangedBulletAnimation; // Export RangedBulletAnimation
window.ThrowingAnimation = ThrowingAnimation; // Export ThrowingAnimation

// --- ExplosionAnimation Class ---
class ExplosionAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: centerPos, radius (max), explosionSprites, color, duration
        super(type, { ...data, x: data.centerPos.x, y: data.centerPos.y, z: data.centerPos.z }, gameStateRef); // Base class x,y is center, pass z
        this.centerPos = data.centerPos;
        this.maxRadius = data.radius;
        this.explosionSprites = data.explosionSprites || ['·', 'o', 'O', '*', 'X'];
        this.color = data.color || 'orange'; // Keep this color for all stages for now

        this.currentFrameIndex = 0;
        this.currentExpansionRadius = 0;
        this.visible = true; // Starts visible

        // The base Animation class sets this.sprite to data.sprite.
        // For Explosion, this.sprite isn't directly used for rendering the whole animation,
        // but individual stages will use sprites from this.explosionSprites.
        // We can set it to the first sprite for consistency if needed.
        this.sprite = this.explosionSprites[0];
        // console.log(`ExplosionAnimation created at (${this.centerPos.x},${this.centerPos.y}), maxRadius: ${this.maxRadius}, duration: ${this.duration}`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;
        if (progress > 1) progress = 1;

        // Update frame index
        this.currentFrameIndex = Math.floor(progress * this.explosionSprites.length);
        if (this.currentFrameIndex >= this.explosionSprites.length) {
            this.currentFrameIndex = this.explosionSprites.length - 1;
        }

        // Update expansion radius
        if (progress < 0.75) { // Expanding phase (75% of duration)
            const expansionProgress = progress / 0.75;
            this.currentExpansionRadius = Math.ceil(expansionProgress * this.maxRadius);
        } else { // Contracting phase (last 25% of duration)
            const contractionProgress = (progress - 0.75) / 0.25;
            this.currentExpansionRadius = Math.ceil((1 - contractionProgress) * this.maxRadius);
        }
        this.currentExpansionRadius = Math.max(0, this.currentExpansionRadius);
        this.visible = true; // Active frame is visible

        console.log('[ExplosionAnimation] Update Specifics - Progress:', progress.toFixed(2), 'currentFrameIndex:', this.currentFrameIndex, 'currentExpansionRadius:', this.currentExpansionRadius, 'Visible:', this.visible, 'Finished:', this.finished);

        super.update(); // Call base class update LAST
        // Optional: console.log('[ExplosionAnimation] Update END - Visible:', this.visible, 'Finished:', this.finished);
    }
}
window.ExplosionAnimation = ExplosionAnimation; // Export ExplosionAnimation

// --- GrappleAnimation Class ---
class GrappleAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: attacker, defender, duration
        const attackerPos = data.attacker && data.attacker.mapPos ? data.attacker.mapPos : { x: 0, y: 0 };
        if (!(data.attacker && data.attacker.mapPos)) {
            console.warn("[GrappleAnimation] Attacker mapPos is undefined. Defaulting to {x:0, y:0}. Attacker:", data.attacker);
        }
        super(type, { ...data, x: attackerPos.x, y: attackerPos.y }, gameStateRef);

        this.attacker = data.attacker;
        this.defender = data.defender;
        this.grappleSprites = ['⊃', '⊂', '∪', '∩']; // Symbols representing grappling/holding
        this.currentSpriteIndex = 0;
        this.frameDuration = Math.floor(this.duration / (this.grappleSprites.length * 2)); // Cycle through sprites and then hold
        this.lastFrameTime = this.startTime;
        this.color = 'grey'; // Grapple effect color
        this.visible = true;

        // Position will be between attacker and defender, or on defender
        // Safeguard mapPos access (Jules)
        const safeAttackerPos = this.attacker && this.attacker.mapPos ? this.attacker.mapPos : { x: attackerPos.x, y: attackerPos.y }; // Use initial attackerPos as fallback
        const safeDefenderPos = this.defender && this.defender.mapPos ? this.defender.mapPos : safeAttackerPos; // Default defender to attacker if missing

        if (!(this.attacker && this.attacker.mapPos)) {
            console.warn("[GrappleAnimation] Attacker mapPos undefined during position calculation. Using initial animation x,y or fallback.");
        }
        if (!(this.defender && this.defender.mapPos)) {
            console.warn("[GrappleAnimation] Defender mapPos undefined during position calculation. Defaulting to attacker's position.");
        }

        this.x = (safeAttackerPos.x + safeDefenderPos.x) / 2;
        this.y = (safeAttackerPos.y + safeDefenderPos.y) / 2;
        this.sprite = this.grappleSprites[0];
        const attackerName = this.attacker ? (this.attacker.name || this.attacker.id) : "Unknown Attacker";
        const defenderName = this.defender ? (this.defender.name || this.defender.id) : "Unknown Defender";
        console.log(`[GrappleAnimation CONSTRUCTOR] Created for ${attackerName} and ${defenderName} at (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        // const elapsedTime = now - this.startTime; // elapsedTime not used directly here after change

        // Animation logic: cycle through sprites quickly, then hold the last one
        if (this.currentSpriteIndex < this.grappleSprites.length - 1) { // Still cycling
            if (now - this.lastFrameTime >= this.frameDuration) {
                this.currentSpriteIndex++;
                this.sprite = this.grappleSprites[this.currentSpriteIndex];
                this.lastFrameTime = now;
            }
        } else { // Holding the last sprite
            this.sprite = this.grappleSprites[this.grappleSprites.length - 1];
            // Optional: could add a slight visual pulse or something here if desired
        }

        // Update position to stay between/on entities if they move (simplified)
        // Safeguard mapPos access (Jules)
        const currentAttackerPos = this.attacker && this.attacker.mapPos ? this.attacker.mapPos : { x: this.x, y: this.y }; // Fallback to current anim pos
        const currentDefenderPos = this.defender && this.defender.mapPos ? this.defender.mapPos : currentAttackerPos; // Default to attacker

        if (this.attacker && !this.attacker.mapPos) {
            // console.warn("[GrappleAnimation UPDATE] Attacker mapPos undefined."); // Potentially spammy
        }
        if (this.defender && !this.defender.mapPos) {
            // console.warn("[GrappleAnimation UPDATE] Defender mapPos undefined."); // Potentially spammy
        }

        this.x = (currentAttackerPos.x + currentDefenderPos.x) / 2;
        this.y = (currentAttackerPos.y + currentDefenderPos.y) / 2;
        this.visible = true;

        super.update(); // Handles finishing based on duration
    }
}
window.GrappleAnimation = GrappleAnimation;

// --- FlamethrowerAnimation Class ---
class FlamethrowerAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: attacker, targetPos (or direction), duration, ?particlesPerFrame
        super(type, { ...data, x: data.attacker.mapPos.x, y: data.attacker.mapPos.y }, gameStateRef);
        this.attackerPos = data.attacker.mapPos;
        this.targetPos = data.targetPos; // This should be the tile the flamethrower is aimed at
        this.flameParticles = []; // Array to hold individual flame particle objects
        this.particleSpawnRate = data.particleSpawnRate || 5; // How many particles per update call (if active)
        this.particleLifetime = data.particleLifetime || 300; // ms
        this.flameSpriteOptions = ['░', '▒', '▓', '~'];
        this.flameColorOptions = ['red', 'orange', 'yellow'];
        this.coneAngle = data.coneAngle || Math.PI / 4; // e.g., 45 degrees spread
        this.maxRange = data.maxRange || 5; // Max distance flame particles travel

        this.x = this.attackerPos.x; // Animation anchor point is the attacker
        this.y = this.attackerPos.y;
        this.sprite = ''; // Not a single sprite, but a collection of particles
        this.visible = true; // The animation effect is visible, particles manage their own visibility
        console.log(`[FlamethrowerAnimation CONSTRUCTOR] Created for ${data.attacker.name || data.attacker.id} targeting towards (${this.targetPos.x}, ${this.targetPos.y})`);
    }

    update() {
        if (this.finished) {
            this.visible = this.flameParticles.length > 0; // Animation is visible if particles are still active
            return;
        }
        const now = Date.now();

        // Spawn new particles if the animation (e.g. firing duration) is active
        if (now - this.startTime < this.duration) {
            for (let i = 0; i < this.particleSpawnRate; i++) {
                const angleOffset = (Math.random() - 0.5) * this.coneAngle;
                const baseAngle = Math.atan2(this.targetPos.y - this.attackerPos.y, this.targetPos.x - this.attackerPos.x);
                const particleAngle = baseAngle + angleOffset;

                this.flameParticles.push({
                    startX: this.attackerPos.x,
                    startY: this.attackerPos.y,
                    // Particles are spawned at the attacker's Z level.
                    z: this.attackerPos.z, // Assign Z to particles
                    x: this.attackerPos.x,
                    y: this.attackerPos.y,
                    sprite: this.flameSpriteOptions[Math.floor(Math.random() * this.flameSpriteOptions.length)],
                    color: this.flameColorOptions[Math.floor(Math.random() * this.flameColorOptions.length)],
                    spawnTime: now,
                    angle: particleAngle,
                    speed: 0.1 + Math.random() * 0.1, // Tiles per update call for particle
                    currentRange: 0
                });
            }
        }

        // Update existing particles
        for (let i = this.flameParticles.length - 1; i >= 0; i--) {
            const p = this.flameParticles[i];
            const particleElapsedTime = now - p.spawnTime;

            if (particleElapsedTime >= this.particleLifetime || p.currentRange >= this.maxRange) {
                this.flameParticles.splice(i, 1); // Remove old particles
                continue;
            }

            const moveDistance = p.speed * (1 - particleElapsedTime / this.particleLifetime); // Slow down over time
            p.x += Math.cos(p.angle) * moveDistance;
            p.y += Math.sin(p.angle) * moveDistance;
            p.currentRange += moveDistance;
        }

        // The animation itself is "finished" when its main duration is up.
        // Particles might live longer, but the spawning stops.
        // The AnimationManager will remove this FlamethrowerAnimation instance once its main duration is complete.
        // The rendering of remaining particles will be handled by the fact that this.flameParticles is still populated
        // and mapRenderer will iterate through activeAnimations and call their draw method (which we'll need to ensure mapRenderer does).
        super.update();

        if (this.finished && this.flameParticles.length === 0) {
            this.visible = false; // Only truly invisible when all particles are gone AND duration is up.
        }
    }
}
window.FlamethrowerAnimation = FlamethrowerAnimation;


// --- TaserAnimation Class ---
class TaserAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: attacker, defender (target entity), duration, isMelee
        super(type, { ...data, x: data.attacker.mapPos.x, y: data.attacker.mapPos.y }, gameStateRef);
        this.attacker = data.attacker;
        this.defender = data.defender;
        this.isMelee = data.isMelee; // To differentiate between ranged taser and contact stun gun

        this.boltSprites = ['~', '↯', '-']; // Electrical bolt/spark sprites
        this.currentSpriteIndex = 0;
        this.frameDuration = 50; // Fast flicker
        this.lastFrameTime = this.startTime;

        this.color = 'cyan';
        this.visible = true;

        if (this.isMelee) {
            // For melee, effect is on the defender
            this.x = this.defender.mapPos.x;
            this.y = this.defender.mapPos.y;
            this.sprite = this.boltSprites[0];
        } else {
            // For ranged, it's a projectile, then effect on defender
            this.startPos = data.attacker.mapPos;
            this.endPos = data.defender.mapPos;
            this.x = this.startPos.x;
            this.y = this.startPos.y;
            this.sprite = '*'; // Initial projectile sprite
        }
        console.log(`[TaserAnimation CONSTRUCTOR] Created. Melee: ${this.isMelee}`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }
        const now = Date.now();
        const elapsedTime = now - this.startTime;
        let progress = elapsedTime / this.duration;
        if (progress > 1) progress = 1;

        if (this.isMelee) {
            // Effect on defender
            this.x = this.defender.mapPos.x;
            this.y = this.defender.mapPos.y;
            this.z = this.defender.mapPos.z; // Set Z to defender's Z for melee
            if (now - this.lastFrameTime >= this.frameDuration) {
                this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.boltSprites.length;
                this.sprite = this.boltSprites[this.currentSpriteIndex];
                this.lastFrameTime = now;
            }
        } else { // Ranged Taser
            const impactTimeRatio = 0.6; // 60% of duration for travel, 40% for effect on target
            if (progress < impactTimeRatio) { // Projectile travel
                this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * (progress / impactTimeRatio);
                this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * (progress / impactTimeRatio);
                // this.z remains attacker's Z (from constructor) during travel
                this.sprite = '~'; // Traveling bolt sprite
            } else { // Effect on target
                this.x = this.endPos.x;
                this.y = this.endPos.y;
                this.z = this.endPos.z; // Switch Z to defender's Z for impact sparks
                if (now - this.lastFrameTime >= this.frameDuration) {
                    this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.boltSprites.length;
                    this.sprite = this.boltSprites[this.currentSpriteIndex];
                    this.lastFrameTime = now;
                }
            }
        }
        this.visible = true;
        super.update();
    }
}
window.TaserAnimation = TaserAnimation;

// --- LauncherProjectileAnimation Class (Jules) ---
class LauncherProjectileAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data includes: startPos, endPos, sprite (optional), color, duration
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.sprite = data.sprite || '►'; // Default rocket/launcher sprite
        this.color = data.color || 'orange';
        this.visible = true;
        console.log(`[LauncherProjectileAnimation CONSTRUCTOR] Created: from (${this.startPos.x},${this.startPos.y}) to (${this.endPos.x},${this.endPos.y}), sprite: ${this.sprite}`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;

        if (progress >= 1) {
            progress = 1;
            // Let super.update() handle finished and visible based on duration
        } else {
            this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
            this.visible = true;
        }
        // No specific console log for this one during update to reduce spam, similar to RangedBullet
        super.update();
    }
}
window.LauncherProjectileAnimation = LauncherProjectileAnimation;

// --- GasCloudAnimation Class (Jules) ---
class GasCloudAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: centerPos, maxRadius, duration (cloud persistence), 
        //       particleSprite, particleColor, expansionSpeed, particleLifetime, spawnRate, coneAngle (optional for sprays)
        super(type, { ...data, x: data.centerPos.x, y: data.centerPos.y, z: data.centerPos.z }, gameStateRef); // Pass z
        this.centerPos = data.centerPos;
        this.maxRadius = data.maxRadius || 3; // Max radius of the cloud in tiles
        this.cloudDuration = data.duration || 3000; // How long the cloud effect itself lasts (particles might fade sooner)

        this.particleSpriteOptions = data.particleSpriteOptions || ['░', '▒', '▓'];
        this.particleColor = data.particleColor || 'grey'; // Default to smoke color

        this.expansionSpeed = data.expansionSpeed || 0.05; // Tiles per update call for radius expansion
        this.particleLifetime = data.particleLifetime || 1500; // ms, how long individual particles last
        this.spawnRate = data.spawnRate || 10; // Particles spawned per update while expanding/active

        this.coneAngle = data.coneAngle; // Optional: if specified, particles spawn in a cone
        this.coneDirection = data.coneDirection; // Optional: {x, y} vector for cone direction if not just expanding radially

        this.verticalRadius = data.verticalRadius !== undefined ? data.verticalRadius : 1; // How many Z-levels it extends up/down from its center. 0 = flat. 1 = centerZ, centerZ+1, centerZ-1.
        this.particles = [];
        this.currentRadius = 0;
        this.visible = true; // Starts visible
        this.sprite = ''; // Not a single sprite animation

        // The main animation duration in the base class can be tied to cloudDuration or a separate active spawning phase.
        // Let's set the base duration to when the cloud is actively growing or spawning.
        // The cloud itself will visually persist due to particles even after base duration is met.
        this.duration = data.activeSpawningDuration || Math.min(this.cloudDuration, (this.maxRadius / this.expansionSpeed) * (1000 / 60)); // Estimate based on 60fps updates

        console.log(`[GasCloudAnimation CONSTRUCTOR] Created at (${this.centerPos.x},${this.centerPos.y}), maxRadius: ${this.maxRadius}, cloudDuration: ${this.cloudDuration}`);
    }

    update() {
        const now = Date.now();
        const elapsedTime = now - this.startTime;

        // Expand cloud radius
        if (this.currentRadius < this.maxRadius && elapsedTime < this.duration) { // Only expand during active spawning phase
            this.currentRadius += this.expansionSpeed;
            if (this.currentRadius > this.maxRadius) {
                this.currentRadius = this.maxRadius;
            }
        }

        // Spawn new particles if within active spawning duration
        if (elapsedTime < this.duration) {
            for (let i = 0; i < this.spawnRate; i++) {
                let angle;
                if (this.coneAngle && this.coneDirection) {
                    const baseAngle = Math.atan2(this.coneDirection.y - this.centerPos.y, this.coneDirection.x - this.centerPos.x);
                    angle = baseAngle + (Math.random() - 0.5) * this.coneAngle;
                } else {
                    angle = Math.random() * 2 * Math.PI; // Random angle for radial spawn
                }

                const spawnDist = Math.random() * this.currentRadius; // Spawn within the current cloud radius

                this.particles.push({
                    x: this.centerPos.x + Math.cos(angle) * spawnDist,
                    y: this.centerPos.y + Math.sin(angle) * spawnDist,
                    sprite: this.particleSpriteOptions[Math.floor(Math.random() * this.particleSpriteOptions.length)],
                    color: this.particleColor,
                    spawnTime: now,
                    initialOpacity: 1.0 // For testing visibility - ensure particles start fully opaque
                });
            }
        }

        // Update existing particles (fade them, remove old ones)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const particleAge = now - p.spawnTime;
            if (particleAge >= this.particleLifetime) {
                this.particles.splice(i, 1);
            } else {
                // Particles mostly stay in place but fade
                p.opacity = p.initialOpacity * (1 - particleAge / this.particleLifetime);
            }
        }

        // The animation is "finished" (base class) when its active spawning/expansion phase is done.
        // The visual cloud persists due to particles.
        super.update();

        // Animation becomes invisible only when base duration met AND all particles faded
        if (this.finished && this.particles.length === 0) {
            this.visible = false;
        } else {
            this.visible = true; // Keep visible if particles exist or still in main duration
        }
    }
}
window.GasCloudAnimation = GasCloudAnimation;

// --- WhipCrackAnimation Class (Jules) ---
class WhipCrackAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: attacker (entity), defender (entity), duration

        // Robustly get attacker and defender positions
        let attackerPosition, defenderPosition;

        if (data.attacker === gameStateRef) { // Check if attacker is player
            attackerPosition = gameStateRef.playerPos;
        } else if (data.attacker && data.attacker.mapPos) {
            attackerPosition = data.attacker.mapPos;
        } else {
            console.error("[WhipCrackAnimation] Attacker position is undefined!", data.attacker);
            attackerPosition = { x: 0, y: 0 }; // Fallback
        }

        if (data.defender === gameStateRef) { // Check if defender is player
            defenderPosition = gameStateRef.playerPos;
        } else if (data.defender && data.defender.mapPos) {
            defenderPosition = data.defender.mapPos;
        } else {
            console.error("[WhipCrackAnimation] Defender position is undefined!", data.defender);
            defenderPosition = attackerPosition; // Fallback to attacker's position if defender's is missing
        }

        // Pass the resolved attackerPosition.x and y to the super constructor
        super(type, { ...data, x: attackerPosition.x, y: attackerPosition.y }, gameStateRef);

        this.attackerPos = attackerPosition;
        this.defenderPos = defenderPosition;

        // Sprites: initial reach, extend, crack, retract
        this.whipSprites = ['~', '-', '¬', "'", "-"];
        this.currentSpriteIndex = 0;
        // Duration for each phase: reach, extend, crack, retract. Total duration is sum of these + hold.
        this.reachDuration = data.duration * 0.2;
        this.extendDuration = data.duration * 0.2;
        this.crackDuration = data.duration * 0.2; // The visual 'crack'
        this.retractDuration = data.duration * 0.2;
        this.holdDuration = data.duration * 0.2; // Time the crack sprite is held

        this.phase = 'reaching'; // 'reaching', 'extending', 'cracking', 'retracting', 'holding'
        this.phaseStartTime = this.startTime;

        this.x = this.attackerPos.x; // Starts at attacker
        this.y = this.attackerPos.y;
        this.sprite = this.whipSprites[0]; // Initial '~' for reaching
        this.color = data.color || 'saddlebrown';
        this.visible = true;
        console.log(`[WhipCrackAnimation CONSTRUCTOR] Created for attacker at (${this.attackerPos.x},${this.attackerPos.y}) targetting (${this.defenderPos.x},${this.defenderPos.y})`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        const timeInPhase = now - this.phaseStartTime;

        switch (this.phase) {
            case 'reaching':
                this.sprite = this.whipSprites[0]; // '~'
                // Whip tip moves towards defender
                let reachProgress = Math.min(timeInPhase / this.reachDuration, 1);
                this.x = this.attackerPos.x + (this.defenderPos.x - this.attackerPos.x) * reachProgress * 0.5; // Reaches halfway
                this.y = this.attackerPos.y + (this.defenderPos.y - this.attackerPos.y) * reachProgress * 0.5;
                if (timeInPhase >= this.reachDuration) {
                    this.phase = 'extending';
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[1]; // '-'
                }
                break;
            case 'extending':
                this.sprite = this.whipSprites[1]; // '-'
                // Whip tip extends fully to defender
                let extendProgress = Math.min(timeInPhase / this.extendDuration, 1);
                this.x = (this.attackerPos.x * 0.5 + this.defenderPos.x * 0.5) + (this.defenderPos.x - (this.attackerPos.x * 0.5 + this.defenderPos.x * 0.5)) * extendProgress;
                this.y = (this.attackerPos.y * 0.5 + this.defenderPos.y * 0.5) + (this.defenderPos.y - (this.attackerPos.y * 0.5 + this.defenderPos.y * 0.5)) * extendProgress;
                if (timeInPhase >= this.extendDuration) {
                    this.phase = 'cracking';
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[2]; // '¬'
                    this.x = this.defenderPos.x; // Snap to defender
                    this.y = this.defenderPos.y;
                }
                break;
            case 'cracking':
                this.sprite = this.whipSprites[2]; // '¬'
                this.x = this.defenderPos.x;
                this.y = this.defenderPos.y;
                if (timeInPhase >= this.crackDuration) {
                    this.phase = 'holding'; // Hold the crack sprite
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[3]; // "'"
                }
                break;
            case 'holding':
                this.sprite = this.whipSprites[3]; // "'"
                this.x = this.defenderPos.x;
                this.y = this.defenderPos.y;
                if (timeInPhase >= this.holdDuration) {
                    this.phase = 'retracting';
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[4]; // '-'
                }
                break;
            case 'retracting':
                this.sprite = this.whipSprites[4]; // '-'
                // Whip tip retracts (can simplify this, e.g., just disappear or quickly move back)
                let retractProgress = Math.min(timeInPhase / this.retractDuration, 1);
                this.x = this.defenderPos.x - (this.defenderPos.x - this.attackerPos.x) * retractProgress;
                this.y = this.defenderPos.y - (this.defenderPos.y - this.attackerPos.y) * retractProgress;
                if (timeInPhase >= this.retractDuration) {
                    // Animation will be marked finished by super.update based on overall duration
                }
                break;
        }
        this.visible = true;
        super.update(); // Handles finishing based on overall duration
    }
}
window.WhipCrackAnimation = WhipCrackAnimation;

// --- LiquidSplashAnimation Class (Jules) ---
class LiquidSplashAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: impactPos, duration, splashSprites, sizzleSprites (optional), color
        super(type, { ...data, x: data.impactPos.x, y: data.impactPos.y }, gameStateRef);
        this.impactPos = data.impactPos;

        this.splashSprites = data.splashSprites || ['*', '⁂', '∴', '.'];
        this.sizzleSprites = data.sizzleSprites || ['', '◦', '.']; // Optional, for lingering effect
        this.hasSizzleEffect = Array.isArray(data.sizzleSprites) && data.sizzleSprites.length > 0;

        this.baseColor = data.color || 'blue'; // Default to water-like blue
        this.sizzleColor = data.sizzleColor || (this.baseColor === 'limegreen' ? 'darkgreen' : 'darkgrey'); // Specific color for sizzle
        this.color = this.baseColor; // Initial color

        this.phaseDuration = this.duration / (this.hasSizzleEffect ? 2 : 1); // Duration for splash, then optionally for sizzle
        this.spriteChangeInterval = this.splashSprites.length > 0 ? this.phaseDuration / this.splashSprites.length : this.phaseDuration;
        if (this.hasSizzleEffect) {
            this.sizzleSpriteChangeInterval = this.sizzleSprites.length > 0 ? this.phaseDuration / this.sizzleSprites.length : this.phaseDuration;
        }

        this.currentSpriteIndex = 0;
        this.currentSizzleSpriteIndex = 0;
        this.phase = 'splashing'; // 'splashing', 'sizzling'
        this.lastFrameTime = this.startTime;

        this.x = this.impactPos.x;
        this.y = this.impactPos.y;
        this.sprite = this.splashSprites[0];
        this.visible = true;
        console.log(`[LiquidSplashAnimation CONSTRUCTOR] Created at (${this.x},${this.y}), color: ${this.color}`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        const elapsedTimeInPhase = now - this.lastFrameTime;

        if (this.phase === 'splashing') {
            if (elapsedTimeInPhase >= this.spriteChangeInterval) {
                this.currentSpriteIndex++;
                if (this.currentSpriteIndex < this.splashSprites.length) {
                    this.sprite = this.splashSprites[this.currentSpriteIndex];
                    this.lastFrameTime = now;
                } else {
                    // Splash phase ended
                    if (this.hasSizzleEffect) {
                        this.phase = 'sizzling';
                        this.color = this.sizzleColor; // Change color for sizzle phase
                        this.currentSizzleSpriteIndex = 0; // Use currentSizzleSpriteIndex
                        this.sprite = this.sizzleSprites[this.currentSizzleSpriteIndex] || '';
                        this.lastFrameTime = now;
                    } else {
                        this.finished = true; // No sizzle, animation ends after splash
                    }
                }
            }
        } else if (this.phase === 'sizzling') {
            if (elapsedTimeInPhase >= this.sizzleSpriteChangeInterval) {
                this.currentSizzleSpriteIndex++;
                if (this.currentSizzleSpriteIndex < this.sizzleSprites.length) {
                    this.sprite = this.sizzleSprites[this.currentSizzleSpriteIndex];
                    this.lastFrameTime = now;
                } else {
                    this.finished = true; // Sizzle phase ended
                }
            }
        }

        if (this.finished) { // Ensure visibility is turned off when truly finished
            this.visible = false;
        } else {
            this.visible = true;
        }
        // No call to super.update() here if we manage 'finished' directly based on phases.
        // Alternatively, ensure overall duration aligns with phase logic if super.update() is used for finishing.
        // For now, let's manage 'finished' state within this update.
        // If super.update() is called, it will mark finished based on this.duration,
        // so phase logic must complete within this.duration.
        // The current phaseDuration calculation should align this.
        // Let's call super.update() to ensure consistent promise resolution via AnimationManager.
        super.update();
        if (this.finished) this.visible = false; // Ensure visibility is off if super.update marked it done
    }
}
window.LiquidSplashAnimation = LiquidSplashAnimation;

// --- ChainsawAttackAnimation Class (Jules) ---
class ChainsawAttackAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: attacker, defender (target), duration
        // Animation occurs at the defender's position.
        super(type, { ...data, x: data.defender.mapPos.x, y: data.defender.mapPos.y, z: data.defender.mapPos.z }, gameStateRef); // Pass defender's z
        this.defenderPos = data.defender.mapPos;

        this.sawSprites = ['<', '>', '#']; // Jagged, chaotic sprites
        this.currentSpriteIndex = 0;
        this.frameDuration = data.frameDuration || 50; // Very fast flicker for grinding effect
        this.lastFrameTime = this.startTime;

        this.x = this.defenderPos.x;
        this.y = this.defenderPos.y;
        this.sprite = this.sawSprites[0];
        this.color = data.color || 'silver';
        this.visible = true;
        console.log(`[ChainsawAttackAnimation CONSTRUCTOR] Created at (${this.x},${this.y})`);
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        // Rapidly cycle through sprites
        if (now - this.lastFrameTime >= this.frameDuration) {
            this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.sawSprites.length;
            this.sprite = this.sawSprites[this.currentSpriteIndex];
            this.lastFrameTime = now;
        }

        // Keep position fixed on the defender (assuming defender doesn't move during this specific animation frame)
        this.x = this.defenderPos.x;
        this.y = this.defenderPos.y;
        this.visible = true;

        super.update(); // Handles finishing based on overall duration
        if (this.finished) this.visible = false;
    }
}
window.ChainsawAttackAnimation = ChainsawAttackAnimation;


window.AnimationManager = AnimationManager;
window.Animation = Animation;
window.MovementAnimation = MovementAnimation;


// --- DiceRollAnimation Class ---
class DiceRollAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: diceNotation (e.g., "1d20"), onComplete(result), position {x, y} (optional screen coords)
        // For simplicity, this animation won't render on the map grid, but in a UI overlay.
        super(type, { ...data, duration: data.duration || 1500 }, gameStateRef); // x, y, z not directly used by this one for map rendering
        this.diceNotation = data.diceNotation;
        this.onComplete = data.onComplete; // Callback to pass the result
        this.result = 0;
        this.currentDisplayValue = 0;
        this.rollEffectDuration = 800; // Time for numbers to flash
        this.holdResultDuration = this.duration - this.rollEffectDuration; // Time to show final result

        this.uiElement = document.createElement('div');
        this.uiElement.style.position = 'fixed';

        let screenPos = null;
        if (data.entity) {
            const entityPos = (data.entity === this.gameState) ? this.gameState.playerPos : data.entity.mapPos;
            if (entityPos) {
                screenPos = window.mapToScreenCoordinates(entityPos.x, entityPos.y, entityPos.z);
            }
        }

        if (screenPos) {
            this.uiElement.style.left = `${screenPos.x}px`;
            this.uiElement.style.top = `${screenPos.y - 30}px`; // Offset slightly above the entity
        } else {
            this.uiElement.style.left = data.position?.x || '50%'; // Fallback to original
            this.uiElement.style.top = data.position?.y || '30%';
        }

        this.uiElement.style.transform = 'translate(-50%, -50%)';
        this.uiElement.style.padding = '20px';
        this.uiElement.style.background = 'rgba(50, 50, 50, 0.85)';
        this.uiElement.style.border = '2px solid #ccc';
        this.uiElement.style.borderRadius = '10px';
        this.uiElement.style.color = 'white';
        this.uiElement.style.fontSize = '28px';
        this.uiElement.style.fontFamily = 'monospace';
        this.uiElement.style.zIndex = '1001'; // Above map, below other critical UI if any
        this.uiElement.textContent = `Rolling ${this.diceNotation}...`;
        document.body.appendChild(this.uiElement);
        this.visible = true; // This animation is UI based, not map based.
    }

    update() {
        if (this.finished) return;
        const elapsedTime = Date.now() - this.startTime;

        if (elapsedTime < this.rollEffectDuration) {
            // Simulate rolling numbers
            this.currentDisplayValue = Math.floor(Math.random() * 20) + 1; // Example for d20
            this.uiElement.textContent = `${this.currentDisplayValue}`;
        } else if (!this.result) { // Roll once after effect duration
            this.result = rollDiceNotation(parseDiceNotation(this.diceNotation)); // from utils.js
            this.uiElement.textContent = `Rolled: ${this.result}`;
            if (typeof this.onComplete === 'function') {
                this.onComplete(this.result);
            }
        }

        if (elapsedTime >= this.duration) {
            this.finished = true;
            this.visible = false;
            if (this.uiElement.parentNode) {
                this.uiElement.parentNode.removeChild(this.uiElement);
            }
        }
        // No call to super.update() as this is a UI animation with its own lifecycle.
        // The promise resolution is handled by AnimationManager based on this.finished.
    }
}
window.DiceRollAnimation = DiceRollAnimation;

// --- ModifierPopupAnimation Class ---
class ModifierPopupAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: text (e.g., "+2 Str"), duration, position {x,y} (screen coords), color (optional)
        super(type, { ...data, duration: data.duration || 1200 }, gameStateRef);
        this.text = data.text;

        this.uiElement = document.createElement('div');
        this.uiElement.style.position = 'fixed';

        let screenPos = null;
        if (data.entity) {
            const entityPos = (data.entity === this.gameState) ? this.gameState.playerPos : data.entity.mapPos;
            if (entityPos) {
                screenPos = window.mapToScreenCoordinates(entityPos.x, entityPos.y, entityPos.z);
            }
        }

        if (screenPos) {
            this.uiElement.style.left = `${screenPos.x}px`;
            // Position modifiers slightly differently, perhaps to the side or further above
            this.uiElement.style.top = `${screenPos.y - 60}px`;
        } else {
            this.uiElement.style.left = data.position?.x || '50%'; // Fallback
            this.uiElement.style.top = data.position?.y || '35%';
        }

        this.uiElement.style.transform = 'translate(-50%, -50%)';
        this.uiElement.style.padding = '10px 15px';
        this.uiElement.style.background = 'rgba(70, 70, 70, 0.9)';
        this.uiElement.style.border = '1px solid #aaa';
        this.uiElement.style.borderRadius = '5px';
        this.uiElement.style.color = data.color || '#00FF00'; // Green for positive mods
        this.uiElement.style.fontSize = '20px';
        this.uiElement.style.fontFamily = 'monospace';
        this.uiElement.style.zIndex = '1002';
        this.uiElement.style.opacity = '0'; // Start invisible for fade-in
        this.uiElement.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        this.uiElement.textContent = this.text;
        document.body.appendChild(this.uiElement);
        this.visible = true;

        // Trigger fade-in and slight upward movement
        setTimeout(() => {
            this.uiElement.style.opacity = '1';
            this.uiElement.style.transform = 'translate(-50%, -70%)'; // Move up
        }, 50);
    }

    update() {
        if (this.finished) return;
        const elapsedTime = Date.now() - this.startTime;

        if (elapsedTime >= this.duration) {
            this.finished = true;
            this.visible = false;
            // Start fade-out
            this.uiElement.style.opacity = '0';
            this.uiElement.style.transform = 'translate(-50%, -90%)'; // Move further up and fade
            setTimeout(() => {
                if (this.uiElement.parentNode) {
                    this.uiElement.parentNode.removeChild(this.uiElement);
                }
            }, 300); // Remove after fade-out transition
        }
    }
}
window.ModifierPopupAnimation = ModifierPopupAnimation;

// --- HitMissLabelAnimation Class ---
class HitMissLabelAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: text ("Hit!" or "Miss!"), color, duration, position {x,y}
        super(type, { ...data, duration: data.duration || 2000 }, gameStateRef);
        this.text = data.text;

        this.uiElement = document.createElement('div');
        this.uiElement.style.position = 'fixed';

        let screenPos = null;
        if (data.entity) {
            const entityPos = (data.entity === this.gameState) ? this.gameState.playerPos : data.entity.mapPos;
            if (entityPos) {
                screenPos = window.mapToScreenCoordinates(entityPos.x, entityPos.y, entityPos.z);
            }
        }

        if (screenPos) {
            this.uiElement.style.left = `${screenPos.x}px`;
            this.uiElement.style.top = `${screenPos.y}px`; // Position Hit/Miss directly on entity
        } else {
            this.uiElement.style.left = data.position?.x || '50%'; // Fallback
            this.uiElement.style.top = data.position?.y || '40%';
        }

        this.uiElement.style.transform = 'translate(-50%, -50%) scale(0.5)'; // Start small
        this.uiElement.style.padding = '15px 25px';
        this.uiElement.style.background = 'rgba(40, 40, 40, 0.9)';
        this.uiElement.style.border = '2px solid #f0f0f0';
        this.uiElement.style.borderRadius = '8px';
        this.uiElement.style.color = data.color || (this.text === "Hit!" ? 'lightgreen' : 'salmon');
        this.uiElement.style.fontSize = '32px';
        this.uiElement.style.fontWeight = 'bold';
        this.uiElement.style.fontFamily = 'monospace';
        this.uiElement.style.zIndex = '1003';
        this.uiElement.style.opacity = '0';
        this.uiElement.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        this.uiElement.textContent = this.text;
        document.body.appendChild(this.uiElement);
        this.visible = true;

        // Trigger pop-in effect
        setTimeout(() => {
            this.uiElement.style.opacity = '1';
            this.uiElement.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50);
    }

    update() {
        if (this.finished) return;
        const elapsedTime = Date.now() - this.startTime;

        if (elapsedTime >= this.duration) {
            this.finished = true;
            this.visible = false;
            this.uiElement.style.opacity = '0';
            this.uiElement.style.transform = 'translate(-50%, -50%) scale(0.5)'; // Shrink out
            setTimeout(() => {
                if (this.uiElement.parentNode) {
                    this.uiElement.parentNode.removeChild(this.uiElement);
                }
            }, 400);
        }
    }
}
window.HitMissLabelAnimation = HitMissLabelAnimation;

// --- FallAnimation Class ---
class FallAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        // data: entity, startZ, endZ, fallPathX, fallPathY, levelsFallen, durationPerLevel
        // The total duration will be levelsFallen * durationPerLevel.
        const totalDuration = data.levelsFallen * (data.durationPerLevel || 200);
        super(type, { ...data, duration: totalDuration }, gameStateRef);

        this.entity = data.entity; // Player (gameState) or NPC object
        this.startZ = data.startZ;
        this.endZ = data.endZ;
        this.fallPathX = data.fallPathX;
        this.fallPathY = data.fallPathY;
        this.levelsFallen = data.levelsFallen;
        this.durationPerLevel = data.durationPerLevel || 200;

        // The animation doesn't have its own sprite/color in the traditional sense.
        // It controls the perceived Z position of an existing entity for rendering.
        this.sprite = ''; // Not used directly for rendering this animation type
        this.color = '';  // Not used directly

        // Store original entity Z to restore if needed, though handleFalling will set final Z.
        this.originalEntityZ = (this.entity === this.gameState) ? this.gameState.playerPos.z : this.entity.mapPos.z;

        // The animation's own x, y, z will be the entity's path, but Z will interpolate.
        this.x = this.fallPathX;
        this.y = this.fallPathY;
        this.z = this.startZ; // Initial Z for the animation itself (interpolated value)
        this.visible = true; // The effect (entity appearing to fall) is visible.

        logToConsole(`[FallAnimation CONSTRUCTOR] Entity: ${this.entity.id || 'Player'}, StartZ: ${this.startZ}, EndZ: ${this.endZ}, Levels: ${this.levelsFallen}, Duration: ${this.duration}ms`);
    }

    update() {
        if (this.finished) {
            // Restore entity's actual Z if it was temporarily changed for rendering,
            // though handleFalling will set the final position.
            // For now, mapRenderer will read from entity.displayZ if this animation sets it.
            if (this.entity.displayZ !== undefined) delete this.entity.displayZ;
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;
        if (progress > 1) progress = 1;

        // Interpolate the Z position for display
        const currentDisplayZ = this.startZ - (this.levelsFallen * progress);
        this.z = currentDisplayZ; // Update the animation's own z property

        // We need a way for mapRenderer to know to render this entity at this specific Z.
        // Option 1: Modify entity's actual z (gameState.playerPos.z or npc.mapPos.z)
        //           This is problematic as game logic might depend on the true Z.
        // Option 2: Add a temporary displayZ property to the entity.
        this.entity.displayZ = Math.round(currentDisplayZ); // mapRenderer will check for this.
        // Rounding because Z levels are discrete.

        // If the entity is the player and view follows player, update currentViewZ
        if (this.entity === this.gameState && this.gameState.viewFollowsPlayerZ) {
            this.gameState.currentViewZ = this.entity.displayZ;
            // FOW update might be too frequent here, consider updating FOW once at the end of fall.
        }

        // Call super.update() to handle finishing based on duration
        super.update();

        if (this.finished) {
            if (this.entity.displayZ !== undefined) delete this.entity.displayZ;
            this.visible = false;
            logToConsole(`[FallAnimation FINISHED] Entity: ${this.entity.id || 'Player'} at Z: ${this.endZ}`);
        } else {
            logToConsole(`[FallAnimation UPDATE] Entity: ${this.entity.id || 'Player'}, DisplayZ: ${this.entity.displayZ.toFixed(2)}, Progress: ${progress.toFixed(2)}`);
        }
    }
}
window.FallAnimation = FallAnimation;
