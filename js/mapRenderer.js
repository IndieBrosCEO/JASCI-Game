// js/mapRenderer.js

const QUEST_MARKER_CONFIG = {
    AVAILABLE: { char: '!', color: 'yellow', priority: 2 },      // e.g., light_yellow if colors are specific
    ACTIVE_TARGET: { char: '?', color: 'cyan', priority: 1 },   // e.g., light_cyan
    TURN_IN: { char: '$', color: 'green', priority: 3 }       // e.g., light_green
};

// Helper functions for FOW and LOS
function blendColors(baseColorHex, tintColorHex, tintFactor) {
    try {
        const factor = Math.max(0, Math.min(1, tintFactor));
        const hexToRgb = (hex) => {
            if (typeof hex !== 'string' || !hex.startsWith('#')) return null;
            let r = parseInt(hex.substring(1, 3), 16);
            let g = parseInt(hex.substring(3, 5), 16);
            let b = parseInt(hex.substring(5, 7), 16);
            if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
            return { r, g, b };
        };
        const rgbToHex = (r, g, b) => {
            return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
        };
        const baseRgb = hexToRgb(baseColorHex);
        const tintRgb = hexToRgb(tintColorHex);
        if (!baseRgb) return baseColorHex || '#808080';
        if (!tintRgb) return baseColorHex;
        const r = baseRgb.r * (1 - factor) + tintRgb.r * factor;
        const g = baseRgb.g * (1 - factor) + tintRgb.g * factor;
        const b = baseRgb.b * (1 - factor) + tintRgb.b * factor;
        return rgbToHex(r, g, b);
    } catch (e) {
        return baseColorHex;
    }
}

