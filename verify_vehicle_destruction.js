
const assert = require('assert');

// Mock logToConsole
global.logToConsole = (msg, type) => {
    // console.log(`[${type}] ${msg}`);
};

// Mock dependencies
class MockAssetManager {
    constructor() {
        this.vehiclePartDefinitions = {};
        this.vehicleTemplateDefinitions = {};
    }
}

// ---------------------------------------------------------
// VehicleManager Code (Pasted for testing)
// ---------------------------------------------------------
class VehicleManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.vehicleParts = {};
        this.vehicleTemplates = {};
    }

    initialize() {
        if (!this.assetManager) return false;

        if (this.assetManager.vehiclePartDefinitions) {
            this.vehicleParts = this.assetManager.vehiclePartDefinitions;
        } else {
            return false;
        }

        if (this.assetManager.vehicleTemplateDefinitions) {
            this.vehicleTemplates = this.assetManager.vehicleTemplateDefinitions;
        } else {
            return false;
        }
        return true;
    }

    generateUniqueVehicleId() {
        return 'vehicle_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    spawnVehicle(templateId, mapId, pos) {
        if (!this.vehicleTemplates[templateId]) return null;
        if (!this.gameState || !this.gameState.vehicles) return null;

        const template = this.vehicleTemplates[templateId];
        const chassisPart = this.vehicleParts[template.chassisId];
        if (!chassisPart) return null;

        const newVehicle = {
            id: this.generateUniqueVehicleId(),
            templateId: templateId,
            name: template.name || "Unnamed Vehicle",
            mapPos: { ...pos },
            currentMapId: mapId,
            chassis: template.chassisId,
            attachedParts: {},
            durability: {},
            fuel: template.defaultFuel || 0,
            maxFuel: 0,
            cargo: [],
            passengers: [],
            currentMovementPoints: 6
        };

        newVehicle.durability[template.chassisId] = chassisPart.durability;

        Object.keys(chassisPart.slotPoints).forEach(slotType => {
            newVehicle.attachedParts[slotType] = new Array(chassisPart.slotPoints[slotType]).fill(null);
        });

        if (template.defaultParts && Array.isArray(template.defaultParts)) {
            template.defaultParts.forEach(partInfo => {
                const partDef = this.vehicleParts[partInfo.partId];
                if (partDef) {
                    if (newVehicle.attachedParts[partInfo.slotType] && partInfo.slotIndex < newVehicle.attachedParts[partInfo.slotType].length) {
                        newVehicle.attachedParts[partInfo.slotType][partInfo.slotIndex] = partInfo.partId;
                        newVehicle.durability[partInfo.partId] = partDef.durability;
                        if (partDef.type === "engine" && partDef.maxFuel) {
                            newVehicle.maxFuel += partDef.maxFuel;
                        }
                        if (partDef.type.startsWith("storage") && partDef.effects && partDef.effects.cargoCapacity) {
                            if (!newVehicle.cargoDetails) newVehicle.cargoDetails = { capacity: 0, items: [] };
                            newVehicle.cargoDetails.capacity += partDef.effects.cargoCapacity;
                        }
                    }
                }
            });
        }

        this.gameState.vehicles.push(newVehicle);
        this.calculateVehicleStats(newVehicle.id);
        return newVehicle.id;
    }

    getVehicleById(vehicleId) {
        if (!this.gameState || !this.gameState.vehicles) return null;
        return this.gameState.vehicles.find(v => v.id === vehicleId);
    }

    calculateVehicleStats(vehicleId) {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) return null;

        let totalWeight = 0;
        let totalPower = 0;
        let totalArmor = 0;
        let totalCargoCapacity = 0;
        let maxFuel = 0;
        let tractionFactor = 1.0;

        const chassisDef = this.vehicleParts[vehicle.chassis];
        if (chassisDef) {
            totalWeight += chassisDef.weight || 0;
        }

        const allPartIds = new Set();
        Object.values(vehicle.attachedParts).forEach(slotArray => {
            slotArray.forEach(partId => {
                if (partId) allPartIds.add(partId);
            });
        });

        allPartIds.forEach(partId => {
            const partDef = this.vehicleParts[partId];
            if (partDef) {
                totalWeight += partDef.weight || 0;
                if (partDef.type === "engine") {
                    totalPower += (partDef.effects && partDef.effects.power) || 0;
                    maxFuel += partDef.maxFuel || 0;
                }
                if (partDef.type.startsWith("armor") && partDef.effects && partDef.effects.armorValue) {
                    totalArmor += partDef.effects.armorValue;
                }
                if (partDef.type.startsWith("storage") && partDef.effects && partDef.effects.cargoCapacity) {
                    totalCargoCapacity += partDef.effects.cargoCapacity;
                }
                if (partDef.type === "wheel" && partDef.effects && partDef.effects.traction) {
                    tractionFactor = (tractionFactor + partDef.effects.traction) / 2;
                }
            }
        });

        vehicle.calculatedStats = {
            weight: totalWeight,
            power: totalPower,
            speed: totalPower > 0 && totalWeight > 0 ? Math.max(1, Math.floor((totalPower / totalWeight) * 600 * tractionFactor)) : 0,
            armor: totalArmor,
            cargoCapacity: totalCargoCapacity,
        };
        vehicle.maxFuel = maxFuel;
        if (vehicle.cargoDetails) {
            vehicle.cargoDetails.capacity = totalCargoCapacity;
        } else if (totalCargoCapacity > 0) {
            vehicle.cargoDetails = { capacity: totalCargoCapacity, items: [] };
        }

        return vehicle.calculatedStats;
    }

    applyDamageToVehicle(vehicleId, damageAmount, targetedPartId = null, damageType = "generic") {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) return;

        let partToDamageId = targetedPartId;
        if (!partToDamageId) partToDamageId = vehicle.chassis;

        const partDef = this.vehicleParts[partToDamageId];
        if (!partDef || vehicle.durability[partToDamageId] === undefined) {
             if (targetedPartId && vehicle.durability[vehicle.chassis] !== undefined) {
                partToDamageId = vehicle.chassis;
            } else {
                return;
            }
        }

        const currentPartHP = vehicle.durability[partToDamageId];
        const armor = vehicle.calculatedStats ? (vehicle.calculatedStats.armor || 0) : 0;
        let actualDamage = Math.max(0, damageAmount - armor);

        vehicle.durability[partToDamageId] = Math.max(0, currentPartHP - actualDamage);

        if (vehicle.durability[partToDamageId] <= 0) {
            logToConsole(`VehicleManager: Part "${partDef ? partDef.name : partToDamageId}" on vehicle "${vehicle.name}" has been destroyed!`, "combat-critical");
            this.calculateVehicleStats(vehicleId);
        }
    }
}
// ---------------------------------------------------------

