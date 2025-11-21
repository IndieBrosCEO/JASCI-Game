class RecipeResolver {
    constructor(assetManager) {
        this.assetManager = assetManager;
    }

    /**
     * Resolves a recipe component requirement against the provided inventory items.
     *
     * @param {Object} componentRequirement - The component definition from the recipe (e.g., { family: "wood", quantity: 2, require: { type: "log" } }).
     * @param {Array} inventoryItems - Array of item instances in the inventory.
     * @returns {Object|null} - Returns an object { found: totalFound, items: [{ item: itemInstance, count: countToUse }] } if satisfied, or null if not satisfied.
     */
    resolveComponent(componentRequirement, inventoryItems) {
        if (!componentRequirement.family) {
            // Handle legacy ID-based requirements if necessary, though we aim to deprecate them.
            if (componentRequirement.itemId) {
                const foundItems = inventoryItems.filter(i => i.id === componentRequirement.itemId);
                const totalCount = foundItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
                if (totalCount >= componentRequirement.quantity) {
                    // Simplified return for legacy support: just list items to consume until quantity is met
                    let remaining = componentRequirement.quantity;
                    const toConsume = [];
                    for (const item of foundItems) {
                        if (remaining <= 0) break;
                        const take = Math.min(item.quantity || 1, remaining);
                        toConsume.push({ item: item, count: take });
                        remaining -= take;
                    }
                    return { found: totalCount, items: toConsume };
                }
            }
            return null;
        }

        // Family-based resolution
        const familyItems = this.assetManager.findItemsByFamily(componentRequirement.family);
        // Filter inventory items that belong to this family
        const validInventoryItems = inventoryItems.filter(invItem => {
            // Check if the inventory item's definition is in the family
            const itemDef = this.assetManager.getItem(invItem.id);
            if (!itemDef || itemDef.family !== componentRequirement.family) return false;

            // Check specific property requirements
            return this.matchesRequirements(itemDef, componentRequirement.require);
        });

        // Sort by alphanumeric ID to ensure deterministic selection
        validInventoryItems.sort((a, b) => a.id.localeCompare(b.id));

        const totalAvailable = validInventoryItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

        if (totalAvailable >= componentRequirement.quantity) {
            let remaining = componentRequirement.quantity;
            const toConsume = [];
            for (const item of validInventoryItems) {
                if (remaining <= 0) break;
                const take = Math.min(item.quantity || 1, remaining);
                toConsume.push({ item: item, count: take });
                remaining -= take;
            }
            return { found: totalAvailable, items: toConsume };
        }

        return null; // Not enough items
    }

    /**
     * Checks if an item definition matches a set of requirements.
     * @param {Object} itemDef - The item definition.
     * @param {Object} requirements - Key-value pairs of required properties (e.g., { type: "log", grade: 1 }).
     * @returns {boolean}
     */
    matchesRequirements(itemDef, requirements) {
        if (!requirements) return true;

        for (const [key, value] of Object.entries(requirements)) {
            // Check 'properties' object first, then top-level
            const itemValue = (itemDef.properties && itemDef.properties[key] !== undefined)
                              ? itemDef.properties[key]
                              : itemDef[key];

            if (itemValue !== value) {
                // Simple equality check. Could be expanded for ranges (min_grade) if needed.
                return false;
            }
        }
        return true;
    }

    /**
     * Validates if a full recipe can be crafted given the inventory.
     * @param {Object} recipe - The recipe object.
     * @param {Array} inventoryItems - The player's inventory items.
     * @returns {boolean}
     */
    canCraft(recipe, inventoryItems) {
        if (!recipe || !recipe.components) return false;

        // We need to simulate consumption because multiple components might request the same family/item
        // A simple greedy approach might fail if component A consumes all of item X, leaving none for component B which also needed X.
        // However, typically recipes differentiate components. For a robust solution, we'd decrement a cloned inventory count.

        // Create a map of available quantities by item ID
        const availableQuantities = {};
        for (const item of inventoryItems) {
            availableQuantities[item.id] = (availableQuantities[item.id] || 0) + (item.quantity || 1);
        }

        for (const component of recipe.components) {
            let quantityNeeded = component.quantity;

            // Find all items in inventory that match this component's requirement
            const matchingItemIds = Object.keys(availableQuantities).filter(itemId => {
                const itemDef = this.assetManager.getItem(itemId);
                if (!itemDef) return false;

                if (component.family) {
                    return itemDef.family === component.family && this.matchesRequirements(itemDef, component.require);
                } else if (component.itemId) {
                    return itemDef.id === component.itemId;
                }
                return false;
            });

            // Sort them to be deterministic (same as resolveComponent)
            matchingItemIds.sort();

            for (const itemId of matchingItemIds) {
                if (quantityNeeded <= 0) break;
                const available = availableQuantities[itemId];
                const take = Math.min(available, quantityNeeded);
                availableQuantities[itemId] -= take;
                quantityNeeded -= take;
            }

            if (quantityNeeded > 0) {
                return false;
            }
        }

        return true;
    }
}

window.RecipeResolver = RecipeResolver;
