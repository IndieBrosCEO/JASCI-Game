// js/mapRenderer.js
// Helper functions for FOW and LOS

// Add this new helper function at the top of js/mapRenderer.js
function blendColors(baseColorHex, tintColorHex, tintFactor) {
    try {
        // Ensure tintFactor is within bounds
        const factor = Math.max(0, Math.min(1, tintFactor));

        // Function to parse hex to RGB object
        const hexToRgb = (hex) => {
            if (typeof hex !== 'string' || !hex.startsWith('#')) return null;
            let r = parseInt(hex.substring(1, 3), 16);
            let g = parseInt(hex.substring(3, 5), 16);
            let b = parseInt(hex.substring(5, 7), 16);
            if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
            return { r, g, b };
        };

        // Function to convert RGB object back to hex
        const rgbToHex = (r, g, b) => {
            return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
        };

        const baseRgb = hexToRgb(baseColorHex);
        const tintRgb = hexToRgb(tintColorHex);

        // If colors are invalid or not parsable, return the original base color or a default
        if (!baseRgb) return baseColorHex || '#808080'; // Fallback if base is bad
        if (!tintRgb) return baseColorHex; // If tint is bad, don't change base

        const r = baseRgb.r * (1 - factor) + tintRgb.r * factor;
        const g = baseRgb.g * (1 - factor) + tintRgb.g * factor;
        const b = baseRgb.b * (1 - factor) + tintRgb.b * factor;

        return rgbToHex(r, g, b);
    } catch (e) {
        // console.warn("Error blending colors:", e, baseColorHex, tintColorHex);
        return baseColorHex; // Fallback to base color on any error
    }
}

function brightenColor(hexColor, factor) {
    if (typeof hexColor !== 'string' || !hexColor.startsWith('#') || typeof factor !== 'number') {
        return hexColor || '#FFFFFF'; // Return original or white if invalid input
    }
    try {
        let r = parseInt(hexColor.substring(1, 3), 16);
        let g = parseInt(hexColor.substring(3, 5), 16);
        let b = parseInt(hexColor.substring(5, 7), 16);

        if (isNaN(r) || isNaN(g) || isNaN(b)) return hexColor || '#FFFFFF';

        factor = Math.max(0, Math.min(1, factor)); // Clamp factor to 0-1

        r = Math.round(r + (255 - r) * factor);
        g = Math.round(g + (255 - g) * factor);
        b = Math.round(b + (255 - b) * factor);

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        // console.warn("Error brightening color:", e, hexColor, factor);
        return hexColor || '#FFFFFF'; // Fallback on error
    }
}

// Add this new helper function at the top of js/mapRenderer.js
function getAmbientLightColor(currentTimeHours) {
    // Ensure currentTimeHours is a number and within 0-23 range
    const hour = (typeof currentTimeHours === 'number' && currentTimeHours >= 0 && currentTimeHours <= 23) ? currentTimeHours : 12; // Default to noon if invalid

    // Simple time-to-color mapping
    if (hour >= 6 && hour < 8) { // Dawn
        return '#A0A0C0'; // Pale blueish-grey transitioning to yellow
    } else if (hour >= 8 && hour < 17) { // Daytime
        return '#FFFFFF'; // Bright white (or slightly yellowish like #FFF5E1)
    } else if (hour >= 17 && hour < 19) { // Dusk
        return '#B0A0A0'; // Orangey/dusky transitioning to dark blue
    } else { // Night (19:00 to 05:59)
        return '#303045'; // Dark blue/grey for night
    }
}

// Updated isTileBlockingLight to be 3D
function isTileBlockingLight(tileX, tileY, tileZ) { // Added tileZ
    const mapData = window.mapRenderer.getCurrentMapData(); // This is fullMapData
    const currentAssetManager = assetManagerInstance;

    if (!mapData || !mapData.levels || !currentAssetManager || !currentAssetManager.tilesets) {
        return false;
    }

    const levelData = mapData.levels[tileZ.toString()];
    if (!levelData) return true; // Treat missing Z-levels as blocking light solid by default

    // Define which layers on a given Z-level can block light
    const layersToConsider = ['landscape', 'building']; // TODO: Adapt to new layer categories
    if (gameState.showRoof && levelData.roof) { // Check roof on the specific Z-level
        layersToConsider.push('roof');
    }

    for (const layerName of layersToConsider) {
        const layer = levelData[layerName];
        if (layer && layer[tileY] && typeof layer[tileY][tileX] !== 'undefined' && layer[tileY][tileX] !== null && layer[tileY][tileX] !== "") {
            const tileId = layer[tileY][tileX];
            if (tileId) {
                const tileDef = currentAssetManager.tilesets[tileId];
                if (tileDef && tileDef.tags) {
                    // Using 'transparent_to_light' or similar specific tag would be better.
                    // For now, piggyback on 'allows_vision' or 'transparent' for light passage.
                    if (tileDef.tags.includes('allows_vision') || tileDef.tags.includes('transparent') || tileDef.tags.includes('transparent_to_light')) {
                        continue; // This tile on this layer doesn't block light, check other layers on same tile.
                    }
                    // A specific 'blocks_light' tag could be added.
                    // For now, 'impassable' or 'blocks_vision' are good indicators of light blocking.
                    if (tileDef.tags.includes('impassable') || tileDef.tags.includes('blocks_vision') || tileDef.tags.includes('blocks_light')) {
                        return true; // This tile is a solid light blocker.
                    }
                } else if (tileDef && !tileDef.tags) {
                    // Default behavior for untagged tiles (similar to vision)
                    if (layerName !== 'landscape' || (tileDef.name && !tileDef.name.toLowerCase().includes("floor"))) {
                        // return true; // Default to blocking for non-floor, non-tagged items. Might be too aggressive.
                    }
                }
            }
        }
    }
    return false; // No explicitly light-blocking tile found at this (x,y,z)
}

// Updated isTileIlluminated to be 3D
function isTileIlluminated(targetX, targetY, targetZ, lightSource) { // targetZ added, lightSource now includes .z
    const sourceX = lightSource.x;
    const sourceY = lightSource.y;
    const sourceZ = lightSource.z; // Light source has a Z position
    const sourceRadius = lightSource.radius;

    const distance = getDistance3D({ x: targetX, y: targetY, z: targetZ }, lightSource); // Use 3D distance

    if (distance > sourceRadius) {
        return false;
    }
    if (targetX === sourceX && targetY === sourceY && targetZ === sourceZ) return true;
    if (distance <= 0.5) return true; // Effectively same tile or immediately adjacent

    const line = getLine3D(sourceX, sourceY, sourceZ, targetX, targetY, targetZ);
    if (line.length < 2) return true;

    for (let i = 1; i < line.length - 1; i++) {
        const point = line[i];
        if (isTileBlockingLight(point.x, point.y, point.z)) {
            return false;
        }
    }
    return true;
}

function getLine(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    let currentX = x0;
    let currentY = y0;
    while (true) {
        points.push({ x: currentX, y: currentY });
        if ((currentX === x1) && (currentY === y1)) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; currentX += sx; }
        if (e2 < dx) { err += dx; currentY += sy; }
        if (points.length > 200) { // Safety break
            break;
        }
    }
    return points;
}

// Renamed original getLine to getLine2D
function getLine2D(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    let currentX = x0;
    let currentY = y0;
    while (true) {
        points.push({ x: currentX, y: currentY });
        if ((currentX === x1) && (currentY === y1)) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; currentX += sx; }
        if (e2 < dx) { err += dx; currentY += sy; }
        if (points.length > 200) { // Safety break
            break;
        }
    }
    return points;
}

