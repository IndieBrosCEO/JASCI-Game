/**************************************************************
* Character Creation & Stats Functions
**************************************************************/

// Update skill points from character creation
// Assumes 'character' has 'skills' array and 'MAX_SKILL_POINTS'
function updateSkill(name, value, character) {
    const index = character.skills.findIndex(skill => skill.name === name);
    if (index === -1) return;

    const oldPoints = character.skills[index].points; // Get old points BEFORE parsing new value
    const newValue = parseInt(value) || 0;

    if (newValue < 0 || newValue > 100) {
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        alert('Skill points must be between 0 and 100!');
        // Potentially revert input field to oldPoints here if desired
        return;
    }

    const skills = character.skills;
    // Recalculate currentTotal without the skill being changed, then add newValue
    const currentTotalWithoutThisSkill = skills.reduce((sum, skill, i) => {
        if (i === index) return sum;
        return sum + skill.points;
    }, 0);
    const updatedTotal = currentTotalWithoutThisSkill + newValue;

    if (updatedTotal > character.MAX_SKILL_POINTS) {
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        alert('Not enough skill points remaining!');
        // Potentially revert input field to oldPoints here
        return;
    }

    skills[index].points = newValue;
    if (window.audioManager && newValue !== oldPoints) { // Play confirm only if value changed
        window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.6 }); // Placeholder for specific stat add/sub
    }

    const skillPointsElement = document.getElementById('skillPoints');
    if (skillPointsElement) {
        skillPointsElement.textContent = character.MAX_SKILL_POINTS - updatedTotal;
    }
}

// Update stat values for the character
// Assumes 'character' has 'stats' array, 'MIN_STAT_VALUE', 'MAX_STAT_VALUE'
function updateStat(name, value, character) {
    const index = character.stats.findIndex(stat => stat.name === name);
    if (index === -1) return;

    const oldPoints = character.stats[index].points; // Get old points BEFORE parsing new value
    const newValue = parseInt(value) || character.MIN_STAT_VALUE;

    if (newValue < character.MIN_STAT_VALUE || newValue > character.MAX_STAT_VALUE) {
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        alert(`Stat points must be between ${character.MIN_STAT_VALUE} and ${character.MAX_STAT_VALUE}!`);
        // Potentially revert input field to oldPoints here
        return;
    }

    character.stats[index].points = newValue;
    if (window.audioManager && newValue !== oldPoints) { // Play confirm only if value changed
        window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.6 }); // Placeholder for specific stat add/sub
    }
    // Original renderCharacterInfo() was called here.
    // This might need to call a more specific update function later,
    // or the main game loop handles re-rendering.
    // For now, if renderCharacterInfo is also moved or refactored,
    // that call will be updated in script.js.
    // If this function is called from an onchange event in HTML, that HTML needs to be updated too.
    // The prompt mentions refactoring calls in script.js, so we'll handle it there.
    // Let's assume renderCharacterInfo will be called from script.js after this.
}

// Render the tables for stats and skills on the character creator
// Assumes 'character' has 'stats', 'skills', 'MIN_STAT_VALUE', 'MAX_STAT_VALUE'
function renderTables(character) {
    const statsBody = document.getElementById('statsBody');
    const skillsBody = document.getElementById('skillsBody');
    if (!statsBody || !skillsBody) return;

    // The onchange handlers will need to be updated to pass the character object (gameState for player)
    // This is tricky because the HTML is static.
    // A common solution is to have these functions globally accessible and refer to a global player object,
    // or to have a central UI update mechanism.
    // For now, I will assume `gameState` is globally accessible and these functions will work as intended
    // when called with `gameState`. The HTML onchange attributes will call wrapper functions in script.js
    // that then call these functions with `gameState`.
    // Example: onchange="handleUpdateStat('${stat.name}', this.value)" in HTML
    // script.js: function handleUpdateStat(name, value) { updateStat(name, value, gameState); renderCharacterInfo(gameState); }

    const statsHtml = character.stats.map(stat => `
        <div class="stat" style="background-color: ${stat.bgColor}; color: ${stat.textColor};">
            <span>${stat.name}:</span>
            <input type="number" value="${stat.points}" min="${character.MIN_STAT_VALUE}" 
                   max="${character.MAX_STAT_VALUE}" 
                   onchange="handleUpdateStat('${stat.name}', this.value)"> 
        </div>`).join('');
    const skillsHtml = character.skills.map(skill => `
        <div class="skill" style="background-color: ${skill.bgColor}; color: ${skill.textColor};">
            <span>${skill.name}:</span>
            <input type="number" value="${skill.points}" min="0" max="100" 
                   onchange="handleUpdateSkill('${skill.name}', this.value)">
        </div>`).join('');
    statsBody.innerHTML = statsHtml;
    skillsBody.innerHTML = skillsHtml;
}

