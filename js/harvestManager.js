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

        // --- New Break/Mine/Dig Logic ---
        if (action === "Chop" || action === "Mine" || action === "Dig") {
            this.processBreakAction(action, item, gameState);
            return; // Exit main attemptHarvest as we handled it separately
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

                // Increment harvest count and check for depletion
                const harvestKey = `${gameState.currentMapId}:${item.x},${item.y},${item.z}`;
                if (!gameState.harvestCounts) gameState.harvestCounts = {};
                if (!gameState.harvestCounts[harvestKey]) gameState.harvestCounts[harvestKey] = 0;
                gameState.harvestCounts[harvestKey]++;

                const MAX_HARVESTS = 3;
                if (gameState.harvestCounts[harvestKey] >= MAX_HARVESTS) {
                    this.destroyTile(item);
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

    processBreakAction(action, item, gameState) {
        // Validate Tool
        let hasTool = false;
        let requiredToolType = "";
        let sound = "ui_pickup_01.wav";

        if (action === "Chop") {
            requiredToolType = "axe";
            sound = "wood_chop_1.wav";
        } else if (action === "Mine") {
            requiredToolType = "pickaxe";
            sound = "stone_mine_1.wav";
        } else if (action === "Dig") {
            requiredToolType = "shovel";
            sound = "move_land_soft_01.wav";
        }

        // Check Inventory for tool
        if (window.inventoryManager && window.inventoryManager.container && window.inventoryManager.container.items) {
            // Check Hand Slots
            const handSlots = window.inventoryManager.handSlots || [];
            hasTool = handSlots.some(slot => slot.item && (slot.item.tags.includes(requiredToolType) || (slot.item.properties && slot.item.properties.type === requiredToolType)));

            // If not in hand, check container
            if (!hasTool) {
                hasTool = window.inventoryManager.container.items.some(it => (it.tags && it.tags.includes(requiredToolType)) || (it.properties && it.properties.type === requiredToolType));
            }
        }

        if (!hasTool) {
            logToConsole(`You need a ${requiredToolType} to ${action.toLowerCase()} this.`, "warn");
            return;
        }

        // Execute Break
        const currentMap = window.mapRenderer.getCurrentMapData();
        const zStr = item.z.toString();
        const levelData = currentMap.levels[zStr];

        let removed = false;
        let itemDropId = null;
        let quantity = 1;

        const tileDef = this.assetManager.tilesets[item.id];
        const tags = tileDef ? tileDef.tags : [];

        // Determine drop
        if (action === "Chop" && (tags.includes("wood") || tags.includes("tree"))) {
            itemDropId = "wood_log";
            if(tags.includes("wall")) itemDropId = "wood_planks";
        } else if (action === "Mine") {
            if (tags.includes("stone") || tags.includes("rock") || tags.includes("concrete")) itemDropId = "stone_chunk";
            if (tags.includes("metal")) itemDropId = "scrap_metal";
        } else if (action === "Dig") {
            if (tags.includes("dirt") || tags.includes("mud")) itemDropId = "pile_of_dirt";
            if (tags.includes("sand")) itemDropId = "sand_pile";
            if (tags.includes("gravel")) itemDropId = "stone_chunk";
        }

        // 1. Check Middle Layer (Walls, Objects)
        if (levelData.middle && levelData.middle[item.y] && levelData.middle[item.y][item.x]) {
            const tileAt = levelData.middle[item.y][item.x];
            const tileId = (typeof tileAt === 'object' && tileAt !== null) ? tileAt.tileId : tileAt;
            if (tileId === item.id) {
                levelData.middle[item.y][item.x] = null;
                removed = true;
                logToConsole(`You ${action.toLowerCase()}ped the ${item.name}.`, "success");
            }
        }

        // 2. Check Bottom Layer (Terrain)
        if (!removed && levelData.bottom && levelData.bottom[item.y] && levelData.bottom[item.y][item.x]) {
            const tileAt = levelData.bottom[item.y][item.x];
            const tileId = (typeof tileAt === 'object' && tileAt !== null) ? tileAt.tileId : tileAt;
            if (tileId === item.id) {
                if (action === "Dig") {
                    // Logic for digging terrain
                    if (tileId === "GR" || tileId === "TGR") {
                        // Grass -> Dirt
                        levelData.bottom[item.y][item.x] = "DI";
                        removed = true;
                        logToConsole(`You dug up the grass.`, "success");
                    } else if (tileId === "DI" || tileId === "SA" || tileId === "GV") {
                        // Dirt/Sand/Gravel -> Hole
                        levelData.bottom[item.y][item.x] = "HOLE";
                        removed = true;
                        logToConsole(`You dug a hole.`, "success");
                    }
                }
    destroyTile(item) {
        if (!window.mapRenderer) return;
        const currentMap = window.mapRenderer.getCurrentMapData();
        if (!currentMap || !currentMap.levels) return;

        const { x, y, z, id } = item;
        const zStr = z.toString();
        const levelData = currentMap.levels[zStr];

        if (!levelData) return;

        let removed = false;

        // Try Middle Layer first (most harvestables)
        if (levelData.middle && levelData.middle[y]) {
            const tileAtLoc = levelData.middle[y][x];
            const tileIdAtLoc = (typeof tileAtLoc === 'object' && tileAtLoc !== null) ? tileAtLoc.tileId : tileAtLoc;
            if (tileIdAtLoc === id) {
                levelData.middle[y][x] = null;
                removed = true;
            }
        }

        // Try Bottom Layer if not found on middle
        if (!removed && levelData.bottom && levelData.bottom[y]) {
            const tileAtLoc = levelData.bottom[y][x];
            const tileIdAtLoc = (typeof tileAtLoc === 'object' && tileAtLoc !== null) ? tileAtLoc.tileId : tileAtLoc;
            if (tileIdAtLoc === id) {
                levelData.bottom[y][x] = null; // Can create a hole
                removed = true;
            }
        }

        if (removed) {
            // Play Sound
            if (window.audioManager) window.audioManager.playUiSound(sound);

            // Drop Item
            if (itemDropId) {
                if (window.inventoryManager.addItemToInventoryById(itemDropId, quantity)) {
                    logToConsole(`Gathered: ${quantity}x ${itemDropId}`, "success");
                } else {
                    // Drop to floor
                    const itemDef = window.assetManager.getItem(itemDropId);
                    if (itemDef) {
                        const droppedItem = new window.Item(itemDef);
                        droppedItem.quantity = quantity;
                        if (!gameState.floorItems) gameState.floorItems = [];
                        gameState.floorItems.push({
                            x: item.x, y: item.y, z: item.z,
                            item: droppedItem
                        });
                        logToConsole(`Inventory full. ${quantity}x ${itemDropId} dropped on ground.`, "orange");
                    }
                }
            }

            // Trigger Map Update
            window.mapRenderer.scheduleRender();
            // Re-detect items (since one is gone)
            if (window.interaction && window.interaction.detectInteractableItems) {
                window.interaction.detectInteractableItems();
                window.interaction.showInteractableItems();
            }

            // Check stability for entities standing on/near the modified tile
            if (action === "Dig") {
                this.checkStability(item.x, item.y, item.z);
            } else if (action === "Chop" || action === "Mine") {
                this.checkStability(item.x, item.y, item.z + 1);
            }

        } else {
            logToConsole(`Failed to ${action.toLowerCase()} target.`, "orange");
        }
    }

    checkStability(x, y, z) {
        // Check for player
        if (window.gameState.playerPos) {
            const p = window.gameState.playerPos;
            if (Math.round(p.x) === x && Math.round(p.y) === y && Math.round(p.z) === z) {
                if (window.handleFalling) window.handleFalling(window.gameState, x, y, z);
            }
        }

        // Check for NPCs
        if (window.gameState.npcs) {
            window.gameState.npcs.forEach(npc => {
                if (npc.mapPos && Math.round(npc.mapPos.x) === x && Math.round(npc.mapPos.y) === y && Math.round(npc.mapPos.z) === z) {
                    if (window.handleFalling) window.handleFalling(npc, x, y, z);
                }
            });
            logToConsole("The resource has been depleted.", "orange");
            if (window.audioManager) window.audioManager.playUiSound("mining_break.wav"); // Placeholder

            // Remove from interactableItems if present
            if (window.gameState.interactableItems) {
                const index = window.gameState.interactableItems.findIndex(it => it.x === x && it.y === y && it.z === z);
                if (index !== -1) {
                    window.gameState.interactableItems.splice(index, 1);
                }
            }

            window.mapRenderer.scheduleRender();
            if (window.interaction) window.interaction.detectInteractableItems();
        }
    }
}

// Export for global use
window.HarvestManager = HarvestManager;
