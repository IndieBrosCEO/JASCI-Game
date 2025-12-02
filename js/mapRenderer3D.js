
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

        // Determine available Z levels from map data
        const availableZLevels = Object.keys(mapData.levels).map(k => parseInt(k, 10)).sort((a, b) => a - b);
        if (availableZLevels.length === 0) return;

        const mapMinZ = availableZLevels[0];
        const mapMaxZ = availableZLevels[availableZLevels.length - 1];

        // Determine render range centered on focusZ, but constrained by map bounds if desired (or just render valid levels)
        const renderRadiusZ = 5;
        const minZ = Math.max(mapMinZ, focusZ - renderRadiusZ);
        const maxZ = Math.min(mapMaxZ, focusZ + renderRadiusZ);

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

        // Helper to check FOW
        const getFowStatus = (x, y, zStr) => {
            if (window.gameState.fowData[zStr] && window.gameState.fowData[zStr][y]) {
                return window.gameState.fowData[zStr][y][x];
            }
            return 'hidden';
        };

        // Access tilesets
        const tilesets = (window.assetManager && window.assetManager.tilesets) ? window.assetManager.tilesets : (window.assetManagerInstance ? window.assetManagerInstance.tilesets : null);

        for (let z = minZ; z <= maxZ; z++) {
            const zStr = z.toString();
            const levelData = mapData.levels[zStr];
            if (!levelData) continue;

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {

                    const fowStatus = getFowStatus(x, y, zStr);
                    if (fowStatus === 'hidden') continue;

                    // --- DRAW BOTTOM LAYER ---
                    let bottomId = levelData.bottom?.[y]?.[x];
                    bottomId = (typeof bottomId === 'object' && bottomId.tileId) ? bottomId.tileId : bottomId;

                    if (bottomId && tilesets && tilesets[bottomId]) {
                        const tileDef = tilesets[bottomId];
                        let color = tileDef.color;
                        if (fowStatus === 'visited') color = window.mapRenderer.darkenColor(color, 0.7);
                        if (z < focusZ) color = window.mapRenderer.darkenColor(color, 0.5);

                        this.drawTile(fragment, x, y, z, tileDef.sprite, color, centerX, centerY, camX, camY, focusZ, false, 0); // Layer 0
                    }

                    // --- DRAW MIDDLE LAYER ---
                    let middleId = null;
                    // Check specific layers if they exist in levelData (building, item), otherwise fall back to 'middle' property
                    if (levelData.building?.[y]?.[x]) middleId = levelData.building[y][x];
                    else if (levelData.item?.[y]?.[x]) middleId = levelData.item[y][x];
                    else if (levelData.middle?.[y]?.[x]) {
                         const raw = levelData.middle[y][x];
                         middleId = (typeof raw === 'object' && raw.tileId) ? raw.tileId : raw;
                    }

                    if (middleId && tilesets && tilesets[middleId]) {
                        const tileDef = tilesets[middleId];
                        let color = tileDef.color;
                        if (fowStatus === 'visited') color = window.mapRenderer.darkenColor(color, 0.7);
                        if (z < focusZ) color = window.mapRenderer.darkenColor(color, 0.5);

                        this.drawTile(fragment, x, y, z, tileDef.sprite, color, centerX, centerY, camX, camY, focusZ, false, 1); // Layer 1
                    }

                    // --- DRAW ENTITIES ---
                    // Only if visible (usually entities are not shown in FOW 'visited' unless memory/static, but standard behavior is usually hidden)
                    // If FOW is visited, we usually don't draw dynamic entities.
                    if (fowStatus === 'visible') {
                        // Player
                        if (window.gameState.playerPos.x === x && window.gameState.playerPos.y === y && window.gameState.playerPos.z === z) {
                             this.drawTile(fragment, x, y, z, "☻", "green", centerX, centerY, camX, camY, focusZ, true, 2); // Layer 2
                        }

                        // NPCs
                        const npc = window.gameState.npcs.find(n => n.mapPos.x === x && n.mapPos.y === y && n.mapPos.z === z);
                        if (npc) {
                             this.drawTile(fragment, x, y, z, npc.sprite, npc.color, centerX, centerY, camX, camY, focusZ, true, 2); // Layer 2
                        }

                        // Vehicles
                        if (window.gameState.vehicles) {
                            const vehicle = window.gameState.vehicles.find(v => v.mapPos.x === x && v.mapPos.y === y && v.mapPos.z === z);
                            if (vehicle) {
                                // Get vehicle sprite
                                let vSprite = "V";
                                let vColor = "white";
                                if (window.vehicleManager) {
                                    const template = window.vehicleManager.vehicleTemplates[vehicle.templateId];
                                    if (template) { vSprite = template.sprite; vColor = "grey"; } // Default or template color
                                }
                                this.drawTile(fragment, x, y, z, vSprite, vColor, centerX, centerY, camX, camY, focusZ, true, 2);
                            }
                        }
                    }
                }
            }
        }

        container.appendChild(fragment);
    },

    drawTile: function(container, x, y, z, sprite, color, centerX, centerY, camX, camY, focusZ, isEntity = false, layerOffset = 0) {
        const span = document.createElement('span');
        span.textContent = sprite;
        span.style.color = color;
        span.style.position = 'absolute';
        span.className = 'tile3d';

        // Calculate Screen Position
        const dx = x - camX;
        const dy = y - camY;
        const dz = z - focusZ;

        // Isometric Projection
        const screenX = (dx - dy) * this.isoStepX + centerX;
        const screenY = (dx + dy) * this.isoStepY - (dz * this.zStep) + centerY;

        span.style.left = Math.floor(screenX) + 'px';
        span.style.top = Math.floor(screenY) + 'px';

        // Z-Index Sorting:
        // 1. Z-level (Higher Z is on top)
        // 2. Y-coordinate (Lower Y is further back, Higher Y is closer) -> Wait, in iso:
        //    (0,0) is top. Increasing Y moves down-left. Increasing X moves down-right.
        //    Painter's algo: Draw back to front.
        //    Back is small X, small Y. Front is large X, large Y.
        //    So we draw X=0,Y=0 first. X=10,Y=10 last.
        //    We want X+Y to determine draw order within a Z-plane.
        // 3. Layer within cell (Bottom < Middle < Entity)

        // zIndex calculation:
        // base = z * 10000 (assuming map width+height < 10000)
        // plane = (x + y) * 10
        // layer = layerOffset (0, 1, 2)

        // Note: z can be negative. zIndex accepts negative.
        // To keep things clean, maybe offset Z by +100 to ensure positive if needed, but not strictly required.

        span.style.zIndex = (z * 10000) + ((x + y) * 10) + layerOffset;

        container.appendChild(span);
    }
};