function brightenColor(hexColor, factor) {
    if (typeof hexColor !== 'string' || !hexColor.startsWith('#') || typeof factor !== 'number') {
        return hexColor || '#FFFFFF';
    }
    try {
        let r = parseInt(hexColor.substring(1, 3), 16);
        let g = parseInt(hexColor.substring(3, 5), 16);
        let b = parseInt(hexColor.substring(5, 7), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return hexColor || '#FFFFFF';
        factor = Math.max(0, Math.min(1, factor));
        r = Math.round(r + (255 - r) * factor);
        g = Math.round(g + (255 - g) * factor);
        b = Math.round(b + (255 - b) * factor);
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        return hexColor || '#FFFFFF';
    }
}

function getAmbientLightColor(currentTimeHours) {
    const hour = (typeof currentTimeHours === 'number' && currentTimeHours >= 0 && currentTimeHours <= 23) ? currentTimeHours : 12;
    if (hour >= 6 && hour < 8) { return '#A0A0C0'; }
    else if (hour >= 8 && hour < 17) { return '#FFFFFF'; }
    else if (hour >= 17 && hour < 19) { return '#B0A0A0'; }
    else { return '#303045'; }
}

function isTileBlockingLight(tileX, tileY) {
    const mapData = window.mapRenderer.getCurrentMapData();
    const currentAssetManager = assetManagerInstance;
    if (!mapData || !mapData.layers || !currentAssetManager || !currentAssetManager.tilesets) return false;
    const layersToConsider = ['landscape', 'building'];
    if (gameState.showRoof) layersToConsider.push('roof');
    for (const layerName of layersToConsider) {
        const layer = mapData.layers[layerName];
        if (layer && layer[tileY] && typeof layer[tileY][tileX] !== 'undefined' && layer[tileY][tileX] !== null && layer[tileY][tileX] !== "") {
            const tileId = layer[tileY][tileX];
            if (tileId) {
                const tileDef = currentAssetManager.tilesets[tileId];
                if (tileDef && tileDef.tags) {
                    if (tileDef.tags.includes('allows_vision') || tileDef.tags.includes('transparent')) return false;
                    if (tileDef.tags.includes('impassable') || tileDef.tags.includes('blocks_vision')) return true;
                }
            }
        }
    }
    return false;
}

function isTileIlluminated(tileX, tileY, lightSource) {
    const sourceX = lightSource.x;
    const sourceY = lightSource.y;
    const sourceRadius = lightSource.radius;
    const distance = Math.sqrt(Math.pow(tileX - sourceX, 2) + Math.pow(tileY - sourceY, 2));
    if (distance > sourceRadius) return false;
    if (tileX === sourceX && tileY === sourceY) return true;
    if (distance <= 0.5) return true;
    const line = getLine(sourceX, sourceY, tileX, tileY);
    if (line.length < 2) return true;
    for (let i = 1; i < line.length - 1; i++) {
        if (isTileBlockingLight(line[i].x, line[i].y)) return false;
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
        if (points.length > 200) break;
    }
    return points;
}

function isTileBlockingVision(tileX, tileY) {
    const mapData = window.mapRenderer.getCurrentMapData();
    const currentAssetManager = assetManagerInstance;
    if (!mapData || !mapData.layers || !currentAssetManager || !currentAssetManager.tilesets) return false;
    const layersToConsider = ['landscape', 'building'];
    if (gameState.showRoof) layersToConsider.push('roof');
    for (const layerName of layersToConsider) {
        const layer = mapData.layers[layerName];
        if (layer && layer[tileY] && typeof layer[tileY][tileX] !== 'undefined' && layer[tileY][tileX] !== null && layer[tileY][tileX] !== "") {
            const tileId = layer[tileY][tileX];
            if (tileId) {
                const tileDef = currentAssetManager.tilesets[tileId];
                if (tileDef && tileDef.tags) {
                    if (tileDef.tags.includes('allows_vision') || tileDef.tags.includes('transparent')) return false;
                    if (tileDef.tags.includes('impassable') || tileDef.tags.includes('blocks_vision')) return true;
                }
            }
        }
    }
    return false;
}

function isTileVisible(playerX, playerY, targetX, targetY, visionRadius) {
    const distance = Math.sqrt(Math.pow(targetX - playerX, 2) + Math.pow(targetY - playerY, 2));
    if (distance > visionRadius) return false;
    if (playerX === targetX && playerY === targetY) return true;
    const line = getLine(playerX, playerY, targetX, targetY);
    if (distance <= 1.5) {
        if (line.length > 1) {
            if (isTileBlockingVision(line[1].x, line[1].y) && !(line[1].x === targetX && line[1].y === targetY)) return false;
        }
        return true;
    }
    if (line.length < 2) return true;
    for (let i = 1; i < line.length - 1; i++) {
        if (isTileBlockingVision(line[i].x, line[i].y)) return false;
    }
    return true;
}

let currentMapData = null;
let assetManagerInstance = null;

window.mapRenderer = {
    initMapRenderer: function (assetMgr) { assetManagerInstance = assetMgr; },
    initializeCurrentMap: function (mapData) {
        currentMapData = mapData;
        gameState.lightSources = [];
        gameState.containers = [];
        if (mapData && mapData.dimensions) {
            const H = mapData.dimensions.height;
            const W = mapData.dimensions.width;
            if (H > 0 && W > 0) {
                gameState.fowData = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                const layersToScanForLights = ['landscape', 'building', 'item'];
                for (const layerName of layersToScanForLights) {
                    const layer = mapData.layers[layerName];
                    if (layer) {
                        for (let r = 0; r < H; r++) {
                            for (let c = 0; c < W; c++) {
                                const tileId = layer[r]?.[c];
                                if (tileId && assetManagerInstance && assetManagerInstance.tilesets) {
                                    const tileDef = assetManagerInstance.tilesets[tileId];
                                    if (tileDef && tileDef.emitsLight === true && typeof tileDef.lightRadius === 'number' && tileDef.lightRadius > 0) {
                                        gameState.lightSources.push({ x: c, y: r, radius: tileDef.lightRadius, intensity: tileDef.lightIntensity || 1.0, color: tileDef.lightColor || null });
                                    }
                                }
                            }
                        }
                    }
                }
                if (typeof logToConsole === 'function' && gameState.lightSources.length > 0) logToConsole(`Initialized ${gameState.lightSources.length} static light sources.`);
                const layersToScanForContainers = ['item', 'building'];
                for (const layerName of layersToScanForContainers) {
                    const layer = mapData.layers[layerName];
                    if (layer) {
                        for (let r = 0; r < H; r++) {
                            for (let c = 0; c < W; c++) {
                                const tileId = layer[r]?.[c];
                                if (tileId && assetManagerInstance && assetManagerInstance.tilesets && assetManagerInstance.items) {
                                    const tileDef = assetManagerInstance.tilesets[tileId];
                                    if (tileDef && tileDef.tags && tileDef.tags.includes('container')) {
                                        let capacity = 5, itemName = tileDef.name;
                                        const linkedItemId = tileDef.itemLink;
                                        if (linkedItemId && assetManagerInstance.items[linkedItemId]) {
                                            const itemDef = assetManagerInstance.items[linkedItemId];
                                            if (itemDef && typeof itemDef.capacity === 'number' && itemDef.capacity > 0) {
                                                capacity = itemDef.capacity; itemName = itemDef.name || tileDef.name;
                                            } else if (typeof logToConsole === 'function') logToConsole(`Warning: Container '${tileId}' at (${c},${r}) links to item '${linkedItemId}' with invalid capacity. Defaulting.`, "orange");
                                        } else if (linkedItemId && typeof logToConsole === 'function') logToConsole(`Warning: Container '${tileId}' at (${c},${r}) itemLink '${linkedItemId}' not found. Defaulting.`, "orange");
                                        else if (typeof logToConsole === 'function') logToConsole(`Warning: Container '${tileId}' at (${c},${r}) no itemLink. Defaulting.`, "orange");
                                        const containerInstance = { x: c, y: r, id: gameState.nextContainerId++, tileId, name: itemName, capacity, items: [] };
                                        console.log(`MAP_RENDERER: Creating container: ID ${containerInstance.id}, TileID: ${tileId}, Name: ${itemName}, Pos: (${c},${r}), Cap: ${capacity}`);
                                        gameState.containers.push(containerInstance);
                                        if (typeof window.populateContainer === 'function') window.populateContainer(containerInstance);
                                        else if (typeof logToConsole === 'function') logToConsole(`Error: populateContainer fn not found for ${itemName}.`, "red");
                                    }
                                }
                            }
                        }
                    }
                }
                if (typeof logToConsole === 'function' && gameState.containers.length > 0) logToConsole(`Initialized ${gameState.containers.length} containers.`);
            } else gameState.fowData = [];
        } else gameState.fowData = [];
    },
    getCurrentMapData: function () { return currentMapData; },
    updateLightSources: function (newLightSources) {
        if (Array.isArray(newLightSources)) {
            gameState.lightSources = newLightSources;
            if (typeof logToConsole === 'function') logToConsole(`Light sources updated. Count: ${gameState.lightSources.length}`);
            this.scheduleRender();
        } else if (typeof logToConsole === 'function') logToConsole("updateLightSources: Invalid input.", "orange");
    },
    handleMapSelectionChange: async function (mapId) {
        if (!mapId || !assetManagerInstance) { console.warn("Map selection invalid mapId or assetMgr."); return null; }
        console.log(`Map selected (mapRenderer): ${mapId}`);
        const loadedMap = await assetManagerInstance.loadMap(mapId);
        if (loadedMap) {
            this.initializeCurrentMap(loadedMap);
            if (typeof logToConsole === 'function') logToConsole(`Map ${loadedMap.name} loaded by handleMapSelectionChange.`);
            return loadedMap;
        } else {
            if (typeof logToConsole === 'function') logToConsole(`Failed to load map: ${mapId}`);
            const errorDisplay = document.getElementById('errorMessageDisplay');
            if (errorDisplay) errorDisplay.textContent = `Failed to load map: ${mapId}.`;
            this.initializeCurrentMap(null);
            return null;
        }
    },
    setupMapSelector: async function () {
        const mapSelector = document.getElementById('mapSelector');
        if (!mapSelector) { console.error("#mapSelector not found."); return; }
        if (!assetManagerInstance) { console.error("AssetManagerInstance not init in mapRenderer."); return; }
        const baseMapIndexUrl = `/assets/maps/mapIndex.json?t=${Date.now()}`;
        let baseMapIndex = [];
        try {
            const response = await fetch(baseMapIndexUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for base mapIndex.json`);
            baseMapIndex = await response.json();
            assetManagerInstance.setMapIndexData(baseMapIndex);
            console.log("Base map index loaded and set in AssetManager from:", baseMapIndexUrl);
        } catch (error) {
            // Failure to load the base map index is a significant issue.
            console.error(`Failed to load base map index from ${baseMapIndexUrl}:`, error);
            const errorDisplay = document.getElementById('errorMessageDisplay');
            if (errorDisplay) errorDisplay.textContent = "CRITICAL ERROR: Could not load base map list. Game may not function.";
        }
        mapSelector.innerHTML = ''; // Clear even if base failed, to prevent stale data.
        baseMapIndex.forEach(mapInfo => { const option = document.createElement('option'); option.value = mapInfo.id; option.textContent = mapInfo.name; mapSelector.appendChild(option); });

        const userOverridesMapIndexUrl = `/assets/maps/user_overrides/mapIndex.json?t=${Date.now()}`;
        try {
            const userResponse = await fetch(userOverridesMapIndexUrl);
            if (userResponse.ok) {
                const userOverridesMapIndex = await userResponse.json();
                if (userOverridesMapIndex && userOverridesMapIndex.length > 0) {
                    console.log("User overrides map index found, adding to selector.");
                    if (baseMapIndex.length > 0 && userOverridesMapIndex.length > 0) {
                        const sep = document.createElement('option'); sep.disabled = true; sep.textContent = '--- User Overrides ---'; mapSelector.appendChild(sep);
                    }
                    userOverridesMapIndex.forEach(mapInfo => {
                        const option = document.createElement('option'); option.value = mapInfo.id; option.textContent = `[Override] ${mapInfo.name}`; mapSelector.appendChild(option);
                    });
                    console.log("User override maps added to selector.");
                    if (baseMapIndex.length === 0) { // Should ideally merge or clearly indicate override
                        assetManagerInstance.setMapIndexData(userOverridesMapIndex);
                    }
                }
            } else if (userResponse.status === 404) {
                console.log(`User overrides map index file not found (logging suppressed): ${userOverridesMapIndexUrl}`);
            } else {
                // Log other HTTP errors as warnings for user overrides.
                console.warn(`Warning: HTTP error ${userResponse.status} when fetching user overrides map index from ${userOverridesMapIndexUrl}.`);
            }
        } catch (error) {
            console.warn(`Failed to load or process user overrides map index from ${userOverridesMapIndexUrl}:`, error.message);
        }
    },
    scheduleRender: function () {
        if (!gameState.renderScheduled) {
            gameState.renderScheduled = true;
            requestAnimationFrame(() => { window.mapRenderer.renderMapLayers(); gameState.renderScheduled = false; });
        }
    },
    renderMapLayers: function () {
        const PLAYER_VISION_RADIUS = 120;
        const container = document.getElementById("mapContainer");
        const mapData = window.mapRenderer.getCurrentMapData();
        let isInitialRender = !gameState.tileCache || !mapData || !mapData.dimensions || (mapData.dimensions.height > 0 && (gameState.tileCache.length !== mapData.dimensions.height || (mapData.dimensions.width > 0 && (!gameState.tileCache[0] || gameState.tileCache[0].length !== mapData.dimensions.width))));
        if (!mapData || !mapData.dimensions || !mapData.layers) { if (isInitialRender && container) container.innerHTML = "<p>No map loaded.</p>"; gameState.tileCache = null; return; }
        const H = mapData.dimensions.height, W = mapData.dimensions.width;
        if (H === 0 || W === 0) { if (isInitialRender && container) container.innerHTML = "<p>Map dimensions zero.</p>"; gameState.tileCache = null; return; }

        if (gameState.playerPos && gameState.playerPos.x !== undefined) {
            if (!gameState.fowData || gameState.fowData.length !== H || (H > 0 && (!gameState.fowData[0] || gameState.fowData[0].length !== W))) {
                gameState.fowData = Array(H).fill(null).map(() => Array(W).fill('hidden'));
            }
            if (gameState.fowData.length === H && (H === 0 || (gameState.fowData[0] && gameState.fowData[0].length === W))) {
                const px = gameState.playerPos.x, py = gameState.playerPos.y;
                for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (gameState.fowData[r]?.[c] === 'visible') gameState.fowData[r][c] = 'visited';
                for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (isTileVisible(px, py, c, r, PLAYER_VISION_RADIUS)) if (gameState.fowData[r]?.[c] !== undefined) gameState.fowData[r][c] = 'visible';
                if (py >= 0 && py < H && px >= 0 && px < W && gameState.fowData[py]?.[px] !== undefined) gameState.fowData[py][px] = 'visible';
            }
        } else if ((!gameState.fowData || gameState.fowData.length !== H || (H > 0 && (!gameState.fowData[0] || gameState.fowData[0].length !== W))) && H > 0 && W > 0) {
            gameState.fowData = Array(H).fill(null).map(() => Array(W).fill('hidden'));
        }

        if (isInitialRender) { if (container) container.innerHTML = ""; gameState.tileCache = Array(H).fill(null).map(() => Array(W).fill(null)); }
        const fragment = isInitialRender ? document.createDocumentFragment() : null;
        const currentAmbientColor = getAmbientLightColor(gameState.currentTime?.hours);

        if (gameState.tileCache && !isInitialRender) { /* Clear targeting cursors */
            for (let yCache = 0; yCache < H; yCache++) for (let xCache = 0; xCache < W; xCache++) {
                const cellToClear = gameState.tileCache[yCache]?.[xCache];
                if (cellToClear?.span?.classList.contains('flashing-targeting-cursor')) {
                    cellToClear.span.classList.remove('flashing-targeting-cursor');
                    // Restore original look (simplified, assumes it was an NPC or player before)
                    // This part might need more robust restoration if complex tiles were cursored
                    let originalIdRestored = mapData.layers.landscape?.[yCache]?.[xCache] || "";
                    if (mapData.layers.building?.[yCache]?.[xCache]) originalIdRestored = mapData.layers.building[yCache][xCache];
                    if (mapData.layers.item?.[yCache]?.[xCache]) originalIdRestored = mapData.layers.item[yCache][xCache];
                    if (gameState.showRoof && mapData.layers.roof?.[yCache]?.[xCache]) originalIdRestored = mapData.layers.roof[yCache][xCache];
                    const defRestored = assetManagerInstance.tilesets[originalIdRestored];
                    cellToClear.span.textContent = defRestored ? defRestored.sprite : (originalIdRestored ? '?' : ' ');
                    cellToClear.span.style.color = defRestored ? defRestored.color : (originalIdRestored ? 'magenta' : 'black');
                }
            }
        }

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let actualTileId = mapData.layers.landscape?.[y]?.[x] || "";
                if (mapData.layers.building?.[y]?.[x]) actualTileId = mapData.layers.building[y][x];
                if (mapData.layers.item?.[y]?.[x]) actualTileId = mapData.layers.item[y][x];
                if (gameState.showRoof && mapData.layers.roof?.[y]?.[x]) actualTileId = mapData.layers.roof[y][x];

                const tileDef = assetManagerInstance.tilesets[actualTileId];
                let originalSprite = tileDef ? tileDef.sprite : (actualTileId ? '?' : ' ');
                let originalColor = tileDef ? tileDef.color : (actualTileId ? 'magenta' : 'black');

                let fowStatus = gameState.fowData?.[y]?.[x] || 'hidden';
                let displaySprite = originalSprite, displayColor = originalColor;

                if (fowStatus === 'hidden') { displaySprite = ' '; displayColor = '#1a1a1a'; }
                else if (fowStatus === 'visited') { displayColor = blendColors(originalColor, '#000000', 0.6); } // Simplified visited

                if (fowStatus === 'visible' || fowStatus === 'visited') {
                    let isLit = false;
                    for (const source of gameState.lightSources || []) if (isTileIlluminated(x, y, source)) { isLit = true; break; }
                    if (fowStatus === 'visible') {
                        if (isLit) displayColor = brightenColor(originalColor, 0.1);
                        else displayColor = blendColors(originalColor, currentAmbientColor, 0.3);
                    } else { // visited
                        if (isLit) displayColor = blendColors(displayColor, currentAmbientColor, 0.1); // Slightly less ambient on lit visited
                        else displayColor = blendColors(displayColor, currentAmbientColor, 0.2);
                    }
                }

                let targetSprite = displaySprite, targetColor = displayColor;
                if (gameState.playerPos?.x === x && gameState.playerPos?.y === y && fowStatus === 'visible' && !(gameState.showRoof && mapData.layers.roof?.[y]?.[x])) {
                    targetSprite = "☻"; targetColor = "green";
                }

                if (isInitialRender) {
                    const span = document.createElement("span"); span.className = "tile"; span.dataset.x = x; span.dataset.y = y;
                    span.textContent = targetSprite; span.style.color = targetColor;
                    let tileHighlightColor = "";
                    if (fowStatus === 'visible' && window.gameState?.floorItems?.some(fi => fi.x === x && fi.y === y && !(assetManagerInstance.tilesets[actualTileId]?.tags?.includes("impassable") && !assetManagerInstance.tilesets[actualTileId]?.tags?.includes("door") && !assetManagerInstance.tilesets[actualTileId]?.tags?.includes("window") && !assetManagerInstance.tilesets[actualTileId]?.tags?.includes("container")))) {
                        tileHighlightColor = "rgba(255, 255, 0, 0.3)";
                    }
                    span.style.backgroundColor = tileHighlightColor;
                    if (!gameState.tileCache[y]) gameState.tileCache[y] = Array(W).fill(null);
                    gameState.tileCache[y][x] = { span, sprite: targetSprite, color: targetColor };
                    if (fragment) fragment.appendChild(span);
                } else {
                    const cell = gameState.tileCache[y]?.[x];
                    if (cell?.span) {
                        if (cell.sprite !== targetSprite || cell.color !== targetColor) {
                            cell.span.textContent = targetSprite; cell.span.style.color = targetColor;
                            cell.sprite = targetSprite; cell.color = targetColor;
                        }
                        let tileHighlightColor = "";
                        if (fowStatus === 'visible' && window.gameState?.floorItems?.some(fi => fi.x === x && fi.y === y && !(assetManagerInstance.tilesets[actualTileId]?.tags?.includes("impassable") && !assetManagerInstance.tilesets[actualTileId]?.tags?.includes("door") && !assetManagerInstance.tilesets[actualTileId]?.tags?.includes("window") && !assetManagerInstance.tilesets[actualTileId]?.tags?.includes("container")))) {
                            tileHighlightColor = "rgba(255, 255, 0, 0.3)";
                        }
                        if (cell.span.style.backgroundColor !== tileHighlightColor) cell.span.style.backgroundColor = tileHighlightColor;
                    }
                }
            }
            if (isInitialRender && fragment) fragment.appendChild(document.createElement("br"));
        }
        if (isInitialRender && container && fragment) container.appendChild(fragment);

        if (gameState.npcs && gameState.npcs.length > 0 && gameState.tileCache) {
            gameState.npcs.forEach(npc => {
                if (npc.mapPos && npc.id) {
                    const npcX = npc.mapPos.x, npcY = npc.mapPos.y;
                    if (npcX >= 0 && npcX < W && npcY >= 0 && npcY < H) {
                        const roofObscures = gameState.showRoof && mapData.layers.roof?.[npcY]?.[npcX];
                        const playerIsHere = (npcX === gameState.playerPos.x && npcY === gameState.playerPos.y);
                        const isTargetingCursorHere = gameState.isTargetingMode && npcX === gameState.targetingCoords.x && npcY === gameState.targetingCoords.y;

                        if (!roofObscures && !playerIsHere && !isTargetingCursorHere && gameState.fowData?.[npcY]?.[npcX] === 'visible') { // Only draw if NPC tile is visible
                            const cachedCell = gameState.tileCache[npcY]?.[npcX];
                            if (cachedCell && cachedCell.span) {
                                let markerToDraw = null; let currentMarkerPriority = 0;
                                if (window.questManager) {
                                    const turnInQuests = window.questManager.getQuestsAwaitingTurnIn(npc.id);
                                    if (turnInQuests?.length > 0 && QUEST_MARKER_CONFIG.TURN_IN.priority > currentMarkerPriority) {
                                        markerToDraw = QUEST_MARKER_CONFIG.TURN_IN; currentMarkerPriority = markerToDraw.priority;
                                    }
                                    if (QUEST_MARKER_CONFIG.AVAILABLE.priority > currentMarkerPriority) {
                                        const availableQuests = window.questManager.getAvailableQuestsForNpc(npc.id);
                                        if (availableQuests?.length > 0) { markerToDraw = QUEST_MARKER_CONFIG.AVAILABLE; currentMarkerPriority = markerToDraw.priority; }
                                    }
                                    if (QUEST_MARKER_CONFIG.ACTIVE_TARGET.priority > currentMarkerPriority && window.questManager.activeQuests) {
                                        for (const [, questState] of window.questManager.activeQuests.entries()) {
                                            for (const objective of questState.data.objectives) {
                                                const progress = questState.progress.find(p => p.objectiveId === objective.id);
                                                if (objective.targetNpcId === npc.id && progress && !progress.isComplete) {
                                                    let canBeActiveMarker = true;
                                                    const objIndex = questState.data.objectives.findIndex(o => o.id === objective.id);
                                                    for (let k = 0; k < objIndex; k++) {
                                                        const prevObjProg = questState.progress.find(p => p.objectiveId === questState.data.objectives[k].id);
                                                        if (!prevObjProg?.isComplete) { canBeActiveMarker = false; break; }
                                                    }
                                                    if (canBeActiveMarker) { markerToDraw = QUEST_MARKER_CONFIG.ACTIVE_TARGET; break; }
                                                }
                                            }
                                            if (markerToDraw?.char === QUEST_MARKER_CONFIG.ACTIVE_TARGET.char) break;
                                        }
                                    }
                                }
                                if (markerToDraw) {
                                    cachedCell.span.textContent = markerToDraw.char;
                                    cachedCell.span.style.color = markerToDraw.color;
                                } else {
                                    cachedCell.span.textContent = npc.sprite || '?';
                                    cachedCell.span.style.color = npc.color || 'white';
                                }
                            }
                        }
                    }
                }
            });
        }

        if (gameState.isTargetingMode && gameState.tileCache) {
            const targetX = gameState.targetingCoords.x, targetY = gameState.targetingCoords.y;
            if (targetX >= 0 && targetX < W && targetY >= 0 && targetY < H) {
                const cachedCell = gameState.tileCache[targetY]?.[targetX];
                if (cachedCell?.span) {
                    cachedCell.span.textContent = 'X'; cachedCell.span.style.color = 'red';
                    if (!cachedCell.span.classList.contains('flashing-targeting-cursor')) cachedCell.span.classList.add('flashing-targeting-cursor');
                }
            }
        }
        if (gameState.tileCache) { /* Clear combat highlights */
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const cell = gameState.tileCache[y]?.[x];
                if (cell?.span && (cell.span.dataset.isAttackerHighlighted === 'true' || cell.span.dataset.isDefenderHighlighted === 'true')) {
                    cell.span.style.backgroundColor = '';
                    delete cell.span.dataset.isAttackerHighlighted; delete cell.span.dataset.isDefenderHighlighted;
                }
            }
        }
        if (gameState.isInCombat && gameState.tileCache) { /* Apply combat highlights */
            if (gameState.attackerMapPos) {
                const ac = gameState.tileCache[gameState.attackerMapPos.y]?.[gameState.attackerMapPos.x];
                if (ac?.span) { ac.span.style.backgroundColor = 'rgba(255,0,0,0.3)'; ac.span.dataset.isAttackerHighlighted = 'true'; }
            }
            if (gameState.defenderMapPos) {
                const dc = gameState.tileCache[gameState.defenderMapPos.y]?.[gameState.defenderMapPos.x];
                if (dc?.span) { dc.span.style.backgroundColor = 'rgba(0,0,255,0.3)'; dc.span.dataset.isDefenderHighlighted = 'true'; }
            }
        }
        this.updateMapHighlight();
    },
    updateMapHighlight: function () {
        document.querySelectorAll('.tile.flashing').forEach(el => el.classList.remove('flashing'));
        const idx = gameState.selectedItemIndex;
        if (!gameState.interactableItems || idx < 0 || idx >= gameState.interactableItems.length) return;
        const it = gameState.interactableItems[idx];
        if (!it) return; const x = it.x, y = it.y;
        if (typeof x !== 'number' || typeof y !== 'number') return;
        const cachedCell = gameState.tileCache?.[y]?.[x];
        if (cachedCell?.span) cachedCell.span.classList.add('flashing');
        else { const span = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`); if (span) span.classList.add('flashing'); }
    },
    toggleRoof: function () {
        gameState.showRoof = !gameState.showRoof; this.scheduleRender();
        if (typeof logToConsole === 'function') logToConsole("Roof layer toggled " + (gameState.showRoof ? "on" : "off"));
    },
    isPassable: function (tileId) {
        if (!tileId) return true; const tileData = assetManagerInstance?.tilesets?.[tileId];
        if (!tileData) return true; const tags = tileData.tags || [];
        return !tags.includes("impassable");
    },
    getCollisionTileAt: function (x, y) {
        const mapData = this.getCurrentMapData(); if (!mapData || !mapData.layers) return "";
        const tilesets = assetManagerInstance?.tilesets; if (!tilesets) return "";
        const bld = mapData.layers.building?.[y]?.[x]; if (bld && tilesets[bld]) return bld;
        const itm = mapData.layers.item?.[y]?.[x]; if (itm && tilesets[itm]) return itm;
        const lsp = mapData.layers.landscape?.[y]?.[x]; if (lsp && tilesets[lsp]) return lsp;
        return "";
    }
};