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
            requiredToolTag = "axe"; // Or similar
            // For now, let's say "Harvest" implies gathering loose wood or using hands/simple tools
            // If we want tool requirements, we check inventory.
            // Let's assume basic harvesting (sticks/branches) is possible without tools,
            // but logs require an axe.
            // The loot table can handle probabilities.
        } else if (tags.includes("harvest:stone")) {
            lootTableId = "harvest:stone";
            requiredToolTag = "pickaxe";
        } else if (tags.includes("scavenge:generic") || tags.includes("container")) { // Scavenge often applies to containers or trash
             // If it's a container, usually we "Loot" it. "Scavenge" might be for a pile of rubble.
             // But if we added "Scavenge" action to TRASH CAN, we use that.
             if (item.id === "TC" || tags.includes("scavenge:generic")) {
                 lootTableId = "scavenge:generic";
             }
        } else if (tags.includes("scavenge:junk")) {
            lootTableId = "scavenge:junk";
        }

        // Butcher logic
        if (action === "Butcher" && item.itemType === "corpse") {
            lootTableId = "butcher:corpse";
            requiredToolTag = "knife";
        }

        if (!lootTableId && action.startsWith("Harvest")) {
            // Fallback: check if the action string contains the resource type (e.g. "Harvest Wood")
             if (tags.includes("harvest:wood")) lootTableId = "harvest:wood";
             else if (tags.includes("harvest:stone")) lootTableId = "harvest:stone";
        }

        if (!lootTableId) {
            console.warn("HarvestManager: No loot table found for this interaction.");
            // UI feedback
            if (window.uiManager) window.uiManager.showToastNotification("Nothing to harvest here.", "warning");
            return;
        }

        // Check tools if required
        // This is a simplified check.
        // We really should check if player HAS a tool with required tag.
        // For now, allow bare hands with lower yield or longer time?
        // Let's enforce tools for stone/logs but allow sticks.

        // Actually, let's just roll on the loot table.
        // The loot table can define "tool_required" per item drop? No, that's complex.
        // Let's just process the loot table.

        const loot = this.rollLootTable(lootTableId);

        if (loot.length > 0) {
            // Add items to inventory
            // Log results
            let message = "You gathered: ";
            loot.forEach(drop => {
                window.inventoryManager.addItem(drop.itemId, drop.quantity);
                const itemDef = window.assetManager.getItem(drop.itemId);
                const name = itemDef ? itemDef.name : drop.itemId;
                message += `${drop.quantity}x ${name}, `;
            });
            message = message.slice(0, -2); // Remove trailing comma

            logToConsole(message, "success");

            // Play sound
            if (window.audioManager) {
                // Determine sound based on action
                if (action.includes("Mine")) window.audioManager.playUiSound("mining_hit.wav"); // Placeholder
                else if (action.includes("Chop") || action.includes("Harvest")) window.audioManager.playUiSound("wood_chop.wav"); // Placeholder
                else window.audioManager.playUiSound("ui_pickup_01.wav");
            }

            // Deplete resource?
            // Some nodes might be finite.
            // For now, assume infinite or no state change for simple harvest (sticks from tree).
            // If we want to turn tree to stump, we need to modify map.

            // Example: 10% chance to deplete a scavenger pile or turn rock to rubble
            if (Math.random() < 0.1) {
                 // this.depleteNode(item);
            }

        } else {
            logToConsole("You didn't find anything useful.", "neutral");
        }
    }

    rollLootTable(tableId) {
        const table = this.assetManager.lootTables ? this.assetManager.lootTables[tableId] : null;
        if (!table) {
            console.error(`HarvestManager: Loot table '${tableId}' not found.`);
            return [];
        }

        const loot = [];
        table.forEach(entry => {
            if (Math.random() < entry.chance) {
                const qty = Math.floor(Math.random() * (entry.max - entry.min + 1)) + entry.min;
                loot.push({ itemId: entry.itemId, quantity: qty });
            }
        });
        return loot;
    }
}

// Export for global use
window.HarvestManager = HarvestManager;
