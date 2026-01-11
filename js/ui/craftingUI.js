// js/ui/craftingUI.js

class CraftingUIManager {
    constructor(craftingManager, inventoryManager, assetManager, gameState) {
        this.craftingManager = craftingManager;
        this.inventoryManager = inventoryManager;
        this.assetManager = assetManager;
        this.gameState = gameState;

        this.craftingUIElement = null;
        this.recipeListElement = null;
        this.craftingTabsElement = null; // New tabs container

        this.recipeDetailName = null;
        this.recipeDetailResult = null;
        this.recipeDetailResultQty = null;
        this.recipeDetailTime = null;
        this.recipeDetailSkill = null;
        this.recipeDetailSkillLevel = null;
        this.recipeDetailWorkbench = null;
        this.recipeDetailComponents = null;
        this.craftQuantityInput = null;
        this.craftButton = null;
        this.closeCraftingButton = null;

        this.selectedRecipeId = null;
        this.currentStationType = null;
        this.selectedCategory = 'All'; // Default category

        this.categories = [
            'All',
            'Weapons',
            'Ammo',
            'Medical',
            'Food/Drink',
            'Materials',
            'Tools',
            'Misc'
        ];

        this.logPrefix = "[CraftingUIManager]";
    }

    initialize() {
        this.craftingUIElement = document.getElementById('craftingUI');
        this.recipeListElement = document.getElementById('craftingRecipeList');
        this.craftingTabsElement = document.getElementById('craftingTabs');

        this.recipeDetailName = document.getElementById('detailRecipeName');
        this.recipeDetailResult = document.getElementById('detailRecipeResult');
        this.recipeDetailResultQty = document.getElementById('detailRecipeResultQty');
        this.recipeDetailTime = document.getElementById('detailRecipeTime');
        this.recipeDetailSkill = document.getElementById('detailRecipeSkill');
        this.recipeDetailSkillLevel = document.getElementById('detailRecipeSkillLevel');
        this.recipeDetailWorkbench = document.getElementById('detailRecipeWorkbench');
        this.recipeDetailComponents = document.getElementById('detailRecipeComponents');
        this.craftQuantityInput = document.getElementById('craftQuantity');
        this.craftButton = document.getElementById('craftButton');
        this.closeCraftingButton = document.getElementById('closeCraftingUIButton');

        if (!this.craftingUIElement || !this.recipeListElement || !this.craftButton || !this.closeCraftingButton || !this.recipeDetailName) {
            console.error(`${this.logPrefix} Some UI elements for crafting are missing! Crafting UI may not work correctly.`);
            return;
        }

        this.craftButton.addEventListener('click', () => this.handleCraftAttempt());
        this.closeCraftingButton.addEventListener('click', () => this.hide());

        this.renderTabs();

        logToConsole(`${this.logPrefix} Initialized.`, "blue");
    }

    open(stationType = null) {
        if (!this.craftingUIElement) {
            console.error(`${this.logPrefix} Crafting UI panel element not found. Cannot open.`);
            return;
        }
        if (!this.craftingManager) {
            console.error(`${this.logPrefix} CraftingManager not available. Cannot open Crafting UI.`);
            return;
        }

        this.currentStationType = stationType;
        this.gameState.activeCraftingStationType = stationType;

        this.renderRecipeList();
        this.craftingUIElement.classList.remove('hidden');
        logToConsole(`${this.logPrefix} Opened ${stationType ? 'at ' + stationType : 'for general crafting'}.`, "silver");
        if (window.audioManager) window.audioManager.playUiSound('ui_menu_open_01.wav', { volume: 0.7 });
    }

    hide() {
        if (!this.craftingUIElement) return;
        this.craftingUIElement.classList.add('hidden');
        this.selectedRecipeId = null;
        this.currentStationType = null;
        this.gameState.activeCraftingStationType = null;
        logToConsole(`${this.logPrefix} Hidden.`, "silver");
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
    }

    toggle(stationType = null) {
        if (!this.craftingUIElement) return;

        if (this.craftingUIElement.classList.contains('hidden')) {
            this.open(stationType);
        } else {
            if (stationType === null || stationType === undefined) {
                this.hide();
            } else if (this.currentStationType !== stationType) {
                this.hide();
                this.open(stationType);
            } else {
                this.hide();
            }
        }
    }

