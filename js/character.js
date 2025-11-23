/**************************************************************
* Character Creation & Stats Functions
**************************************************************/

// Update skill points from character creation
// Assumes 'character' has 'skills' array and 'MAX_SKILL_POINTS'
function updateSkill(name, value, character) {
    const index = character.skills.findIndex(skill => skill.name === name);
    if (index === -1) return;

    // character.MAX_SKILL_POINTS is often not set on the character object directly if using global constant logic.
    // However, we can default it to 30 if missing, or use gameState.unspentSkillPoints logic differently.
    // For character creation, we often want a total pool cap.
    // Let's assume a hard cap of 30 total points spent across all skills if not defined,
    // or use a "points remaining" logic.
    // If character.MAX_SKILL_POINTS is undefined, we'll assume the intended total is 30.
    const maxPoints = character.MAX_SKILL_POINTS || 30;

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

    // Bypass max points check if game has started (leveling up)
    if (!window.gameState || !window.gameState.gameStarted) {
        if (updatedTotal > maxPoints) {
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            alert(`Not enough skill points remaining! Max total is ${maxPoints}.`);
            // Potentially revert input field to oldPoints here
            return;
        }
    }

    skills[index].points = newValue;
    if (window.audioManager && newValue !== oldPoints) { // Play confirm only if value changed
        window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.6 }); // Placeholder for specific stat add/sub
    }

    const skillPointsElement = document.getElementById('skillPoints');
    if (skillPointsElement) {
        skillPointsElement.textContent = maxPoints - updatedTotal;
    }
}

// Update stat values for the character
// Assumes 'character' has 'stats' array, 'MIN_STAT_VALUE', 'MAX_STAT_VALUE'
function updateStat(name, value, character) {
    console.log(`updateStat called: ${name} -> ${value}`);
    const index = character.stats.findIndex(stat => stat.name === name);
    if (index === -1) {
        console.warn(`updateStat: Stat ${name} not found.`);
        return;
    }

    // Use default min/max if not defined on character
    const minVal = character.MIN_STAT_VALUE || 1;
    const maxVal = character.MAX_STAT_VALUE || 20;
    const maxTotalPoints = 35; // Recommended total

    const oldPoints = character.stats[index].points; // Get old points BEFORE parsing new value
    const newValue = parseInt(value) || minVal;

    if (newValue < minVal || newValue > maxVal) {
        console.warn(`updateStat: Value ${newValue} out of bounds (${minVal}-${maxVal})`);
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        alert(`Stat points must be between ${minVal} and ${maxVal}!`);
        // Potentially revert input field to oldPoints here
        return;
    }

    // Check total points
    const currentTotalWithoutThisStat = character.stats.reduce((sum, stat, i) => {
        if (i === index) return sum;
        return sum + stat.points;
    }, 0);
    const updatedTotal = currentTotalWithoutThisStat + newValue;

    // If game has started, we assume it's a level up or reward, so strict total cap check
    // for character creation (35) might be bypassed or increased.
    // For now, if gameState.gameStarted is true, we skip the 35 cap check.
    if (!window.gameState || !window.gameState.gameStarted) {
        if (updatedTotal > maxTotalPoints) {
             console.warn(`updateStat: Total points ${updatedTotal} exceeds max ${maxTotalPoints}`);
             if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            alert(`Total stat points cannot exceed ${maxTotalPoints}.`);
            return;
        }
    }

    character.stats[index].points = newValue;
    console.log(`updateStat: Updated ${name} to ${newValue}. Remaining points: ${maxTotalPoints - updatedTotal}`);

    // Update display of remaining points if element exists
    const statPointsElement = document.getElementById('statPointsRemaining');
    if (statPointsElement) {
        statPointsElement.textContent = maxTotalPoints - updatedTotal;
    }

    if (window.audioManager && newValue !== oldPoints) { // Play confirm only if value changed
        window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.6 }); // Placeholder for specific stat add/sub
    }
    renderDerivedStats(character);
}

document.addEventListener('DOMContentLoaded', () => {
    const startGameButton = document.getElementById('startGameButton');
    if (startGameButton) {
        startGameButton.addEventListener('click', startGame);
    }
});