// Test Setup
const assetManager = new MockAssetManager();
// Populate definitions
assetManager.vehiclePartDefinitions = {
    "chassis_test": {
        id: "chassis_test",
        type: "chassis",
        durability: 100,
        weight: 100,
        slotPoints: { "engine": 1, "wheel": 4 }
    },
    "engine_test": {
        id: "engine_test",
        name: "Test Engine",
        type: "engine",
        durability: 50,
        weight: 50,
        effects: { power: 100, fuelEfficiency: 0.1 },
        maxFuel: 100
    },
    "wheel_test": {
        id: "wheel_test",
        name: "Test Wheel",
        type: "wheel",
        durability: 20,
        weight: 10,
        effects: { traction: 1.0 }
    }
};
assetManager.vehicleTemplateDefinitions = {
    "vehicle_test": {
        id: "vehicle_test",
        name: "Test Vehicle",
        chassisId: "chassis_test",
        defaultParts: [
            { partId: "engine_test", slotType: "engine", slotIndex: 0 },
            { partId: "wheel_test", slotType: "wheel", slotIndex: 0 },
            { partId: "wheel_test", slotType: "wheel", slotIndex: 1 },
            { partId: "wheel_test", slotType: "wheel", slotIndex: 2 },
            { partId: "wheel_test", slotType: "wheel", slotIndex: 3 }
        ]
    }
};

const gameState = {
    vehicles: [],
    player: { skills: {} }
};

const vehicleManager = new VehicleManager(gameState, assetManager);
vehicleManager.initialize();

// Spawn Vehicle
const vehicleId = vehicleManager.spawnVehicle("vehicle_test", "map1", { x: 10, y: 10, z: 0 });
const vehicle = vehicleManager.getVehicleById(vehicleId);

console.log("Initial Power:", vehicle.calculatedStats.power);

// Test: Destroy Engine
console.log("Destroying Engine...");
vehicleManager.applyDamageToVehicle(vehicleId, 60, "engine_test", "generic");

const statsAfterEngineDeath = vehicle.calculatedStats;
console.log("Power after engine death:", statsAfterEngineDeath.power);

// Verification Logic
// The current implementation calculates stats regardless of durability.
// So power should still be 100.
if (statsAfterEngineDeath.power === 100) {
    console.log("Current behavior verified: Engine destruction does NOT remove power.");
} else if (statsAfterEngineDeath.power === 0) {
    console.log("Unexpected: Engine destruction ALREADY removes power?");
} else {
    console.log("Unexpected power value:", statsAfterEngineDeath.power);
}

// Ensure the goal is to make it 0.
