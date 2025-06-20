// js/turnManager.js

// Assumes gameState, logToConsole, window.mapRenderer, window.interaction, window.character are globally available

function updateTurnUI_internal() {
    const movementUI = document.getElementById("movementPointsUI");
    const actionUI = document.getElementById("actionPointsUI");
    if (movementUI) movementUI.textContent = "Moves Left: " + gameState.movementPointsRemaining;
    if (actionUI) actionUI.textContent = "Actions Left: " + gameState.actionPointsRemaining;
}

function startTurn_internal() {
    gameState.movementPointsRemaining = 6;
    gameState.actionPointsRemaining = 1;
    gameState.hasDashed = false;
    logToConsole(`Turn ${gameState.currentTurn} started. Moves: ${gameState.movementPointsRemaining}, Actions: ${gameState.actionPointsRemaining}`);
    updateTurnUI_internal();
}

function dash_internal() {
    if (!gameState.hasDashed && gameState.actionPointsRemaining > 0) {
        gameState.movementPointsRemaining += 6;
        gameState.hasDashed = true;
        gameState.actionPointsRemaining--;
        logToConsole(`Dashing activated. Moves now: ${gameState.movementPointsRemaining}, Actions left: ${gameState.actionPointsRemaining}`);
        updateTurnUI_internal();
    } else {
        logToConsole("Already dashed this turn or no actions left.");
    }
}

async function endTurn_internal() { // Make async
    let waitCount = 0; // Counter for stuck log
    // Wait for any ongoing animations to complete (e.g. player movement)
    if (window.animationManager) {
        console.log('[TurnManager] endTurn_internal: Starting wait loop. isAnimationPlaying:', window.animationManager.isAnimationPlaying());
        while (window.animationManager.isAnimationPlaying()) {
            waitCount++;
            if (waitCount > 50) { // Approx 2.5 seconds if timeout is 50ms
                console.log('[TurnManager] endTurn_internal: STUCK in wait loop. Count:', waitCount, 'isAnimationPlaying:', window.animationManager.isAnimationPlaying());
                if (waitCount > 100) {
                    console.log('[TurnManager] endTurn_internal: Breaking wait loop due to excessive count.');
                    break; // Break to prevent infinite loop in bad state
                }
            }
            await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms
        }
    }

    logToConsole(`Turn ${gameState.currentTurn} ended.`);
    // Assuming character.js exports updateHealthCrisis to window.character
    if (typeof window.updateHealthCrisis === 'function') {
        window.updateHealthCrisis(gameState);
    } else {
        console.error("window.updateHealthCrisis is not available. Health crisis cannot be updated.");
    }
    gameState.currentTurn++;
    startTurn_internal(); // Call internal startTurn
    window.mapRenderer.scheduleRender();
    updateTurnUI_internal(); // Call internal updateTurnUI
}

// Make move_internal async
async function move_internal(direction) {
    if (gameState.isActionMenuActive) return;
    console.log('[TurnManager] move_internal: Checking isAnimationPlaying. Flag:', (window.animationManager ? window.animationManager.isAnimationPlaying() : 'N/A'));
    // Check if an animation is playing. If so, prevent movement.
    if (window.animationManager && window.animationManager.isAnimationPlaying()) {
        logToConsole("Cannot move: Animation playing.", "orange");
        console.log('[TurnManager] move_internal: Prevented movement due to animation playing.');
        return;
    }
    if (gameState.movementPointsRemaining <= 0) {
        logToConsole("No movement points remaining. End your turn (press 't').");
        return;
    }
    const currentMap = window.mapRenderer.getCurrentMapData();
    if (!currentMap || !currentMap.dimensions) {
        logToConsole("Cannot move: Map data not loaded.");
        return;
    }
    const width = currentMap.dimensions.width;
    const height = currentMap.dimensions.height;
    const originalPos = { ...gameState.playerPos };
    const newPos = { ...gameState.playerPos };

    switch (direction) {
        case 'up': case 'w': case 'ArrowUp':
            if (newPos.y > 0 && window.mapRenderer.isPassable(window.mapRenderer.getCollisionTileAt(newPos.x, newPos.y - 1))) newPos.y--;
            break;
        case 'down': case 's': case 'ArrowDown':
            if (newPos.y < height - 1 && window.mapRenderer.isPassable(window.mapRenderer.getCollisionTileAt(newPos.x, newPos.y + 1))) newPos.y++;
            break;
        case 'left': case 'a': case 'ArrowLeft':
            if (newPos.x > 0 && window.mapRenderer.isPassable(window.mapRenderer.getCollisionTileAt(newPos.x - 1, newPos.y))) newPos.x--;
            break;
        case 'right': case 'd': case 'ArrowRight':
            if (newPos.x < width - 1 && window.mapRenderer.isPassable(window.mapRenderer.getCollisionTileAt(newPos.x + 1, newPos.y))) newPos.x++;
            break;
        default:
            return;
    }

    // Check for NPC occupation at newPos
    if (gameState.npcs && gameState.npcs.length > 0) {
        for (const npc of gameState.npcs) {
            if (npc.mapPos && npc.mapPos.x === newPos.x && npc.mapPos.y === newPos.y &&
                npc.health && npc.health.torso && npc.health.torso.current > 0) {
                logToConsole(`Cannot move to (${newPos.x},${newPos.y}): Tile occupied by ${npc.name}.`);
                return; // Prevent movement
            }
        }
    }

    if (newPos.x === originalPos.x && newPos.y === originalPos.y) {
        logToConsole("Can't move that way.");
        return;
    }

    // --- Animation Call ---
    if (window.animationManager) {
        window.animationManager.playAnimation('movement', { // Removed await
            entity: gameState,
            startPos: originalPos,
            endPos: newPos,
            sprite: '☻', // This is a JS string, should be fine.
            color: 'green',
            duration: 150
        });
    }
    // --- End Animation Call ---

    gameState.playerPos = newPos;
    if (gameState.isInCombat &&
        gameState.combatCurrentAttacker === gameState) {
        gameState.attackerMapPos = { ...gameState.playerPos };
    }
    gameState.movementPointsRemaining--;
    gameState.playerMovedThisTurn = true;
    logToConsole(`Moved to (${newPos.x}, ${newPos.y}). Moves left: ${gameState.movementPointsRemaining}`);

    updateTurnUI_internal();
    window.mapRenderer.scheduleRender();
    window.interaction.detectInteractableItems();
    window.interaction.showInteractableItems();
}

window.turnManager = {
    updateTurnUI: updateTurnUI_internal,
    startTurn: startTurn_internal,
    dash: dash_internal,
    endTurn: endTurn_internal, // ensure this points to the new async function
    move: move_internal // already async
};