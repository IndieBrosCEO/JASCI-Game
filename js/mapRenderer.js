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
    if (!levelData || !levelData.bottom || !levelData.middle) return true; // Treat missing Z-levels or layers as blocking

    // Check middle layer first
    const tileOnMiddleRaw = levelData.middle[tileY]?.[tileX];
    const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;
    if (effectiveTileOnMiddle && effectiveTileOnMiddle !== "") {
        const tileDefMiddle = currentAssetManager.tilesets[effectiveTileOnMiddle];
        if (tileDefMiddle && tileDefMiddle.tags) {
            if (tileDefMiddle.tags.includes('transparent_to_light') || tileDefMiddle.tags.includes('transparent') || tileDefMiddle.tags.includes('allows_vision')) {
                // Middle tile is transparent to light, passes through IT. Now check bottom layer.
            } else if (tileDefMiddle.tags.includes('blocks_light') || tileDefMiddle.tags.includes('blocks_vision') || tileDefMiddle.tags.includes('impassable')) {
                return true; // Middle tile blocks light
            } else {
                // Default: if it's on middle and not explicitly transparent to light, assume it blocks.
                return true;
            }
        } else if (tileDefMiddle) { // Has a def but no tags
            return true; // Untagged middle items generally block light
        }
    }

    // If middle layer was empty or transparent, check bottom layer
    const tileOnBottomRaw = levelData.bottom[tileY]?.[tileX];
    const effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw !== null && tileOnBottomRaw.tileId !== undefined) ? tileOnBottomRaw.tileId : tileOnBottomRaw;
    if (effectiveTileOnBottom && effectiveTileOnBottom !== "") {
        const tileDefBottom = currentAssetManager.tilesets[effectiveTileOnBottom];
        if (tileDefBottom && tileDefBottom.tags) {
            if (tileDefBottom.tags.includes('transparent_to_light') || tileDefBottom.tags.includes('transparent_floor') || tileDefBottom.tags.includes('transparent') || tileDefBottom.tags.includes('allows_vision')) {
                return false; // Bottom tile is transparent to light.
            }
            // If it's a floor (most bottom tiles are), and not transparent to light, it blocks light to Z-1.
            if (tileDefBottom.tags.includes('floor')) {
                return true;
            }
            // Other bottom layer types that aren't floors and aren't transparent to light might exist. Assume they block.
            return true;
        } else if (tileDefBottom) { // Has a def but no tags
            // Untagged bottom items, if not floors, might be rare. If it's a floor by name, it blocks.
            if (tileDefBottom.name && tileDefBottom.name.toLowerCase().includes("floor")) return true;
            return false; // Otherwise, untagged non-floor on bottom, assume non-blocking for light.
        }
    }

    return false; // Default: tile does not block light if no specific blocking condition met (e.g., empty cell)
}

// New helper function to check if a tile is "empty" for passage (e.g., for Z-transitions)
// Returns true if the tile at x,y,z has NO tile in the bottom or middle layer, false otherwise.
function isTileEmpty(x, y, z) {
    const mapData = window.mapRenderer.getCurrentMapData();
    // tilesets are not needed for the simplified check, but assetManagerInstance might be used by other functions.
    // const tilesets = assetManagerInstance ? assetManagerInstance.tilesets : null; 

    if (!mapData || !mapData.levels || !mapData.dimensions) {
        // console.warn(`isTileEmpty: Critical data missing for ${x},${y},${z}. Assuming not empty for safety.`);
        // If map data itself is missing, it's safer to assume not empty than to allow passage into undefined areas.
        // However, if the specific levelData is missing later, that means open air.
        return false;
    }

    if (x < 0 || y < 0 || y >= mapData.dimensions.height || x >= mapData.dimensions.width) {
        // console.warn(`isTileEmpty: Coordinates ${x},${y},${z} out of bounds. Assuming not empty.`);
        return false; // Out of bounds is not empty for passage.
    }

    const zStr = z.toString();
    const levelData = mapData.levels[zStr];

    if (!levelData) {
        // console.log(`isTileEmpty: No level data for Z=${z}. Assuming empty (open air).`);
        return true; // No level data for this Z means it's open air, thus empty.
    }

    // Check middle layer for any tile presence
    const tileOnMiddleRaw = levelData.middle?.[y]?.[x];
    const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined)
        ? tileOnMiddleRaw.tileId
        : tileOnMiddleRaw;

    if (effectiveTileOnMiddle && effectiveTileOnMiddle !== "") {
        // console.log(`isTileEmpty: Middle layer at ${x},${y},${z} has tile ${effectiveTileOnMiddle}. Not empty.`);
        return false; // Any tile on the middle layer makes it not empty.
    }

    // Check bottom layer for any tile presence
    const tileOnBottomRaw = levelData.bottom?.[y]?.[x];
    const effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw !== null && tileOnBottomRaw.tileId !== undefined)
        ? tileOnBottomRaw.tileId
        : tileOnBottomRaw;

    if (effectiveTileOnBottom && effectiveTileOnBottom !== "") {
        // console.log(`isTileEmpty: Bottom layer at ${x},${y},${z} has tile ${effectiveTileOnBottom}. Not empty.`);
        return false; // Any tile on the bottom layer makes it not empty.
    }

    // If both middle and bottom layers are clear (no tileId or empty string), the tile is empty.
    // console.log(`isTileEmpty: Tile ${x},${y},${z} is considered empty (no tiles on middle or bottom).`);
    return true;
}
// window.mapRenderer.isTileEmpty = isTileEmpty; // Expose it -- Will be assigned below // MOVED


