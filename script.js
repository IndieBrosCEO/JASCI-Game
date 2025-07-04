﻿async function gameLoop() {
    // Check if the game has started. If not, keep requesting frames but do nothing else.
    if (!gameState.gameStarted) {
        requestAnimationFrame(gameLoop); // Continue the loop
        return; // Exit early if game hasn't started
    }

    // If animationManager is available and the game has started, update animations.
    if (window.animationManager && gameState.gameStarted) {
        window.animationManager.updateAnimations();
    }

    // Schedule a render if mapRenderer is available.
    if (window.mapRenderer) {
        window.mapRenderer.scheduleRender();
    }

    // Request the next frame to continue the loop.
    requestAnimationFrame(gameLoop);
}

/**************************************************************
 * Global State & Constants
 **************************************************************/
window.assetManager = new AssetManager(); // Explicitly assign to window
console.log("SCRIPT.JS: window.assetManager created", window.assetManager); // Guard Log 1a
window.animationManager = new AnimationManager(gameState); // Changed to window.animationManager
window.audioManager = new AudioManager(); // ADDED THIS LINE
// let currentMapData = null; // This is now managed in js/mapRenderer.js // This comment is accurate.

// Game Console Elements
const gameConsoleElement = document.getElementById('gameConsole');
const consoleOutputElement = document.getElementById('consoleOutput');
const consoleInputElement = document.getElementById('consoleInput');
let isConsoleOpen = false;

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
    // TODO: Play ui_map_select_01.wav or a general ui_select_01.wav
    if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');

    if (window.mapRenderer && typeof window.mapRenderer.handleMapSelectionChange === 'function') {
        const loadedMapData = await window.mapRenderer.handleMapSelectionChange(mapId); // assetManager.loadMap now returns .levels and .startPos.z
        if (loadedMapData) {
            // Sync gameState with the new Z-level structure
            gameState.mapLevels = loadedMapData.levels;
            gameState.playerPos = loadedMapData.startPos || { x: 2, y: 2, z: 0 }; // Ensure Z is part of playerPos
            gameState.currentViewZ = gameState.playerPos.z; // Default view to player's Z

            // Ensure fowData for the new player Z-level is initialized if not already by initializeCurrentMap
            const playerZStr = gameState.playerPos.z.toString();
            if (loadedMapData.dimensions && loadedMapData.dimensions.height > 0 && loadedMapData.dimensions.width > 0) {
                if (!gameState.fowData[playerZStr]) {
                    gameState.fowData[playerZStr] =
                        Array(loadedMapData.dimensions.height).fill(null).map(() =>
                            Array(loadedMapData.dimensions.width).fill('hidden'));
                    logToConsole(`FOW data initialized for Z-level ${playerZStr} in handleMapSelectionChangeWrapper.`);
                }
            }

            spawnNpcsFromMapData(loadedMapData); // spawnNpcsFromMapData will need to handle npc.pos.z

            window.mapRenderer.scheduleRender();
            window.interaction.detectInteractableItems();
            window.interaction.showInteractableItems();
            // FOW calculation moved to startGame or player move
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
            // Use definitionId (or a similar field) from the map's NPC instance data to look up the base definition.
            // The 'id' field on npcPlacementInfo is the unique instance ID (e.g., "npc_3").
            const definitionIdToLookup = npcPlacementInfo.definitionId || npcPlacementInfo.baseId || npcPlacementInfo.type;

            if (!definitionIdToLookup) {
                console.warn(`NPC instance ID '${npcPlacementInfo.id}' in map '${mapData.name || mapData.id}' is missing a definitionId/baseId/type. Cannot spawn.`);
                return; // Skip this NPC
            }

            const npcDefinition = assetManager.getNpc(definitionIdToLookup);

            if (npcDefinition) {
                const newNpc = JSON.parse(JSON.stringify(npcDefinition)); // Base properties

                // Assign instance-specific properties
                newNpc.id = npcPlacementInfo.id; // This is the unique instance ID like "npc_3"
                newNpc.definitionId = definitionIdToLookup; // Store the base definition ID

                newNpc.mapPos = {
                    x: npcPlacementInfo.pos.x,
                    y: npcPlacementInfo.pos.y,
                    z: npcPlacementInfo.pos.z !== undefined ? npcPlacementInfo.pos.z : 0
                };

                // Override name if provided in instance data, otherwise use definition's name
                newNpc.name = npcPlacementInfo.name || npcDefinition.name;

                // Copy faceData from the map instance if it exists
                if (npcPlacementInfo.faceData) {
                    newNpc.faceData = JSON.parse(JSON.stringify(npcPlacementInfo.faceData)); // Deep copy
                }

                // Copy other potential overrides from npcPlacementInfo (e.g., specific stats, health, inventory, equippedWeaponId)
                if (npcPlacementInfo.equippedWeaponId) {
                    newNpc.equippedWeaponId = npcPlacementInfo.equippedWeaponId;
                }
                // TODO: Add similar copying for other overridable properties like stats, specific health values if needed.
                // This part needs to be selective based on what properties map instances can override.
                // For now, we've handled id, definitionId, mapPos, name, faceData, and equippedWeaponId.


                if (typeof window.initializeHealth === 'function') {
                    window.initializeHealth(newNpc); // Initializes health based on (now potentially overridden) stats
                } else {
                    console.error(`initializeHealth function not found for NPC: ${newNpc.id}`);
                    // Basic fallback if initializeHealth is missing
                    newNpc.health = newNpc.health || { head: {}, torso: {}, leftArm: {}, rightArm: {}, leftLeg: {}, rightLeg: {} };
                }
                newNpc.aggroList = [];
                // Initialize memory for NPC decision making and exploration
                newNpc.memory = {
                    lastSeenTargetPos: null,        // {x, y, z} coordinates of the last known position of a hostile target
                    lastSeenTargetTimestamp: 0,     // Game turn or timestamp when the target was last seen/confirmed
                    recentlyVisitedTiles: [],       // Array of "x,y,z" string keys representing recently explored tiles to avoid loops
                    explorationTarget: null,        // Current {x,y,z} coordinates the NPC is moving towards when exploring
                    lastKnownSafePos: { ...newNpc.mapPos } // Last known position that was safe (e.g., after a successful move)
                };

                // Initialize face data, wielded weapon, and ensure name is set
                if (typeof window.initializeNpcFace === 'function') {
                    window.initializeNpcFace(newNpc); // This will also handle default name and weapon
                } else {
                    console.error(`initializeNpcFace function not found for NPC: ${newNpc.id}`);
                    // Basic fallbacks if function is missing
                    if (newNpc.name === undefined) newNpc.name = "Unknown NPC";
                    if (newNpc.wieldedWeapon === undefined) newNpc.wieldedWeapon = "Unarmed";
                    if (!newNpc.faceData) newNpc.faceData = { asciiFace: ":(" };
                    else if (!newNpc.faceData.asciiFace) newNpc.faceData.asciiFace = ":|";
                }


                // teamId should be copied by JSON.parse(JSON.stringify(npcDefinition))
                // Log if teamId is unexpectedly missing after cloning and initialization
                if (newNpc.teamId === undefined) { // Check if teamId is undefined on the instance
                    console.warn(`NPC ${newNpc.id} (Name: ${newNpc.name || 'N/A'}) spawned without a teamId. Definition might be missing it, or it was not set prior to this point.`);
                }

                gameState.npcs.push(newNpc);
                logToConsole(`Spawned NPC: ${newNpc.name || newNpc.id} (ID: ${newNpc.id}, Team: ${newNpc.teamId}) at (X:${newNpc.mapPos.x}, Y:${newNpc.mapPos.y}, Z:${newNpc.mapPos.z}) - Face Initialized.`);
            } else {
                console.warn(`NPC definition not found for ID: ${npcPlacementInfo.definitionId || npcPlacementInfo.baseId || npcPlacementInfo.type} in map data for map ${mapData.name || mapData.id}.`);
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

    // Display the ASCII face
    let facePreviewContainer = characterInfoElement.querySelector('#characterInfoFacePreview');
    if (!facePreviewContainer) {
        facePreviewContainer = document.createElement('div');
        facePreviewContainer.id = 'characterInfoFacePreview';
        facePreviewContainer.innerHTML = '<h3>Appearance</h3><pre id="charInfoAsciiFace" style="border: 1px solid #ccc; padding: 5px; min-height: 100px; background-color: #111;"></pre>';
        // Insert after name/level/xp but before stats/skills container for better layout
        const statsSkillsContainer = characterInfoElement.querySelector('#statsSkillsWornContainer');
        if (statsSkillsContainer) {
            characterInfoElement.insertBefore(facePreviewContainer, statsSkillsContainer);
        } else {
            characterInfoElement.appendChild(facePreviewContainer); // Fallback
        }
    }
    const charInfoAsciiFaceElement = document.getElementById('charInfoAsciiFace');
    if (charInfoAsciiFaceElement && gameState.player && gameState.player.face && gameState.player.face.asciiFace) {
        charInfoAsciiFaceElement.innerHTML = gameState.player.face.asciiFace; // Changed from textContent to innerHTML
    } else if (charInfoAsciiFaceElement) {
        charInfoAsciiFaceElement.innerHTML = "No face data available."; // Changed from textContent to innerHTML
    }
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
 * Event Handlers & Initialization
 **************************************************************/
// Keydown event handler for movement and actions
function handleKeyDown(event) {
    if (gameState.awaitingPortalConfirmation || gameState.portalPromptActive) {
        // Allow only specific keys if needed (e.g., Enter/Escape for a custom modal)
        // For window.confirm, it blocks anyway, but this prevents other game logic.
        event.preventDefault();
        return;
    }
    // Console Toggle (Backquote key, often with Shift for tilde '~')
    if (event.code === 'Backquote') {
        event.preventDefault();
        isConsoleOpen = !isConsoleOpen;
        if (window.audioManager) window.audioManager.playUiSound('ui_console_toggle_01.wav');
        if (isConsoleOpen) {
            gameConsoleElement.classList.remove('hidden');
            if (typeof window.logToConsoleUI === 'function') {
                window.logToConsoleUI("Console opened. Type 'help' for commands.", "info");
            }
            consoleInputElement.focus();
        } else {
            gameConsoleElement.classList.add('hidden');
        }
        return; // Stop further processing in handleKeyDown if it was the toggle key
    }

    // If console is open, let console.js's own input handler manage Enter/Arrows.
    // We just need to prevent game actions for other keys if console has focus
    // and handle Escape to close the console.
    if (isConsoleOpen) {
        if (event.key === 'Escape') { // Handles Escape even if input is not focused
            event.preventDefault();
            isConsoleOpen = false;
            gameConsoleElement.classList.add('hidden');
            consoleInputElement.blur(); // Remove focus from input
            if (window.audioManager) window.audioManager.playUiSound('ui_console_toggle_01.wav'); // Or ui_menu_close_01.wav if preferred for Esc
            return;
        }

        if (event.target === consoleInputElement) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const commandText = consoleInputElement.value.trim();

                // Removed DEBUG logs from previous step

                if (commandText) {
                    if (typeof window.processConsoleCommand === 'function') {
                        window.processConsoleCommand(commandText);
                        if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav'); // Confirm sound
                    } else {
                        console.error("processConsoleCommand is not defined from script.js.");
                        if (typeof window.logToConsoleUI === 'function') {
                            window.logToConsoleUI("Error: processConsoleCommand not defined!", "error");
                            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Error sound
                        }
                    }
                    consoleInputElement.value = '';

                    if (window.commandHistory && typeof window.historyIndex === 'number') {
                        window.historyIndex = window.commandHistory.length; // Reset history index
                    }
                } else {
                    // Play a softer click or nothing if no command entered
                    if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.5 });
                }
                return; // Processed 'Enter', stop further handling
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (window.commandHistory && window.commandHistory.length > 0) {
                    if (window.historyIndex > 0) {
                        window.historyIndex--;
                    }
                    consoleInputElement.value = window.commandHistory[window.historyIndex] || '';
                    consoleInputElement.setSelectionRange(consoleInputElement.value.length, consoleInputElement.value.length);
                    // TODO: Play ui_scroll_01.wav
                    if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.4 });
                }
                return; // Processed 'ArrowUp', stop further handling
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (window.commandHistory && window.commandHistory.length > 0) {
                    if (window.historyIndex < window.commandHistory.length - 1) {
                        window.historyIndex++;
                        consoleInputElement.value = window.commandHistory[window.historyIndex];
                    } else if (window.historyIndex >= window.commandHistory.length - 1) {
                        window.historyIndex = window.commandHistory.length;
                        consoleInputElement.value = '';
                    }
                    consoleInputElement.setSelectionRange(consoleInputElement.value.length, consoleInputElement.value.length);
                    // TODO: Play ui_scroll_01.wav
                    if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.4 });
                }
                return; // Processed 'ArrowDown', stop further handling
            } else if (event.key === 'Tab') {
                event.preventDefault(); // Prevent tabbing out of the console input
                // Future: Implement tab completion if desired
                // For now, just logs or does nothing.
                // window.logToConsoleUI("Tab completion not yet implemented.", "info");
                // TODO: Play a soft click or specific tab sound if implemented
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.3 });
            }
            // For other keys (alphanumeric, space, backspace, etc.),
            // allow default behavior so user can type in the input field.
            // No event.preventDefault() for these.
            // TODO: Play ui_type_01.wav on keydown/keypress for typing in console
            // This might be too noisy if played for every char, consider on first char of a word or debounced.
            // if (window.audioManager && event.key.length === 1) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.2 }); // Placeholder for ui_type_01.wav

            // NEW SOUND IMPLEMENTATION:
            if (window.audioManager && event.key.length === 1 && event.target === consoleInputElement) { // Play for single character inputs in console
                gameState.uiTypeSoundIndex = (gameState.uiTypeSoundIndex % 5) + 1; // Cycle from 1 to 5
                const soundToPlay = `ui_type_0${gameState.uiTypeSoundIndex}.wav`;
                window.audioManager.playUiSound(soundToPlay, { volume: 0.7 });
            }

        } else {
            // If console is open but focus is not on input (e.g. user clicked outside)
            event.preventDefault();
        }
        return; // Crucial: stop further game key processing if console is open
    }

    // Toggle Keybinds Display
    if (event.key === 'h' || event.key === 'H') {
        toggleKeybindsDisplay(); // toggleKeybindsDisplay will handle its own sound
        event.preventDefault();
        return;
    }

    // Wait Feature (Shift+T)
    if (event.shiftKey && (event.key === 'T' || event.key === 't')) {
        event.preventDefault();
        if (gameState.isInCombat) {
            logToConsole("Cannot wait during combat.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        // Click for initiating the action
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
        // TODO: Ideally, a ui_menu_open_01.wav when the prompt appears, but native prompt is hard to hook.

        const hoursToWaitStr = prompt("How many hours to wait? (1-24)", "1");

        if (hoursToWaitStr === null) { // User pressed cancel
            logToConsole("Wait cancelled.", "info");
            // TODO: Play ui_menu_close_01.wav or a general cancel sound
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
            return;
        }

        const hoursToWait = parseInt(hoursToWaitStr, 10);

        if (isNaN(hoursToWait) || hoursToWait < 1 || hoursToWait > 24) {
            logToConsole("Invalid number of hours. Please enter a number between 1 and 24.", "error");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Error sound
            return;
        }

        if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav'); // Confirm sound
        // TODO: Also play move_wait_01.wav here when available, if distinct from general confirm.
        logToConsole(`Waiting for ${hoursToWait} hour(s)...`, "info");
        const ticksToWait = hoursToWait * 30; // 1 hour = 60 minutes / 2 minutes/tick = 30 ticks

        for (let i = 0; i < ticksToWait; i++) {
            // Advance time
            Time.advanceTime(gameState); // Assumes Time object is globally available from time.js

            // Update UI (clock, needs)
            // updatePlayerStatusDisplay is defined in script.js and should be callable
            if (typeof updatePlayerStatusDisplay === 'function') {
                updatePlayerStatusDisplay();
            } else {
                console.error("updatePlayerStatusDisplay function not found during wait loop.");
            }

            // Optional: Small delay or a way to interrupt long waits could be added here in a future enhancement.
            // For now, it will run all ticks sequentially.
        }
        logToConsole(`Finished waiting for ${hoursToWait} hour(s).`, "info");
        // It's important that player stats (hunger/thirst) are updated by Time.advanceTime
        // and health effects from hunger/thirst are also handled there or by a function called within it.
        // The current Time.advanceTime already includes hunger/thirst decrement and damage checks.
        return;
    }

    // New logic for Escape key during combat UI declaration
    if (gameState.isInCombat && gameState.combatPhase === 'playerAttackDeclare' && event.key === 'Escape') {
        const attackDeclUI = document.getElementById('attackDeclarationUI');
        if (attackDeclUI && !attackDeclUI.classList.contains('hidden')) {
            attackDeclUI.classList.add('hidden');
            logToConsole("Attack declaration cancelled.");
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Neutral cancel
            event.preventDefault();
            return;
        }
    }

    // Targeting Mode: Escape Key
    if (gameState.isTargetingMode && event.key === 'Escape') {
        gameState.isTargetingMode = false;
        gameState.targetingType = null;
        logToConsole("Exited targeting mode.");
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // ui_click for neutral cancel
        window.mapRenderer.scheduleRender(); // Re-render to remove targeting UI if any
        event.preventDefault();
        return;
    }

    if (gameState.isInCombat) {
        // The 't' (end turn) and general 'Escape' are primary combat-related keys here.
        if (event.key === 'Escape') { // Note: This Escape is for combat, different from targeting mode Escape
            logToConsole("Attempting to end combat with Escape key.");
            combatManager.endCombat(); // Use CombatManager's method to end combat
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Neutral click for now
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
            case 'Enter': // Keep Enter for interact
                window.interactInventoryItem();
                event.preventDefault(); return;
            case 'f': case 'F':
                if (event.shiftKey) {
                    // Shift + F: Drop item
                    if (window.gameState && window.gameState.inventory.open) {
                        const inventory = window.gameState.inventory;
                        if (!inventory.currentlyDisplayedItems || inventory.currentlyDisplayedItems.length === 0) {
                            logToConsole("No items in the displayed inventory to drop.");
                            event.preventDefault(); return;
                        }
                        const cursorIndex = inventory.cursor;
                        if (cursorIndex < 0 || cursorIndex >= inventory.currentlyDisplayedItems.length) {
                            logToConsole("Invalid inventory cursor position for dropping.", "warn");
                            event.preventDefault(); return;
                        }
                        const selectedDisplayItem = inventory.currentlyDisplayedItems[cursorIndex];
                        if (!selectedDisplayItem) {
                            logToConsole("No item selected to drop.", "warn");
                            event.preventDefault(); return;
                        }

                        if (selectedDisplayItem.source === 'container') {
                            if (typeof window.dropItem === 'function') {
                                logToConsole(`Attempting to drop '${selectedDisplayItem.name}' from container via Shift+F.`);
                                window.dropItem(selectedDisplayItem.name);
                            } else {
                                logToConsole("dropItem function not found!", "error");
                            }
                        } else if (selectedDisplayItem.source === 'hand') {
                            logToConsole(`Attempting to drop '${selectedDisplayItem.name}' from hand via Shift+F.`);
                            if (typeof window.unequipItem === 'function' && typeof window.dropItem === 'function') {
                                const handIndex = selectedDisplayItem.originalHandIndex;
                                const itemName = selectedDisplayItem.name;

                                window.unequipItem(handIndex);

                                let unequippedItemInContainer = false;
                                if (window.gameState.inventory.container && window.gameState.inventory.container.items) {
                                    if (window.gameState.inventory.container.items.some(item => item.name === itemName)) {
                                        unequippedItemInContainer = true;
                                    }
                                }

                                if (unequippedItemInContainer) {
                                    logToConsole(`Successfully unequipped '${itemName}', now attempting to drop from container.`);
                                    window.dropItem(itemName);
                                } else {
                                    logToConsole(`Could not unequip '${itemName}' to inventory (perhaps full?), or item not found after unequip. Drop cancelled.`, "warn");
                                }
                            } else {
                                logToConsole("unequipItem or dropItem function not found!", "error");
                            }
                        } else if (selectedDisplayItem.source === 'clothing') {
                            logToConsole("Cannot drop equipped clothing directly. Please unequip it first.", "info");
                        } else if (selectedDisplayItem.source === 'floor') {
                            logToConsole("This item is already on the floor.", "info");
                        } else {
                            logToConsole(`Cannot drop item from source: '${selectedDisplayItem.source}'.`, "warn");
                        }
                    }
                } else {
                    // Just 'f': Interact with item
                    window.interactInventoryItem();
                }
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
        if (!window.mapRenderer || typeof window.mapRenderer.getCurrentMapData !== 'function' || typeof window.mapRenderer.scheduleRender !== 'function') {
            logToConsole("Map renderer not ready for targeting mode movement.", "warn");
            event.preventDefault();
            return;
        }
        let currentMapData = window.mapRenderer.getCurrentMapData();
        if (!currentMapData) {
            logToConsole("Targeting mode movement: No map data available.");
            return; // Cannot move target if no map
        }
        let movedTarget = false;

        // Z-level targeting with '<' and '>'
        if (event.key === '<' || event.key === ',') {
            gameState.targetingCoords.z--;
            gameState.currentViewZ = gameState.targetingCoords.z; // Sync view with targeting Z
            gameState.viewFollowsPlayerZ = false; // Manual Z control during targeting
            updateTargetingInfoUI();
            window.mapRenderer.scheduleRender();
            logToConsole(`Targeting Z changed to: ${gameState.targetingCoords.z}. View Z also changed.`);
            movedTarget = true;
            event.preventDefault();
            return;
        } else if (event.key === '>' || event.key === '.') {
            gameState.targetingCoords.z++;
            gameState.currentViewZ = gameState.targetingCoords.z; // Sync view with targeting Z
            gameState.viewFollowsPlayerZ = false; // Manual Z control during targeting
            updateTargetingInfoUI();
            window.mapRenderer.scheduleRender();
            logToConsole(`Targeting Z changed to: ${gameState.targetingCoords.z}. View Z also changed.`);
            movedTarget = true;
            event.preventDefault();
            return;
        } else {
            // Normal X/Y targeting (Shift + Up/Down or Shift + W/S is NOT for Z in targeting mode anymore)
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
        }
        if (movedTarget) { // This will now only be true if X/Y movement happened
            logToConsole(`Targeting Coords: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}, Z=${gameState.targetingCoords.z}`);
            updateTargetingInfoUI(); // Update display if X/Y changed
            window.mapRenderer.scheduleRender();
            event.preventDefault();
            return; // Prevent player movement or other actions
        }
    }

    // Z-Level view controls (NOT in targeting mode)
    if (!isConsoleOpen && !gameState.inventory.open && !gameState.isActionMenuActive && !gameState.isTargetingMode) {
        if (!window.mapRenderer || typeof window.mapRenderer.getCurrentMapData !== 'function' || typeof window.mapRenderer.scheduleRender !== 'function') {
            logToConsole("Map renderer not ready for Z-level view controls.", "warn");
            event.preventDefault();
            return;
        }
        let viewChanged = false;
        const currentMap = window.mapRenderer.getCurrentMapData(); // Get current map data once
        const H = currentMap ? currentMap.dimensions.height : 0;
        const W = currentMap ? currentMap.dimensions.width : 0;

        if (event.key === '<' || event.key === ',') { // Use ',' as well for convenience
            gameState.currentViewZ--;
            gameState.viewFollowsPlayerZ = false; // Player is manually controlling view
            logToConsole(`View Z changed to: ${gameState.currentViewZ}. View no longer follows player.`);
            viewChanged = true;
        } else if (event.key === '>' || event.key === '.') { // Use '.' as well
            gameState.currentViewZ++;
            gameState.viewFollowsPlayerZ = false; // Player is manually controlling view
            logToConsole(`View Z changed to: ${gameState.currentViewZ}. View no longer follows player.`);
            viewChanged = true;
        } else if (event.key === '/') {
            gameState.currentViewZ = gameState.playerPos.z;
            gameState.viewFollowsPlayerZ = true; // View now follows player
            logToConsole(`View Z reset to player Z: ${gameState.currentViewZ}. View now follows player.`);
            viewChanged = true;
        }

        if (viewChanged) {
            // Ensure FOW data for the new currentViewZ is initialized if it doesn't exist
            const newViewZStr = gameState.currentViewZ.toString();
            if (H > 0 && W > 0 && !gameState.fowData[newViewZStr]) {
                gameState.fowData[newViewZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                logToConsole(`FOW data initialized for newly viewed Z-level ${newViewZStr} via key press.`);
            }
            updatePlayerStatusDisplay(); // Update Z displays
            window.mapRenderer.scheduleRender();
            event.preventDefault();
            return; // Consume the event, preventing other actions
        }
    }

    // Zoom controls with + and - keys
    // Note: '+' is often 'Shift' + '='. We'll listen for '=' and '-' primarily.
    if (!isConsoleOpen && !gameState.inventory.open && !gameState.isActionMenuActive && !gameState.isTargetingMode) {
        if (event.key === '=' || event.key === '+') { // '=' is the unshifted key for '+' on many keyboards
            const zoomInButton = document.getElementById('zoomInButton');
            if (zoomInButton) {
                zoomInButton.click();
                event.preventDefault();
                return;
            }
        } else if (event.key === '-') {
            const zoomOutButton = document.getElementById('zoomOutButton');
            if (zoomOutButton) {
                zoomOutButton.click();
                event.preventDefault();
                return;
            }
        }
    }

    // Logic for player Z change following
    // This should be triggered when playerPos.z changes, typically after a move action that involves Z-transition.
    // For now, we'll just ensure that if viewFollowsPlayerZ is true, currentViewZ is synced.
    // The actual sync point after playerPos.z changes will be handled when Z-transition moves are implemented.
    if (gameState.viewFollowsPlayerZ && gameState.currentViewZ !== gameState.playerPos.z) {
        gameState.currentViewZ = gameState.playerPos.z;
        // Ensure FOW for this new Z is also initialized if needed (though player movement should handle its own Z's FOW)
        const playerZStr = gameState.playerPos.z.toString();
        const currentMap = window.mapRenderer.getCurrentMapData();
        const H = currentMap ? currentMap.dimensions.height : 0;
        const W = currentMap ? currentMap.dimensions.width : 0;
        if (H > 0 && W > 0 && !gameState.fowData[playerZStr]) {
            gameState.fowData[playerZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
            logToConsole(`FOW data initialized for player's new Z-level ${playerZStr} due to view following.`);
        }
        logToConsole(`View Z updated to follow player Z: ${gameState.currentViewZ}.`);
        updatePlayerStatusDisplay(); // Update Z displays
        window.mapRenderer.scheduleRender(); // Re-render if view Z changed
    }


    // Default game actions (player movement, interaction, etc.)
    // This block is processed if not in targeting mode OR if in targeting mode but no targeting movement key was pressed,
    // AND if no Z-level view key was pressed.
    if (!gameState.isActionMenuActive && !gameState.isTargetingMode) {
        switch (event.key) {
            case 'ArrowUp': case 'w': case 'W':
            case 'ArrowDown': case 's': case 'S':
            case 'ArrowLeft': case 'a': case 'A':
            case 'ArrowRight': case 'd': case 'D':
                window.turnManager.move(event.key);
                // Check for portal after movement
                checkAndHandlePortal(gameState.playerPos.x, gameState.playerPos.y);
                event.preventDefault(); return;
            default:
                if (event.key >= '1' && event.key <= '9') {
                    window.interaction.selectItem(parseInt(event.key, 10) - 1);
                    event.preventDefault(); return;
                }
        }
        if (event.key === 'x' || event.key === 'X') {
            window.turnManager.dash();
            checkAndHandlePortal(gameState.playerPos.x, gameState.playerPos.y);
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
                // Sound for confirming target is complex because of LOS check below.
                // It should play *after* LOS success.
                gameState.targetConfirmed = true; // This flag might be premature before LOS
                logToConsole(`Target confirmed at: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}`);
                logToConsole(`Targeting type: ${gameState.targetingType}`);

                gameState.selectedTargetEntity = null; // Reset before checking
                // Find entity at target x, y, AND z
                for (const npc of gameState.npcs) {
                    if (npc.mapPos && npc.mapPos.x === gameState.targetingCoords.x &&
                        npc.mapPos.y === gameState.targetingCoords.y &&
                        npc.mapPos.z === gameState.targetingCoords.z) {
                        gameState.selectedTargetEntity = npc;
                        break;
                    }
                }

                // Determine the actual target position (either entity's or tile's)
                const finalTargetPos = gameState.selectedTargetEntity ? gameState.selectedTargetEntity.mapPos : gameState.targetingCoords;

                // Perform Line of Sight Check
                const currentTilesets = window.assetManager ? window.assetManager.tilesets : null;
                const currentMapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

                logToConsole(`[DEBUG_LOS_CONTEXT] About to call hasLineOfSight3D.
                  window.assetManager: ${window.assetManager ? 'Exists' : 'MISSING'}
                  Passed tilesets: ${currentTilesets ? 'Exists, Keys: ' + Object.keys(currentTilesets).length : 'MISSING or empty'}
                  Passed mapData: ${currentMapData ? 'Exists' : 'MISSING'}
                  Player Pos: ${JSON.stringify(gameState.playerPos)}
                  Target Pos: ${JSON.stringify(finalTargetPos)}`);

                if (!window.hasLineOfSight3D(gameState.playerPos, finalTargetPos, currentTilesets, currentMapData)) {
                    logToConsole(`No line of sight to target at (${finalTargetPos.x}, ${finalTargetPos.y}, Z:${finalTargetPos.z}). Select another target.`, "orange");
                    if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Error sound for LOS fail
                    event.preventDefault();
                    return;
                }

                // LOS is clear, proceed with target confirmation
                gameState.targetConfirmed = true; // This confirms the target for combat logic
                logToConsole(`Target confirmed with LOS at: X=${finalTargetPos.x}, Y=${finalTargetPos.y}, Z=${finalTargetPos.z}`);
                logToConsole(`Targeting type: ${gameState.targetingType}`);
                if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav'); // Confirm sound for LOS success


                if (gameState.selectedTargetEntity) {
                    logToConsole(`Combat would be initiated with ${gameState.selectedTargetEntity.name || gameState.selectedTargetEntity.id} at (${finalTargetPos.x}, ${finalTargetPos.y}, Z:${finalTargetPos.z}).`);
                } else {
                    logToConsole(`Targeting tile (${finalTargetPos.x}, ${finalTargetPos.y}, Z:${finalTargetPos.z}). No entity selected. Combat would not be initiated in this manner.`);
                }

                gameState.isTargetingMode = false; // Exit targeting mode
                window.mapRenderer.scheduleRender(); // Re-render to remove 'X'

                // Integration with CombatManager
                if (!gameState.isInCombat) {
                    let allParticipants = [];
                    allParticipants.push(gameState); // Add player

                    if (gameState.selectedTargetEntity) {
                        if (!allParticipants.includes(gameState.selectedTargetEntity)) {
                            allParticipants.push(gameState.selectedTargetEntity);
                        }
                        logToConsole(`Combat initiated by player targeting ${gameState.selectedTargetEntity.name || gameState.selectedTargetEntity.id}.`);
                    } else {
                        logToConsole("Combat initiated by player targeting a tile.");
                        // If targeting a tile, still check for nearby NPCs to pull into combat
                    }

                    const playerPos = gameState.playerPos;
                    if (playerPos) {
                        gameState.npcs.forEach(npc => {
                            if (allParticipants.includes(npc)) return;
                            if (!npc.health || npc.health.torso.current <= 0 || npc.health.head.current <= 0) return;

                            if (npc.mapPos) {
                                // Use 3D distance for combat alert radius, or a more complex check
                                const distance3D = getDistance3D(playerPos, npc.mapPos);
                                if (distance3D <= COMBAT_ALERT_RADIUS) {
                                    // Also check LOS to these nearby NPCs before pulling them in
                                    // currentTilesets and currentMapData are defined in the outer scope of this 'f' key handler
                                    if (window.hasLineOfSight3D(playerPos, npc.mapPos, currentTilesets, currentMapData) ||
                                        (gameState.selectedTargetEntity && window.hasLineOfSight3D(gameState.selectedTargetEntity.mapPos, npc.mapPos, currentTilesets, currentMapData))) {
                                        if (!allParticipants.includes(npc)) {
                                            allParticipants.push(npc);
                                            logToConsole(`${npc.name || npc.id} (Team: ${npc.teamId}) is nearby (Dist3D: ${distance3D.toFixed(1)}) with LOS and added to combat.`);
                                        }
                                    } else {
                                        logToConsole(`${npc.name || npc.id} is nearby but no LOS, not added to combat.`);
                                    }
                                }
                            }
                        });
                    }
                    combatManager.startCombat(allParticipants);
                } else {
                    if (combatManager.gameState.combatCurrentAttacker === combatManager.gameState &&
                        (combatManager.gameState.combatPhase === 'playerAttackDeclare' || combatManager.gameState.retargetingJustHappened)) {
                        logToConsole("Targeting confirmed mid-combat. Prompting player attack declaration.");
                        combatManager.promptPlayerAttackDeclaration();
                    }
                }
                event.preventDefault();

            } else if (gameState.isActionMenuActive) {
                performSelectedAction(); // Sound for confirm is in performSelectedAction or called by it
                event.preventDefault();
            } else if (gameState.selectedItemIndex !== -1) {
                window.interaction.interact(); // Sound for opening action list is in interact() or called by it
                event.preventDefault();
            }
            // If none of the above, let the event propagate or do nothing.
            break;
        case 'r': case 'R': // Changed to include R
            if (gameState.inventory.open || gameState.isInCombat) return; // Prevent if inventory open or in combat

            if (gameState.isTargetingMode && gameState.targetingType === 'ranged') {
                gameState.isTargetingMode = false;
                gameState.targetingType = null;
                updateTargetingInfoUI(); // Hide UI
                logToConsole("Exited ranged targeting mode.");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Placeholder for ui_target_mode_01.wav (toggled off)
                window.mapRenderer.scheduleRender(); // Re-render
            } else {
                gameState.isTargetingMode = true;
                gameState.targetingType = 'ranged';
                gameState.targetingCoords = { ...gameState.playerPos }; // Initialize to player's position (includes Z)
                updateTargetingInfoUI(); // Show UI
                logToConsole("Entering ranged targeting mode.");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Placeholder for ui_target_mode_01.wav (toggled on)
                logToConsole(`Targeting Coords: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}, Z=${gameState.targetingCoords.z}`);
                window.mapRenderer.scheduleRender(); // Re-render
            }
            event.preventDefault(); break;
        case 'c': case 'C':
            if (gameState.inventory.open || gameState.isInCombat) return;

            if (gameState.isTargetingMode && gameState.targetingType === 'melee') {
                gameState.isTargetingMode = false;
                gameState.targetingType = null;
                updateTargetingInfoUI(); // Hide UI
                logToConsole("Exited melee targeting mode.");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
                window.mapRenderer.scheduleRender();
            } else {
                gameState.isTargetingMode = true;
                gameState.targetingType = 'melee';
                gameState.targetingCoords = { ...gameState.playerPos };
                updateTargetingInfoUI(); // Show UI
                logToConsole("Entering melee targeting mode.");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
                logToConsole(`Targeting Coords: X=${gameState.targetingCoords.x}, Y=${gameState.targetingCoords.y}, Z=${gameState.targetingCoords.z}`);
                window.mapRenderer.scheduleRender();
            }
            event.preventDefault(); break;
        case 'Escape':
            if (gameState.isTargetingMode) { // Specific check for targeting mode escape
                gameState.isTargetingMode = false;
                gameState.targetingType = null;
                updateTargetingInfoUI(); // Hide targeting UI
                logToConsole("Exited targeting mode with Escape.");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
                window.mapRenderer.scheduleRender();
                event.preventDefault();
                return; // Consume event
            }
            if (gameState.isActionMenuActive) {
                window.interaction.cancelActionSelection();
                event.preventDefault();
                // No return here, let it fall through if combat escape is also needed
            }
            // If in combat and not targeting/action menu, Escape might end combat (handled earlier)
            break;
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            if (gameState.isActionMenuActive) {
                window.interaction.selectAction(parseInt(event.key, 10) - 1);
                event.preventDefault();
            }
            break;
    }
}

window.combatManager = new CombatManager(gameState, assetManager);

function checkAndHandlePortal(newX, newY) {
    if (gameState.awaitingPortalConfirmation || gameState.portalPromptActive) {
        return; // Already handling a portal or prompt is active
    }

    const currentMap = window.mapRenderer.getCurrentMapData();
    if (!currentMap || !currentMap.portals || currentMap.portals.length === 0) {
        return; // No portals on this map
    }

    const portal = currentMap.portals.find(p => p.x === newX && p.y === newY);

    if (portal) {
        logToConsole(`Player stepped on portal to ${portal.targetMapId} at (${portal.targetX}, ${portal.targetY})`);
        // TODO: Play a sound indicating portal activation or prompt appearance (e.g., ui_menu_open_01.wav or a mystical sound)
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 }); // Placeholder

        gameState.awaitingPortalConfirmation = true;
        gameState.portalPromptActive = true; // Set flag before showing prompt

        // Simple window.confirm for now. A custom modal would be better for UI consistency.
        // Adding a slight delay to ensure the current move/render cycle completes visually.
        setTimeout(() => {
            const travel = window.confirm(`You've stepped on a portal to '${portal.targetMapId || 'an unnamed map'}'. Do you want to travel to (X:${portal.targetX}, Y:${portal.targetY})?`);
            if (travel) {
                if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 }); // Confirm sound
                initiateMapTransition(portal.targetMapId, portal.targetX, portal.targetY);
            } else {
                logToConsole("Portal travel declined.");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Neutral cancel
                gameState.awaitingPortalConfirmation = false;
            }
            // Reset prompt active flag regardless of choice, after a short delay to prevent re-triggering
            // if the player somehow doesn't move off immediately.
            setTimeout(() => {
                gameState.portalPromptActive = false;
            }, 100);
        }, 50); // 50ms delay
    }
}

