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

function endTurn_internal() {
    logToConsole(`Turn ${gameState.currentTurn} ended.`);
    // Assuming character.js exports updateHealthCrisis to window.character
    if (window.character && typeof window.character.updateHealthCrisis === 'function') {
        window.character.updateHealthCrisis(gameState); // Pass gameState as the character object for player
    } else {
        console.error("character.updateHealthCrisis is not available. Health crisis cannot be updated.");
    }
    gameState.currentTurn++;
    startTurn_internal(); // Call internal startTurn
    window.mapRenderer.scheduleRender();
    updateTurnUI_internal(); // Call internal updateTurnUI
}

function move_internal(direction) {
    if (gameState.isActionMenuActive) return;
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

    if (newPos.x === originalPos.x && newPos.y === originalPos.y) {
        logToConsole("Can't move that way.");
        return;
    }
    gameState.playerPos = newPos;
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
    endTurn: endTurn_internal,
    move: move_internal
};
