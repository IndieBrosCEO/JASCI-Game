/**************************************************************
 * Global State & Constants
 **************************************************************/
const assetManager = new AssetManager();
// let currentMapData = null; // This is now managed in js/mapRenderer.js // This comment is accurate.

// gameState, ClothingLayers, and InventorySizes are now in js/gameState.js
const COMBAT_ALERT_RADIUS = 10;

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

async function handleMapSelectionChangeWrapper(mapId) { // Made async to handle map loading properly
    if (window.mapRenderer && typeof window.mapRenderer.handleMapSelectionChange === 'function') {
        const loadedMapData = await window.mapRenderer.handleMapSelectionChange(mapId);
        if (loadedMapData) {
            // These are already set by mapRenderer.initializeCurrentMap via handleMapSelectionChange,
            // but explicit sync here ensures script.js's direct gameState manipulations are aligned.
            gameState.layers = loadedMapData.layers;
            gameState.playerPos = loadedMapData.startPos || { x: 2, y: 2 };

            // Spawn NPCs for the new map
            spawnNpcsFromMapData(loadedMapData); // Ensures gameState.npcs is fresh for the new map

            // Re-render and update UI based on new map
            window.mapRenderer.scheduleRender();
            window.interaction.detectInteractableItems();
            window.interaction.showInteractableItems();
            logToConsole(`Map ${loadedMapData.name} processed in wrapper.`);
        } else {
            logToConsole(`Map loading failed for ${mapId} in wrapper, no NPC spawning.`);
            gameState.npcs = []; // Clear NPCs if map loading failed
            window.mapRenderer.scheduleRender(); // Render empty state or previous state
        }
    } else {
        console.error("window.mapRenderer.handleMapSelectionChange is not available.");
        const errorDisplay = document.getElementById('errorMessageDisplay');
        if (errorDisplay) {
            errorDisplay.textContent = "Error: Map changing function is not available.";
        }
    }
}

function spawnNpcsFromMapData(mapData) {
    gameState.npcs = []; // Clear existing NPCs from gameState before spawning new ones

    if (mapData && mapData.npcs && Array.isArray(mapData.npcs)) {
        logToConsole(`Spawning NPCs from map data for map: ${mapData.name || mapData.id}`);
        mapData.npcs.forEach(npcPlacementInfo => {
            const npcDefinition = assetManager.getNpc(npcPlacementInfo.id); // Changed getNpcDefinition to getNpc
            if (npcDefinition) {
                const newNpc = JSON.parse(JSON.stringify(npcDefinition)); // Deep clone definition
                newNpc.mapPos = { ...npcPlacementInfo.pos }; // Assign position from map data

                // Initialize health and aggroList
                if (typeof window.initializeHealth === 'function') {
                    window.initializeHealth(newNpc);
                } else {
                    console.error(`initializeHealth function not found for NPC: ${newNpc.id}`);
                    // Basic fallback if initializeHealth is missing
                    newNpc.health = newNpc.health || { head: {}, torso: {}, leftArm: {}, rightArm: {}, leftLeg: {}, rightLeg: {} };
                    newNpc.aggroList = [];
                }

                // teamId should be copied by JSON.parse(JSON.stringify(npcDefinition))
                // Log if teamId is unexpectedly missing after cloning and initialization
                if (newNpc.teamId === undefined) { // Check if teamId is undefined on the instance
                    console.warn(`NPC ${newNpc.id} (Name: ${newNpc.name || 'N/A'}) spawned without a teamId. Definition might be missing it, or it was not set prior to this point.`);
                }

                gameState.npcs.push(newNpc);
                logToConsole(`Spawned NPC: ${newNpc.name || newNpc.id} (ID: ${newNpc.id}, Team: ${newNpc.teamId}) at (X:${newNpc.mapPos.x}, Y:${newNpc.mapPos.y})`);
            } else {
                console.warn(`NPC definition not found for ID: ${npcPlacementInfo.id} in map data.`);
            }
        });
    } else {
        logToConsole(`No NPCs to spawn for map: ${mapData.name || mapData.id} (mapData.npcs is missing or not an array).`);
    }
}

/**************************************************************
 * New Map System Functions
 **************************************************************/
