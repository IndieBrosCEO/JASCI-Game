/**************************************************************
 * Global State & Constants
 **************************************************************/
const assetManager = new AssetManager();
// let currentMapData = null; // This is now managed in js/mapRenderer.js // This comment is accurate.

// gameState, ClothingLayers, and InventorySizes are now in js/gameState.js

/**************************************************************
 * Clothing System Constants and Initialization
 **************************************************************/
// ClothingLayers is now in js/gameState.js
// The gameState.player.wornClothing initialization block, which depends on ClothingLayers and gameState,
// has also been moved to js/gameState.js.

/**************************************************************
 * Utility & Helper Functions
 **************************************************************/
// handleMapSelectionChange, setupMapSelector, isPassable, 
// createEmptyGrid, toggleRoof, scheduleRender, renderMapLayers, 
// updateMapHighlight, getCollisionTileAt
// --- All these functions have been moved to js/mapRenderer.js ---
// The onchange for mapSelector in index.html will call the global function,
// which will now be the one from mapRenderer.js.
// Calls to toggleRoof and scheduleRender from script.js will also resolve to mapRenderer.js versions.

/**************************************************************
 * Game Mechanics & Dice Functions
 **************************************************************/
// rollDie, parseDiceNotation, rollDiceNotation, getSkillValue, 
// getStatValue, getStatModifier, getSkillModifier are now in js/utils.js

// Calculates the attack roll for an attacker.
function calculateAttackRoll(attacker, weapon, targetBodyPart, actionContext = {}) {
    let skillName;
    if (!weapon || !weapon.type) { // Unarmed
        skillName = "Unarmed";
    } else if (weapon.type.includes("melee")) {
        skillName = "Melee Weapons";
    } else if (weapon.type.includes("firearm") || weapon.type.includes("ranged_other")) {
        skillName = "Guns";
    } else {
        skillName = "Unarmed"; // Default for unknown weapon types
    }

    const skillModifier = getSkillModifier(skillName, attacker); // Changed from getSkillValue
    let baseRoll = rollDie(20);

    // Disadvantage for second attacks
    if (actionContext.isSecondAttack) {
        baseRoll = Math.min(rollDie(20), rollDie(20));
    }

    let bodyPartModifier = 0;
    const lowerCaseTargetBodyPart = targetBodyPart.toLowerCase(); // Good practice for comparison

    if (lowerCaseTargetBodyPart === "head") {
        bodyPartModifier = -4;
    } else if (lowerCaseTargetBodyPart === "leftarm" ||
        lowerCaseTargetBodyPart === "rightarm" ||
        lowerCaseTargetBodyPart === "leftleg" ||
        lowerCaseTargetBodyPart === "rightleg") {
        bodyPartModifier = -1;
    }
    // Torso has a modifier of 0, so no explicit check needed if it's the default.

    const totalAttackRoll = baseRoll + skillModifier + bodyPartModifier + (actionContext.rangeModifier || 0); // Changed skillValue to skillModifier

    // Criticals do not apply on disadvantaged rolls (e.g. second attack)
    const canCrit = !actionContext.isSecondAttack;

    return {
        roll: totalAttackRoll,
        naturalRoll: baseRoll,
        isCriticalHit: canCrit && baseRoll === 20,
        isCriticalMiss: canCrit && baseRoll === 1
    };
}

// Calculates the defense roll for a defender.
function calculateDefenseRoll(defender, defenseType, attackerWeapon, actionContext = {}) {
    const baseRoll = rollDie(20);
    let baseDefenseValue = 0;
    let dualWieldBonus = 0;

    switch (defenseType) {
        case "Dodge":
            baseDefenseValue = getStatModifier("Dexterity", defender) + getSkillModifier("Unarmed", defender); // Changed to getStatModifier and getSkillModifier
            break;
        case "BlockUnarmed":
            baseDefenseValue = getStatModifier("Constitution", defender) + getSkillModifier("Unarmed", defender); // Changed to getStatModifier and getSkillModifier
            break;
        case "BlockArmed":
            baseDefenseValue = getSkillModifier("Melee Weapons", defender); // Changed to getSkillModifier
            // Check for dual wield bonus for player
            if (defender === gameState &&
                gameState.inventory.handSlots[0] && gameState.inventory.handSlots[0].type && gameState.inventory.handSlots[0].type.includes("melee") &&
                gameState.inventory.handSlots[1] && gameState.inventory.handSlots[1].type && gameState.inventory.handSlots[1].type.includes("melee") &&
                getSkillValue("Melee Weapons", defender) >= 5) {
                dualWieldBonus = 2;
            }
            // For NPCs, we'd need an 'isDualWielding' property or similar logic
            // else if (defender.isDualWielding && getSkillValue("Melee Weapons", defender) >= 5) {
            //    dualWieldBonus = 2;
            // }
            break;
    }

    const totalDefenseRoll = baseRoll + baseDefenseValue + dualWieldBonus;

    return {
        roll: totalDefenseRoll,
        naturalRoll: baseRoll,
        isCriticalSuccess: baseRoll === 20,
        isCriticalFailure: baseRoll === 1
    };
}