// Renders only the stats, skills, and worn clothing parts for the character info panel
// Assumes 'character' has 'stats', 'skills', and 'player.wornClothing' (if character is gameState)
// or 'wornClothing' (if character is an NPC or a differently structured player object)
// Also assumes ClothingLayers is global or accessible.
function renderCharacterStatsSkillsAndWornClothing(character, characterInfoElement) {
    if (!characterInfoElement) return;

    // Basic character info: Name, Level, XP
    // XP to next level can be calculated based on JASCI's table or a formula.
    // For now, let's assume a simple display.
    // JASCI XP Table: 0 -> 300 -> 900 -> 2700 -> 6500 -> 14000 ...
    const xpLevels = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]; // Up to level 20
    const xpToNextLevel = (character.level < xpLevels.length) ? xpLevels[character.level] : "Max Level";
    const characterName = character === window.gameState ? "Player" : (character.name || "NPC"); // Distinguish player from NPC

    let basicInfoHtml = `
        <h3>${characterName}</h3>
        <div>Level: ${character.level || 1}</div>
        <div>XP: ${character.XP || 0} / ${xpToNextLevel}</div>
    `;

    const statsHtml = character.stats.map(stat => `
        <div class="stats" style="background-color: ${stat.bgColor}; color: ${stat.textColor};">
            <span>${stat.name}:</span>
            <span>${stat.points}</span>
        </div>`).join('');
    const skillsHtml = character.skills.map(skill => `
        <div class="skills" style="background-color: ${skill.bgColor}; color: ${skill.textColor};">
            <span>${skill.name}:</span>
            <span>${skill.points}</span>
        </div>`).join('');

    let characterHtml = `
        ${basicInfoHtml}
        <h3>Stats</h3>
        ${statsHtml}
        <h3>Skills</h3>
        ${skillsHtml}
    `;


    // Append this specific section to the characterInfo element
    // This assumes the Name, Level, XP part is already there or handled separately.
    // For now, let's find or create a specific div for these details.
    let statsSkillsContainer = characterInfoElement.querySelector('#statsSkillsWornContainer');
    if (!statsSkillsContainer) {
        statsSkillsContainer = document.createElement('div');
        statsSkillsContainer.id = 'statsSkillsWornContainer';
        characterInfoElement.appendChild(statsSkillsContainer);
    }
    statsSkillsContainer.innerHTML = characterHtml;
}

function applyHungerThirstDamage(gameState, damageAmount) {
    logToConsole(`DEBUG: applyHungerThirstDamage CALLED. Damage: ${damageAmount}. Initial Torso HP: ${gameState.health && gameState.health.torso ? gameState.health.torso.current : 'N/A'}`);
    // The 'character' parameter in other health functions is analogous to 'gameState' here,
    // as player-specific health is directly on gameState.health.
    if (!gameState.health || !gameState.health.torso) {
        logToConsole("Error: Player health or torso data is missing. Cannot apply hunger/thirst damage.");
        return;
    }

    let torso = gameState.health.torso;
    let oldHp = torso.current;

    logToConsole(`DEBUG: Modifying torso HP. Current HP before change: ${torso.current}, Damage to apply: ${damageAmount}`);
    torso.current = Math.max(0, torso.current - damageAmount);
    logToConsole(`DEBUG: Torso HP modified. Current HP after change: ${torso.current}`);
    logToConsole(`Player's torso damaged by ${damageAmount} due to hunger/thirst. HP: ${oldHp} -> ${torso.current}/${torso.max}`);

    if (torso.current === 0 && torso.crisisTimer === 0) {
        // Start crisis timer if torso HP drops to 0 and it's not already in crisis.
        // This aligns with how other damage might trigger a crisis.
        torso.crisisTimer = 3; // Default crisis timer duration
        logToConsole(`Torso HP reached 0 due to hunger/thirst. Crisis timer started for player's torso.`);
    }

    // Update health UI
    if (typeof window.renderHealthTable === 'function') {
        logToConsole("DEBUG: Calling renderHealthTable to update UI.");
        window.renderHealthTable(gameState); // Pass gameState as the character object
    } else {
        logToConsole("Error: renderHealthTable function not found. UI may not update.");
    }

    // Game over is handled by updateHealthCrisis when a crisis timer runs out.
    // No immediate game over check here, respecting the crisis timer system.
}

/**************************************************************
 * Health System Functions
 **************************************************************/