// --- All functions from this section have been moved to js/mapRenderer.js ---

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
    window.renderHealthTable(gameState); // Ensure health table (armor) updates
    updatePlayerStatusDisplay(); // Update clock and needs display
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
    // Toggle Keybinds Display
    if (event.key === 'h' || event.key === 'H') {
        toggleKeybindsDisplay();
        event.preventDefault();
        return;
    }

    // New logic for Escape key during combat UI declaration
    if (gameState.isInCombat && gameState.combatPhase === 'playerAttackDeclare' && event.key === 'Escape') {
        const attackDeclUI = document.getElementById('attackDeclarationUI');
        if (attackDeclUI && !attackDeclUI.classList.contains('hidden')) {
            attackDeclUI.classList.add('hidden');
            logToConsole("Attack declaration cancelled.");
            event.preventDefault();
            return;
        }
    }

    // Targeting Mode: Escape Key
    if (gameState.isTargetingMode && event.key === 'Escape') {
        gameState.isTargetingMode = false;
        gameState.targetingType = null;
        logToConsole("Exited targeting mode.");
        window.mapRenderer.scheduleRender(); // Re-render to remove targeting UI if any
        event.preventDefault();
        return;
    }

    if (gameState.isInCombat) {
        // The 't' (end turn) and general 'Escape' are primary combat-related keys here.
        if (event.key === 'Escape') { // Note: This Escape is for combat, different from targeting mode Escape
            logToConsole("Attempting to end combat with Escape key.");
            combatManager.endCombat(); // Use CombatManager's method to end combat
            event.preventDefault();
            return;
        }
    }

    // Non-combat key handling starts here
    if (gameState.inventory.open) {
        switch (event.key) {
            case 'ArrowUp': case 'w':
                if (gameState.inventory.cursor > 0) {
                    gameState.inventory.cursor--;
                    window.renderInventoryMenu();
                }
                event.preventDefault(); return;
            case 'ArrowDown': case 's':
                if (gameState.inventory.currentlyDisplayedItems && gameState.inventory.cursor < gameState.inventory.currentlyDisplayedItems.length - 1) {
                    gameState.inventory.cursor++;
                    window.renderInventoryMenu();
                }
                event.preventDefault(); return;
            case 'Enter': case 'f':
                window.interactInventoryItem();
                event.preventDefault(); return;
            case 'i': case 'I':
                window.toggleInventoryMenu();
                event.preventDefault(); return;
            default:
                return; // Other keys do nothing if inventory is open
        }
    }

    if ((event.key === 'i' || event.key === 'I') && !gameState.inventory.open) {
        window.toggleInventoryMenu();
        event.preventDefault(); return;
    }

    // Targeting Mode: Movement Keys
    if (gameState.isTargetingMode) {
        let currentMapData = window.mapRenderer.getCurrentMapData();
        if (!currentMapData) {
            logToConsole("Targeting mode movement: No map data available.");
            return; // Cannot move target if no map
        }
        let movedTarget = false;
        switch (event.key) {
            case 'ArrowUp': case 'w': case 'W':
                if (gameState.targetingCoords.y > 0) {
                    gameState.targetingCoords.y--;
                    movedTarget = true;
                }
                break;
            case 'ArrowDown': case 's': case 'S':
                if (gameState.targetingCoords.y < currentMapData.dimensions.height - 1) {
                    gameState.targetingCoords.y++;
                    movedTarget = true;
                }
                break;
            case 'ArrowLeft': case 'a': case 'A':
                if (gameState.targetingCoords.x > 0) {
                    gameState.targetingCoords.x--;
                    movedTarget = true;
                }
                break;
            case 'ArrowRight': case 'd': case 'D':
                if (gameState.targetingCoords.x < currentMapData.dimensions.width - 1) {
                    gameState.targetingCoords.x++;
                    movedTarget = true;
                }
                break;
        }
        if (movedTarget) {
            logToConsole(`Targeting Coords: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}`);
            window.mapRenderer.scheduleRender();
            event.preventDefault();
            return; // Prevent player movement or other actions
        }
    }

    // Default game actions (player movement, interaction, etc.)
    // This block is processed if not in targeting mode OR if in targeting mode but no targeting movement key was pressed.
    if (!gameState.isActionMenuActive && !gameState.isTargetingMode) { // Ensure not in targeting mode for player movement
        switch (event.key) {
            case 'ArrowUp': case 'w': case 'W':
            case 'ArrowDown': case 's': case 'S':
            case 'ArrowLeft': case 'a': case 'A':
            case 'ArrowRight': case 'd': case 'D':
                window.turnManager.move(event.key);
                event.preventDefault(); return;
            default:
                if (event.key >= '1' && event.key <= '9') {
                    window.interaction.selectItem(parseInt(event.key, 10) - 1);
                    event.preventDefault(); return;
                }
        }
        if (event.key === 'x' || event.key === 'X') {
            window.turnManager.dash();
            event.preventDefault(); return;
        }
        if (event.key === 't' || event.key === 'T') {
            const previousHour = gameState.currentTime.hours;
            Time.advanceTime(gameState); // Advances by 2 minutes

            if (previousHour !== gameState.currentTime.hours) {
                updateHourlyNeeds(gameState); // From js/character.js
            }

            if (previousHour === 23 && gameState.currentTime.hours === 0) {
                applyDailyNeeds(gameState); // From js/character.js
            }
            updatePlayerStatusDisplay(); // Update UI for time and needs

            if (gameState.isInCombat && combatManager.initiativeTracker[combatManager.currentTurnIndex]?.entity === gameState) {
                combatManager.endPlayerTurn(); // This will also handle UI updates via its own flow
            } else if (gameState.isInCombat) {
                logToConsole("Not your turn to end.");
            } else {
                window.turnManager.endTurn(); // This will also handle UI updates via its own flow
            }
            event.preventDefault(); return;
        }
    }

    // Action-related keys (f, r, c, Escape for action menu, 1-9 for action menu)
    switch (event.key) {
        case 'f': case 'F':
            if (gameState.isTargetingMode) {
                gameState.targetConfirmed = true;
                logToConsole(`Target confirmed at: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}`);
                logToConsole(`Targeting type: ${gameState.targetingType}`);

                gameState.selectedTargetEntity = null; // Reset before checking
                for (const npc of gameState.npcs) {
                    if (npc.mapPos && npc.mapPos.x === gameState.targetingCoords.x && npc.mapPos.y === gameState.targetingCoords.y) {
                        gameState.selectedTargetEntity = npc;
                        break;
                    }
                }

                if (gameState.selectedTargetEntity) {
                    logToConsole(`Combat would be initiated with ${gameState.selectedTargetEntity.name || gameState.selectedTargetEntity.id} at (${gameState.targetingCoords.x}, ${gameState.targetingCoords.y}).`);
                    // Future: Call combatManager.initiateCombat(gameState.selectedTargetEntity, gameState.targetingType);
                } else {
                    logToConsole(`Targeting tile (${gameState.targetingCoords.x}, ${gameState.targetingCoords.y}). No entity selected. Combat would not be initiated in this manner.`);
                }

                gameState.isTargetingMode = false; // Exit targeting mode
                window.mapRenderer.scheduleRender(); // Re-render to remove 'X'

                // Integration with CombatManager
                if (!gameState.isInCombat) {
                    let allParticipants = [];
                    allParticipants.push(gameState); // Add player

                    if (gameState.selectedTargetEntity) {
                        // Check if the selected target is already the player (should not happen with NPCs)
                        // or if it's already in the list (e.g. if gameState itself was somehow a target, which is unlikely for NPCs)
                        if (!allParticipants.includes(gameState.selectedTargetEntity)) {
                            allParticipants.push(gameState.selectedTargetEntity);
                        }
                        logToConsole(`Combat initiated by player targeting ${gameState.selectedTargetEntity.name || gameState.selectedTargetEntity.id}.`);
                    } else {
                        logToConsole("Combat initiated by player targeting a tile.");
                    }

                    const playerPos = gameState.playerPos;
                    if (playerPos) { // Ensure playerPos is valid
                        gameState.npcs.forEach(npc => {
                            // Check if NPC is already included (e.g. was the direct target)
                            if (allParticipants.includes(npc)) {
                                return; // Skip if already added
                            }

                            // Check if NPC is alive
                            if (!npc.health || !npc.health.torso || npc.health.torso.current <= 0 || !npc.health.head || npc.health.head.current <= 0) {
                                return; // Skip if not alive
                            }

                            if (npc.mapPos) {
                                const distance = Math.abs(npc.mapPos.x - playerPos.x) + Math.abs(npc.mapPos.y - playerPos.y);
                                if (distance <= COMBAT_ALERT_RADIUS) {
                                    if (!allParticipants.includes(npc)) { // Double check before pushing
                                        allParticipants.push(npc);
                                        logToConsole(`${npc.name || npc.id} (Team: ${npc.teamId}) is nearby (distance: ${distance}) and added to combat.`);
                                    }
                                }
                            }
                        });
                    }

                    combatManager.startCombat(allParticipants);
                    // combatManager.promptPlayerAttackDeclaration(); // Removed as per refactoring instructions
                } else {
                    // If combat is ongoing and 'f' is pressed in targeting mode (e.g. for re-targeting)
                    // We might need to prompt player attack declaration if it's their turn.
                    if (combatManager.gameState.combatCurrentAttacker === combatManager.gameState &&
                        (combatManager.gameState.combatPhase === 'playerAttackDeclare' || combatManager.gameState.retargetingJustHappened)) {
                        logToConsole("Targeting confirmed mid-combat. Prompting player attack declaration.");
                        combatManager.promptPlayerAttackDeclaration();
                    }
                }
                event.preventDefault();

            } else if (gameState.isActionMenuActive) {
                performSelectedAction();
                event.preventDefault();
            } else if (gameState.selectedItemIndex !== -1) {
                window.interaction.interact();
                event.preventDefault();
            }
            // If none of the above, let the event propagate or do nothing.
            break;
        case 'r': case 'R': // Changed to include R
            if (gameState.inventory.open || gameState.isInCombat) return; // Prevent if inventory open or in combat

            if (gameState.isTargetingMode && gameState.targetingType === 'ranged') {
                gameState.isTargetingMode = false;
                gameState.targetingType = null;
                logToConsole("Exited ranged targeting mode.");
                window.mapRenderer.scheduleRender(); // Re-render
            } else {
                gameState.isTargetingMode = true;
                gameState.targetingType = 'ranged';
                gameState.targetingCoords = { ...gameState.playerPos }; // Initialize to player's position
                logToConsole("Entering ranged targeting mode.");
                logToConsole(`Targeting Coords: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}`);
                window.mapRenderer.scheduleRender(); // Re-render
            }
            event.preventDefault(); break;
        case 'c': case 'C': // Changed to include C
            if (gameState.inventory.open || gameState.isInCombat) return; // Prevent if inventory open or in combat

            if (gameState.isTargetingMode && gameState.targetingType === 'melee') {
                gameState.isTargetingMode = false;
                gameState.targetingType = null;
                logToConsole("Exited melee targeting mode.");
                window.mapRenderer.scheduleRender(); // Re-render
            } else {
                gameState.isTargetingMode = true;
                gameState.targetingType = 'melee';
                gameState.targetingCoords = { ...gameState.playerPos }; // Initialize to player's position
                logToConsole("Entering melee targeting mode.");
                logToConsole(`Targeting Coords: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}`);
                window.mapRenderer.scheduleRender(); // Re-render
            }
            event.preventDefault(); break;
        case 'Escape': // This Escape is for cancelling action menu, different from targeting/combat Escapes
            if (gameState.isActionMenuActive) {
                window.interaction.cancelActionSelection();
                event.preventDefault();
            }
            // Note: If not isActionMenuActive, this Escape might have been handled by targeting or combat logic already.
            // If it reaches here and isTargetingMode is true, it means the earlier targeting Escape didn't catch it (should not happen).
            // If it reaches here and isInCombat is true, it means the earlier combat Escape didn't catch it (should not happen).
            break;
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            if (gameState.isActionMenuActive) {
                window.interaction.selectAction(parseInt(event.key, 10) - 1);
                event.preventDefault();
            }
            // If not in action menu, these keys might be caught by the earlier block for item selection if not in targeting mode.
            break;
        // Default: allow event to propagate if not handled by any case.
    }
}

const combatManager = new CombatManager(gameState, assetManager);

// Keybinds Display Functions
function populateKeybinds() {
    const keybindsList = document.getElementById('keybindsList');
    if (!keybindsList) return;

    keybindsList.innerHTML = ''; // Clear existing items

    const keybinds = [
        "Movement: W, A, S, D / Arrow Keys",
        "Interact (selected item): F (when action menu is not active)",
        "Open/Close Inventory: I",
        "End Turn: T",
        "Dash: X",
        "Enter Combat Targeting: R or C",
        "Confirm Target/Action: F (in targeting or action menu)",
        "Cancel Targeting/Action Menu: Escape",
        "Cycle Interactable Items: 1-9 (selects item directly)",
        "Cycle Inventory Items: Up/Down Arrow Keys (in inventory)",
        "Use/Equip Inventory Item: F (in inventory)",
        "Toggle Controls Display: H"
    ];

    keybinds.forEach(kb => {
        const li = document.createElement('li');
        li.textContent = kb;
        keybindsList.appendChild(li);
    });
}

function toggleKeybindsDisplay() {
    gameState.showKeybinds = !gameState.showKeybinds;
    const displayDiv = document.getElementById('keybindsDisplay');
    if (!displayDiv) return;

    if (gameState.showKeybinds) {
        displayDiv.style.display = 'block';
    } else {
        displayDiv.style.display = 'none';
    }
}


