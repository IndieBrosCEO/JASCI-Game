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

// Add this new helper function near isTileBlockingVision
function isTileBlockingLight(tileX, tileY) {
    const mapData = window.mapRenderer.getCurrentMapData();
    const currentAssetManager = assetManagerInstance; // module-scoped variable
    if (!mapData || !mapData.layers || !currentAssetManager || !currentAssetManager.tilesets) {
        return false; // Default to not blocking if data is missing
    }

    const layersToConsider = ['landscape', 'building'];
    if (gameState.showRoof) {
        layersToConsider.push('roof');
    }

    for (const layerName of layersToConsider) {
        const layer = mapData.layers[layerName];
        if (layer && layer[tileY] && typeof layer[tileY][tileX] !== 'undefined' && layer[tileY][tileX] !== null && layer[tileY][tileX] !== "") {
            const tileId = layer[tileY][tileX];
            if (tileId) {
                const tileDef = currentAssetManager.tilesets[tileId];
                if (tileDef && tileDef.tags) {
                    // If tile is explicitly transparent to vision, it's also transparent to light for now.
                    if (tileDef.tags.includes('allows_vision') || tileDef.tags.includes('transparent')) {
                        return false; // Does NOT block light
                    }
                    // Otherwise, standard blocking rules apply (or a new 'blocks_light' tag could be checked)
                    if (tileDef.tags.includes('impassable') || tileDef.tags.includes('blocks_vision')) {
                        return true; // Blocks light
                    }
                }
            }
        }
    }
    return false; // Default: does not block light
}