// Initialize health for various body parts on a character object
function initializeHealth(character) {
    character.health = {
        head: { max: 5, current: 5, armor: 0, crisisTimer: 0 },
        torso: { max: 8, current: 8, armor: 0, crisisTimer: 0 },
        leftArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        rightArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        leftLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        rightLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 }
    };
    // renderHealthTable(character) will be called from script.js
}

// Helper function to get total armor for a body part from a character's worn clothing
function getArmorForBodyPart(bodyPartName, character) {
    let totalArmor = 0;
    // gameState.js initializes gameState.player.wornClothing
    // So if 'character' is gameState, then character.player.wornClothing is the path.
    let wornClothingSource = null;
    if (character === gameState && character.player) {
        wornClothingSource = character.player.wornClothing;
    } else if (character && character.wornClothing) {
        wornClothingSource = character.wornClothing;
    }

    if (!wornClothingSource) {
        return 0;
    }

    for (const layer in wornClothingSource) {
        const item = wornClothingSource[layer];
        if (item && item.isClothing && item.coverage && item.coverage.includes(bodyPartName)) {
            totalArmor += item.armorValue || 0;
        }
    }
    return totalArmor;
}

// Update crisis timers for body parts at the end of each turn for a character
function updateHealthCrisis(character) {
    if (!character.health) return;
    for (let partName in character.health) {
        let part = character.health[partName];
        if (part.current === 0 && part.crisisTimer > 0) {
            part.crisisTimer--;
            logToConsole(`${partName} crisis timer for ${character.id || 'player'}: ${part.crisisTimer} turn(s) remaining.`);
            if (part.crisisTimer === 0) {
                logToConsole(`Health crisis in ${partName} for ${character.id || 'player'} was not treated. Character has died.`);
                gameOver(character); // Pass character to gameOver
                return;
            }
        }
    }
}

// Apply treatment to a damaged body part of a character
function applyTreatment(bodyPart, treatmentType, restType, medicineBonus, character) {
    if (!character.health || !character.health[bodyPart]) return;
    let part = character.health[bodyPart];
    let dc, healing;

    if (treatmentType === "Well Tended") {
        dc = 18;
        healing = (restType === "short") ? 2 : part.max;
    } else if (treatmentType === "Standard Treatment") {
        dc = 15;
        healing = (restType === "short") ? 1 : 3;
    } else if (treatmentType === "Poorly Tended") {
        dc = 10;
        healing = (restType === "long") ? 1 : 0;
    } else {
        logToConsole("Invalid treatment type.");
        return;
    }

    const roll = rollDie(20); // rollDie is from utils.js
    const total = roll + medicineBonus;
    logToConsole(`Medicine check on ${bodyPart} for ${character.id || 'player'} (${treatmentType}, ${restType}): DV0(${roll}) + bonus(${medicineBonus}) = ${total} (DC ${dc})`);

    if (total >= dc) {
        let oldHP = part.current;
        part.current = Math.min(part.current + healing, part.max);
        logToConsole(`Treatment successful on ${bodyPart} for ${character.id || 'player'}: HP increased from ${oldHP} to ${part.current}/${part.max}`);
        if (part.current > 0) {
            part.crisisTimer = 0;
            logToConsole(`Health crisis in ${bodyPart} for ${character.id || 'player'} resolved.`);
        }
    } else {
        logToConsole(`Treatment failed on ${bodyPart} for ${character.id || 'player'}.`);
    }
    // renderHealthTable(character) will be called from script.js
}