// New 3D line algorithm (Bresenham's line algorithm for 3D)
function getLine3D(x0, y0, z0, x1, y1, z1) {
    const points = [];
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let dz = Math.abs(z1 - z0);
    let xs = (x1 > x0) ? 1 : -1;
    let ys = (y1 > y0) ? 1 : -1;
    let zs = (z1 > z0) ? 1 : -1;
    let currentX = x0;
    let currentY = y0;
    let currentZ = z0;

    points.push({ x: currentX, y: currentY, z: currentZ });

    // Driving axis is X
    if (dx >= dy && dx >= dz) {
        let p1 = 2 * dy - dx;
        let p2 = 2 * dz - dx;
        while (currentX != x1) {
            currentX += xs;
            if (p1 >= 0) {
                currentY += ys;
                p1 -= 2 * dx;
            }
            if (p2 >= 0) {
                currentZ += zs;
                p2 -= 2 * dx;
            }
            p1 += 2 * dy;
            p2 += 2 * dz;
            points.push({ x: currentX, y: currentY, z: currentZ });
            if (points.length > 300) { break; } // Safety break
        }
        // Driving axis is Y
    } else if (dy >= dx && dy >= dz) {
        let p1 = 2 * dx - dy;
        let p2 = 2 * dz - dy;
        while (currentY != y1) {
            currentY += ys;
            if (p1 >= 0) {
                currentX += xs;
                p1 -= 2 * dy;
            }
            if (p2 >= 0) {
                currentZ += zs;
                p2 -= 2 * dy;
            }
            p1 += 2 * dx;
            p2 += 2 * dz;
            points.push({ x: currentX, y: currentY, z: currentZ });
            if (points.length > 300) { break; } // Safety break
        }
        // Driving axis is Z
    } else {
        let p1 = 2 * dy - dz;
        let p2 = 2 * dx - dz;
        while (currentZ != z1) {
            currentZ += zs;
            if (p1 >= 0) {
                currentY += ys;
                p1 -= 2 * dz;
            }
            if (p2 >= 0) {
                currentX += xs;
                p2 -= 2 * dz;
            }
            p1 += 2 * dy;
            p2 += 2 * dx;
            points.push({ x: currentX, y: currentY, z: currentZ });
            if (points.length > 300) { break; } // Safety break
        }
    }
    return points;
}


function isTileBlockingVision(tileX, tileY, tileZ) { // Added tileZ parameter
    const mapData = window.mapRenderer.getCurrentMapData(); // This is fullMapData
    const currentAssetManager = assetManagerInstance;

    if (!mapData || !mapData.levels || !currentAssetManager || !currentAssetManager.tilesets) {
        return false;
    }

    const levelData = mapData.levels[tileZ.toString()];
    if (!levelData) return true; // Treat missing Z-levels as blocking

    // Define which layers on a given Z-level can block vision
    // Considering your new layer categories: 'Constructions' would be primary.
    // 'Landscape' might block if it's a mountain/hill tile.
    const layersToConsider = ['landscape', 'building']; // TODO: Adapt to new layer categories based on tile tags
    if (gameState.showRoof && levelData.roof) { // Roofs are specific to a Z-level now
        layersToConsider.push('roof');
    }

    for (const layerName of layersToConsider) {
        const layer = levelData[layerName];
        if (layer && layer[tileY] && typeof layer[tileY][tileX] !== 'undefined' && layer[tileY][tileX] !== null && layer[tileY][tileX] !== "") {
            const tileId = layer[tileY][tileX];
            if (tileId) {
                const tileDef = currentAssetManager.tilesets[tileId];
                if (tileDef && tileDef.tags) {
                    if (tileDef.tags.includes('allows_vision') || tileDef.tags.includes('transparent')) {
                        // This specific tile on this layer is transparent, so it doesn't block.
                        // However, another layer on the same (x,y,z) might block.
                        // For now, if any part of the stack at (x,y,z) is transparent, assume vision passes *through this tile*.
                        // The line of sight will check multiple points.
                        continue; // Check next layer on this tile, or if this is the most "solid" transparent, it allows vision.
                    }
                    if (tileDef.tags.includes('impassable') || tileDef.tags.includes('blocks_vision')) {
                        return true; // This tile is a solid vision blocker.
                    }
                } else if (tileDef && !tileDef.tags) {
                    // If tile has a definition but no tags, assume it blocks vision by default if it's not landscape floor.
                    // This is a heuristic. Ideally, all tiles that should not block vision are tagged 'allows_vision' or 'transparent'.
                    if (layerName !== 'landscape' || (tileDef.name && !tileDef.name.toLowerCase().includes("floor"))) {
                        // return true; // Default to blocking for non-floor, non-tagged items. Might be too aggressive.
                    }
                }
            }
        }
    }
    return false;
}

function isTileVisible(playerX, playerY, playerZ, targetX, targetY, targetZ, visionRadius) {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const dz = targetZ - playerZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > visionRadius) {
        return false;
    }
    if (playerX === targetX && playerY === targetY && playerZ === targetZ) return true;

    const line = getLine3D(playerX, playerY, playerZ, targetX, targetY, targetZ);

    // For very close distances, less stringent checks or direct visibility might apply.
    // e.g. if distance <= 1.5 (sqrt(1^2+1^2) approx for adjacent diagonal)
    if (distance <= 1.8) { // Allow slightly more for 3D adjacency
        if (line.length > 1) {
            const firstStep = line[1];
            if (isTileBlockingVision(firstStep.x, firstStep.y, firstStep.z) &&
                !(firstStep.x === targetX && firstStep.y === targetY && firstStep.z === targetZ)) {
                return false;
            }
        }
        return true;
    }

    if (line.length < 2) return true; // Should not happen if distance > 0

    // Check intermediate points for obstruction.
    // line[0] is the player's tile.
    // line[line.length-1] is the target tile.
    // We need to check tiles from line[1] up to line[line.length-2].
    for (let i = 1; i < line.length - 1; i++) {
        const point = line[i];
        if (isTileBlockingVision(point.x, point.y, point.z)) {
            return false;
        }
    }
    return true;
}

let currentMapData = null;
let assetManagerInstance = null;

