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
        return false;
    }

    // Bounds check
    if (!mapData.dimensions || tileX < 0 || tileY < 0 || tileX >= mapData.dimensions.width || tileY >= mapData.dimensions.height) {
        return true; // Out of bounds blocks
    }

    const zStr = tileZ.toString();
    const levelData = mapData.levels[zStr];

    if (!levelData) {
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

                // Debug logging for specific tile
                if (tileX === 6 && tileY === 5) {
                    console.log(`DEBUG isTileBlockingVision(6,5): effectiveTileOnMiddle=${effectiveTileOnMiddle}`);
                    console.log(`DEBUG tileDefMiddle found? ${!!tileDefMiddle}`);
                    if (tileDefMiddle) console.log(`DEBUG tags: ${tileDefMiddle.tags}`);
                }

                if (tileDefMiddle) {
                    const tags = tileDefMiddle.tags || [];
                    const isOpaque = tags.includes('blocks_vision') ||
                        (tags.includes('impassable') && !tags.includes('transparent') && !tags.includes('allows_vision'));

                    if (isOpaque) {
                        return true; // BLOCKS
                    }
                } else {
                    return true; // Unknown middle tile, assume blocks for safety.
                }
            }
        }
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

    // Iterate through each point in the line, starting from the second point (index 1)
    // and ending BEFORE the last point (the target itself).
    // We want to see the target even if it blocks vision (e.g. a wall), but not through it.
    // line.slice(1, -1) gives us the points strictly between start and end.
    const pointsToCheck = line.slice(1, -1);

    for (const point of pointsToCheck) {
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
        // Reset FOW data to ensure dimensions match new map
        gameState.fowData = { fowCurrentlyVisible: {} };

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
                // Ensure fowCurrentlyVisible for this Z-level is initialized
                if (!gameState.fowData.fowCurrentlyVisible) {
                    gameState.fowData.fowCurrentlyVisible = {};
                }
                if (!gameState.fowData.fowCurrentlyVisible[startZ.toString()]) {
                    gameState.fowData.fowCurrentlyVisible[startZ.toString()] = [];
                }
            } else {
                Object.keys(gameState.fowData).forEach(key => {
                    if (key !== "fowCurrentlyVisible") delete gameState.fowData[key];
                });
                if (gameState.fowData.fowCurrentlyVisible) {
                    Object.keys(gameState.fowData.fowCurrentlyVisible).forEach(key => delete gameState.fowData.fowCurrentlyVisible[key]);
                }
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
                                                        logToConsole(`Warning: Container tile '${baseTileId}' at (${c},${r}, Z:${z}) links to item '${linkedItemId}' which has invalid capacity. Defaulting to 5.`, "orange");
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
                                            // Check if a container with the same position already exists
                                            const existingContainer = gameState.containers.find(c => c.x === c && c.y === r && c.z === z);
                                            if (!existingContainer) {
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
                }
                if (gameState.containers.length > 0) {
                    logToConsole(`Initialized ${gameState.containers.length} container instances from map tiles across all Z-levels.`);
                }
            }
        } else {
            Object.keys(gameState.fowData).forEach(key => {
                if (key !== "fowCurrentlyVisible") delete gameState.fowData[key];
            });
            if (gameState.fowData.fowCurrentlyVisible) {
                Object.keys(gameState.fowData.fowCurrentlyVisible).forEach(key => delete gameState.fowData.fowCurrentlyVisible[key]);
            }
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
                // Ensure 'this' context is correct for the method call
                profileFunction("mapRenderer.renderMapLayers", () => window.mapRenderer.renderMapLayers(), ...arguments);
                gameState.renderScheduled = false;
            });
        }
    },

    renderMapLayers: function () {
        // Animation updates are now handled by the main gameLoop in script.js

        const container = document.getElementById("mapContainer");
        if (!container) {
            console.error("renderMapLayers: mapContainer not found!");
            return;
        }
        const fullMapData = window.mapRenderer.getCurrentMapData(); // Contains all Z-levels in .levels

        if (!fullMapData || !fullMapData.dimensions || !fullMapData.levels) {
            container.innerHTML = "<p>No map loaded or map data is invalid (missing levels or dimensions).</p>";
            gameState.tileCache = null; // Ensure tileCache is cleared if map is invalid
            return;
        }

        const mapTotalHeight = fullMapData.dimensions.height;
        const mapTotalWidth = fullMapData.dimensions.width;

        if (mapTotalHeight === 0 || mapTotalWidth === 0) {
            container.innerHTML = "<p>Map dimensions are zero. Cannot render.</p>";
            gameState.tileCache = null;
            return;
        }

        // Calculate tile dimensions (char cell size)
        let tileWidth = 10; // Default
        let tileHeight = 18; // Default
        const tempSpan = document.createElement('span');
        tempSpan.style.fontFamily = getComputedStyle(container).fontFamily;
        tempSpan.style.fontSize = getComputedStyle(container).fontSize;
        tempSpan.style.lineHeight = getComputedStyle(container).lineHeight;
        tempSpan.style.position = 'absolute'; tempSpan.style.visibility = 'hidden';
        tempSpan.textContent = 'M'; // Measure a character
        document.body.appendChild(tempSpan);
        if (tempSpan.offsetWidth > 0) tileWidth = tempSpan.offsetWidth;
        if (tempSpan.offsetHeight > 0) tileHeight = tempSpan.offsetHeight;
        document.body.removeChild(tempSpan);

        // Cache tile size for use in mouse events
        this.lastTileWidth = tileWidth;
        this.lastTileHeight = tileHeight;

        // Viewport calculations
        const viewPortWidth = container.clientWidth;
        const viewPortHeight = container.clientHeight;
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        const startCol = Math.max(0, Math.floor(scrollLeft / tileWidth));
        const endCol = Math.min(mapTotalWidth - 1, Math.floor((scrollLeft + viewPortWidth - 1) / tileWidth)); // -1 for 0-indexed
        const startRow = Math.max(0, Math.floor(scrollTop / tileHeight));
        const endRow = Math.min(mapTotalHeight - 1, Math.floor((scrollTop + viewPortHeight - 1) / tileHeight)); // -1 for 0-indexed

        // Number of rows and columns to render in the viewport
        const H_viewport = endRow - startRow + 1; // Height of the viewport in tiles (used for voidHtml)
        const W_viewport = endCol - startCol + 1; // Width of the viewport in tiles (used for voidHtml)


        const currentZ = gameState.currentViewZ;
        const currentZStr = currentZ.toString();
        const currentLevelData = fullMapData.levels[currentZStr];

        if (!currentLevelData) {
            // If the current view Z-level doesn't exist, render an empty void.
            if (container) {
                container.innerHTML = ""; // Clear previous content
                let voidHtml = "";
                for (let y_vp = 0; y_vp < H_viewport; y_vp++) { // Use viewport dimensions
                    for (let x_vp = 0; x_vp < W_viewport; x_vp++) {
                        voidHtml += " "; // Add an empty space for each tile
                    }
                    voidHtml += "<br>"; // New line after each row
                }
                container.innerHTML = voidHtml;
                // logToConsole(`renderMapLayers: No data for currentViewZ = ${currentZ}. Displaying empty grid.`); // Removed as requested
            }
            gameState.tileCache = null; // Clear cache as the Z-level is not valid for rendering
            return;
        }



        let isInitialRender = false;
        // Tile cache is now per-Z. We might only cache the currentViewZ.
        // For this iteration, let's assume gameState.tileCache is for currentViewZ.
        // A full Z-level change (gameState.currentViewZ changes) would trigger an initial render for that Z.
        // The cache will still store the entire map's data, but we only create/update DOM for viewport.
        if (!gameState.tileCache ||
            gameState.tileCache.z !== currentZ ||
            gameState.tileCache.data.length !== mapTotalHeight || // Cache stores full map height
            (mapTotalHeight > 0 && (gameState.tileCache.data[0]?.length || 0) !== mapTotalWidth) // Cache stores full map width
        ) {
            isInitialRender = true;
        }


        if (isInitialRender) {
            container.innerHTML = ""; // Clear container for new Z-level or initial load
            gameState.tileCache = {
                z: currentZ,
                // Cache data structure stores the entire map, not just the viewport
                data: Array(mapTotalHeight).fill(null).map(() => Array(mapTotalWidth).fill(null))
            };
        }

        const tileCacheData = gameState.tileCache.data;

        // Fragment is for initial render of the viewport
        const fragment = document.createDocumentFragment();


        const LIGHT_SOURCE_BRIGHTNESS_BOOST = 0.1;
        const currentAmbientColor = getAmbientLightColor(gameState.currentTime && typeof gameState.currentTime.hours === 'number' ? gameState.currentTime.hours : 12);
        const AMBIENT_STRENGTH_VISIBLE = 0.3;
        const currentFowData = gameState.fowData[currentZStr]; // Ensure currentFowData is sourced for the current Z level
        const AMBIENT_STRENGTH_VISITED = 0.2;

        // --- Render current Z-level (gameState.currentViewZ) ---
        // Iterate only over the visible viewport tiles
        // 'y' and 'x' here are ABSOLUTE map coordinates.
        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                // Determine the base tile from the current Z-level's layers using absolute y, x
                let baseTileId = currentLevelData.landscape?.[y]?.[x] || "";
                let finalTileId = baseTileId;

                if (currentLevelData.building?.[y]?.[x]) finalTileId = currentLevelData.building[y][x];
                if (currentLevelData.item?.[y]?.[x]) finalTileId = currentLevelData.item[y][x];
                if (gameState.showRoof && currentLevelData.roof?.[y]?.[x]) {
                    finalTileId = currentLevelData.roof[y][x];
                }
                if (finalTileId === "") finalTileId = baseTileId;

                let displaySprite = ' ';
                let displayColor = '#000000';
                let tileNameForTitle = 'Empty';
                let originalDisplayIdForTitle = '';
                let isSolidTerrainTopDirectlyOnCurrentZ = false;
                // let finalTileDefForLightingAndFow = null; // Already declared by previous change

                let tileOnBottomRawCurrentZ = currentLevelData.bottom?.[y]?.[x] || "";
                let tileOnMiddleRawCurrentZ = currentLevelData.middle?.[y]?.[x] || "";
                let effectiveTileOnBottomCurrentZ = (typeof tileOnBottomRawCurrentZ === 'object' && tileOnBottomRawCurrentZ !== null && tileOnBottomRawCurrentZ.tileId !== undefined) ? tileOnBottomRawCurrentZ.tileId : tileOnBottomRawCurrentZ;
                let effectiveTileOnMiddleCurrentZ = (typeof tileOnMiddleRawCurrentZ === 'object' && tileOnMiddleRawCurrentZ !== null && tileOnMiddleRawCurrentZ.tileId !== undefined) ? tileOnMiddleRawCurrentZ.tileId : tileOnMiddleRawCurrentZ;
                let tileDefOnBottomCurrentZ = assetManagerInstance.tilesets[effectiveTileOnBottomCurrentZ];
                let tileDefOnMiddleCurrentZ = assetManagerInstance.tilesets[effectiveTileOnMiddleCurrentZ];
                let primaryTileDefOnCurrentZ = null;

                if (effectiveTileOnMiddleCurrentZ && tileDefOnMiddleCurrentZ) {
                    primaryTileDefOnCurrentZ = tileDefOnMiddleCurrentZ;
                    originalDisplayIdForTitle = effectiveTileOnMiddleCurrentZ;
                } else if (effectiveTileOnBottomCurrentZ && tileDefOnBottomCurrentZ) {
                    primaryTileDefOnCurrentZ = tileDefOnBottomCurrentZ;
                    originalDisplayIdForTitle = effectiveTileOnBottomCurrentZ;
                }

                if (primaryTileDefOnCurrentZ && primaryTileDefOnCurrentZ.tags && primaryTileDefOnCurrentZ.tags.includes('solid_terrain_top')) {
                    displaySprite = '▓';
                    displayColor = primaryTileDefOnCurrentZ.color;
                    tileNameForTitle = primaryTileDefOnCurrentZ.name;
                    isSolidTerrainTopDirectlyOnCurrentZ = true;
                    // finalTileDefForLightingAndFow = primaryTileDefOnCurrentZ; // Already declared
                } else if (primaryTileDefOnCurrentZ) {
                    displaySprite = primaryTileDefOnCurrentZ.sprite;
                    displayColor = primaryTileDefOnCurrentZ.color;
                    tileNameForTitle = primaryTileDefOnCurrentZ.name;
                    // finalTileDefForLightingAndFow = primaryTileDefOnCurrentZ; // Already declared
                }

                let finalTileDefForLightingAndFow = primaryTileDefOnCurrentZ;


                let isCurrentCellSeeThrough = (!primaryTileDefOnCurrentZ);
                if (primaryTileDefOnCurrentZ && primaryTileDefOnCurrentZ.tags &&
                    (primaryTileDefOnCurrentZ.tags.includes('transparent_floor') || primaryTileDefOnCurrentZ.tags.includes('allows_vision') || primaryTileDefOnCurrentZ.tags.includes('transparent_bottom'))) {
                    if (!isSolidTerrainTopDirectlyOnCurrentZ) {
                        isCurrentCellSeeThrough = true;
                    }
                }

                if (isCurrentCellSeeThrough) {
                    const zBelowStr = (currentZ - 1).toString();
                    const levelBelow = fullMapData.levels[zBelowStr];
                    if (levelBelow) {
                        let tileBottomBelowRaw = levelBelow.bottom?.[y]?.[x] || "";
                        let tileMiddleBelowRaw = levelBelow.middle?.[y]?.[x] || "";
                        let effTileBottomBelow = (typeof tileBottomBelowRaw === 'object' && tileBottomBelowRaw !== null && tileBottomBelowRaw.tileId !== undefined) ? tileBottomBelowRaw.tileId : tileBottomBelowRaw;
                        let effTileMiddleBelow = (typeof tileMiddleBelowRaw === 'object' && tileMiddleBelowRaw !== null && tileMiddleBelowRaw.tileId !== undefined) ? tileMiddleBelowRaw.tileId : tileMiddleBelowRaw;
                        let tileDefFromBelowToDisplay = null;
                        let idFromBelowToDisplay = null;
                        if (effTileMiddleBelow && assetManagerInstance.tilesets[effTileMiddleBelow]?.tags.includes('solid_terrain_top')) {
                            tileDefFromBelowToDisplay = assetManagerInstance.tilesets[effTileMiddleBelow];
                            idFromBelowToDisplay = effTileMiddleBelow;
                        } else if (effTileBottomBelow && assetManagerInstance.tilesets[effTileBottomBelow]?.tags.includes('solid_terrain_top')) {
                            tileDefFromBelowToDisplay = assetManagerInstance.tilesets[effTileBottomBelow];
                            idFromBelowToDisplay = effTileBottomBelow;
                        }
                        if (tileDefFromBelowToDisplay) {
                            displaySprite = tileDefFromBelowToDisplay.sprite;
                            displayColor = tileDefFromBelowToDisplay.color;
                            tileNameForTitle = tileDefFromBelowToDisplay.name;
                            originalDisplayIdForTitle = idFromBelowToDisplay;
                            finalTileDefForLightingAndFow = tileDefFromBelowToDisplay;
                        }
                    }
                }

                let originalSprite = displaySprite;
                let originalColor = displayColor;
                finalTileId = originalDisplayIdForTitle;

                let tileDefinedBackgroundColor = "";
                if (originalColor && originalColor !== '#000000') {
                    tileDefinedBackgroundColor = darkenColor(originalColor, 0.8);
                }

                let fowStatus = 'hidden';
                if (currentFowData && currentFowData[y] && typeof currentFowData[y][x] !== 'undefined') {
                    fowStatus = currentFowData[y][x];
                }

                displaySprite = originalSprite;
                displayColor = originalColor;
                let displayId = finalTileId || "";

                if (finalTileId && assetManagerInstance && assetManagerInstance.tilesets) {
                    const tempTileDef = assetManagerInstance.tilesets[finalTileId];
                    if (tempTileDef && tempTileDef.tags && tempTileDef.tags.includes('container')) {
                        // displayColor = 'fuchsia'; 
                    }
                }

                if (fowStatus === 'hidden') {
                    displaySprite = ' ';
                    displayColor = '#1a1a1a';
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

        if (gameState.isConstructionModeActive && gameState.constructionGhostCoords &&
            gameState.constructionGhostCoords.z === currentZ) {

            const defId = gameState.selectedConstructionId;
            const def = window.constructionManager && window.constructionManager.constructionDefinitions ? window.constructionManager.constructionDefinitions[defId] : null;
            if (def) {
                const gx = gameState.constructionGhostCoords.x;
                const gy = gameState.constructionGhostCoords.y;
                const size = def.size || { width: 1, height: 1 };

                // Check if current tile (x, y) is within ghost bounds
                if (x >= gx && x < gx + size.width && y >= gy && y < gy + size.height) {
                    // It is part of the ghost!
                    // Determine validity (once per render cycle or just recalculate?)
                    // For performance, isValidPlacement is a bit heavy to call per tile.
                    // But we only do it for tiles in ghost.
                    // Let's call it for the origin once per frame/update?
                    // Better: Assume valid unless we implement caching of validity.
                    // Let's just check validity for the ORIGIN (gx, gy) because that's what placeConstruction does.
                    // And we can reuse that boolean for all tiles in the ghost.

                    if (window.mapRenderer._lastGhostValidityCheckTime !== Date.now() ||
                        window.mapRenderer._lastGhostX !== gx || window.mapRenderer._lastGhostY !== gy) {

                        window.mapRenderer._lastGhostValidity = window.constructionManager.isValidPlacement(def, { x: gx, y: gy, z: currentZ });
                        window.mapRenderer._lastGhostValidityCheckTime = Date.now();
                        window.mapRenderer._lastGhostX = gx;
                        window.mapRenderer._lastGhostY = gy;
                    }
                    const isValid = window.mapRenderer._lastGhostValidity;

                    // Get sprite from definition
                    let ghostSprite = '?';
                    let ghostColor = '#FFFFFF';
                    if (def.tileIdPlaced && assetManagerInstance.tilesets[def.tileIdPlaced]) {
                        const tileDef = assetManagerInstance.tilesets[def.tileIdPlaced];
                        ghostSprite = tileDef.sprite;
                        ghostColor = tileDef.color;
                    }

                    finalSpriteForTile = ghostSprite;
                    // Tint color based on validity
                    if (isValid) {
                        finalColorForTile = 'rgba(0, 255, 0, 0.7)'; // Greenish tint
                        // Or blend ghostColor with green?
                        // finalColorForTile = blendColors(ghostColor, '#00FF00', 0.5);
                    } else {
                        finalColorForTile = 'rgba(255, 0, 0, 0.7)'; // Reddish tint
                        // finalColorForTile = blendColors(ghostColor, '#FF0000', 0.5);
                    }
                    finalDisplayIdForTile = 'CONSTRUCTION_GHOST';
                }
            }
        }

        if (gameState.isConstructionModeActive && gameState.constructionGhostCoords &&
            gameState.constructionGhostCoords.z === currentZ) {

            const defId = gameState.selectedConstructionId;
            const def = window.constructionManager && window.constructionManager.constructionDefinitions ? window.constructionManager.constructionDefinitions[defId] : null;
            if (def) {
                const gx = gameState.constructionGhostCoords.x;
                const gy = gameState.constructionGhostCoords.y;
                const size = def.size || { width: 1, height: 1 };

                // Check if current tile (x, y) is within ghost bounds
                if (x >= gx && x < gx + size.width && y >= gy && y < gy + size.height) {
                    // It is part of the ghost!
                    // Determine validity (once per render cycle or just recalculate?)
                    // For performance, isValidPlacement is a bit heavy to call per tile.
                    // But we only do it for tiles in ghost.
                    // Let's call it for the origin once per frame/update?
                    // Better: Assume valid unless we implement caching of validity.
                    // Let's just check validity for the ORIGIN (gx, gy) because that's what placeConstruction does.
                    // And we can reuse that boolean for all tiles in the ghost.

                    if (window.mapRenderer._lastGhostValidityCheckTime !== Date.now() ||
                        window.mapRenderer._lastGhostX !== gx || window.mapRenderer._lastGhostY !== gy) {

                        window.mapRenderer._lastGhostValidity = window.constructionManager.isValidPlacement(def, { x: gx, y: gy, z: currentZ });
                        window.mapRenderer._lastGhostValidityCheckTime = Date.now();
                        window.mapRenderer._lastGhostX = gx;
                        window.mapRenderer._lastGhostY = gy;
                    }
                    const isValid = window.mapRenderer._lastGhostValidity;

                    // Get sprite from definition
                    let ghostSprite = '?';
                    let ghostColor = '#FFFFFF';
                    if (def.tileIdPlaced && assetManagerInstance.tilesets[def.tileIdPlaced]) {
                        const tileDef = assetManagerInstance.tilesets[def.tileIdPlaced];
                        ghostSprite = tileDef.sprite;
                        ghostColor = tileDef.color;
                    }

                    finalSpriteForTile = ghostSprite;
                    // Tint color based on validity
                    if (isValid) {
                        finalColorForTile = 'rgba(0, 255, 0, 0.7)'; // Greenish tint
                        // Or blend ghostColor with green?
                        // finalColorForTile = blendColors(ghostColor, '#00FF00', 0.5);
                    } else {
                        finalColorForTile = 'rgba(255, 0, 0, 0.7)'; // Reddish tint
                        // finalColorForTile = blendColors(ghostColor, '#FF0000', 0.5);
                    }
                    finalDisplayIdForTile = 'CONSTRUCTION_GHOST';
                }
            }
        }

        if (gameState.isConstructionModeActive && gameState.constructionGhostCoords &&
            gameState.constructionGhostCoords.z === currentZ) {

            const defId = gameState.selectedConstructionId;
            const def = window.constructionManager && window.constructionManager.constructionDefinitions ? window.constructionManager.constructionDefinitions[defId] : null;
            if (def) {
                const gx = gameState.constructionGhostCoords.x;
                const gy = gameState.constructionGhostCoords.y;
                const size = def.size || { width: 1, height: 1 };

                // Check if current tile (x, y) is within ghost bounds
                if (x >= gx && x < gx + size.width && y >= gy && y < gy + size.height) {
                    // It is part of the ghost!
                    // Determine validity (once per render cycle or just recalculate?)
                    // For performance, isValidPlacement is a bit heavy to call per tile.
                    // But we only do it for tiles in ghost.
                    // Let's call it for the origin once per frame/update?
                    // Better: Assume valid unless we implement caching of validity.
                    // Let's just check validity for the ORIGIN (gx, gy) because that's what placeConstruction does.
                    // And we can reuse that boolean for all tiles in the ghost.

                    if (window.mapRenderer._lastGhostValidityCheckTime !== Date.now() ||
                        window.mapRenderer._lastGhostX !== gx || window.mapRenderer._lastGhostY !== gy) {

                        window.mapRenderer._lastGhostValidity = window.constructionManager.isValidPlacement(def, { x: gx, y: gy, z: currentZ });
                        window.mapRenderer._lastGhostValidityCheckTime = Date.now();
                        window.mapRenderer._lastGhostX = gx;
                        window.mapRenderer._lastGhostY = gy;
                    }
                    const isValid = window.mapRenderer._lastGhostValidity;

                    // Get sprite from definition
                    let ghostSprite = '?';
                    let ghostColor = '#FFFFFF';
                    if (def.tileIdPlaced && assetManagerInstance.tilesets[def.tileIdPlaced]) {
                        const tileDef = assetManagerInstance.tilesets[def.tileIdPlaced];
                        ghostSprite = tileDef.sprite;
                        ghostColor = tileDef.color;
                    }

                    finalSpriteForTile = ghostSprite;
                    // Tint color based on validity
                    if (isValid) {
                        finalColorForTile = 'rgba(0, 255, 0, 0.7)'; // Greenish tint
                        // Or blend ghostColor with green?
                        // finalColorForTile = blendColors(ghostColor, '#00FF00', 0.5);
                    } else {
                        finalColorForTile = 'rgba(255, 0, 0, 0.7)'; // Reddish tint
                        // finalColorForTile = blendColors(ghostColor, '#FF0000', 0.5);
                    }
                    finalDisplayIdForTile = 'CONSTRUCTION_GHOST';
                }
            }
        }

                if (gameState.isTargetingMode && x === gameState.targetingCoords.x && y === gameState.targetingCoords.y && currentZ === gameState.targetingCoords.z) {
                    finalSpriteForTile = 'X';
                    finalColorForTile = 'red';
                    finalDisplayIdForTile = 'TARGET_CURSOR';
                } else if (gameState.activeFires && gameState.activeFires.some(f => f.x === x && f.y === y && f.z === currentZ)) {
                    finalSpriteForTile = '^'; // Fire sprite
                    finalColorForTile = 'orange'; // Fire color
                    finalDisplayIdForTile = 'FIRE';
                } else if (window.trapManager && typeof window.trapManager.getTrapAt === 'function') {
                    const trapInstance = window.trapManager.getTrapAt(x, y, currentZ);
                    if (trapInstance && trapInstance.state !== "hidden") {
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
                                finalSpriteForTile = trapVisualDef.sprite || finalSpriteForTile;
                                finalColorForTile = trapVisualDef.color || finalColorForTile;
                                finalDisplayIdForTile = trapSpriteKey;
                                tileNameForTitle = trapDef.name;
                            }
                        }
                    }
                }

                const isPlayerCurrentlyOnThisTileAndZ = (gameState.playerPos &&
                    x === gameState.playerPos.x &&
                    y === gameState.playerPos.y &&
                    gameState.playerPos.z === currentZ);

                if (isPlayerCurrentlyOnThisTileAndZ) {
                    const playerFowStatus = currentFowData?.[y]?.[x];
                    const roofIsObscuringPlayer = gameState.showRoof && currentLevelData.roof?.[y]?.[x];
                    if (playerFowStatus === 'visible' && !roofIsObscuringPlayer) {
                        let drawStaticPlayer = true;
                        if (gameState.activeAnimations && gameState.activeAnimations.length > 0) {
                            const playerCombatAnim = gameState.activeAnimations.find(anim =>
                                anim.visible &&
                                (anim.type === 'meleeSwing' || anim.type === 'rangedBullet' || anim.type === 'throwing') &&
                                anim.data.attacker === gameState &&
                                Math.floor(anim.x) === x && Math.floor(anim.y) === y &&
                                (anim.z === undefined || anim.z === currentZ)
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

                if (gameState.playerPos && x === gameState.playerPos.x && y === gameState.playerPos.y &&
                    gameState.playerPos.displayZ !== undefined && gameState.playerPos.displayZ === currentZ) {
                    finalSpriteForTile = "☻";
                    finalColorForTile = "green";
                    finalDisplayIdForTile = "PLAYER_FALLING";
                }

                // Access cache using absolute x, y
                const cachedCell = tileCacheData[y]?.[x];

                if (isInitialRender) {
                    const span = document.createElement("span");
                    span.className = "tile";
                    span.dataset.x = x; // Absolute X
                    span.dataset.y = y; // Absolute Y
                    span.textContent = finalSpriteForTile;
                    span.style.color = finalColorForTile;
                    span.style.backgroundColor = tileDefinedBackgroundColor;

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
                                span.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
                            }
                        }
                    }

                    // Store the span in the full-map cache at absolute coordinates
                    tileCacheData[y][x] = {
                        span: span,
                        displayedId: finalDisplayIdForTile,
                        sprite: finalSpriteForTile,
                        color: finalColorForTile
                        // Not storing backgroundColor in cache as it's complex and derived
                    };
                    fragment.appendChild(span);
                } else if (cachedCell && cachedCell.span) { // If not initial render, update existing span
                    const span = cachedCell.span;
                    if (cachedCell.sprite !== finalSpriteForTile || cachedCell.color !== finalColorForTile) {
                        span.textContent = finalSpriteForTile;
                        span.style.color = finalColorForTile;
                        cachedCell.sprite = finalSpriteForTile;
                        cachedCell.color = finalColorForTile;
                    }
                    cachedCell.displayedId = finalDisplayIdForTile;

                    let newBackgroundColor = tileDefinedBackgroundColor;
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
                                newBackgroundColor = "rgba(255, 255, 0, 0.3)";
                            }
                        }
                    }

                    if (fowStatus === 'hidden') {
                        newBackgroundColor = '#101010';
                    } else if (fowStatus === 'visited' && newBackgroundColor) {
                        if (newBackgroundColor.startsWith('rgba')) {
                            try {
                                const parts = newBackgroundColor.match(/[\d.]+/g);
                                if (parts && parts.length === 4) {
                                    let r = parseInt(parts[0]); let g = parseInt(parts[1]); let b = parseInt(parts[2]); let a = parseFloat(parts[3]);
                                    r = Math.max(0, Math.floor(r * 0.5)); g = Math.max(0, Math.floor(g * 0.5)); b = Math.max(0, Math.floor(b * 0.5)); a = Math.max(0, a * 0.7);
                                    newBackgroundColor = `rgba(${r},${g},${b},${a})`;
                                }
                            } catch (e) { newBackgroundColor = darkenColor(newBackgroundColor, 0.6) || '#303030'; }
                        } else if (newBackgroundColor.startsWith('#')) {
                            newBackgroundColor = darkenColor(newBackgroundColor, 0.6);
                        } else { newBackgroundColor = '#303030'; }
                    }
                    if (span.style.backgroundColor !== newBackgroundColor) {
                        span.style.backgroundColor = newBackgroundColor;
                    }

                    // Targeting cursor class already handled by the clearing loop and specific addition later
                }
            }
            if (isInitialRender) { // Add <br> after each row for the viewport
                const br = document.createElement("br");
                fragment.appendChild(br);
            }
        }

        // Highlight for hovered entity
        if (gameState.highlightedEntityId && tileCacheData) {
            const highlightedNpc = gameState.npcs.find(npc => npc.id === gameState.highlightedEntityId);
            if (highlightedNpc && highlightedNpc.mapPos && highlightedNpc.mapPos.z === currentZ) {
                const hx = highlightedNpc.mapPos.x;
                const hy = highlightedNpc.mapPos.y;
                if (hx >= startCol && hx <= endCol && hy >= startRow && hy <= endRow) {
                    const cell = tileCacheData[hy]?.[hx];
                    if (cell && cell.span) {
                        cell.span.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Yellow highlight
                    }
                }
            }
        }

        // --- START: Render Environmental Effects (Smoke, Tear Gas) on current Z-level (Viewport Aware) ---
        const environmentalEffectsToRender = [];
        // ... (filtering effects for currentZ remains same) ...
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
                const x = effect.x; // absolute map X
                const y = effect.y; // absolute map Y
                // Check if effect is within viewport
                if (x >= startCol && x <= endCol && y >= startRow && y <= endRow) {
                    const fowStatus = currentFowData?.[y]?.[x];
                    if (fowStatus === 'visible' || fowStatus === 'visited') {
                        const cachedCell = tileCacheData[y]?.[x]; // Access cache with absolute coords
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
                            cachedCell.sprite = effectSprite; // Update cache
                            cachedCell.color = effectColor;
                        }
                    }
                }
            });
        }
        // --- END: Render Environmental Effects ---

        if (isInitialRender && container) { // Only append fragment if it was populated
            container.appendChild(fragment);
        }

        // --- Onion Skinning Logic (Viewport Aware) ---
        // ... (BASE_ONION_SKIN_DARKEN_FACTOR etc. constants remain) ...
        const BASE_ONION_SKIN_DARKEN_FACTOR = 0.5;
        const EXTRA_DARKEN_PER_LEVEL = 0.1;
        const MAX_ONION_DARKEN_FACTOR = 0.85;
        const ONION_SKIN_ABOVE_TINT_COLOR = '#003300';
        const BASE_ONION_SKIN_ABOVE_TINT_FACTOR = 0.6;
        const EXTRA_ABOVE_TINT_PER_LEVEL = 0.1;
        const MAX_ABOVE_TINT_FACTOR = 0.9;
        const ONION_SKIN_BELOW_TINT_COLOR = '#330000';
        const BASE_ONION_SKIN_BELOW_TINT_FACTOR = 0.6;
        const EXTRA_BELOW_TINT_PER_LEVEL = 0.1;
        const MAX_BELOW_TINT_FACTOR = 0.9;
        const maxLevelsAbove = gameState.onionSkinLevelsAbove || 0;
        const maxLevelsBelow = gameState.onionSkinLevelsBelow || 0;

        // Render Z-levels below (onion skin - viewport aware)
        for (let zOffset = 1; zOffset <= maxLevelsBelow; zOffset++) {
            const onionZ = currentZ - zOffset;
            const levelDataBelow = fullMapData.levels[onionZ.toString()];
            if (!levelDataBelow || !tileCacheData) continue;
            const distanceFactor = zOffset;
            const currentDarkenFactor = Math.min(MAX_ONION_DARKEN_FACTOR, BASE_ONION_SKIN_DARKEN_FACTOR + (distanceFactor - 1) * EXTRA_DARKEN_PER_LEVEL);
            const currentBelowTintFactor = Math.min(MAX_BELOW_TINT_FACTOR, BASE_ONION_SKIN_BELOW_TINT_FACTOR + (distanceFactor - 1) * EXTRA_BELOW_TINT_PER_LEVEL);

            for (let y = startRow; y <= endRow; y++) { // Absolute y
                for (let x = startCol; x <= endCol; x++) { // Absolute x
                    const cachedCellOnCurrentZ = tileCacheData[y]?.[x];
                    if (!cachedCellOnCurrentZ || !cachedCellOnCurrentZ.span) continue;
                    const currentSpan = cachedCellOnCurrentZ.span;

                    let isPathSeeThrough = true;
                    for (let interZ = onionZ + 1; interZ <= currentZ; interZ++) {
                        const interLevelData = fullMapData.levels[interZ.toString()];
                        const interTileIdOnViewZ = (interZ === currentZ) ? cachedCellOnCurrentZ.displayedId : null;
                        const interTileDefOnViewZ = assetManagerInstance.tilesets[interTileIdOnViewZ];
                        let isCurrentInterTileSeeThrough = false;
                        if (interZ === currentZ) {
                            if (interTileIdOnViewZ === "PLAYER_STATIC" || interTileIdOnViewZ?.startsWith("NPC_") || interTileIdOnViewZ === "FOW_HIDDEN") isCurrentInterTileSeeThrough = false;
                            else if (!interTileIdOnViewZ) isCurrentInterTileSeeThrough = true;
                            else if (interTileDefOnViewZ && interTileDefOnViewZ.tags && (interTileDefOnViewZ.tags.includes('transparent_floor') || interTileDefOnViewZ.tags.includes('allows_vision') || interTileDefOnViewZ.tags.includes('transparent_bottom'))) isCurrentInterTileSeeThrough = true;
                            else isCurrentInterTileSeeThrough = false;
                        } else {
                            const interMiddleRaw = interLevelData?.middle?.[y]?.[x];
                            const interBottomRaw = interLevelData?.bottom?.[y]?.[x];
                            const effInterMid = (typeof interMiddleRaw === 'object' && interMiddleRaw?.tileId !== undefined) ? interMiddleRaw.tileId : interMiddleRaw;
                            const effInterBot = (typeof interBottomRaw === 'object' && interBottomRaw?.tileId !== undefined) ? interBottomRaw.tileId : interBottomRaw;
                            const defInterMid = assetManagerInstance.tilesets[effInterMid];
                            const defInterBot = assetManagerInstance.tilesets[effInterBot];
                            if (effInterMid && defInterMid && !(defInterMid.tags && (defInterMid.tags.includes('transparent') || defInterMid.tags.includes('allows_vision')))) isCurrentInterTileSeeThrough = false;
                            else if (effInterBot && defInterBot && !(defInterBot.tags && (defInterBot.tags.includes('transparent_floor') || defInterBot.tags.includes('transparent_bottom') || defInterBot.tags.includes('allows_vision')))) isCurrentInterTileSeeThrough = false;
                            else if (!effInterMid && !effInterBot && interLevelData) isCurrentInterTileSeeThrough = true;
                            else if (!interLevelData) isCurrentInterTileSeeThrough = true;
                            else isCurrentInterTileSeeThrough = false;
                        }
                        if (!isCurrentInterTileSeeThrough) { isPathSeeThrough = false; break; }
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
                                    // No change to color or sprite
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
        // Render Z-levels above (onion skin - viewport aware)
        for (let zOffset = 1; zOffset <= maxLevelsAbove; zOffset++) {
            const onionZ = currentZ + zOffset;
            const levelDataAbove = fullMapData.levels[onionZ.toString()];
            if (!levelDataAbove || !tileCacheData) continue;
            const distanceFactor = zOffset;
            const currentDarkenFactor = Math.min(MAX_ONION_DARKEN_FACTOR, BASE_ONION_SKIN_DARKEN_FACTOR + (distanceFactor - 1) * EXTRA_DARKEN_PER_LEVEL);
            const currentAboveTintFactor = Math.min(MAX_ABOVE_TINT_FACTOR, BASE_ONION_SKIN_ABOVE_TINT_FACTOR + (distanceFactor - 1) * EXTRA_ABOVE_TINT_PER_LEVEL);

            for (let y = startRow; y <= endRow; y++) { // Absolute y
                for (let x = startCol; x <= endCol; x++) { // Absolute x
                    const cachedCellOnCurrentZ = tileCacheData[y]?.[x];
                    if (!cachedCellOnCurrentZ || !cachedCellOnCurrentZ.span) continue;
                    const currentSpan = cachedCellOnCurrentZ.span;
                    let isPathSeeThrough = true;
                    for (let interZ = onionZ - 1; interZ >= currentZ; interZ--) {
                        const interLevelData = fullMapData.levels[interZ.toString()];
                        const interTileIdOnViewZ = (interZ === currentZ) ? cachedCellOnCurrentZ.displayedId : null;
                        const interTileDefOnViewZ = assetManagerInstance.tilesets[interTileIdOnViewZ];
                        let isCurrentInterTileSeeThrough = false;
                        if (interZ === currentZ) {
                            if (interTileIdOnViewZ === "PLAYER_STATIC" || interTileIdOnViewZ?.startsWith("NPC_") || interTileIdOnViewZ === "FOW_HIDDEN") isCurrentInterTileSeeThrough = false;
                            else if (!interTileIdOnViewZ) isCurrentInterTileSeeThrough = true;
                            else if (interTileDefOnViewZ && interTileDefOnViewZ.tags && (interTileDefOnViewZ.tags.includes('transparent_floor') || interTileDefOnViewZ.tags.includes('allows_vision') || interTileDefOnViewZ.tags.includes('transparent_bottom'))) isCurrentInterTileSeeThrough = true;
                            else isCurrentInterTileSeeThrough = false;
                        } else {
                            const interMiddleRaw = interLevelData?.middle?.[y]?.[x];
                            const interBottomRaw = interLevelData?.bottom?.[y]?.[x];
                            const effInterMid = (typeof interMiddleRaw === 'object' && interMiddleRaw?.tileId !== undefined) ? interMiddleRaw.tileId : interMiddleRaw;
                            const effInterBot = (typeof interBottomRaw === 'object' && interBottomRaw?.tileId !== undefined) ? interBottomRaw.tileId : interBottomRaw;
                            const defInterMid = assetManagerInstance.tilesets[effInterMid];
                            const defInterBot = assetManagerInstance.tilesets[effInterBot];
                            if (effInterMid && defInterMid && !(defInterMid.tags && (defInterMid.tags.includes('transparent_ceiling') || defInterMid.tags.includes('transparent') || defInterMid.tags.includes('allows_vision')))) isCurrentInterTileSeeThrough = false;
                            else if (effInterBot && defInterBot && !(defInterBot.tags && (defInterBot.tags.includes('transparent_ceiling') || defInterBot.tags.includes('transparent_floor') || defInterBot.tags.includes('transparent_bottom') || defInterBot.tags.includes('allows_vision')))) isCurrentInterTileSeeThrough = false;
                            else if (!effInterMid && !effInterBot && interLevelData) isCurrentInterTileSeeThrough = true;
                            else if (!interLevelData) isCurrentInterTileSeeThrough = true;
                            else isCurrentInterTileSeeThrough = false;
                        }
                        if (!isCurrentInterTileSeeThrough) { isPathSeeThrough = false; break; }
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
                                if (isRoofTileAbove && !gameState.showRoof && zOffset === 1) canShowTileFromAbove = false;
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


        // Ranged Attack Line (Viewport Aware)
        if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState && gameState.rangedAttackData && tileCacheData) {
            const { start, end, distance, modifierText: rangeDetailsText } = gameState.rangedAttackData;
            if (start.z === currentZ || end.z === currentZ || (Math.min(start.z, end.z) < currentZ && Math.max(start.z, end.z) > currentZ)) {
                const linePoints = this.getLine3D(start.x, start.y, start.z, end.x, end.y, end.z);
                linePoints.forEach((point, index) => {
                    if (point.z === currentZ && point.x >= startCol && point.x <= endCol && point.y >= startRow && point.y <= endRow) {
                        const cachedCell = tileCacheData[point.y]?.[point.x]; // Absolute coords for cache
                        if (cachedCell && cachedCell.span) {
                            cachedCell.span.style.backgroundColor = "rgba(173, 216, 230, 0.3)";
                            if (point.x === end.x && point.y === end.y) {
                                cachedCell.span.dataset.rangedInfo = rangeDetailsText || `Dist: ${distance}`;
                                cachedCell.span.style.backgroundColor = "rgba(173, 216, 230, 0.5)";
                            }
                            // ... (rest of ranged attack line logic for text display)
                            if (index === Math.floor(linePoints.length / 2) && rangeDetailsText) {
                                const match = rangeDetailsText.match(/\(([+-]?\d+)\)$/);
                                if (match && match[1]) {
                                    const modChar = match[1]; // Defined modChar here
                                    if (modChar.length > 0 && (modChar.startsWith('+') || modChar.startsWith('-'))) {
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
                });
            }
        }

        // NPC Rendering (Viewport Aware)
        if (gameState.npcs && gameState.npcs.length > 0 && tileCacheData) {
            gameState.npcs.forEach(npc => {
                if (!npc.mapPos || npc.mapPos.z !== currentZ) return;
                const npcX = npc.mapPos.x; // absolute map X
                const npcY = npc.mapPos.y; // absolute map Y
                if (npcX >= startCol && npcX <= endCol && npcY >= startRow && npcY <= endRow) {
                    let isBeingAnimated = false;
                    // ... (animation check remains same) ...
                    if (gameState.activeAnimations && gameState.activeAnimations.length > 0) {
                        const npcMoveAnim = gameState.activeAnimations.find(anim =>
                            anim.type === 'movement' && anim.data.entity === npc && anim.visible &&
                            (anim.z === undefined || anim.z === currentZ)
                        );
                        if (npcMoveAnim) isBeingAnimated = true;
                    }

                    if (!isBeingAnimated) {
                        const roofObscures = gameState.showRoof && currentLevelData.roof?.[npcY]?.[npcX];
                        const playerIsHere = (npcX === gameState.playerPos.x && npcY === gameState.playerPos.y && gameState.playerPos.z === currentZ);
                        const isTargetingCursorHere = gameState.isTargetingMode && npcX === gameState.targetingCoords.x && npcY === gameState.targetingCoords.y && gameState.targetingCoords.z === currentZ;
                        const cachedCell = tileCacheData[npcY]?.[npcX]; // Absolute coords for cache
                        const playerAlreadyRenderedOnTile = cachedCell?.displayedId === "PLAYER_STATIC" || cachedCell?.displayedId === "PLAYER_FALLING";

                        if (!roofObscures && !playerIsHere && !isTargetingCursorHere && !playerAlreadyRenderedOnTile) {
                            const npcTileFowStatus = currentFowData?.[npcY]?.[npcX] || 'hidden';
                            if (npc.displayZ !== undefined && npc.displayZ === currentZ) { // Falling
                                if (cachedCell && cachedCell.span && (npcTileFowStatus === 'visible' || npcTileFowStatus === 'visited')) {
                                    cachedCell.span.textContent = npc.sprite;
                                    cachedCell.span.style.color = npc.color;
                                    cachedCell.sprite = npc.sprite;
                                    cachedCell.color = npc.color;
                                }
                            } else if (npcTileFowStatus === 'visible') {
                                if (cachedCell && cachedCell.span) {
                                    cachedCell.span.textContent = npc.sprite;
                                    cachedCell.span.style.color = npc.color;
                                    cachedCell.sprite = npc.sprite;
                                    cachedCell.color = npc.color;
                                }
                            } else if (npcTileFowStatus === 'visited') {
                                if (cachedCell && cachedCell.span) {
                                    cachedCell.span.textContent = npc.sprite;
                                    cachedCell.span.style.color = darkenColor(npc.color, 0.6);
                                    cachedCell.sprite = npc.sprite;
                                    cachedCell.color = darkenColor(npc.color, 0.6);
                                }
                            }
                        }
                    }
                }
            });
        }

        // Render Active Animations (Viewport Aware)
        if (gameState.activeAnimations && gameState.activeAnimations.length > 0 && tileCacheData) {
            gameState.activeAnimations.forEach(anim => {
                if (!anim.visible || (anim.z !== undefined && anim.z !== currentZ)) return;
                // Explosion animation (Viewport Aware for individual cells)
                if (anim.type === 'explosion' && anim.explosionSprites && anim.centerPos) {
                    const explosionMaxRadius = anim.currentExpansionRadius;
                    const explosionCenterZ = anim.centerPos.z;
                    const distZ = Math.abs(explosionCenterZ - currentZ);
                    if (distZ <= explosionMaxRadius) {
                        const sliceRadiusSquared = explosionMaxRadius * explosionMaxRadius - distZ * distZ;
                        if (sliceRadiusSquared > 0) {
                            const sliceRadius = Math.floor(Math.sqrt(sliceRadiusSquared));
                            const spriteToRender = anim.explosionSprites[anim.currentFrameIndex];
                            if (!spriteToRender) return;
                            const colorToRender = anim.color;
                            const centerX = Math.floor(anim.centerPos.x);
                            const centerY = Math.floor(anim.centerPos.y);
                            for (let y_anim = Math.max(startRow, centerY - sliceRadius); y_anim <= Math.min(endRow, centerY + sliceRadius); y_anim++) {
                                for (let x_anim = Math.max(startCol, centerX - sliceRadius); x_anim <= Math.min(endCol, centerX + sliceRadius); x_anim++) {
                                    const dx = x_anim - centerX; const dy = y_anim - centerY;
                                    if (dx * dx + dy * dy <= sliceRadius * sliceRadius) {
                                        const fowStatus = currentFowData?.[y_anim]?.[x_anim];
                                        if (fowStatus === 'visible' || fowStatus === 'visited') {
                                            const cachedCell = tileCacheData[y_anim]?.[x_anim]; // Absolute coords
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
                } else if (anim.type === 'flamethrower' && anim.flameParticles) { // Flamethrower (Viewport Aware)
                    anim.flameParticles.forEach(particle => {
                        if (particle.z === undefined || particle.z === currentZ) {
                            const particleX = Math.floor(particle.x); const particleY = Math.floor(particle.y);
                            if (particleX >= startCol && particleX <= endCol && particleY >= startRow && particleY <= endRow) {
                                const fowStatusParticle = currentFowData?.[particleY]?.[particleX];
                                if (fowStatusParticle === 'visible' || fowStatusParticle === 'visited') {
                                    const cachedCell = tileCacheData[particleY]?.[particleX]; // Absolute
                                    if (cachedCell && cachedCell.span) {
                                        cachedCell.span.textContent = particle.sprite;
                                        cachedCell.span.style.color = particle.color;
                                    }
                                }
                            }
                        }
                    });
                } else if (anim.type === 'gasCloud' && anim.visible && anim.particles && anim.centerPos) { // Gas Cloud (Viewport Aware)
                    const gasCloudCenterZ = anim.z;
                    const verticalRadius = anim.verticalRadius !== undefined ? anim.verticalRadius : 1;
                    if (currentZ >= gasCloudCenterZ - verticalRadius && currentZ <= gasCloudCenterZ + verticalRadius) {
                        if (anim.particles.length > 0) {
                            // ... (zAttenuation logic remains same)
                            const distZFromCloudCenter = Math.abs(gasCloudCenterZ - currentZ);
                            let zAttenuation;
                            if (verticalRadius === 0) { zAttenuation = (distZFromCloudCenter === 0) ? 1.0 : 0; }
                            else { zAttenuation = Math.max(0, 1 - (distZFromCloudCenter / verticalRadius)); }

                            if (zAttenuation > 0.05) {
                                anim.particles.forEach(particle => {
                                    const effectiveOpacity = particle.opacity * zAttenuation;
                                    if (effectiveOpacity <= 0.05) return;
                                    const particleX = Math.floor(particle.x); const particleY = Math.floor(particle.y);
                                    if (particleX >= startCol && particleX <= endCol && particleY >= startRow && particleY <= endRow) {
                                        const dx = particleX - anim.centerPos.x; const dy = particleY - anim.centerPos.y;
                                        // if ((dx * dx + dy * dy) > (anim.currentRadius * anim.currentRadius)) { return; } // Optional check

                                        const fowStatus = currentFowData?.[particleY]?.[particleX];
                                        if (fowStatus === 'visible' || fowStatus === 'visited') {
                                            const cachedCell = tileCacheData[particleY]?.[particleX]; // Absolute
                                            if (cachedCell && cachedCell.span) {
                                                cachedCell.span.textContent = particle.sprite;
                                                // ... (color blending logic remains same) ...
                                                try {
                                                    let r = parseInt(particle.color.substring(1, 3), 16); let g = parseInt(particle.color.substring(3, 5), 16); let b = parseInt(particle.color.substring(5, 7), 16);
                                                    const bgR = 30, bgG = 30, bgB = 30;
                                                    r = Math.max(0, Math.min(255, Math.floor(r * effectiveOpacity + bgR * (1 - effectiveOpacity))));
                                                    g = Math.max(0, Math.min(255, Math.floor(g * effectiveOpacity + bgG * (1 - effectiveOpacity))));
                                                    b = Math.max(0, Math.min(255, Math.floor(b * effectiveOpacity + bgB * (1 - effectiveOpacity))));
                                                    cachedCell.span.style.color = `rgb(${r},${g},${b})`;
                                                } catch (e) { cachedCell.span.style.color = particle.color; }
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }
                } else if (anim.sprite && anim.visible) { // Other single-sprite animations (Viewport Aware)
                    if (anim.z === undefined || anim.z === currentZ) {
                        const animX = Math.floor(anim.x); const animY = Math.floor(anim.y);
                        if (animX >= startCol && animX <= endCol && animY >= startRow && animY <= endRow) {
                            const fowStatus = currentFowData?.[animY]?.[animX];
                            if (fowStatus === 'visible' || fowStatus === 'visited') {
                                const cachedCell = tileCacheData[animY]?.[animX]; // Absolute
                                if (cachedCell && cachedCell.span) {
                                    cachedCell.span.textContent = anim.sprite;
                                    cachedCell.span.style.color = anim.color;
                                    cachedCell.sprite = anim.sprite;
                                    cachedCell.color = anim.color;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Vehicle Rendering (Viewport Aware)
        if (gameState.vehicles && gameState.vehicles.length > 0 && tileCacheData) {
            gameState.vehicles.forEach(vehicle => {
                if (vehicle.currentMapId === fullMapData.id && vehicle.mapPos && vehicle.mapPos.z === currentZ) {
                    const vX = vehicle.mapPos.x; const vY = vehicle.mapPos.y;
                    if (vX >= startCol && vX <= endCol && vY >= startRow && vY <= endRow) {
                        const fowStatus = currentFowData?.[vY]?.[vX] || 'hidden';
                        if (fowStatus === 'visible' || fowStatus === 'visited') {
                            const cachedCell = tileCacheData[vY]?.[vX]; // Absolute
                            if (cachedCell && cachedCell.span) {
                                let vehicleSprite = '?'; let vehicleColor = 'grey';
                                const template = window.vehicleManager?.vehicleTemplates[vehicle.templateId];
                                if (template && template.sprite) vehicleSprite = template.sprite;
                                else { const chassisDef = window.vehicleManager?.vehicleParts[vehicle.chassis]; if (chassisDef && chassisDef.sprite) vehicleSprite = chassisDef.sprite; }
                                const playerInThisVehicle = gameState.player && gameState.player.isInVehicle === vehicle.id;
                                const playerIsOnThisTile = gameState.playerPos && vX === gameState.playerPos.x && vY === gameState.playerPos.y && gameState.playerPos.z === currentZ;
                                if (playerInThisVehicle || !playerIsOnThisTile) {
                                    cachedCell.span.textContent = vehicleSprite;
                                    cachedCell.span.style.color = fowStatus === 'visited' ? this.darkenColor(vehicleColor, 0.6) : vehicleColor;
                                    cachedCell.sprite = vehicleSprite;
                                    cachedCell.color = vehicleColor;
                                    cachedCell.displayedId = `VEHICLE_${vehicle.id}`;
                                }
                            }
                        }
                    }
                }
            });
        }


        // Combat highlights (Viewport Aware)
        if (gameState.isInCombat && tileCacheData) {
            let attackerHighlightPos = null;
            if (gameState.combatCurrentAttacker === gameState) attackerHighlightPos = gameState.playerPos;
            else if (gameState.attackerMapPos) attackerHighlightPos = gameState.attackerMapPos;

            if (attackerHighlightPos && attackerHighlightPos.z === currentZ) {
                const ax = attackerHighlightPos.x; const ay = attackerHighlightPos.y; // absolute
                if (ax >= startCol && ax <= endCol && ay >= startRow && ay <= endRow) {
                    const attackerCell = tileCacheData[ay]?.[ax]; // absolute
                    if (attackerCell && attackerCell.span) {
                        const attackerFowStatus = currentFowData?.[ay]?.[ax] || 'hidden';
                        attackerCell.span.style.backgroundColor = getFOWModifiedHighlightColor('rgba(255, 0, 0, 0.3)', attackerFowStatus);
                    }
                }
            }
            if (gameState.defenderMapPos && gameState.defenderMapPos.z === currentZ) {
                const dx = gameState.defenderMapPos.x; const dy = gameState.defenderMapPos.y; // absolute
                if (dx >= startCol && dx <= endCol && dy >= startRow && dy <= endRow) {
                    const defenderCell = tileCacheData[dy]?.[dx]; // absolute
                    if (defenderCell && defenderCell.span) {
                        const defenderFowStatus = currentFowData?.[dy]?.[dx] || 'hidden';
                        defenderCell.span.style.backgroundColor = getFOWModifiedHighlightColor('rgba(0, 0, 255, 0.3)', defenderFowStatus);
                    }
                }
            }
        }

        this.updateMapHighlight(); // This function will also need to be viewport aware if it directly manipulates DOM outside cache

        if (window.gameState && window.gameState.activeAnimations && window.gameState.activeAnimations.filter(a => a.z === undefined || a.z === currentZ).length > 0) {
            window.mapRenderer.scheduleRender();
        }
    },

    updateMapHighlight: function () { // Needs to be viewport aware for querySelectorAll
        // Remove flashing from all tiles *that might have had it* (could be full map or just viewport)
        // For simplicity with current cache, let's assume spans are globally accessible if they exist
        // This might be inefficient if many spans exist outside viewport.
        // A better way would be to iterate only cached spans within viewport.
        document.querySelectorAll('.tile.flashing').forEach(el => el.classList.remove('flashing'));

        const idx = gameState.selectedItemIndex;
        if (!gameState.interactableItems || idx < 0 || idx >= gameState.interactableItems.length) return;
        const it = gameState.interactableItems[idx];
        if (!it || (it.z !== undefined && it.z !== gameState.currentViewZ)) return;

        const x = it.x; // absolute
        const y = it.y; // absolute

        // Check if highlighted item is within the current viewport before trying to flash it
        // Need startRow/Col, endRow/Col here. For now, we assume this function is called *after* they are set in renderMapLayers.
        // This is a bit fragile. Better to pass them or recalculate.
        // For this iteration, we'll rely on the cache.
        const tileCacheData = gameState.tileCache && gameState.tileCache.z === gameState.currentViewZ ? gameState.tileCache.data : null;
        if (!tileCacheData) return;

        // We can only add 'flashing' to spans that are actually rendered (i.e., in the viewport and thus in cache with a span)
        const cachedCell = tileCacheData[y]?.[x]; // Access cache with absolute coords
        if (cachedCell && cachedCell.span) {
            // Check if x,y is within the logical viewport (startCol etc. are not directly available here)
            // This check is implicitly handled by the fact that cachedCell.span would only exist if it was rendered.
            cachedCell.span.classList.add('flashing');
        }
        // The querySelector fallback is problematic for large maps if not viewport-scoped.
        // else {
        // const span = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
        // if (span) span.classList.add('flashing');
        // }
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
        // Implementation of Standing Logic as defined:
        // 1. Check for Blocking objects on the Middle Layer of the current Z.
        // 2. Check for Support:
        //    a. Floor on Bottom Layer of current Z.
        //    b. Solid Top Object on Middle Layer of Z-1.

        const mapData = this.getCurrentMapData();
        const tilesets = assetManagerInstance ? assetManagerInstance.tilesets : null;

        if (!mapData || !mapData.levels || !mapData.dimensions || !tilesets || x < 0 || y < 0 || y >= mapData.dimensions.height || x >= mapData.dimensions.width) {
            return false;
        }

        const zStr = z.toString();
        const currentLevelData = mapData.levels[zStr];

        // 1. Check for Blocking objects on Middle Layer (Current Z)
        if (currentLevelData) {
            const tileOnMiddleRaw = currentLevelData.middle?.[y]?.[x];
            const effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw?.tileId !== undefined) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;
            if (effectiveTileOnMiddle && tilesets[effectiveTileOnMiddle]) {
                const tileDefMiddle = tilesets[effectiveTileOnMiddle];
                if (tileDefMiddle.tags && tileDefMiddle.tags.includes("impassable")) {
                    return false; // Blocked by wall/object
                }
            }
        }

        // 2a. Check for Support: Floor on Bottom Layer (Current Z)
        if (currentLevelData) {
            const tileOnBottomRaw = currentLevelData.bottom?.[y]?.[x];
            const effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw?.tileId !== undefined) ? tileOnBottomRaw.tileId : tileOnBottomRaw;
            if (effectiveTileOnBottom && tilesets[effectiveTileOnBottom]) {
                const tileDefBottom = tilesets[effectiveTileOnBottom];
                if (tileDefBottom.tags && (tileDefBottom.tags.includes("floor") || tileDefBottom.tags.includes("z_transition"))) {
                    return true; // Supported by floor
                }
            }
        }

        // 2b. Check for Support: Solid Top Object on Middle Layer (Z-1)
        const zBelowStr = (z - 1).toString();
        const levelDataBelow = mapData.levels[zBelowStr];
        if (levelDataBelow) {
            // Strictly check ONLY the middle layer at Z-1 for solid_terrain_top, per game rules.
            const tileOnMiddleBelowRaw = levelDataBelow.middle?.[y]?.[x];
            const effMidBelow = (typeof tileOnMiddleBelowRaw === 'object' && tileOnMiddleBelowRaw?.tileId !== undefined) ? tileOnMiddleBelowRaw.tileId : tileOnMiddleBelowRaw;
            if (effMidBelow && tilesets[effMidBelow]?.tags?.includes('solid_terrain_top')) {
                return true; // Supported by solid top object below
            }
        }

        return false; // No support found
    },
    isTileEmpty: isTileEmpty,

    updateFOW_BFS: function (playerX, playerY, playerZ, visionRadius) {
        // Redirect to new updateFOW function
        this.updateFOW(playerX, playerY, playerZ, visionRadius);
    },

    updateFOW: function (playerX, playerY, playerZ, visionRadius, ignoreCap = false) {
        const originalLogic = (_playerX, _playerY, _playerZ, _visionRadius, _ignoreCap) => {
            const currentMap = this.getCurrentMapData();
            if (!currentMap || !currentMap.dimensions || !currentMap.levels) {
                logToConsole("updateFOW: No map data, cannot update FOW.", "warn");
                return;
            }

            const H = currentMap.dimensions.height;
            const W = currentMap.dimensions.width;
            const mapLevels = currentMap.levels;

            if (H <= 0 || W <= 0) return;

            // Ensure FOW data structure is ready for all relevant Z levels
            // For simplicity, we iterate all known map levels. In a huge streaming map, we'd only do near ones.
            Object.keys(mapLevels).forEach(zKey => {
                if (!gameState.fowData[zKey]) {
                    gameState.fowData[zKey] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                }
            });

            // Initialize fowCurrentlyVisible tracking if missing
            if (!gameState.fowData.fowCurrentlyVisible) {
                gameState.fowData.fowCurrentlyVisible = {};
            }

            // Mark all currently visible tiles as 'visited' before calculating new visibility
            Object.keys(gameState.fowData.fowCurrentlyVisible).forEach(zKey => {
                const visibleTiles = gameState.fowData.fowCurrentlyVisible[zKey];
                if (visibleTiles && visibleTiles.length > 0) {
                    const fowLayer = gameState.fowData[zKey];
                    if (fowLayer) {
                        visibleTiles.forEach(tile => {
                            if (fowLayer[tile.y] && fowLayer[tile.y][tile.x] === 'visible') {
                                fowLayer[tile.y][tile.x] = 'visited';
                            }
                        });
                    }
                }
                gameState.fowData.fowCurrentlyVisible[zKey] = [];
            });

            // Determine bounding box for visibility check
            // Performance Optimization: Cap effective vision radius to 60 tiles to prevent freezing on large maps with "Clear" weather (2000+ radius).
            // 60 tiles is sufficient for screen visibility.
            // Allow ignoring cap for benchmarks.
            const effectiveRadius = _ignoreCap ? _visionRadius : Math.min(_visionRadius, 60);

            // Use Symmetrical Shadowcasting for the player's Z level (Optimization A.2)
            if (window.Shadowcaster) {
                const fowLayer = gameState.fowData[_playerZ.toString()];
                if (fowLayer) {
                    // Callback to check blocking (on player Z)
                    // We use the same isTileBlockingVision logic but restricted to Z
                    const isBlocking = (x, y) => {
                        // Bounds check inside blocking check or caster? Caster does basic bounds?
                        // Caster expects valid coords? We should check bounds.
                        if (x < 0 || y < 0 || x >= W || y >= H) return true;
                        return this.isTileBlockingVision(x, y, _playerZ, _playerZ);
                    };

                    const setVisible = (x, y) => {
                        if (x >= 0 && y >= 0 && x < W && y < H) {
                            if (fowLayer[y][x] !== 'visible') {
                                fowLayer[y][x] = 'visible';
                                if (!gameState.fowData.fowCurrentlyVisible[_playerZ.toString()]) {
                                    gameState.fowData.fowCurrentlyVisible[_playerZ.toString()] = [];
                                }
                                gameState.fowData.fowCurrentlyVisible[_playerZ.toString()].push({ x: x, y: y });
                            }
                        }
                    };

                    window.Shadowcaster.compute(_playerX, _playerY, effectiveRadius, isBlocking, setVisible);
                }

                // Vertical Propagation (Optimization B)
                // For other Z levels, visibility is derived from the player's Z visibility.
                // We assume if (x,y) is visible on PlayerZ, we can check vertical line of sight for (x,y) on other Zs.
                // This avoids full raycasting for every tile on every Z.

                const visibleOnCurrentZ = gameState.fowData.fowCurrentlyVisible[_playerZ.toString()];
                if (visibleOnCurrentZ && visibleOnCurrentZ.length > 0) {
                    Object.keys(mapLevels).forEach(zKey => {
                        const z = parseInt(zKey);
                        if (z === _playerZ) return; // Already done

                        const fowLayerOther = gameState.fowData[zKey];
                        if (!fowLayerOther) return;

                        // We check vertical LOS for each visible tile on current Z
                        visibleOnCurrentZ.forEach(pt => {
                            const { x, y } = pt;
                            // Check if we can see from (x, y, playerZ) to (x, y, z)
                            // This is a strictly vertical check (or steep angle check for very close Zs, but mostly vertical)

                            // Simplified Vertical Check:
                            // Can we trace a line from PlayerPos to (x, y, z)?
                            // Or simpler: Can we see (x, y, z) *given* we can see (x, y, playerZ)?
                            // Yes, if the vertical column at (x, y) is open between playerZ and z.

                            // We use isTileVisible for this single vertical check?
                            // No, isTileVisible is a raycast from PlayerPos.
                            // Raycast from PlayerPos to (x, y, z).

                            // Wait, we replaced O(R^2) raycasts with Shadowcasting + Vertical Check.
                            // Raycasting to (x, y, z) is still a raycast.
                            // But we only do it for *visible tiles* on Planar view, not the whole box.
                            // And we can optimize it: We know the path to (x, y, playerZ) is clear.
                            // So we only need to check if the path deviates vertically?

                            // Actually, if we use standard raycasting for these tiles, it's:
                            // Count(VisibleTiles) * NumZLevels.
                            // For R=60, VisibleTiles ~ 3000-5000?
                            // Raycast is length ~30.
                            // 5000 * 30 * 3 = 450,000 checks. Still high?
                            // But Shadowcasting visited each tile ONCE (very fast).

                            // Let's use a cheaper approximation for Z != playerZ.
                            // "Onion Skinning" implies looking down.
                            // If I see (x, y) on Z, and Z is transparent floor/hole, I see (x, y) on Z-1.
                            // So:

                            let canSee = false;
                            if (z < _playerZ) {
                                // Looking down
                                // Check layers between z and playerZ at (x,y)
                                // If all are transparent/holes, then visible.
                                // Note: We already know (x,y) on playerZ is visible.

                                // We need to check blocking from playerZ down to z.
                                // But wait, the Ray from Player(0,0,0) to Target(10,10,-1) passes through (5,5,-0.5).
                                // It does NOT stay in the column (x,y).
                                // So strictly vertical check is wrong for perspective.

                                // However, for top-down tile games, "Onion Skin" usually means "Render what's below the visible floor".
                                // The Renderer *already* handles this by drawing lower levels under visible transparent tiles.
                                // It does NOT use fowData[z] for this.

                                // So: Do we NEED to populate fowData[z] for z != playerZ?
                                // Only if the user switches view to Z-1?
                                // Or if we need to see entities on Z-1.

                                // If we only need it for "Look Mode" or picking targets:
                                // We can just rely on the renderer's onion skinning for visual.
                                // And use on-demand raycasting for targeting.

                                // BUT, to keep existing behavior where switching Z shows FOW:
                                // We can perform the Raycast check only for visible tiles.
                                // It is expensive but much less than checking ALL tiles in bounding box (including hidden ones).

                                // Also, we can limit the Z check to +/- 2 levels or something reasonable.

                                if (Math.abs(z - _playerZ) <= 2) { // Optimization: Limit vertical FOW calculation depth
                                    if (this.isTileVisible(_playerX, _playerY, _playerZ, x, y, z, effectiveRadius)) {
                                        if (fowLayerOther[y][x] !== 'visible') {
                                            fowLayerOther[y][x] = 'visible';
                                            if (!gameState.fowData.fowCurrentlyVisible[zKey]) gameState.fowData.fowCurrentlyVisible[zKey] = [];
                                            gameState.fowData.fowCurrentlyVisible[zKey].push({ x, y });
                                        }
                                    }
                                }
                            } else {
                                // Looking up
                                // Similar logic.
                                if (Math.abs(z - _playerZ) <= 2) {
                                    if (this.isTileVisible(_playerX, _playerY, _playerZ, x, y, z, effectiveRadius)) {
                                        if (fowLayerOther[y][x] !== 'visible') {
                                            fowLayerOther[y][x] = 'visible';
                                            if (!gameState.fowData.fowCurrentlyVisible[zKey]) gameState.fowData.fowCurrentlyVisible[zKey] = [];
                                            gameState.fowData.fowCurrentlyVisible[zKey].push({ x, y });
                                        }
                                    }
                                }
                            }
                        });
                    });
                }

            } else {
                // Fallback to old slow method if Shadowcaster missing
                // We clamp to map dimensions.
                const minX = Math.max(0, Math.floor(_playerX - effectiveRadius));
                const maxX = Math.min(W - 1, Math.ceil(_playerX + effectiveRadius));
                const minY = Math.max(0, Math.floor(_playerY - effectiveRadius));
                const maxY = Math.min(H - 1, Math.ceil(_playerY + effectiveRadius));

                // Determine Z range. For now, let's assume we check all loaded Z levels.
                const zKeys = Object.keys(mapLevels).map(k => parseInt(k));

                // 3D Visibility Check
                // We check every tile in the bounding box on every Z level.
                zKeys.forEach(z => {
                    const fowLayer = gameState.fowData[z.toString()];
                    if (!fowLayer) return; // Should have been initialized above

                    for (let y = minY; y <= maxY; y++) {
                        for (let x = minX; x <= maxX; x++) {
                            // isTileVisible handles the distance check and line-of-sight check
                            // We pass effectiveRadius to ensure consistency with the bounding box
                            if (this.isTileVisible(_playerX, _playerY, _playerZ, x, y, z, effectiveRadius)) {
                                if (fowLayer[y][x] !== 'visible') {
                                    fowLayer[y][x] = 'visible';
                                    // Track newly visible tiles
                                    if (!gameState.fowData.fowCurrentlyVisible[z.toString()]) {
                                        gameState.fowData.fowCurrentlyVisible[z.toString()] = [];
                                    }
                                    gameState.fowData.fowCurrentlyVisible[z.toString()].push({ x: x, y: y });
                                }
                            }
                        }
                    }
                });
            }

            this.scheduleRender();
        };

        // Call profileFunction
        return profileFunction("mapRenderer.updateFOW", originalLogic.bind(this), playerX, playerY, playerZ, visionRadius, ignoreCap);
    }
};
