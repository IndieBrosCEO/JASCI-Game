class WorldMapManager {
    constructor() {
        this.worldGraph = { nodes: [], edges: [] };
        this.areas = [];
        this.initialized = false;
    }

    async init(assetManager) {
        if (this.initialized) return;

        try {
            if (assetManager.worldGraph) {
                this.worldGraph = assetManager.worldGraph;
            } else {
                const graphResponse = await fetch('assets/definitions/world_graph.json');
                this.worldGraph = await graphResponse.json();
            }

            if (assetManager.areas) {
                this.areas = assetManager.areas;
            } else {
                const areasResponse = await fetch('assets/definitions/areas.json');
                this.areas = await areasResponse.json();
            }

            console.log("WorldMapManager initialized with", this.worldGraph.nodes.length, "nodes and", this.areas.length, "areas.");
            this.initialized = true;
        } catch (error) {
            console.error("Failed to initialize WorldMapManager:", error);
        }
    }

    getWorldNode(nodeId) {
        return this.worldGraph.nodes.find(n => n.id === nodeId);
    }

    getArea(areaId) {
        return this.areas.find(a => a.areaId === areaId);
    }

    getAreaByNodeId(nodeId) {
        // Find default area for a node if needed, or list all areas in a node
        // The graph defines defaultAreaId
        const node = this.getWorldNode(nodeId);
        if (node && node.defaultAreaId) {
            return this.getArea(node.defaultAreaId);
        }
        return null;
    }

    getPathsFrom(nodeId) {
        return this.worldGraph.edges.filter(e => e.fromNodeId === nodeId || e.toNodeId === nodeId);
    }

    async travelToNode(targetNodeId) {
        const currentNodeId = window.gameState.currentWorldNodeId;
        if (!currentNodeId) {
            console.error("Cannot travel: No current world node set.");
            return;
        }

        const path = this.worldGraph.edges.find(e =>
            (e.fromNodeId === currentNodeId && e.toNodeId === targetNodeId) ||
            (e.toNodeId === currentNodeId && e.fromNodeId === targetNodeId)
        );

        if (!path) {
            console.error("No path exists between", currentNodeId, "and", targetNodeId);
            return;
        }

        // Simulate travel
        console.log(`Traveling from ${currentNodeId} to ${targetNodeId} via ${path.pathType}... (${path.travelTime} mins)`);

        // Advance time
        if (window.timeManager) {
            // Assuming timeManager has a way to advance time.
            // If not exposed, we might need to manually update gameState.currentTime
            // checking timeManager...
            // It seems timeManager might not be fully exposed or robust yet,
            // but let's try to simulate basic time passage if possible.
            // For now, just logging.
        }

        // Update State
        window.gameState.currentWorldNodeId = targetNodeId;

        // Enter the node - passing true for fromWorldMap since we just traveled on the graph
        await this.enterNode(targetNodeId, true);
    }

    // fromWorldMap: true if arriving via world graph travel, false if exiting a local map
    async enterNode(nodeId, fromWorldMap = false) {
        const node = this.getWorldNode(nodeId);
        if (!node) {
            console.error("Node not found:", nodeId);
            return;
        }

        window.gameState.currentWorldNodeId = nodeId; // Ensure state is synced
        console.log(`Arrived at ${node.displayName}. From World Map: ${fromWorldMap}`);

        if (fromWorldMap && node.defaultAreaId) {
            // If arriving from travel, auto-load default map if present
            const area = this.getArea(node.defaultAreaId);
            if (area && area.defaultMapId) {
                console.log(`Loading default map: ${area.defaultMapId}`);

                window.gameState.isWorldMapMode = false;
                window.gameState.currentAreaId = area.areaId;

                if (typeof window.loadMap === 'function') {
                    await window.loadMap(area.defaultMapId);
                } else {
                    console.error("window.loadMap is not defined.");
                }
            } else {
                // No default map, show world UI
                window.gameState.isWorldMapMode = true;
                this.renderWorldMapUI();
            }
        } else {
            // If exiting a map (fromWorldMap=false) OR no default map exists, show the World Map UI
            window.gameState.isWorldMapMode = true;
            this.renderWorldMapUI();
        }
    }

    renderWorldMapUI() {
        // Simple UI for now
        const container = document.getElementById('game-container'); // or appropriate container
        // This effectively replaces the map view with a list of nodes.
        // Implementation TBD: likely needs to overlay on #mapContainer

        const mapContainer = document.getElementById('mapContainer');
        mapContainer.innerHTML = ''; // Clear current map

        const currentNode = this.getWorldNode(window.gameState.currentWorldNodeId);
        const paths = this.getPathsFrom(currentNode ? currentNode.id : null);

        let html = `<div style="color: white; padding: 20px;">`;
        if (currentNode) {
            html += `<h1>${currentNode.displayName}</h1>`;
            html += `<p>${currentNode.climate}, Danger: ${currentNode.danger}</p>`;
            html += `<button onclick="window.worldMapManager.enterNode('${currentNode.id}')">Enter Area</button>`;
        } else {
            html += `<h1>Unknown Location</h1>`;
        }

        html += `<h2>Travel to:</h2><ul>`;
        paths.forEach(path => {
            const otherId = path.fromNodeId === currentNode.id ? path.toNodeId : path.fromNodeId;
            const otherNode = this.getWorldNode(otherId);
            html += `<li>
                <button onclick="window.worldMapManager.travelToNode('${otherId}')">
                    ${otherNode ? otherNode.displayName : otherId} (${path.travelTime}m - ${path.pathType})
                </button>
            </li>`;
        });
        html += `</ul></div>`;

        mapContainer.innerHTML = html;
    }
}

window.WorldMapManager = WorldMapManager;
