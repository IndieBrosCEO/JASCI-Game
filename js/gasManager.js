
class GasManager {
    constructor() {
        this.gasClouds = []; // Array of gas cloud objects
    }

    init(gameState) {
        if (!gameState.gasClouds) {
            gameState.gasClouds = [];
        }
        this.gasClouds = gameState.gasClouds;
    }

    spawnGas(x, y, z, type, duration, density = 1.0) {
        // type: 'smoke', 'tear_gas', 'mustard_gas', 'steam'
        const id = Math.random().toString(36).substr(2, 9);
        const cloud = {
            id: id,
            x: x,
            y: y,
            z: z,
            type: type,
            duration: duration,
            density: density,
            maxDuration: duration
        };
        this.gasClouds.push(cloud);
        if (window.logToConsole) window.logToConsole(`${type} cloud spawned at ${x},${y},${z}.`, 'grey');
        window.mapRenderer.scheduleRender();
    }

    getGasAt(x, y, z) {
        // Return the densest gas at this location, or combine them?
        // For now, return the first one found (simplification)
        return this.gasClouds.find(c => c.x === x && c.y === y && c.z === z);
    }

    // Alias for getGasAt to satisfy memory requirement "getGasAt(x, y, z), returning an object with density and type properties, or undefined"
    // The spawned cloud object already has these properties.

    getOpacityAt(x, y, z) {
        const gas = this.getGasAt(x, y, z);
        if (!gas) return 0;

        // Define base opacity per gas type
        let baseOpacity = 0.0;
        switch(gas.type) {
            case 'smoke': baseOpacity = 0.8; break;
            case 'tear_gas': baseOpacity = 0.4; break;
            case 'steam': baseOpacity = 0.3; break;
            case 'mustard_gas': baseOpacity = 0.6; break;
            default: baseOpacity = 0.5;
        }

        return Math.min(1.0, baseOpacity * gas.density);
    }

    processTurn() {
        if (this.gasClouds.length === 0) return;

        const newClouds = [];
        const cloudsToRemove = [];

        this.gasClouds.forEach(cloud => {
            // 1. Dissipate
            cloud.duration--;
            cloud.density = Math.max(0, cloud.duration / cloud.maxDuration);

            if (cloud.duration <= 0 || cloud.density <= 0.05) {
                cloudsToRemove.push(cloud.id);
                return;
            }

            // 2. Spread
            // Chance to spread to neighbors based on density
            if (cloud.density > 0.3) {
                 const neighbors = [
                    { dx: 0, dy: -1, dz: 0 }, { dx: 0, dy: 1, dz: 0 },
                    { dx: -1, dy: 0, dz: 0 }, { dx: 1, dy: 0, dz: 0 },
                    { dx: 0, dy: 0, dz: 1 }, { dx: 0, dy: 0, dz: -1 } // 3D spread
                ];

                // Shuffle neighbors for random spread
                for (let i = neighbors.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
                }

                // Try to spread to ONE random valid neighbor per turn per cloud to simulate slow volumetric expansion
                // Or maybe all with low probability? Let's do all with low probability.
                neighbors.forEach(n => {
                    if (Math.random() < 0.2 * cloud.density) { // 20% chance scaled by density
                        const nx = cloud.x + n.dx;
                        const ny = cloud.y + n.dy;
                        const nz = cloud.z + n.dz;

                        // Check bounds/collision (simple check)
                        if (!window.mapRenderer.isTileBlockingLight(nx, ny, nz)) { // Gas can flow where light goes? mostly.
                             // Don't spread if there's already gas of same type there with higher density
                             const existing = this.getGasAt(nx, ny, nz);
                             if (!existing) {
                                 // Create new cloud with lower density/duration
                                 // Check if we already added one in newClouds
                                 if (!newClouds.some(nc => nc.x === nx && nc.y === ny && nc.z === nz)) {
                                     newClouds.push({
                                         id: Math.random().toString(36).substr(2, 9),
                                         x: nx, y: ny, z: nz,
                                         type: cloud.type,
                                         duration: Math.floor(cloud.duration * 0.8), // Decays faster
                                         maxDuration: Math.floor(cloud.maxDuration * 0.8),
                                         density: cloud.density * 0.8
                                     });
                                 }
                             }
                        }
                    }
                });
            }
        });

        // Remove old clouds
        this.gasClouds = this.gasClouds.filter(c => !cloudsToRemove.includes(c.id));

        // Add new clouds
        this.gasClouds.push(...newClouds);

        // Update gameState
        if (window.gameState) {
            window.gameState.gasClouds = this.gasClouds;
        }

        if (this.gasClouds.length > 0 && window.mapRenderer) window.mapRenderer.scheduleRender();
    }
}

window.GasManager = GasManager;