// Render the health table UI for a character
function renderHealthTable(character) {
    const healthTableBody = document.querySelector("#healthTable tbody"); // Assumes only one health table for the player
    if (!healthTableBody) return;
    healthTableBody.innerHTML = "";

    if (!character.health) return;

    for (let partNameKey in character.health) {
        let { current, max, crisisTimer } = character.health[partNameKey];
        let effectiveArmor = getArmorForBodyPart(partNameKey, character);

        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${formatBodyPartName(partNameKey)}</td>
            <td>${current}/${max}</td>
            <td>${effectiveArmor}</td> 
            <td>${crisisTimer > 0 ? crisisTimer : "—"}</td>
        `;
        if (current === 0) {
            row.style.backgroundColor = "#ff4444";
        } else if (crisisTimer > 0) {
            row.style.backgroundColor = "#ffcc00";
        }
        healthTableBody.appendChild(row);
    }
}

// Format body part names for display
function formatBodyPartName(part) {
    const nameMap = {
        head: "Head",
        torso: "Torso",
        leftArm: "Left Arm",
        rightArm: "Right Arm",
        leftLeg: "Left Leg",
        rightLeg: "Right Leg"
    };
    return nameMap[part] || part;
}

// Game over logic placeholder, now accepts a character
function gameOver(character) {
    const characterName = (character === gameState) ? 'Player' : (character.name || character.id || 'Unknown NPC');
    logToConsole(`GAME OVER for ${characterName}.`, 'darkred', true); // Ensure critical message is visible

    if (character === gameState) { // Check if the character that died is the player
        // TODO: Play player_death_01.wav
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav', { volume: 1.0 }); // Placeholder, loud error for death
        logToConsole("Player has died. Cleaning up combat state and ending game.", 'darkred');
        gameState.gameStarted = false;
        gameState.isWaitingForPlayerCombatInput = false; // Crucial for unblocking
        gameState.isInCombat = false; // Explicitly set, though endCombat should also do this

        // Attempt to clear any active animations forcefully if animationManager exists
        if (window.animationManager && typeof window.animationManager.clearAllAnimations === 'function') {
            logToConsole("Clearing all active animations on player game over.", 'darkred');
            window.animationManager.clearAllAnimations();
        }
        gameState.isAnimationPlaying = false; // Reset this flag too

        // Hide combat UI elements
        const attackDeclUI = document.getElementById('attackDeclarationUI');
        if (attackDeclUI) attackDeclUI.classList.add('hidden');
        const defenseDeclUI = document.getElementById('defenseDeclarationUI');
        if (defenseDeclUI) defenseDeclUI.classList.add('hidden');
        const combatControls = document.getElementById('combatControls');
        if (combatControls) combatControls.style.display = 'none';


        // Display a game over message prominently
        const gameOverMessageElement = document.getElementById('gameOverMessage'); // Assuming such an element exists or can be added
        if (gameOverMessageElement) {
            gameOverMessageElement.textContent = "YOU HAVE DIED. GAME OVER.";
            gameOverMessageElement.style.display = 'block';
        } else {
            // Fallback if no dedicated element
            const consoleElement = document.getElementById('console');
            if (consoleElement) {
                const p = document.createElement('p');
                p.style.color = 'red';
                p.style.fontWeight = 'bold';
                p.style.fontSize = '20px';
                p.textContent = "YOU HAVE DIED. GAME OVER.";
                consoleElement.appendChild(p);
                consoleElement.scrollTop = consoleElement.scrollHeight;
            }
        }

        // If there's a specific combat manager instance available and an endCombat method.
        // This is a bit indirect; ideally, combatManager handles its own cleanup when player dies.
        // The call in applyDamage should be sufficient.
    } else {
        // Logic for NPC death (e.g., remove from map, drop loot)
        // This is mostly handled in combatManager's applyDamage/nextTurn.
    }
}

// Making functions available for calling from HTML via script.js wrappers
// or for direct use if modules were fully implemented.
// No explicit exports needed due to current script loading model.

window.updateSkill = updateSkill;
window.updateStat = updateStat;
window.renderTables = renderTables;
window.renderCharacterStatsSkillsAndWornClothing = renderCharacterStatsSkillsAndWornClothing;
window.initializeHealth = initializeHealth;
window.getArmorForBodyPart = getArmorForBodyPart;
window.updateHealthCrisis = updateHealthCrisis;
window.applyTreatment = applyTreatment;
window.renderHealthTable = renderHealthTable;
window.formatBodyPartName = formatBodyPartName;
window.gameOver = gameOver;
window.applyHungerThirstDamage = applyHungerThirstDamage;

// Add this function at the end of js/character.js
function getTileLightingLevel(tileX, tileY, tileZ, currentGameState) {
    if (!currentGameState || !currentGameState.fowData) {
        // console.warn(`getTileLightingLevel: Game state or FOW data missing. Assuming dark for ${tileX},${tileY},${tileZ}.`);
        return 'dark';
    }

    const zStr = tileZ.toString();
    const fowDataForZ = currentGameState.fowData[zStr];

    if (!fowDataForZ || !fowDataForZ[tileY] || typeof fowDataForZ[tileY][tileX] === 'undefined') {
        // console.warn(`getTileLightingLevel: FOW data missing for Z-level ${tileZ} at ${tileX},${tileY}. Assuming dark.`);
        return 'dark'; // Default to dark if FOW data for the specific Z-level or tile is unavailable
    }

    const fowStatus = fowDataForZ[tileY][tileX];
    if (fowStatus === 'hidden') {
        return 'dark'; // Hidden areas are considered dark for gameplay penalties
    }

    // Check dynamic light sources
    if (currentGameState.lightSources && currentGameState.lightSources.length > 0) {
        for (const source of currentGameState.lightSources) {
            // Ensure light source has all necessary properties, including z
            if (typeof source.x !== 'number' || typeof source.y !== 'number' || typeof source.z !== 'number' ||
                typeof source.radius !== 'number' || source.radius <= 0) {
                continue;
            }
            // Use isTileIlluminated (which should be 3D and Z-aware) if available,
            // otherwise, fallback to a 3D distance check for lighting.
            // isTileIlluminated is in mapRenderer.js, so direct call might not be ideal here.
            // For now, let's use a 3D distance check.
            const distanceToLight = getDistance3D({ x: tileX, y: tileY, z: tileZ }, source); // getDistance3D is in utils.js

            if (distanceToLight <= source.radius) {
                // Basic check: if within radius, it's bright.
                // A more advanced check would use isTileIlluminated from mapRenderer to check for obstructions.
                // This function is primarily for determining gameplay penalties, so direct line of sight for light
                // might be implicitly handled by the FOW 'visible' status. If a tile is 'visible', it has LOS.
                // If it's 'visited' but not 'visible', it might be dark even if near a light due to obstruction.
                // For simplicity now: if in radius of any light AND not FOW-hidden, consider it bright.
                return 'bright';
            }
        }
    }

    // Consider ambient light from map definition or time of day if not directly lit
    // For now, if not FOW-hidden and not lit by a dynamic source, assume 'dark' for penalties.
    // A more complex system could return 'dim' based on ambient conditions.
    // Example: check currentGameState.currentTime.hours for day/night cycle.
    // const ambientLight = getAmbientLightColor(currentGameState.currentTime.hours); // from mapRenderer
    // if (ambientLight !== '#303045') return 'dim'; // If not night time, could be dim

    return 'dark'; // Default to dark if not hidden and not lit by any source
}

// Make it globally accessible
if (typeof window !== 'undefined') {
    window.getTileLightingLevel = getTileLightingLevel;
}

// --- Falling and Fall Damage ---

/**
 * Checks if a character can stand at the given coordinates.
 * Currently, this primarily relies on mapRenderer.isWalkable.
 * Could be expanded for character-specific states (flying, etc.).
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {number} z - Z coordinate.
 * @returns {boolean} True if the character can stand at the location.
 */
function characterCanStandAt(x, y, z) {
    if (typeof window.mapRenderer?.isWalkable !== 'function') {
        console.error("characterCanStandAt: mapRenderer.isWalkable is not available.");
        return false; // Cannot determine, assume not standable
    }
    return window.mapRenderer.isWalkable(x, y, z);
}
window.characterCanStandAt = characterCanStandAt;

/**
 * Handles the process of a character falling.
 * Updates character's Z position and applies fall damage.
 * @param {object} characterOrGameState - The character object or gameState (for player).
 * @param {number} startX - The X coordinate where the fall initiates.
 * @param {number} startY - The Y coordinate where the fall initiates.
 * @param {number} initialAirZ - The Z level of the air/non-walkable tile the character stepped into.
 * @returns {boolean} True if a fall occurred and position was updated, false otherwise.
 */
async function handleFalling(characterOrGameState, startX, startY, initialAirZ) { // Made async
    if (typeof window.mapRenderer?.isWalkable !== 'function' || typeof window.mapRenderer?.getCurrentMapData !== 'function') {
        console.error("handleFalling: mapRenderer.isWalkable or getCurrentMapData is not available.");
        return false;
    }

    let currentMapData = window.mapRenderer.getCurrentMapData();
    // Determine minimum Z level if mapData is available
    let minZ = -Infinity; // Default if no map data or levels
    if (currentMapData && currentMapData.levels) {
        const zLevels = Object.keys(currentMapData.levels).map(Number);
        if (zLevels.length > 0) {
            minZ = Math.min(...zLevels);
        }
    }


    let currentCheckZ = initialAirZ;
    let levelsFallen = 0;
    let landed = false;

    // Loop downwards from the Z-level character stepped into.
    // The first check is for initialAirZ itself. If it's walkable, no fall.
    // If not, then character falls at least one level.

    if (window.mapRenderer.isWalkable(startX, startY, initialAirZ)) {
        // This case should ideally not be reached if called correctly,
        // as the calling logic should have determined initialAirZ is not walkable.
        // However, if it happens, it means the character lands immediately or doesn't fall.
        if (characterOrGameState === gameState) { // Player
            if (gameState.playerPos.z !== initialAirZ) { // Only update if actually different
                // This implies player was above initialAirZ and is now landing on it.
                logToConsole(`Player landed at Z:${initialAirZ} without falling further.`, "info");
                gameState.playerPos = { x: startX, y: startY, z: initialAirZ };
                if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = initialAirZ;
                window.mapRenderer?.scheduleRender();
                window.interaction?.detectInteractableItems();
                window.interaction?.showInteractableItems();
                return true; // Position updated
            }
        } else { // NPC
            if (characterOrGameState.mapPos.z !== initialAirZ) {
                characterOrGameState.mapPos = { x: startX, y: startY, z: initialAirZ };
                // NPC view doesn't follow, but render needed if NPC moves
                window.mapRenderer?.scheduleRender();
                return true; // Position updated
            }
        }
        return false; // No change in Z, no fall.
    }


    // If initialAirZ is NOT walkable, start the fall search from Z-1 of initialAirZ
    currentCheckZ = initialAirZ - 1;
    levelsFallen = 1; // Already fell one level from original Z to initialAirZ

    while (currentCheckZ >= minZ) {
        if (window.mapRenderer.isWalkable(startX, startY, currentCheckZ)) {
            landed = true;
            break;
        }
        levelsFallen++;
        currentCheckZ--;
        if (levelsFallen > 100) { // Safety break for very deep falls
            logToConsole("handleFalling: Fall exceeded 100 levels, aborting further descent.", "warn");
            break;
        }
    }

    if (landed) {
        logToConsole(`${characterOrGameState === gameState ? "Player" : (characterOrGameState.name || "NPC")} is falling ${levelsFallen} Z-levels, to land at Z:${currentCheckZ}.`, "orange");

        const fallAnimationPromise = window.animationManager ? window.animationManager.playAnimation('fall', {
            entity: characterOrGameState,
            startZ: initialAirZ, // The Z from which the fall visually starts
            endZ: currentCheckZ,  // The Z where the entity will land
            fallPathX: startX,
            fallPathY: startY,
            levelsFallen: levelsFallen, // Total levels dropped from original standing Z to landing Z
            durationPerLevel: 250 // ms per Z-level
        }) : Promise.resolve();

        await fallAnimationPromise; // Wait for fall animation to complete

        // After animation, update final position and apply damage
        if (characterOrGameState === gameState) { // Player
            gameState.playerPos = { x: startX, y: startY, z: currentCheckZ };
            if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = currentCheckZ;
        } else { // NPC
            characterOrGameState.mapPos = { x: startX, y: startY, z: currentCheckZ };
        }

        window.calculateAndApplyFallDamage(characterOrGameState, levelsFallen);

        window.mapRenderer?.scheduleRender();
        if (characterOrGameState === gameState) {
            window.interaction?.detectInteractableItems();
            window.interaction?.showInteractableItems();
            if (typeof window.updatePlayerStatusDisplay === 'function') window.updatePlayerStatusDisplay();
        }
        return true; // Fall occurred and position updated
    } else {
        // Fell out of the world or hit max fall depth without landing
        logToConsole(`${characterOrGameState === gameState ? "Player" : (characterOrGameState.name || "NPC")} fell out of the world or too far! Will be placed at Z: ${currentCheckZ + 1}. Max damage applied.`, "red");
        const lastSafeZ = currentCheckZ + 1; // The Z before falling out

        const abyssFallAnimationPromise = window.animationManager ? window.animationManager.playAnimation('fall', {
            entity: characterOrGameState,
            startZ: initialAirZ,
            endZ: lastSafeZ, // Visually fall to the last "safe" Z before abyss
            fallPathX: startX,
            fallPathY: startY,
            levelsFallen: Math.max(1, initialAirZ - lastSafeZ), // Ensure at least 1 level for animation
            durationPerLevel: 200
        }) : Promise.resolve();

        await abyssFallAnimationPromise;

        if (characterOrGameState === gameState) {
            gameState.playerPos = { x: startX, y: startY, z: lastSafeZ };
            if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = lastSafeZ;
        } else {
            characterOrGameState.mapPos = { x: startX, y: startY, z: lastSafeZ };
        }
        window.calculateAndApplyFallDamage(characterOrGameState, 20 * 2); // Max damage (20d3 implies 40 levels for calc)
        window.mapRenderer?.scheduleRender();
        if (characterOrGameState === gameState) {
            window.interaction?.detectInteractableItems();
            window.interaction?.showInteractableItems();
            if (typeof window.updatePlayerStatusDisplay === 'function') window.updatePlayerStatusDisplay();
        }
        return true; // Position updated to last safe Z
    }
}
window.handleFalling = handleFalling;

/**
 * Calculates and applies fall damage to a character.
 * @param {object} characterOrGameState - The character object or gameState (for player).
 * @param {number} levelsFallen - The number of Z-levels fallen.
 */
function calculateAndApplyFallDamage(characterOrGameState, levelsFallen) {
    if (levelsFallen < 2) return; // No damage for falls less than 2 levels

    // Damage starts at 1d3 for 2 levels.
    // Every additional 2 levels adds another d3.
    // So, 2-3 levels = 1d3; 4-5 levels = 2d3; 6-7 levels = 3d3, etc.
    let numDice = Math.floor(levelsFallen / 2);
    numDice = Math.min(numDice, 20); // Max 20d3

    if (numDice <= 0) return;

    let totalDamage = 0;
    for (let i = 0; i < numDice; i++) {
        totalDamage += rollDie(3); // rollDie is from utils.js
    }

    if (totalDamage <= 0) return;

    // Play hard landing sound if damage is taken
    if (window.audioManager && typeof window.audioManager.playHardLandingSound === 'function') {
        window.audioManager.playHardLandingSound();
        // TODO: Consider adding a specific "fall damage taken" sound: move_fall_damage_01.wav
        // This could be played in addition to or instead of just a hard landing, if damage is significant.
    }

    const health = characterOrGameState.health;
    if (!health || !health.leftLeg || !health.rightLeg) {
        logToConsole("Cannot apply fall damage: Character health.legs not defined.", "error");
        return;
    }

    // Distribute damage to legs
    let leftLegDamage = Math.ceil(totalDamage / 2);
    let rightLegDamage = Math.floor(totalDamage / 2);

    const applyDamageToLeg = (legPart, damage) => {
        if (legPart.current > 0) {
            const actualDamage = Math.min(legPart.current, damage); // Don't overkill beyond 0 instantly
            legPart.current -= actualDamage;
            logToConsole(`Fall damage to ${legPart === health.leftLeg ? "Left Leg" : "Right Leg"}: ${actualDamage}. HP: ${legPart.current}/${legPart.max}`, "red");
            if (legPart.current === 0 && legPart.crisisTimer === 0) {
                legPart.crisisTimer = 3; // Start crisis timer
                logToConsole(`${legPart === health.leftLeg ? "Left Leg" : "Right Leg"} crippled by fall! Crisis timer started.`, "red");
            }
        }
    };

    // Prioritize applying damage to legs that are not already at 0 HP if possible,
    // but the current simple distribution is okay for now.
    applyDamageToLeg(health.leftLeg, leftLegDamage);
    applyDamageToLeg(health.rightLeg, rightLegDamage);

    logToConsole(`Took ${totalDamage} total fall damage from a ${levelsFallen}-level fall.`, "red");

    if (typeof window.renderHealthTable === 'function') {
        window.renderHealthTable(characterOrGameState);
    }
}
window.calculateAndApplyFallDamage = calculateAndApplyFallDamage;


/**
 * Initiates falling process for a character if they move to an unsupported tile.
 * This function is typically called after a character attempts a move.
 * @param {object} characterOrGameState - The character object (NPC) or gameState (for player).
 * @param {number} targetX - The X coordinate the character attempted to move to.
 * @param {number} targetY - The Y coordinate the character attempted to move to.
 * @param {number} targetZ - The Z coordinate the character attempted to move to.
 * @returns {boolean} True if a fall was initiated and handled, false otherwise (e.g., target was walkable).
 */
async function initiateFallCheck(characterOrGameState, targetX, targetY, targetZ) { // Made async
    const debugPrefix = `initiateFallCheck (${characterOrGameState === gameState ? "Player" : (characterOrGameState.name || "NPC")} to ${targetX},${targetY},${targetZ}):`;
    console.log(`${debugPrefix} Called.`);

    if (typeof window.mapRenderer?.isWalkable !== 'function') {
        console.error(`${debugPrefix} mapRenderer.isWalkable is not available. Cannot check for fall.`);
        return false;
    }

    // Check if the target destination (targetX, targetY, targetZ) is actually walkable.
    // If it is, no fall occurs from this movement.
    if (window.mapRenderer.isWalkable(targetX, targetY, targetZ)) {
        console.log(`${debugPrefix} Target tile is walkable. No fall initiated.`);
        // Update position if it's different (actual move happens before this check in script.js)
        // This function is more about what happens *after* deciding a tile is the destination.
        return false;
    }

    // If the target tile itself is NOT walkable, it means the character is now in "air" at targetZ.
    // The fall then proceeds downwards from targetZ.
    console.log(`${debugPrefix} Target tile is NOT walkable. Initiating fall from Z=${targetZ}.`);
    return await handleFalling(characterOrGameState, targetX, targetY, targetZ); // targetZ is the Z-level of the air tile // Added await
}
window.initiateFallCheck = initiateFallCheck;

/**
 * Initializes face data for an NPC.
 * If npc.faceData is missing or incomplete, it generates random face parameters.
 * Then, it generates the asciiFace and stores it in npc.faceData.asciiFace.
 * Also ensures npc.name and npc.wieldedWeapon are initialized.
 * @param {object} npc - The NPC object.
 */
function initializeNpcFace(npc) {
    if (!npc) return;

    // Ensure basic properties exist
    if (npc.name === undefined) {
        npc.name = "Mysterious Figure"; // Default name
    }
    // npc.wieldedWeapon is no longer set here; tooltip derives from equippedWeaponId.
    // If npc.equippedWeaponId is undefined, tooltip defaults to "Unarmed".

    let generateNewFace = false;
    if (!npc.faceData) {
        npc.faceData = {};
        generateNewFace = true;
    } else {
        // Optional: Add a check for completeness of existing faceData
        // For now, if faceData object exists, assume it's either complete or will be handled by map maker.
        // If it's missing key properties for generation, it might be better to regenerate.
        // For simplicity, we'll only regenerate if asciiFace is missing and generateRandomFaceParams is available.
        if (!npc.faceData.asciiFace && typeof window.generateRandomFaceParams === 'function' && typeof window.generateAsciiFace === 'function') {
            // If asciiFace is missing, but other params might exist,
            // we could try to generate asciiFace from existing params.
            // However, if params are also incomplete, it's safer to generate new random ones.
            // Let's assume if faceData exists but asciiFace is missing, we should try to generate it.
            // If critical params for generation are missing, then we'd need to randomize.
            // This part can be refined based on how map maker saves partial face data.
            // For now, if `faceData` exists but `asciiFace` does not, generate `asciiFace`.
            // If `faceData` itself does not exist, `generateRandomFaceParams` will be called.
        }
    }

    if (generateNewFace && typeof window.generateRandomFaceParams === 'function') {
        window.generateRandomFaceParams(npc.faceData); // Populates npc.faceData with random parameters
    }

    // Always try to generate asciiFace if the function is available and faceData exists
    if (npc.faceData && typeof window.generateAsciiFace === 'function') {
        // Ensure all necessary sub-properties for generateAsciiFace are present,
        // otherwise generateAsciiFace might fail. generateRandomFaceParams should ensure this.
        const requiredParams = ['headWidth', 'headHeight', 'eyeSize', 'browHeight', 'browAngle', 'browWidth', 'noseWidth', 'noseHeight', 'mouthWidth', 'mouthFullness', 'hairstyle', 'facialHair', 'glasses', 'eyeColor', 'hairColor', 'lipColor', 'skinColor'];
        let allParamsPresent = true;
        for (const param of requiredParams) {
            if (npc.faceData[param] === undefined) {
                allParamsPresent = false;
                // console.warn(`NPC ${npc.name || npc.id} missing faceData param: ${param}. Regenerating random face.`);
                if (typeof window.generateRandomFaceParams === 'function') {
                    window.generateRandomFaceParams(npc.faceData); // Regenerate all if one is missing
                } else {
                    // console.error("generateRandomFaceParams function not found, cannot regenerate NPC face.");
                }
                break;
            }
        }

        if (allParamsPresent || (npc.faceData.headWidth !== undefined)) { // Check if params are now present
            try {
                npc.faceData.asciiFace = window.generateAsciiFace(npc.faceData);
            } catch (e) {
                // console.error(`Error generating ASCII face for NPC ${npc.name || npc.id}:`, e, npc.faceData);
                // Fallback: try to generate new random params and then the face
                if (typeof window.generateRandomFaceParams === 'function') {
                    // console.log(`Attempting to regenerate random face params for NPC ${npc.name || npc.id}`);
                    window.generateRandomFaceParams(npc.faceData);
                    try {
                        npc.faceData.asciiFace = window.generateAsciiFace(npc.faceData);
                    } catch (e2) {
                        // console.error(`Second error generating ASCII face for NPC ${npc.name || npc.id} after randomizing:`, e2);
                        npc.faceData.asciiFace = ":("; // Simple fallback if all else fails
                    }
                } else {
                    npc.faceData.asciiFace = ":X"; // Fallback if no random generator
                }
            }
        } else if (!npc.faceData.asciiFace) { // If still no asciiFace after checks
            // console.warn(`Could not generate ASCII face for NPC ${npc.name || npc.id} due to missing params and/or functions.`);
            npc.faceData.asciiFace = ":P"; // Fallback
        }

    } else if (!npc.faceData) {
        // This case should ideally be caught by the first `if (!npc.faceData)`
        // console.warn(`NPC ${npc.name || npc.id} still has no faceData object after initialization attempt.`);
        npc.faceData = { asciiFace: ":/" }; // Basic fallback
    }
    // If generateAsciiFace is not available, npc.faceData.asciiFace might remain empty or as loaded from map.
    // The tooltip will need to handle a potentially missing asciiFace gracefully.
}
window.initializeNpcFace = initializeNpcFace;