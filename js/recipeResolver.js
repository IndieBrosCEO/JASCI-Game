// js/recipeResolver.js

class RecipeResolver {
    constructor(assetManager) {
        this.assetManager = assetManager;
    }

    /**
     * Finds all item definitions that match a given component's requirements.
     * @param {object} component - The component object from a recipe, e.g., { family: "wood", quantity: 2, require: { type: "plank" } }.
     * @returns {Array<object>} An array of item definition objects that match the criteria.
     */
    findMatchingItemDefinitions(component) {
        const { family, require, exclude, min, max } = component;

        if (!this.assetManager.familyItems.has(family)) {
            console.warn(`[RecipeResolver] Unknown family: ${family}`);
            return [];
        }

        const candidateItems = this.assetManager.familyItems.get(family);

        const filteredItems = candidateItems.filter(itemDef => {
            const properties = itemDef.properties || {};

            if (require) {
                for (const key in require) {
                    if (Array.isArray(require[key])) {
                        if (!require[key].includes(properties[key])) return false;
                    } else if (properties[key] !== require[key]) {
                        return false;
                    }
                }
            }

            if (exclude) {
                for (const key in exclude) {
                    if (properties[key] === exclude[key]) return false;
                }
            }

            if (min) {
                for (const key in min) {
                    if (properties[key] < min[key]) return false;
                }
            }

            if (max) {
                for (const key in max) {
                    if (properties[key] > max[key]) return false;
                }
            }

            return true;
        });

        // The list of candidates is already sorted alphabetically by ID in assetManager, so the results are deterministic.
        return filteredItems;
    }
}

window.RecipeResolver = RecipeResolver;
