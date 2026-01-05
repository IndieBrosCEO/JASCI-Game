const fs = require('fs');
const path = require('path');

const ITEMS_DIR = 'assets/definitions/items';
const LOOT_TABLES_FILE = 'assets/definitions/loot_tables.json';

// Helper to read JSON
function readJSON(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        // Remove BOM if present
        const cleanContent = content.replace(/^\uFEFF/, '');
        return JSON.parse(cleanContent);
    } catch (e) {
        console.error(`Error reading ${filepath}:`, e);
        return null;
    }
}

// Load all items
function loadAllItems() {
    const items = [];
    if (!fs.existsSync(ITEMS_DIR)) {
        console.error(`Directory not found: ${ITEMS_DIR}`);
        return items;
    }
    const files = fs.readdirSync(ITEMS_DIR);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const data = readJSON(path.join(ITEMS_DIR, file));
            if (Array.isArray(data)) {
                items.push(...data);
            }
        }
    }
    return items;
}

// Load loot tables
function loadLootTables() {
    const data = readJSON(LOOT_TABLES_FILE);
    const lootItems = new Set();
    if (data) {
        for (const key in data) {
            const drops = data[key];
            for (const drop of drops) {
                lootItems.add(drop.itemId);
            }
        }
    }
    // Hardcoded sources (e.g. water)
    lootItems.add("water_clean_item");
    lootItems.add("water_dirty");

    return lootItems;
}

// Check if an item matches recipe requirements
function itemMatchesRequirements(item, family, requirements) {
    if (item.family !== family) return false;
    if (!requirements) return true;

    for (const [key, value] of Object.entries(requirements)) {
        if (item.properties && item.properties[key] === value) {
            continue;
        }
        return false;
    }
    return true;
}

function verifyCraftingChain() {
    const allItems = loadAllItems();
    const itemMap = new Map(allItems.map(i => [i.id, i]));
    const lootItems = loadLootTables();

    console.log(`Loaded ${allItems.length} items.`);
    console.log(`Identified ${lootItems.size} raw resource items from loot tables.`);

    // 1. Build Dependency Graph
    // Map: ItemID -> { obtainable: boolean, recipes: [] }
    const itemStatus = new Map();

    for (const item of allItems) {
        itemStatus.set(item.id, {
            id: item.id,
            name: item.name,
            obtainable: lootItems.has(item.id),
            craftable: false,
            usedIn: [], // List of itemIDs that use this item
            recipes: item.recipe ? [item.recipe] : [] // Some items have embedded recipe
        });
    }

    // Resolve usages
    for (const item of allItems) {
        if (!item.recipe) continue;

        const components = item.recipe.components || [];
        for (const comp of components) {
            // Find all possible items that satisfy this component
            const candidates = allItems.filter(candidate =>
                itemMatchesRequirements(candidate, comp.family, comp.require)
            );

            if (candidates.length === 0) {
                console.warn(`[WARNING] Item '${item.id}' recipe requires component (Family: ${comp.family}, Req: ${JSON.stringify(comp.require)}) but no matching item found.`);
            } else {
                for (const cand of candidates) {
                    const status = itemStatus.get(cand.id);
                    if (status) {
                        status.usedIn.push(item.id);
                    }
                }
            }
        }
    }

    // Iteratively determine obtainability
    let changed = true;
    while (changed) {
        changed = false;
        for (const [id, status] of itemStatus) {
            if (status.obtainable) continue; // Already marked

            // Check recipes
            if (status.recipes.length > 0) {
                const recipe = status.recipes[0];
                const components = recipe.components || [];

                let recipePossible = true;
                for (const comp of components) {
                    const candidates = allItems.filter(candidate =>
                        itemMatchesRequirements(candidate, comp.family, comp.require)
                    );

                    const anyObtainable = candidates.some(c => {
                        const s = itemStatus.get(c.id);
                        return s && s.obtainable;
                    });

                    if (!anyObtainable) {
                        recipePossible = false;
                        break;
                    }
                }

                if (recipePossible) {
                    status.obtainable = true;
                    status.craftable = true;
                    changed = true;
                }
            }
        }
    }

    // Report Dead Ends (Not obtainable)
    const deadEnds = [];
    for (const [id, status] of itemStatus) {
        // Filter out items that are not expected to be craftable or lootable (admin items, debug items, etc.)
        // For now, report everything that is not obtainable.
        if (!status.obtainable) {
            // Check if it's a specific rare weapon that might be map-spawn only.
            // If it's a crafting material, it's a critical failure.
            const item = itemMap.get(id);
            if (item.type === 'crafting_material') {
                 console.error(`[ERROR] Dead End Material: ${item.name} (${item.id})`);
                 deadEnds.push(status);
            }
        }
    }

    if (deadEnds.length > 0) {
        console.log("\nFAIL: Guardrails triggered (Dead End Materials found).");
        process.exit(1);
    } else {
        console.log("\nPASS: No Dead End Materials found.");
        process.exit(0);
    }
}

verifyCraftingChain();
