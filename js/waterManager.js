
class WaterManager {
    constructor() {
        this.waterCells = {}; // key: "x,y,z", value: { depth: number, type: 'water' }
        this.deepWaterThreshold = 7; // Depth at which swimming/breath logic applies
        this.maxDepth = 10;
    }

    init(gameState) {
        if (!gameState.waterCells) {
            gameState.waterCells = {};
        }
        this.waterCells = gameState.waterCells;
    }

    getWaterAt(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.waterCells[key];
    }

    addWater(x, y, z, amount) {
        const key = `${x},${y},${z}`;
        if (!this.waterCells[key]) {
            this.waterCells[key] = { depth: 0, type: 'water' };
        }
        this.waterCells[key].depth = Math.min(this.maxDepth, this.waterCells[key].depth + amount);
        if (window.mapRenderer) window.mapRenderer.scheduleRender();
    }

    removeWater(x, y, z, amount) {
        const key = `${x},${y},${z}`;
        if (this.waterCells[key]) {
            this.waterCells[key].depth = Math.max(0, this.waterCells[key].depth - amount);
            if (this.waterCells[key].depth <= 0) {
                delete this.waterCells[key];
            }
            if (window.mapRenderer) window.mapRenderer.scheduleRender();
        }
    }

    setWaterLevel(x, y, z, depth) {
        if (depth <= 0) {
            this.removeWater(x, y, z, 999);
        } else {
            const key = `${x},${y},${z}`;
            this.waterCells[key] = { depth: Math.min(this.maxDepth, depth), type: 'water' };
            if (window.mapRenderer) window.mapRenderer.scheduleRender();
        }
    }

    isWaterDeep(x, y, z) {
        const water = this.getWaterAt(x, y, z);
        return water && water.depth >= this.deepWaterThreshold;
    }

    // Extinguish fire at location if water is present
    extinguishFire(x, y, z) {
        if (this.getWaterAt(x, y, z)) {
            if (window.gameState.activeFires) {
                const initialCount = window.gameState.activeFires.length;
                window.gameState.activeFires = window.gameState.activeFires.filter(f => !(f.x === x && f.y === y && f.z === z));
                if (window.gameState.activeFires.length < initialCount) {
                    if (window.logToConsole) window.logToConsole(`Fire at ${x},${y},${z} extinguished by water.`, 'blue');
                }
            }
        }
    }

    processTurn() {
        // Basic flow or interaction logic can go here
        // For now, ensure fires are extinguished in water
        if (window.gameState.activeFires) {
            // Iterate backwards to allow removal
            for (let i = window.gameState.activeFires.length - 1; i >= 0; i--) {
                const fire = window.gameState.activeFires[i];
                if (this.getWaterAt(fire.x, fire.y, fire.z)) {
                    window.gameState.activeFires.splice(i, 1);
                    if (window.logToConsole) window.logToConsole(`Fire at ${fire.x},${fire.y},${fire.z} extinguished by water.`, 'blue');
                }
            }
        }

        // Process Player Breath
        if (window.gameState && window.gameState.player) {
            this.processEntityBreath(window.gameState.player);
        }
        // Process NPC Breath
        if (window.gameState && window.gameState.npcs) {
            window.gameState.npcs.forEach(npc => {
                this.processEntityBreath(npc);
            });
        }
    }

    processEntityBreath(entity) {
        if (!entity || !entity.mapPos) return;
        // Determine position (support falling entity displayZ if needed, but usually mapPos is logic source)
        const x = entity.mapPos.x;
        const y = entity.mapPos.y;
        const z = entity.mapPos.z;

        const water = this.getWaterAt(x, y, z);
        const isUnderwater = water && water.depth >= this.deepWaterThreshold;

        // Check for aquatic trait
        // Player is not aquatic by default. NPCs might have 'aquatic' in tags or stats.
        // Assuming tags array or type check.
        let isAquatic = false;
        if (entity.tags && entity.tags.includes('aquatic')) isAquatic = true;
        if (entity.species === 'fish') isAquatic = true; // Hardcoded check for fish.json logic

        // Initialize breath for NPCs if missing
        if (entity.breath === undefined && !isAquatic) {
            entity.breath = 10; // Default NPC breath
            entity.maxBreath = 10;
        }

        if (isAquatic) {
            // Aquatic logic: breathe in water, suffocate in air
            if (!isUnderwater) {
                // Suffocating
                if (window.logToConsole && entity === window.gameState.player) window.logToConsole("You are suffocating in the air!", "red");
                if (window.combatManager) {
                    window.combatManager.applyDamage(null, entity, "torso", 2, "suffocation");
                }
            }
        } else {
            // Normal logic: breathe in air, drown in water
            if (isUnderwater) {
                if (entity.breath > 0) {
                    entity.breath--;
                    if (entity === window.gameState.player && window.logToConsole) window.logToConsole("Holding breath...", "cyan");
                } else {
                    if (entity === window.gameState.player && window.logToConsole) window.logToConsole("You are drowning!", "red");
                    if (window.combatManager) {
                        window.combatManager.applyDamage(null, entity, "torso", 5, "drowning");
                    }
                }
            } else {
                // Recover breath
                if (entity.breath < entity.maxBreath) {
                    entity.breath = Math.min(entity.maxBreath, entity.breath + 5);
                }
            }
        }
    }
}

window.WaterManager = WaterManager;
