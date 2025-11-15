const fs = require('fs');
const path = require('path');

const DEFINITIONS_PATH = path.join(__dirname, '..', 'assets', 'definitions');

const allItems = new Map();
let families = {};
let legacyAliases = {};

function loadJson(filePath) {
    const fullPath = path.join(DEFINITIONS_PATH, filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        return null;
    }
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(fileContent);
}

function loadAllItems() {
    const itemFiles = [
        'crafting_materials.json',
        'consumables.json',
        'trap_kits.json',
        'weapons.json',
        'ammunition.json',
        'clothing.json',
        'tools.json',
        'containers.json'
    ];

    for (const fileName of itemFiles) {
        const items = loadJson(fileName);
        if (items) {
            for (const item of items) {
                if (allItems.has(item.id)) {
                    console.error(`Duplicate item ID: ${item.id} in ${fileName}`);
                }
                allItems.set(item.id, item);
            }
        }
    }
}

function validate() {
    families = loadJson('families.json');
    legacyAliases = loadJson('legacy_aliases.json');
    loadAllItems();

    if (!families || !legacyAliases) {
        console.error("Failed to load families.json or legacy_aliases.json. Aborting validation.");
        return;
    }

    console.log("Validation started...");

    let errors = 0;

    // Validate each item
    for (const [id, item] of allItems.entries()) {
        if (!item.family) {
            console.error(`Item ${id} is missing a family.`);
            errors++;
            continue;
        }

        const family = families[item.family];
        if (!family) {
            console.error(`Item ${id} has an invalid family: ${item.family}`);
            errors++;
            continue;
        }

        if (item.properties) {
            for (const prop in item.properties) {
                if (!family.properties[prop]) {
                    console.error(`Item ${id} has an invalid property for family ${item.family}: ${prop}`);
                    errors++;
                }
            }
        }

        if (item.recipe) {
            for (const component of item.recipe.components) {
                if (component.family) {
                    if (!families[component.family]) {
                        console.error(`Recipe for ${id} has an invalid component family: ${component.family}`);
                        errors++;
                    }
                } else if (component.itemId) {
                     console.error(`Recipe for ${id} is using a legacy itemId component: ${component.itemId}`);
                     errors++;
                }
            }
        }
    }

    // TODO: Add more validation checks here, e.g. for constructions, recipe solvability, etc.

    console.log(`Validation finished with ${errors} errors.`);
}

validate();
