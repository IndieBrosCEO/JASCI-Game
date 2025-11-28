
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

    const result = getJumpLandingSpot(playerPos, targetPos, jumpRange);

    window.gameState.isCurrentJumpTargetValid = result.isValid;
    window.gameState.currentJumpInvalidReason = result.reason;


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
            const result = getJumpLandingSpot(playerPos, targetPos, jumpRange);

            if (result.isValid) {
                await performJump(playerPos, result.spot, JUMP_COST);
            } else {
                // This case should ideally not be hit if isCurrentJumpTargetValid is accurate.
                logToConsole("Cannot jump there.", "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
        } else {
            logToConsole(`Invalid jump target: ${window.gameState.currentJumpInvalidReason}`, "orange");
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
 * @returns {{isValid: boolean, reason: string, spot: {x, y, z}|null}} - An object indicating if the jump is valid, the reason if not, and the landing spot if valid.
 */
function getJumpLandingSpot(startPos, targetPos, jumpRange) {
    const dx = targetPos.x - startPos.x;
    const dy = targetPos.y - startPos.y;
    const horizontalDist = Math.sqrt(dx * dx + dy * dy);

    if (horizontalDist === 0 && targetPos.z === startPos.z) return { isValid: false, reason: "Target is the same as the start position.", spot: null };

    if (horizontalDist > jumpRange.horizontal) return { isValid: false, reason: "Target is too far.", spot: null };

    const finalX = targetPos.x;
    const finalY = targetPos.y;

    const dz = targetPos.z - startPos.z;

    if (dz > 0 && dz > jumpRange.verticalUp) {
        return { isValid: false, reason: "Target is too high to jump up to.", spot: null };
    }

    const path = window.mapRenderer.getLine3D(startPos.x, startPos.y, startPos.z, finalX, finalY, startPos.z);
    // We only check for head clearance along the path. Obstacles on the ground are "jumped over".
    // The final landing spot's validity is checked separately. We skip the start and end of the path.
    for (let i = 1; i < path.length - 1; i++) {
        const point = path[i];
        if (!window.mapRenderer.isTileEmpty(point.x, point.y, startPos.z + 1)) {
            return { isValid: false, reason: "Jump path is blocked from above.", spot: null };
        }
    }

    let landingZ = -1;
    for (let z = startPos.z + jumpRange.verticalUp; z >= startPos.z - 20; z--) {
        if (window.mapRenderer.isWalkable(finalX, finalY, z)) {
            landingZ = z;
            break;
        }
    }

    if (landingZ === -1) return { isValid: false, reason: "No valid landing spot found.", spot: null };

    const finalLandingSpot = { x: finalX, y: finalY, z: landingZ };

    if (window.mapRenderer.isWalkable(finalLandingSpot.x, finalLandingSpot.y, finalLandingSpot.z) &&
        !window.mapUtils.isTileOccupied(finalLandingSpot.x, finalLandingSpot.y, finalLandingSpot.z)) {
        return { isValid: true, reason: "", spot: finalLandingSpot };
    }

    return { isValid: false, reason: "Landing spot is occupied or not walkable.", spot: null };
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
    if (window.updateTargetingInfoUI) {
        window.updateTargetingInfoUI();
    }
    window.gameState.isAnimationPlaying = false;
}
