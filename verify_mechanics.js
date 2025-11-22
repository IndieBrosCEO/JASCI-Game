
const assert = require('assert');

// Mock window and global objects
global.window = {};
global.gameState = {
    stats: [
        { name: "Strength", points: 3 },
        { name: "Intelligence", points: 3 },
        { name: "Dexterity", points: 3 },
        { name: "Constitution", points: 3 },
        { name: "Perception", points: 3 },
        { name: "Willpower", points: 3 },
        { name: "Charisma", points: 3 }
    ],
    skills: [
        { name: "Animal Handling", points: 0 },
        { name: "Electronics", points: 0 },
        { name: "Explosives", points: 0 },
        { name: "Guns", points: 0 },
        { name: "Intimidation", points: 0 },
        { name: "Investigation", points: 0 },
        { name: "Lockpick", points: 0 },
        { name: "Medicine", points: 0 },
        { name: "Melee Weapons", points: 0 },
        { name: "Persuasion", points: 0 },
        { name: "Repair", points: 0 },
        { name: "Sleight of Hand", points: 0 },
        { name: "Stealth", points: 0 },
        { name: "Survival", points: 0 },
        { name: "Unarmed", points: 0 }
    ],
    unspentSkillPoints: 30,
    unspentPerkPicks: 0
};

// Helper to load file content and eval it (poor man's require for non-module JS files)
const fs = require('fs');
function loadFile(path) {
    const content = fs.readFileSync(path, 'utf8');
    eval(content);
}

// Load necessary files
// We need to be careful about what these files execute immediately
loadFile('js/utils.js');
// loadFile('js/character.js'); // character.js has DOM manipulation in global scope or init, might fail.
// We only need logic verification, which is mostly in utils.js for modifiers.
// Point buy logic is in character.js, but it interacts with DOM. We can inspect the functions if we extract them or mock DOM.

// Mock DOM for character.js if needed
global.document = {
    getElementById: () => ({
        textContent: "",
        addEventListener: () => {}
    }),
    addEventListener: () => {}
};
global.alert = console.log;

// Load character.js to test updateStat/updateSkill logic
loadFile('js/character.js');


function testStatModifier() {
    console.log("Testing Stat Modifier Formula...");
    // Formula: floor(Score/2) - 1
    // Score 10 -> floor(5) - 1 = 4
    // Score 3 -> floor(1.5) - 1 = 0
    // Score 20 -> floor(10) - 1 = 9

    const mockEntity = {
        stats: [{ name: "Strength", points: 10 }]
    };

    const mod10 = window.getStatModifier("Strength", mockEntity);
    assert.strictEqual(mod10, 4, `Expected mod for 10 to be 4, got ${mod10}`);

    mockEntity.stats[0].points = 3;
    const mod3 = window.getStatModifier("Strength", mockEntity);
    assert.strictEqual(mod3, 0, `Expected mod for 3 to be 0, got ${mod3}`);

    mockEntity.stats[0].points = 20;
    const mod20 = window.getStatModifier("Strength", mockEntity);
    assert.strictEqual(mod20, 9, `Expected mod for 20 to be 9, got ${mod20}`);

    mockEntity.stats[0].points = 1;
    const mod1 = window.getStatModifier("Strength", mockEntity);
    assert.strictEqual(mod1, -1, `Expected mod for 1 to be -1, got ${mod1}`); // floor(0.5) - 1 = -1

    console.log("Stat Modifier Formula: OK");
}

function testSkillModifier() {
    console.log("Testing Skill Modifier Formula and Associations...");
    // Skill Mod = floor(SkillScore/10) + related stat mod

    // Case 1: Guns (Perception)
    // Stat: Perception = 12 -> Mod = 5
    // Skill: Guns = 45 -> floor(4.5) = 4
    // Total = 4 + 5 = 9

    const mockEntity = {
        stats: [
            { name: "Perception", points: 12 },
            { name: "Intelligence", points: 10 }
        ],
        skills: [
            { name: "Guns", points: 45 },
            { name: "Explosives", points: 0 }
        ]
    };

    // Explicitly inject skills object if getSkillValue expects it in a specific way
    // Utils.js checks entity.skills array or object.

    const gunsMod = window.getSkillModifier("Guns", mockEntity);
    // getSkillModifier calls getStatModifier internally.
    // It should map Guns to Perception.

    // Debug:
    // Stat Mod for PER(12) = floor(6)-1 = 5
    // Skill base for 45 = 4
    // Expected = 9
    assert.strictEqual(gunsMod, 9, `Expected Guns mod (PER 12, Skill 45) to be 9, got ${gunsMod}`);

    // Case 2: Explosives (Intelligence)
    // Stat: Intelligence = 10 -> Mod = 4
    // Skill: Explosives = 0 -> 0
    // Total = 4
    const explosivesMod = window.getSkillModifier("Explosives", mockEntity);
    assert.strictEqual(explosivesMod, 4, `Expected Explosives mod (INT 10, Skill 0) to be 4, got ${explosivesMod}`);

    // Case 3: Investigation (Perception) -- Checking the fix/verification (User changed to Cyan/Perception)
    const mockEntity2 = {
        stats: [
            { name: "Perception", points: 12 }, // Mod = 5
            { name: "Intelligence", points: 10 } // Mod = 4
        ],
        skills: [{ name: "Investigation", points: 0 }]
    };
    const invMod = window.getSkillModifier("Investigation", mockEntity2);
    // Expected: floor(0/10) + 5 (from PER) = 5.
    // If it used INT, it would be 4.
    assert.strictEqual(invMod, 5, `Expected Investigation to use Perception (Mod 5), got ${invMod}`);

    console.log("Skill Modifier Formula & Associations: OK");
}

