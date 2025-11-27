
const fs = require('fs');

const AMMO_FILE = 'assets/definitions/ammunition.json';

const NEW_AMMO = [
    {
        id: "ammo_45acp",
        name: ".45 ACP Rounds",
        description: "A box of .45 ACP ammunition. Common in heavy pistols and SMGs.",
        family: "ammunition",
        properties: { caliber: ".45ACP" },
        type: "ammunition", size: 1, weightLbs: 0.6,
        tags: ["ammo", "modern", "pistol"],
        ammoType: ".45ACP", quantity: 50
    },
    {
        id: "ammo_22lr",
        name: ".22 LR Rounds",
        description: "A box of .22 Long Rifle ammunition. Small and light.",
        family: "ammunition",
        properties: { caliber: ".22LR" },
        type: "ammunition", size: 1, weightLbs: 0.3,
        tags: ["ammo", "modern", "pistol", "rifle"],
        ammoType: ".22LR", quantity: 100
    },
    {
        id: "ammo_38spl",
        name: ".38 Special Rounds",
        description: "A box of .38 Special ammunition. Common for revolvers.",
        family: "ammunition",
        properties: { caliber: ".38SPL" },
        type: "ammunition", size: 1, weightLbs: 0.5,
        tags: ["ammo", "modern", "revolver"],
        ammoType: ".38SPL", quantity: 50
    },
    {
        id: "ammo_357mag",
        name: ".357 Magnum Rounds",
        description: "A box of .357 Magnum ammunition. Powerful revolver rounds.",
        family: "ammunition",
        properties: { caliber: ".357MAG" },
        type: "ammunition", size: 1, weightLbs: 0.6,
        tags: ["ammo", "modern", "revolver"],
        ammoType: ".357MAG", quantity: 50
    },
    {
        id: "ammo_50bmg",
        name: ".50 BMG Rounds",
        description: "A box of .50 Browning Machine Gun ammunition. Extremely powerful.",
        family: "ammunition",
        properties: { caliber: ".50BMG" },
        type: "ammunition", size: 2, weightLbs: 3,
        tags: ["ammo", "modern", "rifle", "heavy"],
        ammoType: ".50BMG", quantity: 10
    },
    {
        id: "ammo_32acp",
        name: ".32 ACP Rounds",
        description: "A box of .32 ACP ammunition. For small pistols.",
        family: "ammunition",
        properties: { caliber: ".32ACP" },
        type: "ammunition", size: 1, weightLbs: 0.4,
        tags: ["ammo", "modern", "pistol"],
        ammoType: ".32ACP", quantity: 50
    },
    {
        id: "ammo_10mm",
        name: "10mm Auto Rounds",
        description: "A box of 10mm Auto ammunition. Powerful pistol rounds.",
        family: "ammunition",
        properties: { caliber: "10mm" },
        type: "ammunition", size: 1, weightLbs: 0.6,
        tags: ["ammo", "modern", "pistol"],
        ammoType: "10mm", quantity: 50
    },
    {
        id: "ammo_50ae",
        name: ".50 AE Rounds",
        description: "A box of .50 Action Express ammunition. For massive handguns.",
        family: "ammunition",
        properties: { caliber: ".50AE" },
        type: "ammunition", size: 1, weightLbs: 0.8,
        tags: ["ammo", "modern", "pistol"],
        ammoType: ".50AE", quantity: 20
    },
    {
        id: "ammo_44mag",
        name: ".44 Magnum Rounds",
        description: "A box of .44 Magnum ammunition. For heavy revolvers.",
        family: "ammunition",
        properties: { caliber: ".44mag" },
        type: "ammunition", size: 1, weightLbs: 0.7,
        tags: ["ammo", "modern", "revolver"],
        ammoType: ".44mag", quantity: 50
    }
];

let ammoData = JSON.parse(fs.readFileSync(AMMO_FILE, 'utf8'));

NEW_AMMO.forEach(newAmmo => {
    if (!ammoData.some(a => a.ammoType === newAmmo.ammoType)) {
        ammoData.push(newAmmo);
    }
});

fs.writeFileSync(AMMO_FILE, JSON.stringify(ammoData, null, 2));
console.log("Added missing ammo types.");