function handleMapSelectionChangeWrapper(mapId) {
    if (window.mapRenderer && typeof window.mapRenderer.handleMapSelectionChange === 'function') {
        // It's an async function, but the onchange attribute won't await it.
        // This is usually fine for UI event handlers.
        window.mapRenderer.handleMapSelectionChange(mapId);
    } else {
        console.error("window.mapRenderer.handleMapSelectionChange is not available.");
        // Optionally, provide user feedback here if critical
        const errorDisplay = document.getElementById('errorMessageDisplay');
        if (errorDisplay) {
            errorDisplay.textContent = "Error: Map changing function is not available.";
        }
    }
}

/**************************************************************
 * New Map System Functions
 **************************************************************/
// --- All functions from this section have been moved to js/mapRenderer.js ---

/**************************************************************
 * Turn-Based & Movement Functions
 **************************************************************/
// Update the UI with current movement and action points
function updateTurnUI() {
    const movementUI = document.getElementById("movementPointsUI");
    const actionUI = document.getElementById("actionPointsUI");
    if (movementUI) movementUI.textContent = "Moves Left: " + gameState.movementPointsRemaining;
    if (actionUI) actionUI.textContent = "Actions Left: " + gameState.actionPointsRemaining;
}

// Start a new turn by resetting movement and action points
function startTurn() {
    gameState.movementPointsRemaining = 6;
    gameState.actionPointsRemaining = 1;
    gameState.hasDashed = false;
    logToConsole(`Turn ${gameState.currentTurn} started. Moves: ${gameState.movementPointsRemaining}, Actions: ${gameState.actionPointsRemaining}`);
    updateTurnUI();
}

// Allow the player to dash (double movement) if conditions are met
function dash() {
    if (!gameState.hasDashed && gameState.actionPointsRemaining > 0) {
        gameState.movementPointsRemaining += 6;
        gameState.hasDashed = true;
        gameState.actionPointsRemaining--;
        logToConsole(`Dashing activated. Moves now: ${gameState.movementPointsRemaining}, Actions left: ${gameState.actionPointsRemaining}`);
        updateTurnUI();
    } else {
        logToConsole("Already dashed this turn or no actions left.");
    }
}

// End the turn, update health crises, and prepare for the next turn
function endTurn() {
    logToConsole(`Turn ${gameState.currentTurn} ended.`);
    updateHealthCrisis();
    gameState.currentTurn++;
    startTurn();
    scheduleRender(); // Replaced renderMapLayers
    updateTurnUI();
}

/**************************************************************
 * Updated Movement Function Using the New Map System
 **************************************************************/
