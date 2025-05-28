// js/mapRenderer.js
let currentMapData = null;
let assetManagerInstance = null;

// Exporting functions for use in other modules
window.mapRenderer = {
    initMapRenderer: function (assetMgr) {
        assetManagerInstance = assetMgr;
    },

    initializeCurrentMap: function (mapData) {
        currentMapData = mapData;
        // Note: gameState.layers and gameState.playerPos are updated in script.js
        // after this function is called and mapData is returned by handleMapSelectionChange.
    },

    getCurrentMapData: function () {
        return currentMapData;
    },

    handleMapSelectionChange: async function (mapId) { // This function will be called from script.js
        if (!mapId || !assetManagerInstance) {
            console.warn("Map selection change triggered with invalid mapId or missing assetManagerInstance.");
            return null; // Return null to indicate failure or inability to load
        }
        console.log(`Map selected via UI (mapRenderer): ${mapId}`);
        const loadedMap = await assetManagerInstance.loadMap(mapId);

        if (loadedMap) {
            // Initialize currentMapData within the module.
            // The calling function in script.js will handle gameState updates.
            this.initializeCurrentMap(loadedMap);

            if (typeof logToConsole === 'function') {
                logToConsole(`Map ${loadedMap.name} loaded by mapRenderer.js's handleMapSelectionChange. Returning map data to caller.`);
            } else {
                console.log(`Map ${loadedMap.name} loaded by mapRenderer.js's handleMapSelectionChange. Returning map data to caller.`);
            }
            return loadedMap; // Return the loaded map data
        } else {
            if (typeof logToConsole === 'function') {
                logToConsole(`Failed to load map: ${mapId}`);
            } else {
                console.log(`Failed to load map: ${mapId}`);
            }
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

        const userMapIndexUrl = `/user_assets/maps/mapIndex.json?t=${Date.now()}`;
        let userMapIndex = [];
        try {
            const userResponse = await fetch(userMapIndexUrl);
            if (userResponse.ok) {
                userMapIndex = await userResponse.json();
                if (userMapIndex && userMapIndex.length > 0) {
                    console.log("User map index found, adding to selector.");
                    if (baseMapIndex.length > 0 && userMapIndex.length > 0) {
                        const separator = document.createElement('option');
                        separator.disabled = true;
                        separator.textContent = '--- User Maps ---';
                        mapSelector.appendChild(separator);
                    }
                    userMapIndex.forEach(mapInfo => {
                        const option = document.createElement('option');
                        option.value = mapInfo.id;
                        option.textContent = `[User] ${mapInfo.name}`;
                        mapSelector.appendChild(option);
                    });
                    console.log("User maps added to selector.");
                    if (baseMapIndex.length === 0) {
                        assetManagerInstance.setMapIndexData(userMapIndex);
                    }
                }
            } else if (userResponse.status === 404) {
                console.log("User map index file (/user_assets/maps/mapIndex.json) not found, skipping.");
            } else {
                throw new Error(`HTTP error! status: ${userResponse.status} for user mapIndex.json`);
            }
        } catch (error) {
            console.error("Failed to load or process user map index:", error);
        }
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
        const container = document.getElementById("mapContainer");
        const mapData = window.mapRenderer.getCurrentMapData(); // Use window.mapRenderer

        let isInitialRender = false;
        // Corrected logic for isInitialRender
        if (!gameState.tileCache ||
            !mapData || !mapData.dimensions ||
            (mapData.dimensions.height > 0 && gameState.tileCache.length !== mapData.dimensions.height) ||
            (mapData.dimensions.height > 0 && mapData.dimensions.width > 0 && (!gameState.tileCache[0] || gameState.tileCache[0].length !== mapData.dimensions.width))) {
            isInitialRender = true;
        }


        if (!mapData || !mapData.dimensions || !mapData.layers) {
            if (isInitialRender && container) container.innerHTML = "<p>No map loaded or map data is invalid.</p>";
            else console.warn("renderMapLayers called with no currentMapData but not initialRender. Map display might be stale.");
            gameState.tileCache = null;
            return;
        }

        const H = mapData.dimensions.height;
        const W = mapData.dimensions.width;

        if (H === 0 || W === 0) {
            if (isInitialRender && container) container.innerHTML = "<p>Map dimensions are zero. Cannot render.</p>";
            else console.warn("renderMapLayers called with zero dimensions but not initialRender. Map display might be stale.");
            gameState.tileCache = null;
            return;
        }

        if (isInitialRender) {
            if (container) container.innerHTML = "";
            gameState.tileCache = Array(H).fill(null).map(() => Array(W).fill(null));
        }

        const fragment = isInitialRender ? document.createDocumentFragment() : null;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let actualTileId = mapData.layers.landscape?.[y]?.[x] || "";
                if (mapData.layers.building?.[y]?.[x]) actualTileId = mapData.layers.building[y][x];
                if (mapData.layers.item?.[y]?.[x]) actualTileId = mapData.layers.item[y][x];
                if (gameState.showRoof && mapData.layers.roof?.[y]?.[x]) {
                    actualTileId = mapData.layers.roof[y][x];
                }

                let targetSprite = "";
                let targetColor = "";
                let targetDisplayId = actualTileId;

                const isPlayerCurrentlyOnTile = (x === gameState.playerPos.x && y === gameState.playerPos.y &&
                    !(gameState.showRoof && mapData.layers.roof?.[y]?.[x]));

                if (isPlayerCurrentlyOnTile) {
                    targetSprite = "☻";
                    targetColor = "green";
                    targetDisplayId = "PLAYER";
                } else if (actualTileId) {
                    const def = assetManagerInstance.tilesets[actualTileId];
                    if (def) {
                        targetSprite = def.sprite;
                        targetColor = def.color;
                    } else {
                        targetSprite = '?';
                        targetColor = 'magenta';
                    }
                }

                if (isInitialRender) {
                    const span = document.createElement("span");
                    span.className = "tile";
                    span.dataset.x = x;
                    span.dataset.y = y;
                    span.textContent = targetSprite;
                    span.style.color = targetColor;

                    if (!gameState.tileCache[y]) gameState.tileCache[y] = Array(W).fill(null);

                    gameState.tileCache[y][x] = {
                        span: span,
                        displayedId: targetDisplayId,
                        sprite: targetSprite,
                        color: targetColor
                    };
                    if (fragment) fragment.appendChild(span);
                } else {
                    const cachedCell = gameState.tileCache[y]?.[x];
                    if (cachedCell && cachedCell.span) {
                        const span = cachedCell.span;
                        if (cachedCell.displayedId !== targetDisplayId ||
                            cachedCell.sprite !== targetSprite ||
                            cachedCell.color !== targetColor) {
                            span.textContent = targetSprite;
                            span.style.color = targetColor;
                            cachedCell.displayedId = targetDisplayId;
                            cachedCell.sprite = targetSprite;
                            cachedCell.color = targetColor;
                        }
                    }
                }
            }
            if (isInitialRender && fragment) {
                const br = document.createElement("br");
                fragment.appendChild(br);
            }
        }

        if (isInitialRender && container && fragment) {
            container.appendChild(fragment);
        }

        if (gameState.npcs && gameState.npcs.length > 0 && gameState.tileCache) {
            gameState.npcs.forEach(npc => {
                if (npc.mapPos) {
                    const npcX = npc.mapPos.x;
                    const npcY = npc.mapPos.y;
                    if (npcX >= 0 && npcX < W && npcY >= 0 && npcY < H) {
                        const roofObscures = gameState.showRoof && mapData.layers.roof?.[npcY]?.[npcX];
                        const playerIsHere = (npcX === gameState.playerPos.x && npcY === gameState.playerPos.y);
                        if (!roofObscures && !playerIsHere) {
                            const cachedCell = gameState.tileCache[npcY]?.[npcX];
                            if (cachedCell && cachedCell.span) {
                                const npcDisplayId = 'NPC_' + npc.id;
                                if (cachedCell.displayedId !== npcDisplayId) {
                                    cachedCell.span.textContent = npc.sprite;
                                    cachedCell.span.style.color = npc.color;
                                    cachedCell.displayedId = npcDisplayId;
                                }
                            }
                        }
                    }
                }
            });
        }

        if (gameState.tileCache) {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const cell = gameState.tileCache[y]?.[x];
                    if (cell && cell.span) {
                        if (cell.span.dataset.isAttackerHighlighted === 'true' || cell.span.dataset.isDefenderHighlighted === 'true') {
                            cell.span.style.backgroundColor = '';
                            delete cell.span.dataset.isAttackerHighlighted;
                            delete cell.span.dataset.isDefenderHighlighted;
                        }
                    }
                }
            }
        }

        if (gameState.isInCombat && gameState.tileCache) {
            if (gameState.attackerMapPos) {
                const attackerCell = gameState.tileCache[gameState.attackerMapPos.y]?.[gameState.attackerMapPos.x];
                if (attackerCell && attackerCell.span) {
                    attackerCell.span.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                    attackerCell.span.dataset.isAttackerHighlighted = 'true';
                }
            }
            if (gameState.defenderMapPos) {
                const defenderCell = gameState.tileCache[gameState.defenderMapPos.y]?.[gameState.defenderMapPos.x];
                if (defenderCell && defenderCell.span) {
                    defenderCell.span.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';
                    defenderCell.span.dataset.isDefenderHighlighted = 'true';
                }
            }
        }
        this.updateMapHighlight();
    },

    updateMapHighlight: function () {
        document.querySelectorAll('.tile.flashing')
            .forEach(el => el.classList.remove('flashing'));

        const idx = gameState.selectedItemIndex;
        if (!gameState.interactableItems || idx < 0 || idx >= gameState.interactableItems.length) return;

        const it = gameState.interactableItems[idx];
        if (!it) return;
        const x = it.x;
        const y = it.y;

        if (typeof x !== 'number' || typeof y !== 'number') return;
        const cachedCell = gameState.tileCache?.[y]?.[x];
        if (cachedCell && cachedCell.span) {
            cachedCell.span.classList.add('flashing');
        } else {
            const span = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
            if (span) span.classList.add('flashing');
        }
    },

    toggleRoof: function () {
        gameState.showRoof = !gameState.showRoof;
        this.scheduleRender();
        if (typeof logToConsole === 'function') logToConsole("Roof layer toggled " + (gameState.showRoof ? "on" : "off"));
        else console.log("Roof layer toggled " + (gameState.showRoof ? "on" : "off"));
    },

    isPassable: function (tileId) {
        if (!tileId) return true;
        const tileData = assetManagerInstance?.tilesets?.[tileId];
        if (!tileData) return true;
        const tags = tileData.tags || [];
        return !tags.includes("impassable");
    },

    getCollisionTileAt: function (x, y) {
        const mapData = this.getCurrentMapData();
        if (!mapData || !mapData.layers) return "";

        const tilesets = assetManagerInstance?.tilesets;
        if (!tilesets) return "";

        const bldLayer = mapData.layers.building;
        const itmLayer = mapData.layers.item;
        const lspLayer = mapData.layers.landscape;

        const bld = bldLayer?.[y]?.[x];
        if (bld && tilesets[bld]) return bld;

        const itm = itmLayer?.[y]?.[x];
        if (itm && tilesets[itm]) return itm;

        const lsp = lspLayer?.[y]?.[x];
        if (lsp && tilesets[lsp]) return lsp;

        return "";
    }
};
