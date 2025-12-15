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

        const playerPos = window.gameState.player;
        const mapData = window.mapData; // Assuming this is global as per memory/mapRenderer usage

        this.cells.forEach(cellInfo => {
            const targetX = playerPos.x + cellInfo.dx;
            const targetY = playerPos.y + cellInfo.dy;
            const z = playerPos.z;

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
            // Simplified entity check - ideally utilize mapUtils or similar if available,
            // but for now checking gameState.npcs and player.
            let entityName = null;
            if (cellInfo.dx === 0 && cellInfo.dy === 0) {
                entityName = "You";
            } else {
                const npc = window.gameState.npcs.find(n => n.x === targetX && n.y === targetY && n.z === z);
                if (npc) entityName = npc.name;
            }

            // Check map objects/walls
            let mapObject = null;
            const levelData = mapData?.levels?.[z];
            if (levelData) {
                const midTile = levelData.middle?.[`${targetX},${targetY}`];
                if (midTile) {
                    // Try to resolve tile name from tileset if possible, or use char
                    // window.assetManager.tilesets might have definitions.
                    // But usually mapData stores chars.
                    // We need to look up definition.
                    const tileDef = this.getTileDef(midTile.char);
                    mapObject = tileDef ? tileDef.name : midTile.char;
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

            // Get Bottom Layer info (z) - Actually standing logic says support comes from bottom(z) OR middle(z-1)
            // But prompt says "bottom half describing what is on the bottom layer".
            // So we strictly show bottom layer at current Z.
            let botText = "Void";
            if (levelData) {
                const botTile = levelData.bottom?.[`${targetX},${targetY}`];
                if (botTile) {
                    const tileDef = this.getTileDef(botTile.char);
                    botText = tileDef ? tileDef.name : botTile.char;
                }
            }
            cellInfo.bottom.textContent = botText;
            cellInfo.bottom.title = botText;
        });
    }

    getTileDef(char) {
        if (!window.assetManager || !window.assetManager.tilesets) return null;
        // Tileset is array of tile definitions. We need to find one matching the char.
        // Assuming 'biome_0' or 'dungeon_0' or similar is loaded.
        // Actually assetManager.tilesets is an object where keys are names?
        // Let's check how mapRenderer does it.

        // mapRenderer uses this.tilesets which comes from assetManager.tilesets.
        // It seems to iterate or lookup.
        // Let's iterate all tilesets to find the char.
        for (const tilesetName in window.assetManager.tilesets) {
            const tileset = window.assetManager.tilesets[tilesetName];
             // tileset is likely an array of objects
             if (Array.isArray(tileset)) {
                 const found = tileset.find(t => t.char === char);
                 if (found) return found;
             }
        }
        return null;
    }
}

window.SurroundingsUI = SurroundingsUI;
