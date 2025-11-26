// js/jump.js

// This file will contain the logic for the character jump mechanic.

// --- Key Press Handler ---
/**
 * Handles the jump key press event. This is the main entry point for the jump action.
 * It checks for necessary conditions, calculates the jump, and executes it.
 */
async function handleJumpKeyPress() {
    const JUMP_COST = 2;

    // A player cannot jump while in a vehicle.
    if (window.gameState.player.isInVehicle) {
        logToConsole("You cannot jump while in a vehicle.", "orange");
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        return;
    }

    // A player must have enough movement points to jump.
    if (window.gameState.movementPointsRemaining < JUMP_COST) {
        logToConsole("Not enough movement points to jump.", "orange");
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        return;
    }

    // A player must be in targeting mode to choose a jump direction.
    if (window.gameState.isTargetingMode) {
        const playerPos = window.gameState.playerPos;
        const targetPos = window.gameState.targetingCoords;

        // Calculate the player's jump range based on their stats.
        const jumpRange = calculateJumpRange(window.gameState.player);

        // Find the best valid landing spot based on the target and range.
        const landingSpot = getJumpLandingSpot(playerPos, targetPos, jumpRange);

        // If a valid spot is found, perform the jump.
        if (landingSpot) {
            await performJump(playerPos, landingSpot, JUMP_COST);
        } else {
            logToConsole("You can't jump there.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    } else {
        logToConsole("Enter targeting mode ('r') to select a jump direction.", "info");
        // Future enhancement: A dedicated "jump mode" could be initiated here.
        return;
    }
}


// Assign to window to be globally accessible from script.js
if (typeof window !== 'undefined') {
    window.handleJumpKeyPress = handleJumpKeyPress;
}


// --- Jump Calculation ---
/**
 * Calculates the jump range for a character based on their Strength.
 * @param {object} character - The character object (e.g., gameState.player).
 * @returns {{horizontal: number, verticalUp: number}} - An object with max horizontal and vertical up distances.
 */
function calculateJumpRange(character) {
    const strengthModifier = window.getStatModifier("Strength", character);

    // Horizontal jump: 1 tile + STR modifier, with a minimum of 1.
    const horizontal = Math.max(1, 1 + strengthModifier);

    // Vertical jump (up): 1 tile, or 2 tiles if STR modifier is +2 or greater.
    const verticalUp = (strengthModifier >= 2) ? 2 : 1;

    return { horizontal, verticalUp };
}


// --- Landing Spot Logic ---
/**
 * Finds a valid landing spot for a jump.
 * @param {{x, y, z}} startPos - The starting position of the jump.
 * @param {{x, y, z}} targetPos - The intended target position.
 * @param {{horizontal, verticalUp}} jumpRange - The character's jump range.
 * @returns {{x, y, z}|null} - The coordinates of the landing spot, or null if no valid spot is found.
 */
function getJumpLandingSpot(startPos, targetPos, jumpRange) {
    const dx = targetPos.x - startPos.x;
    const dy = targetPos.y - startPos.y;
    const horizontalDist = Math.sqrt(dx * dx + dy * dy);

    // If target is the start position, do nothing.
    if (horizontalDist === 0 && targetPos.z === startPos.z) return null;

    // Clamp the horizontal distance to the character's max jump range.
    const clampedHorizontalDist = Math.min(horizontalDist, jumpRange.horizontal);
    const ratio = (horizontalDist > 0) ? clampedHorizontalDist / horizontalDist : 0;

    const finalX = Math.round(startPos.x + dx * ratio);
    const finalY = Math.round(startPos.y + dy * ratio);

    const dz = targetPos.z - startPos.z;

    // Check vertical distance constraints.
    if (dz > 0 && dz > jumpRange.verticalUp) {
        logToConsole("Target is too high to jump up to.", "orange");
        return null;
    }

    // Trace the path to check for obstacles.
    const path = window.mapUtils.getLineOfSight(startPos, {x: finalX, y: finalY, z: startPos.z});
    for (const point of path) {
        // Don't check the starting tile itself for obstacles.
        if (point.x === startPos.x && point.y === startPos.y) continue;

        // Check for obstacles at jump height (1 level above the path).
        if (!window.mapRenderer.isTileEmpty(point.x, point.y, startPos.z + 1)) {
             logToConsole("Jump path is blocked from above.", "orange");
             return null;
        }
        // Check for obstacles at the path's z-level.
        if (!window.mapRenderer.isTileEmpty(point.x, point.y, startPos.z)) {
            // Allow jumping over low obstacles. This is a simple check.
            // A more complex system could check the tile's 'height'.
            // For now, if it's not empty, it's a wall.
            logToConsole("Jump path is blocked by a wall.", "orange");
            return null;
        }
    }

    // Now, find a valid landing spot at the destination.
    let landingZ = -1; // Default to an invalid Z level.

    // Scan downwards from the target Z to find the first walkable surface.
    for (let z = targetPos.z; z >= targetPos.z - 10; z--) { // Scan down max 10 tiles.
        if (window.mapRenderer.isWalkable(finalX, finalY, z)) {
            landingZ = z;
            break;
        }
    }

    if (landingZ === -1) {
        // If no walkable tile was found below the target, scan from player's Z level downwards
        // This handles jumping straight across a gap where the target cursor might be at the same Z.
        for (let z = startPos.z; z >= startPos.z - 10; z--) {
             if (window.mapRenderer.isWalkable(finalX, finalY, z)) {
                landingZ = z;
                break;
            }
        }
    }

    if (landingZ === -1) return null; // Still no valid landing spot found.


    const finalLandingSpot = { x: finalX, y: finalY, z: landingZ };

    // Final check: is the landing spot valid and unoccupied?
    if (window.mapRenderer.isWalkable(finalLandingSpot.x, finalLandingSpot.y, finalLandingSpot.z) &&
        !window.mapUtils.isTileOccupied(finalLandingSpot.x, finalLandingSpot.y, finalLandingSpot.z)) {
        return finalLandingSpot;
    }

    return null; // No valid spot found.
}



// --- Jump Execution ---
/**
 * Executes the jump, updating player state and handling consequences.
 * @param {{x, y, z}} startPos - The starting position of the jump.
 * @param {{x, y, z}} landingSpot - The final position after the jump.
 * @param {number} cost - The movement point cost of the jump.
 */
async function performJump(startPos, landingSpot, cost) {
    // Animate the jump
    if (window.animationManager) {
        window.animationManager.addJumpAnimation(window.gameState.player, landingSpot, 300);
    }

    // Update player position
    window.gameState.playerPos = landingSpot;

    // Deduct movement points
    window.gameState.movementPointsRemaining -= cost;

    // Handle fall damage if jumping down
    const fallHeight = startPos.z - landingSpot.z;
    if (fallHeight > 1) { // A 1-tile drop is safe.
        if (typeof window.calculateAndApplyFallDamage === 'function') {
            logToConsole(`Landed from a drop of ${fallHeight} tiles.`);
            window.calculateAndApplyFallDamage(window.gameState.player, fallHeight);
        }
    }

    // Play sound
    if (window.audioManager) window.audioManager.playSoundEffect('jump_01.wav');

    // Update UI and game state
    window.turnManager.updateTurnUI();
    window.mapRenderer.updateFOW(landingSpot.x, landingSpot.y, landingSpot.z, window.getPlayerVisionRadius());
    window.mapRenderer.scheduleRender();
    window.interaction.detectInteractableItems();
    window.interaction.showInteractableItems();
    logToConsole(`Jumped to (${landingSpot.x}, ${landingSpot.y}, ${landingSpot.z}).`);

    // Exit targeting mode after jump
    window.gameState.isTargetingMode = false;
    window.gameState.targetingType = null;
    if(window.updateTargetingInfoUI){
        window.updateTargetingInfoUI();
    }
}