// Updated isTileIlluminated to be 3D
function isTileIlluminated(targetX, targetY, targetZ, lightSource) { // targetZ added, lightSource now includes .z
    // Gracefully handle undefined or invalid lightSource
    if (!lightSource || typeof lightSource.x === 'undefined' || typeof lightSource.y === 'undefined' || typeof lightSource.z === 'undefined' || typeof lightSource.radius === 'undefined') {
        // console.warn("isTileIlluminated called with invalid lightSource:", lightSource); // Optional: for debugging
        return false; // Cannot be illuminated by an invalid source
    }

    const sourceX = lightSource.x;
    const sourceY = lightSource.y;
    const sourceZ = lightSource.z;
    const sourceRadius = lightSource.radius;

    const lightSourcePosition = { x: sourceX, y: sourceY, z: sourceZ }; // For getDistance3D
    const distance = getDistance3D({ x: targetX, y: targetY, z: targetZ }, lightSourcePosition);

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


// This function now primarily checks for same-Z level obstructions (e.g., walls, tall furniture on the middle layer).
// Inter-Z blocking (floors/ceilings) is handled by the modified hasLineOfSight3D in js/utils.js.
function isTileBlockingVision(tileX, tileY, tileZ) {
    const tilesets = window.assetManagerInstance ? window.assetManagerInstance.tilesets : null;
    const mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

    if (!tilesets || !mapData || !mapData.levels) {
        // console.warn("isTileBlockingVision: Missing critical data, assuming non-blocking for same-Z check.");
        return false;
    }

    const zStr = tileZ.toString();
    const levelData = mapData.levels[zStr];

    // For same-Z vision, we only care about obstructions on the 'middle' layer of the tile being checked.
    // Floors ('bottom' layer) do not block horizontal vision on their own Z-level.
    if (!levelData || !levelData.middle) {
        // console.warn(`isTileBlockingVision: Missing levelData or middle layer for Z:${tileZ}. Assuming non-blocking for same-Z.`);
        return false; // No middle layer means no same-Z obstruction from it.
    }

    const tileOnMiddleRaw = levelData.middle[tileY]?.[tileX];
    const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined)
        ? tileOnMiddleRaw.tileId
        : tileOnMiddleRaw;

    if (effectiveTileOnMiddle && effectiveTileOnMiddle !== "") {
        const tileDefMiddle = tilesets[effectiveTileOnMiddle];
        if (tileDefMiddle && tileDefMiddle.tags) {
            // If it explicitly allows vision or is transparent, it does not block.
            if (tileDefMiddle.tags.includes('allows_vision') || tileDefMiddle.tags.includes('transparent')) {
                return false;
            }
            // If it's tagged to block vision or is generally impassable (like a solid wall/object), it blocks.
            if (tileDefMiddle.tags.includes('blocks_vision') || tileDefMiddle.tags.includes('impassable')) {
                // Special case: "impassable" doors that are "closed" block vision.
                // Open doors should have "allows_vision" or "transparent".
                if (tileDefMiddle.tags.includes('door') && tileDefMiddle.tags.includes('closed')) {
                    return true;
                }
                // If it's not a door, but is impassable or blocks_vision, then it blocks.
                if (!tileDefMiddle.tags.includes('door')) {
                    return true;
                }
                // An 'impassable' 'door' that is not 'closed' (e.g. broken open) would need 'allows_vision' or 'transparent'
                // to not block, which is handled by the first check.
            }
            // Default for other items on the middle layer that aren't explicitly transparent: assume they block vision.
            // This catches things like furniture, walls, etc., that should obstruct same-Z LOS.
            return true;
        } else if (tileDefMiddle) { // Has a definition but no tags (e.g. a custom tile).
            return true; // Untagged middle items default to blocking vision for safety.
        }
        // If effectiveTileOnMiddle exists but no tileDef (unknown tile ID), assume it blocks.
        return true;
    }

    // If the middle layer at (tileX, tileY, tileZ) is empty, it does not block vision on this Z-plane.
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
// Moved helper function definitions above this object:
// - blendColors
// - brightenColor
// - getAmbientLightColor
// - isTileBlockingLight
// - isTileEmpty
// - isTileIlluminated
// - getLine2D
// - getLine3D
// - isTileBlockingVision
// - isTileVisible

window.mapRenderer = {
    initMapRenderer: function (assetMgr) {
        assetManagerInstance = assetMgr;
        // Now that assetManagerInstance is set, make helper functions available
        // if they depend on it (though most here are pure or use window.mapRenderer.getCurrentMapData)
    },

    // Assign helper functions to be part of the mapRenderer object
    blendColors: blendColors,
    brightenColor: brightenColor,
    getAmbientLightColor: getAmbientLightColor,
    isTileBlockingLight: isTileBlockingLight,
    // isTileEmpty is already assigned at the end of the object
    isTileIlluminated: isTileIlluminated,
    getLine2D: getLine2D,
    getLine3D: getLine3D,
    isTileBlockingVision: isTileBlockingVision,
    isTileVisible: isTileVisible,

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
                    // Scan new 'bottom' and 'middle' layers for lights
                    const layersToScanForLights = ['bottom', 'middle'];

                    for (const layerName of layersToScanForLights) {
                        const layer = levelData[layerName];
                        if (layer) {
                            for (let r = 0; r < H; r++) {
                                for (let c = 0; c < W; c++) {
                                    // tileId can now be an object {tileId: "...", ...} or string ID
                                    const tileData = layer[r]?.[c];
                                    const baseTileId = (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined)
                                        ? tileData.tileId
                                        : tileData;

                                    if (baseTileId && assetManagerInstance && assetManagerInstance.tilesets) {
                                        const tileDef = assetManagerInstance.tilesets[baseTileId];
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
            if (gameState.lightSources.length > 0) {
                logToConsole(`Initialized ${gameState.lightSources.length} static light sources from map tiles across all Z-levels.`);
            }

            // Populate container instances from map tiles across all Z-levels
            for (const zLevelKey in mapData.levels) {
                if (mapData.levels.hasOwnProperty(zLevelKey)) {
                    const z = parseInt(zLevelKey, 10);
                    const levelData = mapData.levels[zLevelKey];
                    // Scan new 'bottom' and 'middle' layers for containers
                    const layersToScanForContainers = ['bottom', 'middle'];

                    for (const layerName of layersToScanForContainers) {
                        const layer = levelData[layerName];
                        if (layer) {
                            for (let r = 0; r < H; r++) {
                                for (let c = 0; c < W; c++) {
                                    const tileData = layer[r]?.[c];
                                    const baseTileId = (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined)
                                        ? tileData.tileId
                                        : tileData;

                                    if (baseTileId && assetManagerInstance && assetManagerInstance.tilesets && assetManagerInstance.items) {
                                        const tileDef = assetManagerInstance.tilesets[baseTileId];
                                        if (tileDef && tileDef.tags && tileDef.tags.includes('container')) {
                                            // Instance properties like uniqueID, contents should be on tileData if it's an object
                                            // For now, this logic assumes they might be on tileDef or itemDef if not on tileData.
                                            // This part might need more refinement if instance-specific container data is stored on the tileData object.
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
                                                logToConsole(`Warning: Container tile '${baseTileId}' at (${c},${r}, Z:${z}) has itemLink '${linkedItemId}' but linked item not found. Defaulting to 5.`, "orange");
                                                capacity = 5;
                                            } else {
                                                logToConsole(`Warning: Container tile '${baseTileId}' at (${c},${r}, Z:${z}) has no itemLink. Defaulting capacity to 5.`, "orange");
                                                capacity = 5;
                                            }

                                            const containerInstance = {
                                                x: c,
                                                y: r,
                                                z: z, // Add Z coordinate to container
                                                id: gameState.nextContainerId++, // Ensure gameState.nextContainerId is initialized
                                                tileId: baseTileId,
                                                name: itemName,
                                                capacity: capacity,
                                                items: []
                                            };
                                            console.log(`MAP_RENDERER: Creating container instance: ID ${containerInstance.id}, TileID: ${containerInstance.tileId}, Name: ${containerInstance.name}, Pos: (${containerInstance.x},${containerInstance.y}, Z:${containerInstance.z}), Capacity: ${containerInstance.capacity}`);
                                            gameState.containers.push(containerInstance);
                                            if (typeof window.populateContainer === 'function') {
                                                window.populateContainer(containerInstance);
                                            } else {
                                                logToConsole(`Error: populateContainer function not found. Cannot populate ${containerInstance.name}.`, "red");
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (gameState.containers.length > 0) { // This log should be after the loop for all Z levels
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
            logToConsole(`Light sources updated (dynamic). Count: ${gameState.lightSources.length}`);
            this.scheduleRender();
        } else {
            logToConsole("updateLightSources: Invalid input. Expected an array.", "orange");
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

            logToConsole(`Map ${loadedMap.name} loaded by mapRenderer.js's handleMapSelectionChange. Returning map data to caller.`);
            return loadedMap; // Return the loaded map data
        } else {
            logToConsole(`Failed to load map: ${mapId}`);
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

        // Removed user_assets loading logic
        // const userMapIndexUrl = `/user_assets/maps/mapIndex.json?t=${Date.now()}`;
        // let userMapIndex = [];
        // try {
        //     const userResponse = await fetch(userMapIndexUrl);
        //     if (userResponse.ok) {
        //         userMapIndex = await userResponse.json();
        //         if (userMapIndex && userMapIndex.length > 0) {
        //             console.log("User map index found, adding to selector.");
        //             if (baseMapIndex.length > 0 && userMapIndex.length > 0) {
        //                 const separator = document.createElement('option');
        //                 separator.disabled = true;
        //                 separator.textContent = '--- User Maps ---';
        //                 mapSelector.appendChild(separator);
        //             }
        //             userMapIndex.forEach(mapInfo => {
        //                 const option = document.createElement('option');
        //                 option.value = mapInfo.id;
        //                 option.textContent = `[User] ${mapInfo.name}`;
        //                 mapSelector.appendChild(option);
        //             });
        //             console.log("User maps added to selector.");
        //             if (baseMapIndex.length === 0) {
        //                 assetManagerInstance.setMapIndexData(userMapIndex);
        //             }
        //         }
        //     } else if (userResponse.status === 404) {
        //         console.log("User map index file (/user_assets/maps/mapIndex.json) not found, skipping.");
        //     } else {
        //         throw new Error(`HTTP error! status: ${userResponse.status} for user mapIndex.json`);
        //     }
        // } catch (error) {
        //     console.error("Failed to load or process user map index:", error);
        // }
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
            // If the current view Z-level doesn't exist, render an empty void.
            if (container) {
                container.innerHTML = ""; // Clear previous content
                let voidHtml = "";
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        voidHtml += " "; // Add an empty space for each tile
                    }
                    voidHtml += "<br>"; // New line after each row
                }
                container.innerHTML = voidHtml;
                logToConsole(`renderMapLayers: No data for currentViewZ = ${currentZ}. Displaying empty grid.`);
            }
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


                // NEW LOGIC for bottom/middle and solid_terrain_top rendering
                let displaySprite = ' '; // Default for empty space
                let displayColor = '#000000'; // Default for empty space
                let tileNameForTitle = 'Empty';
                let originalDisplayIdForTitle = ''; // Not used directly in rendering, but good for debug/title
                let isSolidTerrainTopDirectlyOnCurrentZ = false;
                let finalTileDefForLightingAndFow = null; // Definition of the tile that dictates rendering for current Z view

                // 1. Determine tile from current Z-level (middle layer takes precedence over bottom)
                let tileOnBottomRawCurrentZ = currentLevelData.bottom?.[y]?.[x] || "";
                let tileOnMiddleRawCurrentZ = currentLevelData.middle?.[y]?.[x] || "";

                let effectiveTileOnBottomCurrentZ = (typeof tileOnBottomRawCurrentZ === 'object' && tileOnBottomRawCurrentZ !== null && tileOnBottomRawCurrentZ.tileId !== undefined) ? tileOnBottomRawCurrentZ.tileId : tileOnBottomRawCurrentZ;
                let effectiveTileOnMiddleCurrentZ = (typeof tileOnMiddleRawCurrentZ === 'object' && tileOnMiddleRawCurrentZ !== null && tileOnMiddleRawCurrentZ.tileId !== undefined) ? tileOnMiddleRawCurrentZ.tileId : tileOnMiddleRawCurrentZ;

                let tileDefOnBottomCurrentZ = assetManagerInstance.tilesets[effectiveTileOnBottomCurrentZ];
                let tileDefOnMiddleCurrentZ = assetManagerInstance.tilesets[effectiveTileOnMiddleCurrentZ];

                let primaryTileDefOnCurrentZ = null; // The structural tile on the current Z level
                if (effectiveTileOnMiddleCurrentZ && tileDefOnMiddleCurrentZ) {
                    primaryTileDefOnCurrentZ = tileDefOnMiddleCurrentZ;
                    originalDisplayIdForTitle = effectiveTileOnMiddleCurrentZ;
                } else if (effectiveTileOnBottomCurrentZ && tileDefOnBottomCurrentZ) {
                    primaryTileDefOnCurrentZ = tileDefOnBottomCurrentZ;
                    originalDisplayIdForTitle = effectiveTileOnBottomCurrentZ;
                }

                // 2. Apply solid_terrain_top Rule 4 (display '▓' on own Z-level)
                if (primaryTileDefOnCurrentZ && primaryTileDefOnCurrentZ.tags && primaryTileDefOnCurrentZ.tags.includes('solid_terrain_top')) {
                    displaySprite = '▓'; // Rule 4a
                    displayColor = primaryTileDefOnCurrentZ.color;
                    tileNameForTitle = primaryTileDefOnCurrentZ.name;
                    isSolidTerrainTopDirectlyOnCurrentZ = true;
                    finalTileDefForLightingAndFow = primaryTileDefOnCurrentZ;
                } else if (primaryTileDefOnCurrentZ) {
                    displaySprite = primaryTileDefOnCurrentZ.sprite;
                    displayColor = primaryTileDefOnCurrentZ.color;
                    tileNameForTitle = primaryTileDefOnCurrentZ.name;
                    finalTileDefForLightingAndFow = primaryTileDefOnCurrentZ;
                }
                // else, displaySprite and displayColor remain ' ' and 'black' for empty, tileNameForTitle 'Empty'

                // 3. Apply solid_terrain_top Rule 3 (viewing top of Z-1, render with custom sprite & no tint)
                // This happens if the current Z-level cell is see-through.
                let isCurrentCellSeeThrough = (!primaryTileDefOnCurrentZ); // Empty is see-through
                if (primaryTileDefOnCurrentZ && primaryTileDefOnCurrentZ.tags &&
                    (primaryTileDefOnCurrentZ.tags.includes('transparent_floor') || primaryTileDefOnCurrentZ.tags.includes('allows_vision') || primaryTileDefOnCurrentZ.tags.includes('transparent_bottom'))) {
                    // If there's a transparent floor/item on current Z, and it's NOT a solid_terrain_top itself, then it's see-through.
                    if (!isSolidTerrainTopDirectlyOnCurrentZ) {
                        isCurrentCellSeeThrough = true;
                    }
                }

                if (isCurrentCellSeeThrough) { // Note: isSolidTerrainTopDirectlyOnCurrentZ check is implicitly handled by isCurrentCellSeeThrough logic
                    const zBelowStr = (currentZ - 1).toString();
                    const levelBelow = fullMapData.levels[zBelowStr];
                    if (levelBelow) {
                        let tileBottomBelowRaw = levelBelow.bottom?.[y]?.[x] || "";
                        let tileMiddleBelowRaw = levelBelow.middle?.[y]?.[x] || "";
                        let effTileBottomBelow = (typeof tileBottomBelowRaw === 'object' && tileBottomBelowRaw !== null && tileBottomBelowRaw.tileId !== undefined) ? tileBottomBelowRaw.tileId : tileBottomBelowRaw;
                        let effTileMiddleBelow = (typeof tileMiddleBelowRaw === 'object' && tileMiddleBelowRaw !== null && tileMiddleBelowRaw.tileId !== undefined) ? tileMiddleBelowRaw.tileId : tileMiddleBelowRaw;

                        let tileDefFromBelowToDisplay = null;
                        let idFromBelowToDisplay = null;

                        // Prefer middle layer of Z-1 if it's solid_terrain_top
                        if (effTileMiddleBelow && assetManagerInstance.tilesets[effTileMiddleBelow]?.tags.includes('solid_terrain_top')) {
                            tileDefFromBelowToDisplay = assetManagerInstance.tilesets[effTileMiddleBelow];
                            idFromBelowToDisplay = effTileMiddleBelow;
                        }
                        // Else, check bottom layer of Z-1 if it's solid_terrain_top
                        else if (effTileBottomBelow && assetManagerInstance.tilesets[effTileBottomBelow]?.tags.includes('solid_terrain_top')) {
                            tileDefFromBelowToDisplay = assetManagerInstance.tilesets[effTileBottomBelow];
                            idFromBelowToDisplay = effTileBottomBelow;
                        }

                        if (tileDefFromBelowToDisplay) {
                            displaySprite = tileDefFromBelowToDisplay.sprite; // Rule 4b (custom sprite from Z-1)
                            displayColor = tileDefFromBelowToDisplay.color;   // Rule 3 (no tint)
                            tileNameForTitle = tileDefFromBelowToDisplay.name;
                            originalDisplayIdForTitle = idFromBelowToDisplay; // Update to reflect what's shown
                            // finalTileDefForLightingAndFow should represent what's visually there.
                            // If we are seeing the top of Z-1, that's the effective surface for lighting/FOW.
                            finalTileDefForLightingAndFow = tileDefFromBelowToDisplay;
                        }
                    }
                }

                // `originalSprite` and `originalColor` are used by subsequent lighting/FOW logic
                // They should reflect the state *before* FOW, but *after* structural rendering (bottom/middle + solid_terrain_top rules)
                let originalSprite = displaySprite;
                let originalColor = displayColor;
                // The finalTileId used for some item checks later needs to be the ID that corresponds to originalSprite/Color
                finalTileId = originalDisplayIdForTitle; // Assign to existing finalTileId

                // END OF NEW LOGIC

                let fowStatus = 'hidden';
                if (currentFowData && currentFowData[y] && typeof currentFowData[y][x] !== 'undefined') {
                    fowStatus = currentFowData[y][x];
                }

                // displaySprite is already declared earlier in the function
                displaySprite = originalSprite;
                // displayColor is already declared earlier in the function
                displayColor = originalColor;
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
                            if (isTileIlluminated(x, y, currentZ, source)) {
                                isLit = true;
                                break;
                            }
                        }
                    }

                    if (fowStatus === 'visible') {
                        if (isLit) {
                            let activeLight = null;
                            for (const source of lightsOnCurrentZ) {
                                if (isTileIlluminated(x, y, currentZ, source)) { activeLight = source; break; }
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
                                if (isTileIlluminated(x, y, currentZ, source)) { activeLight = source; break; }
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

        // --- Onion Skinning Logic ---
        const BASE_ONION_SKIN_DARKEN_FACTOR = 0.5;
        const EXTRA_DARKEN_PER_LEVEL = 0.1; // Additional darkening for each level away
        const MAX_ONION_DARKEN_FACTOR = 0.85;

        const ONION_SKIN_ABOVE_TINT_COLOR = '#003300'; // Dark green
        const BASE_ONION_SKIN_ABOVE_TINT_FACTOR = 0.6;
        const EXTRA_ABOVE_TINT_PER_LEVEL = 0.1;
        const MAX_ABOVE_TINT_FACTOR = 0.9;

        const ONION_SKIN_BELOW_TINT_COLOR = '#330000'; // Dark red
        const BASE_ONION_SKIN_BELOW_TINT_FACTOR = 0.6;
        const EXTRA_BELOW_TINT_PER_LEVEL = 0.1;
        const MAX_BELOW_TINT_FACTOR = 0.9;

        const maxLevelsAbove = gameState.onionSkinLevelsAbove || 0;
        const maxLevelsBelow = gameState.onionSkinLevelsBelow || 0;

        // Render Z-levels below (onion skin)
        for (let zOffset = 1; zOffset <= maxLevelsBelow; zOffset++) {
            const onionZ = currentZ - zOffset;
            const levelDataBelow = fullMapData.levels[onionZ.toString()];
            if (!levelDataBelow || !tileCacheData) continue;

            const distanceFactor = zOffset;
            const currentDarkenFactor = Math.min(MAX_ONION_DARKEN_FACTOR, BASE_ONION_SKIN_DARKEN_FACTOR + (distanceFactor - 1) * EXTRA_DARKEN_PER_LEVEL);
            const currentBelowTintFactor = Math.min(MAX_BELOW_TINT_FACTOR, BASE_ONION_SKIN_BELOW_TINT_FACTOR + (distanceFactor - 1) * EXTRA_BELOW_TINT_PER_LEVEL);

            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (!tileCacheData[y] || !tileCacheData[y][x]) continue;

                    const currentCachedCell = tileCacheData[y][x];
                    const currentSpan = currentCachedCell.span;

                    // Check if the current Z tile (and all layers above it up to currentZ - 1) are see-through for this onion layer
                    let isPathSeeThrough = true;
                    for (let interZ = onionZ + 1; interZ <= currentZ; interZ++) {
                        const interLevelData = fullMapData.levels[interZ.toString()];
                        const interTileIdOnViewZ = (interZ === currentZ) ? currentCachedCell.displayedId : null; // Use cached for currentZ, else query
                        const interTileDefOnViewZ = assetManagerInstance.tilesets[interTileIdOnViewZ];

                        let isCurrentInterTileSeeThrough = false;
                        if (interZ === currentZ) { // Use already determined displayedId for current view Z
                            if (interTileIdOnViewZ === "PLAYER_STATIC" || interTileIdOnViewZ?.startsWith("NPC_") || interTileIdOnViewZ === "FOW_HIDDEN") {
                                isCurrentInterTileSeeThrough = false;
                            } else if (!interTileIdOnViewZ) { // Truly empty cell on current Z
                                isCurrentInterTileSeeThrough = true;
                            } else if (interTileDefOnViewZ && interTileDefOnViewZ.tags && (interTileDefOnViewZ.tags.includes('transparent_floor') || interTileDefOnViewZ.tags.includes('allows_vision') || interTileDefOnViewZ.tags.includes('transparent_bottom'))) {
                                isCurrentInterTileSeeThrough = true;
                            } else {
                                isCurrentInterTileSeeThrough = false;
                            }
                        } else { // For intermediate layers between onionZ and currentZ
                            const interMiddleRaw = interLevelData?.middle?.[y]?.[x];
                            const interBottomRaw = interLevelData?.bottom?.[y]?.[x];
                            const effInterMid = (typeof interMiddleRaw === 'object' && interMiddleRaw?.tileId !== undefined) ? interMiddleRaw.tileId : interMiddleRaw;
                            const effInterBot = (typeof interBottomRaw === 'object' && interBottomRaw?.tileId !== undefined) ? interBottomRaw.tileId : interBottomRaw;
                            const defInterMid = assetManagerInstance.tilesets[effInterMid];
                            const defInterBot = assetManagerInstance.tilesets[effInterBot];

                            if (effInterMid && defInterMid && !(defInterMid.tags && (defInterMid.tags.includes('transparent') || defInterMid.tags.includes('allows_vision')))) { // Middle layer blocks
                                isCurrentInterTileSeeThrough = false;
                            } else if (effInterBot && defInterBot && !(defInterBot.tags && (defInterBot.tags.includes('transparent_floor') || defInterBot.tags.includes('transparent_bottom') || defInterBot.tags.includes('allows_vision')))) { // Bottom layer blocks
                                isCurrentInterTileSeeThrough = false;
                            } else if (!effInterMid && !effInterBot && interLevelData) { // Both empty on existing level
                                isCurrentInterTileSeeThrough = true;
                            } else if (!interLevelData) { // Level doesn't exist (void)
                                isCurrentInterTileSeeThrough = true;
                            } else { // Default to not see-through if some tile exists but not explicitly transparent
                                isCurrentInterTileSeeThrough = false;
                            }
                        }

                        if (!isCurrentInterTileSeeThrough) {
                            isPathSeeThrough = false;
                            break;
                        }
                    }

                    if (isPathSeeThrough) {
                        let tileBelowId = null;
                        const middleBelow = levelDataBelow.middle?.[y]?.[x];
                        const bottomBelow = levelDataBelow.bottom?.[y]?.[x];
                        const effMidBelow = (typeof middleBelow === 'object' && middleBelow?.tileId !== undefined) ? middleBelow.tileId : middleBelow;
                        const effBotBelow = (typeof bottomBelow === 'object' && bottomBelow?.tileId !== undefined) ? bottomBelow.tileId : bottomBelow;

                        tileBelowId = effMidBelow || effBotBelow;

                        if (tileBelowId) {
                            const tileDefBelow = assetManagerInstance.tilesets[tileBelowId];
                            if (tileDefBelow) {
                                let displayColorBelow = tileDefBelow.color;
                                let displaySpriteBelow = tileDefBelow.sprite;

                                if (tileDefBelow.tags && tileDefBelow.tags.includes('solid_terrain_top') && zOffset === 1) {
                                    // Render solid_terrain_top from one level below with original color and its actual sprite
                                } else {
                                    displayColorBelow = blendColors(tileDefBelow.color, '#000000', currentDarkenFactor);
                                    displayColorBelow = blendColors(displayColorBelow, ONION_SKIN_BELOW_TINT_COLOR, currentBelowTintFactor);
                                }
                                currentSpan.textContent = displaySpriteBelow;
                                currentSpan.style.color = displayColorBelow;
                            }
                        }
                    }
                }
            }
        }

        // Render Z-levels above (onion skin)
        for (let zOffset = 1; zOffset <= maxLevelsAbove; zOffset++) {
            const onionZ = currentZ + zOffset;
            const levelDataAbove = fullMapData.levels[onionZ.toString()];
            if (!levelDataAbove || !tileCacheData) continue;

            const distanceFactor = zOffset;
            const currentDarkenFactor = Math.min(MAX_ONION_DARKEN_FACTOR, BASE_ONION_SKIN_DARKEN_FACTOR + (distanceFactor - 1) * EXTRA_DARKEN_PER_LEVEL);
            const currentAboveTintFactor = Math.min(MAX_ABOVE_TINT_FACTOR, BASE_ONION_SKIN_ABOVE_TINT_FACTOR + (distanceFactor - 1) * EXTRA_ABOVE_TINT_PER_LEVEL);

            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (!tileCacheData[y] || !tileCacheData[y][x]) continue;

                    const currentCachedCell = tileCacheData[y][x];
                    const currentSpan = currentCachedCell.span;

                    let isPathSeeThrough = true;
                    // Check if current Z tile (and all layers below it down to currentZ + 1) are see-through for this onion layer
                    for (let interZ = onionZ - 1; interZ >= currentZ; interZ--) {
                        const interLevelData = fullMapData.levels[interZ.toString()];
                        const interTileIdOnViewZ = (interZ === currentZ) ? currentCachedCell.displayedId : null;
                        const interTileDefOnViewZ = assetManagerInstance.tilesets[interTileIdOnViewZ];

                        let isCurrentInterTileSeeThrough = false;
                        if (interZ === currentZ) {
                            if (interTileIdOnViewZ === "PLAYER_STATIC" || interTileIdOnViewZ?.startsWith("NPC_") || interTileIdOnViewZ === "FOW_HIDDEN") {
                                isCurrentInterTileSeeThrough = false;
                            } else if (!interTileIdOnViewZ) {
                                isCurrentInterTileSeeThrough = true;
                            } else if (interTileDefOnViewZ && interTileDefOnViewZ.tags && (interTileDefOnViewZ.tags.includes('transparent_floor') || interTileDefOnViewZ.tags.includes('allows_vision') || interTileDefOnViewZ.tags.includes('transparent_bottom'))) {
                                isCurrentInterTileSeeThrough = true;
                            } else {
                                isCurrentInterTileSeeThrough = false;
                            }
                        } else { // For intermediate layers between currentZ and onionZ (above)
                            const interMiddleRaw = interLevelData?.middle?.[y]?.[x];
                            const interBottomRaw = interLevelData?.bottom?.[y]?.[x];
                            const effInterMid = (typeof interMiddleRaw === 'object' && interMiddleRaw?.tileId !== undefined) ? interMiddleRaw.tileId : interMiddleRaw;
                            const effInterBot = (typeof interBottomRaw === 'object' && interBottomRaw?.tileId !== undefined) ? interBottomRaw.tileId : interBottomRaw;
                            const defInterMid = assetManagerInstance.tilesets[effInterMid];
                            const defInterBot = assetManagerInstance.tilesets[effInterBot];
                            // For seeing "up", the intermediate layer needs to be like a transparent ceiling or empty.
                            // This is complex. A simple start: if middle is NOT transparent, or bottom is NOT transparent_floor, it blocks.
                            if (effInterMid && defInterMid && !(defInterMid.tags && (defInterMid.tags.includes('transparent_ceiling') || defInterMid.tags.includes('transparent') || defInterMid.tags.includes('allows_vision')))) {
                                isCurrentInterTileSeeThrough = false;
                            } else if (effInterBot && defInterBot && !(defInterBot.tags && (defInterBot.tags.includes('transparent_ceiling') || defInterBot.tags.includes('transparent_floor') || defInterBot.tags.includes('transparent_bottom') || defInterBot.tags.includes('allows_vision')))) {
                                isCurrentInterTileSeeThrough = false;
                            } else if (!effInterMid && !effInterBot && interLevelData) { // Both empty
                                isCurrentInterTileSeeThrough = true;
                            } else if (!interLevelData) { // Void
                                isCurrentInterTileSeeThrough = true;
                            } else {
                                isCurrentInterTileSeeThrough = false;
                            }
                        }
                        if (!isCurrentInterTileSeeThrough) {
                            isPathSeeThrough = false;
                            break;
                        }
                    }

                    if (isPathSeeThrough) {
                        let tileAboveId = null;
                        const middleAbove = levelDataAbove.middle?.[y]?.[x];
                        const bottomAbove = levelDataAbove.bottom?.[y]?.[x];
                        const effMidAbove = (typeof middleAbove === 'object' && middleAbove?.tileId !== undefined) ? middleAbove.tileId : middleAbove;
                        const effBotAbove = (typeof bottomAbove === 'object' && bottomAbove?.tileId !== undefined) ? bottomAbove.tileId : bottomAbove;
                        tileAboveId = effMidAbove || effBotAbove;

                        if (tileAboveId) {
                            const tileDefAbove = assetManagerInstance.tilesets[tileAboveId];
                            if (tileDefAbove) {
                                let canShowTileFromAbove = true;
                                const isRoofTileAbove = tileDefAbove.tags && tileDefAbove.tags.includes('roof');
                                if (isRoofTileAbove && !gameState.showRoof && zOffset === 1) { // Only apply showRoof to immediate Z+1
                                    canShowTileFromAbove = false;
                                }

                                if (canShowTileFromAbove) {
                                    let displayColorAbove = blendColors(tileDefAbove.color, '#000000', currentDarkenFactor);
                                    displayColorAbove = blendColors(displayColorAbove, ONION_SKIN_ABOVE_TINT_COLOR, currentAboveTintFactor);
                                    currentSpan.textContent = tileDefAbove.sprite;
                                    currentSpan.style.color = displayColorAbove;
                                }
                            }
                        }
                    }
                }
            }
        }
        // --- End Onion Skinning Logic ---


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
                        const isTargetingCursorHere = gameState.isTargetingMode && npcX === gameState.targetingCoords.x && npcY === gameState.targetingCoords.y && gameState.targetingCoords.z === currentZ; // Added Z check for targeting cursor

                        // Check if the player was already rendered at this tile in the current frame
                        const cachedCell = tileCacheData[npcY]?.[npcX];
                        const playerAlreadyRenderedOnTile = cachedCell?.displayedId === "PLAYER_STATIC";

                        if (!roofObscures && !playerIsHere && !isTargetingCursorHere && !playerAlreadyRenderedOnTile) {
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
        logToConsole("Roof layer toggled " + (gameState.showRoof ? "on" : "off"));
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

        // Primarily check the 'middle' layer for impassable tiles.
        // 'bottom' layer tiles (floors) are generally not collision objects themselves,
        // but something on the 'middle' layer above a floor would be.
        const tileOnMiddleRaw = levelData.middle?.[y]?.[x];
        const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined)
            ? tileOnMiddleRaw.tileId
            : tileOnMiddleRaw;

        if (effectiveTileOnMiddle && effectiveTileOnMiddle !== "") {
            const tileDefMiddle = tilesets[effectiveTileOnMiddle];
            if (tileDefMiddle && tileDefMiddle.tags && tileDefMiddle.tags.includes('impassable')) {
                return effectiveTileOnMiddle; // Found an impassable tile on the middle layer
            }
        }

        // Optionally, check 'bottom' layer if some bottom tiles can be inherently impassable (e.g. spikes on floor)
        // For now, assuming 'bottom' layer is generally passable and 'middle' contains primary obstacles.
        // If a bottom tile like 'spikes' should be impassable, it might be better on 'middle' conceptually,
        // or this function would need to check bottom as well.
        // Example:
        // const tileOnBottomRaw = levelData.bottom?.[y]?.[x];
        // const effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && ... ) ? ... : tileOnBottomRaw;
        // if (effectiveTileOnBottom && ...) {
        //     const tileDefBottom = tilesets[effectiveTileOnBottom];
        //     if (tileDefBottom && tileDefBottom.tags && tileDefBottom.tags.includes('impassable_bottom_tile')) {
        //         return effectiveTileOnBottom;
        //     }
        // }

        return ""; // No impassable tile found at this x,y,z on the primary collision layer (middle)
    },

    isWalkable: function (x, y, z) {
        const debugPrefix = `isWalkable(${x},${y},${z}):`;
        // console.log(`${debugPrefix} Checking...`); // Keep console logs minimal

        const mapData = this.getCurrentMapData();
        const tilesets = assetManagerInstance ? assetManagerInstance.tilesets : null;

        if (!mapData || !mapData.levels || !mapData.dimensions || !tilesets) {
            // console.log(`${debugPrefix} Initial data missing. Result: false`);
            return false;
        }
        if (x < 0 || y < 0 || y >= mapData.dimensions.height || x >= mapData.dimensions.width) {
            // console.log(`${debugPrefix} Out of bounds. Result: false`);
            return false;
        }

        const zStr = z.toString();
        const currentLevelData = mapData.levels[zStr];

        // --- 1. Check for support from below (Z-1) ---
        let supportedFromBelow = false;
        const zBelowStr = (z - 1).toString();
        const levelDataBelow = mapData.levels[zBelowStr];
        if (levelDataBelow) {
            const tileOnMiddleBelowRaw = levelDataBelow.middle?.[y]?.[x];
            const effMidBelow = (typeof tileOnMiddleBelowRaw === 'object' && tileOnMiddleBelowRaw?.tileId !== undefined) ? tileOnMiddleBelowRaw.tileId : tileOnMiddleBelowRaw;
            if (effMidBelow && tilesets[effMidBelow]?.tags) {
                if (tilesets[effMidBelow].tags.includes('solid_terrain_top')) {
                    supportedFromBelow = true;
                }
            }
            if (!supportedFromBelow) {
                const tileOnBottomBelowRaw = levelDataBelow.bottom?.[y]?.[x];
                const effBotBelow = (typeof tileOnBottomBelowRaw === 'object' && tileOnBottomBelowRaw?.tileId !== undefined) ? tileOnBottomBelowRaw.tileId : tileOnBottomBelowRaw;
                if (effBotBelow && tilesets[effBotBelow]?.tags?.includes('solid_terrain_top')) {
                    supportedFromBelow = true;
                }
            }
        }
        // if (supportedFromBelow) console.log(`${debugPrefix} Supported from Z-1.`);

        // --- 2. Handle cases where current Z-level data is missing or malformed ---
        if (!currentLevelData || !currentLevelData.bottom || !currentLevelData.middle) {
            // If no data for current Z, it's only walkable if supported from below (e.g., air over solid ground).
            // console.log(`${debugPrefix} No/malformed level data for current Z (${zStr}). Relying on supportFromBelow (${supportedFromBelow}). Result: ${supportedFromBelow}`);
            return supportedFromBelow;
        }

        // --- 3. Check Middle Layer of Current Z ---
        const tileOnMiddleRaw = currentLevelData.middle[y]?.[x];
        const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw?.tileId !== undefined) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;

        if (effectiveTileOnMiddle && tilesets[effectiveTileOnMiddle]) {
            const tileDefMiddle = tilesets[effectiveTileOnMiddle];
            // console.log(`${debugPrefix} Middle layer @Z${z} has tile: ${effectiveTileOnMiddle}`, tileDefMiddle.tags);

            if (tileDefMiddle.tags) {
                // Explicitly walkable items on middle layer
                if (tileDefMiddle.tags.includes("walkable_on_z") || tileDefMiddle.tags.includes("z_transition")) {
                    // console.log(`${debugPrefix} Middle @Z${z} is walkable_on_z or z_transition. Result: true`);
                    return true;
                }
                // solid_terrain_top on middle layer is NOT walkable at its own Z unless it's also one of the above.
                if (tileDefMiddle.tags.includes("solid_terrain_top")) {
                    // console.log(`${debugPrefix} Middle @Z${z} is solid_terrain_top (and not walkable_on_z/z_trans). Not walkable. Result: false`);
                    return false;
                }
                // General impassable check for middle layer
                if (tileDefMiddle.tags.includes("impassable")) {
                    // console.log(`${debugPrefix} Middle @Z${z} ('${effectiveTileOnMiddle}') is impassable. Result: false`);
                    return false;
                }
            }
        } else if (effectiveTileOnMiddle && !tilesets[effectiveTileOnMiddle]) {
            // console.log(`${debugPrefix} Middle tile ${effectiveTileOnMiddle} at Z=${z} has no definition. Result: false (assuming non-walkable).`);
            return false; // Unknown tile on middle is not walkable.
        }
        // If middle layer is empty or has a non-blocking defined tile, proceed.

        // --- 4. Check Bottom Layer of Current Z ---
        const tileOnBottomRaw = currentLevelData.bottom[y]?.[x];
        const effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw?.tileId !== undefined) ? tileOnBottomRaw.tileId : tileOnBottomRaw;

        if (effectiveTileOnBottom && tilesets[effectiveTileOnBottom]) {
            const tileDefBottom = tilesets[effectiveTileOnBottom];
            // console.log(`${debugPrefix} Bottom layer @Z${z} has tile: ${effectiveTileOnBottom}`, tileDefBottom.tags);

            if (tileDefBottom.tags) {
                // If bottom layer is impassable (and not a z_transition like a hole allowing passage down)
                if (tileDefBottom.tags.includes("impassable")) {
                    // console.log(`${debugPrefix} Bottom layer @Z${z} ('${effectiveTileOnBottom}') is IMPASSABLE. Result: false`);
                    return false;
                }
                // If bottom layer is a walkable surface type
                if (tileDefBottom.tags.includes("floor") ||
                    tileDefBottom.tags.includes("transparent_floor") ||
                    tileDefBottom.tags.includes("z_transition")) {
                    // console.log(`${debugPrefix} Bottom layer @Z${z} ('${effectiveTileOnBottom}') is a walkable surface type. Result: true`);
                    return true;
                }
            }
        } else if (effectiveTileOnBottom && !tilesets[effectiveTileOnBottom]) {
            // console.log(`${debugPrefix} Bottom tile ${effectiveTileOnBottom} at Z=${z} has no definition. Result: false (assuming non-walkable).`);
            return false; // Unknown tile on bottom is not walkable.
        }

        // --- 5. Rely on Support from Below if Current Z Layers Don't Define Walkability ---
        // console.log(`${debugPrefix} Current Z layers are clear or non-determinative. Relying on supportFromBelow (${supportedFromBelow}). Result: ${supportedFromBelow}`);
        return supportedFromBelow;
    },
    isTileEmpty: isTileEmpty, // Added isTileEmpty here
};
