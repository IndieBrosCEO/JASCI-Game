// js/harvestManager.js

class HarvestManager {
    constructor(assetManager) {
        this.assetManager = assetManager;
    }

    // Attempt to harvest a resource from a target item/tile
    attemptHarvest(action, item, gameState) {
        // 'item' here is the interactable object (x, y, z, id, name, etc.)
        // 'action' is the string like "Harvest", "Mine", "Scavenge", etc.

        console.log(`HarvestManager: Attempting ${action} on ${item.name} (${item.id})`);

        let lootTableId = null;
        let requiredToolTag = null;
        let requiredSkill = null;
        let skillDifficulty = 0;
        let baseTimeCost = 1; // AP cost

        // Determine loot table and requirements based on action and tags
        const tileDef = this.assetManager.tilesets[item.id] || {};
        const tags = tileDef.tags || [];

        // Simple mapping based on tags
        // In a more complex system, this could be data-driven
        if (tags.includes("harvest:wood")) {
            lootTableId = "harvest:wood";
            requiredSkill = "Survival";
            skillDifficulty = 5;
            // Tool requirement: Axe (axe_wood) or Hatchet (hatchet)
            if (!window.inventoryManager.hasItem("axe_wood") && !window.inventoryManager.hasItem("hatchet")) {
                logToConsole("You need an axe or hatchet to harvest wood.", "orange");
                if (window.audioManager) window.audioManager.playUiSound("ui_error_01.wav");
                return;
            }
        } else if (tags.includes("harvest:stone")) {
            lootTableId = "harvest:stone";
            requiredSkill = "Survival";
            skillDifficulty = 8;
            // Tool requirement: Pickaxe
            if (!window.inventoryManager.hasItem("pickaxe")) {
                logToConsole("You need a pickaxe to mine stone.", "orange");
                if (window.audioManager) window.audioManager.playUiSound("ui_error_01.wav");
                return;
            }
        } else if (tags.includes("harvest:plant")) {
            lootTableId = "harvest:plant";
            requiredSkill = "Survival";
            skillDifficulty = 5;
        } else if (tags.includes("harvest:sand")) {
            lootTableId = "harvest:sand";
            requiredSkill = "Survival";
            skillDifficulty = 5;
            // Tool requirement: Shovel (optional? Prompt implies shovel for gravel, but usually sand too.
            // The prompt strictly listed: pickaxe->boulders, hoe->soil, shovel->gravel, axe->tree.
            // I will strictly enforce shovel for gravel, and maybe leave sand open or require shovel.
            // "shovel to dig through gravel" - doesn't exclude sand, but I'll stick to strict requests first.
        } else if (tags.includes("harvest:mud")) {
            lootTableId = "harvest:mud";
            requiredSkill = "Survival";
            skillDifficulty = 5;
        } else if (tags.includes("harvest:gravel")) {
            lootTableId = "harvest:gravel";
            requiredSkill = "Survival";
            skillDifficulty = 5;
            // Tool requirement: Shovel
            if (!window.inventoryManager.hasItem("shovel")) {
                logToConsole("You need a shovel to dig gravel.", "orange");
                if (window.audioManager) window.audioManager.playUiSound("ui_error_01.wav");
                return;
            }
        } else if (tags.includes("scavenge:furniture")) {
            lootTableId = "scavenge:furniture";
            requiredSkill = "Investigation"; // Or Repair?
            skillDifficulty = 5;
        } else if (tags.includes("scavenge:machinery")) {
            lootTableId = "scavenge:machinery";
            requiredSkill = "Investigation";
            skillDifficulty = 10;
        } else if (tags.includes("scavenge:electronics")) {
            lootTableId = "scavenge:electronics";
            requiredSkill = "Investigation"; // Or Electronics
            skillDifficulty = 8;
        } else if (tags.includes("scavenge:appliance")) {
            lootTableId = "scavenge:appliance";
            requiredSkill = "Investigation";
            skillDifficulty = 5;
        } else if (tags.includes("scavenge:glass")) {
            lootTableId = "scavenge:glass";
            requiredSkill = "Investigation";
            skillDifficulty = 0; // Very easy to just smash and grab
        } else if (tags.includes("scavenge:generic") || tags.includes("container")) {
             if (item.id === "TC" || tags.includes("scavenge:generic")) {
                 lootTableId = "scavenge:generic";
                 requiredSkill = "Investigation";
                 skillDifficulty = 5;
             }
        } else if (tags.includes("scavenge:junk")) {
            lootTableId = "scavenge:junk";
            requiredSkill = "Investigation";
            skillDifficulty = 8;
        }

        // Butcher logic
        if (action === "Butcher" && item.itemType === "corpse") {
            lootTableId = "butcher:corpse";
            requiredSkill = "Survival";
            skillDifficulty = 10;
        }

        if (!lootTableId) {
            console.warn("HarvestManager: No loot table found for this interaction.");
            // UI feedback
            if (window.uiManager) window.uiManager.showToastNotification("Nothing to harvest here.", "warning");
            return;
        }

        // Skill Check for Quantity Bonus
        let quantityMultiplier = 1.0;
        if (requiredSkill) {
            // Standard check: d20 + SkillMod vs Difficulty
            const roll = Math.floor(Math.random() * 20) + 1;
            const totalSkillMod = window.getSkillModifier(requiredSkill, gameState);
            const checkResult = roll + totalSkillMod;

            const margin = checkResult - skillDifficulty;

            // logToConsole(`[Harvest] Skill Check: ${requiredSkill} (Mod: ${totalSkillMod}). Roll: ${roll} + ${totalSkillMod} = ${checkResult} vs DC ${skillDifficulty}. Margin: ${margin}.`, "debug", "dev");

            if (margin >= 10) {
                quantityMultiplier = 2.0; // Critical success equivalent
                logToConsole("Outstanding success! Double yield.", "success");
            } else if (margin >= 5) {
                quantityMultiplier = 1.5;
                logToConsole("Great success! Increased yield.", "success");
            } else if (margin >= 0) {
                quantityMultiplier = 1.0;
                logToConsole("Success.", "info");
            } else if (margin >= -5) {
                quantityMultiplier = 0.5; // Partial failure
                logToConsole("Marginal failure. Reduced yield.", "orange");
            } else {
                quantityMultiplier = 0.0; // Failure
                logToConsole("Failed to harvest anything useful.", "red");
                return; // Exit early
            }
        }

        const loot = this.rollLootTable(lootTableId, quantityMultiplier);

        if (loot.length > 0) {
            // Add items to inventory
            let gatheredItems = [];
            let droppedItems = [];
            loot.forEach(drop => {
                if (window.inventoryManager.addItemToInventoryById(drop.itemId, drop.quantity)) {
                    gatheredItems.push(drop);
                } else {
                    // Inventory full, drop to floor
                    const itemDef = window.assetManager.getItem(drop.itemId);
                    if (itemDef) {
                        const droppedItem = new window.Item(itemDef);
                        droppedItem.quantity = drop.quantity;

                        if (!gameState.floorItems) gameState.floorItems = [];
                        // Use player position for the drop location
                        const dropPos = gameState.playerPos ? { ...gameState.playerPos } : { x: item.x, y: item.y, z: item.z };

                        gameState.floorItems.push({
                            x: dropPos.x,
                            y: dropPos.y,
                            z: dropPos.z,
                            item: droppedItem
                        });
                        droppedItems.push(drop);
                    }
                }
            });

            if (gatheredItems.length > 0) {
                // Log gathered results
                let message = "You gathered: ";
                gatheredItems.forEach(drop => {
                    const itemDef = window.assetManager.getItem(drop.itemId);
                    const name = itemDef ? itemDef.name : drop.itemId;
                    message += `${drop.quantity}x ${name}, `;
                });
                message = message.slice(0, -2); // Remove trailing comma
                logToConsole(message, "success");
            }

            if (droppedItems.length > 0) {
                 // Log dropped results
                 let message = "Inventory full. Dropped on ground: ";
                 droppedItems.forEach(drop => {
                    const itemDef = window.assetManager.getItem(drop.itemId);
                    const name = itemDef ? itemDef.name : drop.itemId;
                    message += `${drop.quantity}x ${name}, `;
                 });
                 message = message.slice(0, -2);
                 logToConsole(message, "orange");

                 // Refresh map render to show items
                 if (window.mapRenderer) window.mapRenderer.scheduleRender();
            }

            if (gatheredItems.length > 0 || droppedItems.length > 0) {
                // Play sound
                if (window.audioManager) {
                    // Determine sound based on action
                    if (action.includes("Mine")) window.audioManager.playUiSound("mining_hit.wav"); // Placeholder
                    else if (action.includes("Chop") || action.includes("Harvest")) window.audioManager.playUiSound("wood_chop.wav"); // Placeholder
                    else window.audioManager.playUiSound("ui_pickup_01.wav");
                }

                // Deplete resource?
                // Example: 10% chance to deplete a scavenger pile or turn rock to rubble
                if (Math.random() < 0.1) {
                     // this.depleteNode(item);
                }
            }

        } else {
            logToConsole("You didn't find anything useful.", "neutral");
        }
    }

    rollLootTable(tableId, multiplier = 1.0) {
        const table = this.assetManager.lootTables ? this.assetManager.lootTables[tableId] : null;
        if (!table) {
            console.error(`HarvestManager: Loot table '${tableId}' not found.`);
            return [];
        }

        const loot = [];
        table.forEach(entry => {
            if (Math.random() < entry.chance) {
                let qty = Math.floor(Math.random() * (entry.max - entry.min + 1)) + entry.min;
                qty = Math.floor(qty * multiplier);
                if (qty > 0) {
                    loot.push({ itemId: entry.itemId, quantity: qty });
                }
            }
        });
        return loot;
    }
}

// Export for global use
window.HarvestManager = HarvestManager;
