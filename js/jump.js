// js/jump.js

// This file will contain the logic for the character jump mechanic.

/**
 * Toggles the jump targeting mode on or off.
 */
function toggleJumpTargeting() {
    // If any other targeting mode is active, an action menu is open, or inventory is open, do not enter jump mode.
    if ((window.gameState.isTargetingMode && !window.gameState.isJumpTargetingMode) || window.gameState.isActionMenuActive || window.gameState.inventory.open) {
        logToConsole("Cannot enter jump mode right now.", "orange");
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        return;
    }

    window.gameState.isJumpTargetingMode = !window.gameState.isJumpTargetingMode;

    if (window.gameState.isJumpTargetingMode) {
        // Enter jump targeting mode
        window.gameState.isTargetingMode = true; // Use the general targeting flag as well
        window.gameState.targetingCoords = { ...window.gameState.playerPos }; // Start targeting from player
        logToConsole("Jump mode activated. Move target and press 'J' or 'F' to jump.", "info");
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
        updateJumpTargetValidation(); // Initial validation check
    } else {
        // Exit jump targeting mode
        window.gameState.isTargetingMode = false;
        logToConsole("Jump mode deactivated.", "info");
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
    }
    // Update UI elements related to targeting
    if (window.updateTargetingInfoUI) window.updateTargetingInfoUI();
    if (window.mapRenderer) window.mapRenderer.scheduleRender();
}


/**
 * Validates the current jump target coordinates and updates the game state.
 * This function is called whenever the targeting cursor moves in jump mode.
 */
function updateJumpTargetValidation() {
    if (!window.gameState.isJumpTargetingMode) return;

    const playerPos = window.gameState.playerPos;
    const targetPos = window.gameState.targetingCoords;
    const jumpRange = calculateJumpRange(window.gameState.player);

    const landingSpot = getJumpLandingSpot(playerPos, targetPos, jumpRange);

    window.gameState.isCurrentJumpTargetValid = (landingSpot !== null);

    // Schedule a re-render to update the targeting reticle color.
    if (window.mapRenderer) window.mapRenderer.scheduleRender();
}


/**
 * Handles the jump key press event. This function now either initiates a jump
 * or confirms a jump if already in jump targeting mode.
 */
async function handleJumpKeyPress() {
    // If we are in jump targeting mode, pressing 'J' again confirms the jump.
    if (window.gameState.isJumpTargetingMode) {
        if (window.gameState.isCurrentJumpTargetValid) {
            const JUMP_COST = 2;
            if (window.gameState.movementPointsRemaining < JUMP_COST) {
                logToConsole("Not enough movement points to jump.", "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                return;
            }

            const playerPos = window.gameState.playerPos;
            const targetPos = window.gameState.targetingCoords;
            const jumpRange = calculateJumpRange(window.gameState.player);
            const landingSpot = getJumpLandingSpot(playerPos, targetPos, jumpRange);

            if (landingSpot) {
                await performJump(playerPos, landingSpot, JUMP_COST);
            } else {
                // This case should ideally not be hit if isCurrentJumpTargetValid is accurate.
                logToConsole("Cannot jump there.", "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
        } else {
            logToConsole("Invalid jump target.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    } else {
        // If not in jump targeting mode, pressing 'J' toggles it on.
        toggleJumpTargeting();
    }
}


// Assign to window to be globally accessible
if (typeof window !== 'undefined') {
    window.handleJumpKeyPress = handleJumpKeyPress;
    window.toggleJumpTargeting = toggleJumpTargeting;
    window.updateJumpTargetValidation = updateJumpTargetValidation;
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
        // logToConsole("Target is too high to jump up to.", "orange"); // Too noisy for real-time validation
        return null;
    }

    // Trace the path to check for obstacles.
    const path = window.mapRenderer.getLine3D(startPos.x, startPos.y, startPos.z, finalX, finalY, startPos.z);
    for (const point of path) {
        // Don't check the starting tile itself for obstacles.
        if (point.x === startPos.x && point.y === startPos.y) continue;

        // Check for obstacles at jump height (1 level above the path).
        if (!window.mapRenderer.isTileEmpty(point.x, point.y, startPos.z + 1)) {
             // logToConsole("Jump path is blocked from above.", "orange");
             return null;
        }
        // Check for obstacles at the path's z-level.
        if (!window.mapRenderer.isTileEmpty(point.x, point.y, startPos.z)) {
            // logToConsole("Jump path is blocked by a wall.", "orange");
            return null;
        }
    }

    // Now, find a valid landing spot at the destination.
    let landingZ = -1; // Default to an invalid Z level.

    for (let z = startPos.z + jumpRange.verticalUp; z >= startPos.z - 20; z--) { // Scan down max 20 tiles from max jump height.
        if (window.mapRenderer.isWalkable(finalX, finalY, z)) {
            landingZ = z;
            break;
        }
    }

    if (landingZ === -1) return null; // No valid landing spot found.


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

    // Exit ALL targeting modes after jump
    window.gameState.isTargetingMode = false;
    window.gameState.isJumpTargetingMode = false;
    window.gameState.targetingType = null;
    if(window.updateTargetingInfoUI){
        window.updateTargetingInfoUI();
    }
}
