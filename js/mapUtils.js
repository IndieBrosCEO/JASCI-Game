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
}

// Make globally accessible if needed by other modules directly, or instantiate in script.js
window.MapUtils = MapUtils;
