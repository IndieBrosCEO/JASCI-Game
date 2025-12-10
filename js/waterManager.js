
class WaterManager {
    constructor() {
        this.waterCells = {}; // key: "x,y,z", value: { depth: number, type: 'water' }
        this.deepWaterThreshold = 2;
        this.maxDepth = 2;
    }

    init(gameState) {
        if (!gameState.waterCells) {
            gameState.waterCells = {};
        }
        this.waterCells = gameState.waterCells;
        if (!gameState.mapsBootstrapped) {
            gameState.mapsBootstrapped = {};
        }
    }

    // Spec 3: Only look at dynamic water data. No static fallback.
    getWaterAt(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.waterCells[key]; // Returns undefined or water object
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

    // Spec 12: Underwater means depth >= 2
    isWaterDeep(x, y, z) {
        const water = this.getWaterAt(x, y, z);
        return water && water.depth >= this.deepWaterThreshold;
    }

    // Spec 5: Turn Order: Fire -> Flow -> Breath
    processTurn() {
        // 1. Extinguish Fires
        this.processFireExtinguishing();

        // 2. Process Flow
        this.processFlow();

        // 3. Process Breath
        if (window.gameState && window.gameState.player) {
            this.processEntityBreath(window.gameState.player);
        }
        if (window.gameState && window.gameState.npcs) {
            window.gameState.npcs.forEach(npc => {
                this.processEntityBreath(npc);
            });
        }
    }

    processFireExtinguishing() {
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
    }

    // Spec 6: Flow Rules
    processFlow() {
        if (!window.mapRenderer) return; // Need map data for terrain checks

        // Snapshot current water cells to avoid processing moved water multiple times in same turn?
        // Or iterate keys. Iterating keys is safer against infinite loops but water moving *into* a processed cell might be skipped or double processed.
        // Spec: "For each cell that has water... in this order".
        // A snapshot of keys is best practice for cellular automata.
        const keys = Object.keys(this.waterCells);

        // We will collect changes and apply them after? Or applying sequentially affects downstream?
        // "Equalization with water below" implies immediate effect for the cell below?
        // Usually simpler to iterate snapshot and apply changes immediately to a 'next state' or modify in place with care.
        // Given "One unit moves down", modifying in place effectively moves it.
        // If we process Top-Down, a unit falling might fall again.
        // If we process Bottom-Up, a unit falls into space, then next iteration checks space?
        // Standard is often arbitrary or specific scan order.
        // Let's use the keys snapshot but apply changes immediately to `this.waterCells` so that `addWater` handles logic.
        // But we must ensure a unit moved from A to B isn't processed again at B in the same turn.
        // We can track "processed" cells.

        const processed = new Set();
        // Sort keys by Z (descending?) to handle falling efficiently? Or Ascending?
        // If we process Z=10, drop to Z=9. Then process Z=9. The water drops again.
        // Is water instantaneous (teleport to bottom) or 1 tile per turn?
        // Spec 8.2: "One unit of water falls down from the current z to the z below."
        // Spec 8.1: "One unit of water moves from the current cell down into the cell below."
        // Implies 1 tile per turn.
        // To enforce 1 tile per turn, we should iterate Bottom-Up?
        // Z=0 processed (can't fall further usually). Z=1 processed (falls to 0).
        // Z=2 processed (falls to 1).
        // This ensures a unit at Z=2 ends at Z=1, not Z=0.

        keys.sort((a, b) => {
            const zA = parseInt(a.split(',')[2]);
            const zB = parseInt(b.split(',')[2]);
            return zA - zB; // Ascending Order (Bottom Up) guarantees max 1 fall per turn if we process keys.
        });

        keys.forEach(key => {
            if (processed.has(key)) return;
            const [x, y, z] = key.split(',').map(Number);

            // Check if water still exists (it might have flowed away due to absorption in a previous step? No, keys are snapshot.)
            // Check actual current depth
            const water = this.getWaterAt(x, y, z);
            if (!water || water.depth <= 0) return;

            // Mark as processed so we don't process it again if it somehow stays?
            // Actually, if we move it, it's gone from here or depth reduces.
            processed.add(key);

            // 7. Absorption
            // "If the original depth was 1, that cell will be empty... no further flow... in this turn."
            const absorbed = this._processAbsorption(x, y, z, water);
            if (absorbed) {
                // Remove 1 unit
                this.removeWater(x, y, z, 1);
                // If it was 1, it's now 0. Stop.
                // If it was 2, it's now 1. Continue.
                if (water.depth < 1) return; // Was 1 (now 0) or effectively empty
            }

            // 8. Vertical Behavior
            // "If either equalization or gravity happens... that cell does not attempt sideways spread."
            const movedVertically = this._processVertical(x, y, z, water);

            if (!movedVertically && water.depth === 2) {
                // 9. Sideways Spread
                this._processSideways(x, y, z);
            }
        });
    }

    _processAbsorption(x, y, z, water) {
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData || !mapData.levels || !mapData.levels[z]) return false;

        const levelData = mapData.levels[z];
        let absorbed = false;

        // Bottom tile at Z
        let bottomTile = levelData.bottom?.[y]?.[x];
        if (bottomTile && typeof bottomTile === 'object') bottomTile = bottomTile.tileId;

        // "Certain bottom tiles... GR or TSL -> MF"
        // TODO: Move these mappings to a config if possible, but hardcoding for now based on previous code.
        if (bottomTile === 'GR' || bottomTile === 'TSL') {
            window.mapRenderer.updateTileOnLayer(x, y, z, 'bottom', 'MF');
            absorbed = true;
        }

        // Middle layer one level below (Z-1)
        if (!absorbed && mapData.levels[z - 1]) {
            let belowMiddle = mapData.levels[z - 1].middle?.[y]?.[x];
            if (belowMiddle && typeof belowMiddle === 'object') belowMiddle = belowMiddle.tileId;
            // "DI -> MU"
            if (belowMiddle === 'DI') {
                window.mapRenderer.updateTileOnLayer(x, y, z - 1, 'middle', 'MU');
                absorbed = true;
            }
        }

        return absorbed;
    }