// Exporting functions for use in other modules
window.mapRenderer = {
    initMapRenderer: function (assetMgr) {
        assetManagerInstance = assetMgr;
    },

    initializeCurrentMap: function (mapData) {
        currentMapData = mapData; // mapData from assetManager now contains .levels and .startPos.z
        gameState.lightSources = [];
        gameState.containers = [];

        if (mapData && mapData.dimensions && mapData.levels && mapData.startPos !== undefined) {
            const H = mapData.dimensions.height;
            const W = mapData.dimensions.width;
            const startZ = mapData.startPos.z !== undefined ? mapData.startPos.z : 0;

            // Initialize fowData for the starting Z-level if dimensions are valid
            if (H > 0 && W > 0) {
                // Ensure fowData for the startZ is initialized
                if (!gameState.fowData[startZ.toString()]) { // Use string key for consistency
                    gameState.fowData[startZ.toString()] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                    logToConsole(`FOW data initialized for Z-level ${startZ}.`);
                }
            } else {
                Object.keys(gameState.fowData).forEach(key => delete gameState.fowData[key]);
                logToConsole("Map dimensions are zero or invalid. All FOW data cleared.", "warn");
            }

            // Populate static light sources, containers, etc. from map tiles across all Z-levels
            for (const zLevelKey in mapData.levels) {
                if (mapData.levels.hasOwnProperty(zLevelKey)) {
                    const z = parseInt(zLevelKey, 10);
                    const levelData = mapData.levels[zLevelKey];
                    const layersToScanForLights = ['landscape', 'building', 'item'];

                    for (const layerName of layersToScanForLights) {
                        const layer = levelData[layerName];
                        if (layer) {
                            for (let r = 0; r < H; r++) {
                                for (let c = 0; c < W; c++) {
                                    const tileId = layer[r]?.[c];
                                    if (tileId && assetManagerInstance && assetManagerInstance.tilesets) {
                                        const tileDef = assetManagerInstance.tilesets[tileId];
                                        if (tileDef && tileDef.emitsLight === true && typeof tileDef.lightRadius === 'number' && tileDef.lightRadius > 0) {
                                            const lightSource = {
                                                x: c,
                                                y: r,
                                                z: z, // Add Z coordinate to light source
                                                radius: tileDef.lightRadius,
                                                intensity: typeof tileDef.lightIntensity === 'number' ? tileDef.lightIntensity : 1.0,
                                                color: typeof tileDef.lightColor === 'string' ? tileDef.lightColor : null
                                            };
                                            gameState.lightSources.push(lightSource);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (typeof logToConsole === 'function' && gameState.lightSources.length > 0) {
                logToConsole(`Initialized ${gameState.lightSources.length} static light sources from map tiles across all Z-levels.`);
            }

            // Populate container instances from map tiles across all Z-levels
            for (const zLevelKey in mapData.levels) {
                if (mapData.levels.hasOwnProperty(zLevelKey)) {
                    const z = parseInt(zLevelKey, 10);
                    const levelData = mapData.levels[zLevelKey];
                    const layersToScanForContainers = ['item', 'building'];

                    for (const layerName of layersToScanForContainers) {
                        const layer = levelData[layerName];
                        if (layer) {
                            for (let r = 0; r < H; r++) {
                                for (let c = 0; c < W; c++) {
                                    const tileId = layer[r]?.[c];
                                    if (tileId && assetManagerInstance && assetManagerInstance.tilesets && assetManagerInstance.items) {
                                        const tileDef = assetManagerInstance.tilesets[tileId];
                                        if (tileDef && tileDef.tags && tileDef.tags.includes('container')) {
                                            let capacity = 0;
                                            let itemName = tileDef.name;
                                            const linkedItemId = tileDef.itemLink;

                                            if (linkedItemId && assetManagerInstance.items[linkedItemId]) {
                                                const itemDef = assetManagerInstance.items[linkedItemId];
                                                if (itemDef && typeof itemDef.capacity === 'number' && itemDef.capacity > 0) {
                                                    capacity = itemDef.capacity;
                                                    itemName = itemDef.name || tileDef.name;
                                                } else {
                                                    if (typeof logToConsole === 'function') {
                                                        logToConsole(`Warning: Container tile '${tileId}' at (${c},${r}, Z:${z}) links to item '${linkedItemId}' which has invalid capacity. Defaulting to 5.`, "orange");
                                                    }
                                                    capacity = 5;
                                                }
                                            } else if (linkedItemId) {
                                                if (typeof logToConsole === 'function') {
                                                    logToConsole(`Warning: Container tile '${tileId}' at (${c},${r}, Z:${z}) has itemLink '${linkedItemId}' but linked item not found. Defaulting to 5.`, "orange");
                                                }
                                                capacity = 5;
                                            } else {
                                                if (typeof logToConsole === 'function') {
                                                    logToConsole(`Warning: Container tile '${tileId}' at (${c},${r}, Z:${z}) has no itemLink. Defaulting capacity to 5.`, "orange");
                                                }
                                                capacity = 5;
                                            }

                                            const containerInstance = {
                                                x: c,
                                                y: r,
                                                z: z, // Add Z coordinate to container
                                                id: gameState.nextContainerId++, // Ensure gameState.nextContainerId is initialized
                                                tileId: tileId,
                                                name: itemName,
                                                capacity: capacity,
                                                items: []
                                            };
                                            console.log(`MAP_RENDERER: Creating container instance: ID ${containerInstance.id}, TileID: ${containerInstance.tileId}, Name: ${containerInstance.name}, Pos: (${containerInstance.x},${containerInstance.y}, Z:${containerInstance.z}), Capacity: ${containerInstance.capacity}`);
                                            gameState.containers.push(containerInstance);
                                            if (typeof window.populateContainer === 'function') {
                                                window.populateContainer(containerInstance);
                                            } else {
                                                if (typeof logToConsole === 'function') {
                                                    logToConsole(`Error: populateContainer function not found. Cannot populate ${containerInstance.name}.`, "red");
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (typeof logToConsole === 'function' && gameState.containers.length > 0) { // This log should be after the loop for all Z levels
                    logToConsole(`Initialized ${gameState.containers.length} container instances from map tiles across all Z-levels.`);
                }
            } // This closes the "if (mapData && mapData.dimensions...)" block

        } else { // This 'else' corresponds to "if (mapData && mapData.dimensions...)"
            gameState.fowData = {}; // Clear all FOW data if mapData is invalid
            logToConsole("initializeCurrentMap: mapData is invalid or missing critical properties (dimensions, levels, startPos). FOW data cleared.", "warn");
        }
    },

    getCurrentMapData: function () {
        return currentMapData;
    },

    updateLightSources: function (newLightSources) {
        if (Array.isArray(newLightSources)) {
            gameState.lightSources = newLightSources;
            if (typeof logToConsole === 'function') {
                logToConsole(`Light sources updated (dynamic). Count: ${gameState.lightSources.length}`);
            }
            this.scheduleRender();
        } else {
            if (typeof logToConsole === 'function') {
                logToConsole("updateLightSources: Invalid input. Expected an array.", "orange");
            }
        }
    },

    handleMapSelectionChange: async function (mapId) { // This function will be called from script.js
        if (!mapId || !assetManagerInstance) {
            console.warn("Map selection change triggered with invalid mapId or missing assetManagerInstance.");
            return null; // Return null to indicate failure or inability to load
        }
        console.log(`Map selected via UI (mapRenderer): ${mapId}`);
        const loadedMap = await assetManagerInstance.loadMap(mapId);

        if (loadedMap) {
            this.initializeCurrentMap(loadedMap);

            if (typeof logToConsole === 'function') {
                logToConsole(`Map ${loadedMap.name} loaded by mapRenderer.js's handleMapSelectionChange. Returning map data to caller.`);
            } else {
                console.log(`Map ${loadedMap.name} loaded by mapRenderer.js's handleMapSelectionChange. Returning map data to caller.`);
            }
            return loadedMap; // Return the loaded map data
        } else {
            if (typeof logToConsole === 'function') {
                logToConsole(`Failed to load map: ${mapId}`);
            } else {
                console.log(`Failed to load map: ${mapId}`);
            }
            const errorDisplay = document.getElementById('errorMessageDisplay');
            if (errorDisplay) {
                errorDisplay.textContent = `Failed to load map: ${mapId}. Check console for details.`;
            }
            this.initializeCurrentMap(null);
            return null; // Return null on failure
        }
    },

    setupMapSelector: async function () { // This function will be called from script.js
        const mapSelector = document.getElementById('mapSelector');
        if (!mapSelector) {
            console.error("Map selector element #mapSelector not found.");
            const errorDisplay = document.getElementById('errorMessageDisplay');
            if (errorDisplay) errorDisplay.textContent = "UI Error: Map selector not found.";
            return;
        }
        if (!assetManagerInstance) {
            console.error("AssetManagerInstance not initialized in mapRenderer. Cannot setup map selector.");
            return;
        }

        const baseMapIndexUrl = `/assets/maps/mapIndex.json?t=${Date.now()}`;
        let baseMapIndex = [];
        try {
            const response = await fetch(baseMapIndexUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for base mapIndex.json`);
            }
            baseMapIndex = await response.json();
            assetManagerInstance.setMapIndexData(baseMapIndex);
            console.log("Base map index loaded and set in AssetManager.");
        } catch (error) {
            console.error("Failed to load base map index:", error);
            const errorDisplay = document.getElementById('errorMessageDisplay');
            if (errorDisplay) errorDisplay.textContent = "Error loading base map list. Some maps may be unavailable.";
        }

        mapSelector.innerHTML = '';
        baseMapIndex.forEach(mapInfo => {
            const option = document.createElement('option');
            option.value = mapInfo.id;
            option.textContent = mapInfo.name;
            mapSelector.appendChild(option);
        });
        console.log("Base map options populated.");

        const userMapIndexUrl = `/user_assets/maps/mapIndex.json?t=${Date.now()}`;
        let userMapIndex = [];
        try {
            const userResponse = await fetch(userMapIndexUrl);
            if (userResponse.ok) {
                userMapIndex = await userResponse.json();
                if (userMapIndex && userMapIndex.length > 0) {
                    console.log("User map index found, adding to selector.");
                    if (baseMapIndex.length > 0 && userMapIndex.length > 0) {
                        const separator = document.createElement('option');
                        separator.disabled = true;
                        separator.textContent = '--- User Maps ---';
                        mapSelector.appendChild(separator);
                    }
                    userMapIndex.forEach(mapInfo => {
                        const option = document.createElement('option');
                        option.value = mapInfo.id;
                        option.textContent = `[User] ${mapInfo.name}`;
                        mapSelector.appendChild(option);
                    });
                    console.log("User maps added to selector.");
                    if (baseMapIndex.length === 0) {
                        assetManagerInstance.setMapIndexData(userMapIndex);
                    }
                }
            } else if (userResponse.status === 404) {
                console.log("User map index file (/user_assets/maps/mapIndex.json) not found, skipping.");
            } else {
                throw new Error(`HTTP error! status: ${userResponse.status} for user mapIndex.json`);
            }
        } catch (error) {
            console.error("Failed to load or process user map index:", error);
        }
        console.log("Map selector setup complete.");
    },

    scheduleRender: function () { // This function will be called from script.js
        if (!gameState.renderScheduled) {
            gameState.renderScheduled = true;
            requestAnimationFrame(() => {
                window.mapRenderer.renderMapLayers(); // Call using window.mapRenderer
                gameState.renderScheduled = false;
            });
        }
    },

    renderMapLayers: function () {
        // Animation updates are now handled by the main gameLoop in script.js

        const PLAYER_VISION_RADIUS = 120; // Will need to be 3D later
        const container = document.getElementById("mapContainer");
        const fullMapData = window.mapRenderer.getCurrentMapData(); // Contains all Z-levels in .levels

        if (!fullMapData || !fullMapData.dimensions || !fullMapData.levels) {
            if (container) container.innerHTML = "<p>No map loaded or map data is invalid (missing levels or dimensions).</p>";
            gameState.tileCache = null; // Ensure tileCache is cleared if map is invalid
            return;
        }

        const H = fullMapData.dimensions.height;
        const W = fullMapData.dimensions.width;

        if (H === 0 || W === 0) {
            if (container) container.innerHTML = "<p>Map dimensions are zero. Cannot render.</p>";
            gameState.tileCache = null;
            return;
        }

        const currentZ = gameState.currentViewZ;
        const currentZStr = currentZ.toString();
        const currentLevelData = fullMapData.levels[currentZStr];

        if (!currentLevelData) {
            // If the current view Z-level doesn't exist, we could show a message or render an empty void.
            // For now, let's clear the container and log, then return.
            // This might happen if player moves to a Z not defined or view changes to an undefined Z.
            if (container) container.innerHTML = `<p>No map data for Z-level ${currentZ}.</p>`;
            console.warn(`renderMapLayers: No data for currentViewZ = ${currentZ}.`);
            gameState.tileCache = null; // Clear cache as the Z-level is not valid for rendering
            return;
        }

        // FOW data for the current Z-level
        let currentFowData = gameState.fowData[currentZStr];
        if (!currentFowData || currentFowData.length !== H || (H > 0 && (!currentFowData[0] || currentFowData[0].length !== W))) {
            // Initialize FOW for this Z-level if it's missing or malformed
            currentFowData = Array(H).fill(null).map(() => Array(W).fill('hidden'));
            gameState.fowData[currentZStr] = currentFowData;
            logToConsole(`FOW data for Z-level ${currentZStr} was missing/invalid and re-initialized in renderMapLayers.`, "orange");
        }

        // Player position and FOW update logic.
        // FOW is updated for the Z-level the player is currently ON (gameState.playerPos.z).
        // The isTileVisible function now uses 3D calculations.
        if (gameState.playerPos && gameState.playerPos.x !== undefined && gameState.playerPos.y !== undefined && gameState.playerPos.z !== undefined) {
            const playerActualZStr = gameState.playerPos.z.toString();
            let fowDataForPlayerZ = gameState.fowData[playerActualZStr];

            // Initialize FOW for player's actual Z-level if it doesn't exist or is malformed
            if (!fowDataForPlayerZ || fowDataForPlayerZ.length !== H || (H > 0 && (!fowDataForPlayerZ[0] || fowDataForPlayerZ[0].length !== W))) {
                fowDataForPlayerZ = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                gameState.fowData[playerActualZStr] = fowDataForPlayerZ;
                logToConsole(`FOW data for player's actual Z-level ${playerActualZStr} was missing/invalid and (re)-initialized in renderMapLayers.`, "orange");
            }

            const playerX_fow = gameState.playerPos.x;
            const playerY_fow = gameState.playerPos.y;
            const playerZ_fow = gameState.playerPos.z;

            // Mark previously visible tiles on player's current Z-level as visited
            for (let r = 0; r < H; r++) {
                for (let c = 0; c < W; c++) {
                    if (fowDataForPlayerZ[r] && fowDataForPlayerZ[r][c] === 'visible') {
                        fowDataForPlayerZ[r][c] = 'visited';
                    }
                }
            }

            // Determine new visible tiles on player's current Z-level using 3D LOS
            for (let r = 0; r < H; r++) {
                for (let c = 0; c < W; c++) {
                    // Target for visibility check is on the same Z-level as the player for FOW updates
                    if (isTileVisible(playerX_fow, playerY_fow, playerZ_fow, c, r, playerZ_fow, PLAYER_VISION_RADIUS)) {
                        if (fowDataForPlayerZ[r] && fowDataForPlayerZ[r][c] !== undefined) {
                            fowDataForPlayerZ[r][c] = 'visible';
                        }
                    }
                }
            }

            // Ensure player's current tile on their Z-level is visible
            if (playerY_fow >= 0 && playerY_fow < H && playerX_fow >= 0 && playerX_fow < W) {
                if (fowDataForPlayerZ[playerY_fow] && typeof fowDataForPlayerZ[playerY_fow][playerX_fow] !== 'undefined') {
                    fowDataForPlayerZ[playerY_fow][playerX_fow] = 'visible';
                }
            }
        } else {
            logToConsole("Player position is undefined, skipping FOW update.", "warn");
        }

        // currentFowData (for gameState.currentViewZ) is used for actual rendering below.
        // It was already fetched/initialized prior to this block.

        let isInitialRender = false;
        // Tile cache is now per-Z. We might only cache the currentViewZ.
        // For this iteration, let's assume gameState.tileCache is for currentViewZ.
        // A full Z-level change (gameState.currentViewZ changes) would trigger an initial render for that Z.
        if (!gameState.tileCache ||
            gameState.tileCache.z !== currentZ || // Check if cache is for the current Z
            (H > 0 && gameState.tileCache.data.length !== H) ||
            (H > 0 && W > 0 && (!gameState.tileCache.data[0] || gameState.tileCache.data[0].length !== W))) {
            isInitialRender = true;
        }

        if (isInitialRender) {
            if (container) container.innerHTML = ""; // Clear container for new Z-level or initial load
            gameState.tileCache = {
                z: currentZ,
                data: Array(H).fill(null).map(() => Array(W).fill(null))
            };
        }

        const tileCacheData = gameState.tileCache.data; // Use the data part of the cache

        const fragment = isInitialRender ? document.createDocumentFragment() : null;

        const LIGHT_SOURCE_BRIGHTNESS_BOOST = 0.1;
        const currentAmbientColor = getAmbientLightColor(gameState.currentTime && typeof gameState.currentTime.hours === 'number' ? gameState.currentTime.hours : 12);
        const AMBIENT_STRENGTH_VISIBLE = 0.3;
        const AMBIENT_STRENGTH_VISITED = 0.2;

        // Clear targeting cursors from previous frame if not initial render
        if (!isInitialRender && tileCacheData) {
            for (let yCache = 0; yCache < tileCacheData.length; yCache++) {
                for (let xCache = 0; xCache < tileCacheData[yCache].length; xCache++) {
                    const cellToClear = tileCacheData[yCache][xCache];
                    if (cellToClear && cellToClear.span && cellToClear.span.classList.contains('flashing-targeting-cursor')) {
                        cellToClear.span.classList.remove('flashing-targeting-cursor');
                        // Restore original appearance (this part needs map data for the specific tile)
                        // This simplified restoration might be incorrect if tile underneath changed.
                        // A more robust way is to simply re-evaluate the tile fully.
                        // For now, this is a minimal attempt to clear the 'X'.
                        // The main loop below will correctly set the tile.
                        let originalSprite = '?'; // Fallback
                        let originalColor = 'magenta'; // Fallback
                        // Attempt to get original from currentLevelData (if available)
                        const landscapeTile = currentLevelData.landscape?.[yCache]?.[xCache];
                        const buildingTile = currentLevelData.building?.[yCache]?.[xCache];
                        const itemTile = currentLevelData.item?.[yCache]?.[xCache];
                        const roofTile = (gameState.showRoof && currentLevelData.roof?.[yCache]?.[xCache]);
                        let tileIdForRestore = roofTile || itemTile || buildingTile || landscapeTile || "";

                        if (tileIdForRestore && assetManagerInstance.tilesets[tileIdForRestore]) {
                            originalSprite = assetManagerInstance.tilesets[tileIdForRestore].sprite;
                            originalColor = assetManagerInstance.tilesets[tileIdForRestore].color;
                        }
                        cellToClear.span.textContent = originalSprite;
                        cellToClear.span.style.color = originalColor;
                        // Update cache to reflect this restoration if needed, or let the main loop do it.
                        cellToClear.sprite = originalSprite;
                        cellToClear.color = originalColor;
                        cellToClear.displayedId = tileIdForRestore;
                    }
                }
            }
        }

        // --- Render current Z-level (gameState.currentViewZ) ---
        // The layer order here determines what's "on top" visually if sprites overlap.
        // Standard: landscape, building, items, (roof if shown and part of this Z)
        // Then Player/NPCs/Animations are overlaid on this base.
        const layersOrder = ['landscape', 'building', 'item'];
        if (gameState.showRoof) { // Assuming 'roof' layer is for the current Z, not above.
            // If 'roof' is for Z+1, it's handled differently.
            layersOrder.push('roof');
        }

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let baseTileId = currentLevelData.landscape?.[y]?.[x] || ""; // Start with landscape
                let finalTileId = baseTileId; // This will be the ID of the topmost visible tile for this XY

                // Overlay building, then item, then roof (if shown)
                // This simplified overlay logic assumes empty strings for no tile.
                // A more robust system might use tile priorities or transparency flags.
                if (currentLevelData.building?.[y]?.[x]) finalTileId = currentLevelData.building[y][x];
                if (currentLevelData.item?.[y]?.[x]) finalTileId = currentLevelData.item[y][x];
                if (gameState.showRoof && currentLevelData.roof?.[y]?.[x]) {
                    finalTileId = currentLevelData.roof[y][x];
                }

                // If finalTileId is empty after checking all layers, use the base (landscape) or default to space.
                if (finalTileId === "") finalTileId = baseTileId;


                let originalSprite = "";
                let originalColor = "";

                if (finalTileId) { // If there's any tile to render
                    const def = assetManagerInstance.tilesets[finalTileId]; // Use getTileDefinition if aliases are needed
                    if (def) {
                        originalSprite = def.sprite;
                        originalColor = def.color;
                    } else {
                        originalSprite = '?'; // Unknown tile
                        originalColor = 'magenta';
                    }
                } else {
                    originalSprite = ' '; // Empty space
                    originalColor = 'black'; // Or background color
                }

                let fowStatus = 'hidden';
                if (currentFowData && currentFowData[y] && typeof currentFowData[y][x] !== 'undefined') {
                    fowStatus = currentFowData[y][x];
                }

                let displaySprite = originalSprite;
                let displayColor = originalColor;
                let displayId = finalTileId || "";

                // --- TEMPORARY DEBUGGING FOR CONTAINERS ---
                // This needs to check based on finalTileId and its definition
                if (finalTileId && assetManagerInstance && assetManagerInstance.tilesets) {
                    const tempTileDef = assetManagerInstance.tilesets[finalTileId];
                    if (tempTileDef && tempTileDef.tags && tempTileDef.tags.includes('container')) {
                        // displayColor = 'fuchsia'; // Keep or remove debug color
                    }
                }
                // --- END TEMPORARY DEBUGGING ---

                if (fowStatus === 'hidden') {
                    displaySprite = ' ';
                    displayColor = '#1a1a1a'; // Dark color for hidden FOW
                    displayId = 'FOW_HIDDEN';
                } else if (fowStatus === 'visited') {
                    const visitedColorStyle = (c) => {
                        if (typeof c !== 'string' || !c.startsWith('#')) return '#505050';
                        try {
                            let r = parseInt(c.substring(1, 3), 16) || 0;
                            let g = parseInt(c.substring(3, 5), 16) || 0;
                            let b = parseInt(c.substring(5, 7), 16) || 0;
                            r = Math.max(0, Math.floor(r * 0.6));
                            g = Math.max(0, Math.floor(g * 0.6));
                            b = Math.max(0, Math.floor(b * 0.6));
                            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        } catch (e) { return '#505050'; }
                    };
                    displayColor = visitedColorStyle(originalColor);
                }

                // Lighting: Filter light sources by current Z for now
                // TODO: isTileIlluminated will need to be 3D
                const lightsOnCurrentZ = gameState.lightSources.filter(ls => ls.z === currentZ);

                if (fowStatus === 'visible' || fowStatus === 'visited') {
                    let isLit = false;
                    if (lightsOnCurrentZ.length > 0) {
                        for (const source of lightsOnCurrentZ) {
                            if (isTileIlluminated(x, y, source)) { // isTileIlluminated needs to be Z-aware or receive currentLevelData
                                isLit = true;
                                break;
                            }
                        }
                    }

                    if (fowStatus === 'visible') {
                        if (isLit) {
                            let activeLight = null;
                            for (const source of lightsOnCurrentZ) {
                                if (isTileIlluminated(x, y, source)) { activeLight = source; break; }
                            }
                            if (activeLight && activeLight.color && typeof activeLight.intensity === 'number') {
                                const brightenedBase = brightenColor(originalColor, LIGHT_SOURCE_BRIGHTNESS_BOOST);
                                displayColor = blendColors(brightenedBase, activeLight.color, activeLight.intensity / 2);
                            } else {
                                displayColor = brightenColor(originalColor, LIGHT_SOURCE_BRIGHTNESS_BOOST / 2);
                            }
                        } else {
                            displayColor = blendColors(originalColor, currentAmbientColor, AMBIENT_STRENGTH_VISIBLE);
                        }
                    } else if (fowStatus === 'visited') {
                        if (isLit) {
                            let activeLight = null;
                            for (const source of lightsOnCurrentZ) {
                                if (isTileIlluminated(x, y, source)) { activeLight = source; break; }
                            }
                            if (activeLight && activeLight.color && typeof activeLight.intensity === 'number') {
                                const slightlyBrightenedVisited = brightenColor(displayColor, LIGHT_SOURCE_BRIGHTNESS_BOOST / 2);
                                displayColor = blendColors(slightlyBrightenedVisited, activeLight.color, activeLight.intensity * 0.25);
                            } else {
                                displayColor = blendColors(displayColor, currentAmbientColor, AMBIENT_STRENGTH_VISITED);
                            }
                        } else {
                            displayColor = blendColors(displayColor, currentAmbientColor, AMBIENT_STRENGTH_VISITED);
                        }
                    }
                }

                let finalSpriteForTile = displaySprite;
                let finalColorForTile = displayColor;
                let finalDisplayIdForTile = displayId;

                // Player rendering: only if player's Z matches currentViewZ
                const isPlayerCurrentlyOnThisTileAndZ = (gameState.playerPos &&
                    x === gameState.playerPos.x &&
                    y === gameState.playerPos.y &&
                    gameState.playerPos.z === currentZ);

                if (isPlayerCurrentlyOnThisTileAndZ) {
                    const playerFowStatus = currentFowData?.[y]?.[x]; // Use current Z's FOW
                    // Roof obscuring player would depend on roof data for *this* Z-level, or potentially Z+1.
                    // For now, use showRoof and roof data from currentLevelData.
                    const roofIsObscuringPlayer = gameState.showRoof && currentLevelData.roof?.[y]?.[x];

                    if (playerFowStatus === 'visible' && !roofIsObscuringPlayer) {
                        let drawStaticPlayer = true;
                        // Combat animation check (needs to be Z-aware if animations can cross Z)
                        if (gameState.activeAnimations && gameState.activeAnimations.length > 0) {
                            const playerCombatAnim = gameState.activeAnimations.find(anim =>
                                anim.visible &&
                                (anim.type === 'meleeSwing' || anim.type === 'rangedBullet' || anim.type === 'throwing') &&
                                anim.data.attacker === gameState &&
                                Math.floor(anim.x) === x && Math.floor(anim.y) === y &&
                                (anim.z === undefined || anim.z === currentZ) // Check Z if animation has it
                            );
                            if (playerCombatAnim) drawStaticPlayer = false;
                        }
                        if (drawStaticPlayer) {
                            finalSpriteForTile = "☻";
                            finalColorForTile = "green";
                            finalDisplayIdForTile = "PLAYER_STATIC";
                        }
                    }
                }

                // Update or create cache entry
                if (isInitialRender) {
                    const span = document.createElement("span");
                    span.className = "tile";
                    span.dataset.x = x;
                    span.dataset.y = y;
                    span.textContent = finalSpriteForTile;
                    span.style.color = finalColorForTile;

                    // Item highlight logic (needs to check floorItems on currentZ)
                    let tileHighlightColor = "";
                    if (fowStatus === 'visible' && window.gameState && window.gameState.floorItems) {
                        const itemsOnThisTileAndZ = window.gameState.floorItems.filter(fi => fi.x === x && fi.y === y && fi.z === currentZ);
                        if (itemsOnThisTileAndZ.length > 0) {
                            // Simplified: just check if any item is present. Impassable check would go here too.
                            const currentTileDefForHighlight = assetManagerInstance.tilesets[finalTileId];
                            let impassableTileBlockingItemHighlight = false;
                            if (currentTileDefForHighlight && currentTileDefForHighlight.tags && currentTileDefForHighlight.tags.includes("impassable")) {
                                if (!currentTileDefForHighlight.tags.includes("door") &&
                                    !currentTileDefForHighlight.tags.includes("window") &&
                                    !currentTileDefForHighlight.tags.includes("container")) {
                                    impassableTileBlockingItemHighlight = true;
                                }
                            }
                            if (!impassableTileBlockingItemHighlight) tileHighlightColor = "rgba(255, 255, 0, 0.3)";
                        }
                    }
                    span.style.backgroundColor = tileHighlightColor;

                    if (!tileCacheData[y]) tileCacheData[y] = Array(W).fill(null);
                    tileCacheData[y][x] = {
                        span: span,
                        displayedId: finalDisplayIdForTile,
                        sprite: finalSpriteForTile,
                        color: finalColorForTile
                    };
                    if (fragment) fragment.appendChild(span);
                } else {
                    const cachedCell = tileCacheData[y]?.[x];
                    if (cachedCell && cachedCell.span) {
                        const span = cachedCell.span;
                        if (cachedCell.sprite !== finalSpriteForTile || cachedCell.color !== finalColorForTile) {
                            span.textContent = finalSpriteForTile;
                            span.style.color = finalColorForTile;
                            cachedCell.sprite = finalSpriteForTile;
                            cachedCell.color = finalColorForTile;
                        }
                        cachedCell.displayedId = finalDisplayIdForTile;

                        let tileHighlightColor = "";
                        if (fowStatus === 'visible' && window.gameState && window.gameState.floorItems) {
                            const itemsOnThisTileAndZ = window.gameState.floorItems.filter(fi => fi.x === x && fi.y === y && fi.z === currentZ);
                            if (itemsOnThisTileAndZ.length > 0) {
                                const currentTileDefForHighlight = assetManagerInstance.tilesets[finalTileId];
                                let impassableTileBlockingItemHighlight = false;
                                if (currentTileDefForHighlight && currentTileDefForHighlight.tags && currentTileDefForHighlight.tags.includes("impassable")) {
                                    if (!currentTileDefForHighlight.tags.includes("door") &&
                                        !currentTileDefForHighlight.tags.includes("window") &&
                                        !currentTileDefForHighlight.tags.includes("container")) {
                                        impassableTileBlockingItemHighlight = true;
                                    }
                                }
                                if (!impassableTileBlockingItemHighlight) tileHighlightColor = "rgba(255, 255, 0, 0.3)";
                            }
                        }
                        if (span.style.backgroundColor !== tileHighlightColor) {
                            span.style.backgroundColor = tileHighlightColor;
                        }

                        if (span.classList.contains('flashing-targeting-cursor') &&
                            !(gameState.isTargetingMode && x === gameState.targetingCoords.x && y === gameState.targetingCoords.y /* && targeting Z matches? */)) {
                            span.classList.remove('flashing-targeting-cursor');
                        }
                    }
                }
            }
            if (isInitialRender && fragment) {
                const br = document.createElement("br");
                fragment.appendChild(br);
            }
        }

        // --- START: Render Environmental Effects (Smoke, Tear Gas) on current Z-level ---
        // This logic needs to be Z-aware.
        const environmentalEffectsToRender = [];
        if (gameState.environmentalEffects) {
            if (gameState.environmentalEffects.smokeTiles) {
                environmentalEffectsToRender.push(...gameState.environmentalEffects.smokeTiles
                    .filter(eff => eff.z === currentZ && eff.duration > 0)
                    .map(eff => ({ ...eff, type: 'smoke' })));
            }
            if (gameState.environmentalEffects.tearGasTiles) {
                environmentalEffectsToRender.push(...gameState.environmentalEffects.tearGasTiles
                    .filter(eff => eff.z === currentZ && eff.duration > 0)
                    .map(eff => ({ ...eff, type: 'tearGas' })));
            }
        }

        if (environmentalEffectsToRender.length > 0 && tileCacheData) {
            environmentalEffectsToRender.forEach(effect => {
                const x = effect.x;
                const y = effect.y;
                if (y >= 0 && y < H && x >= 0 && x < W) {
                    const fowStatus = currentFowData?.[y]?.[x];
                    if (fowStatus === 'visible' || fowStatus === 'visited') {
                        const cachedCell = tileCacheData[y]?.[x];
                        if (cachedCell && cachedCell.span) {
                            let effectSprite = '?';
                            let effectColor = '#FFFFFF';
                            if (effect.type === 'smoke') {
                                const smokeSprites = ['░', '▒', '▓'];
                                effectSprite = smokeSprites[Math.floor(Math.random() * smokeSprites.length)];
                                effectColor = '#888888';
                            } else if (effect.type === 'tearGas') {
                                const gasSprites = ['~', ';', ','];
                                effectSprite = gasSprites[Math.floor(Math.random() * gasSprites.length)];
                                effectColor = '#B8B868';
                            }
                            cachedCell.span.textContent = effectSprite;
                            cachedCell.span.style.color = effectColor;
                            // Update cache if these effects are meant to replace the tile visually
                            cachedCell.sprite = effectSprite;
                            cachedCell.color = effectColor;
                        }
                    }
                }
            });
        }
        // --- END: Render Environmental Effects ---

        // Append the main fragment for the current Z-level
        if (isInitialRender && container && fragment) {
            container.appendChild(fragment);
        }

        // --- Overlay rendering for Z-1 (Below) and Z+1 (Above) Layers ---
        // This simplified approach modifies the visual appearance of current Z-level tiles
        // if they are transparent, to give a glimpse of adjacent Z-levels.
        // It does not create new DOM elements for adjacent layers.

        const Z_BELOW_DARKEN_FACTOR = 0.6;
        const Z_ABOVE_DARKEN_FACTOR = 0.4;
        const Z_ABOVE_TINT_COLOR = '#7070A0';
        const Z_ABOVE_TINT_FACTOR = 0.5;

        const overlayAdjacentTile = (x, y, adjacentLevelData, isAboveLayer) => {
            if (!adjacentLevelData || !tileCacheData[y] || !tileCacheData[y][x]) return;

            const currentCachedCell = tileCacheData[y][x];
            const currentSpan = currentCachedCell.span;

            // Determine if the current Z-level tile at (x,y) is "see-through"
            // A tile is see-through if it's empty or explicitly tagged as transparent_floor.
            let isCurrentTileSeeThrough = false;
            const currentTileIdOnViewZ = currentCachedCell.displayedId; // ID of the actual tile on current Z

            if (!currentTileIdOnViewZ || currentTileIdOnViewZ === "FOW_HIDDEN" || currentTileIdOnViewZ === "PLAYER_STATIC" || currentTileIdOnViewZ.startsWith("NPC_")) {
                // If cell is FOW hidden, or occupied by player/NPC, consider it not see-through for simplicity of overlay.
                // Player/NPCs are rendered on top of everything else on their Z, so overlaying under them is complex.
                // If it's purely landscape and empty, or a transparent floor, then it is see-through.
                const landscapeIdCurrentZ = currentLevelData.landscape?.[y]?.[x];
                if (!currentLevelData.building?.[y]?.[x] &&
                    !currentLevelData.item?.[y]?.[x] &&
                    !(gameState.showRoof && currentLevelData.roof?.[y]?.[x])) {
                    if (!landscapeIdCurrentZ) {
                        isCurrentTileSeeThrough = true; // No landscape, building, item, or roof - pure empty space
                    } else {
                        const landscapeDef = assetManagerInstance.tilesets[landscapeIdCurrentZ];
                        if (landscapeDef && landscapeDef.tags && landscapeDef.tags.includes('transparent_floor')) {
                            isCurrentTileSeeThrough = true;
                        }
                    }
                }
            } else {
                const currentDef = assetManagerInstance.tilesets[currentTileIdOnViewZ];
                if (currentDef && currentDef.tags && currentDef.tags.includes('transparent_floor')) {
                    isCurrentTileSeeThrough = true;
                } else if (!currentTileIdOnViewZ) { // If no tile ID, it's empty space
                    isCurrentTileSeeThrough = true;
                }
            }


            if (isCurrentTileSeeThrough) {
                let overlayTileId = adjacentLevelData.landscape?.[y]?.[x] || "";
                if (adjacentLevelData.building?.[y]?.[x]) overlayTileId = adjacentLevelData.building[y][x];
                // Add other structural layers from adjacent levels if needed (e.g. 'roof' if it acts as a floor for level above)

                if (overlayTileId) {
                    const def = assetManagerInstance.tilesets[overlayTileId];
                    if (def) {
                        let displayColor = def.color;
                        if (isAboveLayer) {
                            displayColor = blendColors(def.color, '#000000', Z_ABOVE_DARKEN_FACTOR);
                            displayColor = blendColors(displayColor, Z_ABOVE_TINT_COLOR, Z_ABOVE_TINT_FACTOR);
                        } else { // Below layer
                            displayColor = blendColors(def.color, '#000000', Z_BELOW_DARKEN_FACTOR);
                        }

                        // Directly modify the span's content and style for the overlay effect.
                        // This assumes the span element corresponds to the currentViewZ's grid.
                        currentSpan.textContent = def.sprite;
                        currentSpan.style.color = displayColor;
                        // We do NOT update currentCachedCell.sprite, .color, or .displayedId here,
                        // as those represent the actual tile on currentViewZ. This is a visual overlay only.
                    }
                }
            }
        };

        const belowZLevelKey = (currentZ - 1).toString();
        const aboveZLevelKey = (currentZ + 1).toString();
        const levelDataBelow = fullMapData.levels[belowZLevelKey];
        const levelDataAbove = fullMapData.levels[aboveZLevelKey];

        if (levelDataBelow) {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    overlayAdjacentTile(x, y, levelDataBelow, false);
                }
            }
        }
        if (levelDataAbove) {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    overlayAdjacentTile(x, y, levelDataAbove, true);
                }
            }
        }

        // NPC Rendering: Only NPCs on the current Z-level
        if (gameState.npcs && gameState.npcs.length > 0 && tileCacheData) {
            gameState.npcs.forEach(npc => {
                if (!npc.mapPos || npc.mapPos.z !== currentZ) return; // Skip if not on current Z

                let isBeingAnimated = false;
                if (gameState.activeAnimations && gameState.activeAnimations.length > 0) {
                    const npcMoveAnim = gameState.activeAnimations.find(anim =>
                        anim.type === 'movement' && anim.data.entity === npc && anim.visible &&
                        (anim.z === undefined || anim.z === currentZ) // Check Z if animation has it
                    );
                    if (npcMoveAnim) isBeingAnimated = true;
                }

                if (!isBeingAnimated) {
                    const npcX = npc.mapPos.x;
                    const npcY = npc.mapPos.y;
                    if (npcX >= 0 && npcX < W && npcY >= 0 && npcY < H) {
                        // Roof obscuring NPC needs to consider roof on current Z or Z+1. Simplified for now.
                        const roofObscures = gameState.showRoof && currentLevelData.roof?.[npcY]?.[npcX];
                        const playerIsHere = (npcX === gameState.playerPos.x && npcY === gameState.playerPos.y && gameState.playerPos.z === currentZ);
                        const isTargetingCursorHere = gameState.isTargetingMode && npcX === gameState.targetingCoords.x && npcY === gameState.targetingCoords.y; // Targeting Z check needed later

                        if (!roofObscures && !playerIsHere && !isTargetingCursorHere) {
                            const cachedCell = tileCacheData[npcY]?.[npcX];
                            if (cachedCell && cachedCell.span) {
                                cachedCell.span.textContent = npc.sprite;
                                cachedCell.span.style.color = npc.color;
                                cachedCell.sprite = npc.sprite;
                                cachedCell.color = npc.color;
                            }
                        }
                    }
                }
            });
        }

        // Render Active Animations on current Z-level
        if (gameState.activeAnimations && gameState.activeAnimations.length > 0 && tileCacheData) {
            gameState.activeAnimations.forEach(anim => {
                if (!anim.visible || (anim.z !== undefined && anim.z !== currentZ)) return; // Skip if not on current Z

                if (anim.type === 'explosion') {
                    // Explosion logic needs to be 3D, for now, only render if center Z matches currentZ
                    if (anim.centerPos && anim.centerPos.z === currentZ && anim.explosionSprites) {
                        // ... (rest of explosion rendering, ensuring it uses tileCacheData)
                        const spriteToRender = anim.explosionSprites[anim.currentFrameIndex];
                        if (!spriteToRender) return;
                        const colorToRender = anim.color;
                        const centerX = Math.floor(anim.centerPos.x);
                        const centerY = Math.floor(anim.centerPos.y);
                        const radius = Math.floor(anim.currentExpansionRadius);

                        for (let y_anim = Math.max(0, centerY - radius); y_anim <= Math.min(H - 1, centerY + radius); y_anim++) {
                            for (let x_anim = Math.max(0, centerX - radius); x_anim <= Math.min(W - 1, centerX + radius); x_anim++) {
                                const dx = x_anim - centerX;
                                const dy = y_anim - centerY;
                                if (dx * dx + dy * dy <= radius * radius) {
                                    const cachedCell = tileCacheData[y_anim]?.[x_anim];
                                    if (cachedCell && cachedCell.span) {
                                        cachedCell.span.textContent = spriteToRender;
                                        cachedCell.span.style.color = colorToRender;
                                        cachedCell.sprite = spriteToRender;
                                        cachedCell.color = colorToRender;
                                    }
                                }
                            }
                        }
                    }
                } else if (anim.type === 'flamethrower') {
                    if (anim.flameParticles && anim.flameParticles.length > 0) {
                        anim.flameParticles.forEach(particle => {
                            if (particle.z !== undefined && particle.z !== currentZ) return; // Check Z
                            const particleX = Math.floor(particle.x);
                            const particleY = Math.floor(particle.y);
                            if (particleX >= 0 && particleX < W && particleY >= 0 && particleY < H) {
                                const cachedCell = tileCacheData[particleY]?.[particleX];
                                if (cachedCell && cachedCell.span) {
                                    cachedCell.span.textContent = particle.sprite;
                                    cachedCell.span.style.color = particle.color;
                                }
                            }
                        });
                    }
                } else if (anim.type === 'gasCloud') {
                    if (anim.particles && anim.particles.length > 0) {
                        anim.particles.forEach(particle => {
                            if (particle.opacity <= 0 || (particle.z !== undefined && particle.z !== currentZ)) return;
                            const particleX = Math.floor(particle.x);
                            const particleY = Math.floor(particle.y);
                            if (particleX >= 0 && particleX < W && particleY >= 0 && particleY < H) {
                                const cachedCell = tileCacheData[particleY]?.[particleX];
                                if (cachedCell && cachedCell.span) {
                                    cachedCell.span.textContent = particle.sprite;
                                    let r = parseInt(particle.color.substring(1, 3), 16);
                                    let g = parseInt(particle.color.substring(3, 5), 16);
                                    let b = parseInt(particle.color.substring(5, 7), 16);
                                    const bgR = 50, bgG = 50, bgB = 50;
                                    r = Math.floor(r * particle.opacity + bgR * (1 - particle.opacity));
                                    g = Math.floor(g * particle.opacity + bgG * (1 - particle.opacity));
                                    b = Math.floor(b * particle.opacity + bgB * (1 - particle.opacity));
                                    cachedCell.span.style.color = `rgb(${r},${g},${b})`;
                                }
                            }
                        });
                    }
                } else if (anim.sprite) { // Other single-sprite animations
                    const animX = Math.floor(anim.x);
                    const animY = Math.floor(anim.y);
                    // Ensure anim.z check if applicable for this animation type
                    if (animX >= 0 && animX < W && animY >= 0 && animY < H) {
                        const cachedCell = tileCacheData[animY]?.[animX];
                        if (cachedCell && cachedCell.span) {
                            cachedCell.span.textContent = anim.sprite;
                            cachedCell.span.style.color = anim.color;
                            cachedCell.sprite = anim.sprite;
                            cachedCell.color = anim.color;
                        }
                    }
                }
            });
        }

        // Targeting Cursor
        if (gameState.isTargetingMode && tileCacheData) {
            const targetX = gameState.targetingCoords.x;
            const targetY = gameState.targetingCoords.y;
            const targetZ = gameState.targetingCoords.z; // Get target Z

            // Only display the 'X' cursor if the target's Z matches the current view Z
            if (targetZ === currentZ) {
                if (targetX >= 0 && targetX < W && targetY >= 0 && targetY < H) {
                    const cachedCell = tileCacheData[targetY]?.[targetX];
                    if (cachedCell && cachedCell.span) {
                        // Check if player or NPC is already on this tile, if so, don't overwrite their sprite with 'X'
                        // Instead, apply the flashing class to highlight them or the tile.
                        // The actual textContent ('X') should only be set if the tile is not occupied by player/NPC.
                        // For now, the flashing class will highlight whatever is there.
                        // A more advanced solution might overlay the 'X' or change background.

                        // If player is on the target tile, 'X' might obscure player.
                        // If NPC is on the target tile, 'X' might obscure NPC.
                        // The current logic below will set textContent to 'X'.
                        // This could be refined to make the 'X' a background or border effect
                        // if something important is already on the tile.
                        // For now, keeping it simple: 'X' shows on the target tile of the current view Z.

                        cachedCell.span.textContent = 'X'; // This will overwrite existing content like player/NPC
                        cachedCell.span.style.color = 'red';
                        if (!cachedCell.span.classList.contains('flashing-targeting-cursor')) {
                            cachedCell.span.classList.add('flashing-targeting-cursor');
                        }
                    }
                }
            }
            // TODO: Optionally, add an indicator for off-Z targets if they are visible 
            // (e.g., through a grate). For instance, change the color of the grate tile.
            // This would require knowing which tile on currentViewZ corresponds to the view of targetX, targetY on targetZ.
        }

        // Combat highlights (attacker/defender) - needs Z awareness for positions
        if (gameState.isInCombat && tileCacheData) {
            // Clear previous highlights first to handle movement
            // This is a simplified clear; a more robust way would track previously highlighted cells.
            // For now, this relies on the main render loop re-evaluating background colors.
            // The `isAttackerHighlighted` and `isDefenderHighlighted` datasets are not standard and might not be used by CSS.
            // Better to clear background color directly if it was set.
            // This clearing loop might be inefficient. Consider clearing only if necessary.
            /*
            if (!isInitialRender) { // Only if not initial render, as initial render clears all.
                for (let yCache = 0; yCache < tileCacheData.length; yCache++) {
                    for (let xCache = 0; xCache < tileCacheData[yCache].length; xCache++) {
                        const cellToClear = tileCacheData[yCache][xCache];
                        if (cellToClear && cellToClear.span && cellToClear.span.style.backgroundColor !== "") {
                            // Check if it was a combat highlight color, then clear.
                            // This needs a more specific check if other things set background colors.
                            // For now, assuming only combat highlights set it this way.
                            // cellToClear.span.style.backgroundColor = ""; // Clear background
                        }
                    }
                }
            }
            */
            // The above clearing logic is commented out as it might be too aggressive or incorrect.
            // The main rendering loop should correctly set backgrounds each frame.
            // The flashing-targeting-cursor is handled separately above.

            if (gameState.attackerMapPos && gameState.attackerMapPos.z === currentZ) {
                const attackerCell = tileCacheData[gameState.attackerMapPos.y]?.[gameState.attackerMapPos.x];
                if (attackerCell && attackerCell.span) {
                    attackerCell.span.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                    // attackerCell.span.dataset.isAttackerHighlighted = 'true'; // dataset not used by CSS currently
                }
            }
            if (gameState.defenderMapPos && gameState.defenderMapPos.z === currentZ) {
                const defenderCell = tileCacheData[gameState.defenderMapPos.y]?.[gameState.defenderMapPos.x];
                if (defenderCell && defenderCell.span) {
                    defenderCell.span.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';
                    // defenderCell.span.dataset.isDefenderHighlighted = 'true'; // dataset not used by CSS currently
                }
            }
        }
        this.updateMapHighlight(); // This function also needs to be Z-aware if interactableItems can be on other Zs.

        if (window.gameState && window.gameState.activeAnimations && window.gameState.activeAnimations.filter(a => a.z === undefined || a.z === currentZ).length > 0) {
            window.mapRenderer.scheduleRender();
        }
    },

    updateMapHighlight: function () {
        document.querySelectorAll('.tile.flashing')
            .forEach(el => el.classList.remove('flashing'));

        const idx = gameState.selectedItemIndex;
        if (!gameState.interactableItems || idx < 0 || idx >= gameState.interactableItems.length) return;

        const it = gameState.interactableItems[idx];
        // Only highlight if the item is on the current viewing Z-level
        if (!it || (it.z !== undefined && it.z !== gameState.currentViewZ)) return;

        const x = it.x;
        const y = it.y;

        if (typeof x !== 'number' || typeof y !== 'number') return;

        // Access tileCache for the current Z
        const tileCacheData = gameState.tileCache && gameState.tileCache.z === gameState.currentViewZ ? gameState.tileCache.data : null;
        if (!tileCacheData) return;

        const cachedCell = tileCacheData[y]?.[x];
        if (cachedCell && cachedCell.span) {
            cachedCell.span.classList.add('flashing');
        } else {
            // Fallback query if not in cache (should ideally be in cache)
            const span = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
            if (span) span.classList.add('flashing');
        }
    },

    toggleRoof: function () {
        gameState.showRoof = !gameState.showRoof;
        this.scheduleRender();
        if (typeof logToConsole === 'function') logToConsole("Roof layer toggled " + (gameState.showRoof ? "on" : "off"));
        else console.log("Roof layer toggled " + (gameState.showRoof ? "on" : "off"));
    },

    isPassable: function (tileId) { // This will need to take Z into account for actual game logic
        if (!tileId) return true;
        const tileData = assetManagerInstance?.tilesets?.[tileId];
        if (!tileData) return true;
        const tags = tileData.tags || [];
        return !tags.includes("impassable");
    },

    getCollisionTileAt: function (x, y, z) {
        const mapData = this.getCurrentMapData(); // This is fullMapData, includes .levels
        if (!mapData || !mapData.levels || !mapData.dimensions ||
            x < 0 || y < 0 || z === undefined ||
            y >= mapData.dimensions.height || x >= mapData.dimensions.width) {
            return ""; // Out of bounds or invalid data
        }

        const zStr = z.toString();
        const levelData = mapData.levels[zStr];
        if (!levelData) return ""; // No data for this Z-level

        const tilesets = assetManagerInstance?.tilesets;
        if (!tilesets) return ""; // Tileset definitions not available

        // Define layer precedence for collision. Building > Item > Landscape.
        // Roofs are generally not collision objects unless they are floors of an upper level.
        // This function checks for collision *on the given Z level*.
        const collisionLayerOrder = ['building', 'item', 'landscape'];

        for (const layerName of collisionLayerOrder) {
            const layer = levelData[layerName];
            const tileId = layer?.[y]?.[x];
            if (tileId) {
                // Handle cases where tileId might be an object (e.g. from map maker instance properties)
                const baseTileId = (typeof tileId === 'object' && tileId.tileId) ? tileId.tileId : tileId;
                const tileDef = tilesets[baseTileId];
                if (tileDef && tileDef.tags && tileDef.tags.includes('impassable')) {
                    return baseTileId; // Found an impassable tile
                }
            }
        }
        return ""; // No impassable tile found at this x,y,z on the checked layers
    }
};
