// mapMaker/gridUtils.js
"use strict";

/**
 * Creates an empty grid (2D array) of specified width and height, filled with a default value.
 * This is a fundamental utility for initializing map layers.
 *
 * @param {number} w - The width of the grid. Must be a non-negative integer.
 * @param {number} h - The height of the grid. Must be a non-negative integer.
 * @param {*} [defaultValue=""] - The value to fill each cell of the grid with.
 * @returns {Array<Array<*>>} A 2D array representing the grid. Returns an empty array if w or h is 0.
 * @example
 * const newGrid = createEmptyGrid(10, 5, null); // Creates a 5x10 grid filled with null
 */
export function createEmptyGrid(w, h, defaultValue = "") {
    if (w < 0 || h < 0) {
        console.error("Grid dimensions (width, height) must be non-negative.");
        return []; // Or throw an error, depending on desired strictness
    }
    const grid = [];
    for (let y = 0; y < h; y++) {
        grid[y] = [];
        for (let x = 0; x < w; x++) {
            grid[y][x] = defaultValue;
        }
    }
    return grid;
}

/**
 * Creates a default landscape grid, which in the current system is simply an empty grid.
 * This function is maintained for semantic clarity if the concept of a "default landscape"
 * evolves to mean something more specific than just emptiness.
 *
 * @param {number} w - The width of the grid.
 * @param {number} h - The height of the grid.
 * @returns {Array<Array<string>>} An empty grid, typically filled with empty strings.
 */
export function createDefaultLandscape(w, h) {
    // Currently, a default landscape is just a blank grid.
    // This could be expanded if a "default landscape" implies specific tiles.
    return createEmptyGrid(w, h, "");
}

// Potential future grid utility functions:
// - cloneGrid(gridToClone): Creates a deep copy of a grid.
// - resizeGrid(grid, newW, newH, defaultValue): Resizes a grid, preserving existing content
//   within new bounds and filling new cells with defaultValue.
// - fillGridRegion(grid, x, y, regionW, regionH, tileId): Fills a rectangular region.
// - getGridCell(grid, x, y): Safely gets a cell value, handling out-of-bounds.
// - setGridCell(grid, x, y, value): Safely sets a cell value, handling out-of-bounds.