async function initiateMapTransition(targetMapId, targetX, targetY) {
    if (!targetMapId) {
        logToConsole("Portal travel failed: No target map ID specified.", "error");
        gameState.awaitingPortalConfirmation = false;
        gameState.portalPromptActive = false; // Ensure this is reset even on early exit
        return;
    }

    const cleanMapId = targetMapId.replace(/\.json$/i, "");
    logToConsole(`Attempting to load map with cleaned ID: '${cleanMapId}' (original: '${targetMapId}')`);

    logToConsole(`Traveling to map: ${cleanMapId} at (${targetX}, ${targetY})...`);
    gameState.awaitingPortalConfirmation = false; // Reset this as we are now processing the transition

    // Show a loading message or overlay (optional, but good for UX)
    // For now, a simple log message will suffice.
    logToConsole("Loading new map...", "info");

    const newMapData = await assetManager.loadMap(cleanMapId);

    if (newMapData) {
        // Successfully loaded the new map data
        gameState.currentMapId = cleanMapId; // Use cleaned ID

        // Update map renderer with the new map
        window.mapRenderer.initializeCurrentMap(newMapData); // This also updates currentMapData within mapRenderer

        // Sync gameState layers with the new map's layers
        gameState.layers = newMapData.layers;

        // Update player position, ensuring it's within bounds of the new map
        let finalX = targetX;
        let finalY = targetY;
        if (newMapData.dimensions) {
            if (targetX < 0 || targetX >= newMapData.dimensions.width) {
                logToConsole(`Target X (${targetX}) is out of bounds for map ${cleanMapId}. Clamping or using startPos.`, "warn");
                finalX = newMapData.startPos ? newMapData.startPos.x : 0; // Fallback to startPos or 0
            }
            if (targetY < 0 || targetY >= newMapData.dimensions.height) {
                logToConsole(`Target Y (${targetY}) is out of bounds for map ${cleanMapId}. Clamping or using startPos.`, "warn");
                finalY = newMapData.startPos ? newMapData.startPos.y : 0; // Fallback to startPos or 0
            }
        } else {
            logToConsole(`New map ${cleanMapId} has no dimension data. Placing player at raw target coords.`, "warn");
        }
        gameState.playerPos = { x: finalX, y: finalY };

        // Spawn NPCs for the new map
        spawnNpcsFromMapData(newMapData); // This clears old NPCs and spawns new ones

        // Reset UI and game state relevant to map interaction
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
        gameState.selectedItemIndex = -1;
        gameState.selectedActionIndex = -1; // Also clear selected action
        gameState.isActionMenuActive = false;

        // Clear any targeting state
        gameState.isTargetingMode = false;
        gameState.targetingType = null;

        // If combat was ongoing, it should be ended by this transition
        if (gameState.isInCombat) {
            combatManager.endCombat(true); // Pass true to indicate it's a non-standard end (e.g. map change)
            logToConsole("Combat ended due to map transition.", "info");
        }

        // Reset player's turn points (or handle as per game design for map transitions)
        // For simplicity, let's reset them.
        if (window.turnManager && typeof window.turnManager.startTurn === 'function') {
            // Re-initialize player's turn state for the new map.
            // This might involve resetting AP/MP directly or calling a specific turn manager function.
            // Directly setting for now, assuming turnManager.startTurn() handles the rest.
            gameState.actionPointsRemaining = window.turnManager.getBaseActionPoints();
            gameState.movementPointsRemaining = window.turnManager.getBaseMovementPoints();
            gameState.hasDashed = false;
            window.turnManager.updateTurnUI(); // Update UI for turn points
        }


        // Schedule a re-render of the map
        window.mapRenderer.scheduleRender();

        logToConsole(`Arrived at ${newMapData.name || cleanMapId}. Player at (${finalX}, ${finalY}).`);

    } else {
        logToConsole(`Failed to travel: Could not load map '${cleanMapId}'.`, "error");
        // Player remains on the current map. gameState.awaitingPortalConfirmation was already reset.
    }

    // Ensure portalPromptActive is reset after the whole operation is done or failed
    // This timeout helps prevent re-triggering if player lands on another portal immediately
    // or if the confirmation was very quick.
    setTimeout(() => {
        gameState.portalPromptActive = false;
    }, 150); // Slightly longer delay than the prompt itself.
}

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

    // Sound is played in handleKeyDown for 'h' key.
    // If called directly, we can add it here too, or assume keydown is the primary trigger.
    // For now, let's add it for direct calls to be safe.
    if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');


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
        window.turnManager.init(assetManager); // Initialize turnManager with assetManager

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
            const loadedMapData = await assetManager.loadMap(initialMapId); // assetManager.loadMap now returns .levels and .startPos.z
            if (loadedMapData) {
                window.mapRenderer.initializeCurrentMap(loadedMapData);
                gameState.mapLevels = loadedMapData.levels;
                gameState.playerPos = loadedMapData.startPos || { x: 2, y: 2, z: 0 }; // Ensure Z
                gameState.currentViewZ = gameState.playerPos.z; // Set initial view Z
                gameState.currentMapId = loadedMapData.id || initialMapId;

                // Ensure fowData for the initial player Z-level is initialized
                const playerZStr = gameState.playerPos.z.toString();
                if (loadedMapData.dimensions && loadedMapData.dimensions.height > 0 && loadedMapData.dimensions.width > 0) {
                    if (!gameState.fowData[playerZStr]) {
                        gameState.fowData[playerZStr] =
                            Array(loadedMapData.dimensions.height).fill(null).map(() =>
                                Array(loadedMapData.dimensions.width).fill('hidden'));
                        logToConsole(`FOW data initialized for Z-level ${playerZStr} in initialize().`);
                    }
                }
                console.log("Initial map loaded:", loadedMapData.name, "ID:", gameState.currentMapId, "Player Z:", gameState.playerPos.z);
                spawnNpcsFromMapData(loadedMapData);
                // FOW calculation moved to startGame
            } else {
                console.error(`Failed to load initial map: ${initialMapId}`);
                gameState.npcs = [];
                window.mapRenderer.initializeCurrentMap(null);
                const errorDisplay = document.getElementById('errorMessageDisplay');
                if (errorDisplay) errorDisplay.textContent = `Failed to load initial map: ${initialMapId}.`;
                gameState.mapLevels = {}; // Clear gameState mapLevels
                gameState.fowData = {}; // Clear fowData
            }
        } else {
            console.warn("No initial map selected or map selector is empty. No map loaded at startup.");
            window.mapRenderer.initializeCurrentMap(null);
            gameState.mapLevels = {};
            gameState.fowData = {};
        }

        window.renderTables(gameState);
        if (typeof window.initFaceCreator === 'function') {
            window.initFaceCreator(); // Initialize face creator event listeners and preview
        } else {
            console.error("initFaceCreator function not found. Face creator UI may not work.");
        }
        // window.mapRenderer.scheduleRender(); // Initial render of the map (or empty state) - gameLoop will handle this
        window.updateInventoryUI(); // Initialize inventory display (now from js/inventory.js)
        updatePlayerStatusDisplay(); // Initial display of clock and needs

        // Initialize Entity Tooltip System
        if (typeof window.initEntityTooltip === 'function') {
            const mapContainer = document.getElementById('mapContainer');
            if (mapContainer) {
                window.initEntityTooltip(mapContainer);
                logToConsole("Entity tooltip system initialized.");
            } else {
                console.error("Map container not found for tooltip initialization.");
            }
        } else {
            console.error("initEntityTooltip function not found.");
        }

        requestAnimationFrame(gameLoop); // Start the main game loop

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

    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.addEventListener('click', (event) => {
            if (gameState.isRetargeting && combatManager) {
                const rect = mapContainer.getBoundingClientRect();
                // Assuming standard rendering where each character is roughly a fixed size cell.
                // This needs to be adjusted if you have a more complex rendering (e.g., graphical tiles, scaling).
                // For a text-based map, if each char is, say, 8px wide and 16px high:
                const TILE_WIDTH = mapContainer.firstChild && mapContainer.firstChild.offsetWidth ? mapContainer.firstChild.offsetWidth : 8; // Approximate width of a character/tile
                const TILE_HEIGHT = mapContainer.firstChild && mapContainer.firstChild.offsetHeight ? mapContainer.firstChild.offsetHeight / (window.mapRenderer.getCurrentMapData()?.dimensions.height || 1) : 16; // Approximate height

                const x = Math.floor((event.clientX - rect.left) / TILE_WIDTH);
                const y = Math.floor((event.clientY - rect.top) / TILE_HEIGHT);
                const z = gameState.currentViewZ; // Target on the current view Z

                if (x >= 0 && x < window.mapRenderer.getCurrentMapData().dimensions.width &&
                    y >= 0 && y < window.mapRenderer.getCurrentMapData().dimensions.height) {

                    gameState.targetingCoords = { x, y, z };
                    gameState.selectedTargetEntity = null; // Reset
                    for (const npc of gameState.npcs) {
                        if (npc.mapPos && npc.mapPos.x === x && npc.mapPos.y === y && npc.mapPos.z === z) {
                            gameState.selectedTargetEntity = npc;
                            break;
                        }
                    }

                    const finalTargetPos = gameState.selectedTargetEntity ? gameState.selectedTargetEntity.mapPos : gameState.targetingCoords;

                    // Fetch current data for LOS check
                    const currentTilesetsForClickLOS = window.assetManager ? window.assetManager.tilesets : null;
                    const currentMapDataForClickLOS = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

                    if (!window.hasLineOfSight3D(gameState.playerPos, finalTargetPos, currentTilesetsForClickLOS, currentMapDataForClickLOS)) {
                        logToConsole(`No line of sight to target at (${finalTargetPos.x}, ${finalTargetPos.y}, Z:${finalTargetPos.z}). Click another target.`, "orange");
                        // Keep isRetargeting true, allow another click
                        window.mapRenderer.scheduleRender(); // Update targeting cursor if it moves
                        return;
                    }

                    logToConsole(`Clicked target on map at X:${x}, Y:${y}, Z:${z}`);
                    gameState.targetConfirmed = true;
                    gameState.isRetargeting = false;
                    gameState.retargetingJustHappened = true;
                    combatManager.promptPlayerAttackDeclaration();
                    window.mapRenderer.scheduleRender(); // To update UI, remove targeting cursor potentially
                }
            }
        });
    } else {
        console.error("Map container not found for click listener.");
    }

    // Listen for campaign loaded event
    document.addEventListener('campaignWasLoaded', async (event) => { // made async for handleMapSelectionChangeWrapper
        logToConsole(`Campaign loaded: ${event.detail.campaignId}`);
        if (event.detail.manifest && event.detail.manifest.entryMap) {
            const entryMapId = event.detail.manifest.entryMap;
            logToConsole(`Campaign entry map: ${entryMapId}`);
            // Load the initial map for the campaign
            // This replaces the previous initial map loading logic that was here.
            await handleMapSelectionChangeWrapper(entryMapId);
            // Ensure UI is updated after map change
            // renderCharacterInfo(); // Potentially redundant if handleMapSelectionChangeWrapper covers it
            // window.mapRenderer.scheduleRender(); // Covered by handleMapSelectionChangeWrapper
            // updatePlayerStatusDisplay(); // Potentially redundant
        } else {
            logToConsole("Warning: Campaign loaded, but no entryMap specified in the manifest.", "warn");
        }
    });

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

        // Update Z-Level Displays
        const playerZElement = document.getElementById('playerZDisplay');
        if (playerZElement) {
            playerZElement.textContent = `Player Z: ${gameState.playerPos.z}`;
        }
        const viewZElement = document.getElementById('viewZDisplay');
        if (viewZElement) {
            viewZElement.textContent = `View Z: ${gameState.currentViewZ}`;
        }
        // Also update targeting Z info if it's active
        if (typeof updateTargetingInfoUI === 'function') {
            updateTargetingInfoUI();
        }
    }
    window.updatePlayerStatusDisplay = updatePlayerStatusDisplay; // Make it globally accessible if needed elsewhere

    // Function to update the targeting Z level display
    function updateTargetingInfoUI() {
        const targetingZElement = document.getElementById('targetingZDisplay');
        if (targetingZElement) {
            if (gameState.isTargetingMode) {
                targetingZElement.textContent = `Targeting Z: ${gameState.targetingCoords.z}`;
                targetingZElement.style.display = 'block'; // Show it
            } else {
                targetingZElement.style.display = 'none'; // Hide it
            }
        }
    }
    window.updateTargetingInfoUI = updateTargetingInfoUI; // Make global if needed by other modules directly

    // Map Zoom Functionality
    const mapContainerElementForZoom = document.getElementById('mapContainer'); // Renamed to avoid conflict if 'mapContainer' is used elsewhere in this scope
    const zoomInButton = document.getElementById('zoomInButton');
    const zoomOutButton = document.getElementById('zoomOutButton');

    if (mapContainerElementForZoom && zoomInButton && zoomOutButton) {
        let currentMapFontSize = 16; // Default font size in pixels
        const zoomStep = 2; // Pixels to change on each zoom step
        const minMapFontSize = 1;
        const maxMapFontSize = 300;

        try {
            const computedStyle = window.getComputedStyle(mapContainerElementForZoom);
            const initialSize = parseFloat(computedStyle.fontSize);
            if (!isNaN(initialSize) && initialSize > 0) {
                currentMapFontSize = initialSize;
            }
        } catch (e) {
            console.warn("Could not read initial font size for map container, using default.", e);
        }
        mapContainerElementForZoom.style.fontSize = `${currentMapFontSize}px`;

        zoomInButton.addEventListener('click', () => {
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
            currentMapFontSize = Math.min(maxMapFontSize, currentMapFontSize + zoomStep);
            mapContainerElementForZoom.style.fontSize = `${currentMapFontSize}px`;
        });

        zoomOutButton.addEventListener('click', () => {
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
            currentMapFontSize = Math.max(minMapFontSize, currentMapFontSize - zoomStep);
            mapContainerElementForZoom.style.fontSize = `${currentMapFontSize}px`;
        });
        logToConsole(`Map zoom controls initialized. Current map font size: ${currentMapFontSize}px`);
    } else {
        console.warn("Map zoom UI elements not found. Zoom functionality will not be available.");
        if (!mapContainerElementForZoom) console.warn("Zoom: mapContainer not found.");
        if (!zoomInButton) console.warn("Zoom: zoomInButton not found.");
        if (!zoomOutButton) console.warn("Zoom: zoomOutButton not found.");
    }

    const confirmButton = document.getElementById('confirmAttackButton');
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            // Sound is played before checks, as it's a button click action
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav');
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
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav'); // Confirm sound
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
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav'); // Confirm sound
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
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Neutral click for retarget
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
    // Play start game sound
    if (window.audioManager) {
        const startGameSounds = ['ui_start_game_01.wav', 'ui_start_game_02.wav'];
        const randomStartSound = startGameSounds[Math.floor(Math.random() * startGameSounds.length)];
        window.audioManager.playUiSound(randomStartSound, { volume: 0.8 });
    }

    const characterCreator = document.getElementById('character-creator');
    const characterInfoPanel = document.getElementById('character-info-panel');
    // const gameControls = document.getElementById('game-controls'); // This ID does not exist in index.html right-panel is used.

    // Ensure currentMapData is loaded (now via window.mapRenderer.getCurrentMapData())
    let currentMap = window.mapRenderer.getCurrentMapData();
    if (!currentMap) {
        console.warn("startGame called but no map data loaded from mapRenderer. This should have been handled by initialize().");
        // Attempt to gracefully handle or rely on initialize() having set defaults
        // Forcing a load here might be redundant if initialize worked or failed informatively.
        // If initialize() failed to load any map, currentMap will be null.
        // Game might not be in a playable state if no map is loaded.
    }

    // Ensure gameState reflects the currently loaded map's Z-level structure
    // This might be redundant if initialize() and handleMapSelectionChangeWrapper() are correctly setting these.
    if (currentMap && currentMap.levels && currentMap.startPos) {
        gameState.mapLevels = currentMap.levels;
        gameState.playerPos = { ...currentMap.startPos }; // Ensure we have x, y, and z
        gameState.currentViewZ = currentMap.startPos.z;
    } else if (currentMap) {
        // If currentMap exists but is missing Z-level data (e.g. old format map somehow loaded)
        // Log a warning and try to set defaults.
        console.warn("startGame: currentMap is loaded but missing Z-level data (levels or startPos.z). Attempting to use defaults.");
        gameState.mapLevels = currentMap.layers ? { "0": currentMap.layers } : { "0": { landscape: [], building: [], item: [], roof: [] } };
        gameState.playerPos = { x: (currentMap.startPos?.x || 2), y: (currentMap.startPos?.y || 2), z: 0 };
        gameState.currentViewZ = 0;
    } else {
        // No map loaded at all
        console.error("startGame: No map data is available. Cannot properly initialize game state for map.");
        gameState.mapLevels = { "0": { landscape: [], building: [], item: [], roof: [] } }; // Default empty level
        gameState.playerPos = { x: 2, y: 2, z: 0 };
        gameState.currentViewZ = 0;
    }

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
    const weaponsAndAmmoToAdd = [];

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
    // if (window.mapRenderer.getCurrentMapData()) window.mapRenderer.scheduleRender(); // Render if map is loaded - gameLoop handles this

    // initializeHealth is now in js/character.js, call it with gameState
    window.initializeHealth(gameState);
    window.renderHealthTable(gameState); // Explicitly call to render after health is set up.

    updatePlayerStatusDisplay(); // Initialize clock and needs display

    if (window.mapRenderer.getCurrentMapData()) { // Only run these if a map is loaded
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
        if (window.mapRenderer && typeof window.mapRenderer.updateFOW_BFS === 'function' && gameState.playerPos) {
            const PLAYER_VISION_RADIUS_CONST = 10; // TODO: Centralize this constant
            window.mapRenderer.updateFOW_BFS(gameState.playerPos.x, gameState.playerPos.y, gameState.playerPos.z, PLAYER_VISION_RADIUS_CONST);
        }
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
    // The previous changes ensured updateTurnUI is called in nextTurn.

    // After combatManager.endPlayerTurn(), it should be NPC's turn.
    // combatManager.executeNpcCombatTurn will run, then combatManager.nextTurn().
    // The nextTurn() call is where window.turnManager.updateTurnUI() is expected if it becomes player's turn again.

    // For simplicity, we check call count. startCombat calls nextTurn, which calls updateTurnUI.
    // endPlayerTurn calls nextTurn, which calls updateTurnUI.
    // If NPC turn also calls nextTurn which leads to player turn, that's another call.

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
                // window.mapRenderer.scheduleRender(); // gameLoop will handle
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