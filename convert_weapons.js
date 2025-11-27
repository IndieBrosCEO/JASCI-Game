
const fs = require('fs');
const path = require('path');

const WEAPONS_FILE = 'assets/definitions/weapons.json';
const CONSUMABLES_FILE = 'assets/definitions/consumables.json';

const MELEE_CSV = `Weapon,Damage,Damage Type,Size,Weight
Spear,1d8,Piercing,Large,9 lb.
Katana,1d8,Slashing,Large,6 lb.
Longsword,1d8,Slashing,Med,4 lb.
Hatchet,1d6,Slashing,Small,4 lb.
Rapier,1d6,Piercing,Med,3 lb.
Sword cane,1d6,Piercing,Med,3 lb.
Club,1d4,Bludgeoning,Med,3 lb.
Sap,1d3,Bludgeoning,Small,3 lb.
Kama,1d6,Slashing,Small,2 lb.
Machete,1d6,Slashing,Small,2 lb.
Cleaver,1d4,Slashing,Small,2 lb.
Metal baton,1d4,Bludgeoning,Med,2 lb.
Tonfa,1d4,Bludgeoning,Med,2 lb.
Nunchaku,1d3,Bludgeoning,Small,2 lb.
Whip ,1d2,Bludgeoning,Small,2 lb.
Chain saw,1d10,Slashing,Large,10 lb.
Kukri,1d6,Slashing,Small,1 lb.
Bayonet (fixed),1d5,Piercing,Large,1 lb.
Knife,1d4,Piercing,Tiny,1 lb.
Brass knuckles,1d3,Bludgeoning,Tiny,1 lb.
Stun gun,0,None,Tiny,1 lb.
Straight razor,1d3,Slashing,Tiny,0.5 lb.`;

const RANGED_CSV = `Weapon,Damage,Damage Type,Rate of Fire,Magazine,Size,Weight
M-60,d10,Ballistic,A,100,Huge,22 lb.
M2HB,2d6,Ballistic,A,100,Huge,75 lb.
TEC-9 (9mm machine pistol),1d6,Ballistic,"S,A",32,Med,4 lb.
MAC Ingram M10 (.45 machine pistol),1d6,Ballistic,"S,A",30,Med,6 lb.
HK MP5 (9mm submachine gun),d6,Ballistic,"S,A",30,Large,7 lb.
AKM/AK-47 (7.62mmR assault rifle),d8,Ballistic,"S,A",30,Large,10 lb.
M16A2 (5.56mm assault rifle),d8,Ballistic,"S,A",30,Large,8 lb.
M4 Carbine (5.56mm assault rifle),d8,Ballistic,"S,A",30,Large,7 lb.
Steyr AUG (5.56mm assault rifle),d8,Ballistic,"S,A",30,Large,9 lb.
Skorpion (.32 machine pistol),1d4,Ballistic,"S,A",20,Med,4 lb.
Beretta 93R (9mm machine pistol),1d6,Ballistic,"S,A",20,Med,3 lb.
Uzi (9mm submachine gun),d6,Ballistic,"S,A",20,Large,8 lb.
HK G3 (7.62mm assault rifle),d10,Ballistic,"S,A",20,Large,11 lb.
Glock 17 (9mm autoloader),1d6,Ballistic,S,17,Small,2 lb.
Beretta 92F (9mm autoloader),1d6,Ballistic,S,15,Small,3 lb.
Glock 201 (10mm autoloader),1d6,Ballistic,S,15,Small,3 lb.
HK MP5K (9mm submachine gun),d6,Ballistic,"S,A",15,Med,5 lb.
Barrett Light Fifty (.50 sniper rifle),2d6,Ballistic,S,11,Huge,35 lb.
Flamethrower,d8,Flaming,A,10,Large,50 lb.
Colt Double Eagle (10mm autoloader),1d6,Ballistic,S,9,Small,3 lb.
Desert Eagle (.50AE autoloader),1d10,Ballistic,S,8,Med,4 lb.
SITES M9 (9mm autoloader),1d6,Ballistic,S,8,Tiny,2 lb.
AA-12 (12-gauge automatic shotgun),"slug d10, buck d8",Ballistic,"S,A",8,Large,14 lb
Walther PPK (.32 autoloader),1d4,Ballistic,S,7,Small,1 lb.
Colt M1911 (.45 autoloader),1d6,Ballistic,S,7,Small,3 lb.
Benelli 121 M1 (12-gague shotgun),"slug d10, buck d8",Ballistic,S,7,Large,8 lb.
Pathfinder (.22 revolver),1d3,Ballistic,S,6,Tiny,1 lb.
Ruger Service-Six (.38S revolver),1d6,Ballistic,S,6,Small,2 lb.
S&W M29 (.44 magnum revolver),1d8,Ballistic,S,6,Med,3 lb.
Colt Python1 (.357 revolver),1d8,Ballistic,S,6,Med,3 lb.
Winchester 94 (.444 hunting rifle),d10,Ballistic,S,6,Large,7 lb.
Mossberg (12-gauge shotgun),"slug d10, buck d8",Ballistic,S,6,Large,7 lb.
Browning BPS (10-gauge shotgun),"slug d10, buck d8",Ballistic,S,5,Large,11 lb.
HK PSG11 (7.62mm sniper rifle),d10,Ballistic,S,5,Large,16 lb.
Beretta M3P (12-gauge shotgun),"slug d10, buck d8",Ballistic,S,5,Large,9 lb.
Remington 700 (7.62mm hunting rifle),d10,Ballistic,S,5,Large,8 lb.
Derringer (.45),1d4,Ballistic,S,2,Tiny,1 lb.
Sawed-off shotgun (12-ga shotgun),"slug d10, buck d8",Ballistic,S,2,Med,4 lb.
M72A3 LAW (rocket launcher),2d10/2d6 (15ft),Explosive,S,1,Large,5 lb.
M79 (grenade launcher),2d6/d8 (10ft),Explosive,S,1,Large,7 lb.
Crossbow,1d6,Piercing,S,1,Med,7 lb.
Pepper spray,0,None,S,1,Tiny,0.5 lb.
Taser,0,None,S,1,Small,2 lb.
Compound bow,1d4,Piercing,S,1,Large,3 lb.
Javelin,d6,Piercing,S,1,Med,2 lb.
Shuriken,1,Slashing,S,1,Tiny,0.5 lb.`;

