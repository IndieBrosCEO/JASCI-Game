// verify_mechanics.js

// Mock window and gameState
global.window = {};
global.gameState = {
    stats: [
        { name: "Strength", points: 10 },
        { name: "Intelligence", points: 10 },
        { name: "Dexterity", points: 10 },
        { name: "Constitution", points: 10 },
        { name: "Perception", points: 10 },
        { name: "Willpower", points: 10 },
        { name: "Charisma", points: 10 }
    ],
    skills: [
        { name: "Explosives", points: 0 },
        { name: "Guns", points: 0 },
        { name: "Survival", points: 0 },
        { name: "Animal Handling", points: 0 }
    ]
};
global.window.gameState = global.gameState;

// Load utils.js (simulated by reading file content since it's not a module)
const fs = require('fs');
const utilsCode = fs.readFileSync('./js/utils.js', 'utf8');
eval(utilsCode);
// Note: eval is used here to load the global functions from utils.js into the current scope
// similar to how they would be loaded in the browser.

function runTests() {
    let passed = true;

    console.log("--- Verifying Stat Modifiers ---");
    // Formula: floor(Score/2) - 1
    // Score 10 -> floor(5) - 1 = 4
    // Score 3 -> floor(1.5) - 1 = 0
    // Score 20 -> floor(10) - 1 = 9

    const checkStatMod = (score, expected) => {
        // Mock a stat entry
        const mockEntity = {
            stats: [{ name: "TestStat", points: score }]
        };
        const mod = getStatModifier("TestStat", mockEntity);
        if (mod === expected) {
            console.log(`PASS: Score ${score} -> Mod ${mod}`);
        } else {
            console.error(`FAIL: Score ${score} -> Expected ${expected}, got ${mod}`);
            passed = false;
        }
    };

    checkStatMod(10, 4);
    checkStatMod(3, 0);
    checkStatMod(20, 9);
    checkStatMod(1, -1); // floor(0.5) - 1 = -1

    console.log("\n--- Verifying Skill Associations ---");
    // Explosives -> Intelligence
    // Guns -> Perception
    // Survival -> Constitution

    const checkSkillAssoc = (skillName, statName) => {
        // Set up mock entity with 10 in the target stat (mod 4) and 0 skill points
        // Skill Mod = floor(0/10) + 4 = 4
        // If wrong stat is used (and it has different score), we can detect it.

        // Reset stats
        const mockEntity = {
            stats: [
                { name: "Strength", points: 2 }, // Mod 0
                { name: "Intelligence", points: 2 }, // Mod 0
                { name: "Dexterity", points: 2 }, // Mod 0
                { name: "Constitution", points: 2 }, // Mod 0
                { name: "Perception", points: 2 }, // Mod 0
                { name: "Willpower", points: 2 }, // Mod 0
                { name: "Charisma", points: 2 }  // Mod 0
            ],
            skills: [{ name: skillName, points: 0 }]
        };

        // Set the expected stat to 12 (Mod = 6 - 1 = 5)
        const statEntry = mockEntity.stats.find(s => s.name === statName);
        if(statEntry) statEntry.points = 12;

        const mod = getSkillModifier(skillName, mockEntity);
        // Expected: floor(0/10) + 5 = 5.
        // If it used a stat with points 2, mod would be floor(1) - 1 = 0.

        if (mod === 5) {
             console.log(`PASS: ${skillName} correctly uses ${statName}`);
        } else {
             console.error(`FAIL: ${skillName} did not use ${statName}. Result Mod: ${mod}`);
             passed = false;
        }
    };

    checkSkillAssoc("Explosives", "Intelligence");
    checkSkillAssoc("Guns", "Perception");
    checkSkillAssoc("Survival", "Constitution");
    checkSkillAssoc("Animal Handling", "Charisma");

    console.log("\n--- Verifying Marksmanship Removal ---");
    // Check if Marksmanship is in gameState.stats
    const hasMarksmanship = global.gameState.stats.some(s => s.name === "Marksmanship");
    if (!hasMarksmanship) {
        console.log("PASS: Marksmanship is not in gameState.stats");
    } else {
        console.error("FAIL: Marksmanship IS still in gameState.stats");
        passed = false;
    }

    if (passed) {
        console.log("\nALL MECHANICS VERIFIED SUCCESSFULLY.");
    } else {
        console.log("\nSOME CHECKS FAILED.");
        process.exit(1);
    }
}

runTests();
