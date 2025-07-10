// js/mapRenderer.js
// Helper functions for FOW and LOS

function darkenColor(hexColor, factor) {
    if (typeof hexColor !== 'string' || !hexColor.startsWith('#') || typeof factor !== 'number') {
        return hexColor || '#000000'; // Return original or black if invalid input
    }
    try {
        let r = parseInt(hexColor.substring(1, 3), 16);
        let g = parseInt(hexColor.substring(3, 5), 16);
        let b = parseInt(hexColor.substring(5, 7), 16);

        if (isNaN(r) || isNaN(g) || isNaN(b)) return hexColor || '#000000';

        factor = Math.max(0, Math.min(1, factor)); // Clamp factor to 0-1

        r = Math.round(r * (1 - factor));
        g = Math.round(g * (1 - factor));
        b = Math.round(b * (1 - factor));

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        // console.warn("Error darkening color:", e, hexColor, factor);
        return hexColor || '#000000'; // Fallback on error
    }
}

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
function getFOWModifiedHighlightColor(baseHighlightColor, fowStatus) {
    if (!baseHighlightColor) return baseHighlightColor; // No base highlight, nothing to modify

    if (fowStatus === 'hidden') {
        return '#101010'; // Or 'transparent' or a very dark grey
    } else if (fowStatus === 'visited') {
        if (baseHighlightColor.startsWith('rgba')) {
            try {
                const parts = baseHighlightColor.match(/[\d.]+/g);
                if (parts && parts.length === 4) {
                    let r = parseInt(parts[0]);
                    let g = parseInt(parts[1]);
                    let b = parseInt(parts[2]);
                    let a = parseFloat(parts[3]);
                    r = Math.max(0, Math.floor(r * 0.5));
                    g = Math.max(0, Math.floor(g * 0.5));
                    b = Math.max(0, Math.floor(b * 0.5));
                    a = Math.max(0, a * 0.7);
                    return `rgba(${r},${g},${b},${a})`;
                }
                return darkenColor(baseHighlightColor, 0.6) || '#303030'; // Fallback if parse fails
            } catch (e) {
                return darkenColor(baseHighlightColor, 0.6) || '#303030';
            }
        } else if (baseHighlightColor.startsWith('#')) { // HEX color
            return darkenColor(baseHighlightColor, 0.6);
        } else { // Other named colors or unknown format
            return '#303030'; // Default dark highlight for visited
        }
    }
    // If fowStatus is 'visible', return the base highlight color unmodified
    return baseHighlightColor;
}

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


