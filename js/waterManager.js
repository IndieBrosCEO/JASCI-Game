
class WaterManager {
    constructor() {
        this.waterCells = {}; // key: "x,y,z", value: { depth: number, type: 'water' }
        // "Two units of shallow water combine they become deep water"
        // Shallow = 1 unit. Deep = 2 units.
        this.deepWaterThreshold = 2;
        this.maxDepth = 2; // Deep water takes up the whole cell (block). No need for >2 currently.
    }

    init(gameState) {
        if (!gameState.waterCells) {
            gameState.waterCells = {};
        }
        this.waterCells = gameState.waterCells;
    }

    getWaterAt(x, y, z) {
        const key = `${x},${y},${z}`;
        if (this.waterCells[key]) {
            return this.waterCells[key];
        }

        // Check for static water tiles if no dynamic water exists
        if (window.mapRenderer) {
            const mapData = window.mapRenderer.getCurrentMapData();
            if (mapData && mapData.levels && mapData.levels[z]) {
                let bottomTile = mapData.levels[z].bottom?.[y]?.[x];
                if (bottomTile && typeof bottomTile === 'object') bottomTile = bottomTile.tileId;

                if (bottomTile === 'WS') {
                    // "Shallow water takes up the bottom layer" -> 1 unit
                    return { depth: 1, type: 'water', isStatic: true };
                } else if (bottomTile === 'WD') {
                    // "Deep water takes up the whole cell" -> 2 units (Full Block)
                    return { depth: 2, type: 'water', isStatic: true };
                }
            }
        }
        return undefined;
    }

    addWater(x, y, z, amount) {
        const key = `${x},${y},${z}`;
        if (!this.waterCells[key]) {
            if (amount <= 0) return;
            this.waterCells[key] = { depth: 0, type: 'water' };
        }
        this.waterCells[key].depth += amount;

        // Clamp logic
        if (this.waterCells[key].depth > this.maxDepth) this.waterCells[key].depth = this.maxDepth;

        if (this.waterCells[key].depth <= 0) {
            delete this.waterCells[key];
        }
        if (window.mapRenderer) window.mapRenderer.scheduleRender();
    }

