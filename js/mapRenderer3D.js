
window.mapRenderer3D = {
    isEnabled: false,
    tileWidth: 12,
    tileHeight: 12, // Reduced to flatten the isometric view slightly
    zStep: 12, // Height of a Z-level

    // Cache for 3D spans to avoid recreating DOM elements constantly
    // Structure: { "z,y,x": { span: HTMLElement, sprite: string, color: string, left: number, top: number } }
    tile3DCache: {},

    toggle: function() {
        this.isEnabled = !this.isEnabled;
        console.log("3D View toggled: " + (this.isEnabled ? "ON" : "OFF"));

        const container = document.getElementById("mapContainer");
        if (container) {
            container.innerHTML = ""; // Clear current view

            // Reset scroll to center for 3D view initially
            if (this.isEnabled) {
               container.style.overflow = "hidden"; // We will handle "scroll" via offsetting absolute positions
               // Or we can keep overflow: auto if we size the inner container huge.
               // Let's try utilizing the existing overflow:auto but make the content huge.
               // Actually, absolute positioning relative to container works best if container has overflow: auto
               // and we place elements at positive coords.
               // But isometric coords can be negative relative to center.
               // Let's stick to simple centering on player for now.
            } else {
               container.style.overflow = "auto";
               // Clear 3D cache when switching back to 2D to save memory?
               // Maybe keep it if user switches back and forth.
               window.gameState.tileCache = null; // Force 2D refresh
            }
        }

        window.mapRenderer.scheduleRender();
    },

    render: function() {
        const container = document.getElementById("mapContainer");
        if (!container) return;

        // Ensure container is relative for absolute children
        if (container.style.position !== 'relative') {
            container.style.position = 'relative';
        }

        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData) return;

        // Measure char size if not done
        if (!this.charSizeMeasured) {
            const tempSpan = document.createElement('span');
            tempSpan.style.fontFamily = getComputedStyle(container).fontFamily;
            tempSpan.style.fontSize = getComputedStyle(container).fontSize;
            tempSpan.style.visibility = 'hidden';
            tempSpan.textContent = '@';
            document.body.appendChild(tempSpan);
            this.tileWidth = tempSpan.offsetWidth; // e.g. 8px
            this.tileHeight = tempSpan.offsetHeight; // e.g. 16px
            document.body.removeChild(tempSpan);

            // Adjust isometric steps based on char size
            // Iso grid: 2:1 ratio usually looks good.
            // Step X: width
            // Step Y: height / 2
            this.isoStepX = this.tileWidth;
            this.isoStepY = this.tileHeight * 0.6;
            this.zStep = this.tileHeight * 0.8;

            this.charSizeMeasured = true;
        }

        // Camera / Center Logic
        // We want the player (or target) to be in the center of the viewport
        const viewWidth = container.clientWidth;
        const viewHeight = container.clientHeight;

        let centerX = viewWidth / 2;
        let centerY = viewHeight / 2;

        let camX = 0;
        let camY = 0;
        let camZ = 0;

        if (window.gameState.playerPos) {
            camX = window.gameState.playerPos.x;
            camY = window.gameState.playerPos.y;
            camZ = window.gameState.playerPos.z;
        }

        // If "viewing" a different Z level via existing controls, we should respect that
        // But in 3D, we usually see multiple Z levels.
        // Let's focus on the player's Z but show +/- range.
        // Or respect gameState.currentViewZ as the "focus" plane.
        const focusZ = window.gameState.currentViewZ;

        // Render Range
        // We can't render infinite map.
        const range = 20; // Radius in tiles
        const minX = Math.max(0, camX - range);
        const maxX = Math.min(mapData.dimensions.width - 1, camX + range);
        const minY = Math.max(0, camY - range);
        const maxY = Math.min(mapData.dimensions.height - 1, camY + range);

        const minZ = Math.max(0, focusZ - 5);
        const maxZ = Math.min(Object.keys(mapData.levels).length - 1, focusZ + 5);

        // Clear container?
        // If we clear every frame, it's slow. We should pool/reuse.
        // But for now, let's clear to get it working, then optimize.
        // container.innerHTML = "";
        // Actually, let's just use a fragment and replace content for now.
        // Ideally we should diff, but "3D" elements move around if camera moves.
        // If camera moves, everything shifts.

        // Let's simply clear for the MVP.
        container.innerHTML = "";

        const fragment = document.createDocumentFragment();

        // Render Loop
        // Order: Z (bottom to top), then Y/X (back to front)
        // Iso Back-to-Front:
        // x=0,y=0 is top.
        // increasing x goes right-down.
        // increasing y goes left-down.
        // To draw back to front:
        // We want small x+y to be drawn first?
        // (0,0) is furthest back?
        // Yes, (0,0) is top of screen. Objects at (10,10) are lower down.
        // So iterate x, y normally?
        // Yes, painter's algo for isometric is usually just Z then Y then X.

        for (let z = minZ; z <= maxZ; z++) {
            const zStr = z.toString();
            const levelData = mapData.levels[zStr];
            if (!levelData) continue;

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {

                    // Logic to determine what to draw (similar to 2D renderMapLayers)
                    // We need to resolve the top-most visible thing for this x,y,z

                    let sprite = null;
                    let color = null;
                    let isWall = false;

                    // 1. Check Entity (Player/NPC/Vehicle)
                    // Entities sit "on top" of the tile, effectively z + 0.5 visually?
                    // We will handle them after the tile logic.

                    // 2. Map Tile Logic (Middle then Bottom)
                    // Similar to renderMapLayers
                    let finalTileId = null;
                    if (levelData.building?.[y]?.[x]) finalTileId = levelData.building[y][x];
                    else if (levelData.item?.[y]?.[x]) finalTileId = levelData.item[y][x];
                    else if (levelData.middle?.[y]?.[x]) {
                         const raw = levelData.middle[y][x];
                         finalTileId = (typeof raw === 'object' && raw.tileId) ? raw.tileId : raw;
                    }

                    let tileDef = null;
                    // Fix: Access tilesets via window.assetManager if window.assetManagerInstance is not defined
                    const tilesets = (window.assetManager && window.assetManager.tilesets) ? window.assetManager.tilesets : (window.assetManagerInstance ? window.assetManagerInstance.tilesets : null);

                    if (tilesets) {
                        tileDef = tilesets[finalTileId];
                    }

                    // If no middle object, check bottom (floor)
                    if (!tileDef && tilesets) {
                        let bottomId = levelData.bottom?.[y]?.[x];
                        bottomId = (typeof bottomId === 'object' && bottomId.tileId) ? bottomId.tileId : bottomId;
                        tileDef = tilesets[bottomId];
                    }

                    if (tileDef) {
                        sprite = tileDef.sprite;
                        color = tileDef.color;

                        // Simple depth cues
                        if (z < focusZ) {
                            color = window.mapRenderer.darkenColor(color, 0.5);
                        } else if (z > focusZ) {
                             // Transparent look for things above?
                             // Or just draw them.
                        }
                    }

                    // FOW Logic
                    // We need to check visibility.
                    // Assuming FOW is computed for the player's Z level or all levels.
                    // We can reuse gameState.fowData
                    let fowStatus = 'hidden';
                    if (window.gameState.fowData[zStr] && window.gameState.fowData[zStr][y]) {
                         fowStatus = window.gameState.fowData[zStr][y][x];
                    }

                    // Special case: If we are looking at focusZ, use its FOW.
                    // If looking at Z != focusZ, we might not have updated FOW.
                    // For now, respect what's there.

                    if (fowStatus === 'hidden') {
                        continue; // Don't draw hidden tiles in 3D? Or draw generic block?
                        // Drawing nothing is best for "unknown".
                    } else if (fowStatus === 'visited') {
                        color = window.mapRenderer.darkenColor(color, 0.7);
                    }

                    if (sprite) {
                        this.drawTile(fragment, x, y, z, sprite, color, centerX, centerY, camX, camY, focusZ);
                    }

                    // 3. Entity Logic
                    // Check for entities at this x,y,z
                    // Player
                    if (window.gameState.playerPos.x === x && window.gameState.playerPos.y === y && window.gameState.playerPos.z === z) {
                         this.drawTile(fragment, x, y, z, "☻", "green", centerX, centerY, camX, camY, focusZ, true);
                    }

                    // NPCs
                    // (Optimization: iterate NPCs outside and match? Or filter here?
                    // Since we loop x,y,z, better to have a lookup or just filter small npc list)
                    const npc = window.gameState.npcs.find(n => n.mapPos.x === x && n.mapPos.y === y && n.mapPos.z === z);
                    if (npc && (fowStatus === 'visible' || fowStatus === 'visited')) {
                         this.drawTile(fragment, x, y, z, npc.sprite, npc.color, centerX, centerY, camX, camY, focusZ, true);
                    }

                }
            }
        }

        container.appendChild(fragment);
    },

    drawTile: function(container, x, y, z, sprite, color, centerX, centerY, camX, camY, focusZ, isEntity = false) {
        const span = document.createElement('span');
        span.textContent = sprite;
        span.style.color = color;
        span.style.position = 'absolute';
        span.className = 'tile3d'; // Hook for CSS if needed

        // Calculate Screen Position
        // Rel to Camera
        const dx = x - camX;
        const dy = y - camY;
        const dz = z - focusZ; // relative to focus plane

        // Isometric Projection
        // x goes Right-Down
        // y goes Left-Down
        // z goes Up

        // Iso transformation
        // screenX = (x - y) * stepX
        // screenY = (x + y) * stepY - z * stepZ

        const screenX = (dx - dy) * this.isoStepX + centerX;
        const screenY = (dx + dy) * this.isoStepY - (dz * this.zStep) + centerY;

        // Centering adjustment: The "center" of the char should be at screenX, screenY
        span.style.left = Math.floor(screenX) + 'px';
        span.style.top = Math.floor(screenY) + 'px';
        span.style.zIndex = (z * 1000) + (x + y) + (isEntity ? 1 : 0); // Simple Z-index sort

        // Optional: Add "height" shadow or block effect
        // If it's a solid block, maybe draw a "side" character below it?

        container.appendChild(span);
    }
};
