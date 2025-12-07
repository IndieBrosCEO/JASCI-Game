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
        } else if (tags.includes("harvest:stone")) {
            lootTableId = "harvest:stone";
            requiredSkill = "Survival";
            skillDifficulty = 8;
        } else if (tags.includes("harvest:plant")) {
            lootTableId = "harvest:plant";
            requiredSkill = "Survival";
            skillDifficulty = 5;
        } else if (tags.includes("harvest:sand")) {
            lootTableId = "harvest:sand";
            requiredSkill = "Survival";
            skillDifficulty = 5;
        } else if (tags.includes("harvest:mud")) {
            lootTableId = "harvest:mud";
            requiredSkill = "Survival";
            skillDifficulty = 5;
        } else if (tags.includes("harvest:gravel")) {
            lootTableId = "harvest:gravel";
            requiredSkill = "Survival";
            skillDifficulty = 5;
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

                // Deplete resource logic
                this.depleteNode(item);
            }

        } else {
            logToConsole("You didn't find anything useful.", "neutral");
        }
    }

    depleteNode(item) {
        // item contains x, y, z, id
        if (!window.mapRenderer) return;
        const currentMap = window.mapRenderer.getCurrentMapData();
        if (!currentMap) return;

        const zStr = item.z.toString();
        const level = currentMap.levels[zStr];
        if (!level) return;

        // Determine layer and get tile
        let layer = 'middle';
        let tile = level.middle && level.middle[item.y] && level.middle[item.y][item.x];

        // If not found or ID mismatch, check bottom (e.g., Grass, Bush)
        // Note: item.id is the ID we detected initially.
        let tileIdOnMap = (typeof tile === 'object' && tile !== null) ? tile.tileId : tile;

        if (!tile || tileIdOnMap !== item.id) {
            tile = level.bottom && level.bottom[item.y] && level.bottom[item.y][item.x];
            tileIdOnMap = (typeof tile === 'object' && tile !== null) ? tile.tileId : tile;
            if (tile && tileIdOnMap === item.id) {
                layer = 'bottom';
            } else {
                // Not found on expected layers
                return;
            }
        }

        // Convert string tile to object to store state if needed
        if (typeof tile !== 'object' || tile === null) {
            tile = { tileId: tileIdOnMap, harvestCount: 0 };
            level[layer][item.y][item.x] = tile;
        }

        // Initialize harvestCount if missing
        if (typeof tile.harvestCount !== 'number') {
            tile.harvestCount = 0;
        }

        // Increment count
        tile.harvestCount++;

        // Define limit (could be in tileset.json in future)
        const limit = 3;

        if (tile.harvestCount >= limit) {
             // Depletion logic
             if (layer === 'middle') {
                 // Remove from middle layer
                 level[layer][item.y][item.x] = null;
                 logToConsole(`${item.name} has been depleted.`, "neutral");
             } else {
                 // Bottom layer - avoid holes by replacing with Tilled Soil or similar
                 // Logic: If it's a Bush (BSH) or Tall Grass (TGR), maybe revert to Grass (GR)?
                 // But Grass is also harvestable.
                 // Let's degrade to Tilled Soil (TSL) which is generally 'dirt/ground' and not harvestable (usually).
                 // Exception: If we harvested Grass (GR), also go to TSL.
                 level[layer][item.y][item.x] = "TSL";
                 logToConsole(`${item.name} has been depleted to soil.`, "neutral");
             }

             // Refresh map and interactions
             if (window.mapRenderer) window.mapRenderer.scheduleRender();
             if (window.interaction) window.interaction.detectInteractableItems();
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
