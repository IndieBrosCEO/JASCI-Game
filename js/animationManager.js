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
            default:
                console.warn(`AnimationManager: Unknown animation type: ${animationType}. Using generic Animation.`);
                animationInstance = new Animation(animationType, data, this.gameState);
                break;
        }

        this.gameState.activeAnimations.push(animationInstance);
        console.log('[AnimationManager] playAnimation PUSHED:', animationType, 'New active count:', this.gameState.activeAnimations.length);
        this.gameState.isAnimationPlaying = true; // Set flag when an animation starts
        console.log('[AnimationManager] playAnimation END: isAnimationPlaying SET TO TRUE. Flag:', this.gameState.isAnimationPlaying);
        return animationInstance.promise;
    }

    isAnimationPlaying() {
        return this.gameState.isAnimationPlaying === true;
    }

    updateAnimations() {
        console.log('[AnimationManager] updateAnimations CALLED. Active:', this.gameState.activeAnimations.length, 'isAnimationPlaying Flag:', this.gameState.isAnimationPlaying);
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
        this.sprite = data.sprite || '';
        this.color = data.color || 'white';
        this.visible = data.visible !== undefined ? data.visible : true;

        this.promise = new Promise((resolve) => {
            this.resolvePromise = resolve;
        });

        // ADD THIS LOG:
        const entityNameForLog = data.entity ? (data.entity === this.gameState ? "Player" : (data.entity.name || data.entity.id)) : (data.attacker ? (data.attacker === this.gameState ? "Player" : (data.attacker.name || data.attacker.id)) : "N/A");
        console.log(`[Animation CONSTRUCTOR] New Animation: Type=${this.type}, Visible=${this.visible}, X=${this.x}, Y=${this.y}, Duration=${this.duration}, Entity/Attacker=${entityNameForLog}`);

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
        this.sprite = data.sprite || '*'; // Default bullet sprite
        this.color = data.color || 'yellow'; // Default bullet color
        this.visible = true;
        // console.log(`RangedBulletAnimation created: from (${this.startPos.x},${this.startPos.y}) to (${this.endPos.x},${this.endPos.y}), sprite: ${this.sprite}`);
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
        super(type, { ...data, x: data.centerPos.x, y: data.centerPos.y }, gameStateRef); // Base class x,y is center
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


window.AnimationManager = AnimationManager;
window.Animation = Animation;
window.MovementAnimation = MovementAnimation;