const SPLASH_CSV = `Weapon,Damage,Splash Damage,Burn Damage Per Round,Damage Type,Burst Radius in ft,Size,Weight
40mm fragmentation grenade,2d6,1d8,,Slashing,10,Tiny,1 lb.
C4/Semtex,2d10,2d6,,Concussion,10,Small,1 lb.
Det cord,2d6,,,Fire,5,Med,2 lb.
Dynamite,d10,1d8,,Concussion,5,Tiny,1 lb.
Fragmentation grenade,2d6,1d8,,Slashing,20,Tiny,1 lb.
Smoke grenade,0,,,None,20,Small,2 lb.
Tear gas grenade,1d2-1,,,Acid,20,Small,2 lb.
Thermite grenade,2d6,,2d6,Fire,5,Small,2 lb.
White phosphorus grenade,2d6,,1d6,Fire,20,Small,2 lb.
"Acid, mild",1d4,,1d4,Acid,10,Tiny,1 lb.
Molotov Cocktail,1d6,,1d6,Fire,10,Small,1 lb.`;

// Utils
function parseCSV(csv) {
    const lines = csv.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        const row = {};
        let currentField = '';
        let inQuotes = false;
        let fieldIndex = 0;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row[headers[fieldIndex]] = currentField.trim();
                currentField = '';
                fieldIndex++;
            } else {
                currentField += char;
            }
        }
        row[headers[fieldIndex]] = currentField.trim();
        data.push(row);
    }
    return data;
}

function sizeToNumber(sizeStr) {
    if (!sizeStr) return 3; // Default
    const s = sizeStr.toLowerCase();
    if (s.includes('tiny')) return 1;
    if (s.includes('small')) return 2;
    if (s.includes('med')) return 3;
    if (s.includes('large')) return 4;
    if (s.includes('huge')) return 5;
    return 3;
}

