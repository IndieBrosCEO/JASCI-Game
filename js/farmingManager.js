
class FarmingManager {
    constructor() {
        this.plots = []; // Array of { x, y, z, mapId, plantId, growthStage, growthProgress, isWatered, variety }
    }

    init(gameState) {
        if (!gameState.farmingPlots) {
            gameState.farmingPlots = [];
        }
        this.plots = gameState.farmingPlots;
    }

    // Helper to get active plot at coordinates
    getPlotAt(x, y, z, mapId) {
        return this.plots.find(p => p.x === x && p.y === y && p.z === z && p.mapId === mapId);
    }

    // --- Actions ---

    till(x, y, z) {
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData) return;

        // Ensure bottom layer is Dirt (DI) or Grass (GR/TGR)
        const bottomLayer = mapData.levels[z].bottom;
        if (!bottomLayer || !bottomLayer[y]) return;

        const tile = bottomLayer[y][x];
        const tileId = (typeof tile === 'object' && tile !== null) ? tile.tileId : tile;

        const validSoils = ["DI", "GR", "TGR", "MU", "MF"]; // Dirt, Grass, Tall Grass, Mud, Muddy Ground
        if (!validSoils.includes(tileId)) {
            window.logToConsole("The soil here is not suitable for tilling.", "orange");
            return;
        }

