// js/vehicleManager.js

class VehicleManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.vehicleParts = {};
        this.vehicleTemplates = {};
    }

    initialize() {
        if (!this.assetManager) {
            console.error("VehicleManager: AssetManager not provided or available.");
            logToConsole("VehicleManager Error: AssetManager not available.", "error");
            return false;
        }

        // Directly access the loaded definitions from assetManager
        if (this.assetManager.vehiclePartDefinitions) {
            this.vehicleParts = this.assetManager.vehiclePartDefinitions;
            logToConsole(`VehicleManager: Accessed ${Object.keys(this.vehicleParts).length} vehicle parts from AssetManager.`, "info");
        } else {
            console.error("VehicleManager: vehiclePartDefinitions not found on assetManager instance.");
            logToConsole("VehicleManager Error: Could not access vehicle parts from AssetManager.", "error");
            return false;
        }

        if (this.assetManager.vehicleTemplateDefinitions) {
            this.vehicleTemplates = this.assetManager.vehicleTemplateDefinitions;
            logToConsole(`VehicleManager: Accessed ${Object.keys(this.vehicleTemplates).length} vehicle templates from AssetManager.`, "info");
        } else {
            console.error("VehicleManager: vehicleTemplateDefinitions not found on assetManager instance.");
            logToConsole("VehicleManager Error: Could not access vehicle templates from AssetManager.", "error");
            return false;
        }
        return true;
    }

    generateUniqueVehicleId() {
        return 'vehicle_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    spawnVehicle(templateId, mapId, pos) {
        if (!this.vehicleTemplates[templateId]) {
            logToConsole(`VehicleManager Error: Template ID "${templateId}" not found.`, "error");
            return null;
        }
        if (!this.gameState || !this.gameState.vehicles) {
            logToConsole("VehicleManager Error: gameState or gameState.vehicles is not available for spawning.", "error");
            return null;
        }

        const template = this.vehicleTemplates[templateId];
        const chassisPart = this.vehicleParts[template.chassisId];
        if (!chassisPart) {
            logToConsole(`VehicleManager Error: Chassis part ID "${template.chassisId}" for template "${templateId}" not found.`, "error");
            return null;
        }

        const newVehicle = {
            id: this.generateUniqueVehicleId(),
            templateId: templateId,
            name: template.name || "Unnamed Vehicle",
            mapPos: { ...pos },
            currentMapId: mapId,
            chassis: template.chassisId,
            attachedParts: {}, // e.g., { engines: ["engine_id"], wheels: ["wheel_id", ...] }
            durability: {}, // { partId: currentHP, ... }
            fuel: template.defaultFuel || 0,
            maxFuel: 0, // Will be calculated from engine parts
            cargo: [], // { capacity: X, items: [] } - if storage parts are attached
            passengers: [], // Array of entity IDs (e.g., player ID, NPC IDs)
            currentMovementPoints: 6 // Separate movement pool for vehicle (defaults to 6, like entities)
        };

        // Add chassis durability
        newVehicle.durability[template.chassisId] = chassisPart.durability;

        // Initialize attachedParts slots based on chassis
        Object.keys(chassisPart.slotPoints).forEach(slotType => {
            newVehicle.attachedParts[slotType] = new Array(chassisPart.slotPoints[slotType]).fill(null);
        });

        // Equip default parts from template
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
                    } else {
                        logToConsole(`VehicleManager Warning: Slot ${partInfo.slotType}[${partInfo.slotIndex}] not available for part ${partInfo.partId} on vehicle ${newVehicle.name}.`, "warn");
                    }
                } else {
                    logToConsole(`VehicleManager Warning: Default part ID "${partInfo.partId}" not found for template "${templateId}".`, "warn");
                }
            });
        }

        this.gameState.vehicles.push(newVehicle);
        logToConsole(`VehicleManager: Spawned vehicle "${newVehicle.name}" (ID: ${newVehicle.id}) on map ${mapId} at (${pos.x},${pos.y},${pos.z}).`, "info");
        this.calculateVehicleStats(newVehicle.id); // Initial stat calculation
        return newVehicle.id;
    }

    getVehicleById(vehicleId) {
        if (!this.gameState || !this.gameState.vehicles) return null;
        return this.gameState.vehicles.find(v => v.id === vehicleId);
    }

    getVehicleAt(mapId, x, y, z) {
        if (!this.gameState || !this.gameState.vehicles) return null;
        return this.gameState.vehicles.find(v =>
            v.currentMapId === mapId &&
            v.mapPos.x === x &&
            v.mapPos.y === y &&
            v.mapPos.z === z
        );
    }

    calculateVehicleStats(vehicleId) {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) {
            logToConsole(`VehicleManager Error: Cannot calculate stats, vehicle ID "${vehicleId}" not found.`, "error");
            return null;
        }

        let totalWeight = 0;
        let totalPower = 0;
        let totalArmor = 0; // This might be more complex (average, specific locations)
        let totalCargoCapacity = 0;
        let maxFuel = 0;
        let tractionFactor = 1.0; // Average or minimum traction from wheels

        // Include chassis weight
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
                    totalArmor += partDef.effects.armorValue; // Simple sum for now
                }
                if (partDef.type.startsWith("storage") && partDef.effects && partDef.effects.cargoCapacity) {
                    totalCargoCapacity += partDef.effects.cargoCapacity;
                }
                if (partDef.type === "wheel" && partDef.effects && partDef.effects.traction) {
                    // For simplicity, let's average traction. Min might be more realistic.
                    // This is a placeholder for more complex calculation.
                    // A better approach might involve considering the number of wheels, their condition,
                    // and the vehicle's total weight distribution. For now, simple averaging.
                    tractionFactor = (tractionFactor + partDef.effects.traction) / 2;
                }
            }
        });

        vehicle.calculatedStats = {
            weight: totalWeight,
            power: totalPower,
            speed: totalPower > 0 && totalWeight > 0 ? Math.max(1, Math.floor((totalPower / totalWeight) * 600 * tractionFactor)) : 0, // Adjusted constant to 600 for higher speed values
            armor: totalArmor, // Overall armor rating
            cargoCapacity: totalCargoCapacity,
        };
        vehicle.maxFuel = maxFuel; // Update max fuel based on engine(s)
        if (vehicle.cargoDetails) { // Update cargo capacity if storage parts provide it
            vehicle.cargoDetails.capacity = totalCargoCapacity;
        } else if (totalCargoCapacity > 0) {
            vehicle.cargoDetails = { capacity: totalCargoCapacity, items: [] };
        }


        logToConsole(`VehicleManager: Stats calculated for ${vehicle.name} (ID: ${vehicle.id}): Speed ${vehicle.calculatedStats.speed}, Weight ${totalWeight}, Power ${totalPower}, Armor ${totalArmor}, Cargo ${totalCargoCapacity}, Max Fuel ${maxFuel}.`, "info");
        return vehicle.calculatedStats;
    }

    getVehicleMovementCost(vehicleId) {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle || !vehicle.calculatedStats) return 1; // Default cost if vehicle not found

        const speed = vehicle.calculatedStats.speed;
        if (speed <= 0) return 999; // Immobile

        // Higher speed = lower movement cost.
        // Base human speed is roughly 6 tiles/turn.
        // If vehicle speed is 60 tiles/turn, cost should be 0.1 MP/tile (6 MP / 0.1 = 60).
        // Formula: Cost = 6 / Speed.
        const cost = Math.max(0.1, 6.0 / speed);
        // logToConsole(`Vehicle Movement Cost Debug: Speed ${speed} -> Cost ${cost}`);
        return cost;
    }

    consumeFuel(vehicleId, distance) {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) return false;

        // Calculate efficiency based on engines
        let efficiency = 0;
        const allPartIds = new Set();
        Object.values(vehicle.attachedParts).forEach(slotArray => {
            slotArray.forEach(partId => {
                if (partId) allPartIds.add(partId);
            });
        });

        let engineCount = 0;
        allPartIds.forEach(partId => {
            const partDef = this.vehicleParts[partId];
            if (partDef && partDef.type === "engine") {
                if (partDef.effects && typeof partDef.effects.fuelEfficiency !== 'undefined') {
                    efficiency += partDef.effects.fuelEfficiency;
                } else {
                    efficiency += 0.1;
                }
                engineCount++;
            }
        });

        if (engineCount > 0) efficiency /= engineCount; // Average efficiency

        const fuelConsumed = distance * efficiency;
        if (vehicle.fuel >= fuelConsumed) {
            vehicle.fuel -= fuelConsumed;
            if (vehicle.fuel < 0) vehicle.fuel = 0; // Should not happen due to check
            return true;
        } else {
            // Not enough fuel
            return false;
        }
    }

    addPartToVehicle(vehicleId, partIdToAdd, slotType, slotIndex) {
        const vehicle = this.getVehicleById(vehicleId);
        const partDef = this.vehicleParts[partIdToAdd];

        if (!vehicle) {
            logToConsole(`VehicleManager Error: Vehicle "${vehicleId}" not found.`, "error");
            return false;
        }
        if (!partDef) {
            logToConsole(`VehicleManager Error: Part "${partIdToAdd}" definition not found.`, "error");
            return false;
        }
        if (partDef.type !== slotType && !slotType.startsWith(partDef.type)) { // Allow "armor_light" part in "armor" slot if logic permits
            // More robust check: chassis slotPoints should define compatible part types.
            // For now, simple type match or category match.
            const chassisDef = this.vehicleParts[vehicle.chassis];
            let compatible = false;
            if (chassisDef && chassisDef.slotPoints && chassisDef.slotPoints[slotType]) {
                // This assumes slotPoints keys directly match part types or broader categories.
                // E.g. slotPoints: { "engine": N, "armor_light": M }
                // A part of type "engine" fits "engine". A part of type "armor_light" fits "armor_light".
                // A part of type "armor_medium" would NOT fit "armor_light" with this simple check.
                // A more complex system might have slot types like "general_armor" and parts specify compatibleSlotTypes: ["general_armor"].
                if (partDef.type === slotType) {
                    compatible = true;
                } else {
                    // Example: if slotType is "utility_small" and partDef.type is "headlight" (which is a utility_small part)
                    // This check is basic. A better way is for partDef to list its compatible slotPoint types,
                    // or for slotPoint types to list compatible partDefs.
                    // For now, assume the UI filters correctly or type is a direct match.
                    // The current vehicle_parts.json has types like "utility_small" for parts, and slotPoints also use "utility_small".
                }
            }
            if (!compatible && partDef.type !== slotType) { // Re-check after attempting more complex compatibility
                logToConsole(`VehicleManager Error: Part type "${partDef.type}" does not match slot type "${slotType}".`, "error");
                return false;
            }
        }

        if (!vehicle.attachedParts[slotType] || slotIndex >= vehicle.attachedParts[slotType].length) {
            logToConsole(`VehicleManager Error: Slot ${slotType}[${slotIndex}] does not exist on vehicle "${vehicle.name}".`, "error");
            return false;
        }
        if (vehicle.attachedParts[slotType][slotIndex] !== null) {
            logToConsole(`VehicleManager Info: Slot ${slotType}[${slotIndex}] is already occupied by ${vehicle.attachedParts[slotType][slotIndex]}. Remove it first.`, "info");
            return false; // Or auto-remove and add to inventory? For now, require manual removal.
        }

        // TODO: Check skill requirements (e.g., Mechanics from gameState.player)
        // Example: partDef.skillRequirements = { "Mechanics": 15 }
        if (partDef.skillRequirements && partDef.skillRequirements.Mechanics) { // Assuming "Mechanics" skill
            // Access global getSkillValue directly or via window
            const playerMechanics = (typeof window.getSkillValue === 'function') ? window.getSkillValue("Mechanics", this.gameState.player) : 0;
            if (playerMechanics < partDef.skillRequirements.Mechanics) {
                logToConsole(`VehicleManager: Failed to add part "${partDef.name}". Player Mechanics skill ${playerMechanics} too low. Requires ${partDef.skillRequirements.Mechanics}.`, "warn");
                if (window.uiManager) window.uiManager.showToastNotification(`Mechanics skill too low (need ${partDef.skillRequirements.Mechanics})!`, "error");
                // Note: Item consumption was handled by UI before this call. Consider if item should be returned to inventory here if skill check fails.
                // For now, UI consumed it, skill check here prevents install.
                return false;
            }
        }
        // Item consumption is handled by the UI before this call.

        vehicle.attachedParts[slotType][slotIndex] = partIdToAdd;
        vehicle.durability[partIdToAdd] = partDef.durability; // Set initial durability

        logToConsole(`VehicleManager: Part "${partDef.name}" added to vehicle "${vehicle.name}" in slot ${slotType}[${slotIndex}].`, "info");
        this.calculateVehicleStats(vehicleId);
        // TODO: Play sound effect for adding part
        if (window.audioManager) window.audioManager.playSoundAtLocation(partDef.soundOnInstall || 'vehicle_part_install_01.wav', vehicle.mapPos, {}, { maxDistance: 15 });
        return true;
    }

    removePartFromVehicle(vehicleId, slotType, slotIndex) {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) {
            logToConsole(`VehicleManager Error: Vehicle "${vehicleId}" not found.`, "error");
            return null;
        }
        if (!vehicle.attachedParts[slotType] || slotIndex >= vehicle.attachedParts[slotType].length || vehicle.attachedParts[slotType][slotIndex] === null) {
            logToConsole(`VehicleManager Error: No part to remove in slot ${slotType}[${slotIndex}] on vehicle "${vehicle.name}".`, "error");
            return null;
        }

        const partIdToRemove = vehicle.attachedParts[slotType][slotIndex];
        const partDef = this.vehicleParts[partIdToRemove];

        // Inventory addition is handled by the UI after this call.

        vehicle.attachedParts[slotType][slotIndex] = null;
        delete vehicle.durability[partIdToRemove];

        logToConsole(`VehicleManager: Part "${partDef ? partDef.name : partIdToRemove}" removed from vehicle "${vehicle.name}" from slot ${slotType}[${slotIndex}].`, "info");
        this.calculateVehicleStats(vehicleId);
        // TODO: Play sound effect for removing part
        if (window.audioManager) window.audioManager.playSoundAtLocation(partDef.soundOnRemove || 'vehicle_part_remove_01.wav', vehicle.mapPos, {}, { maxDistance: 15 });
        return partDef; // Return the definition of the removed part
    }

    repairVehiclePart(vehicleId, partIdToRepair, repairAmountPercentage, materials) {
        const vehicle = this.getVehicleById(vehicleId);
        const partDef = this.vehicleParts[partIdToRepair];

        if (!vehicle) {
            logToConsole(`VehicleManager Error: Vehicle "${vehicleId}" not found.`, "error");
            return false;
        }
        if (!partDef) {
            logToConsole(`VehicleManager Error: Part definition for "${partIdToRepair}" not found.`, "error");
            return false;
        }
        if (vehicle.durability[partIdToRepair] === undefined) {
            logToConsole(`VehicleManager Error: Part "${partIdToRepair}" is not on vehicle or has no durability entry.`, "error");
            return false;
        }
        if (vehicle.durability[partIdToRepair] >= partDef.durability) {
            logToConsole(`VehicleManager Info: Part "${partDef.name}" is already at full durability.`, "info");
            return false; // Already full
        }

        // TODO: Skill Check (Mechanics)
        // const mechanicsSkill = getSkillValue("Mechanics", this.gameState);
        // const repairDC = partDef.repairDC || 10; // Assuming a repairDC on partDef
        // if (rollDie(20) + getSkillModifier("Mechanics", this.gameState) < repairDC) { logToConsole("Repair failed skill check."); return false; }

        // TODO: Consume materials from player inventory
        // Example: materials = [{itemId: "metal_scraps", quantity: 2}]
        // if (!window.inventoryManager.removeItems(materials)) { logToConsole("Not enough materials for repair."); return false; }

        const maxDurability = partDef.durability;
        const amountToHeal = Math.floor(maxDurability * (repairAmountPercentage / 100));

        vehicle.durability[partIdToRepair] = Math.min(maxDurability, vehicle.durability[partIdToRepair] + amountToHeal);

        logToConsole(`VehicleManager: Part "${partDef.name}" on vehicle "${vehicle.name}" repaired. Current durability: ${vehicle.durability[partIdToRepair]}/${maxDurability}.`, "info");
        if (window.audioManager) window.audioManager.playSound("repair_01.wav");
        return true;
    }

    refuelVehicle(vehicleId, fuelAmount, fuelItemId) {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) {
            logToConsole(`VehicleManager Error: Vehicle "${vehicleId}" not found.`, "error");
            return false;
        }
        if (vehicle.fuel >= vehicle.maxFuel) {
            logToConsole(`VehicleManager Info: Vehicle "${vehicle.name}" fuel tank is already full.`, "info");
            return false;
        }

        // Consume fuel item (fuelItemId) from player inventory.
        if (window.inventoryManager) {
             if (!window.inventoryManager.removeItem(fuelItemId, 1)) {
                 logToConsole("Fuel item not found in inventory.", "warn");
                 return false;
             }
        } else {
            // Fallback if inventory manager not globally available (should generally not happen)
             logToConsole("Inventory Manager not available to consume fuel.", "error");
             return false;
        }

        vehicle.fuel = Math.min(vehicle.maxFuel, vehicle.fuel + fuelAmount);
        logToConsole(`VehicleManager: Vehicle "${vehicle.name}" refueled. Current fuel: ${vehicle.fuel}/${vehicle.maxFuel}.`, "info");
        // Play sound effect for refueling
        if (window.audioManager) window.audioManager.playSoundAtLocation('liquid_filling_01.wav', vehicle.mapPos, {}, { maxDistance: 15 });
        return true;
    }

    applyDamageToVehicle(vehicleId, damageAmount, targetedPartId = null, damageType = "generic") {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) {
            logToConsole(`VehicleManager Error: Vehicle "${vehicleId}" not found for applying damage.`, "error");
            return;
        }

        let partToDamageId = targetedPartId;

        if (!partToDamageId) {
            // If no specific part is targeted, pick one randomly or based on hit location logic (e.g., chassis first)
            // For now, let's target the chassis if no part is specified.
            partToDamageId = vehicle.chassis;
        }

        const partDef = this.vehicleParts[partToDamageId];
        if (!partDef || vehicle.durability[partToDamageId] === undefined) {
            logToConsole(`VehicleManager Error: Part "${partToDamageId}" not found on vehicle or no durability entry. Damage not applied.`, "error");
            // Fallback: apply to chassis if targeted part is invalid but was specified
            if (targetedPartId && vehicle.durability[vehicle.chassis] !== undefined) {
                logToConsole(`VehicleManager Info: Falling back to damage chassis for vehicle "${vehicle.name}".`, "info");
                partToDamageId = vehicle.chassis;
            } else {
                return; // No valid part to damage
            }
        }

        const currentPartHP = vehicle.durability[partToDamageId];
        const partMaxHP = this.vehicleParts[partToDamageId] ? this.vehicleParts[partToDamageId].durability : 0;

        // Consider armor of the vehicle section.
        const armor = vehicle.calculatedStats ? (vehicle.calculatedStats.armor || 0) : 0;
        let actualDamage = Math.max(0, damageAmount - armor);

        vehicle.durability[partToDamageId] = Math.max(0, currentPartHP - actualDamage);

        if (armor > 0) {
             logToConsole(`Vehicle Armor (${armor}) reduced damage from ${damageAmount} to ${actualDamage}.`, "combat");
        }
        logToConsole(`VehicleManager: ${actualDamage} ${damageType} damage applied to ${partDef ? partDef.name : partToDamageId} on vehicle "${vehicle.name}". HP: ${vehicle.durability[partToDamageId]}/${partMaxHP}.`, "combat");

        if (vehicle.durability[partToDamageId] <= 0) {
            logToConsole(`VehicleManager: Part "${partDef ? partDef.name : partToDamageId}" on vehicle "${vehicle.name}" has been destroyed!`, "combat-critical");
            // TODO: Handle part destruction effects (e.g., engine destroyed -> vehicle stops, wheel destroyed -> speed penalty/immobile)
            // For now, just logs. This could involve setting flags on the vehicle or recalculating stats.
            // e.g., if partDef.type === "engine", vehicle.isImmobilized = true;
            this.calculateVehicleStats(vehicleId); // Recalculate stats as destroyed parts might affect them (e.g. if destroyed engine has 0 power)
        }
        // Play sound effect for damage
        if (window.audioManager) {
            window.audioManager.playSoundAtLocation('car_damage_01.wav', vehicle.mapPos, {}, { maxDistance: 30 });
        }
    }
}

// Class definition ends. Instantiation will be handled in script.js after assetManager is created.
