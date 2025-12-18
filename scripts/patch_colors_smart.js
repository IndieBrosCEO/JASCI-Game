const fs = require('fs');
const path = require('path');

const definitionsDir = 'assets/definitions';

// Comprehensive CSS Color Map
const cssColors = {
  "aliceblue": "#f0f8ff",
  "antiquewhite": "#faebd7",
  "aqua": "#00ffff",
  "aquamarine": "#7fffd4",
  "azure": "#f0ffff",
  "beige": "#f5f5dc",
  "bisque": "#ffe4c4",
  "black": "#000000",
  "blanchedalmond": "#ffebcd",
  "blue": "#0000ff",
  "blueviolet": "#8a2be2",
  "brown": "#a52a2a",
  "burlywood": "#deb887",
  "cadetblue": "#5f9ea0",
  "chartreuse": "#7fff00",
  "chocolate": "#d2691e",
  "coral": "#ff7f50",
  "cornflowerblue": "#6495ed",
  "cornsilk": "#fff8dc",
  "crimson": "#dc143c",
  "cyan": "#00ffff",
  "darkblue": "#00008b",
  "darkcyan": "#008b8b",
  "darkgoldenrod": "#b8860b",
  "darkgray": "#a9a9a9",
  "darkgreen": "#006400",
  "darkgrey": "#a9a9a9",
  "darkkhaki": "#bdb76b",
  "darkmagenta": "#8b008b",
  "darkolivegreen": "#556b2f",
  "darkorange": "#ff8c00",
  "darkorchid": "#9932cc",
  "darkred": "#8b0000",
  "darksalmon": "#e9967a",
  "darkseagreen": "#8fbc8f",
  "darkslateblue": "#483d8b",
  "darkslategray": "#2f4f4f",
  "darkslategrey": "#2f4f4f",
  "darkturquoise": "#00ced1",
  "darkviolet": "#9400d3",
  "deeppink": "#ff1493",
  "deepskyblue": "#00bfff",
  "dimgray": "#696969",
  "dimgrey": "#696969",
  "dodgerblue": "#1e90ff",
  "firebrick": "#b22222",
  "floralwhite": "#fffaf0",
  "forestgreen": "#228b22",
  "fuchsia": "#ff00ff",
  "gainsboro": "#dcdcdc",
  "ghostwhite": "#f8f8ff",
  "gold": "#ffd700",
  "goldenrod": "#daa520",
  "gray": "#808080",
  "green": "#008000",
  "greenyellow": "#adff2f",
  "grey": "#808080",
  "honeydew": "#f0fff0",
  "hotpink": "#ff69b4",
  "indianred": "#cd5c5c",
  "indigo": "#4b0082",
  "ivory": "#fffff0",
  "khaki": "#f0e68c",
  "lavender": "#e6e6fa",
  "lavenderblush": "#fff0f5",
  "lawngreen": "#7cfc00",
  "lemonchiffon": "#fffacd",
  "lightblue": "#add8e6",
  "lightcoral": "#f08080",
  "lightcyan": "#e0ffff",
  "lightgoldenrodyellow": "#fafad2",
  "lightgray": "#d3d3d3",
  "lightgreen": "#90ee90",
  "lightgrey": "#d3d3d3",
  "lightpink": "#ffb6c1",
  "lightsalmon": "#ffa07a",
  "lightseagreen": "#20b2aa",
  "lightskyblue": "#87cefa",
  "lightslategray": "#778899",
  "lightslategrey": "#778899",
  "lightsteelblue": "#b0c4de",
  "lightyellow": "#ffffe0",
  "lime": "#00ff00",
  "limegreen": "#32cd32",
  "linen": "#faf0e6",
  "magenta": "#ff00ff",
  "maroon": "#800000",
  "mediumaquamarine": "#66cdaa",
  "mediumblue": "#0000cd",
  "mediumorchid": "#ba55d3",
  "mediumpurple": "#9370db",
  "mediumseagreen": "#3cb371",
  "mediumslateblue": "#7b68ee",
  "mediumspringgreen": "#00fa9a",
  "mediumturquoise": "#48d1cc",
  "mediumvioletred": "#c71585",
  "midnightblue": "#191970",
  "mintcream": "#f5fffa",
  "mistyrose": "#ffe4e1",
  "moccasin": "#ffe4b5",
  "navajowhite": "#ffdead",
  "navy": "#000080",
  "oldlace": "#fdf5e6",
  "olive": "#808000",
  "olivedrab": "#6b8e23",
  "orange": "#ffa500",
  "orangered": "#ff4500",
  "orchid": "#da70d6",
  "palegoldenrod": "#eee8aa",
  "palegreen": "#98fb98",
  "paleturquoise": "#afeeee",
  "palevioletred": "#db7093",
  "papayawhip": "#ffefd5",
  "peachpuff": "#ffdab9",
  "peru": "#cd853f",
  "pink": "#ffc0cb",
  "plum": "#dda0dd",
  "powderblue": "#b0e0e6",
  "purple": "#800080",
  "rebeccapurple": "#663399",
  "red": "#ff0000",
  "rosybrown": "#bc8f8f",
  "royalblue": "#4169e1",
  "saddlebrown": "#8b4513",
  "salmon": "#fa8072",
  "sandybrown": "#f4a460",
  "seagreen": "#2e8b57",
  "seashell": "#fff5ee",
  "sienna": "#a0522d",
  "silver": "#c0c0c0",
  "skyblue": "#87ceeb",
  "slateblue": "#6a5acd",
  "slategray": "#708090",
  "slategrey": "#708090",
  "snow": "#fffafa",
  "springgreen": "#00ff7f",
  "steelblue": "#4682b4",
  "tan": "#d2b48c",
  "teal": "#008080",
  "thistle": "#d8bfd8",
  "tomato": "#ff6347",
  "turquoise": "#40e0d0",
  "violet": "#ee82ee",
  "wheat": "#f5deb3",
  "white": "#ffffff",
  "whitesmoke": "#f5f5f5",
  "yellow": "#ffff00",
  "yellowgreen": "#9acd32",
  "slate_gray": "#708090",
  "light_gray": "#d3d3d3",
  "bluegray": "#6699cc",
  "electricblue": "#7df9ff"
};