function cleanDamage(dmg) {
    if (!dmg) return "1d4"; // Default
    if (dmg.startsWith('d') && !dmg.startsWith('d6') && !dmg.startsWith('d8') && !dmg.startsWith('d10')) return '1' + dmg; // e.g. "d10" -> "1d10"
    if (dmg === 'd6') return '1d6';
    if (dmg === 'd8') return '1d8';
    if (dmg === 'd10') return '1d10';

    // Handle "slug d10, buck d8"
    if (dmg.includes("slug") && dmg.includes("buck")) {
        return "1d10"; // Default to slug for high damage, or buck?
        // Actually earlier I said buckshot. 1d8 is buck. 1d10 is slug.
        // Let's go with 1d10 (Slug) as it is often the first listed.
        // Or "1d8" (Buck) if I want to be safe with existing ammo.
        // Let's use 1d8 to match "12gauge_buckshot" ammo type.
        return "1d8";
    }

    // Handle "2d10/2d6 (15ft)"
    if (dmg.includes("/")) {
        return dmg.split('/')[0].trim();
    }

    return dmg;
}

function parseWeight(wStr) {
    if (!wStr) return 1;
    return parseFloat(wStr.replace(' lb.', '').replace('lb', '').trim()) || 1;
}

function mapRateOfFire(rof) {
    if (!rof) return "S";
    if (rof.includes("S") && rof.includes("A")) return "S,A"; // Or however JSON handles select fire?
    // JSON 'desert_eagle' has "S".
    // I will stick to "S", "A", "S,A" notation if the game supports it.
    return rof.replace('"', '').replace('"', '');
}

function generateId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/_$/, '');
}

function inferAmmo(name, description) {
    const n = (name + " " + description).toLowerCase();
    if (n.includes("5.56")) return "5.56mm";
    if (n.includes("7.62")) return "7.62mm";
    if (n.includes("9mm")) return "9mm";
    if (n.includes("12-gauge") || n.includes("12 gauge")) return "12gauge_buckshot";
    if (n.includes(".50ae")) return ".50AE";
    if (n.includes(".44")) return ".44mag";
    if (n.includes(".45")) return ".45ACP";
    if (n.includes(".22")) return ".22LR";
    if (n.includes(".38")) return ".38SPL";
    if (n.includes(".357")) return ".357MAG";
    if (n.includes("10mm")) return "10mm";
    if (n.includes(".50") && n.includes("sniper")) return ".50BMG";
    if (n.includes(".32")) return ".32ACP";

    return null; // Unknown
}

// Load existing
let weapons = JSON.parse(fs.readFileSync(WEAPONS_FILE, 'utf8'));
let consumables = JSON.parse(fs.readFileSync(CONSUMABLES_FILE, 'utf8'));

const processedIds = new Set();
const skippedItems = [];