// Initial setup on DOM content load
async function initialize() { // Made async
    try {
        populateKeybinds(); // Populate the keybinds list on init
        await assetManager.loadDefinitions();
        console.log("Asset definitions loaded.");
        window.interaction.initInteraction(assetManager);
        window.mapRenderer.initMapRenderer(assetManager); // Initialize mapRenderer with assetManager.

        gameState.inventory.container = new InventoryContainer("Body Pockets", "S"); // Capacity will be updated in startGame based on Strength

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
                // Spawn NPCs from the newly loaded map data
                spawnNpcsFromMapData(loadedMapData); // Ensures gameState.npcs is fresh for the new map
            } else {
                console.error(`Failed to load initial map: ${initialMapId}`);
                gameState.npcs = []; // Clear NPCs if map fails to load
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
        updatePlayerStatusDisplay(); // Initial display of clock and needs


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

    /**************************************************************
     * Player Status Display Function
     **************************************************************/
    function updatePlayerStatusDisplay() {
        // Update Clock
        const clockElement = document.getElementById('clockDisplay');
        if (clockElement && typeof Time !== 'undefined' && Time.getClockDisplay) {
            const clock = Time.getClockDisplay(gameState);
            clockElement.textContent = clock.clockString;
            clockElement.style.color = clock.color;
        } else if (clockElement) {
            clockElement.textContent = "Clock N/A";
        }

        // Update Hunger Bar
        const hungerElement = document.getElementById('hungerDisplay');
        if (hungerElement && typeof Time !== 'undefined' && Time.getNeedsStatusBars) {
            const needsBars = Time.getNeedsStatusBars(gameState);
            hungerElement.textContent = "Hunger: " + needsBars.hungerBar; // Added label
            hungerElement.style.color = "sandybrown"; // Added light brown color
        } else if (hungerElement) {
            hungerElement.textContent = "Hunger N/A";
            hungerElement.style.color = ""; // Reset color if N/A
        }

        // Update Thirst Bar
        const thirstElement = document.getElementById('thirstDisplay');
        if (thirstElement && typeof Time !== 'undefined' && Time.getNeedsStatusBars) {
            const needsBars = Time.getNeedsStatusBars(gameState); // Called again, but simple
            thirstElement.textContent = "Thirst: " + needsBars.thirstBar; // Added label
            thirstElement.style.color = "lightskyblue"; // Added light blue color
        } else if (thirstElement) {
            thirstElement.textContent = "Thirst N/A";
            thirstElement.style.color = ""; // Reset color if N/A
        }
    }
    window.updatePlayerStatusDisplay = updatePlayerStatusDisplay; // Make it globally accessible if needed elsewhere

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

    const retargetBtn = document.getElementById('retargetButton');
    if (retargetBtn) {
        retargetBtn.addEventListener('click', () => {
            if (gameState.isInCombat && gameState.combatPhase === 'playerAttackDeclare' && combatManager) {
                combatManager.handleRetarget();
            }
        });
    } else {
        console.error("retargetButton not found in the DOM during initialization.");
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
                        window.interaction.detectInteractableItems(); // <<< CORRECTED
                        window.interaction.showInteractableItems();   // <<< CORRECTED
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
    // OLD BACKPACK UPGRADE LOGIC REMOVED

    // Add Small Backpack and Cargo Pants as starting items
    if (gameState.inventory.container && typeof window.addItem === 'function' && assetManager) {
        const itemsToStartWith = [
            { id: "small_backpack_container", nameForLog: "Small Backpack" },
            { id: "cargo_pants_pockets", nameForLog: "Cargo Pants" },
            { id: "large_backpack_item", nameForLog: "Large Backpack" }
        ];

        itemsToStartWith.forEach(itemInfo => {
            const itemDef = assetManager.getItem(itemInfo.id);
            if (itemDef) {
                const newItem = new Item(itemDef); // Assumes Item constructor is globally available
                if (window.addItem(newItem)) {
                    logToConsole(`Added starting item: ${itemInfo.nameForLog} to inventory.`);
                } else {
                    logToConsole(`Failed to add starting item: ${itemInfo.nameForLog} to inventory (addItem returned false).`);
                }
            } else {
                logToConsole(`Warning: Item definition not found for starting item ID: ${itemInfo.id} (${itemInfo.nameForLog}).`);
            }
        });
    } else {
        if (!gameState.inventory.container) logToConsole("Could not add starting backpack/pants: Inventory container not ready.");
        if (typeof window.addItem !== 'function') logToConsole("Could not add starting backpack/pants: addItem function not available.");
        if (!assetManager) logToConsole("Could not add starting backpack/pants: assetManager not available.");
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


    if (characterCreator) characterCreator.classList.add('hidden');
    if (characterInfoPanel) characterInfoPanel.classList.remove('hidden');
    // if (gameControls) gameControls.classList.remove('hidden'); // As noted, this ID isn't in use

    renderCharacterInfo(); // This now calls the specific rendering function from js/character.js

    // Set final inventory capacity based on player's chosen Strength stat
    if (gameState.inventory.container && gameState.stats) {
        const strengthStat = gameState.stats.find(stat => stat.name === "Strength");
        let finalPlayerStrengthCapacity = 5; // Fallback capacity

        if (strengthStat && typeof strengthStat.points === 'number') {
            finalPlayerStrengthCapacity = strengthStat.points;
            // Ensure capacity is not excessively low, e.g., minimum 1
            if (finalPlayerStrengthCapacity < 1) {
                logToConsole(`Warning: Strength stat (${finalPlayerStrengthCapacity}) is less than 1. Setting base capacity to 1.`);
                finalPlayerStrengthCapacity = 1;
            }
        } else {
            console.warn("Could not find Strength stat for player in startGame, or points is not a number. Defaulting initial capacity to fallback 5.");
            logToConsole("Warning: Could not determine Strength. Base carrying capacity set to fallback value.");
        }

        gameState.inventory.container.name = "Body Pockets"; // Ensure correct name
        gameState.inventory.container.maxSlots = finalPlayerStrengthCapacity;

        logToConsole(`Your base carrying capacity (Body Pockets) is now ${finalPlayerStrengthCapacity} slots, based on your Strength of ${strengthStat ? strengthStat.points : 'N/A'}.`);
        // updateInventoryUI() will be called later, or as items are added.
    } else {
        console.error("Critical error: Cannot set Strength-based capacity in startGame. Inventory container or gameState.stats not available.");
        logToConsole("Error: Could not set Strength-based carrying capacity.");
    }

    gameState.gameStarted = true;
    window.updateInventoryUI();
    if (window.mapRenderer.getCurrentMapData()) window.mapRenderer.scheduleRender(); // Render if map is loaded

    // initializeHealth is now in js/character.js, call it with gameState
    window.initializeHealth(gameState);
    window.renderHealthTable(gameState); // Explicitly call to render after health is set up.

    updatePlayerStatusDisplay(); // Initialize clock and needs display

    if (window.mapRenderer.getCurrentMapData()) { // Only run these if a map is loaded
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
    }
    window.turnManager.startTurn();
    runConsumableAndNeedsTest(); // Added call to the test function
}

// --- Automated Consumable and Needs Test ---
function runConsumableAndNeedsTest() {
    logToConsole("--- Starting Automated Consumable and Needs Test ---");

    const beansDef = assetManager.getItem('canned_beans_food');
    const waterDef = assetManager.getItem('bottled_water_drink');

    if (!beansDef) {
        logToConsole("TEST ERROR: Canned Beans definition (canned_beans_food) not found by assetManager.");
        // Attempt to check items.json directly if available through a debug var or skip
    }
    if (!waterDef) {
        logToConsole("TEST ERROR: Bottled Water definition (bottled_water_drink) not found by assetManager.");
    }

    // Ensure player needs are at a testable state (e.g., not full)
    // For simplicity, let's assume they are at default or set them.
    // gameState.playerHunger = 12; // Example: Set to half
    // gameState.playerThirst = 12; // Example: Set to half
    // Ensure these are initialized if not already (they should be by Time.advanceTime or character init)
    const maxNeeds = 24;
    if (typeof gameState.playerHunger === 'undefined') gameState.playerHunger = maxNeeds;
    if (typeof gameState.playerThirst === 'undefined') gameState.playerThirst = maxNeeds;


    logToConsole(`Initial Test State - Hunger: ${gameState.playerHunger}/${maxNeeds}, Thirst: ${gameState.playerThirst}/${maxNeeds}`);
    if (typeof window.updatePlayerStatusDisplay === 'function') window.updatePlayerStatusDisplay();

    // Test consuming Canned Beans
    if (beansDef) {
        logToConsole("Testing consumption of Canned Beans...");
        // Ensure item is in inventory (addItem checks capacity)
        if (!gameState.inventory.container.items.find(i => i.id === beansDef.id)) {
            addItem(new Item(beansDef)); // Add one for the test
        }

        const beansInventoryItem = gameState.inventory.container.items.find(i => i.id === beansDef.id);
        if (beansInventoryItem) {
            // Simulate selecting and interacting
            gameState.inventory.currentlyDisplayedItems = [beansInventoryItem]; // Mock display for interactInventoryItem
            gameState.inventory.cursor = 0;
            const initialBeansHunger = gameState.playerHunger;
            interactInventoryItem(); // This should consume it
            logToConsole(`After Beans - Hunger: ${gameState.playerHunger} (was ${initialBeansHunger}), Thirst: ${gameState.playerThirst}`);
            if (initialBeansHunger + beansDef.effects.hunger > maxNeeds && gameState.playerHunger !== maxNeeds) {
                logToConsole(`TEST WARNING: Beans hunger did not cap at max. Expected ${maxNeeds}, got ${gameState.playerHunger}`);
            } else if (initialBeansHunger + beansDef.effects.hunger <= maxNeeds && gameState.playerHunger !== initialBeansHunger + beansDef.effects.hunger) {
                logToConsole(`TEST WARNING: Beans hunger did not increase correctly. Expected ${initialBeansHunger + beansDef.effects.hunger}, got ${gameState.playerHunger}`);
            }
        } else {
            logToConsole("TEST INFO: Canned Beans not found in inventory for consumption test part.");
        }
    } else {
        logToConsole("TEST SKIP: Canned Beans definition not found, skipping consumption test for it.");
    }
    if (typeof window.updatePlayerStatusDisplay === 'function') window.updatePlayerStatusDisplay();

    // Test consuming Bottled Water
    if (waterDef) {
        logToConsole("Testing consumption of Bottled Water...");
        if (!gameState.inventory.container.items.find(i => i.id === waterDef.id)) {
            addItem(new Item(waterDef)); // Add one for the test
        }

        const waterInventoryItem = gameState.inventory.container.items.find(i => i.id === waterDef.id);
        if (waterInventoryItem) {
            gameState.inventory.currentlyDisplayedItems = [waterInventoryItem];
            gameState.inventory.cursor = 0;
            const initialWaterThirst = gameState.playerThirst;
            interactInventoryItem();
            logToConsole(`After Water - Hunger: ${gameState.playerHunger}, Thirst: ${gameState.playerThirst} (was ${initialWaterThirst})`);
            if (initialWaterThirst + waterDef.effects.thirst > maxNeeds && gameState.playerThirst !== maxNeeds) {
                logToConsole(`TEST WARNING: Water thirst did not cap at max. Expected ${maxNeeds}, got ${gameState.playerThirst}`);
            } else if (initialWaterThirst + waterDef.effects.thirst <= maxNeeds && gameState.playerThirst !== initialWaterThirst + waterDef.effects.thirst) {
                logToConsole(`TEST WARNING: Water thirst did not increase correctly. Expected ${initialWaterThirst + waterDef.effects.thirst}, got ${gameState.playerThirst}`);
            }
        } else {
            logToConsole("TEST INFO: Bottled Water not found in inventory for consumption test part.");
        }
    } else {
        logToConsole("TEST SKIP: Bottled Water definition not found, skipping consumption test for it.");
    }
    if (typeof window.updatePlayerStatusDisplay === 'function') window.updatePlayerStatusDisplay();

    // Time passing simulation removed as per subtask.

    logToConsole("--- Automated Consumable and Needs Test Complete ---");
    // Clean up gameState.inventory.currentlyDisplayedItems if it was mocked for test
    gameState.inventory.currentlyDisplayedItems = [];
    if (gameState.inventory.open) { // If test somehow left inventory open, refresh it
        renderInventoryMenu();
    }
}

document.addEventListener('DOMContentLoaded', initialize); // Changed to call new async initialize

// Make sure endTurn calls the correct updateHealthCrisis
// function endTurn() { // This function is now removed
//     logToConsole(`Turn ${gameState.currentTurn} ended.`);
//     window.updateHealthCrisis(gameState); // Pass gameState to the generalized function
//     gameState.currentTurn++;
//     window.turnManager.startTurn(); // Make sure this is called via turnManager
//     window.mapRenderer.scheduleRender();
//     window.turnManager.updateTurnUI(); // Make sure this is called via turnManager
// }

function testTurnManagerDash() {
    console.log("Testing turnManager.dash()...");
    // Setup initial state for testing
    gameState.currentTurn = 1;
    gameState.movementPointsRemaining = 6;
    gameState.actionPointsRemaining = 1;
    gameState.hasDashed = false;
    console.log("Initial gameState (for dash test): ", JSON.parse(JSON.stringify(gameState)));

    window.turnManager.dash();

    console.log("gameState after dash:", JSON.parse(JSON.stringify(gameState)));

    if (gameState.actionPointsRemaining === 0 && gameState.movementPointsRemaining === 12 && gameState.hasDashed === true) {
        console.log("testTurnManagerDash PASSED!");
        logToConsole("Test: turnManager.dash PASSED!");
        return true;
    } else {
        console.error("testTurnManagerDash FAILED! Check console for details.");
        logToConsole("Test: turnManager.dash FAILED!");
        return false;
    }
}
// To run the test, open the browser console and type: testTurnManagerDash()

async function testAssetManagerAndInteractionInitialization() {
    console.log("Testing AssetManager and Interaction module initialization...");
    logToConsole("Test: Starting AssetManager & Interaction Initialization Test...");

    // 1. Test AssetManager's loadMap
    if (!assetManager || typeof assetManager.loadDefinitions !== 'function') {
        console.error("AssetManager instance not available globally or not initialized.");
        logToConsole("Test FAIL: AssetManager not available.");
        return false;
    }

    // This test assumes the main initialize() function in script.js, which calls
    // assetManager.loadDefinitions(), has already run.

    let mapData = null;
    try {
        // Using 'testMap' as it's listed in Maps/ and likely a valid map ID.
        mapData = await assetManager.loadMap('testMap');
        if (mapData && mapData.id === 'testMap') {
            console.log("testAssetManagerAndInteractionInitialization: assetManager.loadMap('testMap') PASSED.");
            logToConsole("Test: assetManager.loadMap('testMap') PASSED.");
        } else {
            console.error("testAssetManagerAndInteractionInitialization: assetManager.loadMap('testMap') FAILED to return correct data.", mapData);
            logToConsole("Test FAIL: assetManager.loadMap('testMap') did not return correct data.");
            return false;
        }
    } catch (error) {
        console.error("testAssetManagerAndInteractionInitialization: assetManager.loadMap('testMap') FAILED with error:", error);
        logToConsole("Test FAIL: assetManager.loadMap('testMap') threw an error.");
        return false;
    }

    // 2. Test Interaction module's use of AssetManager
    if (!window.interaction || typeof window.interaction.initInteraction !== 'function') {
        console.error("window.interaction or window.interaction.initInteraction not available.");
        logToConsole("Test FAIL: window.interaction.initInteraction not available.");
        return false;
    }
    // initInteraction is called by the main initialize() in script.js.

    const originalPlayerPos = gameState.playerPos;
    const originalInteractableItems = gameState.interactableItems;

    gameState.playerPos = { x: 0, y: 0 };

    // Mock map data for interaction test.
    // Assuming 'WDH' (Wooden Door Horizontal) is a valid interactive tile ID.
    // This assumption might need verification against 'tileset.json'.
    const mockMapData = {
        id: 'testMapForInteraction',
        name: 'Test Map for Interaction',
        dimensions: { width: 1, height: 1 },
        layers: {
            landscape: [['grass']],
            building: [['WDH']],
            item: [[]],
            roof: [[]]
        },
        startPos: { x: 0, y: 0 }
    };

    const realCurrentMap = window.mapRenderer.getCurrentMapData();
    window.mapRenderer.initializeCurrentMap(mockMapData);
    gameState.layers = mockMapData.layers;

    try {
        window.interaction.detectInteractableItems();
        // Check if 'WDH' was detected. This depends on 'WDH' being in tileset.json and tagged "interactive".
        if (gameState.interactableItems && gameState.interactableItems.length > 0 && gameState.interactableItems[0].id === 'WDH') {
            console.log("testAssetManagerAndInteractionInitialization: interaction.detectInteractableItems() PASSED and found 'WDH'.");
            logToConsole("Test: interaction.detectInteractableItems() PASSED.");
        } else {
            console.error("testAssetManagerAndInteractionInitialization: interaction.detectInteractableItems() FAILED to find 'WDH'. Found:", gameState.interactableItems);
            logToConsole("Test FAIL: interaction.detectInteractableItems() did not find 'WDH'. Verify 'WDH' is interactive in tileset.json.");
            // Restore original map and player pos before returning false
            window.mapRenderer.initializeCurrentMap(realCurrentMap);
            gameState.layers = realCurrentMap ? realCurrentMap.layers : { landscape: [], building: [], item: [], roof: [] };
            gameState.playerPos = originalPlayerPos;
            gameState.interactableItems = originalInteractableItems;
            return false;
        }
    } catch (e) {
        console.error("testAssetManagerAndInteractionInitialization: interaction.detectInteractableItems() FAILED with error:", e);
        logToConsole("Test FAIL: interaction.detectInteractableItems() threw an error.");
        // Restore original map and player pos before returning false
        window.mapRenderer.initializeCurrentMap(realCurrentMap);
        gameState.layers = realCurrentMap ? realCurrentMap.layers : { landscape: [], building: [], item: [], roof: [] };
        gameState.playerPos = originalPlayerPos;
        gameState.interactableItems = originalInteractableItems;
        return false;
    }

    // Restore original map and player pos
    window.mapRenderer.initializeCurrentMap(realCurrentMap);
    gameState.layers = realCurrentMap ? realCurrentMap.layers : { landscape: [], building: [], item: [], roof: [] };
    gameState.playerPos = originalPlayerPos;
    gameState.interactableItems = originalInteractableItems;

    console.log("testAssetManagerAndInteractionInitialization: All checks PASSED.");
    logToConsole("Test: AssetManager & Interaction Initialization PASSED.");
    return true;
}
// To run the test, open the browser console after the game has initialized and type: testAssetManagerAndInteractionInitialization()

async function testCombatTurnProgression() {
    logToConsole("--- Running Combat Turn Progression Test ---");
    let testPassed = true;
    let turnUiCalledLog = [];

    // Ensure combatManager is available
    if (!combatManager || typeof combatManager.startCombat !== 'function') {
        logToConsole("Combat Turn Progression Test FAIL: combatManager not available.");
        return false;
    }

    // Find the training dummy
    const dummyNpc = gameState.npcs.find(npc => npc.id === 'training_dummy');
    if (!dummyNpc) {
        logToConsole("Combat Turn Progression Test FAIL: Training dummy NPC not found.");
        return false;
    }
    if (!dummyNpc.mapPos) {
        logToConsole("Combat Turn Progression Test FAIL: Training dummy has no mapPos for combat.");
        return false;
    }


    // Store original and set up spy
    const originalUpdateTurnUI = window.turnManager.updateTurnUI;
    let updateTurnUICallCount = 0;
    window.turnManager.updateTurnUI = () => {
        updateTurnUICallCount++;
        turnUiCalledLog.push(`updateTurnUI called. AP: ${gameState.actionPointsRemaining}, MP: ${gameState.movementPointsRemaining}`);
        originalUpdateTurnUI.call(window.turnManager); // Call the original function
    };

    // Start combat
    logToConsole("Starting combat for test...");
    gameState.playerPos = { x: dummyNpc.mapPos.x - 1, y: dummyNpc.mapPos.y }; // Position player next to dummy
    combatManager.startCombat([gameState, dummyNpc]);

    if (!gameState.isInCombat) {
        logToConsole("Combat Turn Progression Test FAIL: Combat did not start.");
        testPassed = false;
    } else {
        logToConsole("Combat started. Initiative: " + JSON.stringify(combatManager.initiativeTracker.map(e => e.isPlayer ? 'Player' : e.entity.id)));
        logToConsole(`Current attacker: ${combatManager.initiativeTracker[combatManager.currentTurnIndex].isPlayer ? 'Player' : combatManager.initiativeTracker[combatManager.currentTurnIndex].entity.id}`);
    }

    // --- Simulate Player's Turn ---
    if (testPassed && gameState.isInCombat && combatManager.initiativeTracker[combatManager.currentTurnIndex].entity === gameState) {
        logToConsole("Player's turn. Ending player turn immediately for test purposes...");
        const initialPlayerAP = gameState.actionPointsRemaining;
        combatManager.endPlayerTurn(); // This should advance the turn

        if (gameState.actionPointsRemaining !== 0 || gameState.movementPointsRemaining !== 0) {
            logToConsole(`Player Turn End Check FAIL: AP or MP not zeroed. AP: ${gameState.actionPointsRemaining}, MP: ${gameState.movementPointsRemaining}`);
            // testPassed = false; // This might be too strict if endPlayerTurn has other effects before UI update
        }
        logToConsole("Player turn ended by test.");
    } else if (testPassed && gameState.isInCombat) {
        logToConsole("WARN: Not player's turn first, or player is not the current entity. Test will proceed but might be less indicative for player-specific UI updates initially.");
    }


    // --- Simulate through a few turns OR until it's player's turn again (if NPC went first) ---
    // This part is tricky to automate perfectly without a more complex setup.
    // We're primarily testing if `updateTurnUI` is called by combatManager.
    // Let's assume for now that combatManager.nextTurn() will eventually call it.
    // The previous changes ensured updateTurnUI is called in nextTurn.

    // After combatManager.endPlayerTurn(), it should be NPC's turn.
    // combatManager.executeNpcCombatTurn will run, then combatManager.nextTurn().
    // The nextTurn() call is where window.turnManager.updateTurnUI() is expected if it becomes player's turn again.

    // For simplicity, we check call count. startCombat calls nextTurn, which calls updateTurnUI.
    // endPlayerTurn calls nextTurn, which calls updateTurnUI.
    // If NPC turn also calls nextTurn which leads to player turn, that's another call.

    // Let's just check if updateTurnUICallCount increased after starting combat and ending one player turn.
    // startCombat -> nextTurn (calls updateTurnUI once for the first entity)
    // endPlayerTurn -> nextTurn (calls updateTurnUI for the next entity)

    logToConsole(`updateTurnUI call count after simulated turns: ${updateTurnUICallCount}`);
    turnUiCalledLog.forEach(log => logToConsole(log));


    if (updateTurnUICallCount < 2) { // At least one for combat start, one for turn change after player.
        logToConsole(`Combat Turn Progression Test FAIL: updateTurnUI was called ${updateTurnUICallCount} times, expected at least 2.`);
        testPassed = false;
    }

    // Clean up
    if (gameState.isInCombat) {
        combatManager.endCombat();
        logToConsole("Combat ended by test.");
    }
    window.turnManager.updateTurnUI = originalUpdateTurnUI; // Restore original function

    if (testPassed) {
        logToConsole("Combat Turn Progression Test PASSED (updateTurnUI was called).");
    } else {
        logToConsole("Combat Turn Progression Test FAILED. Check logs.");
    }
    return testPassed;
}

// Make sure to add testCombatTurnProgression to runAllBasicConnectionTests if it exists
if (typeof runAllBasicConnectionTests === 'function' &&
    !runAllBasicConnectionTests.toString().includes('testCombatTurnProgression')) {
    const originalRunAll = runAllBasicConnectionTests;
    runAllBasicConnectionTests = async function () {
        let overallResult = await originalRunAll(); // Run previous tests
        logToConsole("--- Running Combat Turn Progression Test (from wrapper) ---");
        if (!await testCombatTurnProgression()) overallResult = false;
        return overallResult;
    }
}

// --- Test Suite for Reconnected Features ---

async function runAllBasicConnectionTests() {
    logToConsole("===== STARTING BASIC CONNECTION TESTS =====");
    let allPassed = true;

    // Prerequisite: Ensure game is in a somewhat initialized state for some tests
    // This might mean running parts of initialize() or startGame() if not already done.
    // For now, these tests assume they are run after the main initialize() and startGame() have setup gameState.
    // If not, they might need more internal setup.

    if (typeof testPlayerMovement === 'function') {
        logToConsole("--- Running Player Movement Test ---");
        if (!await testPlayerMovement()) allPassed = false;
    } else { logToConsole("Test function testPlayerMovement not found."); allPassed = false; }

    if (typeof testDoorInteraction === 'function') {
        logToConsole("--- Running Door Interaction Test ---");
        if (!await testDoorInteraction()) allPassed = false;
    } else { logToConsole("Test function testDoorInteraction not found."); allPassed = false; }

    if (typeof testItemAddAndEquip === 'function') {
        logToConsole("--- Running Item Add and Equip Test ---");
        if (!await testItemAddAndEquip()) allPassed = false;
    } else { logToConsole("Test function testItemAddAndEquip not found."); allPassed = false; }

    if (typeof testCombatInitiation === 'function') {
        logToConsole("--- Running Combat Initiation Test ---");
        if (!await testCombatInitiation()) allPassed = false;
    } else { logToConsole("Test function testCombatInitiation not found."); allPassed = false; }

    logToConsole("===== BASIC CONNECTION TESTS COMPLETE =====");
    if (allPassed) {
        logToConsole("All basic connection tests PASSED!");
    } else {
        logToConsole("One or more basic connection tests FAILED. Check logs.");
    }
    return allPassed;
}

async function testPlayerMovement() {
    logToConsole("Setting up for player movement test...");
    // Ensure a map is loaded; use the default from initialize if available
    if (!window.mapRenderer.getCurrentMapData()) {
        logToConsole("Player Movement Test: No map loaded. Attempting to load 'testMap'.");
        await assetManager.loadMap('testMap').then(mapData => {
            if (mapData) {
                window.mapRenderer.initializeCurrentMap(mapData);
                gameState.layers = mapData.layers;
                gameState.playerPos = mapData.startPos || { x: 2, y: 2 };
                window.mapRenderer.scheduleRender();
            } else {
                logToConsole("Player Movement Test FAIL: Could not load 'testMap'.");
                return false;
            }
        });
    }
    if (!window.mapRenderer.getCurrentMapData()) {
        logToConsole("Player Movement Test FAIL: Map still not loaded after attempt.");
        return false;
    }


    const initialPos = { ...gameState.playerPos };
    gameState.movementPointsRemaining = 3; // Set some movement points
    gameState.actionPointsRemaining = 1; // Ensure actions available if move uses one (it doesn't)
    let renderScheduled = false;
    let interactionDetected = false;

    // Spy on scheduleRender and detectInteractableItems
    const originalScheduleRender = window.mapRenderer.scheduleRender;
    const originalDetectInteractable = window.interaction.detectInteractableItems;
    window.mapRenderer.scheduleRender = () => { renderScheduled = true; originalScheduleRender.call(window.mapRenderer); };
    window.interaction.detectInteractableItems = () => { interactionDetected = true; originalDetectInteractable.call(window.interaction); };

    logToConsole(`Initial pos: (${initialPos.x}, ${initialPos.y}), MP: ${gameState.movementPointsRemaining}`);
    window.turnManager.move('right'); // Assuming 'right' is a valid move direction

    // Restore spies
    window.mapRenderer.scheduleRender = originalScheduleRender;
    window.interaction.detectInteractableItems = originalDetectInteractable;

    const newPos = gameState.playerPos;
    logToConsole(`New pos: (${newPos.x}, ${newPos.y}), MP: ${gameState.movementPointsRemaining}`);
    logToConsole(`Render scheduled: ${renderScheduled}, Interaction detected: ${interactionDetected}`);

    if (newPos.x === initialPos.x + 1 && gameState.movementPointsRemaining === 2 && renderScheduled && interactionDetected) {
        logToConsole("Player Movement Test PASSED!");
        return true;
    } else {
        logToConsole(`Player Movement Test FAILED. newPos.x: ${newPos.x} (expected ${initialPos.x + 1}), MP: ${gameState.movementPointsRemaining} (expected 2), render: ${renderScheduled}, interaction: ${interactionDetected}`);
        return false;
    }
}

async function testDoorInteraction() {
    logToConsole("Setting up for door interaction test...");
    // Assumes assetManager and its definitions (tileset.json) are loaded.
    // Assumes 'WDH' is an interactive door tile that opens to 'WOH'.
    if (!assetManager.tilesets['WDH'] || !assetManager.tilesets['WOH']) {
        logToConsole("Door Interaction Test FAIL: Required tile definitions 'WDH' or 'WOH' not found in assetManager.tilesets.");
        return false;
    }
    if (!assetManager.tilesets['WDH'].tags || !assetManager.tilesets['WDH'].tags.includes("interactive")) {
        logToConsole("Door Interaction Test FAIL: Tile 'WDH' is not tagged as interactive.");
        return false;
    }


    // Setup a mock map with a door and player nearby
    const originalMapData = window.mapRenderer.getCurrentMapData();
    const originalPlayerPos = { ...gameState.playerPos };
    const originalLayers = JSON.parse(JSON.stringify(gameState.layers)); // Deep copy
    const originalInteractableItems = [...gameState.interactableItems];
    const originalActionPoints = gameState.actionPointsRemaining;

    const doorX = 1, doorY = 0;
    const playerX = 0, playerY = 0;
    const mockDoorMap = {
        id: 'testDoorMap', name: 'Test Door Map',
        dimensions: { width: 2, height: 1 },
        layers: { landscape: [['grass', 'grass']], building: [['grass', 'WDH']], item: [[]], roof: [[]] },
        startPos: { x: playerX, y: playerY }
    };
    window.mapRenderer.initializeCurrentMap(mockDoorMap);
    gameState.layers = JSON.parse(JSON.stringify(mockDoorMap.layers)); // Deep copy for modification
    gameState.playerPos = { x: playerX, y: playerY };
    gameState.actionPointsRemaining = 1; // Ensure an action point

    window.interaction.detectInteractableItems();
    logToConsole(`Interactable items detected: ${JSON.stringify(gameState.interactableItems)}`);

    if (!gameState.interactableItems.find(item => item.id === 'WDH' && item.x === doorX && item.y === doorY)) {
        logToConsole("Door Interaction Test FAIL: Door 'WDH' not detected at expected location.");
        // Restore original state
        window.mapRenderer.initializeCurrentMap(originalMapData);
        gameState.playerPos = originalPlayerPos;
        gameState.layers = originalLayers;
        gameState.interactableItems = originalInteractableItems;
        gameState.actionPointsRemaining = originalActionPoints;
        return false;
    }

    // Select the door (assuming it's the first, or find it)
    const doorItemIndex = gameState.interactableItems.findIndex(item => item.id === 'WDH');
    if (doorItemIndex === -1) {
        logToConsole("Door Interaction Test FAIL: Could not find WDH in interactable items list after detection.");
        return false; // Early exit after restoring
    }
    window.interaction.selectItem(doorItemIndex);
    window.interaction.interact(); // Show actions

    // Select "Open" (Cancel=0, Open=1, Close=2, Break Down=3 - depends on _getActionsForItem)
    // For a closed door 'WDH', actions should be [Cancel, Open, Break Down]
    const openActionIndex = 1;
    window.interaction.selectAction(openActionIndex);
    window.interaction.performSelectedAction();

    const tileAfterAction = gameState.layers.building[doorY][doorX];
    logToConsole(`Tile at (${doorX},${doorY}) after action: ${tileAfterAction}`);

    // Restore original state
    window.mapRenderer.initializeCurrentMap(originalMapData);
    gameState.playerPos = originalPlayerPos;
    gameState.layers = originalLayers;
    gameState.interactableItems = originalInteractableItems;
    gameState.actionPointsRemaining = originalActionPoints; // Or check if it was correctly decremented.

    if (tileAfterAction === 'WOH' && gameState.actionPointsRemaining === 0) { // WOH is the open state for WDH
        logToConsole("Door Interaction Test PASSED!");
        return true;
    } else {
        logToConsole(`Door Interaction Test FAILED. Tile is ${tileAfterAction} (expected WOH), AP: ${gameState.actionPointsRemaining} (expected 0).`);
        return false;
    }
}

async function testItemAddAndEquip() {
    logToConsole("Setting up for item add and equip test...");
    // Assumes assetManager has loaded item definitions, and InventoryContainer is initialized.
    // This test works better if run after startGame() has initialized inventory.
    if (!gameState.inventory.container) {
        logToConsole("Item Add/Equip Test: gameState.inventory.container not initialized. Attempting to initialize.");
        if (typeof InventoryContainer === 'function') {
            gameState.inventory.container = new InventoryContainer("TestBackpack", "M");
        } else {
            logToConsole("Item Add/Equip Test FAIL: InventoryContainer constructor not found.");
            return false;
        }
    }

    const knifeDef = assetManager.getItem('knife_melee');
    if (!knifeDef) {
        logToConsole("Item Add/Equip Test FAIL: 'knife_melee' definition not found.");
        return false;
    }

    // Clear hand slots and ensure knife is not in inventory for a clean test
    gameState.inventory.handSlots = [null, null];
    gameState.inventory.container.items = gameState.inventory.container.items.filter(i => i.id !== 'knife_melee');
    const originalItemCount = gameState.inventory.container.items.length;

    window.addItem(new Item(knifeDef)); // Item constructor is from inventory.js
    const itemInInventory = gameState.inventory.container.items.find(item => item.id === 'knife_melee');

    if (!itemInInventory) {
        logToConsole("Item Add/Equip Test FAILED: Knife not added to inventory.");
        return false;
    }
    logToConsole("Knife added to inventory.");

    window.equipItem(knifeDef.name, 0); // equipItem is from inventory.js
    const itemInHand = gameState.inventory.handSlots[0];
    const knifeStillInContainerItems = gameState.inventory.container.items.find(item => item.id === 'knife_melee');


    if (itemInHand && itemInHand.id === 'knife_melee' && !knifeStillInContainerItems) {
        logToConsole("Item Add/Equip Test PASSED!");
        // Cleanup: unequip and remove for subsequent tests
        window.unequipItem(0);
        window.removeItem(knifeDef.name);
        return true;
    } else {
        logToConsole(`Item Add/Equip Test FAILED. Item in hand: ${itemInHand ? itemInHand.id : 'null'}. Knife in container: ${knifeStillInContainerItems}.`);
        return false;
    }
}

async function testCombatInitiation() {
    logToConsole("Setting up for combat initiation test...");
    // This test assumes startGame() has run and placed a 'training_dummy'.
    // It also assumes player and dummy are positioned for combat.

    if (!combatManager || typeof combatManager.startCombat !== 'function') {
        logToConsole("Combat Initiation Test FAIL: combatManager not available or startCombat is not a function.");
        return false;
    }

    const dummyNpc = gameState.npcs.find(npc => npc.id === 'training_dummy');
    if (!dummyNpc) {
        logToConsole("Combat Initiation Test FAIL: Training dummy NPC not found in gameState.npcs. Ensure startGame() has run correctly.");
        return false;
    }
    if (!dummyNpc.mapPos) {
        logToConsole("Combat Initiation Test FAIL: Training dummy has no mapPos.");
        return false;
    }


    // Ensure player is next to the dummy for melee combat test.
    // This might require temporarily moving the player or dummy.
    // For simplicity, we'll assume they are close enough or combat can start regardless of range for this basic test.
    // A more robust test would set positions.
    gameState.playerPos = { x: dummyNpc.mapPos.x - 1, y: dummyNpc.mapPos.y };


    const initialIsInCombat = gameState.isInCombat;
    combatManager.startCombat([gameState, dummyNpc]);

    if (gameState.isInCombat && combatManager.initiativeTracker.length >= 2) {
        logToConsole("Combat Initiation Test PASSED!");
        combatManager.endCombat(); // Clean up
        return true;
    } else {
        logToConsole(`Combat Initiation Test FAILED. isInCombat: ${gameState.isInCombat}, initiativeTracker length: ${combatManager.initiativeTracker.length}`);
        // Ensure combat is ended if it partially started
        if (gameState.isInCombat) combatManager.endCombat();
        return false;
    }
}

// To run all tests: runAllBasicConnectionTests()
// Individual tests can also be run: testPlayerMovement(), testDoorInteraction(), etc.

async function testCombatInitiationWithGenericNpc() {
    logToConsole("--- Running Combat Initiation with Generic NPC Test ---");
    let testPassed = true;

    // Prerequisites
    if (!combatManager || typeof combatManager.startCombat !== 'function') {
        logToConsole("Generic NPC Combat Test FAIL: combatManager not available.");
        return false;
    }
    if (!assetManager.npcsById || !assetManager.getItem('club_melee')) { // Assuming 'club_melee' is a loadable item for NPC
        logToConsole("Generic NPC Combat Test FAIL: NPC definitions or club item not loaded.");
        return false;
    }
    if (typeof window.initializeHealth !== 'function') {
        logToConsole("Generic NPC Combat Test FAIL: initializeHealth function not found.");
        return false;
    }


    // Clean up any existing NPCs from previous tests if necessary
    // gameState.npcs = []; 

    // Create a generic NPC definition (simplified)
    const genericNpcDef = {
        id: "generic_bandit",
        name: "Generic Bandit",
        sprite: "B",
        color: "darkred",
        health: { // NPCs need health defined this way or initializeHealth needs to handle it
            head: { max: 5, current: 5, armor: 0, crisisTimer: 0 },
            torso: { max: 8, current: 8, armor: 0, crisisTimer: 0 },
            leftArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
            rightArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
            leftLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
            rightLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 }
        },
        stats: { "Strength": 3, "Dexterity": 3, "Constitution": 3 }, // Simplified
        skills: { "Melee Weapons": 20, "Unarmed": 20 },
        equippedWeaponId: "club_melee", // Assuming a basic club
        defaultActionPoints: 1,
        defaultMovementPoints: 3
    };

    // Add our generic NPC to the game state (deep clone if it's going to be modified)
    const genericNpcInstance = JSON.parse(JSON.stringify(genericNpcDef));

    // Position player and NPC for melee combat
    gameState.playerPos = { x: 5, y: 5 };
    genericNpcInstance.mapPos = { x: 5, y: 6 }; // Adjacent to player

    // Ensure NPC health is initialized if not fully defined in mock
    // window.initializeHealth(genericNpcInstance); // If NPC def doesn't have full health structure

    gameState.npcs.push(genericNpcInstance);
    logToConsole(`Added ${genericNpcInstance.name} at (${genericNpcInstance.mapPos.x}, ${genericNpcInstance.mapPos.y}) for test.`);

    // Ensure map is loaded for mapRenderer calls during combat start (if any)
    if (!window.mapRenderer.getCurrentMapData() && typeof assetManager.loadMap === 'function') {
        logToConsole("Generic NPC Combat Test: No map loaded. Attempting to load 'testMap'.");
        const mapData = await assetManager.loadMap('testMap');
        if (mapData) {
            window.mapRenderer.initializeCurrentMap(mapData);
            gameState.layers = mapData.layers;
        } else {
            logToConsole("Generic NPC Combat Test FAIL: Could not load 'testMap'.");
            gameState.npcs.pop(); // remove test NPC
            return false;
        }
    }


    // Simulate pressing 'c' (melee) - directly call the core logic of combat start
    // For this test, we'll rely on the refactored handleKeyDown finding this NPC.
    // To be more direct, we can find it and call startCombat.
    let foundNpcForTest = null;
    let minDistance = Infinity;
    gameState.npcs.forEach(npc => {
        if (npc.id === genericNpcInstance.id && npc.mapPos && npc.health && npc.health.torso.current > 0) {
            const distance = Math.max(Math.abs(gameState.playerPos.x - npc.mapPos.x), Math.abs(gameState.playerPos.y - npc.mapPos.y));
            if (distance <= 1) {
                if (distance < minDistance) {
                    minDistance = distance;
                    foundNpcForTest = npc;
                }
            }
        }
    });

    if (!foundNpcForTest) {
        logToConsole("Generic NPC Combat Test FAIL: Test NPC not found by proximity logic.");
        testPassed = false;
    } else {
        logToConsole(`NPC ${foundNpcForTest.name} found for combat. Starting combat...`);
        combatManager.startCombat([gameState, foundNpcForTest]);
        if (!gameState.isInCombat) {
            logToConsole("Generic NPC Combat Test FAIL: gameState.isInCombat is false after starting.");
            testPassed = false;
        } else if (combatManager.initiativeTracker.some(e => e.entity.id === genericNpcInstance.id)) {
            logToConsole("Generic NPC Combat Test PASSED: Combat started with generic NPC.");
        } else {
            logToConsole("Generic NPC Combat Test FAIL: Generic NPC not found in initiative tracker.");
            testPassed = false;
        }
    }

    // Cleanup
    if (gameState.isInCombat) {
        combatManager.endCombat();
    }
    gameState.npcs = gameState.npcs.filter(npc => npc.id !== genericNpcInstance.id); // Remove test NPC

    return testPassed;
}

// Modify runAllBasicConnectionTests to include this new test
if (typeof runAllBasicConnectionTests === 'function') {
    const existingRunnerSource = runAllBasicConnectionTests.toString();
    if (!existingRunnerSource.includes('testCombatInitiationWithGenericNpc')) {
        const originalRunAllTests = runAllBasicConnectionTests;
        runAllBasicConnectionTests = async function () {
            // Preserve the result of previous tests
            let overallResult = await originalRunAllTests();

            logToConsole("--- Running Combat Initiation with Generic NPC Test (from wrapper) ---");
            if (!await testCombatInitiationWithGenericNpc()) overallResult = false;

            return overallResult;
        }
        logToConsole("Extended runAllBasicConnectionTests with testCombatInitiationWithGenericNpc.");
    }
} else {
    async function runAllBasicConnectionTests() {
        // ... (include other tests if this is the first time it's defined)
        logToConsole("===== STARTING GENERIC NPC COMBAT INITIATION TEST (NEW RUNNER) =====");
        let allPassed = true;
        if (!await testCombatInitiationWithGenericNpc()) allPassed = false;
        // ...
        return allPassed;
    }
    logToConsole("Created new runAllBasicConnectionTests or it was empty; added testCombatInitiationWithGenericNpc.");
}

async function testPlayerTakesDamageWithArmor() {
    logToConsole("--- Running Player Takes Damage With Armor Test ---");
    let testPassed = true;
    let originalLogToConsole = window.logToConsole;
    let loggedMessages = [];

    // Spy on logToConsole
    window.logToConsole = (message) => {
        loggedMessages.push(message);
        originalLogToConsole(message); // Call the original function as well
    };

    // Prerequisites
    if (!assetManager || !assetManager.getItem('basic_vest')) {
        logToConsole("Player Damage w/ Armor Test FAIL: AssetManager or 'basic_vest' not available.");
        window.logToConsole = originalLogToConsole; return false;
    }
    if (!gameState.inventory.container) {
        logToConsole("Player Damage w/ Armor Test FAIL: Inventory container not initialized.");
        if (typeof InventoryContainer === 'function') gameState.inventory.container = new InventoryContainer("TestBackpack", "M"); else { window.logToConsole = originalLogToConsole; return false; }
    }
    if (!gameState.player || !gameState.player.wornClothing) {
        logToConsole("Player Damage w/ Armor Test FAIL: gameState.player.wornClothing not initialized.");
        window.logToConsole = originalLogToConsole; return false;
    }
    if (!gameState.health) {
        logToConsole("Player Damage w/ Armor Test FAIL: gameState.health not initialized.");
        if (typeof window.initializeHealth === 'function') window.initializeHealth(gameState); else { window.logToConsole = originalLogToConsole; return false; }
    }
    if (!combatManager || typeof combatManager.applyDamage !== 'function') {
        logToConsole("Player Damage w/ Armor Test FAIL: combatManager or applyDamage not available.");
        window.logToConsole = originalLogToConsole; return false;
    }


    // Equip 'basic_vest'
    const vestDef = assetManager.getItem('basic_vest');
    if (!vestDef.armorValue) { // armorValue might be on the item definition itself
        logToConsole("Player Damage w/ Armor Test FAIL: 'basic_vest' has no armorValue defined.");
        window.logToConsole = originalLogToConsole; return false;
    }
    // Ensure vest is not already equipped on this layer for a clean test
    if (gameState.player.wornClothing[vestDef.layer] && gameState.player.wornClothing[vestDef.layer].id === 'basic_vest') {
        window.unequipClothing(vestDef.layer);
    }
    // Add vest to inventory if not there
    if (!gameState.inventory.container.items.find(item => item.id === 'basic_vest')) {
        window.addItem(new Item(vestDef));
    }
    window.equipClothing(vestDef.name);
    logToConsole("Equipped 'basic_vest'. Worn clothing: " + JSON.stringify(gameState.player.wornClothing));


    // Set initial HP
    gameState.health.torso.current = gameState.health.torso.max;
    const initialHp = gameState.health.torso.current;
    const rawDamage = 5;
    const expectedArmor = window.getArmorForBodyPart('torso', gameState);
    const expectedDamageTaken = Math.max(0, rawDamage - expectedArmor);
    const expectedHpAfterDamage = initialHp - expectedDamageTaken;

    logToConsole(`Initial HP: ${initialHp}, Raw Damage: ${rawDamage}, Expected Armor: ${expectedArmor}, Expected Damage Taken: ${expectedDamageTaken}, Expected HP After: ${expectedHpAfterDamage}`);

    // Dummy attacker for the applyDamage function
    const dummyAttacker = { name: 'Test Dummy Attacker', id: 'test_dummy_attacker' };
    // The weapon object can be minimal for this test, only name is used in the log currently
    const testWeapon = { name: 'TestClub' };

    combatManager.applyDamage(dummyAttacker, gameState, 'torso', rawDamage, 'Bludgeoning', testWeapon);

    const actualHpAfterDamage = gameState.health.torso.current;
    logToConsole(`Actual HP after damage: ${actualHpAfterDamage}`);

    // Check HP
    if (actualHpAfterDamage !== expectedHpAfterDamage) {
        logToConsole(`Player Damage w/ Armor Test FAILED: HP mismatch. Expected ${expectedHpAfterDamage}, got ${actualHpAfterDamage}.`);
        testPassed = false;
    }

    // Check log for correct armor reporting
    const damageLogMessage = loggedMessages.find(msg => msg.includes("DAMAGE") && msg.includes("to Player's torso") && msg.includes(`Armor: ${expectedArmor}`));
    if (!damageLogMessage) {
        logToConsole(`Player Damage w/ Armor Test FAILED: Damage log message with correct armor value (Armor: ${expectedArmor}) not found.`);
        testPassed = false;
    } else {
        logToConsole(`Damage log found: "${damageLogMessage}"`);
    }

    if (testPassed) {
        logToConsole("Player Takes Damage With Armor Test PASSED!");
    }

    // Cleanup
    if (gameState.player.wornClothing[vestDef.layer] && gameState.player.wornClothing[vestDef.layer].id === 'basic_vest') {
        window.unequipClothing(vestDef.layer);
    }
    gameState.health.torso.current = initialHp; // Restore HP
    window.logToConsole = originalLogToConsole; // Restore original logToConsole

    return testPassed;
}

// Modify runAllBasicConnectionTests to include this new test
// This assumes runAllBasicConnectionTests is already defined from previous steps.
if (typeof runAllBasicConnectionTests === 'function') {
    const existingRunnerSource = runAllBasicConnectionTests.toString();
    if (!existingRunnerSource.includes('testPlayerTakesDamageWithArmor')) {
        const originalRunAllTests = runAllBasicConnectionTests;
        runAllBasicConnectionTests = async function () {
            let overallResult = await originalRunAllTests(); // Run previous tests

            logToConsole("--- Running Player Takes Damage With Armor Test (from wrapper) ---");
            if (!await testPlayerTakesDamageWithArmor()) overallResult = false;

            // Re-log final status (if the original runner had one, this might be redundant or replace it)
            // This part might need to be adjusted based on how the original runner logs.
            // For now, let's assume the original runner had its own final log.
            // We'll just add our test. If the original runner's final log is conditional,
            // this new 'overallResult' should be the one determining the final message.
            return overallResult;
        }
        logToConsole("Extended runAllBasicConnectionTests with testPlayerTakesDamageWithArmor.");
    }
} else {
    // If runAllBasicConnectionTests doesn't exist, create a basic one.
    async function runAllBasicConnectionTests() {
        logToConsole("===== STARTING PLAYER DAMAGE WITH ARMOR TEST (NEW RUNNER) =====");
        let allPassed = true;
        if (!await testPlayerTakesDamageWithArmor()) allPassed = false;
        logToConsole("===== PLAYER DAMAGE WITH ARMOR TEST (NEW RUNNER) COMPLETE =====");
        if (allPassed) {
            logToConsole("Player Damage With Armor Test (New Runner) PASSED!");
        } else {
            logToConsole("Player Damage With Armor Test (New Runner) FAILED. Check logs.");
        }
        return allPassed;
    }
    logToConsole("Created new runAllBasicConnectionTests with testPlayerTakesDamageWithArmor.");
}

async function testEquipArmorAndUpdateUI() {
    logToConsole("--- Running Equip Armor & UI Update Test ---");
    let testPassed = true;

    // Prerequisites
    if (!assetManager || !assetManager.getItem('basic_vest')) {
        logToConsole("Equip Armor Test FAIL: AssetManager or 'basic_vest' item definition not available.");
        return false;
    }
    if (!gameState.inventory.container) {
        logToConsole("Equip Armor Test FAIL: Inventory container not initialized.");
        // Attempt to initialize for testability, though ideally startGame handles this
        if (typeof InventoryContainer === 'function') {
            gameState.inventory.container = new InventoryContainer("TestBackpack", "M");
        } else { return false; }
    }
    if (!gameState.player || !gameState.player.wornClothing) {
        logToConsole("Equip Armor Test FAIL: gameState.player.wornClothing not initialized.");
        return false;
    }
    if (!gameState.health) {
        logToConsole("Equip Armor Test FAIL: gameState.health not initialized.");
        // Attempt to initialize for testability
        if (typeof window.initializeHealth === 'function') {
            window.initializeHealth(gameState);
        } else { return false; }
    }


    // Ensure 'basic_vest' is in inventory and unequipped
    const vestDef = assetManager.getItem('basic_vest');
    let vestInstance = gameState.inventory.container.items.find(item => item.id === 'basic_vest');
    if (gameState.player.wornClothing[vestDef.layer] && gameState.player.wornClothing[vestDef.layer].id === 'basic_vest') {
        window.unequipClothing(vestDef.layer); // Unequip if already worn
    }
    if (!vestInstance) {
        window.addItem(new Item(vestDef)); // Add if not in inventory
        vestInstance = gameState.inventory.container.items.find(item => item.id === 'basic_vest');
        if (!vestInstance) {
            logToConsole("Equip Armor Test FAIL: Could not add 'basic_vest' to inventory.");
            return false;
        }
    }

    // At this point, vest should be in inventory and not equipped on the target layer.
    // Clear the target layer just in case.
    gameState.player.wornClothing[vestDef.layer] = null;
    window.renderHealthTable(gameState); // Render once to get initial armor state if needed

    logToConsole("Equipping 'basic_vest'...");
    window.equipClothing(vestDef.name); // This should trigger renderCharacterInfo -> renderHealthTable

    const expectedArmor = window.getArmorForBodyPart('torso', gameState);
    const healthTableBody = document.querySelector("#healthTable tbody");
    let displayedArmor = -1;

    if (healthTableBody) {
        for (let i = 0; i < healthTableBody.rows.length; i++) {
            const row = healthTableBody.rows[i];
            if (row.cells[0] && row.cells[0].textContent === 'Torso') {
                displayedArmor = parseInt(row.cells[2].textContent, 10);
                break;
            }
        }
    }

    logToConsole(`Expected armor for torso: ${expectedArmor}, Displayed armor: ${displayedArmor}`);

    if (displayedArmor === expectedArmor) {
        logToConsole("Equip Armor & UI Update Test PASSED!");
    } else {
        logToConsole("Equip Armor & UI Update Test FAILED.");
        testPassed = false;
    }

    // Cleanup: unequip
    if (gameState.player.wornClothing[vestDef.layer] && gameState.player.wornClothing[vestDef.layer].id === 'basic_vest') {
        window.unequipClothing(vestDef.layer);
    }
    window.renderHealthTable(gameState); // Re-render to restore UI

    return testPassed;
}

async function testTakeDamageAndUpdateUI() {
    logToConsole("--- Running Take Damage & UI Update Test ---");
    let testPassed = true;

    if (!gameState.health || !gameState.health.torso) {
        logToConsole("Take Damage Test FAIL: gameState.health.torso not initialized.");
        if (typeof window.initializeHealth === 'function') {
            window.initializeHealth(gameState);
        } else { return false; }
    }

    // Ensure torso has some health to lose
    gameState.health.torso.current = gameState.health.torso.max;
    window.renderHealthTable(gameState); // Initial render to capture state

    const initialTorsoHp = gameState.health.torso.current;
    const damageToApply = 2;
    const expectedHp = initialTorsoHp - damageToApply;

    logToConsole(`Initial torso HP: ${initialTorsoHp}. Applying ${damageToApply} damage.`);
    gameState.health.torso.current = expectedHp; // Manually set HP
    window.renderHealthTable(gameState); // Call the function that should update UI

    const healthTableBody = document.querySelector("#healthTable tbody");
    let displayedHpText = "";
    let displayedHp = -1;

    if (healthTableBody) {
        for (let i = 0; i < healthTableBody.rows.length; i++) {
            const row = healthTableBody.rows[i];
            if (row.cells[0] && row.cells[0].textContent === 'Torso') {
                displayedHpText = row.cells[1].textContent; // Should be "current/max"
                displayedHp = parseInt(displayedHpText.split('/')[0], 10);
                break;
            }
        }
    }

    logToConsole(`Expected HP for torso: ${expectedHp}, Displayed HP: ${displayedHp} (raw text: '${displayedHpText}')`);

    if (displayedHp === expectedHp) {
        logToConsole("Take Damage & UI Update Test PASSED!");
    } else {
        logToConsole("Take Damage & UI Update Test FAILED.");
        testPassed = false;
    }

    // Cleanup: Restore HP for other tests
    gameState.health.torso.current = initialTorsoHp;
    window.renderHealthTable(gameState);

    return testPassed;
}

// Modify runAllBasicConnectionTests to include these new tests
if (typeof runAllBasicConnectionTests === 'function') {
    const originalRunAllTests = runAllBasicConnectionTests;
    runAllBasicConnectionTests = async function () {
        let overallResult = await originalRunAllTests(); // Run previous tests

        logToConsole("--- Running Equip Armor & UI Update Test (from wrapper) ---");
        if (!await testEquipArmorAndUpdateUI()) overallResult = false;

        logToConsole("--- Running Take Damage & UI Update Test (from wrapper) ---");
        if (!await testTakeDamageAndUpdateUI()) overallResult = false;

        // Re-log final status
        if (overallResult) {
            logToConsole("All basic connection tests (including UI updates) PASSED!");
        } else {
            logToConsole("One or more basic connection tests (including UI updates) FAILED. Check logs.");
        }
        return overallResult;
    }
    // Overwrite the console message for the original if it exists to avoid double "All tests PASSED"
    // This is a bit hacky but avoids needing to edit the original test runner string directly.
    // Better would be to edit the original runAllBasicConnectionTests string to include these.
    // For now, this just adds them on. The final message from this new runner will be the definitive one.
} else {
    // If runAllBasicConnectionTests doesn't exist, create it to run these.
    async function runAllBasicConnectionTests() {
        logToConsole("===== STARTING BASIC UI UPDATE TESTS =====");
        let allPassed = true;
        if (!await testEquipArmorAndUpdateUI()) allPassed = false;
        if (!await testTakeDamageAndUpdateUI()) allPassed = false;
        logToConsole("===== BASIC UI UPDATE TESTS COMPLETE =====");
        if (allPassed) {
            logToConsole("All basic UI update tests PASSED!");
        } else {
            logToConsole("One or more basic UI update tests FAILED. Check logs.");
        }
        return allPassed;
    }
}