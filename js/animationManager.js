// js/animationManager.js

const DEBUG_ANIMATION = false; // Toggle for verbose logging

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
        if (!data) data = {}; // Safety check for null/undefined data

        const attackerName = data.attacker ? (data.attacker === this.gameState ? "Player" : (data.attacker.name || data.attacker.id)) : (data.entity === this.gameState ? "Player" : (data.entity ? (data.entity.name || data.entity.id) : "N/A"));

        if (DEBUG_ANIMATION) {
            console.log(`[AnimationManager] playAnimation ENTERED. Type: ${animationType}, Attacker/Entity: ${attackerName}`);
        }

        let animationInstance;

        try {
            switch (animationType) {
                case 'movement':
                    animationInstance = new MovementAnimation(animationType, data, this.gameState);
                    break;
                case 'meleeSwing':
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
                case 'grapple':
                    animationInstance = new GrappleAnimation(animationType, data, this.gameState);
                    break;
                case 'flamethrower':
                    animationInstance = new FlamethrowerAnimation(animationType, data, this.gameState);
                    break;
                case 'taser':
                    animationInstance = new TaserAnimation(animationType, data, this.gameState);
                    break;
                case 'launcherProjectile':
                    animationInstance = new LauncherProjectileAnimation(animationType, data, this.gameState);
                    break;
                case 'gasCloud':
                    animationInstance = new GasCloudAnimation(animationType, data, this.gameState);
                    break;
                case 'whipCrack':
                    animationInstance = new WhipCrackAnimation(animationType, data, this.gameState);
                    break;
                case 'liquidSplash':
                    animationInstance = new LiquidSplashAnimation(animationType, data, this.gameState);
                    break;
                case 'bloodSplash':
                    animationInstance = new BloodSplashAnimation(animationType, data, this.gameState);
                    break;
                case 'chainsawAttack':
                    animationInstance = new ChainsawAttackAnimation(animationType, data, this.gameState);
                    break;
                case 'diceRoll':
                    animationInstance = new DiceRollAnimation(animationType, data, this.gameState);
                    break;
                case 'modifierPopup':
                    animationInstance = new ModifierPopupAnimation(animationType, data, this.gameState);
                    break;
                case 'hitMissLabel':
                    animationInstance = new HitMissLabelAnimation(animationType, data, this.gameState);
                    break;
                case 'jump':
                    animationInstance = new JumpAnimation(animationType, data, this.gameState);
                    break;
                case 'fall':
                    animationInstance = new FallAnimation(animationType, data, this.gameState);
                    break;
                default:
                    console.warn(`AnimationManager: Unknown animation type: ${animationType}. Using generic Animation.`);
                    animationInstance = new Animation(animationType, data, this.gameState);
                    break;
            }

            this.gameState.activeAnimations.push(animationInstance);
            this.gameState.isAnimationPlaying = true; // Set flag when an animation starts

            // Ensure a render is scheduled immediately when an animation starts
            if (window.mapRenderer) {
                window.mapRenderer.scheduleRender();
            }

            return animationInstance.promise;

        } catch (e) {
            console.error(`[AnimationManager] Failed to create animation ${animationType}:`, e);
            return Promise.resolve(); // Return resolved promise to avoid hanging awaiters
        }
    }

    addJumpAnimation(entity, targetPos, duration = 300) {
        return this.playAnimation('jump', {
            entity: entity,
            startPos: { ...entity.mapPos }, // Copy start pos
            targetPos: targetPos,
            duration: duration,
            sprite: entity.sprite,
            color: entity.color
        });
    }

    isAnimationPlaying() {
        return this.gameState.isAnimationPlaying === true;
    }

    updateAnimations() {
        if (!this.gameState.activeAnimations || this.gameState.activeAnimations.length === 0) {
            if (this.gameState.isAnimationPlaying) {
                this.gameState.isAnimationPlaying = false;
            }
            return;
        }

        if (!this.gameState.isAnimationPlaying) {
            this.gameState.isAnimationPlaying = true;
        }

        for (let i = this.gameState.activeAnimations.length - 1; i >= 0; i--) {
            const animation = this.gameState.activeAnimations[i];

            try {
                if (DEBUG_ANIMATION) {
                    console.log('[AnimationManager] Updating animation:', animation.type);
                }
                animation.update();
            } catch (e) {
                console.error(`[AnimationManager] Error updating animation ${animation.type}:`, e);
                animation.finished = true; // Force finish on error to prevent stuck animations
            }

            if (animation.isFinished()) {
                if (DEBUG_ANIMATION) {
                    console.log('[AnimationManager] Animation FINISHED:', animation.type);
                }
                animation.resolvePromise();
                this.gameState.activeAnimations.splice(i, 1);
            }
        }

        if (this.gameState.activeAnimations.length === 0 && this.gameState.isAnimationPlaying) {
            this.gameState.isAnimationPlaying = false;
        }
    }
}