function inferMaterial(item, id) {
  if (id && id.startsWith('Win')) return 'glass_window';

  if (item.properties && item.properties.material) return item.properties.material;
  if (item.material) return item.material;

  const tags = item.tags || [];
  if (tags.includes('wood') || tags.includes('wood_structure')) return 'wood';
  if (tags.includes('metal') || tags.includes('metal_structure')) return 'metal';
  if (tags.includes('stone') || tags.includes('rock_formation')) return 'stone';
  if (tags.includes('plastic')) return 'plastic';
  if (tags.includes('glass')) return 'glass';
  if (tags.includes('fabric') || tags.includes('textile')) return 'fabric';
  if (tags.includes('flesh') || tags.includes('corpse')) return 'flesh';
  if (tags.includes('water')) return 'water';
  if (tags.includes('vegetation') || tags.includes('plant')) return 'vegetation';
  if (tags.includes('concrete')) return 'concrete';
  if (tags.includes('ceramic')) return 'ceramic';
  if (tags.includes('sand')) return 'sand';
  if (tags.includes('dirt')) return 'dirt';
  if (tags.includes('paper')) return 'paper';

  const text = ((item.name || '') + ' ' + (id || '')).toLowerCase();
  if (text.includes('wood') || text.includes('plank') || text.includes('log')) return 'wood';
  if (text.includes('metal') || text.includes('steel') || text.includes('iron') || text.includes('copper')) return 'metal';
  if (text.includes('stone') || text.includes('rock') || text.includes('cobble')) return 'stone';
  if (text.includes('plastic')) return 'plastic';
  if (text.includes('glass')) return 'glass';
  if (text.includes('flesh') || text.includes('meat') || text.includes('zombie')) return 'flesh';
  if (text.includes('water')) return 'water';
  if (text.includes('grass') || text.includes('tree') || text.includes('bush')) return 'vegetation';
  if (text.includes('concrete') || text.includes('cement')) return 'concrete';
  if (text.includes('paper') || text.includes('book')) return 'paper';
  if (text.includes('leather') || text.includes('hide')) return 'leather';
  if (text.includes('sand')) return 'sand';
  if (text.includes('mud')) return 'mud';
  if (text.includes('dirt')) return 'dirt';

  return 'unknown_material';
}