// Render the tables for stats and skills on the character creator
// Assumes 'character' has 'stats', 'skills', 'MIN_STAT_VALUE', 'MAX_STAT_VALUE'
function renderTables(character) {
    const statsBody = document.getElementById('statsBody');
    const skillsBody = document.getElementById('skillsBody');
    if (!statsBody || !skillsBody) return;

    const statDescriptions = {
        "Strength": "Physical power.",
        "Intelligence": "Reasoning, memory, and knowledge.",
        "Dexterity": "Agility, speed, and nimbleness.",
        "Constitution": "Toughness and health.",
        "Perception": "Awareness and ability to spot hidden things.",
        "Willpower": "Resistance to mental effects.",
        "Charisma": "Force of personality, persuasiveness, and social influence"
    };
    // Removed Marksmanship description

    const skillDescriptions = {
        "Animal Handling": "Governs the ability to interact with and control animals.",
        "Electronics": "The ability to use, repair, and modify electronic devices.",
        "Explosives": "Skill in handling, identifying, and disarming explosive devices.",
        "Guns": "Proficiency with all types of firearms.",
        "Intimidation": "The ability to influence others through fear and threats.",
        "Investigation": "The skill of uncovering clues and solving mysteries.",
        "Lockpick": "The ability to open locks without a key.",
        "Medicine": "The skill of healing wounds and treating illnesses.",
        "Melee Weapons": "Proficiency with all types of melee weapons.",
        "Persuasion": "The ability to influence others through diplomacy and reason.",
        "Repair": "The skill of fixing broken items and machinery.",
        "Sleight of Hand": "The ability to perform feats of manual dexterity, such as picking pockets.",
        "Stealth": "The skill of moving quietly and avoiding detection.",
        "Survival": "The ability to survive in the wilderness.",
        "Unarmed": "Proficiency in hand-to-hand combat."
    };

    // Ensure character has min/max values set for the inputs
    character.MIN_STAT_VALUE = character.MIN_STAT_VALUE || 1;
    character.MAX_STAT_VALUE = character.MAX_STAT_VALUE || 20;

    const statsHtml = character.stats.map(stat => `
        <div class="stat" style="background-color: ${stat.bgColor}; color: ${stat.textColor};" title="${statDescriptions[stat.name] || ''}">
            <span>${stat.name}:</span>
            <input type="number" value="${stat.points}" min="${character.MIN_STAT_VALUE}" 
                   max="${character.MAX_STAT_VALUE}" 
                   onchange="handleUpdateStat('${stat.name}', this.value)"> 
        </div>`).join('');
    const skillsHtml = character.skills.map(skill => `
        <div class="skill" style="background-color: ${skill.bgColor}; color: ${skill.textColor};" title="${skillDescriptions[skill.name] || ''}">
            <span>${skill.name}:</span>
            <input type="number" value="${skill.points}" min="0" max="100" 
                   onchange="handleUpdateSkill('${skill.name}', this.value)">
        </div>`).join('');
    statsBody.innerHTML = statsHtml;
    skillsBody.innerHTML = skillsHtml;

    // Update remaining stat points display on initial render
    const statPointsElement = document.getElementById('statPointsRemaining');
    if (statPointsElement) {
        const currentTotalStats = character.stats.reduce((sum, stat) => sum + stat.points, 0);
        statPointsElement.textContent = (character.MAX_TOTAL_STAT_POINTS || 35) - currentTotalStats;
    }
}