class Animation {
    constructor(type, data, gameStateRef) {
        this.type = type;
        this.data = data || {};
        this.gameState = gameStateRef;
        this.startTime = Date.now();
        this.duration = this.data.duration || 1000; // Default duration
        this.finished = false;

        this.x = this.data.x !== undefined ? this.data.x : (this.data.startPos ? this.data.startPos.x : 0);
        this.y = this.data.y !== undefined ? this.data.y : (this.data.startPos ? this.data.startPos.y : 0);

        // Determine Z coordinate
        if (this.data.z !== undefined) {
            this.z = this.data.z;
        } else if (this.data.startPos && this.data.startPos.z !== undefined) {
            this.z = this.data.startPos.z;
        } else if (this.data.entity && this.data.entity.mapPos && this.data.entity.mapPos.z !== undefined) {
            this.z = this.data.entity.mapPos.z;
        } else if (this.data.attacker && this.data.attacker.mapPos && this.data.attacker.mapPos.z !== undefined) {
            this.z = this.data.attacker.mapPos.z;
        } else if (this.gameState && this.gameState.playerPos && this.gameState.playerPos.z !== undefined && (this.data.entity === this.gameState || this.data.attacker === this.gameState)) {
            // If entity/attacker is player, use player's Z
            this.z = this.gameState.playerPos.z;
        } else {
            this.z = 0; // Default Z if not specified
        }

        this.sprite = this.data.sprite || '';
        this.color = this.data.color || 'white';
        this.visible = this.data.visible !== undefined ? this.data.visible : true;

        this.promise = new Promise((resolve) => {
            this.resolvePromise = resolve;
        });

        if (DEBUG_ANIMATION) {
            console.log(`[Animation] CREATED: ${this.type}`);
        }
    }

    update() {
        const timeNow = Date.now();
        if (timeNow - this.startTime >= this.duration) {
            this.finished = true;
            this.visible = false;
        }
    }

    isFinished() {
        return this.finished;
    }

    _positionPopup(element, targetX, targetY, preferredOffsetY) {
        // ... (existing helper logic)
        let x = targetX;
        let y = targetY - preferredOffsetY;

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;

        if (!element.parentNode) document.body.appendChild(element);

        const rect = element.getBoundingClientRect();
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const margin = 10;
        const tileHeight = 20;

        // Clamp to screen
        if (x - rect.width / 2 < margin) x = margin + rect.width / 2;
        else if (x + rect.width / 2 > winWidth - margin) x = winWidth - margin - rect.width / 2;

        if (y - rect.height / 2 < margin) y = margin + rect.height / 2;
        else if (y + rect.height / 2 > winHeight - margin) y = winHeight - margin - rect.height / 2;

        const entityTop = targetY - tileHeight;
        const entityBottom = targetY + tileHeight;
        const popupTop = y - rect.height / 2;
        const popupBottom = y + rect.height / 2;

        if (popupBottom > entityTop && popupTop < entityBottom) {
            let newX = targetX + tileHeight + rect.width / 2 + 5;
            if (newX + rect.width / 2 > winWidth - margin) {
                newX = targetX - tileHeight - rect.width / 2 - 5;
            }
            x = newX;
            if (x - rect.width / 2 < margin) x = margin + rect.width / 2;
            else if (x + rect.width / 2 > winWidth - margin) x = winWidth - margin - rect.width / 2;
        }

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }
}

class MovementAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
    }

    update() {
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
        this.visible = true;

        if (DEBUG_ANIMATION) {
             console.log(`[MovementAnimation] Progress: ${progress.toFixed(2)}`);
        }

        super.update();
    }
}

class MeleeSwingAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, data, gameStateRef);
        this.swingSprites = ['/', '-', '\\', '|'];
        this.currentSpriteIndex = 0;
        this.frameDuration = Math.max(1, Math.floor(this.duration / this.swingSprites.length)); // Ensure non-zero
        this.lastFrameTime = this.startTime;

        this.x = data.x;
        this.y = data.y;
        this.sprite = this.swingSprites[0];
        this.color = 'white';
        this.visible = true;
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        if (now - this.lastFrameTime >= this.frameDuration) {
            this.currentSpriteIndex++;
            if (this.currentSpriteIndex < this.swingSprites.length) {
                this.sprite = this.swingSprites[this.currentSpriteIndex];
                this.lastFrameTime = now;
            }
        }
        this.visible = true;

        super.update();
    }
}

class RangedBulletAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.sprite = data.projectileSprite || data.sprite || '*';
        this.color = data.color || 'yellow';
        this.visible = true;
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
            this.x = this.endPos.x;
            this.y = this.endPos.y;
        } else {
            this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
        }
        this.visible = true;

        super.update();
    }
}

class ThrowingAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.sprite = data.sprite || 'o';
        this.color = data.color || 'grey';
        this.visible = true;
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
            this.x = this.endPos.x;
            this.y = this.endPos.y;
        } else {
            this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
        }
        this.visible = true;

        super.update();
    }
}

window.MeleeSwingAnimation = MeleeSwingAnimation;
window.RangedBulletAnimation = RangedBulletAnimation;
window.ThrowingAnimation = ThrowingAnimation;

class ExplosionAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.centerPos.x, y: data.centerPos.y, z: data.centerPos.z }, gameStateRef);
        this.centerPos = data.centerPos;
        this.maxRadius = data.radius;
        this.explosionSprites = data.explosionSprites || ['·', 'o', 'O', '*', 'X'];
        this.color = data.color || 'orange';

        this.currentFrameIndex = 0;
        this.currentExpansionRadius = 0;
        this.visible = true;
        this.sprite = this.explosionSprites[0];
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;
        if (progress > 1) progress = 1;

        this.currentFrameIndex = Math.floor(progress * this.explosionSprites.length);
        if (this.currentFrameIndex >= this.explosionSprites.length) {
            this.currentFrameIndex = this.explosionSprites.length - 1;
        }

        if (progress < 0.75) {
            const expansionProgress = progress / 0.75;
            this.currentExpansionRadius = Math.ceil(expansionProgress * this.maxRadius);
        } else {
            const contractionProgress = (progress - 0.75) / 0.25;
            this.currentExpansionRadius = Math.ceil((1 - contractionProgress) * this.maxRadius);
        }
        this.currentExpansionRadius = Math.max(0, this.currentExpansionRadius);
        this.visible = true;

        super.update();
    }
}
window.ExplosionAnimation = ExplosionAnimation;

class GrappleAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        const attackerPos = data.attacker && data.attacker.mapPos ? data.attacker.mapPos : { x: 0, y: 0 };
        super(type, { ...data, x: attackerPos.x, y: attackerPos.y }, gameStateRef);

        this.attacker = data.attacker;
        this.defender = data.defender;
        this.grappleSprites = ['⊃', '⊂', '∪', '∩'];
        this.currentSpriteIndex = 0;
        this.frameDuration = Math.floor(this.duration / (this.grappleSprites.length * 2));
        this.lastFrameTime = this.startTime;
        this.color = 'grey';
        this.visible = true;

        const safeAttackerPos = this.attacker && this.attacker.mapPos ? this.attacker.mapPos : { x: attackerPos.x, y: attackerPos.y };
        const safeDefenderPos = this.defender && this.defender.mapPos ? this.defender.mapPos : safeAttackerPos;

        this.x = (safeAttackerPos.x + safeDefenderPos.x) / 2;
        this.y = (safeAttackerPos.y + safeDefenderPos.y) / 2;
        this.sprite = this.grappleSprites[0];
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();

        if (this.currentSpriteIndex < this.grappleSprites.length - 1) {
            if (now - this.lastFrameTime >= this.frameDuration) {
                this.currentSpriteIndex++;
                this.sprite = this.grappleSprites[this.currentSpriteIndex];
                this.lastFrameTime = now;
            }
        } else {
            this.sprite = this.grappleSprites[this.grappleSprites.length - 1];
        }

        const currentAttackerPos = this.attacker && this.attacker.mapPos ? this.attacker.mapPos : { x: this.x, y: this.y };
        const currentDefenderPos = this.defender && this.defender.mapPos ? this.defender.mapPos : currentAttackerPos;

        this.x = (currentAttackerPos.x + currentDefenderPos.x) / 2;
        this.y = (currentAttackerPos.y + currentDefenderPos.y) / 2;
        this.visible = true;

        super.update();
    }
}
window.GrappleAnimation = GrappleAnimation;

class FlamethrowerAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        const startX = data.attacker && data.attacker.mapPos ? data.attacker.mapPos.x : 0;
        const startY = data.attacker && data.attacker.mapPos ? data.attacker.mapPos.y : 0;

        super(type, { ...data, x: startX, y: startY }, gameStateRef);

        this.attackerPos = data.attacker && data.attacker.mapPos ? data.attacker.mapPos : {x:0, y:0, z:0};
        this.targetPos = data.targetPos || {x:0, y:0};
        this.flameParticles = [];
        this.particleSpawnRate = data.particleSpawnRate || 5;
        this.particleLifetime = data.particleLifetime || 300;
        this.flameSpriteOptions = ['░', '▒', '▓', '~'];
        this.flameColorOptions = ['red', 'orange', 'yellow'];
        this.coneAngle = data.coneAngle || Math.PI / 4;
        this.maxRange = data.maxRange || 5;

        this.x = this.attackerPos.x;
        this.y = this.attackerPos.y;
        this.sprite = '';
        this.visible = true;
        this.lastUpdateTime = this.startTime;
    }

    update() {
        const now = Date.now();
        const dt = now - this.lastUpdateTime; // Delta time in ms
        this.lastUpdateTime = now;

        super.update(); // Marks finished based on duration

        // Override finished if particles remain
        if (this.flameParticles.length > 0) {
            this.finished = false;
            this.visible = true;
        } else if (this.finished) {
            this.visible = false;
            return;
        }

        // Spawn new particles if original duration is active
        if (now - this.startTime < this.duration) {
            for (let i = 0; i < this.particleSpawnRate; i++) {
                const angleOffset = (Math.random() - 0.5) * this.coneAngle;
                const baseAngle = Math.atan2(this.targetPos.y - this.attackerPos.y, this.targetPos.x - this.attackerPos.x);
                const particleAngle = baseAngle + angleOffset;

                // Speed: tiles per ms
                // Original: 0.1 to 0.2 tiles per update call
                // Assuming ~16ms per update, that's ~0.006 to 0.012 tiles/ms
                const speedPerMs = (0.1 + Math.random() * 0.1) / 16.0;

                this.flameParticles.push({
                    startX: this.attackerPos.x,
                    startY: this.attackerPos.y,
                    z: this.attackerPos.z,
                    x: this.attackerPos.x,
                    y: this.attackerPos.y,
                    sprite: this.flameSpriteOptions[Math.floor(Math.random() * this.flameSpriteOptions.length)],
                    color: this.flameColorOptions[Math.floor(Math.random() * this.flameColorOptions.length)],
                    spawnTime: now,
                    angle: particleAngle,
                    speed: speedPerMs,
                    currentRange: 0
                });
            }
        }

        // Update existing particles
        for (let i = this.flameParticles.length - 1; i >= 0; i--) {
            const p = this.flameParticles[i];
            const particleElapsedTime = now - p.spawnTime;

            if (particleElapsedTime >= this.particleLifetime || p.currentRange >= this.maxRange) {
                this.flameParticles.splice(i, 1);
                continue;
            }

            const moveDist = p.speed * dt * (1 - particleElapsedTime / this.particleLifetime);
            p.x += Math.cos(p.angle) * moveDist;
            p.y += Math.sin(p.angle) * moveDist;
            p.currentRange += moveDist;
        }
    }
}
window.FlamethrowerAnimation = FlamethrowerAnimation;

class TaserAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.attacker.mapPos.x, y: data.attacker.mapPos.y }, gameStateRef);
        this.attacker = data.attacker;
        this.defender = data.defender;
        this.isMelee = data.isMelee;

        this.boltSprites = ['~', '↯', '-'];
        this.currentSpriteIndex = 0;
        this.frameDuration = 50;
        this.lastFrameTime = this.startTime;

        this.color = 'cyan';
        this.visible = true;

        if (this.isMelee) {
            this.x = this.defender.mapPos.x;
            this.y = this.defender.mapPos.y;
            this.sprite = this.boltSprites[0];
        } else {
            this.startPos = data.attacker.mapPos;
            this.endPos = data.defender.mapPos;
            this.x = this.startPos.x;
            this.y = this.startPos.y;
            this.sprite = '*';
        }
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
            this.x = this.defender.mapPos.x;
            this.y = this.defender.mapPos.y;
            this.z = this.defender.mapPos.z;
            if (now - this.lastFrameTime >= this.frameDuration) {
                this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.boltSprites.length;
                this.sprite = this.boltSprites[this.currentSpriteIndex];
                this.lastFrameTime = now;
            }
        } else {
            const impactTimeRatio = 0.6;
            if (progress < impactTimeRatio) {
                this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * (progress / impactTimeRatio);
                this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * (progress / impactTimeRatio);
                this.sprite = '~';
            } else {
                this.x = this.endPos.x;
                this.y = this.endPos.y;
                this.z = this.endPos.z;
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

class LauncherProjectileAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y }, gameStateRef);
        this.startPos = data.startPos;
        this.endPos = data.endPos;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.sprite = data.sprite || '►';
        this.color = data.color || 'orange';
        this.visible = true;
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
            this.x = this.endPos.x;
            this.y = this.endPos.y;
        } else {
            this.x = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            this.y = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
        }
        this.visible = true;

        super.update();
    }
}
window.LauncherProjectileAnimation = LauncherProjectileAnimation;

class GasCloudAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.centerPos.x, y: data.centerPos.y, z: data.centerPos.z }, gameStateRef);
        this.centerPos = data.centerPos;
        this.maxRadius = data.maxRadius || 3;
        this.cloudDuration = data.duration || 3000;

        this.particleSpriteOptions = data.particleSpriteOptions || ['░', '▒', '▓'];
        this.particleColor = data.particleColor || 'grey';

        this.expansionSpeed = data.expansionSpeed || 0.05;
        this.particleLifetime = data.particleLifetime || 1500;
        this.spawnRate = data.spawnRate || 10;

        this.coneAngle = data.coneAngle;
        this.coneDirection = data.coneDirection;

        this.verticalRadius = data.verticalRadius !== undefined ? data.verticalRadius : 1;
        this.particles = [];
        this.currentRadius = 0;
        this.visible = true;
        this.sprite = '';

        // Active spawning duration
        this.duration = data.activeSpawningDuration || Math.min(this.cloudDuration, (this.maxRadius / this.expansionSpeed) * (1000 / 60));
    }

    update() {
        const now = Date.now();
        const elapsedTime = now - this.startTime;

        super.update(); // Sets finished based on active spawning duration

        // Keep alive if particles exist
        if (this.particles.length > 0) {
            this.finished = false;
            this.visible = true;
        } else if (this.finished) {
            this.visible = false;
            return;
        }

        if (this.currentRadius < this.maxRadius && elapsedTime < this.duration) {
            this.currentRadius += this.expansionSpeed;
            if (this.currentRadius > this.maxRadius) {
                this.currentRadius = this.maxRadius;
            }
        }

        if (elapsedTime < this.duration) {
            for (let i = 0; i < this.spawnRate; i++) {
                let angle;
                if (this.coneAngle && this.coneDirection) {
                    const baseAngle = Math.atan2(this.coneDirection.y - this.centerPos.y, this.coneDirection.x - this.centerPos.x);
                    angle = baseAngle + (Math.random() - 0.5) * this.coneAngle;
                } else {
                    angle = Math.random() * 2 * Math.PI;
                }

                const spawnDist = Math.random() * this.currentRadius;

                this.particles.push({
                    x: this.centerPos.x + Math.cos(angle) * spawnDist,
                    y: this.centerPos.y + Math.sin(angle) * spawnDist,
                    sprite: this.particleSpriteOptions[Math.floor(Math.random() * this.particleSpriteOptions.length)],
                    color: this.particleColor,
                    spawnTime: now,
                    initialOpacity: 1.0
                });
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const particleAge = now - p.spawnTime;
            if (particleAge >= this.particleLifetime) {
                this.particles.splice(i, 1);
            } else {
                p.opacity = p.initialOpacity * (1 - particleAge / this.particleLifetime);
            }
        }
    }
}
window.GasCloudAnimation = GasCloudAnimation;

class WhipCrackAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        let attackerPosition, defenderPosition;

        if (data.attacker === gameStateRef) {
            attackerPosition = gameStateRef.playerPos;
        } else if (data.attacker && data.attacker.mapPos) {
            attackerPosition = data.attacker.mapPos;
        } else {
            console.warn("[WhipCrackAnimation] Attacker position is undefined!", data.attacker);
            attackerPosition = { x: 0, y: 0 };
        }

        if (data.defender === gameStateRef) {
            defenderPosition = gameStateRef.playerPos;
        } else if (data.defender && data.defender.mapPos) {
            defenderPosition = data.defender.mapPos;
        } else {
            // console.warn("[WhipCrackAnimation] Defender position is undefined!", data.defender);
            defenderPosition = attackerPosition;
        }

        super(type, { ...data, x: attackerPosition.x, y: attackerPosition.y }, gameStateRef);

        this.attackerPos = attackerPosition;
        this.defenderPos = defenderPosition;

        this.whipSprites = ['~', '-', '¬', "'", "-"];
        this.currentSpriteIndex = 0;

        // Corrected: use this.duration
        this.reachDuration = this.duration * 0.2;
        this.extendDuration = this.duration * 0.2;
        this.crackDuration = this.duration * 0.2;
        this.retractDuration = this.duration * 0.2;
        this.holdDuration = this.duration * 0.2;

        this.phase = 'reaching';
        this.phaseStartTime = this.startTime;

        this.x = this.attackerPos.x;
        this.y = this.attackerPos.y;
        this.sprite = this.whipSprites[0];
        this.color = data.color || 'saddlebrown';
        this.visible = true;
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
                this.sprite = this.whipSprites[0];
                let reachProgress = Math.min(timeInPhase / this.reachDuration, 1);
                this.x = this.attackerPos.x + (this.defenderPos.x - this.attackerPos.x) * reachProgress * 0.5;
                this.y = this.attackerPos.y + (this.defenderPos.y - this.attackerPos.y) * reachProgress * 0.5;
                if (timeInPhase >= this.reachDuration) {
                    this.phase = 'extending';
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[1];
                }
                break;
            case 'extending':
                this.sprite = this.whipSprites[1];
                let extendProgress = Math.min(timeInPhase / this.extendDuration, 1);
                this.x = (this.attackerPos.x * 0.5 + this.defenderPos.x * 0.5) + (this.defenderPos.x - (this.attackerPos.x * 0.5 + this.defenderPos.x * 0.5)) * extendProgress;
                this.y = (this.attackerPos.y * 0.5 + this.defenderPos.y * 0.5) + (this.defenderPos.y - (this.attackerPos.y * 0.5 + this.defenderPos.y * 0.5)) * extendProgress;
                if (timeInPhase >= this.extendDuration) {
                    this.phase = 'cracking';
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[2];
                    this.x = this.defenderPos.x;
                    this.y = this.defenderPos.y;
                }
                break;
            case 'cracking':
                this.sprite = this.whipSprites[2];
                this.x = this.defenderPos.x;
                this.y = this.defenderPos.y;
                if (timeInPhase >= this.crackDuration) {
                    this.phase = 'holding';
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[3];
                }
                break;
            case 'holding':
                this.sprite = this.whipSprites[3];
                this.x = this.defenderPos.x;
                this.y = this.defenderPos.y;
                if (timeInPhase >= this.holdDuration) {
                    this.phase = 'retracting';
                    this.phaseStartTime = now;
                    this.sprite = this.whipSprites[4];
                }
                break;
            case 'retracting':
                this.sprite = this.whipSprites[4];
                let retractProgress = Math.min(timeInPhase / this.retractDuration, 1);
                this.x = this.defenderPos.x - (this.defenderPos.x - this.attackerPos.x) * retractProgress;
                this.y = this.defenderPos.y - (this.defenderPos.y - this.attackerPos.y) * retractProgress;
                break;
        }
        this.visible = true;
        super.update();
    }
}
window.WhipCrackAnimation = WhipCrackAnimation;

class LiquidSplashAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.impactPos.x, y: data.impactPos.y }, gameStateRef);
        this.impactPos = data.impactPos;

        this.splashSprites = data.splashSprites || ['*', '⁂', '∴', '.'];
        this.sizzleSprites = data.sizzleSprites || ['', '◦', '.'];

        // Corrected check: if caller didn't pass sizzleSprites but wants effect, they might just rely on defaults if they didn't pass "hasSizzle" flag.
        // Assuming existence of sizzleSprites array (which now defaults) implies effect IF intended.
        // But critique says: "If the caller doesn’t pass sizzleSprites, you still get default sizzle sprites, but hasSizzleEffect will be false"
        // Implicit behavior: if defaults are used, maybe we should assume sizzle if data.sizzleSprites was NOT explicitly null?
        // Or better, check if we should have sizzle. Usually 'acid' type triggers this.
        // For now, let's assume if defaults are used, we enable it if the passed data.sizzleSprites was undefined (meaning user didn't disable it).
        // Actually, let's just use the length of the final array.
        this.hasSizzleEffect = this.sizzleSprites.length > 0 && (data.hasSizzleEffect !== false);

        this.baseColor = data.color || 'blue';
        this.sizzleColor = data.sizzleColor || (this.baseColor === 'limegreen' ? 'darkgreen' : 'darkgrey');
        this.color = this.baseColor;

        this.phaseDuration = this.duration / (this.hasSizzleEffect ? 2 : 1);
        this.spriteChangeInterval = this.splashSprites.length > 0 ? this.phaseDuration / this.splashSprites.length : this.phaseDuration;
        if (this.hasSizzleEffect) {
            this.sizzleSpriteChangeInterval = this.sizzleSprites.length > 0 ? this.phaseDuration / this.sizzleSprites.length : this.phaseDuration;
        }

        this.currentSpriteIndex = 0;
        this.currentSizzleSpriteIndex = 0;
        this.phase = 'splashing';
        this.lastFrameTime = this.startTime;

        this.x = this.impactPos.x;
        this.y = this.impactPos.y;
        this.sprite = this.splashSprites[0];
        this.visible = true;
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
                    if (this.hasSizzleEffect) {
                        this.phase = 'sizzling';
                        this.color = this.sizzleColor;
                        this.currentSizzleSpriteIndex = 0;
                        this.sprite = this.sizzleSprites[this.currentSizzleSpriteIndex] || '';
                        this.lastFrameTime = now;
                    } else {
                        this.finished = true;
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
                    this.finished = true;
                }
            }
        }

        if (this.finished) {
            this.visible = false;
        } else {
            this.visible = true;
        }

        super.update();
        if (this.finished) this.visible = false;
    }
}
window.LiquidSplashAnimation = LiquidSplashAnimation;

class ChainsawAttackAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.defender.mapPos.x, y: data.defender.mapPos.y, z: data.defender.mapPos.z }, gameStateRef);
        this.defenderPos = data.defender.mapPos;

        this.sawSprites = ['<', '>', '#'];
        this.currentSpriteIndex = 0;
        this.frameDuration = data.frameDuration || 50;
        this.lastFrameTime = this.startTime;

        this.x = this.defenderPos.x;
        this.y = this.defenderPos.y;
        this.sprite = this.sawSprites[0];
        this.color = data.color || 'silver';
        this.visible = true;
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        if (now - this.lastFrameTime >= this.frameDuration) {
            this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.sawSprites.length;
            this.sprite = this.sawSprites[this.currentSpriteIndex];
            this.lastFrameTime = now;
        }

        this.x = this.defenderPos.x;
        this.y = this.defenderPos.y;
        this.visible = true;

        super.update();
        if (this.finished) this.visible = false;
    }
}
window.ChainsawAttackAnimation = ChainsawAttackAnimation;

class BloodSplashAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        let targetPos = data.targetPos;
        if (!targetPos && data.entity) {
            if (data.entity === gameStateRef || data.entity === gameStateRef.player) {
                targetPos = gameStateRef.playerPos;
            } else {
                targetPos = data.entity.mapPos;
            }
        }

        super(type, { ...data, x: targetPos ? targetPos.x : 0, y: targetPos ? targetPos.y : 0, z: targetPos ? targetPos.z : 0 }, gameStateRef);
        this.targetPos = targetPos;
        this.particles = [];
        this.particleCount = 5;
        this.duration = data.duration || 1000;

        this.sprites = ['*', '.', ',', '`'];
        this.colors = ['red', 'darkred', 'maroon'];
        this.lastUpdateTime = this.startTime;

        if (this.targetPos) {
            for (let i = 0; i < this.particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                // Speed: tiles per ms approx.
                // Original: 0.05 to 0.15 tiles per update.
                const speedPerMs = (0.05 + Math.random() * 0.1) / 16.0;

                this.particles.push({
                    x: this.targetPos.x,
                    y: this.targetPos.y,
                    z: this.targetPos.z,
                    vx: Math.cos(angle) * speedPerMs,
                    vy: Math.sin(angle) * speedPerMs,
                    sprite: this.sprites[Math.floor(Math.random() * this.sprites.length)],
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    opacity: 1.0
                });
            }
        }

        this.visible = true;
        this.sprite = '*';
    }

    update() {
        if (this.finished) {
            this.visible = false;
            return;
        }

        const now = Date.now();
        const dt = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        const progress = (now - this.startTime) / this.duration;

        if (progress >= 1) {
            this.finished = true;
            this.visible = false;
            return;
        }

        this.particles.forEach(p => {
            if (p.vx !== 0 || p.vy !== 0) {
                const nextX = p.x + p.vx * dt;
                const nextY = p.y + p.vy * dt;

                let collision = false;
                if (window.mapRenderer && typeof window.mapRenderer.getCollisionTileAt === 'function') {
                    const tileId = window.mapRenderer.getCollisionTileAt(Math.floor(nextX), Math.floor(nextY), p.z);
                    if (tileId !== "") {
                        collision = true;
                    }
                }

                if (collision) {
                    p.vx = 0;
                    p.vy = 0;
                } else {
                    p.x = nextX;
                    p.y = nextY;
                }
            }
            p.opacity = Math.max(0, 1.0 - progress);
        });
    }
}
window.BloodSplashAnimation = BloodSplashAnimation;


window.AnimationManager = AnimationManager;
window.Animation = Animation;
window.MovementAnimation = MovementAnimation;

class JumpAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, x: data.startPos.x, y: data.startPos.y, z: data.startPos.z }, gameStateRef);
        this.startPos = data.startPos;
        this.targetPos = data.targetPos;
        this.entity = data.entity;

        this.midX = (this.startPos.x + this.targetPos.x) / 2;
        this.midY = (this.startPos.y + this.targetPos.y) / 2;
        this.peakHeight = Math.max(this.startPos.z, this.targetPos.z) + 1.5;

        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.z = this.startPos.z;
        this.visible = true;

        this.originalDisplayZ = this.entity.displayZ;
    }

    update() {
        if (this.finished) {
            if (this.entity.displayZ !== undefined) delete this.entity.displayZ;
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;
        if (progress > 1) progress = 1;

        this.x = this.startPos.x + (this.targetPos.x - this.startPos.x) * progress;
        this.y = this.startPos.y + (this.targetPos.y - this.startPos.y) * progress;

        const linearZ = this.startPos.z + (this.targetPos.z - this.startPos.z) * progress;
        const linearMidZ = (this.startPos.z + this.targetPos.z) / 2;
        const arcAmplitude = 4 * (Math.max(0, this.peakHeight - linearMidZ));
        const arcOffset = arcAmplitude * progress * (1 - progress);

        const currentZ = linearZ + arcOffset;

        this.z = currentZ;
        this.entity.displayZ = Math.round(currentZ);

        super.update();

        if (this.finished) {
            if (this.entity.displayZ !== undefined) delete this.entity.displayZ;
            this.visible = false;
        }
    }
}
window.JumpAnimation = JumpAnimation;

class DiceRollAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, duration: data.duration || 1500 }, gameStateRef);
        this.diceNotation = data.diceNotation;
        this.onComplete = data.onComplete;
        this.result = 0;
        this.currentDisplayValue = 0;
        this.rollEffectDuration = 800;
        this.holdResultDuration = this.duration - this.rollEffectDuration;

        this.uiElement = document.createElement('div');
        this.uiElement.className = 'combat-popup dice-roll-popup';

        this.rollingEntityName = data.rollingEntityName || "";
        this.modifiers = data.modifiers || [];
        this.fixedNaturalRoll = data.fixedNaturalRoll;
        this.fixedResult = data.fixedResult;

        this.baseRollValue = this.fixedNaturalRoll !== undefined ? this.fixedNaturalRoll : 0;
        this.currentTotalValue = this.fixedNaturalRoll !== undefined ? this.fixedNaturalRoll : 0;
        this.modifierAnimationStep = -1;
        this.modifierDisplayDuration = 400;
        this.totalModifierDuration = this.modifiers.length * this.modifierDisplayDuration;

        this.rollEffectDuration = (this.fixedNaturalRoll !== undefined) ? 0 : Math.min(600, this.duration - this.totalModifierDuration - 150);
        this.holdResultDuration = this.duration - this.rollEffectDuration - this.totalModifierDuration;

        this.uiElement.innerHTML = `
            <div style="font-size: 0.9em; color: #bbb; margin-bottom: 3px;">${this.rollingEntityName}</div>
            <div class="dice-value" style="font-size: 1.3em; font-weight: bold; margin-bottom: 3px;">Rolling ${this.diceNotation}...</div>
            <div class="modifiers-applied" style="font-size: 0.8em; min-height: 15px; margin-top: 3px; line-height: 1.2;"></div>
            <div class="running-total" style="font-size: 1em; margin-top: 3px; font-weight: bold;"></div>
        `;
        this.diceValueElement = this.uiElement.querySelector('.dice-value');
        this.modifiersAppliedElement = this.uiElement.querySelector('.modifiers-applied');
        this.runningTotalElement = this.uiElement.querySelector('.running-total');

        let screenPos = null;
        if (data.entity) {
            const entityPos = (data.entity === this.gameState) ? this.gameState.playerPos : data.entity.mapPos;
            if (entityPos) {
                screenPos = window.mapToScreenCoordinates ? window.mapToScreenCoordinates(entityPos.x, entityPos.y, entityPos.z) : null;
            }
        }

        if (screenPos) {
            this._positionPopup(this.uiElement, screenPos.x, screenPos.y, 80);
        } else {
            this.uiElement.style.left = data.position?.x || '50%';
            this.uiElement.style.top = data.position?.y || '30%';
            document.body.appendChild(this.uiElement);
        }

        this.visible = true;
    }

    update() {
        if (this.finished) return;
        const elapsedTime = Date.now() - this.startTime;

        if (this.modifierAnimationStep === -1) {
            if (this.fixedNaturalRoll !== undefined) {
                this.baseRollValue = this.fixedNaturalRoll;
                this.currentTotalValue = this.baseRollValue;
                this.diceValueElement.textContent = `Natural: ${this.baseRollValue}`;
                this.runningTotalElement.textContent = `Total: ${this.currentTotalValue}`;
                this.modifierAnimationStep = 0;
                this.lastModifierTime = elapsedTime;
                if (this.modifiers.length === 0) {
                    if (this.fixedResult !== undefined) this.runningTotalElement.textContent = `Result: ${this.fixedResult}`;
                    if (typeof this.onComplete === 'function') this.onComplete(this.fixedResult !== undefined ? this.fixedResult : this.baseRollValue);
                }
            } else if (elapsedTime < this.rollEffectDuration) {
                this.currentDisplayValue = Math.floor(Math.random() * 20) + 1;
                this.diceValueElement.textContent = `${this.currentDisplayValue}`;
            } else {
                this.baseRollValue = window.rollDiceNotation ? window.rollDiceNotation(window.parseDiceNotation(this.diceNotation)) : 10;
                this.currentTotalValue = this.baseRollValue;
                this.diceValueElement.textContent = `Natural: ${this.baseRollValue}`;
                this.runningTotalElement.textContent = `Total: ${this.currentTotalValue}`;
                this.modifierAnimationStep = 0;
                this.lastModifierTime = elapsedTime;
                if (typeof this.onComplete === 'function' && this.modifiers.length === 0) {
                    this.onComplete(this.baseRollValue);
                }
            }
        } else if (this.modifierAnimationStep < this.modifiers.length) {
            const timeSinceLastModifier = elapsedTime - this.lastModifierTime;
            if (timeSinceLastModifier >= this.modifierDisplayDuration) {
                const modifier = this.modifiers[this.modifierAnimationStep];
                this.currentTotalValue += modifier.value;

                this.modifiersAppliedElement.innerHTML += `<span style="color: ${modifier.type === 'positive' ? 'lightgreen' : 'salmon'}; margin-right: 5px;">${modifier.text}</span>`;
                this.runningTotalElement.textContent = `Total: ${this.currentTotalValue}`;

                this.runningTotalElement.style.transition = 'none';
                this.runningTotalElement.style.color = modifier.type === 'positive' ? 'lightgreen' : 'salmon';
                this.runningTotalElement.style.transform = modifier.type === 'positive' ? 'translateY(-3px)' : 'translateY(3px)';

                setTimeout(() => {
                    this.runningTotalElement.style.transition = 'transform 0.2s ease-out, color 0.2s ease-out';
                    this.runningTotalElement.style.color = 'white';
                    this.runningTotalElement.style.transform = 'translateY(0px)';
                }, 50);

                this.modifierAnimationStep++;
                this.lastModifierTime = elapsedTime;

                if (this.modifierAnimationStep === this.modifiers.length) {
                    if (this.fixedResult !== undefined) {
                        this.runningTotalElement.textContent = `Result: ${this.fixedResult}`;
                        if (typeof this.onComplete === 'function') this.onComplete(this.fixedResult);
                    } else {
                        if (typeof this.onComplete === 'function') this.onComplete(this.currentTotalValue);
                    }
                }
            }
        }

        if (elapsedTime >= this.duration) {
            this.finished = true;
            this.visible = false;
            if (this.fixedResult !== undefined && this.modifierAnimationStep <= this.modifiers.length) {
                this.runningTotalElement.textContent = `Result: ${this.fixedResult}`;
            }
            if (this.uiElement.parentNode) {
                this.uiElement.parentNode.removeChild(this.uiElement);
            }
        }
    }
}
window.DiceRollAnimation = DiceRollAnimation;

class ModifierPopupAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, duration: data.duration || 1200 }, gameStateRef);
        this.text = data.text;

        this.uiElement = document.createElement('div');
        this.uiElement.className = 'combat-popup modifier-popup';

        let screenPos = null;
        if (data.entity) {
            const entityPos = (data.entity === this.gameState) ? this.gameState.playerPos : data.entity.mapPos;
            if (entityPos) {
                screenPos = window.mapToScreenCoordinates ? window.mapToScreenCoordinates(entityPos.x, entityPos.y, entityPos.z) : null;
            }
        }

        if (data.color) this.uiElement.style.color = data.color;
        this.uiElement.textContent = this.text;

        if (screenPos) {
            this._positionPopup(this.uiElement, screenPos.x, screenPos.y, 60);
        } else {
            this.uiElement.style.left = data.position?.x || '50%';
            this.uiElement.style.top = data.position?.y || '35%';
            document.body.appendChild(this.uiElement);
        }

        this.uiElement.style.opacity = '0';
        this.uiElement.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        this.visible = true;

        setTimeout(() => {
            this.uiElement.style.opacity = '1';
            this.uiElement.style.transform = 'translate(-50%, -70%)';
        }, 50);
    }

    update() {
        if (this.finished) return;
        const elapsedTime = Date.now() - this.startTime;

        if (elapsedTime >= this.duration) {
            this.finished = true;
            this.visible = false;
            this.uiElement.style.opacity = '0';
            this.uiElement.style.transform = 'translate(-50%, -90%)';
            setTimeout(() => {
                if (this.uiElement.parentNode) {
                    this.uiElement.parentNode.removeChild(this.uiElement);
                }
            }, 300);
        }
    }
}
window.ModifierPopupAnimation = ModifierPopupAnimation;

class HitMissLabelAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        super(type, { ...data, duration: data.duration || 2000 }, gameStateRef);
        this.text = data.text;

        this.uiElement = document.createElement('div');
        this.uiElement.className = 'combat-popup hit-miss-popup';

        let screenPos = null;
        if (data.entity) {
            const entityPos = (data.entity === this.gameState) ? this.gameState.playerPos : data.entity.mapPos;
            if (entityPos) {
                screenPos = window.mapToScreenCoordinates ? window.mapToScreenCoordinates(entityPos.x, entityPos.y, entityPos.z) : null;
            }
        }

        this.uiElement.style.transform = 'translate(-50%, -50%) scale(0.5)';
        if (data.color) {
            this.uiElement.style.color = data.color;
        } else {
            this.uiElement.style.color = (this.text === "Hit!" ? 'lightgreen' : 'salmon');
        }
        this.uiElement.textContent = this.text;

        if (screenPos) {
            this._positionPopup(this.uiElement, screenPos.x, screenPos.y, 40);
        } else {
            this.uiElement.style.left = data.position?.x || '50%';
            this.uiElement.style.top = data.position?.y || '40%';
            document.body.appendChild(this.uiElement);
        }

        this.uiElement.style.opacity = '0';
        this.uiElement.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        this.visible = true;

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
            this.uiElement.style.transform = 'translate(-50%, -50%) scale(0.5)';
            setTimeout(() => {
                if (this.uiElement.parentNode) {
                    this.uiElement.parentNode.removeChild(this.uiElement);
                }
            }, 400);
        }
    }
}
window.HitMissLabelAnimation = HitMissLabelAnimation;

class FallAnimation extends Animation {
    constructor(type, data, gameStateRef) {
        const totalDuration = data.levelsFallen * (data.durationPerLevel || 200);
        super(type, { ...data, duration: totalDuration }, gameStateRef);

        this.entity = data.entity;
        this.startZ = data.startZ;
        this.endZ = data.endZ;
        this.fallPathX = data.fallPathX;
        this.fallPathY = data.fallPathY;
        this.levelsFallen = data.levelsFallen;
        this.durationPerLevel = data.durationPerLevel || 200;

        this.sprite = '';
        this.color = '';

        this.originalEntityZ = (this.entity === this.gameState || this.entity === this.gameState.player) ? this.gameState.playerPos.z : (this.entity.mapPos ? this.entity.mapPos.z : 0);

        this.x = this.fallPathX;
        this.y = this.fallPathY;
        this.z = this.startZ;
        this.visible = true;

        if (DEBUG_ANIMATION) {
            console.log(`[FallAnimation] StartZ: ${this.startZ}, EndZ: ${this.endZ}`);
        }
    }

    update() {
        if (this.finished) {
            if (this.entity.displayZ !== undefined) delete this.entity.displayZ;
            this.visible = false;
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        let progress = elapsedTime / this.duration;
        if (progress > 1) progress = 1;

        const currentDisplayZ = this.startZ - (this.levelsFallen * progress);
        this.z = currentDisplayZ;

        this.entity.displayZ = Math.round(currentDisplayZ);

        if (this.entity === this.gameState && this.gameState.viewFollowsPlayerZ) {
            this.gameState.currentViewZ = this.entity.displayZ;
        }

        super.update();

        if (this.finished) {
            if (this.entity.displayZ !== undefined) delete this.entity.displayZ;
            this.visible = false;
        }
    }
}
window.FallAnimation = FallAnimation;
