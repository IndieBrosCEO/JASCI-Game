/**************************************************************
 * Character Creation & Stats Functions
 **************************************************************/

// Update skill points from character creation
// Assumes 'character' has 'skills' array and 'MAX_SKILL_POINTS'
function updateSkill(name, value, character) {
    const index = character.skills.findIndex(skill => skill.name === name);
    if (index === -1) return;
    const newValue = parseInt(value) || 0;
    if (newValue < 0 || newValue > 100) {
        alert('Skill points must be between 0 and 100!');
        return;
    }
    const skills = character.skills;
    const currentTotal = skills.reduce((sum, skill) => sum + skill.points, 0);
    const updatedTotal = currentTotal - skills[index].points + newValue;
    if (updatedTotal > character.MAX_SKILL_POINTS) {
        alert('Not enough skill points remaining!');
        return;
    }
    skills[index].points = newValue;
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
    const newValue = parseInt(value) || character.MIN_STAT_VALUE;
    if (newValue < character.MIN_STAT_VALUE || newValue > character.MAX_STAT_VALUE) {
        alert(`Stat points must be between ${character.MIN_STAT_VALUE} and ${character.MAX_STAT_VALUE}!`);
        return;
    }
    character.stats[index].points = newValue;
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
        <h3>Stats</h3>
        ${statsHtml}
        <h3>Skills</h3>
        ${skillsHtml}
    `;

    // Add Worn Clothing section
    let wornHtml = '<h3>Worn Clothing</h3>';
    let hasWornItemsCharPanel = false;
    // gameState.js initializes gameState.player.wornClothing
    // So if 'character' is gameState, then character.player.wornClothing is the path.
    const wornClothingSource = character.player && character.player.wornClothing ? character.player.wornClothing : character.wornClothing;

    if (wornClothingSource) {
        for (const layer in wornClothingSource) {
            const item = wornClothingSource[layer];
            if (item) {
                hasWornItemsCharPanel = true;
                // ClothingLayers should be globally available from gameState.js
                const layerDisplayNameKey = Object.keys(ClothingLayers).find(key => ClothingLayers[key] === layer);
                let formattedLayerName = (layerDisplayNameKey || layer).replace(/_/g, ' ');
                formattedLayerName = formattedLayerName.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
                wornHtml += `<div><em>${formattedLayerName}:</em> ${item.name}</div>`;
            }
        }
    }
    if (!hasWornItemsCharPanel) {
        wornHtml += '<div>— Not wearing anything —</div>';
    }
    characterHtml += wornHtml;

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
    logToConsole(`GAME OVER for ${characterName}.`);
    // Further game-over logic here
    // For player (gameState), this might mean stopping the game.
    // For NPCs, it might mean removing them from combat or the map.
    if (character === gameState) { // Check if the character that died is the player
        // alert("You have succumbed to your injuries. GAME OVER.");
        // Potentially disable further input, show a game over screen, etc.
        gameState.gameStarted = false; // Example of a game-ending state change
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