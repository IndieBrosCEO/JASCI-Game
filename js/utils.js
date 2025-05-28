/**************************************************************
 * Utility & Logging Functions
 **************************************************************/

function logToConsole(message) {
    console.log(message);
    const consoleElement = document.getElementById("console");
    if (consoleElement) {
        const para = document.createElement("p");
        para.textContent = message;
        consoleElement.appendChild(para);
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }
}

/**************************************************************
 * Game Mechanics & Dice Functions
 **************************************************************/

// Rolls a single die with a specified number of sides.
function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

// Parses a dice notation string (e.g., "2d6+3", "1d4", "3d8-1")
// and returns an object { count: Number, sides: Number, modifier: Number }
function parseDiceNotation(diceString) {
    if (typeof diceString !== 'string' || diceString.trim() === "") {
        console.error("Invalid dice notation: input is not a non-empty string");
        return null;
    }
    // Check for flat number (e.g., "1", "5")
    if (/^\d+$/.test(diceString.trim())) {
        const flatDamage = parseInt(diceString.trim(), 10);
        // Represent as Xd1, so flatDamage * 1 = flatDamage
        return {
            count: flatDamage,
            sides: 1,
            modifier: 0
        };
    }

    const regex = /(\d+)d(\d+)([+-]\d+)?/;
    const match = diceString.trim().match(regex);

    if (!match) {
        console.error(`Invalid dice notation: ${diceString}`);
        return null;
    }

    return {
        count: parseInt(match[1], 10),
        sides: parseInt(match[2], 10),
        modifier: match[3] ? parseInt(match[3], 10) : 0
    };
}

// Rolls dice based on parsed notation from parseDiceNotation.
// Returns the total sum of the rolls plus the modifier.
function rollDiceNotation(parsedNotation) {
    if (!parsedNotation) return 0;

    let total = 0;
    for (let i = 0; i < parsedNotation.count; i++) {
        total += rollDie(parsedNotation.sides);
    }
    total += parsedNotation.modifier;
    return total;
}

// Gets the skill value for a given entity (player or NPC).
// entity: The character object (gameState for player, or specific NPC object)
// Depends on global `gameState`.
function getSkillValue(skillName, entity) {
    if (!entity) return 0;

    let skillsSource;
    if (entity === gameState) { // Check if the entity is the player (gameState)
        skillsSource = gameState.skills; // Array of objects { name: "SkillName", points: X }
    } else if (entity.skills) { // Check if the entity is an NPC with a skills object
        skillsSource = entity.skills; // Expected to be an object like { "SkillName": X } or array
    } else {
        return 0; // No skills definition found for the entity
    }

    if (Array.isArray(skillsSource)) { // For player (gameState.skills)
        const skill = skillsSource.find(s => s.name === skillName);
        return skill ? skill.points : 0;
    } else if (typeof skillsSource === 'object' && skillsSource !== null) { // For NPCs (entity.skills)
        return skillsSource[skillName] || 0;
    }
    return 0;
}

// Gets the stat value for a given entity (player or NPC).
// entity: The character object (gameState for player, or specific NPC object)
// Depends on global `gameState`.
function getStatValue(statName, entity) {
    if (!entity) return 1; // Default to 1 if entity is undefined

    let statsSource;
    if (entity === gameState) { // Player
        statsSource = gameState.stats; // Array of objects { name: "StatName", points: X }
    } else if (entity.stats) { // NPC
        statsSource = entity.stats; // Expected to be an object like { "StatName": X } or array
    } else {
        return 1; // No stats definition, return default
    }

    if (Array.isArray(statsSource)) { // For player (gameState.stats)
        const stat = statsSource.find(s => s.name === statName);
        return stat ? stat.points : 1;
    } else if (typeof statsSource === 'object' && statsSource !== null) { // For NPCs (entity.stats)
        return statsSource[statName] || 1; // Default to 1 if stat not found on NPC
    }
    return 1;
}

// Calculates the modifier for a given stat.
// Depends on `getStatValue`.
function getStatModifier(statName, entity) {
    const statPoints = getStatValue(statName, entity);
    return Math.floor(statPoints / 2) - 1;
}

// Calculates the modifier for a given skill.
// Depends on `getSkillValue` and `getStatModifier`.
function getSkillModifier(skillName, entity) {
    const skillToStatMap = {
        "Animal Handling": "Charisma",
        "Electronics": "Intelligence",
        "Explosives": "Marksmanship", // Corrected
        "Guns": "Marksmanship",
        "Intimidation": "Charisma",   // Corrected
        "Investigation": "Perception",
        "Lockpick": "Dexterity",
        "Medicine": "Intelligence",
        "Melee Weapons": "Strength",
        "Persuasion": "Charisma",
        "Repair": "Intelligence",
        "Sleight of Hand": "Dexterity",
        "Stealth": "Dexterity",
        "Survival": "Constitution",  // Corrected
        "Unarmed": "Strength"
    };

    const skillPoints = getSkillValue(skillName, entity);
    const correspondingStatName = skillToStatMap[skillName];

    if (!correspondingStatName) {
        console.error(`No stat mapping found for skill: ${skillName}. Defaulting to base skill calculation.`);
        // It's important that getStatModifier is robust enough or that skills always have a mapping.
        // If a skill truly has no corresponding stat, its modifier would just be skillPoints/10.
        // However, the design implies all skills should map to a stat.
        // For safety, if a mapping is missing, we could return just the skill point derived part.
        return Math.floor(skillPoints / 10);
    }

    const correspondingStatModifier = getStatModifier(correspondingStatName, entity);
    return Math.floor(skillPoints / 10) + correspondingStatModifier;
}

// Exporting for potential ES6 module usage later, though current structure is global.
// export { logToConsole, rollDie, parseDiceNotation, rollDiceNotation, getSkillValue, getStatValue, getStatModifier, getSkillModifier };
