const fs = require('fs');
const path = require('path');

const getFiles = (dir) => {
    let results = [];
    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getFiles(filePath));
            } else if (file.endsWith('.json')) {
                results.push(filePath);
            }
        });
    }
    return results;
};

// 1. Load all items and constructions
const itemsFiles = getFiles('assets/definitions/items');
let itemMap = {};

itemsFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.id) itemMap[item.id] = item;
            });
        } else if (typeof data === 'object') {
            for (const key in data) {
                if (data[key].id) {
                    itemMap[data[key].id] = data[key];
                } else {
                    data[key].id = key;
                    itemMap[key] = data[key];
                }
            }
        }
    } catch (e) {
        console.error('Error parsing', file, e);
    }
});

let constructionMap = {};
try {
    const constFile = 'assets/definitions/constructions.json';
    const content = fs.readFileSync(constFile, 'utf8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.id) constructionMap[item.id] = item;
        });
    }
} catch (e) {
    console.error('Error parsing constructions.json', e);
}

// Map from family to array of item IDs
let familyMap = {};
for (const id in itemMap) {
    const item = itemMap[id];
    if (item.family) {
        if (!familyMap[item.family]) familyMap[item.family] = [];
        familyMap[item.family].push(id);
    }
}

const getName = (id) => {
    if (itemMap[id]) return itemMap[id].name || id;
    if (constructionMap[id]) return constructionMap[id].name || id;
    return id;
};

const isCraftable = (id) => {
    const entity = itemMap[id] || constructionMap[id];
    if (!entity) return false;
    let recipe = entity.recipe;
    if (!recipe && entity.components) recipe = entity;
    return recipe && (recipe.components || recipe.tools_required);
};

const getRecipe = (id) => {
    const entity = itemMap[id] || constructionMap[id];
    if (!entity) return null;
    let recipe = entity.recipe;
    if (!recipe && entity.components) recipe = entity;
    return recipe && (recipe.components || recipe.tools_required) ? recipe : null;
};

const buildTree = (stream, idOrFamily, isFamily = false, qty = 1, indent = 0, pathSet = new Set()) => {
    if (indent > 50) {
        stream.write(`${'  '.repeat(indent)}* [MAX DEPTH REACHED]\n`);
        return;
    }

    const prefix = '  '.repeat(indent) + '- ';

    if (isFamily) {
        const familyStr = `Family: ${idOrFamily}`;
        stream.write(`${prefix}${qty}x [${familyStr}] (Requires one of the following):\n`);

        const members = familyMap[idOrFamily] || [];
        if (members.length === 0) {
            stream.write(`${'  '.repeat(indent + 1)}* [UN-CRAFTABLE BASE MATERIAL] This family has no known members and falls off here.\n`);
            return;
        }

        let craftableMembers = [];
        let uncraftableMembers = [];
        members.forEach(m => {
            if (isCraftable(m)) craftableMembers.push(m);
            else uncraftableMembers.push(m);
        });

        uncraftableMembers.forEach(m => {
            stream.write(`${'  '.repeat(indent + 1)}- ${getName(m)} (Un-craftable Base Material - Chain ends here)\n`);
        });

        if (craftableMembers.length > 0) {
            const m = craftableMembers[0];
            if (pathSet.has(m)) {
                 stream.write(`${'  '.repeat(indent + 1)}- ${getName(m)} (Craftable, but circular dependency detected)\n`);
            } else {
                 stream.write(`${'  '.repeat(indent + 1)}- ${getName(m)} (Example Craftable Member):\n`);
                 buildTree(stream, m, false, 1, indent + 2, new Set(pathSet));
            }
            if (craftableMembers.length > 1) {
                 stream.write(`${'  '.repeat(indent + 1)}- ... and ${craftableMembers.length - 1} other craftable alternatives.\n`);
            }
        }
        return;
    }

    const entity = itemMap[idOrFamily] || constructionMap[idOrFamily];

    if (!entity) {
        stream.write(`${prefix}${qty}x ${idOrFamily} (UNKNOWN ENTITY)\n`);
        stream.write(`${'  '.repeat(indent + 1)}* [UN-CRAFTABLE BASE MATERIAL] Falls off here.\n`);
        return;
    }

    const name = getName(idOrFamily);
    stream.write(`${prefix}${qty}x ${name}\n`);

    if (pathSet.has(idOrFamily)) {
        stream.write(`${'  '.repeat(indent + 1)}* (Circular Dependency Detected)\n`);
        return;
    }

    const recipe = getRecipe(idOrFamily);

    if (!recipe) {
        stream.write(`${'  '.repeat(indent + 1)}* [UN-CRAFTABLE BASE MATERIAL] Chain ends here.\n`);
        return;
    }

    pathSet.add(idOrFamily);

    let tools = recipe.tools_required || [];
    if (tools.length > 0) {
        stream.write(`${'  '.repeat(indent + 1)}[Tools Required]:\n`);
        tools.forEach(toolId => {
            buildTree(stream, toolId, false, 1, indent + 2, new Set(pathSet));
        });
    }

    let components = recipe.components || [];
    if (components.length > 0) {
        stream.write(`${'  '.repeat(indent + 1)}[Components Required]:\n`);
        components.forEach(comp => {
            const compQty = comp.quantity || 1;
            if (comp.family) {
                buildTree(stream, comp.family, true, compQty * qty, indent + 2, new Set(pathSet));
            } else if (comp.itemId) {
                buildTree(stream, comp.itemId, false, compQty * qty, indent + 2, new Set(pathSet));
            } else {
                stream.write(`${'  '.repeat(indent + 2)}- ${compQty * qty}x (Unknown Component Structure)\n`);
            }
        });
    }
};

let stream = fs.createWriteStream('crafting_roadmaps.txt');

const allEntities = [...Object.values(itemMap), ...Object.values(constructionMap)];
const craftableEntities = allEntities.filter(e => isCraftable(e.id));

craftableEntities.forEach(entity => {
    stream.write(`### Roadmap for: ${entity.name || entity.id} (${entity.id})\n`);
    buildTree(stream, entity.id, false, 1, 0, new Set());
    stream.write(`\n--------------------------------------------------\n\n`);
});

stream.end();
console.log('Roadmaps generated to crafting_roadmaps.txt');
