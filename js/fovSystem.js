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

// 3D Line of Sight Check
// Returns true if there is a clear line of sight between start and end coordinates.
// Considers Z-levels and blocking tiles.
function hasLineOfSight3D(start, end, tilesets, mapData) {
    if (!start || !end || !tilesets || !mapData) return false;

    // Simplified Bresenham's line algorithm in 3D
    let x0 = start.x;
    let y0 = start.y;
    let z0 = start.z;
    let x1 = end.x;
    let y1 = end.y;
    let z1 = end.z;

    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let dz = Math.abs(z1 - z0);
    let xs = (x1 > x0) ? 1 : -1;
    let ys = (y1 > y0) ? 1 : -1;
    let zs = (z1 > z0) ? 1 : -1;

    let p1, p2;
    // Driver axis
    if (dx >= dy && dx >= dz) {
        p1 = 2 * dy - dx;
        p2 = 2 * dz - dx;
        while (x0 !== x1) {
            x0 += xs;
            if (p1 >= 0) { y0 += ys; p1 -= 2 * dx; }
            if (p2 >= 0) { z0 += zs; p2 -= 2 * dx; }
            p1 += 2 * dy;
            p2 += 2 * dz;
            if (x0 === x1 && y0 === y1 && z0 === z1) break; // Don't check end point
            if (isBlocking3D(x0, y0, z0, tilesets, mapData)) return false;
        }
    } else if (dy >= dx && dy >= dz) {
        p1 = 2 * dx - dy;
        p2 = 2 * dz - dy;
        while (y0 !== y1) {
            y0 += ys;
            if (p1 >= 0) { x0 += xs; p1 -= 2 * dy; }
            if (p2 >= 0) { z0 += zs; p2 -= 2 * dy; }
            p1 += 2 * dx;
            p2 += 2 * dz;
            if (x0 === x1 && y0 === y1 && z0 === z1) break;
            if (isBlocking3D(x0, y0, z0, tilesets, mapData)) return false;
        }
    } else {
        p1 = 2 * dy - dz;
        p2 = 2 * dx - dz;
        while (z0 !== z1) {
            z0 += zs;
            if (p1 >= 0) { y0 += ys; p1 -= 2 * dz; }
            if (p2 >= 0) { x0 += xs; p2 -= 2 * dz; }
            p1 += 2 * dy;
            p2 += 2 * dx;
            if (x0 === x1 && y0 === y1 && z0 === z1) break;
            if (isBlocking3D(x0, y0, z0, tilesets, mapData)) return false;
        }
    }
    return true;
}

function isBlocking3D(x, y, z, tilesets, mapData) {
    const zStr = z.toString();
    if (!mapData.levels[zStr]) return false; // Assume open space if no data? Or blocked? Let's say open.

    const levelData = mapData.levels[zStr];
    // Check middle layer (walls, tall objects)
    const midRaw = levelData.middle?.[y]?.[x];
    if (midRaw) {
        const midId = (typeof midRaw === 'object' && midRaw.tileId) ? midRaw.tileId : midRaw;
        const def = tilesets[midId];
        if (def && (def.tags?.includes('impassable') || def.tags?.includes('blocks_vision') || def.tags?.includes('wall'))) {
            // Exceptions: windows might be transparent
            if (def.tags.includes('transparent') || def.tags.includes('window') || def.tags.includes('allows_vision')) return false;
            return true;
        }
    }
    // Check bottom layer (usually floor, not blocking vision unless terrain)
    const botRaw = levelData.bottom?.[y]?.[x];
    if (botRaw) {
        const botId = (typeof botRaw === 'object' && botRaw.tileId) ? botRaw.tileId : botRaw;
        const def = tilesets[botId];
        if (def && (def.tags?.includes('blocks_vision'))) return true;
    }
    return false;
}

window.hasLineOfSight3D = hasLineOfSight3D;