    removeWater(x, y, z, amount) {
        this.addWater(x, y, z, -amount);
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
        const water = this.getWaterAt(x, y, z);
        if (water && water.depth > 0) {
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
        // Extinguish fires
        if (window.gameState.activeFires) {
            for (let i = window.gameState.activeFires.length - 1; i >= 0; i--) {
                const fire = window.gameState.activeFires[i];
                const water = this.getWaterAt(fire.x, fire.y, fire.z);
                if (water && water.depth > 0) {
                    window.gameState.activeFires.splice(i, 1);
                    if (window.logToConsole) window.logToConsole(`Fire at ${fire.x},${fire.y},${fire.z} extinguished by water.`, 'blue');
                }
            }
        }

        // Volumetric Flow & Absorption
        this.processFlow();

        // Process Breath
        if (window.gameState && window.gameState.player) {
            this.processEntityBreath(window.gameState.player);
        }
        if (window.gameState && window.gameState.npcs) {
            window.gameState.npcs.forEach(npc => {
                this.processEntityBreath(npc);
            });
        }
    }

    processFlow() {
        if (!window.mapRenderer) return;
        const waterKeys = Object.keys(this.waterCells);
        const diffs = [];

        waterKeys.forEach(key => {
            const [x, y, z] = key.split(',').map(Number);
            const water = this.waterCells[key];
            if (!water || water.depth <= 0) return;

            // 1. Absorption Check
            const mapData = window.mapRenderer.getCurrentMapData();
            if (mapData && mapData.levels && mapData.levels[z]) {
                const levelData = mapData.levels[z];

                // Bottom Layer (Current Z)
                let bottomTile = levelData.bottom?.[y]?.[x];
                if (bottomTile && typeof bottomTile === 'object') bottomTile = bottomTile.tileId;

                let absorbed = false;
                if (bottomTile === 'GR' || bottomTile === 'TSL') {
                    window.mapRenderer.updateTileOnLayer(x, y, z, 'bottom', 'MF');
                    absorbed = true;
                }

                // Middle Layer (Z-1 Support) - water seeps down?
                if (mapData.levels[z-1]) {
                    let belowMiddle = mapData.levels[z-1].middle?.[y]?.[x];
                    if (belowMiddle && typeof belowMiddle === 'object') belowMiddle = belowMiddle.tileId;
                    if (belowMiddle === 'DI') {
                        window.mapRenderer.updateTileOnLayer(x, y, z-1, 'middle', 'MU');
                        absorbed = true;
                    }
                }

                if (absorbed) {
                    diffs.push({x, y, z, change: -1});
                    if (water.depth <= 0.5) return; // Stop if absorbed significantly
                }
            }

            // 2. Gravity (Flow Down)
            const floorAtZ = this._hasFloor(x, y, z);
            if (!floorAtZ) {
                // Falls to Z-1
                diffs.push({x, y, z, change: -1});
                diffs.push({x, y, z: z-1, change: 1});
                return;
            }

            // 3. Spread (Flow Sideways)
            // Logic: High pressure (Depth 2) wants to flow to Low pressure (Depth < 1)
            // "When two units of shallow water combine they become deep water."
            // Reverse: Deep water (2) can flow into empty (0) -> both become (1)?
            // Or Deep water overflows?
            // User did not specify flow physics, only combination.
            // Assuming standard dispersion:
            // If I have 2 (Deep), and neighbor has 0.
            // I should give 1 to neighbor. Result: 1, 1.
            // If I have 1 (Shallow), and neighbor has 1.
            // I cannot flow there (pressure equal).
            // If I have 1, neighbor 0.
            // Should I flow? Water spreads. Yes. Result: 0.5, 0.5?
            // Since we stick to integers mainly for "Deep/Shallow" states, let's allow fractions but visualize/clamp.
            // Wait, previous code used integer steps (+1).
            // If I use steps of 1:
            // 2 (Deep) -> 0 => 1 (Shallow), 1 (Shallow). Correct.
            // 1 (Shallow) -> 0 => ?
            // If 1 moves to 0, old becomes 0, new becomes 1. That's movement, not spread.
            // Spread implies volume conservation but area increase.
            // If we have infinite source? No, we have finite units.
            // Let's stick to: Only Deep Water (>= 2) spreads to neighbors with < 1.
            // This conserves the "Shallow" puddles unless they merge.

            if (water.depth >= 2) {
                const neighbors = [
                    {dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}
                ];

                // Find valid targets (neighbors with depth < 1)
                let validTargets = [];
                for (const n of neighbors) {
                    const nx = x + n.dx;
                    const ny = y + n.dy;

                    if (this._isBlocked(x, y, z, nx, ny, z)) continue;

                    const neighborWater = this.getWaterAt(nx, ny, z);
                    const nDepth = neighborWater ? neighborWater.depth : 0;

                    if (nDepth < 1) {
                        validTargets.push({x: nx, y: ny});
                    }
                }

                if (validTargets.length > 0) {
                    // Spread to ONE neighbor per turn to avoid instant flattening?
                    // Or split?
                    // Let's move 1 unit to the first valid target.
                    // 2 -> 1, Neighbor 0 -> 1.
                    const target = validTargets[0];
                    diffs.push({x, y, z, change: -1});
                    diffs.push({x: target.x, y: target.y, z, change: 1});
                }
            }
        });

        // Apply diffs
        diffs.forEach(d => {
            this.addWater(d.x, d.y, d.z, d.change);
        });
    }

    _hasFloor(x, y, z) {
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData || !mapData.levels || !mapData.levels[z]) return false;

        // 1. Check Bottom Layer at Z
        let bot = mapData.levels[z].bottom?.[y]?.[x];
        if (bot && typeof bot === 'object') bot = bot.tileId;

        // If bottom is strictly a hole, no floor.
        if (bot === 'HOLE') return false;

        // If bottom exists (and not hole), it's a floor.
        if (bot) return true;

        // 2. Check Middle Layer at Z-1 (Standing on Top)
        // Consistent with "Standing Logic"
        if (mapData.levels[z-1]) {
            let midBelow = mapData.levels[z-1].middle?.[y]?.[x];
            if (midBelow && typeof midBelow === 'object') midBelow = midBelow.tileId;

            if (midBelow && window.assetManager && window.assetManager.tilesets[midBelow]) {
                const def = window.assetManager.tilesets[midBelow];
                if (def.tags && def.tags.includes('solid_terrain_top')) {
                    return true;
                }
            }
        }

        return false;
    }

    _isBlocked(x1, y1, z1, x2, y2, z2) {
        const tileId = window.mapRenderer.getCollisionTileAt(x2, y2, z2);
        if (tileId === "") return false; // Not blocked

        // Check if the blocking tile is permeable
        if (window.assetManager && window.assetManager.tilesets[tileId]) {
            const def = window.assetManager.tilesets[tileId];
            if (def.tags && def.tags.includes("permeable")) {
                return false; // Permeable objects don't block water flow
            }
        }
        return true; // Blocked
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

        // Ensure maxBreath is set if missing
        if (entity.maxBreath === undefined) {
            entity.maxBreath = 20; // Default max breath
            if (entity.breath === undefined) entity.breath = entity.maxBreath;
        }

        if (isAquatic) {
            // Aquatic logic: breathe in water, suffocate in air
            if (!isUnderwater) {
                if (entity.breath > 0) {
                    entity.breath--;
                    if (entity === window.gameState.player && window.logToConsole) window.logToConsole("Gasping for water...", "orange");
                } else {
                    // Suffocating
                    if (window.logToConsole && entity === window.gameState.player) window.logToConsole("You are suffocating in the air!", "red");
                    if (window.combatManager) {
                        window.combatManager.applyDamage(null, entity, "torso", 2, "suffocation");
                    }
                }
            } else {
                // Recover breath in water
                if (entity.breath < entity.maxBreath) {
                    entity.breath = Math.min(entity.maxBreath, entity.breath + 5);
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
                // Recover breath in air
                if (entity.breath < entity.maxBreath) {
                    entity.breath = Math.min(entity.maxBreath, entity.breath + 5);
                }
            }
        }
    }
}

window.WaterManager = WaterManager;
