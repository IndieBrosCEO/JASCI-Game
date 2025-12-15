class SurroundingsUI {
    constructor() {
        this.container = document.getElementById('surroundingsGrid');
        this.cells = [];
        this.initializeGrid();
    }

    initializeGrid() {
        if (!this.container) return;

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
                topHalf.textContent = 'Mid';

                const bottomHalf = document.createElement('div');
                bottomHalf.style.flex = '1';
                bottomHalf.style.padding = '2px';
                bottomHalf.style.backgroundColor = '#2a1a1a'; // Dark reddish
                bottomHalf.style.color = '#888';
                bottomHalf.textContent = 'Bot';

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

        // Use mapRenderer's current map data to ensure we have the latest loaded map
        const mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;
        if (!mapData || !mapData.levels) return;

        const playerPos = window.gameState.player;
        const currentZ = (playerPos.z !== undefined && playerPos.z !== null) ? playerPos.z : 0;

        this.cells.forEach(cellInfo => {
            const targetX = playerPos.x + cellInfo.dx;
            const targetY = playerPos.y + cellInfo.dy;

            // Bounds check
            if (targetX < 0 || targetY < 0 || targetX >= mapData.dimensions.width || targetY >= mapData.dimensions.height) {
                 cellInfo.top.textContent = "Bound";
                 cellInfo.bottom.textContent = "Bound";
                 return;
            }

            // Highlight center cell (player)
            if (cellInfo.dx === 0 && cellInfo.dy === 0) {
                cellInfo.element.style.borderColor = '#ff0';
            } else {
                cellInfo.element.style.borderColor = '#333';
            }

            // Get Middle Layer info (z)
            // Objects, Walls, Entities
            let midText = "Empty";

            // Check for entities first (usually on top)
            let entityName = null;
            if (cellInfo.dx === 0 && cellInfo.dy === 0) {
                entityName = "You";
            } else {
                const npc = window.gameState.npcs ? window.gameState.npcs.find(n => n.mapPos && n.mapPos.x === targetX && n.mapPos.y === targetY && n.mapPos.z === currentZ) : null;
                if (npc) entityName = npc.name;
            }

            // Check map objects/walls
            let mapObject = null;
            const levelData = mapData.levels[currentZ.toString()];
            if (levelData && levelData.middle) {
                // Correct indexing: [y][x]
                const midTileRaw = levelData.middle[targetY]?.[targetX];

                // Extract tile ID whether it's a string or object
                const midTileId = (typeof midTileRaw === 'object' && midTileRaw !== null && midTileRaw.tileId !== undefined)
                                  ? midTileRaw.tileId
                                  : midTileRaw;

                if (midTileId && midTileId !== "") {
                    const tileDef = this.getTileDef(midTileId);
                    mapObject = tileDef ? tileDef.name : midTileId;
                }
            }

            if (entityName) {
                midText = entityName;
                if (mapObject) midText += ` on ${mapObject}`;
            } else if (mapObject) {
                midText = mapObject;
            }

            cellInfo.top.textContent = midText;
            cellInfo.top.title = midText; // Tooltip for full text

            // Get Bottom Layer info (z)
            let botText = "Void";
            if (levelData && levelData.bottom) {
                // Correct indexing: [y][x]
                const botTileRaw = levelData.bottom[targetY]?.[targetX];

                const botTileId = (typeof botTileRaw === 'object' && botTileRaw !== null && botTileRaw.tileId !== undefined)
                                  ? botTileRaw.tileId
                                  : botTileRaw;

                if (botTileId && botTileId !== "") {
                    const tileDef = this.getTileDef(botTileId);
                    botText = tileDef ? tileDef.name : botTileId;
                }
            }
            cellInfo.bottom.textContent = botText;
            cellInfo.bottom.title = botText;
        });
    }

    getTileDef(tileId) {
        if (!window.assetManager || !window.assetManager.tilesets) return null;
        // Direct lookup by ID
        return window.assetManager.tilesets[tileId] || null;
    }
}

window.SurroundingsUI = SurroundingsUI;