function startGame() {
    // Play start game sound
    if (window.audioManager) {
        const startGameSounds = ['ui_start_game_01.wav', 'ui_start_game_02.wav'];
        const randomStartSound = startGameSounds[Math.floor(Math.random() * startGameSounds.length)];
        window.audioManager.playUiSound(randomStartSound, {
            volume: 0.8
        });
        // Start the music playlist after a delay
        setTimeout(() => {
            window.audioManager.playMusic(0); // Start music with 0 delay after the initial wait
        }, 3000); // 3-second delay before music starts
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
        gameState.playerPos = { ...currentMap.startPos
        }; // Ensure we have x, y, and z
        gameState.currentViewZ = currentMap.startPos.z;
    } else if (currentMap) {
        // If currentMap exists but is missing Z-level data (e.g. old format map somehow loaded)
        // Log a warning and try to set defaults.
        console.warn("startGame: currentMap is loaded but missing Z-level data (levels or startPos.z). Attempting to use defaults.");
        gameState.mapLevels = currentMap.layers ? {
            "0": currentMap.layers
        } : {
            "0": {
                landscape: [],
                building: [],
                item: [],
                roof: []
            }
        };
        gameState.playerPos = {
            x: (currentMap.startPos?.x || 2),
            y: (currentMap.startPos?.y || 2),
            z: 0
        };
        gameState.currentViewZ = 0;
    } else {
        // No map loaded at all
        console.error("startGame: No map data is available. Cannot properly initialize game state for map.");
        gameState.mapLevels = {
            "0": {
                landscape: [],
                building: [],
                item: [],
                roof: []
            }
        }; // Default empty level
        gameState.playerPos = {
            x: 2,
            y: 2,
            z: 0
        };
        gameState.currentViewZ = 0;
    }

    // Ensure gameState.inventory.container is initialized before trying to modify it or call functions like addItem.
    // OLD BACKPACK UPGRADE LOGIC REMOVED

    // Add Small Backpack and Cargo Pants as starting items
    if (gameState.inventory.container && typeof window.inventoryManager.addItem === 'function' && assetManager) {
        const itemsToStartWith = [{
            id: "small_backpack_container",
            nameForLog: "Small Backpack"
        }, {
            id: "cargo_pants_pockets",
            nameForLog: "Cargo Pants"
        }, {
            id: "large_backpack_item",
            nameForLog: "Large Backpack"
        }];

        itemsToStartWith.forEach(itemInfo => {
            const itemDef = assetManager.getItem(itemInfo.id);
            if (itemDef) {
                const newItem = new Item(itemDef); // Assumes Item constructor is globally available
                if (window.inventoryManager.addItem(newItem)) {
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
            window.inventoryManager.addItem(newItem);
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
                window.inventoryManager.addItem(newItem);
            }
        } else {
            console.warn(`Weapon or ammo definition not found for ID: ${itemEntry.id}`);
        }
    });


    if (characterCreator) characterCreator.classList.add('hidden');
    if (characterInfoPanel) characterInfoPanel.classList.remove('hidden');
    // if (gameControls) gameControls.classList.remove('hidden'); // As noted, this ID isn't in use

    // Switch the animation target to the in-game face display
    if (typeof window.setAnimatedFaceTarget === 'function') {
        window.setAnimatedFaceTarget('charInfoAsciiFace');
    }
    renderCharacterInfo(); // This now calls the specific rendering function from js/character.js

    // 1. Initialize base "Body Pockets" capacity from Strength
    // This ensures the player's inherent carrying capacity is set before any items are processed.
    if (gameState.inventory.container && gameState.stats && typeof window.inventoryManager?.calculateCumulativeCapacity === 'function') {
        const initialPlayerStrength = gameState.stats.find(stat => stat.name === "Strength")?.points || 1;
        gameState.inventory.container.maxSlots = Math.max(1, initialPlayerStrength); // Base capacity is Strength, min 1
        logToConsole(`Initial 'Body Pockets' capacity set to: ${gameState.inventory.container.maxSlots} (from Strength: ${initialPlayerStrength}).`);
    } else {
        console.error("Critical error: Cannot set initial Strength-based capacity in startGame.");
        logToConsole("Error: Could not set initial Strength-based carrying capacity for Body Pockets.");
        if (gameState.inventory.container) gameState.inventory.container.maxSlots = 3; // Fallback
    }

    // 2. Define all starting items (clothes, consumables, etc.)
    const allStartingItems = [{
        id: "small_backpack_wearable",
        nameForLog: "Small Backpack"
    }, {
        id: "cargo_pants_pockets",
        nameForLog: "Cargo Pants"
    }, {
        id: "basic_vest",
        nameForLog: "Basic Vest"
    }, {
        id: "large_backpack_item",
        nameForLog: "Large Backpack"
    }, {
        id: "fishing_rod_simple",
        nameForLog: "Fishing Rod"
    }
    // Add other items like Canned Beans, Bottled Water if they are default starting items
    // For example:
    // { id: "canned_beans_food", nameForLog: "Canned Beans" },
    // { id: "bottled_water_drink", nameForLog: "Bottled Water" }
    ];

    logToConsole(`Processing ${allStartingItems.length} starting items. Player inventory capacity: ${gameState.inventory.container.maxSlots} slots.`);

    // 3. Attempt to add all starting items to inventory; if full, place on floor.
    allStartingItems.forEach(itemInfo => {
        const itemDef = assetManager.getItem(itemInfo.id);
        if (itemDef) {
            const newItemInstance = new Item(itemDef);
            if (!window.inventoryManager.addItem(newItemInstance)) { // addItem uses InventoryManager.addItemToInventory
                logToConsole(`Inventory full (or item add failed) for: ${itemInfo.nameForLog}. Placing on floor.`);
                if (!gameState.floorItems) gameState.floorItems = [];
                gameState.floorItems.push({
                    x: gameState.playerPos.x,
                    y: gameState.playerPos.y,
                    z: gameState.playerPos.z,
                    item: newItemInstance
                });
            } else {
                logToConsole(`Added starting item: ${itemInfo.nameForLog} to inventory.`);
            }
        } else {
            logToConsole(`Warning: Starting item definition not found for ID: ${itemInfo.id} (${itemInfo.nameForLog}). Skipping.`);
        }
    });

    // Player starts with no clothes equipped. Inventory capacity is purely Strength-based.
    // The player will need to pick up and equip items from the floor or their inventory.
    // If they equip a backpack, `equipClothing` in InventoryManager will call `calculateCumulativeCapacity`
    // which will then update `gameState.inventory.container.maxSlots` to include the backpack's capacity.

    if (window.mapRenderer && gameState.floorItems.length > 0) {
        window.mapRenderer.scheduleRender(); // Ensure map re-renders if items were dropped.
    }

    gameState.gameStarted = true;
    window.inventoryManager.updateInventoryUI(); // Update UI to reflect initial inventory state

    // --- Standardized HP Initialization ---
    // Calculate and set baseline max HP using the centralized function.
    const baselineMaxHp = window.calculateBaselineMaxHp(gameState);
    for (const partKey of Object.values(BodyParts)) {
        gameState.player.health[partKey] = {
            max: baselineMaxHp[partKey],
            current: baselineMaxHp[partKey],
            armor: 0,
            crisisTimer: 0
        };
    }
    window.renderHealthTable(gameState.player); // Render health table with the new values.

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

    // Switch the animation target to the in-game face display
    if (typeof window.setAnimatedFaceTarget === 'function') {
        window.setAnimatedFaceTarget('charInfoAsciiFace');
    }
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
    logToConsole(`DEBUG: applyHungerThirstDamage CALLED. Damage: ${damageAmount}. Initial torso HP: ${gameState.player.health && gameState.player.health.torso ? gameState.player.health.torso.current : 'N/A'}`);
    // The 'character' parameter in other health functions is analogous to 'gameState' here,
    // as player-specific health is directly on gameState.health.
    if (!gameState.player.health || !gameState.player.health.torso) {
        logToConsole("Error: Player health or torso data is missing. Cannot apply hunger/thirst damage.");
        return;
    }

    let torso = gameState.player.health.torso;
    let oldHp = torso.current;

    logToConsole(`DEBUG: Modifying torso HP. Current HP before change: ${torso.current}, Damage to apply: ${damageAmount}`);
    torso.current = Math.max(0, torso.current - damageAmount);
    logToConsole(`DEBUG: torso HP modified. Current HP after change: ${torso.current}`);
    logToConsole(`Player's torso damaged by ${damageAmount} due to hunger/thirst. HP: ${oldHp} -> ${torso.current}/${torso.max}`);

    if (torso.current === 0 && torso.crisisTimer === 0) {
        // Start crisis timer if torso HP drops to 0 and it's not already in crisis.
        // This aligns with how other damage might trigger a crisis.
        torso.crisisTimer = 3; // Default crisis timer duration
        logToConsole(`torso HP reached 0 due to hunger/thirst. Crisis timer started for player's torso.`);
    }

    // Update health UI
    if (typeof window.renderHealthTable === 'function') {
        logToConsole("DEBUG: Calling renderHealthTable to update UI.");
        window.renderHealthTable(gameState.player); // Pass gameState.player as the character object
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
        head: { name: "Head", max: 5, current: 5, armor: 0, crisisTimer: 0, crisisDescription: "" },
        torso: { name: "Torso", max: 8, current: 8, armor: 0, crisisTimer: 0, crisisDescription: "" },
        leftArm: { name: "Left Arm", max: 7, current: 7, armor: 0, crisisTimer: 0, crisisDescription: "" },
        rightArm: { name: "Right Arm", max: 7, current: 7, armor: 0, crisisTimer: 0, crisisDescription: "" },
        leftLeg: { name: "Left Leg", max: 7, current: 7, armor: 0, crisisTimer: 0, crisisDescription: "" },
        rightLeg: { name: "Right Leg", max: 7, current: 7, armor: 0, crisisTimer: 0, crisisDescription: "" }
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
    const characterName = (character === window.gameState) ? 'Player' : (character.name || character.id);

    for (let partKey in character.health) {
        let part = character.health[partKey];
        // A part is in crisis if HP is 0, it's not already flagged as destroyed, and crisisTimer was set (e.g. > 0 or just started)
        if (part.current === 0 && !part.isDestroyed && part.crisisTimer > 0) {
            part.crisisTimer--;
            logToConsole(`${characterName}'s ${part.name} in crisis: ${part.crisisDescription}. Timer: ${part.crisisTimer} turns remaining.`, 'orange');

            if (part.crisisTimer === 0) {
                // If timer runs out, the part is considered destroyed (if not already), and character might die.
                part.isDestroyed = true;
                logToConsole(`Health crisis in ${part.name} for ${characterName} was not treated. Part is now destroyed.`, 'red');
                // "failing to address it -> death"
                logToConsole(`${characterName} has died due to untreated health crisis (${part.name}).`, 'darkred');
                gameOver(character); // Pass character to gameOver
                return; // Stop further crisis checks if character died
            }
        }
    }
    // Re-render health table to show updated crisis timers or destroyed states
    if (window.renderHealthTable) {
        // If the character is the player, we need to pass gameState.player
        const characterToRender = (character === window.gameState) ? window.gameState.player : character;
        window.renderHealthTable(characterToRender);
    }
}


// Apply treatment to a damaged body part of a character
function applyTreatment(bodyPart, treatmentType, restType, medicineBonus, character, overrideRoll = null) {
    if (!character.health || !character.health[bodyPart]) return;
    let part = character.health[bodyPart];
    let dc, healing = 0;
    let isCrisisResolution = false;

    // Safely determine names for logging
    const partName = part.name || window.formatBodyPartName(bodyPart) || bodyPart;
    const charName = (character === window.gameState || character === window.gameState?.player) ? (character.name || "Player") : (character.name || character.id || "Unknown");

    // "Poorly tended: crisis treatment ineffective."
    if (treatmentType === "Poorly Tended" && part.crisisTimer > 0) {
        logToConsole("Poorly tended treatment is ineffective for a Health Crisis.", "orange");
        return;
    }

    if (treatmentType === "Well Tended") {
        dc = 15;
        if (restType === "short") healing = 2;
        else if (restType === "long") healing = part.max;

        if (part.crisisTimer > 0) isCrisisResolution = true;

    } else if (treatmentType === "Standard Treatment") {
        dc = 10;
        if (restType === "short") healing = 1;
        else if (restType === "long") healing = 3;

        if (part.crisisTimer > 0) isCrisisResolution = true;

    } else if (treatmentType === "Poorly Tended") {
        dc = 5;
        if (restType === "long") healing = 1;
    } else {
        logToConsole("Invalid treatment type.");
        return;
    }

    // Perform skill check using Persuasion/Intimidation skill check logic as a template
    // This assumes a getSkillValue function similar to what's used for Persuasion/Intimidation.
    // For Medicine, the bonus is directly passed as medicineBonus (e.g., from player's Medicine skill).
    let roll, totalRoll;
    if (overrideRoll !== null) {
        totalRoll = overrideRoll;
        roll = totalRoll - medicineBonus; // Reverse calculate natural roll for logging
    } else {
        roll = rollDie(20);
        totalRoll = roll + medicineBonus;
    }

    logToConsole(`Medicine check on ${partName} for ${charName} (${treatmentType}, ${restType || 'Immediate'}): Rolled ${roll} + Medicine Bonus ${medicineBonus} = ${totalRoll} (DC ${dc})`);

    if (totalRoll >= dc) {
        // 1. Immediate Crisis Resolution
        if (isCrisisResolution) {
            if (treatmentType === "Well Tended") {
                // "restore injured part to 1 HP immediately"
                if (part.current === 0) part.current = 1;
                part.crisisTimer = 0;
                part.crisisDescription = "";
                part.isDestroyed = false;
                logToConsole(`Health crisis in ${partName} resolved (Well Tended). Restored to 1 HP immediately.`, "green");
            } else if (treatmentType === "Standard Treatment") {
                // "end crisis"
                part.crisisTimer = 0;
                part.crisisDescription = "";
                part.isDestroyed = false;
                logToConsole(`Health crisis in ${partName} ended (Standard Treatment).`, "green");
            }
        }

        // 2. Rest Healing
        if (healing > 0) {
            let oldHP = part.current;
            part.current = Math.min(part.current + healing, part.max);
            logToConsole(`Treatment healing on ${partName}: +${healing} HP (${oldHP} -> ${part.current}/${part.max}).`, "green");
        }

        // 3. Cleanup check (if healing naturally resolved crisis that wasn't handled specifically?)
        if (part.current > 0 && part.crisisTimer > 0) {
            part.crisisTimer = 0;
            part.crisisDescription = "";
            part.isDestroyed = false;
            logToConsole(`Health crisis in ${partName} for ${charName} resolved due to HP restoration.`, "green");
        }
    } else {
        logToConsole(`Treatment FAILED on ${partName}.`, "orange");
    }

    if (window.renderHealthTable) {
        const characterToRender = (character === window.gameState) ? window.gameState.player : character;
        window.renderHealthTable(characterToRender);
    }
}

// Healing rates for short/long rest (JASCI rules) - To be called from a rest function
function applyRestHealing(character, restType) {
    if (!character || !character.health) return;
    const characterName = (character === window.gameState) ? 'Player' : (character.name || character.id);
    logToConsole(`${characterName} is attempting a ${restType} rest.`);

    if (restType === "short") {
        // Short Rest: Heal 1 HP to all damaged body parts not in crisis or destroyed.
        // JASCI Rule: "A character who takes a short rest may choose to spend one or more of their Hit Dice to recover hit points."
        // This is often interpreted as a small fixed heal or using hit dice. For simplicity, let's do a small fixed heal.
        // Or, if we follow "Medicine Checks" for short rest healing:
        // Standard Treatment (DC 15) + short rest = 1 HP.
        // Well-Tended (DC 18) + short rest = 2 HP.
        // Let's assume a basic short rest without active treatment just provides minimal or no direct HP,
        // and any HP gain comes from successfully applying treatment during that short rest.
        // The prompt says "Healing Rates: Short rest vs. long rest HP restoration per JASCI rules."
        // This implies short rests *do* heal. A common simple interpretation is 1 HP to non-critical parts.
        logToConsole(`${characterName} takes a short rest. Minor wounds may mend slightly. Active treatment recommended for serious injuries.`, "blue");
        let totalHealedShort = 0;
        for (const partKey in character.health) {
            const part = character.health[partKey];
            if (part.current > 0 && part.current < part.max && part.crisisTimer === 0 && !part.isDestroyed) {
                const healedAmount = 1; // Minimal healing for non-critical parts on short rest
                part.current = Math.min(part.current + healedAmount, part.max);
                totalHealedShort += healedAmount;
                logToConsole(`Short rest: ${part.name} healed by ${healedAmount} HP. Now ${part.current}/${part.max}.`, "blue");
            }
        }
        if (totalHealedShort > 0) {
            logToConsole(`${characterName} feels slightly better after a short rest. Total HP recovered: ${totalHealedShort}.`, "blue");
        } else {
            logToConsole(`${characterName} gained no direct HP from the short rest. Consider using medicine.`, "blue");
        }

    } else if (restType === "long") {
        // Long Rest: Fully heal all HP for all body parts, resolve non-destroyed crises.
        // JASCI Rule: "A long rest fully restores a character’s hit points."
        logToConsole(`${characterName} takes a long rest.`, "blue");
        for (const partKey in character.health) {
            const part = character.health[partKey];
            if (!part.isDestroyed) { // Cannot restore destroyed parts with just rest
                part.current = part.max;
                if (part.crisisTimer > 0) {
                    part.crisisTimer = 0;
                    part.crisisDescription = "";
                    logToConsole(`Long rest resolved crisis in ${part.name}.`, "green");
                }
            }
        }
        logToConsole(`${characterName} is fully healed after a long rest.`, "green");
    }

    if (window.renderHealthTable) {
        const characterToRender = (character === window.gameState) ? window.gameState.player : character;
        window.renderHealthTable(characterToRender);
    }
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

        let clickHandler = "";
        let cursorStyle = "";
        let titleAttr = "";

        // Allow clicking to treat if injured or in crisis
        if (current < max || crisisTimer > 0) {
             clickHandler = `onclick="window.openMedicalTreatmentModal('${partNameKey}')"`;
             cursorStyle = `style="cursor: pointer;"`;
             titleAttr = `title="Click to attempt treatment"`;
             row.classList.add("clickable-health-row"); // For optional CSS hover effects
        }

        row.innerHTML = `
            <td ${clickHandler} ${cursorStyle} ${titleAttr}>${formatBodyPartName(partNameKey)}</td>
            <td ${clickHandler} ${cursorStyle}>${current}/${max}</td>
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

// Open the medical treatment modal
function openMedicalTreatmentModal(bodyPartKey) {
    const modal = document.getElementById('medicalTreatmentModal');
    if (!modal) return;

    // Check if player
    if (!window.gameState || !window.gameState.player) return;

    // Reset previous listeners/state
    const confirmButton = document.getElementById('confirmTreatmentButton');
    const cancelButton = document.getElementById('cancelTreatmentButton');

    // Clone button to remove old event listeners
    const newConfirmBtn = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmBtn, confirmButton);
    const newCancelBtn = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelBtn, cancelButton);

    document.getElementById('treatmentBodyPart').textContent = window.formatBodyPartName(bodyPartKey);
    document.getElementById('treatmentResult').textContent = "";

    // Update Medicine Skill Display
    const medicineSkill = window.getSkillValue ? window.getSkillValue("Medicine") : 0;
    document.getElementById('treatmentSkillValue').textContent = medicineSkill;

    // Populate Items
    const itemContainer = document.getElementById('treatmentItemOptions');
    itemContainer.innerHTML = ""; // Clear old options

    // Scan inventory for medical items
    const medicalItems = window.getMedicalItems();

    let hasMedicalItems = false;
    if (window.gameState.inventory && window.gameState.inventory.container && window.gameState.inventory.container.items) {
        medicalItems.forEach(medItem => {
             // Count items in inventory
             const count = window.gameState.inventory.container.items.filter(i => i.id === medItem.id).length;
             if (count > 0) {
                 hasMedicalItems = true;
                 const div = document.createElement('div');
                 div.innerHTML = `
                    <input type="radio" id="treatmentMethod_${medItem.id}" name="treatmentMethod" value="${medItem.id}">
                    <label for="treatmentMethod_${medItem.id}">Use ${medItem.name} (+${medItem.bonus} Bonus, ${count} left)</label>
                 `;
                 itemContainer.appendChild(div);
             }
        });
    }

    if (!hasMedicalItems) {
        itemContainer.innerHTML = "<div style='color: grey; font-style: italic;'>No medical items in inventory.</div>";
    }

    // Select Skill by default
    document.getElementById('treatmentMethodSkill').checked = true;

    // Event Listeners
    newCancelBtn.onclick = () => {
        modal.classList.add('hidden');
    };

    newConfirmBtn.onclick = () => {
        newConfirmBtn.disabled = true; // Prevent double-clicks
        // Get selection
        const selectedMethod = document.querySelector('input[name="treatmentMethod"]:checked').value;
        window.performMedicalTreatment(bodyPartKey, selectedMethod);
    };

    modal.classList.remove('hidden');
}

// Perform the medical treatment action
function performMedicalTreatment(bodyPartKey, methodValue) {
    if (!window.gameState.player) return;

    // Check Action Points
    if (window.gameState.actionPointsRemaining < 1) {
        logToConsole("Not enough Action Points to perform treatment.", "orange");
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        return;
    }

    // Determine Bonus and Item Consumption
    let bonus = window.getSkillValue ? window.getSkillValue("Medicine") : 0;
    let itemToConsume = null;
    let itemBonus = 0;

    if (methodValue !== 'skill') {
        // Item selected
        const medicalItems = window.getMedicalItems();
        const medItemDef = medicalItems.find(m => m.id === methodValue);

        if (medItemDef) {
            // Find actual item object to remove
            const invItems = window.gameState.inventory.container.items;
            const itemIndex = invItems.findIndex(i => i.id === methodValue);

            if (itemIndex === -1) {
                logToConsole("Selected item not found in inventory!", "red");
                return; // Should not happen if UI is consistent
            }

            itemBonus = medItemDef.bonus;
            itemToConsume = invItems[itemIndex];
        }
    }

    // Deduct AP
    window.gameState.actionPointsRemaining--;
    if (window.updateTurnStatusDisplay) window.updateTurnStatusDisplay();

    // Consume Item
    if (itemToConsume) {
        window.inventoryManager.removeItem(itemToConsume.id, 1); // Correctly use ID and Quantity
        logToConsole(`Used ${itemToConsume.name} for treatment.`, "white");
    }

    // Perform Roll
    const roll = window.rollDie(20);
    const totalRoll = roll + bonus + itemBonus;

    // Determine Result Tier
    let resultTier = "Poorly Tended";
    if (totalRoll >= 15) resultTier = "Well Tended";
    else if (totalRoll >= 10) resultTier = "Standard Treatment";

    const resultDiv = document.getElementById('treatmentResult');
    resultDiv.innerHTML = `Roll: ${roll} + Skill(${bonus}) + Item(${itemBonus}) = ${totalRoll}. Result: ${resultTier}`;
    resultDiv.style.color = (resultTier === "Poorly Tended" && roll + bonus + itemBonus < 5) ? "red" : "lime";

    // Apply Treatment Logic
    // Using "short" rest type to simulate "Field Aid" / First Aid healing if successful
    // Pass totalRoll to override internal roll in applyTreatment
    window.applyTreatment(bodyPartKey, resultTier, "short", bonus + itemBonus, window.gameState.player, totalRoll);

    // Refresh UI after short delay to let user see result
    setTimeout(() => {
        // Re-open modal to refresh counts? Or close?
        // Let's keep open but refresh item list if we want multiple treatments?
        // For now, close after 1.5s if success? No, user might want to read.
        // Just refresh the item list in case they want to treat again.

        // Refresh item list in modal without full re-open
         const itemContainer = document.getElementById('treatmentItemOptions');
         // (Simpler to just call openMedicalTreatmentModal again to refresh UI state but that resets selection)
         // We'll leave it open. User clicks Cancel or X to close.

         // If item count dropped to 0, we should update UI.
         if (itemToConsume) {
              // Quick re-render of modal options
              window.openMedicalTreatmentModal(bodyPartKey);
              // Restore result message since re-open clears it
              document.getElementById('treatmentResult').innerHTML = `Roll: ${roll} + Skill(${bonus}) + Item(${itemBonus}) = ${totalRoll}. Result: ${resultTier}`;
         }
    }, 500);
}

window.openMedicalTreatmentModal = openMedicalTreatmentModal;
window.performMedicalTreatment = performMedicalTreatment;

// Get medical item definitions
function getMedicalItems() {
    return [
        { id: "bandage", name: "Bandage", bonus: 2 },
        { id: "bandage_simple", name: "Simple Bandage", bonus: 2 },
        { id: "first_aid_kit", name: "First Aid Kit", bonus: 5 }
    ];
}
window.getMedicalItems = getMedicalItems;

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
    window.gameOverCalledForEntityThisTurn = true; // Set flag

    if (character === gameState) { // Check if the character that died is the player
        // TODO: Play player_death_01.wav when available.
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav', { volume: 1.0 }); // Using ui_error_01.wav as placeholder.
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
    } else { // NPC died
        // Logic for NPC death (e.g., remove from map, drop loot)
        // This is mostly handled in combatManager's applyDamage/nextTurn.
        // However, we should ensure XP and quest updates are triggered here if not already by applyDamage.
        if (!character.xpAwardedThisDamageEvent && character.cr !== undefined && window.xpManager) {
            logToConsole(`gameOver for NPC ${characterName}: Awarding XP.`, 'lime');
            window.xpManager.awardXp(window.xpManager.calculateXpForKill(character.cr), gameState);
            character.xpAwardedThisDamageEvent = true; // Prevent double award if applyDamage also calls
        }
        // Notify Quest System about NPC kill, ensuring it's only once if multiple paths lead here
        if (!character.questKillNotified && window.proceduralQuestManager && typeof window.proceduralQuestManager.checkObjectiveCompletion === 'function') {
            logToConsole(`gameOver for NPC ${characterName}: Notifying procedural quest manager.`, 'info');
            window.proceduralQuestManager.checkObjectiveCompletion({ type: "npc_killed", npcId: character.id, npcTags: character.tags || [], definitionId: character.definitionId });
            character.questKillNotified = true; // Mark as notified
        }
        // Ensure combat manager removes the NPC if it hasn't already
        if (window.combatManager && window.combatManager.initiativeTracker.find(e => e.entity === character)) {
            window.combatManager.initiativeTracker = window.combatManager.initiativeTracker.filter(entry => entry.entity !== character);
            window.gameState.npcs = window.gameState.npcs.filter(npc => npc !== character);
            logToConsole(`gameOver for NPC ${characterName}: Removed from initiative and game npcs list.`, 'info');
            window.mapRenderer.scheduleRender(); // Update map if NPC sprite needs to be removed
        }
    }
    // Reset the flag after processing
    setTimeout(() => { window.gameOverCalledForEntityThisTurn = false; }, 0);
}

// Making functions available for calling from HTML via script.js wrappers
// or for direct use if modules were fully implemented.
// No explicit exports needed due to current script loading model.

// Render derived stats
function renderDerivedStats(character) {
    const derivedStats = calculateDerivedStats(character);
    const derivedStatsContainer = document.getElementById('derivedStats');
    if (!derivedStatsContainer) return;

    let html = '<h3>Derived Stats</h3>';
    for (const [stat, value] of Object.entries(derivedStats)) {
        html += `<div>${stat}: ${value}</div>`;
    }
    derivedStatsContainer.innerHTML = html;
}

// Calculate derived stats based on core stats
function calculateDerivedStats(character) {
    const getStat = (name) => character.stats.find(s => s.name === name)?.points || 0;

    const constitution = getStat("Constitution");
    const strength = getStat("Strength");
    const dexterity = getStat("Dexterity");

    const hitPoints = 10 + (constitution * 2);
    const carryWeight = 50 + (strength * 10);
    const actionPoints = 1;
    const movementSpeed = 30;

    return {
        "Hit Points": hitPoints,
        "Movement Speed": movementSpeed,
        "Carry Weight": carryWeight,
        "Action Points": actionPoints
    };
}

window.renderDerivedStats = renderDerivedStats;
window.calculateDerivedStats = calculateDerivedStats;
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
    window.applyRestHealing = applyRestHealing; // Expose applyRestHealing
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
    // TODO: Play move_fall_start_01.wav when available, if levelsFallen > 0 (i.e., an actual fall is initiated).
    // This sound should play when the character *begins* to fall from initialAirZ.
    // Example: if (levelsFallen > 0 && window.audioManager) window.audioManager.playSound('ui_error_01.wav'); // Placeholder

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

        // Force a final render at the new location AFTER the animation promise resolves
        if (window.mapRenderer) {
            window.mapRenderer.scheduleRender();
        }
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

        // Force a final render at the new location AFTER the animation promise resolves
        if (window.mapRenderer) {
            window.mapRenderer.scheduleRender();
        }
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
        // TODO: Play move_fall_damage_01.wav when available. Current hard landing sound is a general placeholder.
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
    npc.faceData.eyesOpen = true;

    // Always try to generate asciiFace if the function is available and faceData exists
    if (npc.faceData && typeof window.generateAsciiFace === 'function') {
        // Ensure all necessary sub-properties for generateAsciiFace are present,
        // otherwise generateAsciiFace might fail. generateRandomFaceParams should ensure this.
        const requiredParams = ['headWidth', 'headHeight', 'eyeSize', 'browHeight', 'browAngle', 'browWidth', 'noseWidth', 'noseHeight', 'mouthWidth', 'mouthFullness', 'hairstyle', 'facialHair', 'glasses', 'eyeColor', 'hairColor', 'eyebrowColor', 'lipColor', 'skinColor'];
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