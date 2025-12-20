class SurroundingsUI {
    constructor() {
        this.container = document.getElementById('surroundingsGrid');
        this.cells = [];
        this.initializeGrid();
    }

    initializeGrid() {
        if (!this.container) return;

        // Ensure the container is visible if it was hidden
        if (this.container.classList.contains('hidden')) {
            this.container.classList.remove('hidden');
        }

        this.container.innerHTML = '';
        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = 'repeat(3, 1fr)';
        // Allow rows to size to content, but use minmax to ensure even distribution if empty
        this.container.style.gridTemplateRows = 'repeat(3, minmax(60px, auto))';
        this.container.style.gap = '2px';
        this.container.style.marginTop = '10px';
        this.container.style.border = '1px solid #444';
        this.container.style.padding = '2px';
        this.container.style.backgroundColor = '#111';

        for (let y = -1; y <= 1; y++) {
            for (let x = -1; x <= 1; x++) {
                const cell = document.createElement('div');
                cell.style.border = '1px solid #333';
                cell.style.display = 'flex';
                cell.style.flexDirection = 'column';
                cell.style.minHeight = '60px';
                cell.style.fontSize = '0.8em';
                cell.style.overflow = 'hidden'; // Or 'auto' if scrolling preferred, but 'hidden' keeps grid tidy
                cell.style.padding = '2px';

                this.container.appendChild(cell);

                // Store relative coordinates to player and DOM element
                this.cells.push({ dx: x, dy: y, element: cell });
            }
        }
    }

    update() {
        if (!window.gameState || !window.gameState.player) return;
        if (!this.container) return;

         // Ensure the container is visible if it was hidden
        if (this.container.classList.contains('hidden')) {
            this.container.classList.remove('hidden');
        }

        // Use mapRenderer's current map data to ensure we have the latest loaded map
        const mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;
        if (!mapData || !mapData.levels) return;

        const playerPos = window.gameState.player;
        const currentZ = (playerPos.z !== undefined && playerPos.z !== null) ? playerPos.z : 0;
        const levelData = mapData.levels[currentZ.toString()];

        // Prepare Z-1 data for "Standing on Top" checks
        const zBelowStr = (currentZ - 1).toString();
        const levelDataBelow = mapData.levels[zBelowStr];

        this.cells.forEach(cellInfo => {
            const targetX = playerPos.x + cellInfo.dx;
            const targetY = playerPos.y + cellInfo.dy;
            const cell = cellInfo.element;

            // Clear previous content
            cell.innerHTML = '';

            // Bounds check
            if (targetX < 0 || targetY < 0 || targetX >= mapData.dimensions.width || targetY >= mapData.dimensions.height) {
                 cell.innerHTML = '<div style="color: #555;">Bound</div>';
                 return;
            }

            // Highlight center cell (player)
            if (cellInfo.dx === 0 && cellInfo.dy === 0) {
                cell.style.borderColor = '#ff0';
            } else {
                cell.style.borderColor = '#333';
            }

            const contents = [];

            // --- 1. Entities ---

            // Player
            if (targetX === playerPos.x && targetY === playerPos.y && currentZ === currentZ) {
                contents.push({ sprite: '☻', color: 'green', name: 'You' });
            }

            // NPCs
            if (window.gameState.npcs) {
                window.gameState.npcs.forEach(npc => {
                    if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === currentZ) {
                        contents.push({
                            sprite: npc.sprite || '?',
                            color: npc.color || 'red',
                            name: npc.name || 'NPC'
                        });
                    }
                });
            }

            // Vehicles
            if (window.gameState.vehicles) {
                window.gameState.vehicles.forEach(vehicle => {
                    if (vehicle.mapPos && vehicle.mapPos.x === targetX && vehicle.mapPos.y === targetY && vehicle.mapPos.z === currentZ) {
                         let vehicleSprite = '?';
                         let vehicleColor = 'grey';
                         let vehicleName = 'Vehicle';
                         if (window.vehicleManager) {
                            const template = window.vehicleManager.vehicleTemplates[vehicle.templateId];
                            if (template) {
                                vehicleSprite = template.sprite || vehicleSprite;
                                vehicleName = template.name || vehicleName;
                            } else {
                                const chassisDef = window.vehicleManager.vehicleParts[vehicle.chassis];
                                if (chassisDef) {
                                    vehicleSprite = chassisDef.sprite || vehicleSprite;
                                    vehicleName = chassisDef.name || vehicleName;
                                }
                            }
                         }
                         contents.push({ sprite: vehicleSprite, color: vehicleColor, name: vehicleName });
                    }
                });
            }

            // --- 2. Dynamic Items ---
            if (window.gameState.floorItems) {
                window.gameState.floorItems.forEach(item => {
                    if (item.x === targetX && item.y === targetY && item.z === currentZ) {
                         let sprite = '?';
                         let color = '#ccc';
                         let name = item.name || 'Item';

                         const itemDef = this.getTileDef(item.id) || (window.assetManager && window.assetManager.getItem ? window.assetManager.getItem(item.id) : null);
                         if (itemDef) {
                            sprite = itemDef.sprite || sprite;
                            color = itemDef.color || color;
                            name = itemDef.name || name;
                         }
                         contents.push({ sprite, color, name });
                    }
                });
            }

            // --- 3. Middle Layer (Objects / Deep Water) ---

            // Deep Water (Priority Object)
            let isDeepWater = false;
            if (window.waterManager) {
                const water = window.waterManager.getWaterAt(targetX, targetY, currentZ);
                if (water && water.depth >= 2) {
                     const wdDef = this.getTileDef('WD');
                     contents.push({
                         sprite: wdDef ? wdDef.sprite : '~',
                         color: wdDef ? wdDef.color : '#00008b',
                         name: wdDef ? wdDef.name : 'Deep Water'
                     });
                     isDeepWater = true;
                }
            }

            if (!isDeepWater && levelData) {
                const getTileIdFromLayer = (layerName) => {
                     if (!levelData[layerName]) return null;
                     const raw = levelData[layerName][targetY]?.[targetX];
                     return (typeof raw === 'object' && raw !== null && raw.tileId !== undefined) ? raw.tileId : raw;
                };

                const midTileId = getTileIdFromLayer('middle') || getTileIdFromLayer('item') || getTileIdFromLayer('building');

                if (midTileId && midTileId !== "") {
                    const tileDef = this.getTileDef(midTileId);
                    contents.push({
                        sprite: tileDef ? (tileDef.sprite || midTileId[0]) : (midTileId[0] || '?'),
                        color: tileDef ? (tileDef.color || '#ccc') : '#ccc',
                        name: tileDef ? (tileDef.name || midTileId) : (midTileId || 'Unknown')
                    });
                }
            }

            // --- 4. Bottom Layer (Floor / Shallow Water / Support) ---

            let foundBottom = false;

            // Shallow Water
            if (window.waterManager) {
                const water = window.waterManager.getWaterAt(targetX, targetY, currentZ);
                if (water && water.depth === 1) {
                     const wsDef = this.getTileDef('WS');
                     contents.push({
                         sprite: wsDef ? wsDef.sprite : '~',
                         color: wsDef ? wsDef.color : '#1E90FF',
                         name: wsDef ? wsDef.name : 'Shallow Water'
                     });
                     foundBottom = true;
                }
            }

            if (!foundBottom && levelData) {
                 const getTileIdFromLayer = (layerName) => {
                     if (!levelData[layerName]) return null;
                     const raw = levelData[layerName][targetY]?.[targetX];
                     return (typeof raw === 'object' && raw !== null && raw.tileId !== undefined) ? raw.tileId : raw;
                 };

                 const botTileId = getTileIdFromLayer('bottom') || getTileIdFromLayer('landscape');

                if (botTileId && botTileId !== "") {
                    const tileDef = this.getTileDef(botTileId);
                    contents.push({
                        sprite: tileDef ? (tileDef.sprite || botTileId[0]) : (botTileId[0] || '?'),
                        color: tileDef ? (tileDef.color || '#888') : '#888',
                        name: tileDef ? (tileDef.name || botTileId) : (botTileId || 'Unknown')
                    });
                    foundBottom = true;
                }
            }

            // Z-1 Fallback
            if (!foundBottom && levelDataBelow) {
                const getTileIdFromLayerBelow = (layerName) => {
                     if (!levelDataBelow[layerName]) return null;
                     const raw = levelDataBelow[layerName][targetY]?.[targetX];
                     return (typeof raw === 'object' && raw !== null && raw.tileId !== undefined) ? raw.tileId : raw;
                };

                const midBelowId = getTileIdFromLayerBelow('middle') || getTileIdFromLayerBelow('building');

                if (midBelowId && midBelowId !== "") {
                    const tileDefBelow = this.getTileDef(midBelowId);
                    if (tileDefBelow && tileDefBelow.tags && tileDefBelow.tags.includes('solid_terrain_top')) {
                        contents.push({
                            sprite: tileDefBelow.sprite || midBelowId[0],
                            color: tileDefBelow.color || '#888',
                            name: tileDefBelow.name || midBelowId
                        });
                        foundBottom = true;
                    }
                }
            }

            if (!foundBottom) {
                 contents.push({ sprite: '.', color: '#333', name: 'Void' });
            }

            // Render Rows
            if (contents.length === 0) {
                 cell.innerHTML = '<div style="color: #555;">Empty</div>';
            } else {
                contents.forEach(item => {
                    const row = document.createElement('div');
                    // Style row (compact)
                    row.style.whiteSpace = 'nowrap';
                    row.style.overflow = 'hidden';
                    row.style.textOverflow = 'ellipsis';
                    row.innerHTML = `<span style="color: ${item.color}; font-family: 'DwarfFortress', monospace;">${item.sprite}</span>:${item.name}`;
                    cell.appendChild(row);
                });
            }
        });
    }

    getTileDef(tileId) {
        if (!window.assetManager || !window.assetManager.tilesets) return null;
        // Direct lookup by ID
        return window.assetManager.tilesets[tileId] || null;
    }
}

window.SurroundingsUI = SurroundingsUI;