function processItem(itemData, category) {
    const name = itemData.Weapon;
    const damage = cleanDamage(itemData.Damage);
    const type = itemData['Damage Type'];
    const size = sizeToNumber(itemData.Size);
    const weight = parseWeight(itemData.Weight);
    const rof = mapRateOfFire(itemData['Rate of Fire']);
    const mag = parseInt(itemData.Magazine) || 1;
    const splash = itemData['Splash Damage'];
    const burst = parseInt(itemData['Burst Radius in ft']) || 0;

    // Check for "None" damage (confusing)
    if (damage === '0' || damage === 'None' || type === 'None') {
        skippedItems.push({ name, reason: 'Zero damage or None type' });
        return;
    }

    // ID generation logic: try to find match in existing by Name, else generate
    let existingWeapon = weapons.find(w => w.name.toLowerCase() === name.toLowerCase());
    let existingConsumable = consumables.find(c => c.name.toLowerCase() === name.toLowerCase());

    // Special mapping for known existing IDs
    if (name.includes("Desert Eagle")) existingWeapon = weapons.find(w => w.id === 'desert_eagle_50ae');
    if (name.includes("S&W M29")) existingWeapon = weapons.find(w => w.id === 'sw_m29_44');
    if (name === "Knife") existingWeapon = weapons.find(w => w.id === 'knife_melee');
    if (name === "Club") existingWeapon = weapons.find(w => w.id === 'club_melee');

    if (name.includes("C4")) existingConsumable = consumables.find(c => c.id === 'c4_semtex_explosive');
    if (name.includes("Det cord")) existingConsumable = consumables.find(c => c.id === 'det_cord_explosive');
    if (name.includes("Dynamite")) existingConsumable = consumables.find(c => c.id === 'dynamite_explosive');
    if (name.includes("Molotov")) existingConsumable = consumables.find(c => c.id === 'molotov_cocktail');

    let targetObj = existingWeapon || existingConsumable;
    let isNew = false;

    if (!targetObj) {
        isNew = true;
        targetObj = {
            id: generateId(name),
            name: name,
            description: `${name}.`,
            canEquip: true
        };
    }

    // Update Fields
    targetObj.size = size;
    targetObj.weightLbs = weight;
    targetObj.damage = damage;
    targetObj.damageType = type;

    if (category === 'Ranged') {
        targetObj.type = "weapon_firearm";
        targetObj.family = "firearm";
        targetObj.rateOfFire = rof;
        targetObj.magazineSize = mag;

        // Tags
        if (!targetObj.tags) targetObj.tags = ["weapon", "firearm"];
        if (name.toLowerCase().includes("pistol")) targetObj.tags.push("pistol");
        if (name.toLowerCase().includes("rifle")) targetObj.tags.push("rifle");
        if (name.toLowerCase().includes("shotgun")) targetObj.tags.push("shotgun");

        // Ammo
        if (!targetObj.ammoType) {
            const ammo = inferAmmo(name, "");
            if (ammo) targetObj.ammoType = ammo;
            else targetObj.ammoType = "generic_ammo"; // Placeholder
        }

        // Properties
         if (!targetObj.properties) targetObj.properties = {};
         if (!targetObj.properties.type) targetObj.properties.type = "gun"; // Generic
         if (!targetObj.properties.caliber) targetObj.properties.caliber = targetObj.ammoType;
         if (!targetObj.properties.action) targetObj.properties.action = rof === "S" ? "semi-auto" : "automatic";

    } else if (category === 'Melee') {
        targetObj.type = "weapon_melee";
        targetObj.family = "melee_weapon";
        if (!targetObj.tags) targetObj.tags = ["weapon", "melee"];
        if (type === 'Piercing') targetObj.tags.push('piercing');
        if (type === 'Slashing') targetObj.tags.push('slashing');
        if (type === 'Bludgeoning') targetObj.tags.push('bludgeoning');

        // Properties
        if (!targetObj.properties) targetObj.properties = {};
        if (!targetObj.properties.type) targetObj.properties.type = "melee";
        if (!targetObj.properties.size) targetObj.properties.size = size === 2 ? "small" : "medium"; // Approximate
    } else if (category === 'Splash') {
        // Decide if it goes to weapons or stays in consumables
        // If it was already in consumables, keep it there.
        // If new, put in weapons.
        if (existingConsumable) {
            // It's in consumables
            if (burst > 0) targetObj.burstRadiusFt = burst;
            if (splash) targetObj.splashDamage = splash; // Custom field?
            // Ensure type is correct for weapon use
            if (!targetObj.type.startsWith('weapon_') && !targetObj.type.startsWith('consumable_explosive')) {
                 targetObj.type = "weapon_thrown";
            }
        } else {
            // New Splash Weapon -> weapons.json
            targetObj.type = "weapon_thrown";
            targetObj.family = "explosive"; // or thrown?
            if (burst > 0) targetObj.burstRadiusFt = burst;
            if (!targetObj.tags) targetObj.tags = ["weapon", "thrown", "explosive"];
        }
    }

    // Save back
    if (isNew) {
        if (category === 'Splash' && !existingConsumable) {
             weapons.push(targetObj);
        } else if (!existingConsumable) {
             weapons.push(targetObj);
        }
    }

    processedIds.add(targetObj.id);
}

// Execute
parseCSV(MELEE_CSV).forEach(i => processItem(i, 'Melee'));
parseCSV(RANGED_CSV).forEach(i => processItem(i, 'Ranged'));
parseCSV(SPLASH_CSV).forEach(i => processItem(i, 'Splash'));

console.log("Skipped:", skippedItems);

// Write
fs.writeFileSync(WEAPONS_FILE, JSON.stringify(weapons, null, 2));
fs.writeFileSync(CONSUMABLES_FILE, JSON.stringify(consumables, null, 2));
console.log("Done.");