// Add this new helper function
function isTileIlluminated(tileX, tileY, lightSource) {
    const sourceX = lightSource.x;
    const sourceY = lightSource.y;
    const sourceRadius = lightSource.radius;

    const distance = Math.sqrt(Math.pow(tileX - sourceX, 2) + Math.pow(tileY - sourceY, 2));
    if (distance > sourceRadius) {
        return false;
    }
    // If the tile is the light source itself, it's illuminated.
    if (tileX === sourceX && tileY === sourceY) return true;
    // If very close, consider it illuminated without needing a full raycast (can be adjusted)
    if (distance <= 0.5) return true;

    const line = getLine(sourceX, sourceY, tileX, tileY); // Assumes getLine is globally available
    if (line.length < 2) return true; // Source and target are same or adjacent, effectively.

    // Check intermediate points for obstruction.
    // line[0] is the light source tile.
    // line[line.length-1] is the target tile.
    // We need to check tiles from line[1] up to line[line.length-2].
    for (let i = 1; i < line.length - 1; i++) {
        const point = line[i];
        if (isTileBlockingLight(point.x, point.y)) { // Assumes isTileBlockingLight is correct
            return false; // Light blocked by an intermediate tile
        }
    }
    return true; // No obstruction found along the line to the target tile
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

function isTileBlockingVision(tileX, tileY) {
    const mapData = window.mapRenderer.getCurrentMapData();
    const currentAssetManager = assetManagerInstance; // module-scoped variable
    if (!mapData || !mapData.layers || !currentAssetManager || !currentAssetManager.tilesets) {
        return false; // Should not happen if map is loaded
    }

    const layersToConsider = ['landscape', 'building'];
    if (gameState.showRoof) {
        layersToConsider.push('roof');
    }

    for (const layerName of layersToConsider) {
        const layer = mapData.layers[layerName];
        if (layer && layer[tileY] && typeof layer[tileY][tileX] !== 'undefined' && layer[tileY][tileX] !== null && layer[tileY][tileX] !== "") {
            const tileId = layer[tileY][tileX];
            if (tileId) {
                const tileDef = currentAssetManager.tilesets[tileId];
                if (tileDef && tileDef.tags) {
                    // Check for transparency first
                    if (tileDef.tags.includes('allows_vision') || tileDef.tags.includes('transparent')) {
                        return false; // This tile is transparent, does NOT block vision
                    }
                    // If not transparent, then check if it blocks vision normally
                    if (tileDef.tags.includes('impassable') || tileDef.tags.includes('blocks_vision')) {
                        return true; // This tile is a standard vision blocker
                    }
                }
            }
        }
    }
    return false; // Tile does not block vision if no blocking tags are found or if it's transparent
}

function isTileVisible(playerX, playerY, targetX, targetY, visionRadius) {
    const distance = Math.sqrt(Math.pow(targetX - playerX, 2) + Math.pow(targetY - playerY, 2));
    if (distance > visionRadius) {
        return false;
    }
    if (playerX === targetX && playerY === targetY) return true;
    const line = getLine(playerX, playerY, targetX, targetY); // Calls getLine
    if (distance <= 1.5) {
        if (line.length > 1) {
            const firstStep = line[1];
            // Calls isTileBlockingVision
            if (isTileBlockingVision(firstStep.x, firstStep.y) && !(firstStep.x === targetX && firstStep.y === targetY)) {
                return false;
            }
        }
        return true;
    }
    if (line.length < 2) return true;
    for (let i = 1; i < line.length - 1; i++) {
        const point = line[i];
        if (isTileBlockingVision(point.x, point.y)) { // Calls isTileBlockingVision
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
        currentMapData = mapData;
        gameState.lightSources = []; // Clear existing light sources
        gameState.containers = []; // Clear existing container instances

        // FOW Initialization Block
        if (mapData && mapData.dimensions) {
            const H = mapData.dimensions.height;
            const W = mapData.dimensions.width;
            if (H > 0 && W > 0) {
                gameState.fowData = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                // Optional: console.log or logToConsole for successful init

                // Populate static light sources from map tiles
                const layersToScanForLights = ['landscape', 'building', 'item']; // Add other layers if needed
                for (const layerName of layersToScanForLights) {
                    const layer = mapData.layers[layerName];
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
                if (typeof logToConsole === 'function' && gameState.lightSources.length > 0) {
                    logToConsole(`Initialized ${gameState.lightSources.length} static light sources from map tiles.`);
                }

                // Populate container instances from map tiles
                const layersToScanForContainers = ['item', 'building']; // Add other layers if needed
                for (const layerName of layersToScanForContainers) {
                    const layer = mapData.layers[layerName];
                    if (layer) {
                        for (let r = 0; r < H; r++) {
                            for (let c = 0; c < W; c++) {
                                const tileId = layer[r]?.[c];
                                if (tileId && assetManagerInstance && assetManagerInstance.tilesets && assetManagerInstance.items) {
                                    const tileDef = assetManagerInstance.tilesets[tileId];
                                    if (tileDef && tileDef.tags && tileDef.tags.includes('container')) {
                                        let capacity = 0;
                                        let itemName = tileDef.name;
                                        const linkedItemId = tileDef.itemLink; // Store itemLink for logging

                                        if (linkedItemId && assetManagerInstance.items[linkedItemId]) {
                                            const itemDef = assetManagerInstance.items[linkedItemId];
                                            // Check if itemDef itself and its capacity are valid
                                            if (itemDef && typeof itemDef.capacity === 'number' && itemDef.capacity > 0) {
                                                capacity = itemDef.capacity;
                                                itemName = itemDef.name || tileDef.name;
                                            } else {
                                                // Linked item exists but capacity is invalid/missing or zero/negative
                                                if (typeof logToConsole === 'function') {
                                                    logToConsole(`Warning: Container tile '${tileId}' at (${c},${r}) links to item '${linkedItemId}' which has invalid, zero, or negative capacity (${itemDef ? itemDef.capacity : 'N/A'}). Defaulting to 5.`, "orange");
                                                }
                                                capacity = 5; // Default capacity
                                            }
                                        } else if (linkedItemId) {
                                            // itemLink exists but item not found in assetManagerInstance.items
                                            if (typeof logToConsole === 'function') {
                                                logToConsole(`Warning: Container tile '${tileId}' at (${c},${r}) has itemLink '${linkedItemId}' but linked item not found. Defaulting to 5.`, "orange");
                                            }
                                            capacity = 5; // Default capacity
                                        } else {
                                            // No itemLink
                                            if (typeof logToConsole === 'function') {
                                                logToConsole(`Warning: Container tile '${tileId}' at (${c},${r}) has no itemLink. Defaulting capacity to 5.`, "orange");
                                            }
                                            capacity = 5; // Default capacity
                                        }

                                        const containerInstance = {
                                            x: c,
                                            y: r,
                                            id: gameState.nextContainerId++,
                                            tileId: tileId,
                                            name: itemName, // Use updated itemName
                                            capacity: capacity, // Use validated capacity
                                            items: []
                                        };
                                        // Log before pushing and populating
                                        console.log(`MAP_RENDERER: Creating container instance: ID ${containerInstance.id}, TileID: ${containerInstance.tileId}, Name: ${containerInstance.name}, Pos: (${containerInstance.x},${containerInstance.y}), Capacity: ${containerInstance.capacity}`);
                                        gameState.containers.push(containerInstance);
                                        // Populate the newly created container instance
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
                if (typeof logToConsole === 'function' && gameState.containers.length > 0) {
                    logToConsole(`Initialized ${gameState.containers.length} container instances from map tiles.`);
                }

            } else {
                gameState.fowData = [];
                // Optional: console.warn or logToConsole for zero dimensions
            }
        } else {
            gameState.fowData = [];
            // Optional: console.warn or logToConsole for invalid mapData
        }
        // Note: gameState.layers and gameState.playerPos are updated in script.js
        // after this function is called and mapData is returned by handleMapSelectionChange.
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
            // Initialize currentMapData within the module.
            // The calling function in script.js will handle gameState updates.
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
        const PLAYER_VISION_RADIUS = 120;
        const container = document.getElementById("mapContainer");
        const mapData = window.mapRenderer.getCurrentMapData();

        let isInitialRender = false;
        if (!gameState.tileCache ||
            !mapData || !mapData.dimensions ||
            (mapData.dimensions.height > 0 && gameState.tileCache.length !== mapData.dimensions.height) ||
            (mapData.dimensions.height > 0 && mapData.dimensions.width > 0 && (!gameState.tileCache[0] || gameState.tileCache[0].length !== mapData.dimensions.width))) {
            isInitialRender = true;
        }

        if (!mapData || !mapData.dimensions || !mapData.layers) {
            if (isInitialRender && container) container.innerHTML = "<p>No map loaded or map data is invalid.</p>";
            else console.warn("renderMapLayers called with no currentMapData but not initialRender. Map display might be stale.");
            gameState.tileCache = null;
            return;
        }

        const H = mapData.dimensions.height;
        const W = mapData.dimensions.width;

        if (H === 0 || W === 0) {
            if (isInitialRender && container) container.innerHTML = "<p>Map dimensions are zero. Cannot render.</p>";
            else console.warn("renderMapLayers called with zero dimensions but not initialRender. Map display might be stale.");
            gameState.tileCache = null;
            return;
        }

        if (gameState.playerPos && gameState.playerPos.x !== undefined && gameState.playerPos.y !== undefined) {
            if (!gameState.fowData || gameState.fowData.length !== H || (H > 0 && (!gameState.fowData[0] || gameState.fowData[0].length !== W))) {
                gameState.fowData = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                if (typeof logToConsole === 'function') logToConsole("FOW data was missing/invalid and re-initialized in renderMapLayers FOW update.", "orange");
                else console.warn("FOW data was missing/invalid and re-initialized in renderMapLayers FOW update.");
            }

            if (gameState.fowData.length === H && (H === 0 || (gameState.fowData[0] && gameState.fowData[0].length === W))) {
                const playerX_fow = gameState.playerPos.x;
                const playerY_fow = gameState.playerPos.y;

                for (let r = 0; r < H; r++) {
                    for (let c = 0; c < W; c++) {
                        if (gameState.fowData[r] && gameState.fowData[r][c] === 'visible') {
                            gameState.fowData[r][c] = 'visited';
                        }
                    }
                }

                for (let r = 0; r < H; r++) {
                    for (let c = 0; c < W; c++) {
                        if (isTileVisible(playerX_fow, playerY_fow, c, r, PLAYER_VISION_RADIUS)) {
                            if (gameState.fowData[r] && gameState.fowData[r][c] !== undefined) {
                                gameState.fowData[r][c] = 'visible';
                            }
                        }
                    }
                }

                if (playerY_fow >= 0 && playerY_fow < H && playerX_fow >= 0 && playerX_fow < W &&
                    gameState.fowData[playerY_fow] && typeof gameState.fowData[playerY_fow][playerX_fow] !== 'undefined') {
                    gameState.fowData[playerY_fow][playerX_fow] = 'visible';
                }
            }
        } else {
            if ((!gameState.fowData || gameState.fowData.length !== H || (H > 0 && (!gameState.fowData[0] || gameState.fowData[0].length !== W))) && H > 0 && W > 0) {
                gameState.fowData = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                if (typeof logToConsole === 'function') logToConsole("FOW data (re)initialized in renderMapLayers due to no playerPos; all hidden.", "orange");
                else console.warn("FOW data (re)initialized in renderMapLayers due to no playerPos; all hidden.");
            }
        }

        if (isInitialRender) {
            if (container) container.innerHTML = "";
            gameState.tileCache = Array(H).fill(null).map(() => Array(W).fill(null));
        }

        const fragment = isInitialRender ? document.createDocumentFragment() : null;

        const LIGHT_SOURCE_BRIGHTNESS_BOOST = 0.1; // Constant for brightness boost
        const currentAmbientColor = getAmbientLightColor(gameState.currentTime && typeof gameState.currentTime.hours === 'number' ? gameState.currentTime.hours : 12);
        const AMBIENT_STRENGTH_VISIBLE = 0.3;
        const AMBIENT_STRENGTH_VISITED = 0.2;
        // const DEBUG_AMBIENT_TINT_COLOR = '#FF00FF'; // Removed

        if (gameState.tileCache && !isInitialRender) {
            for (let yCache = 0; yCache < gameState.tileCache.length; yCache++) {
                for (let xCache = 0; xCache < gameState.tileCache[yCache].length; xCache++) {
                    const cellToClear = gameState.tileCache[yCache][xCache];
                    if (cellToClear && cellToClear.span && cellToClear.span.classList.contains('flashing-targeting-cursor')) {
                        cellToClear.span.classList.remove('flashing-targeting-cursor');
                        let originalSprite = '';
                        let originalColor = '';
                        let originalId = mapData.layers.landscape?.[yCache]?.[xCache] || "";
                        if (mapData.layers.building?.[yCache]?.[xCache]) originalId = mapData.layers.building[yCache][xCache];
                        if (mapData.layers.item?.[yCache]?.[xCache]) originalId = mapData.layers.item[yCache][xCache];
                        if (gameState.showRoof && mapData.layers.roof?.[yCache]?.[xCache]) {
                            originalId = mapData.layers.roof[yCache][xCache];
                        }

                        if (originalId) {
                            const def = assetManagerInstance.tilesets[originalId];
                            if (def) {
                                originalSprite = def.sprite;
                                originalColor = def.color;
                            } else {
                                originalSprite = '?'; originalColor = 'magenta';
                            }
                        }
                        cellToClear.span.textContent = originalSprite;
                        cellToClear.span.style.color = originalColor;
                        cellToClear.sprite = originalSprite;
                        cellToClear.color = originalColor;
                        cellToClear.displayedId = originalId;
                    }
                }
            }
        }


        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let actualTileId = mapData.layers.landscape?.[y]?.[x] || "";
                if (mapData.layers.building?.[y]?.[x]) actualTileId = mapData.layers.building[y][x];
                if (mapData.layers.item?.[y]?.[x]) actualTileId = mapData.layers.item[y][x];
                if (gameState.showRoof && mapData.layers.roof?.[y]?.[x]) {
                    actualTileId = mapData.layers.roof[y][x];
                }

                let originalSprite = "";
                let originalColor = "";
                const currentAssetManagerForTile = assetManagerInstance;

                if (actualTileId) {
                    const def = currentAssetManagerForTile && currentAssetManagerForTile.tilesets ? currentAssetManagerForTile.tilesets[actualTileId] : null;
                    if (def) {
                        originalSprite = def.sprite;
                        originalColor = def.color;
                    } else {
                        originalSprite = '?';
                        originalColor = 'magenta';
                    }
                } else {
                    originalSprite = ' ';
                    originalColor = 'black';
                }

                let fowStatus = 'hidden';
                if (gameState.fowData && gameState.fowData[y] && typeof gameState.fowData[y][x] !== 'undefined') {
                    fowStatus = gameState.fowData[y][x];
                }

                let displaySprite = originalSprite;
                let displayColor = originalColor;
                let displayId = actualTileId || "";

                // --- TEMPORARY DEBUGGING FOR CONTAINERS ---
                if (actualTileId && assetManagerInstance && assetManagerInstance.tilesets) {
                    const tempTileDef = assetManagerInstance.tilesets[actualTileId];
                    if (tempTileDef && tempTileDef.tags && tempTileDef.tags.includes('container')) {
                        displayColor = 'fuchsia'; // Override color for visibility
                    }
                }
                // --- END TEMPORARY DEBUGGING ---

                if (fowStatus === 'hidden') {
                    displaySprite = ' ';
                    displayColor = '#1a1a1a';
                    displayId = 'FOW_HIDDEN';
                } else if (fowStatus === 'visited') {
                    const visitedColorStyle = (c) => {
                        if (typeof c !== 'string' || !c.startsWith('#')) {
                            // If not a string or not a hex color, return a default dark color.
                            return '#505050';
                        }
                        try {
                            let r = parseInt(c.substring(1, 3), 16) || 0;
                            let g = parseInt(c.substring(3, 5), 16) || 0;
                            let b = parseInt(c.substring(5, 7), 16) || 0;

                            r = Math.max(0, Math.floor(r * 0.6));
                            g = Math.max(0, Math.floor(g * 0.6));
                            b = Math.max(0, Math.floor(b * 0.6));

                            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        } catch (e) {
                            // Fallback for any parsing error
                            return '#505050';
                        }
                    };
                    displayColor = visitedColorStyle(originalColor);
                }

                if (fowStatus === 'visible' || fowStatus === 'visited') {
                    let isLit = false;
                    if (gameState.lightSources && gameState.lightSources.length > 0) {
                        for (const source of gameState.lightSources) {
                            if (isTileIlluminated(x, y, source)) {
                                isLit = true;
                                break;
                            }
                        }
                    }

                    if (fowStatus === 'visible') {
                        if (isLit) {
                            let activeLight = null;
                            // Find the first light source illuminating this tile
                            if (gameState.lightSources && gameState.lightSources.length > 0) {
                                for (const source of gameState.lightSources) {
                                    if (isTileIlluminated(x, y, source)) {
                                        activeLight = source;
                                        break;
                                    }
                                }
                            }

                            if (activeLight && activeLight.color && typeof activeLight.intensity === 'number') {
                                const brightenedBase = brightenColor(originalColor, LIGHT_SOURCE_BRIGHTNESS_BOOST);
                                displayColor = blendColors(brightenedBase, activeLight.color, activeLight.intensity / 2);
                            } else {
                                // Fallback if no specific light found or light has no color/intensity
                                displayColor = brightenColor(originalColor, LIGHT_SOURCE_BRIGHTNESS_BOOST / 2);
                            }
                        } else {
                            // Not lit by a dynamic source, apply ambient tint
                            displayColor = blendColors(originalColor, currentAmbientColor, AMBIENT_STRENGTH_VISIBLE);
                        }
                    } else if (fowStatus === 'visited') {
                        // For visited tiles, if they are lit by a dynamic source, apply a less intense version of that light effect
                        // Otherwise, apply the standard visited ambient tint.
                        if (isLit) {
                            let activeLight = null;
                            if (gameState.lightSources && gameState.lightSources.length > 0) {
                                for (const source of gameState.lightSources) {
                                    if (isTileIlluminated(x, y, source)) {
                                        activeLight = source;
                                        break;
                                    }
                                }
                            }
                            // displayColor is already the darkened "visited" color from earlier logic.
                            if (activeLight && activeLight.color && typeof activeLight.intensity === 'number') {
                                // Brighten the already darkened "visited" color slightly, then blend with light source color at a reduced intensity.
                                const slightlyBrightenedVisited = brightenColor(displayColor, LIGHT_SOURCE_BRIGHTNESS_BOOST / 2);
                                displayColor = blendColors(slightlyBrightenedVisited, activeLight.color, activeLight.intensity * 0.25); // Further Reduced intensity for visited
                            } else {
                                // If no active light but it's "isLit" (e.g. from a default map property not in dynamic sources),
                                // just apply ambient visited tint. Or, if it should be brighter, adjust here.
                                // Current 'displayColor' is already the darkened base for visited.
                                // We might blend it with ambient for consistency if needed, or leave as is if the darkening is enough.
                                displayColor = blendColors(displayColor, currentAmbientColor, AMBIENT_STRENGTH_VISITED);
                            }
                        } else {
                            displayColor = blendColors(displayColor, currentAmbientColor, AMBIENT_STRENGTH_VISITED);
                        }
                    }
                }

                targetSprite = displaySprite;
                targetColor = displayColor;
                targetDisplayId = displayId;

                const isPlayerCurrentlyOnTile = (gameState.playerPos && x === gameState.playerPos.x && y === gameState.playerPos.y &&
                    !(gameState.showRoof && mapData.layers.roof?.[y]?.[x]));

                if (isPlayerCurrentlyOnTile) {
                    let playerTileFowStatus = 'hidden';
                    if (gameState.fowData && gameState.fowData[y] && typeof gameState.fowData[y][x] !== 'undefined') {
                        playerTileFowStatus = gameState.fowData[y][x];
                    }

                    if (playerTileFowStatus === 'visible') {
                        targetSprite = "☻";
                        targetColor = "green";
                        targetDisplayId = "PLAYER";
                    }
                }

                if (isInitialRender) {
                    const span = document.createElement("span");
                    span.className = "tile";
                    span.dataset.x = x;
                    span.dataset.y = y;
                    span.textContent = targetSprite;
                    span.style.color = targetColor;

                    // New item highlight logic - apply background color
                    let tileHighlightColor = "";
                    if (fowStatus === 'visible') {
                        if (window.gameState && window.gameState.floorItems && window.gameState.floorItems.length > 0) {
                            let itemsOnThisTile = false;
                            let impassableTileBlockingItemHighlight = false;
                            const currentTileDef = assetManagerInstance && assetManagerInstance.tilesets ? assetManagerInstance.tilesets[actualTileId] : null;

                            if (currentTileDef && currentTileDef.tags && currentTileDef.tags.includes("impassable")) {
                                if (!currentTileDef.tags.includes("door") &&
                                    !currentTileDef.tags.includes("window") &&
                                    !currentTileDef.tags.includes("container")) {
                                    impassableTileBlockingItemHighlight = true;
                                }
                            }

                            if (!impassableTileBlockingItemHighlight) {
                                for (const floorEntry of window.gameState.floorItems) {
                                    if (floorEntry.x === x && floorEntry.y === y) {
                                        itemsOnThisTile = true;
                                        break;
                                    }
                                }
                            }
                            if (itemsOnThisTile) {
                                tileHighlightColor = "rgba(255, 255, 0, 0.3)"; // Semi-transparent yellow
                            }
                        }
                    }
                    span.style.backgroundColor = tileHighlightColor;
                    // End new item highlight logic

                    if (!gameState.tileCache[y]) gameState.tileCache[y] = Array(W).fill(null);

                    gameState.tileCache[y][x] = {
                        span: span,
                        displayedId: targetDisplayId,
                        sprite: targetSprite,
                        color: targetColor
                        // backgroundColor will be managed directly on the span's style
                    };
                    if (fragment) fragment.appendChild(span);
                } else {
                    const cachedCell = gameState.tileCache[y]?.[x];
                    if (cachedCell && cachedCell.span) {
                        const span = cachedCell.span;
                        // Update sprite and color if changed
                        if (cachedCell.sprite !== targetSprite || cachedCell.color !== targetColor) {
                            span.textContent = targetSprite;
                            span.style.color = targetColor;
                            cachedCell.sprite = targetSprite;
                            cachedCell.color = targetColor;
                        }
                        cachedCell.displayedId = targetDisplayId; // Always update displayedId

                        // New item highlight logic - apply background color
                        let tileHighlightColor = "";
                        if (fowStatus === 'visible') {
                            if (window.gameState && window.gameState.floorItems && window.gameState.floorItems.length > 0) {
                                let itemsOnThisTile = false;
                                let impassableTileBlockingItemHighlight = false;
                                const currentTileDef = assetManagerInstance && assetManagerInstance.tilesets ? assetManagerInstance.tilesets[actualTileId] : null;

                                if (currentTileDef && currentTileDef.tags && currentTileDef.tags.includes("impassable")) {
                                    if (!currentTileDef.tags.includes("door") &&
                                        !currentTileDef.tags.includes("window") &&
                                        !currentTileDef.tags.includes("container")) {
                                        impassableTileBlockingItemHighlight = true;
                                    }
                                }

                                if (!impassableTileBlockingItemHighlight) {
                                    for (const floorEntry of window.gameState.floorItems) {
                                        if (floorEntry.x === x && floorEntry.y === y) {
                                            itemsOnThisTile = true;
                                            break;
                                        }
                                    }
                                }
                                if (itemsOnThisTile) {
                                    tileHighlightColor = "rgba(255, 255, 0, 0.3)"; // Semi-transparent yellow
                                }
                            }
                        }
                        if (span.style.backgroundColor !== tileHighlightColor) {
                            span.style.backgroundColor = tileHighlightColor;
                        }
                        // End new item highlight logic

                        if (span.classList.contains('flashing-targeting-cursor') &&
                            !(gameState.isTargetingMode && x === gameState.targetingCoords.x && y === gameState.targetingCoords.y)) {
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

        if (isInitialRender && container && fragment) {
            container.appendChild(fragment);
        }

        if (gameState.npcs && gameState.npcs.length > 0 && gameState.tileCache) {
            gameState.npcs.forEach(npc => {
                if (npc.mapPos) {
                    const npcX = npc.mapPos.x;
                    const npcY = npc.mapPos.y;
                    if (npcX >= 0 && npcX < W && npcY >= 0 && npcY < H) {
                        const roofObscures = gameState.showRoof && mapData.layers.roof?.[npcY]?.[npcX];
                        const playerIsHere = (npcX === gameState.playerPos.x && npcY === gameState.playerPos.y);
                        const isTargetingCursorHere = gameState.isTargetingMode && npcX === gameState.targetingCoords.x && npcY === gameState.targetingCoords.y;

                        if (!roofObscures && !playerIsHere && !isTargetingCursorHere) {
                            const cachedCell = gameState.tileCache[npcY]?.[npcX];
                            if (cachedCell && cachedCell.span) {
                                cachedCell.span.textContent = npc.sprite;
                                cachedCell.span.style.color = npc.color;
                            }
                        }
                    }
                }
            });
        }

        if (gameState.isTargetingMode && gameState.tileCache) {
            const targetX = gameState.targetingCoords.x;
            const targetY = gameState.targetingCoords.y;

            if (targetX >= 0 && targetX < W && targetY >= 0 && targetY < H) {
                const cachedCell = gameState.tileCache[targetY]?.[targetX];
                if (cachedCell && cachedCell.span) {
                    cachedCell.span.textContent = 'X';
                    cachedCell.span.style.color = 'red';
                    if (!cachedCell.span.classList.contains('flashing-targeting-cursor')) {
                        cachedCell.span.classList.add('flashing-targeting-cursor');
                    }
                }
            }
        }

        if (gameState.tileCache) {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const cell = gameState.tileCache[y]?.[x];
                    if (cell && cell.span) {
                        if (cell.span.dataset.isAttackerHighlighted === 'true' || cell.span.dataset.isDefenderHighlighted === 'true') {
                            cell.span.style.backgroundColor = '';
                            delete cell.span.dataset.isAttackerHighlighted;
                            delete cell.span.dataset.isDefenderHighlighted;
                        }
                    }
                }
            }
        }

        if (gameState.isInCombat && gameState.tileCache) {
            if (gameState.attackerMapPos) {
                const attackerCell = gameState.tileCache[gameState.attackerMapPos.y]?.[gameState.attackerMapPos.x];
                if (attackerCell && attackerCell.span) {
                    attackerCell.span.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                    attackerCell.span.dataset.isAttackerHighlighted = 'true';
                }
            }
            if (gameState.defenderMapPos) {
                const defenderCell = gameState.tileCache[gameState.defenderMapPos.y]?.[gameState.defenderMapPos.x];
                if (defenderCell && defenderCell.span) {
                    defenderCell.span.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';
                    defenderCell.span.dataset.isDefenderHighlighted = 'true';
                }
            }
        }
        this.updateMapHighlight();
    },

    updateMapHighlight: function () {
        document.querySelectorAll('.tile.flashing')
            .forEach(el => el.classList.remove('flashing'));

        const idx = gameState.selectedItemIndex;
        if (!gameState.interactableItems || idx < 0 || idx >= gameState.interactableItems.length) return;

        const it = gameState.interactableItems[idx];
        if (!it) return;
        const x = it.x;
        const y = it.y;

        if (typeof x !== 'number' || typeof y !== 'number') return;
        const cachedCell = gameState.tileCache?.[y]?.[x];
        if (cachedCell && cachedCell.span) {
            cachedCell.span.classList.add('flashing');
        } else {
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

    isPassable: function (tileId) {
        if (!tileId) return true;
        const tileData = assetManagerInstance?.tilesets?.[tileId];
        if (!tileData) return true;
        const tags = tileData.tags || [];
        return !tags.includes("impassable");
    },

    getCollisionTileAt: function (x, y) {
        const mapData = this.getCurrentMapData();
        if (!mapData || !mapData.layers) return "";

        const tilesets = assetManagerInstance?.tilesets;
        if (!tilesets) return "";

        const bldLayer = mapData.layers.building;
        const itmLayer = mapData.layers.item;
        const lspLayer = mapData.layers.landscape;

        const bld = bldLayer?.[y]?.[x];
        if (bld && tilesets[bld]) return bld;

        const itm = itmLayer?.[y]?.[x];
        if (itm && tilesets[itm]) return itm;

        const lsp = lspLayer?.[y]?.[x];
        if (lsp && tilesets[lsp]) return lsp;

        return "";
    }
};
