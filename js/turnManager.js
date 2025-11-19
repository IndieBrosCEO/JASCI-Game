class TurnManager {
    constructor(gameState, assetManager, mapRenderer, interaction, combatManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.mapRenderer = mapRenderer;
        this.interaction = interaction;
        this.combatManager = combatManager;

        // Define movement costs for automatic Z-stepping
        this.Z_STEP_UP_COST = 2;
        this.Z_STEP_DOWN_COST = 1;
    }

    init(assetMgr) {
        // This is now redundant if assetManager is passed in constructor, but keeping for compatibility.
        if (!this.assetManager) this.assetManager = assetMgr;
        if (this.assetManager && this.assetManager.tilesets) {
            console.log("TurnManager initialized with AssetManager. Tilesets available.");
        } else {
            console.error("TurnManager initialized WITHOUT valid AssetManager or tilesets!");
        }
    }

    updateTurnUI() {
        const movementUI = document.getElementById("movementPointsUI");
        const actionUI = document.getElementById("actionPointsUI");
        if (movementUI) movementUI.textContent = "Moves Left: " + this.gameState.player.movementPointsRemaining;
        if (actionUI) actionUI.textContent = "Actions Left: " + this.gameState.player.actionPointsRemaining;
    }

    startTurn() {
        this.gameState.player.movementPointsRemaining = 6;
        this.gameState.player.actionPointsRemaining = 1;
        this.gameState.player.hasDashed = false;
        logToConsole(`Turn ${this.gameState.currentTurn} started. Moves: ${this.gameState.player.movementPointsRemaining}, Actions: ${this.gameState.player.actionPointsRemaining}`);
        this.updateTurnUI();
    }

    dash() {
        if (this.gameState.player && this.gameState.player.isInVehicle) {
            logToConsole("Cannot dash while in a vehicle.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }
        if (!this.gameState.player.hasDashed && this.gameState.player.actionPointsRemaining > 0) {
            this.gameState.player.movementPointsRemaining += 6;
            this.gameState.player.hasDashed = true;
            this.gameState.player.actionPointsRemaining--;
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.7 });
            logToConsole(`Dashing activated. Moves now: ${this.gameState.player.movementPointsRemaining}, Actions left: ${this.gameState.player.actionPointsRemaining}`);
            this.updateTurnUI();
        } else {
            logToConsole("Already dashed this turn or no actions left.");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    }

    async endTurn() {
        if (window.animationManager) {
            while (window.animationManager.isAnimationPlaying()) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        logToConsole(`Turn ${this.gameState.currentTurn} ended.`);
        if (typeof window.updateHealthCrisis === 'function') {
            window.updateHealthCrisis(this.gameState.player);
        }

        if (!this.gameState.isInCombat && this.gameState.npcs && this.gameState.npcs.length > 0) {
            for (const npc of this.gameState.npcs) {
                if (npc && npc.health && npc.health.torso.current > 0 && npc.health.head.current > 0) {
                    if (window.combatManager && this.assetManager && typeof window.executeNpcTurn === 'function') {
                        await window.executeNpcTurn(npc, this.gameState, window.combatManager, this.assetManager);
                    }
                }
            }
        }

        if (window.weatherManager) window.weatherManager.updateWeather();
        if (window.dynamicEventManager) window.dynamicEventManager.masterUpdate(this.gameState.currentTurn);
        if (window.proceduralQuestManager) window.proceduralQuestManager.updateProceduralQuests(this.gameState.currentTurn);
        if (window.constructionManager) window.constructionManager.updateResourceProduction(this.gameState.currentTurn);

        this.gameState.currentTurn++;
        this.startTurn();
        this.mapRenderer.scheduleRender();
        this.updateTurnUI();
    }

    async move(direction) {
        if (this.gameState.isActionMenuActive) return;

        let moveCost = 1;
        let moveSuccessful = false;

        if (this.gameState.player && this.gameState.player.isInVehicle) {
            // ... (vehicle logic remains the same, but needs to use this.gameState.player.movementPointsRemaining)
        } else {
            if (this.gameState.player.posture === 'crouching') moveCost = 2;
            else if (this.gameState.player.posture === 'prone') moveCost = 3;

            if (this.gameState.player.movementPointsRemaining < moveCost) {
                logToConsole("Not enough movement points for current posture.", "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                return;
            }

            const playerMoveResult = await window.attemptCharacterMove(this.gameState.player, direction, this.assetManager, moveCost);
            if (playerMoveResult) {
                moveSuccessful = true;
            }
        }

        if (moveSuccessful) {
            this.updateTurnUI();
            this.mapRenderer.scheduleRender();
            this.interaction.detectInteractableItems();
            this.interaction.showInteractableItems();
            if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();

            if (typeof window.checkAndHandlePortal === 'function') {
                window.checkAndHandlePortal(this.gameState.player.pos.x, this.gameState.player.pos.y);
            }

            if (this.gameState.isInCombat && window.combatManager) {
                // ... (updateCombatLOSLine logic)
            }

            if (window.trapManager) {
                window.trapManager.checkForTraps(this.gameState.player, false, 0);
            }
        }
    }
}
// This file will be instantiated in script.js and assigned to window.turnManager
// e.g. window.turnManager = new TurnManager(gameState, assetManager, mapRenderer, interaction, combatManager);
window.TurnManager = TurnManager;