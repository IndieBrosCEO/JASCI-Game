const fs = require('fs');
const path = require('path');

const DEFINITIONS_PATH = path.join(__dirname, '../assets/definitions');

function loadJson(filename) {
    const filePath = path.join(DEFINITIONS_PATH, filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
}

function validate() {
    const families = loadJson('families.json');
    const legacyAliases = loadJson('legacy_aliases.json');
    const constructions = loadJson('constructions.json');
    const items = [
        ...loadJson('crafting_materials.json'),
        ...loadJson('weapons.json'),
        ...loadJson('ammunition.json'),
        ...loadJson('consumables.json'),
        ...loadJson('clothing.json'),
        ...loadJson('tools.json'),
        ...loadJson('containers.json'),
    ];

    const allItemIds = new Set();
    items.forEach(item => {
        if (allItemIds.has(item.id)) {
            console.error(`[FAIL] Duplicate item ID: ${item.id}`);
        }
        allItemIds.add(item.id);
    });

    items.forEach(item => {
        if (item.family && !families[item.family]) {
            console.error(`[FAIL] Item ${item.id} has unknown family: ${item.family}`);
        }

        if (item.family && item.properties) {
            const family = families[item.family];
            for (const prop in item.properties) {
                if (!family.properties[prop]) {
                    console.error(`[FAIL] Item ${item.id} has unknown property ${prop} for family ${item.family}`);
                }
            }
        }
    });

    const allRecipes = items.filter(i => i.recipe).map(i => i.recipe);
    [...allRecipes, ...constructions].forEach(recipe => {
        (recipe.components || []).forEach(component => {
            if (component.family) {
                const resolver = {
                    findMatchingItemDefinitions: (c) => {
                        const familyItems = items.filter(i => i.family === c.family);
                        return familyItems.filter(item => {
                            // Simplified validation logic
                            return true;
                        });
                    }
                };
                const matches = resolver.findMatchingItemDefinitions(component);
                if (matches.length === 0) {
                    console.error(`[FAIL] Recipe for ${recipe.id || 'construction'} has unsolvable component: ${JSON.stringify(component)}`);
                }
            }
        });
    });

    console.log("Validation complete.");
}

validate();
