
class FireManager {
    constructor() {
        this.burnDuration = 3; // Default burn duration in turns
        this.spreadChance = 0.5; // 50% chance to spread
        this.burnDamage = 5; // Damage per turn
    }

    init(gameState) {
        if (!gameState.activeFires) {
            gameState.activeFires = [];
        }
    }

    isFlammable(x, y, z) {
        const assetMgr = window.assetManager || window.assetManagerInstance;
        if (!assetMgr || !assetMgr.tilesets) return false;

        // Check if tile at x,y,z is flammable
        // We need to check middle and bottom layers
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData || !mapData.levels || !mapData.levels[z]) return false;

        const levelData = mapData.levels[z];

        const checkLayer = (layerName) => {
            if (!levelData[layerName]) return false;
            const tileData = levelData[layerName][y]?.[x];
            const tileId = (typeof tileData === 'object' && tileData !== null && tileData.tileId) ? tileData.tileId : tileData;
            if (!tileId) return false;
            const tileDef = assetMgr.tilesets[tileId];
            return tileDef && tileDef.tags && tileDef.tags.includes('flammable');
        };

        return checkLayer('middle') || checkLayer('bottom');
    }

    igniteTile(x, y, z) {
        if (!this.isFlammable(x, y, z)) return false;

        // Check if already burning
        if (this.isBurning(x, y, z)) {
            // Reset duration? Or ignore? Let's reset duration to keep it burning.
            const fire = gameState.activeFires.find(f => f.x === x && f.y === y && f.z === z);
            if (fire) fire.duration = this.burnDuration;
            return true;
        }

        // Start fire
        gameState.activeFires.push({
            x: x,
            y: y,
            z: z,
            duration: this.burnDuration
        });

        if (window.logToConsole) window.logToConsole(`Fire ignited at ${x}, ${y}, ${z}!`, 'red');
        // Trigger sound if first fire? handled in render loop or sound manager check
        window.mapRenderer.scheduleRender();
        return true;
    }

    isBurning(x, y, z) {
        return gameState.activeFires.some(f => f.x === x && f.y === y && f.z === z);
    }

    processTurn() {
        if (!gameState.activeFires || gameState.activeFires.length === 0) return;

        const firesToRemove = [];
        const newFires = [];
        const isRaining = window.weatherManager && (window.weatherManager.gameState.currentWeather.type.includes("rain") || window.weatherManager.gameState.currentWeather.type.includes("storm"));

        gameState.activeFires.forEach(fire => {
            // Rain Extinguishing Logic
            if (isRaining) {
                // Check if exposed to sky
                const mapData = window.mapRenderer.getCurrentMapData();
                const zStr = fire.z.toString();
                const levelData = mapData.levels[zStr];
                // Simple check: if no roof tile at this x,y on this Z level
                // A more robust check would check all Z levels above for opaque tiles.
                // For now, check local roof layer.
                const hasRoof = levelData && levelData.roof && levelData.roof[fire.y] && levelData.roof[fire.y][fire.x];
                if (!hasRoof) {
                    // Chance to extinguish
                    if (Math.random() < 0.4) { // 40% chance per turn in rain
                        fire.extinguishedByRain = true;
                        firesToRemove.push(fire);
                        return;
                    }
                }
            }

            // 1. Deal Damage
            const entity = this.getEntityAt(fire.x, fire.y, fire.z);
            if (entity) {
                // Apply burn damage
                if (window.combatManager && typeof window.combatManager.applyEnvironmentalDamage === 'function') {
                     window.combatManager.applyEnvironmentalDamage(entity, this.burnDamage, "fire");
                } else {
                    // Fallback if combatManager helper doesn't exist
                    if (entity.health && entity.health.torso) {
                        entity.health.torso.current -= this.burnDamage;
                        if (window.logToConsole) window.logToConsole(`${entity.name || 'Entity'} takes ${this.burnDamage} burn damage!`, 'orange');
                        if (window.updatePlayerStatusDisplay && entity === gameState.player) window.updatePlayerStatusDisplay();
                    }
                }
            }

            // 2. Spread
            const neighbors = [
                {dx: 0, dy: -1, dz: 0}, {dx: 0, dy: 1, dz: 0},
                {dx: -1, dy: 0, dz: 0}, {dx: 1, dy: 0, dz: 0},
                {dx: 0, dy: 0, dz: 1}, {dx: 0, dy: 0, dz: -1}
            ];

            neighbors.forEach(n => {
                const nx = fire.x + n.dx;
                const ny = fire.y + n.dy;
                const nz = fire.z + (n.dz || 0);

                // Adjust spread chance based on direction if needed (e.g. higher for up)
                // For now using uniform chance
                if (Math.random() < this.spreadChance) {
                    if (this.isFlammable(nx, ny, nz) && !this.isBurning(nx, ny, nz)) {
                        // Don't add directly to activeFires yet to avoid infinite loop in this turn
                        // But wait, forEach iterates over the *original* array snapshot?
                        // No, JS forEach iterates over the live array if we push to it?
                        // Actually, it's better to collect new fires and add them after.
                        // However, we need to check if we already added it to newFires to avoid duplicates.
                        if (!newFires.some(nf => nf.x === nx && nf.y === ny && nf.z === nz)) {
                            newFires.push({x: nx, y: ny, z: nz});
                        }
                    }
                }
            });

            // 3. Decrement Duration & Burn Out
            fire.duration--;
            if (fire.duration <= 0) {
                fire.burnedOut = true;
                firesToRemove.push(fire);
            }
        });

        // Apply new fires
        newFires.forEach(nf => {
            this.igniteTile(nf.x, nf.y, nf.z);
        });

        // Process removals
        firesToRemove.forEach(fire => {
            if (fire.burnedOut) {
                this.extinguishTile(fire.x, fire.y, fire.z, true); // true = turned to ash
            } else {
                this.extinguishTile(fire.x, fire.y, fire.z, false); // false = just extinguished (e.g. rain)
            }
        });

        if (gameState.activeFires.length > 0 && window.audioManager) {
             // Check if already playing by some id logic or just rely on playSound handling (it handles duplicates for loading but not necessarily playback loop if we call it every turn)
             // For a simple fix, we use playSound which initiates it.
             // However, playSound returns a sourceNode. We need to store it to stop it.
             if (!this.fireLoopSource) {
                 this.fireLoopSource = window.audioManager.playSound('fire_loop_01.wav', { loop: true, volume: 0.5 });
             }
        } else if (window.audioManager) {
             if (this.fireLoopSource) {
                 window.audioManager.stopSound(this.fireLoopSource);
                 this.fireLoopSource = null;
             }
        }

        window.mapRenderer.scheduleRender();
    }

    extinguishTile(x, y, z, turnedToAsh = false) {
        const index = gameState.activeFires.findIndex(f => f.x === x && f.y === y && f.z === z);
        if (index !== -1) {
            gameState.activeFires.splice(index, 1);
        }

        if (turnedToAsh) {
            // Replace tile with Ash
            // We need to replace the flammable tile.
            // Usually checking middle layer first, then bottom.
            // If middle is flammable, replace middle. Else replace bottom.
             const mapData = window.mapRenderer.getCurrentMapData();
             const levelData = mapData.levels[z];

             const assetMgr = window.assetManager || window.assetManagerInstance;
             const replaceLayer = (layerName) => {
                if (!levelData[layerName]) return false;
                const tileData = levelData[layerName][y]?.[x];
                const tileId = (typeof tileData === 'object' && tileData !== null && tileData.tileId) ? tileData.tileId : tileData;
                if (!tileId) return false;
                const tileDef = assetMgr.tilesets[tileId];
                if (tileDef && tileDef.tags && tileDef.tags.includes('flammable')) {
                    window.mapRenderer.updateTileOnLayer(x, y, z, layerName, 'ASH');
                    return true;
                }
                return false;
             };

             if (!replaceLayer('middle')) {
                 replaceLayer('bottom');
             }

             if (window.logToConsole) window.logToConsole(`Fire burned out at ${x}, ${y}, ${z}. Turned to Ash.`, 'grey');

        } else {
            // Just extinguished by water.
            // "Extinguishing also prevents any further spread from that tile." - naturally handled by removing from activeFires.
            // "returning it to its original base tile" - If it was burning, it hasn't changed tile ID yet (visuals handled by renderer overlay).
            // So we just remove it from activeFires.
             if (window.logToConsole) window.logToConsole(`Fire extinguished at ${x}, ${y}, ${z}.`, 'blue');
             if (window.audioManager) window.audioManager.playSound('extinguish_01.wav');
        }
        window.mapRenderer.scheduleRender();
    }

    getEntityAt(x, y, z) {
        if (gameState.playerPos.x === x && gameState.playerPos.y === y && gameState.playerPos.z === z) {
            return gameState.player;
        }
        if (gameState.npcs) {
            return gameState.npcs.find(n => n.mapPos.x === x && n.mapPos.y === y && n.mapPos.z === z);
        }
        return null;
    }
}

window.FireManager = FireManager;
// window.fireManager = new FireManager(); // Instantiated in script.js