function move(direction) {
    if (gameState.isActionMenuActive) return;
    if (gameState.movementPointsRemaining <= 0) {
        logToConsole("No movement points remaining. End your turn (press 't').");
        return;
    }
    const currentMap = window.mapRenderer.getCurrentMapData(); // Use getter from mapRenderer.js
    if (!currentMap || !currentMap.dimensions) {
        logToConsole("Cannot move: Map data not loaded.");
        return;
    }
    const width = currentMap.dimensions.width;
    const height = currentMap.dimensions.height;
    const originalPos = { ...gameState.playerPos };
    const newPos = { ...gameState.playerPos };
    switch (direction) {
        case 'up':
        case 'w':
        case 'ArrowUp':
            if (newPos.y > 0 && window.mapRenderer.isPassable(window.mapRenderer.getCollisionTileAt(newPos.x, newPos.y - 1))) newPos.y--;
            break;
        case 'down':
        case 's':
        case 'ArrowDown':
            if (newPos.y < height - 1 && window.mapRenderer.isPassable(window.mapRenderer.getCollisionTileAt(newPos.x, newPos.y + 1))) newPos.y++;
            break;
        case 'left':
        case 'a':
        case 'ArrowLeft':
            if (newPos.x > 0 && window.mapRenderer.isPassable(window.mapRenderer.getCollisionTileAt(newPos.x - 1, newPos.y))) newPos.x--;
            break;
        case 'right':
        case 'd':
        case 'ArrowRight':
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
    gameState.playerMovedThisTurn = true; // CRITICAL: Set player movement flag
    logToConsole(`Moved to (${newPos.x}, ${newPos.y}). Moves left: ${gameState.movementPointsRemaining}`);
    updateTurnUI();
    window.mapRenderer.scheduleRender(); // Replaced renderMapLayers
    window.interaction.detectInteractableItems();
    window.interaction.showInteractableItems();
}

/**************************************************************
 * Interaction & Action Functions
 **************************************************************/
// All interaction functions previously here (detectInteractableItems, showInteractableItems, 
// selectItem, getActionsForItem, selectAction, interact, performAction, cancelActionSelection)
// have been moved to js/interaction.js and are accessed via window.interaction.

// Perform the action selected by the player
function performSelectedAction() {
    // Ensure that the call is made to the performSelectedAction in js/interaction.js
    if (window.interaction && typeof window.interaction.performSelectedAction === 'function') {
        window.interaction.performSelectedAction();
    } else {
        console.error("window.interaction.performSelectedAction is not available.");
    }
}

/**************************************************************
 * Character Creation & Stats Functions
 **************************************************************/
// updateSkill, updateStat, renderTables are now in js/character.js
// renderCharacterInfo (stats, skills, worn clothing parts) is partially moved to renderCharacterStatsSkillsAndWornClothing in js/character.js

// Render character information for display in the game
// This function will now handle Name, Level, XP and call the specific function for stats/skills/clothing.
function renderCharacterInfo() {
    const characterInfoElement = document.getElementById('characterInfo');
    if (!characterInfoElement) return;

    const nameInput = document.getElementById("charName");
    const levelSpan = document.getElementById("level");
    const xpSpan = document.getElementById("xp");
    if (!nameInput || !levelSpan || !xpSpan) return;

    const name = nameInput.value;
    const level = levelSpan.textContent;
    const xp = xpSpan.textContent;

    // Set Name, Level, XP (or ensure they are set if characterInfoElement is cleared)
    // For now, we assume renderCharacterStatsSkillsAndWornClothing appends to a container within characterInfoElement,
    // so we might not need to clear everything here if the sub-container is managed.
    // Let's ensure the basic structure is there.
    let nameLevelXpContainer = characterInfoElement.querySelector('#nameLevelXpContainer');
    if (!nameLevelXpContainer) {
        nameLevelXpContainer = document.createElement('div');
        nameLevelXpContainer.id = 'nameLevelXpContainer';
        // Prepend this so it appears above stats/skills
        characterInfoElement.prepend(nameLevelXpContainer);
    }
    nameLevelXpContainer.innerHTML = ` 
        <div>Name: ${name}</div>
        <div>Level: ${level}</div>
        <div>XP: ${xp}</div>
    `;

    // Call the function from character.js to render stats, skills, and worn clothing
    // gameState is passed as the 'character' object for the player.
    window.renderCharacterStatsSkillsAndWornClothing(gameState, characterInfoElement);
}

// Wrapper functions for HTML onchange events
function handleUpdateStat(name, value) {
    window.updateStat(name, value, gameState); // from js/character.js
    renderCharacterInfo(); // Re-render the relevant parts of character info
}

function handleUpdateSkill(name, value) {
    window.updateSkill(name, value, gameState); // from js/character.js
    // No direct need to call renderCharacterInfo unless total skill points display needs update
    // The skill point display is updated directly by updateSkill.
}


/**************************************************************
 * Inventory System Functions
 **************************************************************/
// All inventory functions (InventoryContainer, Item constructors, canAddItem, addItem, removeItem, 
// equipItem, unequipItem, equipClothing, unequipClothing, updateInventoryUI, 
// renderInventoryMenu, toggleInventoryMenu, interactInventoryItem, clearInventoryHighlight)
// are now in js/inventory.js.

// The gameState.inventory object literal (except for the container itself) is in js/gameState.js.
// The gameState.inventory.container will be initialized in script.js (e.g., in startGame).

/**************************************************************
 * Health System Functions
 **************************************************************/
// initializeHealth, getArmorForBodyPart, updateHealthCrisis, applyTreatment,
// renderHealthTable, formatBodyPartName, gameOver are now in js/character.js
// and are generalized to accept a 'character' parameter.

/**************************************************************
 * Event Handlers & Initialization
 **************************************************************/
// Keydown event handler for movement and actions
function handleKeyDown(event) {
    // New logic for Escape key during combat UI declaration
    if (gameState.isInCombat && gameState.combatPhase === 'playerAttackDeclare' && event.key === 'Escape') {
        const attackDeclUI = document.getElementById('attackDeclarationUI');
        if (attackDeclUI && !attackDeclUI.classList.contains('hidden')) {
            attackDeclUI.classList.add('hidden');
            logToConsole("Attack declaration cancelled.");
            // Optionally, provide a way for player to re-open declaration or end turn.
            // For now, just hiding it. Player can press 't' to end turn if they wish.
            event.preventDefault();
            return;
        }
    }

    if (gameState.isInCombat) {
        // Most combat key handling is now through the UI or specific phases.
        // Player defense choice (if UI were implemented) would be here.
        // For now, NPC defense is automatic, and player defense defaults.
        // The 't' (end turn) and general 'Escape' are primary combat-related keys here.

        if (event.key === 'Escape') {
            logToConsole("Attempting to end combat with Escape key.");
            combatManager.endCombat(); // Use CombatManager's method to end combat
            event.preventDefault();
            return;
        }

        // Other general combat keys could be handled here if necessary,
        // but detailed phase-specific inputs (like old 1-6 for body parts) are removed.
        // logToConsole(`Combat active (Phase: ${gameState.combatPhase || 'N/A'}). Key '${event.key}' pressed. Non-combat game actions are blocked.`);
        // event.preventDefault(); // Be careful with overly broad preventDefault
        // return; // Return to ensure no non-combat actions are processed.
    }

    // Non-combat key handling starts here (or if not returned by combat logic above)
    if (gameState.inventory.open) {
        switch (event.key) {
            case 'ArrowUp': case 'w':
                if (gameState.inventory.cursor > 0) {
                    gameState.inventory.cursor--;
                    window.renderInventoryMenu(); // Re-render to update selection highlight
                }
                event.preventDefault(); return;
            case 'ArrowDown': case 's':
                // Use currentlyDisplayedItems for correct length check
                if (gameState.inventory.currentlyDisplayedItems && gameState.inventory.cursor < gameState.inventory.currentlyDisplayedItems.length - 1) {
                    gameState.inventory.cursor++;
                    window.renderInventoryMenu(); // Re-render to update selection highlight
                }
                event.preventDefault(); return;
            case 'Enter': case 'f':
                window.interactInventoryItem();
                event.preventDefault(); return;
            case 'i': case 'I': // Toggle inventory also handled below if not open
                window.toggleInventoryMenu();
                // clearInventoryHighlight(); // toggleInventoryMenu handles this when closing
                event.preventDefault(); return;
            default:
                return;
        }
    }

    if ((event.key === 'i' || event.key === 'I') && !gameState.inventory.open) {
        window.toggleInventoryMenu();
        event.preventDefault(); return;
    }

    if (!gameState.isActionMenuActive) {
        switch (event.key) {
            case 'ArrowUp': case 'w': case 'W':
            case 'ArrowDown': case 's': case 'S':
            case 'ArrowLeft': case 'a': case 'A':
            case 'ArrowRight': case 'd': case 'D':
                move(event.key);
                event.preventDefault(); return;
            default:
                if (event.key >= '1' && event.key <= '9') {
                    window.interaction.selectItem(parseInt(event.key, 10) - 1);
                    event.preventDefault(); return;
                }
        }
        if (event.key === 'x' || event.key === 'X') {
            dash();
            event.preventDefault(); return;
        }
        if (event.key === 't' || event.key === 'T') {
            if (gameState.isInCombat && combatManager.initiativeTracker[combatManager.currentTurnIndex]?.entity === gameState) {
                //logToConsole("Player attempts to end their turn via 't' key."); // Log moved to endPlayerTurn
                combatManager.endPlayerTurn(); // Changed to use the new method
            } else if (gameState.isInCombat) {
                logToConsole("Not your turn to end.");
            } else {
                // Original non-combat end turn functionality
                endTurn();
            }
            event.preventDefault(); return;
        }
    }

    switch (event.key) {
        case 'f': case 'F':
            if (gameState.isActionMenuActive) {
                performSelectedAction(); // This now calls window.interaction.performSelectedAction
            } else if (gameState.selectedItemIndex !== -1) {
                window.interaction.interact();
            }
            event.preventDefault(); break;
        case 'r':
            if (gameState.inventory.open || gameState.isInCombat) return; // Prevent if inventory open or already in combat
            const rangedTarget = gameState.npcs.find(npc => npc.id === "training_dummy" && npc.mapPos);
            if (rangedTarget) {
                // Start combat handles setting up turns and UI
                combatManager.startCombat([gameState, rangedTarget]);
            } else {
                logToConsole("Training Dummy not found for ranged attack or has no position.");
            }
            event.preventDefault(); break;
        case 'Escape':
            if (gameState.isActionMenuActive) {
                window.interaction.cancelActionSelection();
                event.preventDefault();
            }
            break;
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            if (gameState.isActionMenuActive) {
                window.interaction.selectAction(parseInt(event.key, 10) - 1);
                event.preventDefault();
            }
            break;
        case 'c':
            if (gameState.inventory.open || gameState.isInCombat) return; // Prevent if inventory open or already in combat
            const meleeTarget = gameState.npcs.find(npc => npc.id === "training_dummy" && npc.mapPos);
            if (meleeTarget) {
                const inRange = Math.abs(gameState.playerPos.x - meleeTarget.mapPos.x) <= 1 &&
                    Math.abs(gameState.playerPos.y - meleeTarget.mapPos.y) <= 1;
                if (inRange) {
                    // Start combat handles setting up turns and UI
                    combatManager.startCombat([gameState, meleeTarget]);
                } else {
                    logToConsole("Training Dummy is not in melee range.");
                }
            } else {
                logToConsole("Training Dummy not found for melee attack or has no position.");
            }
            event.preventDefault(); break;
    }
}

const combatManager = new CombatManager(gameState, assetManager);

// Initial setup on DOM content load
async function initialize() { // Made async
    try {
        await assetManager.loadDefinitions();
        console.log("Asset definitions loaded.");
        window.interaction.initInteraction(assetManager);
        window.mapRenderer.initMapRenderer(assetManager); // Initialize mapRenderer with assetManager.

        // Initialize gameState.inventory.container now that InventoryContainer is defined (from js/inventory.js)
        if (typeof InventoryContainer === 'function') {
            gameState.inventory.container = new InventoryContainer("Backpack", "M");
            console.log("Player inventory container initialized.");
        } else {
            console.error("InventoryContainer constructor not found. Inventory not initialized.");
        }

        await window.mapRenderer.setupMapSelector(); // This function is now in mapRenderer.js
        console.log("Map selector setup complete.");

        // Load the initially selected map
        const mapSelector = document.getElementById('mapSelector');
        let initialMapId = mapSelector?.value;

        // If the default selected option is disabled (e.g. a separator) or has no value, find the first valid one
        if (mapSelector && (!initialMapId || mapSelector.options[mapSelector.selectedIndex]?.disabled)) {
            initialMapId = ""; // Reset
            for (let i = 0; i < mapSelector.options.length; i++) {
                if (mapSelector.options[i].value && !mapSelector.options[i].disabled) {
                    initialMapId = mapSelector.options[i].value;
                    break;
                }
            }
        }

        if (initialMapId) {
            console.log(`Loading initial map: ${initialMapId}`);
            const loadedMapData = await assetManager.loadMap(initialMapId);
            if (loadedMapData) {
                window.mapRenderer.initializeCurrentMap(loadedMapData); // Initialize mapRenderer's currentMapData
                gameState.layers = loadedMapData.layers; // Sync gameState.layers
                gameState.playerPos = loadedMapData.startPos || { x: 2, y: 2 }; // Update playerPos
                console.log("Initial map loaded:", loadedMapData.name);
            } else {
                console.error(`Failed to load initial map: ${initialMapId}`);
                window.mapRenderer.initializeCurrentMap(null); // Ensure mapRenderer knows map is cleared
                const errorDisplay = document.getElementById('errorMessageDisplay');
                if (errorDisplay) errorDisplay.textContent = `Failed to load initial map: ${initialMapId}.`;
                gameState.layers = { landscape: [], building: [], item: [], roof: [] }; // Clear gameState layers
            }
        } else {
            console.warn("No initial map selected or map selector is empty. No map loaded at startup.");
            window.mapRenderer.initializeCurrentMap(null); // Ensure mapRenderer knows map is cleared
            gameState.layers = { landscape: [], building: [], item: [], roof: [] }; // Clear gameState layers
        }

        // renderTables is now in js/character.js, call it with gameState
        window.renderTables(gameState);
        window.mapRenderer.scheduleRender(); // Initial render of the map (or empty state)
        window.updateInventoryUI(); // Initialize inventory display (now from js/inventory.js)


    } catch (error) {
        console.error("Error during game initialization:", error);
        const errorDisplay = document.getElementById('errorMessageDisplay');
        if (errorDisplay) {
            errorDisplay.textContent = "A critical error occurred during game initialization. Please try refreshing. Details in console.";
        } else {
            alert("A critical error occurred during game initialization. Please try refreshing. Details in console.");
        }
    }

    document.addEventListener('keydown', handleKeyDown);

    const confirmButton = document.getElementById('confirmAttackButton');
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            // Check if combat is active, it's player's turn, and player is in attack declaration phase
            if (combatManager && combatManager.gameState && combatManager.gameState.isInCombat &&
                combatManager.gameState.combatCurrentAttacker === combatManager.gameState && // gameState is the player object
                combatManager.gameState.combatPhase === 'playerAttackDeclare') {
                combatManager.handleConfirmedAttackDeclaration();
            } else {
                if (!combatManager || !combatManager.gameState) {
                    console.error("CombatManager or gameState not available.");
                } else if (!combatManager.gameState.isInCombat) {
                    console.log("Confirm attack clicked, but not in combat.");
                } else if (combatManager.gameState.combatCurrentAttacker !== combatManager.gameState) {
                    console.log("Confirm attack clicked, but not player's turn.");
                } else if (combatManager.gameState.combatPhase !== 'playerAttackDeclare') {
                    console.log(`Confirm attack clicked, but phase is ${combatManager.gameState.combatPhase}, not playerAttackDeclare.`);
                }
            }
        });
    } else {
        console.error("confirmAttackButton not found in the DOM during initialization.");
    }

    const grappleButton = document.getElementById('attemptGrappleButton');
    if (grappleButton) {
        grappleButton.addEventListener('click', () => {
            if (combatManager && combatManager.gameState && combatManager.gameState.isInCombat &&
                combatManager.gameState.combatCurrentAttacker === combatManager.gameState && // gameState is the player object
                combatManager.gameState.combatPhase === 'playerAttackDeclare') {
                combatManager.handleGrappleAttemptDeclaration();
            } else {
                if (!combatManager || !combatManager.gameState) {
                    console.error("CombatManager or gameState not available for grapple attempt.");
                } else if (!combatManager.gameState.isInCombat) {
                    console.log("Attempt Grapple clicked, but not in combat.");
                } else if (combatManager.gameState.combatCurrentAttacker !== combatManager.gameState) {
                    console.log("Attempt Grapple clicked, but not player's turn.");
                } else if (combatManager.gameState.combatPhase !== 'playerAttackDeclare') {
                    console.log(`Attempt Grapple clicked, but phase is ${combatManager.gameState.combatPhase}, not playerAttackDeclare.`);
                }
            }
        });
    } else {
        console.error("attemptGrappleButton not found in the DOM during initialization.");
    }

    const confirmDefenseBtn = document.getElementById('confirmDefenseButton');
    if (confirmDefenseBtn) {
        confirmDefenseBtn.addEventListener('click', () => {
            if (combatManager && combatManager.gameState && combatManager.gameState.isInCombat &&
                combatManager.gameState.combatCurrentDefender === combatManager.gameState && // Player is defending
                combatManager.gameState.combatPhase === 'playerDefenseDeclare') {
                combatManager.handleConfirmedDefenseDeclaration();
            } else {
                if (!combatManager || !combatManager.gameState) {
                    console.error("CombatManager or gameState not available for defense confirmation.");
                } else if (!combatManager.gameState.isInCombat) {
                    console.log("Confirm Defense clicked, but not in combat.");
                } else if (combatManager.gameState.combatCurrentDefender !== combatManager.gameState) {
                    console.log("Confirm Defense clicked, but not player's turn to defend.");
                } else if (combatManager.gameState.combatPhase !== 'playerDefenseDeclare') {
                    console.log(`Confirm Defense clicked, but phase is ${combatManager.gameState.combatPhase}, not playerDefenseDeclare.`);
                }
            }
        });
    } else {
        console.error("confirmDefenseButton not found in the DOM during initialization.");
    }

}
/**************************************************************
 * Start Game
 **************************************************************/