function shiftColor(hex, amount) {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    // Apply shifts
    b = (b + amount * 7) % 256;
    if (amount % 2 === 1) g = (g + amount * 3) % 256;
    else r = (r + amount * 2) % 256;

    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Global collision tracking
const usedHexes = new Map(); // Hex -> Material

function getUniqueHex(baseHex, material, seedOffset = 0) {
    let candidate = baseHex;
    let attempts = 0;
    let offset = seedOffset;

    while (attempts < 100) {
        if (offset > 0) {
            candidate = shiftColor(baseHex, offset);
        }

        const existingMat = usedHexes.get(candidate);

        // If unused, or used by same material, it's valid
        if (!existingMat || existingMat === material) {
            usedHexes.set(candidate, material);
            return candidate;
        }

        // Collision with different material!
        offset++;
        attempts++;
    }

    console.warn(`Could not find unique hex for ${material} base ${baseHex} after 100 attempts.`);
    return candidate; // Fallback
}

// Data collection
const allItems = [];
const files = fs.readdirSync(definitionsDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(definitionsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    let data;
    try { data = JSON.parse(content); } catch(e) { console.error("Error parsing", file); return; }

    function traverse(obj, parentId) {
        if (typeof obj !== 'object' || obj === null) return;

        let currentId = obj.id || parentId;
        if (file === 'tileset.json' && parentId === undefined) {
             for (const key in obj) {
                 traverse(obj[key], key);
             }
             return;
        }

        if (obj.hasOwnProperty('color') && typeof obj.color === 'string') {
            const material = inferMaterial(obj, currentId);
            allItems.push({
                file,
                id: currentId,
                originalColor: obj.color,
                material,
                itemObj: obj
            });
        }

        if (Array.isArray(obj)) {
            obj.forEach(item => traverse(item, item.id || parentId));
        } else {
            for (const key in obj) {
                if (typeof obj[key] === 'object') traverse(obj[key], currentId);
            }
        }
    }
    traverse(data);
});

// Calculate Replacements
const replacements = new Map(); // "File:ID" -> NewHex
const colorGroups = {};

allItems.forEach(item => {
    let c = item.originalColor.toLowerCase();
    if (cssColors[c]) c = cssColors[c];
    if (!colorGroups[c]) colorGroups[c] = [];
    colorGroups[c].push(item);
});

Object.keys(colorGroups).forEach(baseColor => {
    const items = colorGroups[baseColor];
    const matGroups = {};

    items.forEach(it => {
        const mat = it.material;
        if (!matGroups[mat]) matGroups[mat] = [];
        matGroups[mat].push(it);
    });

    const materials = Object.keys(matGroups).sort();

    materials.forEach((mat, idx) => {
        let base = baseColor;
        let offset = 0;

        if (mat === 'glass_window') {
            base = '#add8e6';
            // Windows should always start fresh to avoid green
        } else if (idx > 0) {
            // Force shift if sharing base color with other materials
            offset = idx * 10;
        }

        const targetHex = getUniqueHex(base, mat, offset);

        matGroups[mat].forEach(item => {
            const uniqueKey = `${item.file}:${item.id}`;
            replacements.set(uniqueKey, targetHex);
        });
    });
});

// Apply
files.forEach(file => {
    const filePath = path.join(definitionsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const newLines = [];

    let currentId = null;
    const idPropRegex = /"id":\s*"([^"]+)"/;
    const keyPropRegex = /"([^"]+)":\s*\{/;
    const colorRegex = /"color":\s*"([^"]+)"/;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (file === 'tileset.json') {
            const keyMatch = line.match(keyPropRegex);
            if (keyMatch && line.trim().startsWith('"')) {
                 currentId = keyMatch[1];
            }
        } else {
            const idMatch = line.match(idPropRegex);
            if (idMatch) {
                currentId = idMatch[1];
            }
        }

        const colorMatch = line.match(colorRegex);
        if (colorMatch) {
            const originalVal = colorMatch[1];
            const candidates = allItems.filter(i => i.file === file && i.originalColor === originalVal);
            // Get all possible targets for this color string in this file
            const targetHexes = [...new Set(candidates.map(c => replacements.get(`${c.file}:${c.id}`)))];

            let replacementHex = null;
            if (targetHexes.length === 1) {
                replacementHex = targetHexes[0];
            } else if (currentId && replacements.has(`${file}:${currentId}`)) {
                replacementHex = replacements.get(`${file}:${currentId}`);
            } else {
                // Look ahead
                for(let j=i+1; j<Math.min(i+20, lines.length); j++) {
                    const futureIdMatch = lines[j].match(idPropRegex);
                    if (futureIdMatch) {
                        const futureId = futureIdMatch[1];
                        if (replacements.has(`${file}:${futureId}`)) {
                            replacementHex = replacements.get(`${file}:${futureId}`);
                            currentId = futureId;
                        }
                        break;
                    }
                }
            }

            if (replacementHex) {
                line = line.replace(`"${originalVal}"`, `"${replacementHex}"`);
            } else {
               let defC = cssColors[originalVal.toLowerCase()];
               if (defC) line = line.replace(`"${originalVal}"`, `"${defC}"`);
            }
        }

        newLines.push(line);
    }

    fs.writeFileSync(filePath, newLines.join('\n'));
});

console.log("Colors patched globally.");
