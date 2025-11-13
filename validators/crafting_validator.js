const fs = require('fs');
const path = require('path');

const DEFINITIONS_PATH = path.join(__dirname, '../assets/definitions');

class CraftingValidator {
    constructor() {
        this.errors = [];
        this.definitions = {};
        this.legacyAliases = {};
        this.families = {};
        this.itemFamilyIndex = {}; // Maps family -> [itemId, itemId, ...]
        this.allItemIds = new Set();
    }

    logError(message) {
        this.errors.push(message);
    }

    loadDefinitions() {
        const filesToLoad = [
            'ammunition.json',
            'ammunition_components.json',
            'clothing.json',
            'consumables.json',
            'constructions.json',
            'containers.json',
            'crafting_materials.json',
            'tools.json',
            'weapon_mods.json',
            'weapons.json',
            'vehicle_parts.json'
        ];

        filesToLoad.forEach(file => {
            const filePath = path.join(DEFINITIONS_PATH, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                let itemCount = 0;
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (this.definitions[item.id]) {
                            this.logError(`Duplicate ID '${item.id}' found in '${file}'.`);
                        }
                        this.definitions[item.id] = { ...item, sourceFile: file };
                        if (item.id) {
                            this.allItemIds.add(item.id);
                        }
                        itemCount++;
                    });
                } else {
                     this.logError(`Expected an array in '${file}', but got '${typeof data}'.`);
                }
                console.log(`Loaded ${itemCount} items from ${file}`);
            } catch (error) {
                this.logError(`Failed to load or parse '${file}': ${error.message}`);
            }
        });

        try {
            this.legacyAliases = JSON.parse(fs.readFileSync(path.join(DEFINITIONS_PATH, 'legacy_aliases.json'), 'utf8'));
            this.families = JSON.parse(fs.readFileSync(path.join(DEFINITIONS_PATH, 'families.json'), 'utf8'));
        } catch (error) {
            this.logError(`Failed to load alias or family definitions: ${error.message}`);
        }
    }

    buildFamilyIndex() {
        // Index items that explicitly belong to a family
        Object.values(this.definitions).forEach(item => {
            if (item.family) {
                if (!this.itemFamilyIndex[item.family]) {
                    this.itemFamilyIndex[item.family] = [];
                }
                this.itemFamilyIndex[item.family].push(item.id);
            }
        });

        // Index items whose ID is a family (for single-item families)
        for (const familyId in this.families) {
            if (this.definitions[familyId]) { // Check if an item exists with this ID
                 if (!this.itemFamilyIndex[familyId]) {
                    this.itemFamilyIndex[familyId] = [];
                }
                // Avoid adding duplicates if it was already added via a `family` property
                if (!this.itemFamilyIndex[familyId].includes(familyId)) {
                    this.itemFamilyIndex[familyId].push(familyId);
                }
            }
        }
    }

    validate() {
        this.loadDefinitions();
        this.buildFamilyIndex();

        console.log("Running crafting data validation...");

        // Execute all validation checks
        this.validateIdsAndFamilies();
        this.validateSchemaHygiene();
        this.validateRecipeResolvability();
        // this.validateCrossFileIntegrity(); // partially done in load
        // this.validateAliasCoverage();

        if (this.errors.length > 0) {
            console.error(`Validation failed with ${this.errors.length} errors:`);
            this.errors.forEach(error => console.error(`- ${error}`));
            process.exit(1);
        } else {
            console.log("Validation successful. All crafting data is consistent.");
        }
    }

    // --- Validation Checks ---

    validateIdsAndFamilies() {
         console.log("Checking IDs and families...");
         // Check for duplicate aliases vs. live IDs
         for (const alias in this.legacyAliases) {
             if (this.allItemIds.has(alias)) {
                 this.logError(`Legacy alias '${alias}' collides with a current item ID.`);
             }
             const targetId = this.legacyAliases[alias];
             if (!this.allItemIds.has(targetId)) {
                this.logError(`Legacy alias '${alias}' points to a non-existent item ID '${targetId}'.`)
             }
         }

        Object.values(this.definitions).forEach(item => {
            if (!item.id) {
                this.logError(`Item in '${item.sourceFile}' is missing an ID: ${JSON.stringify(item)}`);
                return;
            }
            if (item.family && !this.families[item.family]) {
                this.logError(`Item '${item.id}' uses an undefined family '${item.family}'.`);
            }
        });

        console.log("ID and family checks complete.");
    }

    validateSchemaHygiene() {
        console.log("Checking schema hygiene...");
        Object.values(this.definitions).forEach(item => {
            if (!item.family || !item.properties) {
                return;
            }

            const familyDef = this.families[item.family];
            if (!familyDef) {
                // This is already caught by validateIdsAndFamilies, but good practice to check
                return;
            }

            for (const propKey in item.properties) {
                if (!familyDef.hasOwnProperty(propKey)) {
                    this.logError(`Item '${item.id}' has property '${propKey}' which is not defined for the family '${item.family}'.`);
                    continue;
                }

                const propDef = familyDef[propKey];
                const value = item.properties[propKey];
                const valueType = typeof value;

                if (propDef.type === 'enum' && !propDef.values.includes(value)) {
                    this.logError(`Item '${item.id}' has invalid value '${value}' for enum property '${propKey}'. Allowed values: ${propDef.values.join(', ')}.`);
                } else if (propDef.type === 'boolean' && valueType !== 'boolean') {
                    this.logError(`Item '${item.id}' has non-boolean value '${value}' for property '${propKey}'.`);
                } else if (propDef.type === 'number' && valueType !== 'number') {
                    this.logError(`Item '${item.id}' has non-number value '${value}' for property '${propKey}'.`);
                } else if (propDef.type === 'string' && valueType !== 'string') {
                    this.logError(`Item '${item.id}' has non-string value '${value}' for property '${propKey}'.`);
                }
            }
        });
        console.log("Schema hygiene checks complete.");
    }

    validateRecipeResolvability() {
        console.log("Checking recipe resolvability...");
        Object.values(this.definitions).forEach(item => {
            if (!item.recipe || !item.recipe.components) {
                return;
            }

            item.recipe.components.forEach((component, index) => {
                if (!component.family && !component.itemId) {
                    this.logError(`Recipe for '${item.id}' has a component at index ${index} that lacks both a 'family' and 'itemId'.`);
                }

                if (component.family && !this.families[component.family]) {
                    this.logError(`Recipe for '${item.id}' references an undefined family '${component.family}' at component index ${index}.`);
                }

                if (component.itemId && !this.allItemIds.has(component.itemId)) {
                    this.logError(`Recipe for '${item.id}' references an unknown itemId '${component.itemId}' at component index ${index}.`);
                }

                if (component.require) {
                    for (const propKey in component.require) {
                        if (component.family && this.families[component.family] && !this.families[component.family].hasOwnProperty(propKey)) {
                            this.logError(`Recipe for '${item.id}' requires property '${propKey}' on family '${component.family}' at index ${index}, but that property is not defined for the family.`);
                        }
                    }
                }

                const candidates = this.findMatchingItems(component);
                if (candidates.length === 0) {
                    this.logError(`Recipe for '${item.id}' has an unresolvable component at index ${index}: ${JSON.stringify(component)}. No items in the game match the requirements.`);
                }
            });
        });
        console.log("Recipe resolvability checks complete.");
    }

    findMatchingItems(component) {
        let candidates = [];
        if (component.family) {
            const familyItems = this.itemFamilyIndex[component.family] || [];
            candidates = familyItems.map(id => this.definitions[id]);
        } else if (component.itemId) {
            if (this.definitions[component.itemId]) {
                candidates = [this.definitions[component.itemId]];
            }
        }

        candidates = candidates.filter(item => this._matchesProperties(item, component));

        if (candidates.length === 0 && this.definitions[component.family] && this._matchesProperties(this.definitions[component.family], component)) {
            candidates.push(this.definitions[component.family]);
        }

        console.log(`Component: ${JSON.stringify(component)}, Candidates: ${candidates.map(c => c.id).join(', ')}`);

        return candidates;
    }

    _matchesProperties(item, constraints) {
        if (!constraints) return true;

        const check = (value, condition) => {
            if (typeof condition === 'object' && condition !== null) {
                if (condition.min !== undefined && value < condition.min) return false;
                if (condition.max !== undefined && value > condition.max) return false;
                if (condition.is !== undefined && value !== condition.is) return false;
                if (Array.isArray(condition.in) && !condition.in.includes(value)) return false;
                if (Array.isArray(condition.notIn) && condition.notIn.includes(value)) return false;
            } else {
                return value === condition;
            }
            return true;
        };

        if (constraints.require) {
            for (const key in constraints.require) {
                if (!item.properties || !check(item.properties[key], constraints.require[key])) {
                    return false;
                }
            }
        }

        if (constraints.exclude) {
            for (const key in constraints.exclude) {
                if (item.properties && check(item.properties[key], constraints.exclude[key])) {
                    return false;
                }
            }
        }

        return true;
    }
}

const validator = new CraftingValidator();
validator.validate();
