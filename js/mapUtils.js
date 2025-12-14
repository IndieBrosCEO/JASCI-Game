// js/mapUtils.js

class MapUtils {
    constructor(gameState, assetManager, mapRenderer) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.mapRenderer = mapRenderer; // For accessing current map data
        this.logPrefix = "[MapUtils]";
    }

    initialize() {
        // Placeholder for any specific initialization MapUtils might need
        logToConsole(`${this.logPrefix} Initialized.`, "blue");
    }

    /**
     * Finds a random suitable point within a specified area type or near a reference point.
     * Placeholder implementation.
     * @param {string} areaType - E.g., "forest", "ruins", "outpost".
     * @param {number} radius - Search radius from centerPoint if provided.
     * @param {object} [centerPoint] - Optional {x, y, z} to search around. If null, might use map features.
     * @returns {object|null} {x, y, z} coordinates or null if no suitable point found.
     */
    findRandomPointInAreaType(areaType, radius, centerPoint = null) {
        logToConsole(`${this.logPrefix} findRandomPointInAreaType: Placeholder called for ${areaType}. Returning fixed point for now.`, "grey");
        // Basic placeholder: return a point near center or a default if no center
        const currentMapData = this.mapRenderer ? this.mapRenderer.getCurrentMapData() : null;
        if (!currentMapData || !currentMapData.dimensions) {
            logToConsole(`${this.logPrefix} findRandomPointInAreaType: No map data.`, "warn");
            return null;
        }

        const R = radius || 10;
        const basePos = centerPoint || this.gameState.playerPos || { x: Math.floor(currentMapData.dimensions.width / 2), y: Math.floor(currentMapData.dimensions.height / 2), z: 0 };

        for (let i = 0; i < 10; i++) { // Try a few times
            const angle = Math.random() * 2 * Math.PI;
            const dist = Math.random() * R;
            const x = Math.floor(basePos.x + Math.cos(angle) * dist);
            const y = Math.floor(basePos.y + Math.sin(angle) * dist);
            const z = basePos.z; // Assume same Z for now

            if (x >= 0 && x < currentMapData.dimensions.width && y >= 0 && y < currentMapData.dimensions.height) {
                if (this.mapRenderer.isWalkable(x, y, z)) { // Check if the point is walkable
                    return { x, y, z };
                }
            }
        }
        return { x: basePos.x + 1, y: basePos.y + 1, z: basePos.z }; // Fallback
    }

    /**
     * Gets a human-readable description for a given area or coordinates.
     * Placeholder implementation.
     * @param {object|string} coordsOrAreaKey - {x, y, z} or a predefined area key.
     * @returns {string} A description like "the old farmstead" or "near the river bend".
     */
    getAreaDescription(coordsOrAreaKey) {
        logToConsole(`${this.logPrefix} getAreaDescription: Placeholder called.`, "grey");
        if (typeof coordsOrAreaKey === 'string') {
            return `the area known as ${coordsOrAreaKey}`;
        }
        if (coordsOrAreaKey && typeof coordsOrAreaKey.x === 'number') {
            return `the location at (${coordsOrAreaKey.x}, ${coordsOrAreaKey.y}, ${coordsOrAreaKey.z})`;
        }
        return "an unknown area";
    }

    /**
     * Gets the name of a faction's camp or base location.
     * Placeholder implementation.
     * @param {string} factionId - The ID of the faction.
     * @returns {string|null} The name of the camp or null.
     */
    getFactionCampLocationName(factionId) {
        logToConsole(`${this.logPrefix} getFactionCampLocationName: Placeholder for ${factionId}.`, "grey");
        // Example: Read from faction data or predefined map locations
        if (factionId === "police") return "the Police Station";
        return `the ${factionId} camp`;
    }

    /**
     * Gets coordinates for a predefined named location on the current map.
     * Placeholder implementation.
     * @param {string} locationKey - E.g., "old_mill", "bandit_hideout_entrance".
     * @returns {object|null} {x, y, z, name} or null if not found.
     */
    getNamedLocationCoords(locationKey) {
        logToConsole(`${this.logPrefix} getNamedLocationCoords: Placeholder for ${locationKey}.`, "grey");
        // Example: Read from current map data's predefined locations
        const currentMapData = this.mapRenderer ? this.mapRenderer.getCurrentMapData() : null;
        if (currentMapData && currentMapData.namedLocations && currentMapData.namedLocations[locationKey]) {
            return currentMapData.namedLocations[locationKey]; // Expects {x,y,z,name}
        }
        // Fallback if not found in map data
        if (locationKey === "abandoned_shack") return { x: 10, y: 15, z: 0, name: "Abandoned Shack" };
        return { x: 5, y: 5, z: 0, name: locationKey }; // Default fallback
    }

    /**
     * Checks if a location is reachable from a starting point for a given entity.
     * Placeholder implementation. Uses findPath3D.
     * @param {object} startPos - {x, y, z}
     * @param {object} endPos - {x, y, z}
     * @param {object} entity - The entity attempting to reach (for entity-specific pathing rules).
     * @returns {boolean} True if reachable.
     */
    isReachable(startPos, endPos, entity) {
        logToConsole(`${this.logPrefix} isReachable: Placeholder called.`, "grey");
        if (!this.mapRenderer || !this.assetManager || !this.assetManager.tilesets) {
            logToConsole(`${this.logPrefix} isReachable: Missing dependencies.`, "warn");
            return false;
        }
        const currentMapData = this.mapRenderer.getCurrentMapData();
        const path = findPath3D(startPos, endPos, entity, currentMapData, this.assetManager.tilesets);
        return path !== null && path.length > 0;
    }

    /**
    * Gets the coordinates of a faction's base or primary area of operation.
    * Placeholder implementation.
    * @param {string} factionId - The ID of the faction.
    * @returns {object|null} {x, y, z} coordinates or null if not defined.
    */
    getFactionBaseCoords(factionId) {
        logToConsole(`${this.logPrefix} getFactionBaseCoords: Placeholder for ${factionId}.`, "grey");
        // This would ideally come from map data or faction definitions
        if (factionId === "police") return { x: 20, y: 20, z: 0 }; // Example
        return { x: 10, y: 10, z: 0 }; // Default fallback
    }

    /**
     * Checks if a specific tile is occupied by a character (player or NPC).
     * @param {number} x - The x-coordinate of the tile.
     * @param {number} y - The y-coordinate of the tile.
     * @param {number} z - The z-coordinate of the tile.
     * @returns {boolean} True if the tile is occupied, false otherwise.
     */
    isTileOccupied(x, y, z) {
        // Check player position
        if (this.gameState.playerPos.x === x && this.gameState.playerPos.y === y && this.gameState.playerPos.z === z) {
            return true;
        }

        // Check NPC positions
        for (const npc of this.gameState.npcs) {
            if (npc.mapPos.x === x && npc.mapPos.y === y && npc.mapPos.z === z) {
                return true;
            }
        }

        // Check Vehicle positions
        if (this.gameState.vehicles) {
            for (const vehicle of this.gameState.vehicles) {
                if (vehicle.mapPos && vehicle.mapPos.x === x && vehicle.mapPos.y === y && vehicle.mapPos.z === z) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Calculates tiles within a 2D cone.
     * @param {object} startPos - {x, y}
     * @param {object} targetPos - {x, y}
     * @param {number} angleRad - Cone spread angle in radians (e.g., Math.PI / 4 for 45 deg).
     * @param {number} range - Maximum range of the cone.
     * @returns {Array} Array of {x, y} objects for tiles in the cone.
     */
    getTilesInCone(startPos, targetPos, angleRad, range) {
        const tiles = [];
        const directionAngle = Math.atan2(targetPos.y - startPos.y, targetPos.x - startPos.x);
        const halfAngle = angleRad / 2;

        // Bounding box for optimization
        const minX = Math.floor(Math.min(startPos.x, targetPos.x) - range);
        const maxX = Math.ceil(Math.max(startPos.x, targetPos.x) + range);
        const minY = Math.floor(Math.min(startPos.y, targetPos.y) - range);
        const maxY = Math.ceil(Math.max(startPos.y, targetPos.y) + range);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x === startPos.x && y === startPos.y) continue; // Exclude start tile

                const dx = x - startPos.x;
                const dy = y - startPos.y;
                const distSq = dx * dx + dy * dy;

                if (distSq <= range * range) {
                    const angleToTile = Math.atan2(dy, dx);
                    let angleDiff = angleToTile - directionAngle;

                    // Normalize angle difference to -PI to +PI
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                    if (Math.abs(angleDiff) <= halfAngle) {
                        tiles.push({ x, y });
                    }
                }
            }
        }
        return tiles;
    }

    /**
     * Checks if a tile is generally passable for placement (e.g. traps, construction).
     * @param {number} x - The x-coordinate of the tile.
     * @param {number} y - The y-coordinate of the tile.
     * @param {number} z - The z-coordinate of the tile.
     * @param {object} entity - The entity checking (optional).
     * @param {boolean} ignoreEntities - Whether to ignore dynamic entities (default false).
     * @returns {boolean} True if the tile is passable.
     */
    isTilePassable(x, y, z, entity = null, ignoreEntities = false) {
        if (!this.mapRenderer) return false;

        // Check static map passability (walls, terrain) using isWalkable
        if (!this.mapRenderer.isWalkable(x, y, z)) {
            return false;
        }

        // Check dynamic entities if not ignored
        if (!ignoreEntities && this.isTileOccupied(x, y, z)) {
            return false;
        }

        return true;
    }
}

// Make globally accessible if needed by other modules directly, or instantiate in script.js
window.MapUtils = MapUtils;
