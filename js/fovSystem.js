// js/fovSystem.js
// Efficient 2D symmetric shadowcasting implementation

class Shadowcaster {
    constructor() {
        this.queue = [];
    }

    /**
     * Computes the Field of View (FOV) from a given origin.
     * @param {number} originX
     * @param {number} originY
     * @param {number} radius
     * @param {Function} isBlocking - (x, y) => boolean
     * @param {Function} setVisible - (x, y) => void
     */
    compute(originX, originY, radius, isBlocking, setVisible) {
        setVisible(originX, originY);
        for (let octant = 0; octant < 8; octant++) {
            this._scanOctant(originX, originY, radius, octant, isBlocking, setVisible);
        }
    }

    _scanOctant(originX, originY, radius, octant, isBlocking, setVisible) {
        this.queue.length = 0;
        this.queue.push({ depth: 1, startSlope: 1.0, endSlope: 0.0 });

        // Octant transforms
        const xx = [1, 0, 0, -1, -1, 0, 0, 1][octant];
        const xy = [0, 1, -1, 0, 0, -1, 1, 0][octant];
        const yx = [0, 1, 1, 0, 0, -1, -1, 0][octant];
        const yy = [1, 0, 0, 1, -1, 0, 0, -1][octant];

        while (this.queue.length > 0) {
            const { depth, startSlope, endSlope } = this.queue.pop();

            if (depth > radius) continue;

            let currentStartSlope = startSlope;
            let prevTileBlocked = false;

            // Scan from startSlope (high) to endSlope (low)
            // Use 0.5 offset for better symmetric shape
            let rangeStart = Math.floor(startSlope * depth + 0.5);
            let rangeEnd = Math.ceil(endSlope * depth - 0.5);

            if (rangeStart > depth) rangeStart = depth;
            if (rangeEnd < 0) rangeEnd = 0;

            for (let i = rangeStart; i >= rangeEnd; i--) {
                let dx = depth;
                let dy = i;
                let mapX = originX + (dx * xx + dy * xy);
                let mapY = originY + (dx * yx + dy * yy);

                // Check radius squared
                if (dx*dx + dy*dy < radius*radius) {
                     setVisible(mapX, mapY);
                }

                let blocked = false;
                // Bounds check should be in isBlocking or handled here?
                // Assuming isBlocking handles bounds safe
                if (dx*dx + dy*dy < radius*radius) { // Only check blocking if within radius?
                    // Actually we need to know if it blocks even if it's at the edge?
                    // Usually yes.
                    blocked = isBlocking(mapX, mapY);
                }

                if (blocked) {
                    if (!prevTileBlocked) {
                        // Hit a wall. The scan above this wall (steeper slope) needs to end here.
                        // New end slope is top-left of this blocked tile.
                        // Slope = (i + 0.5) / (depth - 0.5)
                        let newEndSlope = (i + 0.5) / (depth - 0.5);
                        this.queue.push({ depth: depth + 1, startSlope: currentStartSlope, endSlope: newEndSlope });
                    }
                    prevTileBlocked = true;
                } else {
                    if (prevTileBlocked) {
                        // Previous was wall, this is open.
                        // Start slope for this new open sector is bottom-right of previous wall.
                        // Slope = (i + 0.5) / (depth + 0.5)
                        currentStartSlope = (i + 0.5) / (depth + 0.5);
                    }
                    prevTileBlocked = false;
                }
            }

            // If the last tile in this row was open, continue scanning next depth
            if (!prevTileBlocked) {
                this.queue.push({ depth: depth + 1, startSlope: currentStartSlope, endSlope: endSlope });
            }
        }
    }
}

window.Shadowcaster = new Shadowcaster();
