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
        this.container.style.gridTemplateRows = 'repeat(3, 1fr)';
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
                cell.style.height = '60px'; // Approx height
                cell.style.fontSize = '0.8em';
                cell.style.overflow = 'hidden';

                const topHalf = document.createElement('div');
                topHalf.style.flex = '1';
                topHalf.style.borderBottom = '1px dashed #333';
                topHalf.style.padding = '2px';
                topHalf.style.backgroundColor = '#1a1a2a'; // Dark blueish
                topHalf.style.color = '#ccc';
                // topHalf.innerHTML will be set in update()

                const bottomHalf = document.createElement('div');
                bottomHalf.style.flex = '1';
                bottomHalf.style.padding = '2px';
                bottomHalf.style.backgroundColor = '#2a1a1a'; // Dark reddish
                bottomHalf.style.color = '#888';
                // bottomHalf.innerHTML will be set in update()

                cell.appendChild(topHalf);
                cell.appendChild(bottomHalf);
                this.container.appendChild(cell);

                // Store relative coordinates to player and DOM elements
                this.cells.push({ dx: x, dy: y, top: topHalf, bottom: bottomHalf, element: cell });
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

        this.cells.forEach(cellInfo => {
            const targetX = playerPos.x + cellInfo.dx;
            const targetY = playerPos.y + cellInfo.dy;

            // Bounds check
            if (targetX < 0 || targetY < 0 || targetX >= mapData.dimensions.width || targetY >= mapData.dimensions.height) {
                 cellInfo.top.innerHTML = "Bound";
                 cellInfo.bottom.innerHTML = "Bound";
                 return;
            }

            // Highlight center cell (player)
            if (cellInfo.dx === 0 && cellInfo.dy === 0) {
                cellInfo.element.style.borderColor = '#ff0';
            } else {
                cellInfo.element.style.borderColor = '#333';
            }

            // --- Middle Layer ---
            let midSprite = '&nbsp;';
            let midColor = '#ccc';
            let midName = 'Empty';
            let hasMidContent = false;

            // 1. Entities (Player, NPC)
            // Priority: Player > NPC > Tile
            if (cellInfo.dx === 0 && cellInfo.dy === 0) {
                // Determine Player Sprite and Color if possible, otherwise default
                midSprite = '☻';
                midColor = 'green'; // Default player color
                midName = 'You';
                hasMidContent = true;
            } else {
                const npc = window.gameState.npcs ? window.gameState.npcs.find(n => n.mapPos && n.mapPos.x === targetX && n.mapPos.y === targetY && n.mapPos.z === currentZ) : null;
                if (npc) {
                    midSprite = npc.sprite || '?';
                    midColor = npc.color || 'red';
                    midName = npc.name || 'NPC';
                    hasMidContent = true;
                }
            }

            // 2. Middle Map Object (if no entity found yet)
            // If an entity is present, we prioritize showing the entity as the "content" of the cell's middle layer space.
            if (!hasMidContent && levelData && levelData.middle) {
                const midTileRaw = levelData.middle[targetY]?.[targetX];
                const midTileId = (typeof midTileRaw === 'object' && midTileRaw !== null && midTileRaw.tileId !== undefined)
                    ? midTileRaw.tileId
                    : midTileRaw;

                if (midTileId && midTileId !== "") {
                    const tileDef = this.getTileDef(midTileId);
                    if (tileDef) {
                        midSprite = tileDef.sprite || midTileId[0];
                        midColor = tileDef.color || '#ccc';
                        midName = tileDef.name || midTileId;
                        hasMidContent = true;
                    } else {
                         // Fallback if definition missing but ID present
                        midSprite = (midTileId && midTileId.length > 0) ? midTileId[0] : '?';
                        midColor = '#ccc';
                        midName = midTileId || 'Unknown';
                        hasMidContent = true;
                    }
                }
            }

            // Format HTML for Middle
             if (hasMidContent) {
                 cellInfo.top.innerHTML = `<span style="color: ${midColor}; font-family: 'DwarfFortress', monospace;">${midSprite}</span>:${midName}`;
             } else {
                 // Empty Middle Layer
                 cellInfo.top.innerHTML = `<span style="color: #333; font-family: 'DwarfFortress', monospace;">.</span>:Empty`;
             }


            // --- Bottom Layer ---
            let botSprite = '&nbsp;';
            let botColor = '#888';
            let botName = 'Void';
            let hasBotContent = false;

            if (levelData && levelData.bottom) {
                const botTileRaw = levelData.bottom[targetY]?.[targetX];
                const botTileId = (typeof botTileRaw === 'object' && botTileRaw !== null && botTileRaw.tileId !== undefined)
                    ? botTileRaw.tileId
                    : botTileRaw;

                if (botTileId && botTileId !== "") {
                    const tileDef = this.getTileDef(botTileId);
                    if (tileDef) {
                        botSprite = tileDef.sprite || botTileId[0];
                        botColor = tileDef.color || '#888';
                        botName = tileDef.name || botTileId;
                        hasBotContent = true;
                    } else {
                        botSprite = (botTileId && botTileId.length > 0) ? botTileId[0] : '?';
                        botColor = '#888';
                        botName = botTileId || 'Unknown';
                        hasBotContent = true;
                    }
                }
            }

            // Format HTML for Bottom
            if (hasBotContent) {
                cellInfo.bottom.innerHTML = `<span style="color: ${botColor}; font-family: 'DwarfFortress', monospace;">${botSprite}</span>:${botName}`;
            } else {
                cellInfo.bottom.innerHTML = `<span style="color: #333; font-family: 'DwarfFortress', monospace;">.</span>:Void`;
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