// This function checks if a tile blocks vision based on new rules for BFS FOW.
// playerZ is the Z-level of the entity whose vision is being calculated.
function isTileBlockingVision(tileX, tileY, tileZ, playerZ) {
    const tilesets = window.assetManagerInstance ? window.assetManagerInstance.tilesets : null;
    const mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

    if (!tilesets || !mapData || !mapData.levels) {
        return false; // Cannot determine, assume non-blocking for safety in BFS
    }

    const zStr = tileZ.toString();
    const levelData = mapData.levels[zStr];

    if (!levelData) { // No level data at this Z means it's open air, doesn't block.
        return false;
    }

    // --- Player's Z-level Logic ---
    if (tileZ === playerZ) {
        // Middle Layer Check (Player's Z)
        if (levelData.middle) {
            const tileOnMiddleRaw = levelData.middle[tileY]?.[tileX];
            const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined)
                ? tileOnMiddleRaw.tileId
                : tileOnMiddleRaw;

            if (effectiveTileOnMiddle && effectiveTileOnMiddle !== "") {
                const tileDefMiddle = tilesets[effectiveTileOnMiddle];
                if (tileDefMiddle) {
                    const tags = tileDefMiddle.tags || [];
                    const isImpassable = tags.includes('impassable');
                    const isTransparent = tags.includes('transparent') || tags.includes('allows_vision');

                    // Rule: "On the player’s Z only block when a middle-layer tile is tagged impassable and lacks transparent/allows_vision"
                    if (isImpassable && !isTransparent) {
                        return true; // BLOCKS
                    }
                } else {
                    return true; // Unknown middle tile, assume blocks for safety.
                }
            }
        }
        // Bottom Layer (Player's Z): Never blocks vision.
        // If middle didn't block, then this tile on player's Z doesn't block.
        return false;
    }
    // --- Other Z-levels Logic ---
    else {
        // Middle Layer (Other Z): Per new rules, does not block vision based on its own properties.
        // (Comment: This is a change from typical behavior where opaque middle items on other Zs would block.
        // If this needs to be revisited, logic for non-transparent middle items would go here.)

        // Bottom Layer Check (Other Z)
        if (levelData.bottom) {
            const tileOnBottomRaw = levelData.bottom[tileY]?.[tileX];
            const effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw !== null && tileOnBottomRaw.tileId !== undefined)
                ? tileOnBottomRaw.tileId
                : tileOnBottomRaw;

            if (effectiveTileOnBottom && effectiveTileOnBottom !== "") {
                const tileDefBottom = tilesets[effectiveTileOnBottom];
                if (tileDefBottom) {
                    const tags = tileDefBottom.tags || [];
                    // Rule: "On other Z levels only block when a bottom-layer tile is tagged roof or floor"
                    if (tags.includes('roof') || tags.includes('floor')) {
                        return true; // BLOCKS
                    }
                } else {
                    return true; // Unknown bottom tile, assume blocks for safety.
                }
            }
        }
        // If no specific blocking condition on other Z levels was met, it doesn't block.
        return false;
    }
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
    // if (distance <= 1.8) { ... } // Original short-distance check removed for consistency with simplified LOS logic.
    // The main loop will handle these cases correctly.

    if (line.length < 2) return true; // Target is adjacent or same tile (already handled by playerX/Y/Z === targetX/Y/Z or distance check)

    // Iterate through each point in the line, starting from the second point (index 1).
    // The first point (index 0) is the playerPos itself.
    // The loop will include the targetPos if line.slice(1) is used directly.
    for (const point of line.slice(1)) {
        // playerZ is the Z-coordinate of the viewer (the player)
        if (isTileBlockingVision(point.x, point.y, point.z, playerZ)) {
            // logToConsole(`isTileVisible: LOS blocked at (${point.x},${point.y},${point.z}) for player at Z=${playerZ}`);
            return false;
        }
    }

    // If the loop completes, no obstructions were found.
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
    darkenColor: darkenColor, // Added darkenColor
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
        const currentFowData = gameState.fowData[currentZStr]; // Ensure currentFowData is sourced for the current Z level
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

                // TODO: Consider if roof display should be different if player is ON a roof tile vs under it.
                // Current behavior: if gameState.showRoof is true, it attempts to render roof tiles from currentLevelData.
                // If player is at (x,y,z) and currentLevelData.roof[y][x] exists, and showRoof is true,
                // that roof tile will be part of finalTileId consideration.
                // This means if player is ON a roof surface (e.g. Z=1 is the top of a building), and showRoof is true,
                // it might try to render the roof of Z=1 itself. If showRoof is false, player sees the roof surface they are on.
                // A more advanced system might:
                // 1. Distinguish between "roof of current Z-level" vs "roof of Z-level above player".
                // 2. Automatically hide the roof tile the player is standing directly on if it's part of their current Z-level's "floor".
                // 3. Change behavior of showRoof based on player's relative position to roof structures.
                // For now, the global toggle applies uniformly.
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

                // --- NEW: Tile-defined background highlighting ---
                const TILE_BACKGROUND_DARK_FACTOR = 0.8; // Darken by 80%
                // Use originalColor determined from the structural tile (bottom/middle/solid_terrain_top)
                // If originalColor is black (e.g. for empty space default) or undefined, don't highlight.
                let tileDefinedBackgroundColor = "";
                if (originalColor && originalColor !== '#000000') {
                    tileDefinedBackgroundColor = darkenColor(originalColor, TILE_BACKGROUND_DARK_FACTOR);
                }
                // --- END NEW: Tile-defined background highlighting ---

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

                // TODO (Lighting System Enhancements):
                // 1. Add support for cone lights (e.g., flashlights) and directional lights.
                //    - This would require lightSource objects to have 'type', 'direction', 'coneAngle'.
                //    - isTileIlluminated() would need new logic paths for these light types.
                // 2. Consider performance implications of many dynamic lights.
                //    - Strategies: limit total active lights, simplify calculations at distance, spatial partitioning for lights.
                // 3. Optimize lighting calculations: Cache light values per tile.
                //    - Invalidate cache only when relevant light sources or map geometry changes.
                //    - Current system recalculates light for every visible/visited tile each frame.

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
                let finalDisplayIdForTile = displayId; // The ID of the tile that dictates the base appearance (landscape/building)

                // --- Trap Rendering ---
                // Check if there's a trap at this location and Z-level
                if (window.trapManager && typeof window.trapManager.getTrapAt === 'function') {
                    const trapInstance = window.trapManager.getTrapAt(x, y, currentZ);
                    if (trapInstance && trapInstance.state !== "hidden") { // Only render non-hidden traps
                        const trapDef = window.trapManager.getTrapDefinition(trapInstance.trapDefId);
                        if (trapDef) {
                            let trapSpriteKey = null;
                            switch (trapInstance.state) {
                                case "detected": trapSpriteKey = trapDef.spriteDetected; break;
                                case "disarmed": trapSpriteKey = trapDef.spriteDisarmed; break;
                                case "triggered": trapSpriteKey = trapDef.spriteTriggered; break;
                            }
                            if (trapSpriteKey && assetManagerInstance.tilesets[trapSpriteKey]) {
                                const trapVisualDef = assetManagerInstance.tilesets[trapSpriteKey];
                                // Trap sprite overlays or replaces underlying tile sprite if visible
                                finalSpriteForTile = trapVisualDef.sprite || finalSpriteForTile;
                                finalColorForTile = trapVisualDef.color || finalColorForTile; // Trap color takes precedence
                                finalDisplayIdForTile = trapSpriteKey; // Update display ID to reflect trap
                                tileNameForTitle = trapDef.name; // Update tooltip name
                            } else if (trapSpriteKey) {
                                // logToConsole(`Warning: Trap sprite key '${trapSpriteKey}' for trap '${trapDef.name}' not found in tilesets.`, 'orange');
                            }
                        }
                    }
                }
                // --- End Trap Rendering ---


                // Player rendering: only if player's Z matches currentViewZ
                const isPlayerCurrentlyOnThisTileAndZ = (gameState.playerPos &&
                    x === gameState.playerPos.x &&
                    y === gameState.playerPos.y &&
                    gameState.playerPos.z === currentZ);

                if (isPlayerCurrentlyOnThisTileAndZ) {
                    const playerFowStatus = currentFowData?.[y]?.[x]; // Use current Z's FOW

                    // TODO: Ensure this works correctly if player is on a z_transition tile that is also a roof (e.g. external stairs).
                    // Current logic: if `showRoof` is true, and a roof tile exists at player's x,y on currentLevelData.roof,
                    // it's considered obscuring. If a z_transition tile *is* also defined as such a roof piece, it would obscure.
                    // This might be desired. If not, the tile definition or this check needs adjustment
                    // (e.g. if player is on a z_transition tile, `roofIsObscuringPlayer` might need to ignore roofs at that exact tile).
                    // For now, the logic is consistent: showRoof + roof tile at player's x,y,z_roof_layer = obscuring.
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

                // Check for player fall animation override
                if (gameState.playerPos && x === gameState.playerPos.x && y === gameState.playerPos.y &&
                    gameState.playerPos.displayZ !== undefined && gameState.playerPos.displayZ === currentZ) {
                    // If player has a displayZ for falling and it matches current view Z, render player here.
                    // This assumes the FallAnimation sets playerPos.displayZ
                    finalSpriteForTile = "☻";
                    finalColorForTile = "green"; // Or a specific falling color/sprite
                    finalDisplayIdForTile = "PLAYER_FALLING";
                }


                // Update or create cache entry
                if (isInitialRender) {
                    const span = document.createElement("span");
                    span.className = "tile";
                    span.dataset.x = x;
                    span.dataset.y = y;
                    span.textContent = finalSpriteForTile;
                    span.style.color = finalColorForTile;

                    // Apply tile-defined background highlight first
                    span.style.backgroundColor = tileDefinedBackgroundColor;

                    // Item highlight logic (needs to check floorItems on currentZ)
                    // This will overwrite tileDefinedBackgroundColor if an item is present and visible
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
                            if (!impassableTileBlockingItemHighlight) {
                                span.style.backgroundColor = "rgba(255, 255, 0, 0.3)"; // Item highlight
                            }
                        }
                    }
                    // Note: Combat highlights are applied much later, after NPC and Animation rendering,
                    // and will also overwrite this backgroundColor. This is the correct order.

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

                        // TODO: Placeholder for animated water or other tile effects.
                        // If finalTileDefForLightingAndFow (or a specific tileDef for animation) has an "animation" property:
                        // e.g., tileDef.animation = { frames: ["~", "≈"], speed: 500ms }
                        // Use a global tick or Date.now() % (frames.length * speed) to select current animation character for finalSpriteForTile.
                        // This would override finalSpriteForTile if an animation applies.

                        // Apply tile-defined background highlight first
                        let newBackgroundColor = tileDefinedBackgroundColor;

                        // Item highlight logic (will overwrite tileDefinedBackgroundColor if an item is present)
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
                                if (!impassableTileBlockingItemHighlight) {
                                    newBackgroundColor = "rgba(255, 255, 0, 0.3)"; // Item highlight
                                }
                            }
                        }

                        // Only update if the color actually changed
                        // Apply FOW to the determined newBackgroundColor
                        if (fowStatus === 'hidden') {
                            newBackgroundColor = '#101010'; // Or even 'transparent' or match hidden tile color
                        } else if (fowStatus === 'visited' && newBackgroundColor) {
                            // If newBackgroundColor is an RGBA string like "rgba(255, 255, 0, 0.3)"
                            if (newBackgroundColor.startsWith('rgba')) {
                                try {
                                    const parts = newBackgroundColor.match(/[\d.]+/g);
                                    if (parts && parts.length === 4) {
                                        let r = parseInt(parts[0]);
                                        let g = parseInt(parts[1]);
                                        let b = parseInt(parts[2]);
                                        let a = parseFloat(parts[3]);
                                        // Darken RGB, maybe reduce alpha
                                        r = Math.max(0, Math.floor(r * 0.5));
                                        g = Math.max(0, Math.floor(g * 0.5));
                                        b = Math.max(0, Math.floor(b * 0.5));
                                        a = Math.max(0, a * 0.7); // Reduce alpha slightly
                                        newBackgroundColor = `rgba(${r},${g},${b},${a})`;
                                    }
                                } catch (e) { /* fallback to simple darken if parse fails */
                                    newBackgroundColor = darkenColor(newBackgroundColor, 0.6) || '#303030'; // Fallback for RGBA
                                }
                            } else if (newBackgroundColor.startsWith('#')) { // HEX color
                                newBackgroundColor = darkenColor(newBackgroundColor, 0.6);
                            } else { // Other named colors or unknown format - default to a dark grey
                                newBackgroundColor = '#303030';
                            }
                        }
                        // If fowStatus is 'visible', newBackgroundColor remains as is.

                        if (span.style.backgroundColor !== newBackgroundColor) {
                            span.style.backgroundColor = newBackgroundColor;
                        }
                        // Note: Combat highlights are applied much later and will overwrite this. This comment is now potentially misleading.
                        // The FOW modification to newBackgroundColor should ideally happen AFTER combat highlights are determined if they are separate.
                        // Let's re-evaluate the order. The current placement applies FOW to a background that *might* be a combat highlight.

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
        // This section implements onion skinning, which provides a basic "glimpse" effect.
        // TODO: Further refine 'glimpse' effect for transparent floors/ceilings.
        // Current onion skinning shows full tiles from adjacent levels if visible through transparent paths.
        // A more advanced glimpse might involve partial tile rendering, different sprites (e.g., dots),
        // or varying intensity based on the type/degree of transparency of the intervening tiles.
        // For now, the existing onion skinning serves as the basic implementation.

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

        // Ranged Attack Line (Moved earlier in the rendering pipeline)
        if (gameState.isInCombat &&
            gameState.combatCurrentAttacker === gameState && // Player entity is gameState itself
            gameState.rangedAttackData &&
            gameState.rangedAttackData.start &&
            gameState.rangedAttackData.end &&
            tileCacheData) {
            const { start, end, distance, modifierText: rangeDetailsText } = gameState.rangedAttackData;
            if (start.z === currentZ || end.z === currentZ || (Math.min(start.z, end.z) < currentZ && Math.max(start.z, end.z) > currentZ)) {
                const linePoints = this.getLine3D(start.x, start.y, start.z, end.x, end.y, end.z);
                linePoints.forEach((point, index) => {
                    if (point.z === currentZ) {
                        if (point.x >= 0 && point.x < W && point.y >= 0 && point.y < H) {
                            const cachedCell = tileCacheData[point.y]?.[point.x];
                            if (cachedCell && cachedCell.span) {
                                cachedCell.span.style.backgroundColor = "rgba(173, 216, 230, 0.3)";
                                if (point.x === end.x && point.y === end.y) {
                                    cachedCell.span.dataset.rangedInfo = rangeDetailsText || `Dist: ${distance}`;
                                    cachedCell.span.style.backgroundColor = "rgba(173, 216, 230, 0.5)";
                                }
                                if (index === Math.floor(linePoints.length / 2) && rangeDetailsText) {
                                    const match = rangeDetailsText.match(/\(([+-]?\d+)\)$/);
                                    if (match && match[1]) {
                                        if (modChar.length > 1 && (modChar.startsWith('+') || modChar.startsWith('-'))) { // Corrected: modChar was not defined, should be match[1]
                                            cachedCell.span.style.backgroundColor = "rgba(100, 200, 255, 0.6)";
                                            cachedCell.span.dataset.rangedInfo = rangeDetailsText || `Dist: ${distance}`;
                                        }
                                    }
                                    const targetCell = tileCacheData[end.y]?.[end.x];
                                    if (targetCell && targetCell.span) {
                                        targetCell.span.dataset.rangedInfo = rangeDetailsText || `Dist: ${distance}`;
                                    }
                                }
                            }
                        }
                    }
                });
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
                        const isTargetingCursorHere = gameState.isTargetingMode && npcX === gameState.targetingCoords.x && npcY === gameState.targetingCoords.y && gameState.targetingCoords.z === currentZ; // Added Z check for targeting cursor

                        // Check if the player was already rendered at this tile in the current frame
                        const cachedCell = tileCacheData[npcY]?.[npcX];
                        const playerAlreadyRenderedOnTile = cachedCell?.displayedId === "PLAYER_STATIC" || cachedCell?.displayedId === "PLAYER_FALLING";

                        if (!roofObscures && !playerIsHere && !isTargetingCursorHere && !playerAlreadyRenderedOnTile) {
                            const npcTileFowStatus = currentFowData?.[npcY]?.[npcX] || 'hidden';

                            // Check for NPC fall animation override
                            if (npc.displayZ !== undefined && npc.displayZ === currentZ) {
                                if (cachedCell && cachedCell.span && (npcTileFowStatus === 'visible' || npcTileFowStatus === 'visited')) {
                                    cachedCell.span.textContent = npc.sprite;
                                    cachedCell.span.style.color = npc.color; // Or a specific falling color
                                    cachedCell.sprite = npc.sprite;
                                    cachedCell.color = npc.color;
                                }
                            } else if (npcTileFowStatus === 'visible') { // Standard rendering if not falling
                                if (cachedCell && cachedCell.span) {
                                    cachedCell.span.textContent = npc.sprite;
                                    cachedCell.span.style.color = npc.color;
                                    cachedCell.sprite = npc.sprite;
                                    cachedCell.color = npc.color;
                                }
                            } else if (npcTileFowStatus === 'visited') {
                                if (cachedCell && cachedCell.span) {
                                    cachedCell.span.textContent = npc.sprite;
                                    const visitedNpcColor = darkenColor(npc.color, 0.6);
                                    cachedCell.span.style.color = visitedNpcColor;
                                    cachedCell.sprite = npc.sprite;
                                    cachedCell.color = visitedNpcColor;
                                }
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

                if (anim.type === 'explosion' && anim.visible && anim.explosionSprites && anim.centerPos) {
                    const explosionMaxRadius = anim.currentExpansionRadius;
                    const explosionCenterZ = anim.centerPos.z;

                    // Check if the explosion's sphere intersects the currentViewZ plane
                    const distZ = Math.abs(explosionCenterZ - currentZ);

                    if (distZ <= explosionMaxRadius) {
                        // Calculate the radius of the 2D circular slice on currentViewZ
                        const sliceRadiusSquared = explosionMaxRadius * explosionMaxRadius - distZ * distZ;
                        if (sliceRadiusSquared > 0) { // Ensure there's an actual circle to draw
                            const sliceRadius = Math.floor(Math.sqrt(sliceRadiusSquared));
                            const spriteToRender = anim.explosionSprites[anim.currentFrameIndex];
                            if (!spriteToRender) return; // Should be continue if in a loop of animations

                            const colorToRender = anim.color;
                            const centerX = Math.floor(anim.centerPos.x);
                            const centerY = Math.floor(anim.centerPos.y);

                            for (let y_anim = Math.max(0, centerY - sliceRadius); y_anim <= Math.min(H - 1, centerY + sliceRadius); y_anim++) {
                                for (let x_anim = Math.max(0, centerX - sliceRadius); x_anim <= Math.min(W - 1, centerX + sliceRadius); x_anim++) {
                                    const dx = x_anim - centerX;
                                    const dy = y_anim - centerY;
                                    if (dx * dx + dy * dy <= sliceRadius * sliceRadius) {
                                        const fowStatus = currentFowData?.[y_anim]?.[x_anim];
                                        // Only render if the tile is visible or visited (respect FOW)
                                        if (fowStatus === 'visible' || fowStatus === 'visited') {
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
                        }
                    }
                } else if (anim.type === 'flamethrower') {
                    if (anim.flameParticles && anim.flameParticles.length > 0) {
                        anim.flameParticles.forEach(particle => {
                            // Ensure flamethrower particles also have a .z and are checked if they should be Z-specific
                            if (particle.z === undefined || particle.z === currentZ) { // Render if particle.z matches or is undefined (legacy)
                                const particleX = Math.floor(particle.x);
                                const particleY = Math.floor(particle.y);
                                if (particleX >= 0 && particleX < W && particleY >= 0 && particleY < H) {
                                    const fowStatusParticle = currentFowData?.[particleY]?.[particleX];
                                    if (fowStatusParticle === 'visible' || fowStatusParticle === 'visited') {
                                        const cachedCell = tileCacheData[particleY]?.[particleX];
                                        if (cachedCell && cachedCell.span) {
                                            cachedCell.span.textContent = particle.sprite;
                                            cachedCell.span.style.color = particle.color;
                                            // Do not update cache sprite/color for transient particles like flames generally
                                        }
                                    }
                                }
                            }
                        });
                    }
                } else if (anim.type === 'gasCloud' && anim.visible && anim.particles && anim.centerPos) {
                    const gasCloudCenterZ = anim.z; // anim.z is centerPos.z for gas clouds, set by base Animation class
                    const verticalRadius = anim.verticalRadius !== undefined ? anim.verticalRadius : 1; // Default from animation constructor

                    // Check if the currentViewZ is within the vertical extent of the gas cloud
                    // A verticalRadius of 0 means it's flat on its anim.z plane.
                    // A verticalRadius of 1 means it affects anim.z, anim.z-1, anim.z+1.
                    if (currentZ >= gasCloudCenterZ - verticalRadius && currentZ <= gasCloudCenterZ + verticalRadius) {
                        if (anim.particles.length > 0) {
                            const distZFromCloudCenter = Math.abs(gasCloudCenterZ - currentZ);
                            // Attenuation: 1.0 at cloud's center Z, fades to 0 at edges of verticalRadius.
                            // If verticalRadius is 0, attenuation is 1 if currentZ is gasCloudCenterZ, else 0.
                            let zAttenuation;
                            if (verticalRadius === 0) {
                                zAttenuation = (distZFromCloudCenter === 0) ? 1.0 : 0;
                            } else {
                                zAttenuation = Math.max(0, 1 - (distZFromCloudCenter / verticalRadius));
                            }

                            if (zAttenuation > 0.05) { // Only render if slice has some substance
                                anim.particles.forEach(particle => {
                                    const effectiveOpacity = particle.opacity * zAttenuation;
                                    if (effectiveOpacity <= 0.05) return;

                                    const particleX = Math.floor(particle.x);
                                    const particleY = Math.floor(particle.y);

                                    // Horizontal check: ensure particle is within the cloud's current horizontal radius
                                    const dx = particleX - anim.centerPos.x;
                                    const dy = particleY - anim.centerPos.y;
                                    if ((dx * dx + dy * dy) > (anim.currentRadius * anim.currentRadius)) {
                                        // return; // Particle is outside the horizontal spread for this cloud instance
                                    }
                                    // Note: Gas cloud particles are spawned within currentRadius, so this check might be redundant
                                    // if particles don't move independently outside of it. Kept for safety.


                                    if (particleX >= 0 && particleX < W && particleY >= 0 && particleY < H) {
                                        const fowStatus = currentFowData?.[particleY]?.[particleX];
                                        if (fowStatus === 'visible' || fowStatus === 'visited') {
                                            const cachedCell = tileCacheData[particleY]?.[particleX];
                                            if (cachedCell && cachedCell.span) {
                                                cachedCell.span.textContent = particle.sprite;
                                                try {
                                                    let r = parseInt(particle.color.substring(1, 3), 16);
                                                    let g = parseInt(particle.color.substring(3, 5), 16);
                                                    let b = parseInt(particle.color.substring(5, 7), 16);

                                                    const bgR = 30, bgG = 30, bgB = 30; // Darkish background color for blending
                                                    r = Math.max(0, Math.min(255, Math.floor(r * effectiveOpacity + bgR * (1 - effectiveOpacity))));
                                                    g = Math.max(0, Math.min(255, Math.floor(g * effectiveOpacity + bgG * (1 - effectiveOpacity))));
                                                    b = Math.max(0, Math.min(255, Math.floor(b * effectiveOpacity + bgB * (1 - effectiveOpacity))));
                                                    cachedCell.span.style.color = `rgb(${r},${g},${b})`;
                                                } catch (e) {
                                                    cachedCell.span.style.color = particle.color; // Fallback
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }
                } else if (anim.sprite && anim.visible) { // Other single-sprite animations
                    // Check if the animation's Z level matches the current view Z
                    if (anim.z === undefined || anim.z === currentZ) { // Modified to handle anim.z undefined for legacy
                        const animX = Math.floor(anim.x);
                        const animY = Math.floor(anim.y);
                        if (animX >= 0 && animX < W && animY >= 0 && animY < H) {
                            const fowStatus = currentFowData?.[animY]?.[animX];
                            // Only render if the tile is visible or visited (respect FOW for animations)
                            if (fowStatus === 'visible' || fowStatus === 'visited') {
                                const cachedCell = tileCacheData[animY]?.[animX];
                                if (cachedCell && cachedCell.span) {
                                    // Check if player or NPC is on this tile, if so, animation might be less prominent or not drawn
                                    // For now, let animation draw over map features, but player/NPCs draw over animations if on same tile later
                                    // This order is: Map -> Effects (Smoke/Gas) -> Animations -> Player/NPCs -> Targeting Cursors
                                    cachedCell.span.textContent = anim.sprite;
                                    cachedCell.span.style.color = anim.color;
                                    // Update cache to reflect animation sprite being shown
                                    // This might be complex if multiple animations hit the same tile.
                                    // Current logic means last animation in list wins for that tile.
                                    cachedCell.sprite = anim.sprite; // Reflect that animation is now the 'top' sprite
                                    cachedCell.color = anim.color;   // And its color
                                }
                            }
                        }
                    }
                }
            });
        }

        // Vehicle Rendering (NEW)
        if (this.gameState && this.gameState.vehicles && this.gameState.vehicles.length > 0 && tileCacheData) {
            this.gameState.vehicles.forEach(vehicle => {
                if (vehicle.currentMapId === fullMapData.id && vehicle.mapPos && vehicle.mapPos.z === currentZ) {
                    const vX = vehicle.mapPos.x;
                    const vY = vehicle.mapPos.y;

                    if (vX >= 0 && vX < W && vY >= 0 && vY < H) {
                        const fowStatus = currentFowData?.[vY]?.[vX] || 'hidden';
                        if (fowStatus === 'visible' || fowStatus === 'visited') {
                            const cachedCell = tileCacheData[vY]?.[vX];
                            if (cachedCell && cachedCell.span) {
                                // Determine vehicle sprite and color
                                // For now, use template sprite or chassis sprite as fallback
                                let vehicleSprite = '?';
                                let vehicleColor = 'grey';
                                const template = window.vehicleManager?.vehicleTemplates[vehicle.templateId];
                                if (template && template.sprite) {
                                    vehicleSprite = template.sprite;
                                } else {
                                    const chassisDef = window.vehicleManager?.vehicleParts[vehicle.chassis];
                                    if (chassisDef && chassisDef.sprite) {
                                        vehicleSprite = chassisDef.sprite;
                                    }
                                }
                                // TODO: Get color from template/chassis as well

                                // If player is in this vehicle, vehicle sprite represents player
                                const playerInThisVehicle = this.gameState.player && this.gameState.player.isInVehicle === vehicle.id;

                                // Only render vehicle if player is not on this tile OR player is in this vehicle
                                const playerIsOnThisTile = this.gameState.playerPos &&
                                    vX === this.gameState.playerPos.x &&
                                    vY === this.gameState.playerPos.y &&
                                    this.gameState.playerPos.z === currentZ;

                                if (playerInThisVehicle || !playerIsOnThisTile) {
                                    cachedCell.span.textContent = vehicleSprite;
                                    cachedCell.span.style.color = fowStatus === 'visited' ? this.darkenColor(vehicleColor, 0.6) : vehicleColor;
                                    cachedCell.sprite = vehicleSprite; // Update cache
                                    cachedCell.color = vehicleColor;
                                    cachedCell.displayedId = `VEHICLE_${vehicle.id}`; // Special ID for cache
                                }
                            }
                        }
                    }
                }
            });
        }
        // End Vehicle Rendering

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
                        cachedCell.span.textContent = 'X';
                        cachedCell.span.style.color = 'red';
                        if (!cachedCell.span.classList.contains('flashing-targeting-cursor')) {
                            cachedCell.span.classList.add('flashing-targeting-cursor');
                        }
                    }
                }
            }
        }

        // Combat highlights (attacker/defender) - needs Z awareness for positions
        if (gameState.isInCombat && tileCacheData) {
            // Attacker Highlight
            let attackerHighlightPos = null;
            if (gameState.combatCurrentAttacker === gameState) {
                attackerHighlightPos = gameState.playerPos;
            } else if (gameState.attackerMapPos) {
                attackerHighlightPos = gameState.attackerMapPos;
            }

            if (attackerHighlightPos && attackerHighlightPos.z === currentZ) {
                const ax = attackerHighlightPos.x;
                const ay = attackerHighlightPos.y;
                const attackerCell = tileCacheData[ay]?.[ax];
                if (attackerCell && attackerCell.span) {
                    const attackerFowStatus = currentFowData?.[ay]?.[ax] || 'hidden';
                    const rawAttackerHighlight = 'rgba(255, 0, 0, 0.3)'; // Reddish
                    attackerCell.span.style.backgroundColor = getFOWModifiedHighlightColor(rawAttackerHighlight, attackerFowStatus);
                }
            }

            // Defender Highlight 
            if (gameState.defenderMapPos && gameState.defenderMapPos.z === currentZ) {
                const dx = gameState.defenderMapPos.x;
                const dy = gameState.defenderMapPos.y;
                const defenderCell = tileCacheData[dy]?.[dx];
                if (defenderCell && defenderCell.span) {
                    const defenderFowStatus = currentFowData?.[dy]?.[dx] || 'hidden';
                    const rawDefenderHighlight = 'rgba(0, 0, 255, 0.3)';
                    defenderCell.span.style.backgroundColor = getFOWModifiedHighlightColor(rawDefenderHighlight, defenderFowStatus);
                }
            }
        }

        this.updateMapHighlight();

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
        // TODO: Play move_toggle_roof_01.wav when available.
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
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

        return ""; // No impassable tile found at this x,y,z on the primary collision layer (middle)
    },

    updateTileOnLayer: function (x, y, z, layerName, newTileId) {
        if (!currentMapData || !currentMapData.levels || !currentMapData.levels[z.toString()]) {
            logToConsole(`[mapRenderer.updateTileOnLayer] Error: Map data or level Z:${z} not available for updating tile.`, "red");
            return false;
        }
        const level = currentMapData.levels[z.toString()];
        if (!level[layerName]) {
            logToConsole(`[mapRenderer.updateTileOnLayer] Error: Layer '${layerName}' does not exist on Z:${z}.`, "red");
            return false;
        }
        if (y < 0 || y >= level[layerName].length || x < 0 || x >= level[layerName][y].length) {
            logToConsole(`[mapRenderer.updateTileOnLayer] Error: Coordinates (${x},${y}) out of bounds for layer '${layerName}' on Z:${z}.`, "red");
            return false;
        }

        // TODO: Handle if newTileId is an object {tileId: "...", ...} vs a string ID.
        // For now, assuming newTileId is a string ID.
        level[layerName][y][x] = newTileId;
        logToConsole(`[mapRenderer.updateTileOnLayer] Tile at (${x},${y},${z}) on layer '${layerName}' updated to '${newTileId}'.`, "dev");

        // Important: Invalidate tile cache for this specific tile or re-render if changes are significant
        // For simplicity, just schedule a full re-render. More optimized would be targeted cache invalidation.
        this.scheduleRender();
        return true;
    },

    isWalkable: function (x, y, z) {
        const debugPrefix = `isWalkable(${x},${y},${z}):`;
        // console.log(`${debugPrefix} Checking...`); // Keep console logs minimal

        const mapData = this.getCurrentMapData();
        const tilesets = assetManagerInstance ? assetManagerInstance.tilesets : null;

        if (!mapData || !mapData.levels || !mapData.dimensions || !tilesets) {
            return false;
        }
        if (x < 0 || y < 0 || y >= mapData.dimensions.height || x >= mapData.dimensions.width) {
            return false;
        }

        const zStr = z.toString();
        const currentLevelData = mapData.levels[zStr];

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

        if (!currentLevelData || !currentLevelData.bottom || !currentLevelData.middle) {
            return supportedFromBelow;
        }

        const tileOnMiddleRaw = currentLevelData.middle[y]?.[x];
        const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw?.tileId !== undefined) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;

        if (effectiveTileOnMiddle && tilesets[effectiveTileOnMiddle]) {
            const tileDefMiddle = tilesets[effectiveTileOnMiddle];
            if (tileDefMiddle.tags) {
                if (tileDefMiddle.tags.includes("walkable_on_z") || tileDefMiddle.tags.includes("z_transition")) {
                    return true;
                }
                if (tileDefMiddle.tags.includes("solid_terrain_top")) {
                    return false;
                }
                if (tileDefMiddle.tags.includes("impassable")) {
                    return false;
                }
            }
        } else if (effectiveTileOnMiddle && !tilesets[effectiveTileOnMiddle]) {
            return false;
        }

        const tileOnBottomRaw = currentLevelData.bottom[y]?.[x];
        const effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw?.tileId !== undefined) ? tileOnBottomRaw.tileId : tileOnBottomRaw;

        if (effectiveTileOnBottom && tilesets[effectiveTileOnBottom]) {
            const tileDefBottom = tilesets[effectiveTileOnBottom];
            if (tileDefBottom.tags) {
                if (tileDefBottom.tags.includes("impassable")) {
                    return false;
                }
                if (tileDefBottom.tags.includes("floor") ||
                    tileDefBottom.tags.includes("transparent_floor") ||
                    tileDefBottom.tags.includes("z_transition")) {
                    return true;
                }
            }
        } else if (effectiveTileOnBottom && !tilesets[effectiveTileOnBottom]) {
            return false;
        }
        return supportedFromBelow;
    },
    isTileEmpty: isTileEmpty,

    updateFOW_BFS: function (playerX, playerY, playerZ, visionRadius) {
        const currentMap = this.getCurrentMapData();
        if (!currentMap || !currentMap.dimensions || !currentMap.levels) {
            logToConsole("updateFOW_BFS: No map data, cannot update FOW.", "warn");
            return;
        }

        const H = currentMap.dimensions.height;
        const W = currentMap.dimensions.width;
        const playerZStr = playerZ.toString();

        if (!currentMap.dimensions || typeof H !== 'number' || H <= 0 || typeof W !== 'number' || W <= 0) {
            logToConsole(`updateFOW_BFS: Invalid map dimensions (H: ${H}, W: ${W}) for Z-level ${playerZStr}. Cannot process FOW. Map ID: ${currentMap.id || 'Unknown'}.`, "error");
            return;
        }

        if (!gameState.fowData[playerZStr] || gameState.fowData[playerZStr].length !== H || (H > 0 && gameState.fowData[playerZStr][0].length !== W)) {
            logToConsole(`updateFOW_BFS: FOW data for Z-level ${playerZStr} is missing, malformed, or dimensions mismatch. Initializing/Re-initializing. Map H:${H}, W:${W}. Current FOW H:${gameState.fowData[playerZStr]?.length}, W:${gameState.fowData[playerZStr]?.[0]?.length}`, "info");
            gameState.fowData[playerZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
        }
        const currentFowLayer = gameState.fowData[playerZStr];

        if (!currentFowLayer || currentFowLayer.length !== H || (H > 0 && (!currentFowLayer[0] || currentFowLayer[0].length !== W))) {
            logToConsole(`updateFOW_BFS: CRITICAL - FOW data for Z ${playerZStr} remains malformed after attempt to initialize/fix. Aborting. Expected H:${H}, W:${W}. Got H:${currentFowLayer?.length}, W:${currentFowLayer?.[0]?.length}`, "error");
            return;
        }

        for (let r = 0; r < H; r++) {
            for (let c = 0; c < W; c++) {
                if (currentFowLayer[r] && currentFowLayer[r][c] === 'visible') {
                    currentFowLayer[r][c] = 'visited';
                }
            }
        }

        const queue = [];
        const visitedThisTurn = new Set();

        queue.push({ x: playerX, y: playerY, z: playerZ, dist: 0 });
        visitedThisTurn.add(`${playerX},${playerY},${playerZ}`);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.dist > visionRadius) {
                continue;
            }

            if (current.z === playerZ) {
                if (current.y >= 0 && current.y < H && current.x >= 0 && current.x < W) {
                    currentFowLayer[current.y][current.x] = 'visible';
                } else {
                    continue;
                }
            } else {
                continue;
            }

            if (this.isTileBlockingVision(current.x, current.y, current.z, playerZ)) {
                continue;
            }

            const neighbors = [
                { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            ];

            for (const neighborDelta of neighbors) {
                const nextX = current.x + neighborDelta.dx;
                const nextY = current.y + neighborDelta.dy;
                const nextZ = current.z;
                const nextDist = current.dist + 1;

                if (nextX < 0 || nextX >= W || nextY < 0 || nextY >= H) {
                    continue;
                }

                if (nextDist <= visionRadius && !visitedThisTurn.has(`${nextX},${nextY},${nextZ}`)) {
                    visitedThisTurn.add(`${nextX},${nextY},${nextZ}`);
                    queue.push({ x: nextX, y: nextY, z: nextZ, dist: nextDist });
                }
            }
        }
        this.scheduleRender();
    }
};
