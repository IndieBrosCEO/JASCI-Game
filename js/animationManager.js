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
        // console.log(`AnimationManager: playAnimation requested for type '${animationType}'`);
        let animationInstance;

        switch (animationType) {
            case 'movement':
                animationInstance = new MovementAnimation(animationType, data, this.gameState);
                break;
            case 'meleeSwing': // NEW CASE
                animationInstance = new MeleeSwingAnimation(animationType, data, this.gameState);
                break;
            default:
                console.warn(`AnimationManager: Unknown animation type: ${animationType}. Using generic Animation.`);
                animationInstance = new Animation(animationType, data, this.gameState);
                break;
        }

        this.gameState.activeAnimations.push(animationInstance);
        this.gameState.isAnimationPlaying = true; // Set flag when an animation starts
        // console.log(`AnimationManager: Started ${animationType}. Active animations: ${this.gameState.activeAnimations.length}. isAnimationPlaying: ${this.gameState.isAnimationPlaying}`);
        return animationInstance.promise;
    }

    isAnimationPlaying() {
        return this.gameState.isAnimationPlaying === true;
    }

    updateAnimations() {
        if (!this.gameState.activeAnimations || this.gameState.activeAnimations.length === 0) {
            if (this.gameState.isAnimationPlaying) {
                this.gameState.isAnimationPlaying = false;
                // console.log("AnimationManager: No active animations, isAnimationPlaying set to false.");
            }
            return;
        }

        if (!this.gameState.isAnimationPlaying) {
             this.gameState.isAnimationPlaying = true;
            // console.log("AnimationManager: Active animations present, ensuring isAnimationPlaying is true.");
        }

        for (let i = this.gameState.activeAnimations.length - 1; i >= 0; i--) {
            const animation = this.gameState.activeAnimations[i];
            animation.update();

            if (animation.isFinished()) {
                animation.resolvePromise();
                this.gameState.activeAnimations.splice(i, 1);
                // console.log(`AnimationManager: Animation ${animation.type} finished and removed. Remaining: ${this.gameState.activeAnimations.length}`);
            }
        }

        if (this.gameState.activeAnimations.length === 0 && this.gameState.isAnimationPlaying) {
            this.gameState.isAnimationPlaying = false;
            // console.log("AnimationManager: All animations done, isAnimationPlaying set to false.");
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
        // console.log(`Animation base created: ${this.type}, duration: ${this.duration}, pos: (${this.x},${this.y}), sprite: ${this.sprite}`);
    }

    update() {
        if (Date.now() - this.startTime >= this.duration) {
            this.finished = true;
            this.visible = false;
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
        const elapsedTime = Date.now() - this.startTime;
        const progress = Math.min(elapsedTime / this.duration, 1);

        if (progress < 0.5) {
            this.x = this.startPos.x;
            this.y = this.startPos.y;
            this.visible = true;
        } else if (progress < 1) {
            this.x = this.endPos.x;
            this.y = this.endPos.y;
            this.visible = true;
        } else {
            this.visible = false;
        }

        super.update();

        if (this.finished) {
            // console.log(`MovementAnimation ${this.sprite} finished. Visibility: ${this.visible}`);
        }
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
        const now = Date.now();
        if (now - this.lastFrameTime >= this.frameDuration) {
            this.currentSpriteIndex++;
            if (this.currentSpriteIndex < this.swingSprites.length) {
                this.sprite = this.swingSprites[this.currentSpriteIndex];
                this.lastFrameTime = now;
            } else {
                // End of sprite sequence, but wait for full duration via super.update()
            }
        }

        super.update(); // Handles overall duration and sets this.finished / this.visible = false

        if (this.finished) {
            // console.log("MeleeSwingAnimation finished.");
        }
    }
}

// Make sure MeleeSwingAnimation is available
window.MeleeSwingAnimation = MeleeSwingAnimation;

window.AnimationManager = AnimationManager;
window.Animation = Animation;
window.MovementAnimation = MovementAnimation;