    _processVertical(x, y, z, water) {
        // 8.1 Equalization
        const waterBelow = this.getWaterAt(x, y, z - 1);
        if (waterBelow && waterBelow.depth < this.maxDepth) {
            // "One unit... moves down"
            this.removeWater(x, y, z, 1);
            this.addWater(x, y, z - 1, 1);
            return true;
        }

        // If water below is full (depth 2), do nothing.
        if (waterBelow && waterBelow.depth >= this.maxDepth) {
            return false;
        }

        // 8.2 Gravity into empty space
        // "If there is no floor at current pos and no water in cell below"
        // We already checked waterBelow (it's null or empty if we are here? No, if it was < 2 we moved. If it was >= 2 we returned false. So here waterBelow is falsy or 0?)
        // wait, if waterBelow exists but depth=0 (shouldn't happen as we delete key), or undefined.
        // So here waterBelow is undefined.
        if (!waterBelow) {
            if (!this._hasFloor(x, y, z)) {
                this.removeWater(x, y, z, 1);
                this.addWater(x, y, z - 1, 1);
                return true;
            }
        }

        return false;
    }

    _processSideways(x, y, z) {
        // "Only cells with depth 2... allowed to spread" called from caller
        // "Considers up to 4 neighbors... N, S, W, E"
        const neighbors = [
            {dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}
        ];

        const validTargets = [];

        for (const n of neighbors) {
            const nx = x + n.dx;
            const ny = y + n.dy;

            // "Path not blocked by collision tile"
            if (this._isBlocked(x, y, z, nx, ny, z)) continue;

            // "Neighbor's water depth is less than 1" (i.e. 0)
            const nWater = this.getWaterAt(nx, ny, z);
            if (!nWater || nWater.depth < 1) {
                validTargets.push({x: nx, y: ny});
            }
        }

        if (validTargets.length > 0) {
            // "One target chosen per turn... random"
            const target = validTargets[Math.floor(Math.random() * validTargets.length)];

            // "One unit moved"
            this.removeWater(x, y, z, 1);
            this.addWater(target.x, target.y, z, 1);
        }
    }

    // Spec 4: Floor Logic
    _hasFloor(x, y, z) {
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData || !mapData.levels || !mapData.levels[z]) return false; // No data means no floor? Spec says "absorption and floor detection may simply do nothing if there is no map data". If no map data, gravity applies? Spec 11: "if the map does not define tiles ... water ... can move ... floor detection may simply do nothing". "Do nothing" for floor detection means "No floor detected".

        // 1. Bottom tile present and not hole
        let bot = mapData.levels[z].bottom?.[y]?.[x];
        if (bot && typeof bot === 'object') bot = bot.tileId;

        if (bot && bot !== 'HOLE') return true;

        // 2. Middle layer below has solid terrain top
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

    // Spec 4: Blocked Logic
    _isBlocked(x1, y1, z1, x2, y2, z2) {
        const tileId = window.mapRenderer.getCollisionTileAt(x2, y2, z2);
        if (tileId === "") return false; // Not blocked

        // "Blocked ... unless tagged permeable"
        if (window.assetManager && window.assetManager.tilesets[tileId]) {
            const def = window.assetManager.tilesets[tileId];
            if (def.tags && def.tags.includes("permeable")) {
                return false;
            }
        }
        return true; // Blocked
    }

    processEntityBreath(entity) {
        if (!entity || !entity.mapPos) return;
        const x = entity.mapPos.x;
        const y = entity.mapPos.y;
        const z = entity.mapPos.z;

        const water = this.getWaterAt(x, y, z);
        const isUnderwater = water && water.depth >= this.deepWaterThreshold;

        let isAquatic = false;
        if (entity.tags && entity.tags.includes('aquatic')) isAquatic = true;
        if (entity.species === 'fish') isAquatic = true;

        if (entity.breath === undefined && !isAquatic) {
            entity.breath = 10;
            entity.maxBreath = 10;
        }
        if (entity.maxBreath === undefined) {
            entity.maxBreath = 20;
            if (entity.breath === undefined) entity.breath = entity.maxBreath;
        }

        if (isAquatic) {
            if (!isUnderwater) {
                if (entity.breath > 0) {
                    entity.breath--;
                    if (entity === window.gameState.player && window.logToConsole) window.logToConsole("Gasping for water...", "orange");
                } else {
                    if (window.logToConsole && entity === window.gameState.player) window.logToConsole("You are suffocating in the air!", "red");
                    if (window.combatManager) {
                        window.combatManager.applyDamage(null, entity, "torso", 2, "suffocation");
                    }
                }
            } else {
                if (entity.breath < entity.maxBreath) {
                    entity.breath = Math.min(entity.maxBreath, entity.breath + 5);
                }
            }
        } else {
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
                if (entity.breath < entity.maxBreath) {
                    entity.breath = Math.min(entity.maxBreath, entity.breath + 5);
                }
            }
        }
    }
}

window.WaterManager = WaterManager;