        // Change to Tilled Soil
        window.mapRenderer.updateTileOnLayer(x, y, z, 'bottom', "TSL");
        window.logToConsole("You tilled the soil.", "success");
        if (window.audioManager) window.audioManager.playUiSound("mining_hit.wav"); // Placeholder sound
    }

    plant(x, y, z, seedItem) {
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData) return;
        const mapId = mapData.id;

        // Validate Tilled Soil
        const bottomLayer = mapData.levels[z].bottom;
        const tile = bottomLayer[y][x];
        const tileId = (typeof tile === 'object' && tile !== null) ? tile.tileId : tile;

        if (tileId !== "TSL") {
            window.logToConsole("You must plant seeds on tilled soil.", "orange");
            return;
        }

        // Validate Space (Middle Layer must be empty of blocking objects, though we place the plant there)
        const middleLayer = mapData.levels[z].middle;
        if (middleLayer && middleLayer[y] && middleLayer[y][x]) {
            window.logToConsole("There is already something planted or placed here.", "orange");
            return;
        }

        // Determine crop type from seed
        const cropTileId = seedItem.cropTileId; // Defined in consumables.json
        if (!cropTileId) {
            window.logToConsole("These seeds don't seem to grow into anything known.", "red");
            return;
        }

        // Place Plant Tile
        window.mapRenderer.updateTileOnLayer(x, y, z, 'middle', cropTileId);

        // Track Plot
        this.plots.push({
            x: x, y: y, z: z, mapId: mapId,
            plantId: cropTileId,
            growthStage: 1,
            growthProgress: 0,
            isWatered: false,
            variety: seedItem.name.replace(" Seeds", "") // Simple variety name
        });

        // Consume Seed
        if (window.inventoryManager) {
            window.inventoryManager.removeItems(seedItem.id, 1);
        }

        window.logToConsole(`You planted ${seedItem.name}.`, "success");
        if (window.audioManager) window.audioManager.playUiSound("ui_click_01.wav"); // Placeholder
    }

    water(x, y, z) {
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData) return;
        const mapId = mapData.id;

        const plot = this.getPlotAt(x, y, z, mapId);
        if (plot) {
            plot.isWatered = true;
            window.logToConsole("You watered the plant.", "info");
            // Visual feedback? Maybe particle effect later.
        } else {
            // Can water tilled soil even without a plant to keep it moist?
            // For now, only tracked plots (plants) matter.
            // Check if it's tilled soil
            const bottomLayer = mapData.levels[z].bottom;
            const tile = bottomLayer[y][x];
            const tileId = (typeof tile === 'object' && tile !== null) ? tile.tileId : tile;

            if (tileId === "TSL") {
                 window.logToConsole("You watered the soil.", "info");
                 // Maybe create a plot entry just for moist soil?
                 // Simpler to just require planting first for now.
            } else {
                 window.logToConsole("You pour water on the ground.", "neutral");
            }
        }
        if (window.audioManager) window.audioManager.playUiSound("water_splash.wav"); // Assuming this exists or falls back
    }

    // --- Growth System ---

    processTurn(currentTurn) {
        if (!this.plots) return;

        // Iterate backward to allow removal
        for (let i = this.plots.length - 1; i >= 0; i--) {
            const plot = this.plots[i];

            // Check if map data is loaded for this plot?
            // If the player changes maps, we might not have the level data loaded in mapRenderer to update tiles.
            // However, gameState persists.
            // Only update tiles if we are on the correct map.
            // Logic: Update internal state always. Update visual tile only if active map.

            // Check Irrigation
            const isIrrigated = this.checkIrrigation(plot);

            if (plot.isWatered || isIrrigated) {
                // Growth logic
                plot.growthProgress += 10; // +10 per turn watered

                // Stages
                // Stage 1 (Seedling) -> Stage 2 (Growing): 50 progress (5 turns)
                // Stage 2 (Growing) -> Stage 3 (Ripe): 100 progress (5 more turns)

                let nextStageTile = null;
                const variety = plot.variety.trim();
                // Determine next tile based on variety and stage
                // This relies on naming convention PL_[FirstLetter]1, PL_[FirstLetter]2...
                // Or we can map it.
                // Map: Corn -> PL_C, Carrot -> PL_R

                let prefix = "";
                if (variety.includes("Corn")) prefix = "PL_C";
                else if (variety.includes("Carrot")) prefix = "PL_R";

                if (prefix) {
                    if (plot.growthStage === 1 && plot.growthProgress >= 50) {
                        plot.growthStage = 2;
                        nextStageTile = `${prefix}2`;
                        // Reset progress? No, cumulative.
                    } else if (plot.growthStage === 2 && plot.growthProgress >= 100) {
                        plot.growthStage = 3;
                        nextStageTile = `${prefix}3`;
                    }
                }

                if (nextStageTile) {
                    plot.plantId = nextStageTile;

                    // If on current map, update visual
                    const currentMap = window.mapRenderer.getCurrentMapData();
                    if (currentMap && currentMap.id === plot.mapId) {
                        window.mapRenderer.updateTileOnLayer(plot.x, plot.y, plot.z, 'middle', nextStageTile);
                    }
                }
            }

            // Reset watered status (unless irrigated, but we calculate irrigation every turn)
            plot.isWatered = false;

            // Cleanup: If plant is removed (harvested/destroyed), remove plot.
            // Check if tile is still a plant
            const currentMap = window.mapRenderer.getCurrentMapData();
            if (currentMap && currentMap.id === plot.mapId) {
                const midTile = currentMap.levels[plot.z].middle?.[plot.y]?.[plot.x];
                const midTileId = (typeof midTile === 'object' && midTile !== null) ? midTile.tileId : midTile;
                if (!midTileId || !midTileId.startsWith("PL_")) {
                    // Plant is gone
                    this.plots.splice(i, 1);
                }
            }
        }
    }

    checkIrrigation(plot) {
        // Radius 4 check for water
        // Uses WaterManager (dynamic) OR Tile checks (static)

        // This check is expensive if done for every plant every turn.
        // Optimization: Cache result?
        // For now, just do the check.

        const r = 4;
        const mapData = window.mapRenderer.getCurrentMapData();

        // If map not loaded, assume no irrigation update? Or keep old state?
        // If player is far away, we can't check static tiles easily without loading map data.
        if (!mapData || mapData.id !== plot.mapId) return false;

        // Check WaterManager first
        // Simple bounding box loop
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                // Circular distance check
                if (Math.sqrt(dx*dx + dy*dy) > r) continue;

                const nx = plot.x + dx;
                const ny = plot.y + dy;

                // Bounds check
                if (nx < 0 || ny < 0) continue;
                // (Max bounds check requires width/height)

                // 1. Dynamic Water
                if (window.waterManager.getWaterAt(nx, ny, plot.z)) return true;

                // 2. Static Water Tile
                const level = mapData.levels[plot.z];
                if (level && level.bottom && level.bottom[ny] && level.bottom[ny][nx]) {
                    const tile = level.bottom[ny][nx];
                    const tId = (typeof tile === 'object' && tile !== null) ? tile.tileId : tile;
                    if (tId === "WS" || tId === "WD" || tId === "RB") return true; // Shallow, Deep, Riverbed(maybe wet?)
                }
            }
        }

        return false;
    }
}

window.FarmingManager = FarmingManager;