    renderTabs() {
        if (!this.craftingTabsElement) return;
        this.craftingTabsElement.innerHTML = '';

        this.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'tab-button';
            if (category === this.selectedCategory) {
                btn.classList.add('active');
            }
            btn.textContent = category;
            btn.onclick = () => {
                this.selectedCategory = category;
                this.renderTabs(); // Re-render to update active class
                this.renderRecipeList();
            };
            this.craftingTabsElement.appendChild(btn);
        });
    }

    categorizeRecipe(recipe) {
        const tags = recipe.tags || [];
        const type = recipe.type || '';

        if (tags.includes('weapon') || type.startsWith('weapon_')) {
            return 'Weapons';
        }
        if (tags.includes('ammo') || tags.includes('ammunition') || recipe.ammoType) {
             return 'Ammo';
        }
        if (tags.includes('medical') || tags.includes('pharmaceutical') || tags.includes('healing')) {
            return 'Medical';
        }
        if (tags.includes('food') || tags.includes('drink')) {
            return 'Food/Drink';
        }
        if (tags.includes('material') || tags.includes('component') || type === 'crafting_material') {
            return 'Materials';
        }
        if (tags.includes('tool')) {
            return 'Tools';
        }

        // Specific checks for mixed items or missed tags
        if (recipe.id.includes('bullet') || recipe.id.includes('shell') || recipe.id.includes('round')) return 'Ammo';

        return 'Misc';
    }

    renderRecipeList() {
        if (!this.craftingManager || !this.recipeListElement) {
            console.error(`${this.logPrefix} CraftingManager or recipe list element not available.`);
            return;
        }

        this.recipeListElement.innerHTML = '';
        let allSystemRecipes = [];
        if (this.craftingManager && typeof this.craftingManager.getAllRecipes === 'function') {
            allSystemRecipes = this.craftingManager.getAllRecipes();
        } else {
            allSystemRecipes = [];
        }

        // 1. Filter by Station
        let recipesToShow = [];
        if (this.currentStationType) {
            recipesToShow = allSystemRecipes.filter(recipe =>
                !recipe.requiredStationType || recipe.requiredStationType === this.currentStationType
            );
        } else {
            recipesToShow = allSystemRecipes.filter(recipe => !recipe.requiredStationType);
        }

        // 2. Filter by Category Tab
        if (this.selectedCategory !== 'All') {
            recipesToShow = recipesToShow.filter(recipe => this.categorizeRecipe(recipe) === this.selectedCategory);
        }

        if (recipesToShow.length === 0) {
            this.recipeListElement.innerHTML = `<li>No recipes found in '${this.selectedCategory}'.</li>`;
            this.clearRecipeDetails();
            return;
        }

        // Sort alphabetically
        recipesToShow.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

        recipesToShow.forEach((recipe) => {
            const listItem = document.createElement('li');
            const canCurrentlyCraft = this.craftingManager.canCraft(recipe.id, this.gameState.inventory.container.items);

            listItem.textContent = recipe.name || 'Unnamed Recipe';
            listItem.dataset.recipeId = recipe.id;
            listItem.style.cursor = "pointer";

            if (canCurrentlyCraft) {
                listItem.style.color = "lightgreen";
                listItem.title = "You can craft this.";
            } else {
                listItem.style.color = "lightcoral";
                listItem.classList.add('recipe-unavailable');
                listItem.title = "Cannot craft: Missing skill, materials, or wrong station.";
            }
            listItem.addEventListener('click', () => this.displayRecipeDetails(recipe));
            this.recipeListElement.appendChild(listItem);
        });

        // Select previously selected or first available
        const recipeToSelect = recipesToShow.find(r => r && r.id === this.selectedRecipeId);
        if (recipeToSelect) {
            this.displayRecipeDetails(recipeToSelect);
        } else if (recipesToShow.length > 0) {
            // Only auto-select if nothing was selected, or selection is invalid
             // this.displayRecipeDetails(recipesToShow[0]);
             // Actually, let's just clear details if the category changed to something without the old selection
             this.clearRecipeDetails();
        } else {
            this.clearRecipeDetails();
        }
    }

    displayRecipeDetails(recipe) {
        if (!recipe || typeof recipe.id === 'undefined' || !this.recipeDetailName) {
            this.clearRecipeDetails();
            return;
        }
        this.selectedRecipeId = recipe.id;

        this.recipeDetailName.textContent = recipe.name || "Unnamed Recipe";
        const resultItemDef = this.assetManager ? this.assetManager.getItem(recipe.resultItemId) : { name: recipe.resultItemId };
        this.recipeDetailResult.textContent = resultItemDef?.name || recipe.resultItemId;
        this.recipeDetailResultQty.textContent = recipe.resultQuantity || 1;
        this.recipeDetailTime.textContent = `${recipe.timeToCraft || 0} turns`;

        // Skill Display
        if (recipe.skillRequired) {
             this.recipeDetailSkill.textContent = recipe.skillRequired;
             this.recipeDetailSkillLevel.textContent = recipe.skillLevelRequired || 1;
        } else if (recipe.skills_required && recipe.skills_required.length > 0) {
             // Handle array of skills (new format)
             const skillStr = recipe.skills_required.map(s => `${s.skill} (${s.level})`).join(', ');
             this.recipeDetailSkill.textContent = skillStr;
             this.recipeDetailSkillLevel.textContent = ""; // Included in string
        } else {
             this.recipeDetailSkill.textContent = "None";
             this.recipeDetailSkillLevel.textContent = "-";
        }

        this.recipeDetailWorkbench.textContent = recipe.requiredStationType || recipe.workbenchRequired || "None";

        this.recipeDetailComponents.innerHTML = '';

        const recipeToUse = recipe.recipe || recipe;

        // Tools
        if (recipeToUse.tools_required && recipeToUse.tools_required.length > 0) {
            recipeToUse.tools_required.forEach(toolId => {
                const itemDef = this.assetManager ? this.assetManager.getItem(toolId) : null;
                const displayName = itemDef ? itemDef.name : toolId;
                let hasTool = false;
                if (this.inventoryManager && this.gameState.inventory && this.gameState.inventory.container) {
                    hasTool = this.inventoryManager.hasItem(toolId, 1, this.gameState.inventory.container.items);
                }

                const listItem = document.createElement('li');
                listItem.textContent = `Tool: ${displayName}`;
                listItem.style.color = hasTool ? "lightgreen" : "lightcoral";
                this.recipeDetailComponents.appendChild(listItem);
            });
        }

        // Components
        if (recipeToUse.components && recipeToUse.components.length > 0) {
            recipeToUse.components.forEach(comp => {
                let displayName = "";
                let hasEnough = false;
                let currentCount = 0;

                const resolver = this.craftingManager.recipeResolver || (window.RecipeResolver ? new window.RecipeResolver(this.assetManager) : null);

                if (resolver && this.gameState.inventory) {
                    const result = resolver.resolveComponent(comp, this.gameState.inventory.container.items);
                    currentCount = result.found;
                    hasEnough = result.satisfied;
                }

                if (comp.family) {
                    displayName = `Family: ${comp.family}`;
                    if (comp.require) {
                        const reqs = Object.entries(comp.require).map(([k, v]) => `${k}: ${v}`).join(', ');
                        if (reqs) displayName += ` (${reqs})`;
                    }
                } else if (comp.itemId) {
                    const itemDef = this.assetManager ? this.assetManager.getItem(comp.itemId) : null;
                    displayName = itemDef ? itemDef.name : comp.itemId;
                } else {
                    displayName = "Unknown Component";
                }

                const listItem = document.createElement('li');
                listItem.textContent = `${displayName}: ${currentCount} / ${comp.quantity}`;
                listItem.style.color = hasEnough ? "lightgreen" : "lightcoral";
                this.recipeDetailComponents.appendChild(listItem);
            });
        } else {
            this.recipeDetailComponents.innerHTML = '<li>None</li>';
        }

        if (this.craftButton) {
            const canPlayerCraft = this.craftingManager ? this.craftingManager.canCraft(recipe.id, this.gameState.inventory.container.items) : false;
            this.craftButton.disabled = !canPlayerCraft;
        }
        this.craftQuantityInput.value = 1;
    }

    clearRecipeDetails() {
        this.selectedRecipeId = null;
        if (!this.recipeDetailName) return;

        this.recipeDetailName.textContent = "-";
        this.recipeDetailResult.textContent = "-";
        this.recipeDetailResultQty.textContent = "-";
        this.recipeDetailTime.textContent = "-";
        this.recipeDetailSkill.textContent = "-";
        this.recipeDetailSkillLevel.textContent = "-";
        this.recipeDetailWorkbench.textContent = "-";
        this.recipeDetailComponents.innerHTML = '';
        if (this.craftButton) this.craftButton.disabled = true;
        if (this.craftQuantityInput) this.craftQuantityInput.value = 1;
    }

    async handleCraftAttempt() {
        if (!this.selectedRecipeId || !this.craftingManager) {
            logToConsole(`${this.logPrefix} No recipe selected or craftingManager not available.`, "orange");
            return;
        }
        const quantityToCraft = parseInt(this.craftQuantityInput.value, 10);
        if (isNaN(quantityToCraft) || quantityToCraft <= 0) {
            return;
        }

        logToConsole(`${this.logPrefix} Attempting to craft ${quantityToCraft} of ${this.selectedRecipeId}...`, "event");

        let successCount = 0;
        for (let i = 0; i < quantityToCraft; i++) {
            const success = await this.craftingManager.craftItem(this.selectedRecipeId);
            if (success) {
                successCount++;
            } else {
                break;
            }
        }

        if (successCount > 0) {
            this.renderRecipeList();
            if (this.selectedRecipeId) {
                const currentRecipeData = this.craftingManager.recipes[this.selectedRecipeId];
                if (currentRecipeData) this.displayRecipeDetails(currentRecipeData);
                else this.clearRecipeDetails();
            }
        }
    }
}

try {
    if (typeof CraftingUIManager !== 'undefined') {
        window.CraftingUIManager = CraftingUIManager;
    }
} catch (e) {
    console.error('[CraftingUIManager] Error during explicit window assignment:', e);
}