function testPointBuyLimits() {
    console.log("Testing Point Buy Limits...");

    const char = {
        stats: [{ name: "Strength", points: 3 }],
        skills: [{ name: "Unarmed", points: 0 }],
        MAX_SKILL_POINTS: 30 // From explicit check or gameState default
    };

    // Mock audioManager
    window.audioManager = { playUiSound: () => {} };

    // Test Stat Cap (35 total)
    // character.js updateStat logic:
    // It sums all stats.
    // We need to provide a character object that matches the structure expected by updateStat.
    // updateStat(name, value, character)

    const fullChar = {
        stats: [
            { name: "Strength", points: 10 },
            { name: "Intelligence", points: 10 },
            { name: "Dexterity", points: 10 },
            { name: "Constitution", points: 5 }, // Total 35
            { name: "Perception", points: 0 },
            { name: "Willpower", points: 0 }, // min is usually 1
            { name: "Charisma", points: 0 }
        ],
        MIN_STAT_VALUE: 0,
        MAX_STAT_VALUE: 20
    };

    // Try to increase Strength to 11 (Total would be 36)
    // Note: updateStat uses the *old* value from the array to calc difference.
    // current total = 35.
    // new value = 11. Old = 10. Diff = +1. New Total = 36. Should fail.

    // But updateStat function signature: updateStat(name, value, character)
    // We need to capture if it failed. It returns void but calls alert().
    // We mocked alert to console.log.

    let alertCalled = false;
    global.alert = (msg) => {
        alertCalled = true;
        console.log("Alert:", msg);
    };

    window.updateStat("Strength", 11, fullChar);
    assert.strictEqual(alertCalled, true, "Should alert when exceeding 35 stat points");
    assert.strictEqual(fullChar.stats[0].points, 10, "Should not update stat if limit exceeded");

    // Test Skill Cap (30 total)
    // Similar logic.
    const skillChar = {
        skills: [
            { name: "Unarmed", points: 30 },
            { name: "Melee Weapons", points: 0 }
        ],
        MAX_SKILL_POINTS: 30
    };

    alertCalled = false;
    window.updateSkill("Melee Weapons", 1, skillChar);
    assert.strictEqual(alertCalled, true, "Should alert when exceeding 30 skill points");
    assert.strictEqual(skillChar.skills[1].points, 0, "Should not update skill if limit exceeded");

    console.log("Point Buy Limits: OK");
}

function verifyDefinitions() {
    console.log("Verifying Global Definitions...");

    // Check Stats list
    const stats = gameState.stats.map(s => s.name);
    const expectedStats = ["Strength", "Intelligence", "Dexterity", "Constitution", "Perception", "Willpower", "Charisma"];
    assert.deepStrictEqual(stats, expectedStats, "Stats list should match exactly");

    // Check Skills list
    const skills = gameState.skills.map(s => s.name);
    // User list: Animal Handling, Electronics, Explosives, Guns, Intimidation, Investigation, Lockpick, Medicine, Melee Weapons, Persuasion, Repair, Sleight of Hand, Stealth, Survival, Unarmed.
    const expectedSkills = [
        "Animal Handling", "Electronics", "Explosives", "Guns", "Intimidation",
        "Investigation", "Lockpick", "Medicine", "Melee Weapons", "Persuasion",
        "Repair", "Sleight of Hand", "Stealth", "Survival", "Unarmed"
    ];
    // Sort to ignore order if needed, but gameState usually preserves order
    assert.deepStrictEqual(skills.sort(), expectedSkills.sort(), "Skills list should match exactly");

    assert.strictEqual(gameState.unspentSkillPoints, 30, "Starting skill points should be 30");
    assert.strictEqual(gameState.unspentPerkPicks, 0, "Starting perk picks should be 0");

    console.log("Global Definitions: OK");
}

try {
    testStatModifier();
    testSkillModifier();
    testPointBuyLimits();
    verifyDefinitions();
    console.log("All verifications passed!");
} catch (e) {
    console.error("Verification Failed:", e);
    process.exit(1);
}