function startGame() {
    const characterCreator = document.getElementById('character-creator');
    const characterInfoPanel = document.getElementById('character-info-panel');
    // const gameControls = document.getElementById('game-controls'); // This ID does not exist in index.html right-panel is used.

    // Ensure currentMapData is loaded (now via window.mapRenderer.getCurrentMapData())
    let currentMap = window.mapRenderer.getCurrentMapData(); // Use getter from mapRenderer.js
    if (!currentMap) {
        console.warn("startGame called but no map data loaded from mapRenderer. Attempting to load from selector.");
        const mapSelector = document.getElementById('mapSelector');
        let initialMapId = mapSelector?.value;
        if (mapSelector && (!initialMapId || mapSelector.options[mapSelector.selectedIndex]?.disabled)) {
            initialMapId = "";
            for (let i = 0; i < mapSelector.options.length; i++) {
                if (mapSelector.options[i].value && !mapSelector.options[i].disabled) {
                    initialMapId = mapSelector.options[i].value;
                    break;
                }
            }
        }

        if (initialMapId) {
            assetManager.loadMap(initialMapId).then(loadedMapData => {
                if (loadedMapData) {
                    window.mapRenderer.initializeCurrentMap(loadedMapData);
                    currentMap = window.mapRenderer.getCurrentMapData();    // Update local reference
                    if (currentMap) { // Check if currentMap is now valid
                        gameState.layers = currentMap.layers;
                        gameState.playerPos = currentMap.startPos || { x: 2, y: 2 };
                        window.mapRenderer.scheduleRender();
                        detectInteractableItems();
                        showInteractableItems();
                        logToConsole(`Map ${currentMap.name} loaded in startGame.`);
                    }
                } else {
                    logToConsole(`Failed to load map ${initialMapId} in startGame.`);
                    window.mapRenderer.initializeCurrentMap(null);
                }
            }).catch(error => {
                console.error(`Error loading map in startGame: ${error}`);
                window.mapRenderer.initializeCurrentMap(null);
            });
        } else {
            logToConsole("No map selected in startGame, map display might be empty.");
            window.mapRenderer.initializeCurrentMap(null);
        }
    } else {
        // Map is already loaded via initialize(), ensure layers and playerPos are synced
        gameState.layers = currentMap.layers;
        gameState.playerPos = currentMap.startPos || { x: 2, y: 2 };
    }


    // Logic for item creation (using assetManager to get item definitions)
    // Ensure gameState.inventory.container is initialized before trying to modify it or call functions like addItem.
    if (gameState.inventory.container) {
        const backpackUpgradeDef = assetManager.getItem("large_backpack_upgrade");
        if (backpackUpgradeDef && backpackUpgradeDef.type === "containerUpgrade") {
            gameState.inventory.container.name = backpackUpgradeDef.name;
            gameState.inventory.container.sizeLabel = "XL"; // Assuming XL, or get from itemDef
            gameState.inventory.container.maxSlots = InventorySizes.XL; // Assumes InventorySizes is global
            logToConsole(`You've upgraded to a ${backpackUpgradeDef.name}! Capacity is now XL (24 slots).`);
        } else {
            logToConsole(`Using ${gameState.inventory.container.name}. Capacity: ${gameState.inventory.container.maxSlots} slots.`);
        }
    } else {
        logToConsole("Cannot apply backpack upgrade: Inventory container not initialized.");
    }


    // Add clothing items from definitions
    // Item constructor is now in js/inventory.js
    // addItem is now in js/inventory.js
    const clothingToAdd = ["basic_vest"];
    clothingToAdd.forEach(itemId => {
        const itemDef = assetManager.getItem(itemId); // All items (incl clothing) are in itemsById
        if (itemDef) {
            // Create a new Item instance if your addItem expects an Item object
            // For simplicity, if addItem can handle raw definitions, that's fine too.
            // Assuming Item constructor can take the definition object:
            const newItem = new Item(itemDef);
            window.addItem(newItem);
        } else {
            console.warn(`Clothing item definition not found for ID: ${itemId}`);
        }
    });

    // Add weapons and ammunition
    const weaponsAndAmmoToAdd = [
        // Melee Weapon
        { id: "knife_melee" },

        // Pistol and Ammo
        { id: "beretta_92f_9mm" },
        { id: "ammo_9mm", quantity: 1 }, // Add 2 boxes of 9mm ammo

        // Shotgun and Ammo
        { id: "mossberg_12ga" },
        { id: "ammo_12gauge_buckshot", quantity: 1 }, // Add 3 boxes of 12-gauge buckshot

        // Rifle and Ammo
        { id: "akm_ak47_762mmr" },
        { id: "ammo_762mmr", quantity: 1 }, // Add 2 boxes of 7.62mmR ammo

        // Sniper Rifle and Ammo
        { id: "hk_psg1_762mm" },
        { id: "ammo_762mm", quantity: 1 }, // Add 2 boxes of 7.62mm ammo


        // Thrown Weapon
        { id: "frag_grenade_thrown", quantity: 1 }, // Add 3 frag grenades


        // Rocket Launcher (no separate ammo item, it's self-contained)
        { id: "m72a3_law_rocket_launcher", quantity: 1 }, // Add 2 rocket launchers

        // Grenade Launcher and Ammo
        { id: "m79_grenade_launcher" },
        { id: "ammo_40mm_grenade_frag", quantity: 1 }, // Add 3 40mm grenades

        // Bow and Ammo
        { id: "compound_bow" },
        { id: "ammo_arrow", quantity: 1 }, // Add 2 bundles of arrows

        // Crossbow and Ammo
        { id: "crossbow" },
        { id: "ammo_crossbow_bolt", quantity: 1 }, // Add 2 bundles of crossbow bolts
    ];

    weaponsAndAmmoToAdd.forEach(itemEntry => {
        const itemDef = assetManager.getItem(itemEntry.id);
        if (itemDef) {
            const quantity = itemEntry.quantity || 1; // Default to 1 if quantity not specified
            for (let i = 0; i < quantity; i++) {
                const newItem = new Item(itemDef);
                // If it's ammunition, we might want to store its specific ammoType or quantity per item
                if (itemDef.type === "ammunition") {
                    newItem.ammoType = itemDef.ammoType;
                    newItem.quantityPerBox = itemDef.quantity; // Assuming 'quantity' in JSON is per-box
                }
                window.addItem(newItem);
            }
        } else {
            console.warn(`Weapon or ammo definition not found for ID: ${itemEntry.id}`);
        }
    });

    // Load and place 8 Training Dummies in a 4×2 block starting at (10,10)
    const dummyDefinition = assetManager.npcsById["training_dummy"];
    if (!dummyDefinition) {
        logToConsole("Error: Training Dummy NPC definition not found.");
    } else {
        const startX = 10;
        const startY = 10;
        const width = 2;   // how many across
        const height = 2;  // how many down

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                // deep‐clone the definition
                const dummyInstance = JSON.parse(JSON.stringify(dummyDefinition));
                dummyInstance.mapPos = {
                    x: startX + dx,
                    y: startY + dy
                };
                gameState.npcs.push(dummyInstance);
                logToConsole(
                    `Training Dummy placed at (${dummyInstance.mapPos.x},${dummyInstance.mapPos.y}) with detailed health initialized.`
                );
            }
        }
    }


    if (characterCreator) characterCreator.classList.add('hidden');
    if (characterInfoPanel) characterInfoPanel.classList.remove('hidden');
    // if (gameControls) gameControls.classList.remove('hidden'); // As noted, this ID isn't in use

    renderCharacterInfo(); // This now calls the specific rendering function from js/character.js
    gameState.gameStarted = true;
    window.updateInventoryUI();
    if (window.mapRenderer.getCurrentMapData()) window.mapRenderer.scheduleRender(); // Render if map is loaded

    // initializeHealth is now in js/character.js, call it with gameState
    window.initializeHealth(gameState);
    window.renderHealthTable(gameState); // Explicitly call to render after health is set up.

    if (window.mapRenderer.getCurrentMapData()) { // Only run these if a map is loaded
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
    }
    startTurn();
}


document.addEventListener('DOMContentLoaded', initialize); // Changed to call new async initialize

// Make sure endTurn calls the correct updateHealthCrisis
function endTurn() {
    logToConsole(`Turn ${gameState.currentTurn} ended.`);
    window.updateHealthCrisis(gameState); // Pass gameState to the generalized function
    gameState.currentTurn++;
    startTurn();
    window.mapRenderer.scheduleRender();
    updateTurnUI();
}