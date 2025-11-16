// js/ui/craftingUI.js

class CraftingUIManager {
    constructor(craftingManager, inventoryManager, assetManager, gameState) {
        this.craftingManager = craftingManager;
        this.inventoryManager = inventoryManager;
        this.assetManager = assetManager;
        this.gameState = gameState;

        this.craftingUIElement = null;
        this.recipeListElement = null;
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
        this.logPrefix = "[CraftingUIManager]";
    }

    initialize() {
        this.craftingUIElement = document.getElementById('craftingUI');
        this.recipeListElement = document.getElementById('craftingRecipeList');
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
    }

    open(stationType = null) {
        if (!this.craftingUIElement) {
            return;
        }
        if (!this.craftingManager) {
            return;
        }

        this.currentStationType = stationType;
        this.gameState.activeCraftingStationType = stationType;

        this.renderRecipeList();
        this.craftingUIElement.classList.remove('hidden');
        if (window.audioManager) window.audioManager.playUiSound('ui_menu_open_01.wav', { volume: 0.7 });
    }

    hide() {
        if (!this.craftingUIElement) return;
        this.craftingUIElement.classList.add('hidden');
        this.selectedRecipeId = null;
        this.currentStationType = null;
        this.gameState.activeCraftingStationType = null;
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
    }

    toggle(stationType = null) {
        if (!this.craftingUIElement) {
            return;
        }

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

    renderRecipeList() {
        if (!this.craftingManager || !this.recipeListElement) {
            return;
        }

        this.recipeListElement.innerHTML = '';
        let allSystemRecipes = this.craftingManager.getAllRecipes();

        let recipesToShow = [];
        if (this.currentStationType) {
            recipesToShow = allSystemRecipes.filter(recipe =>
                !recipe.requiredStationType || recipe.requiredStationType === this.currentStationType
            );
        } else {
            recipesToShow = allSystemRecipes.filter(recipe => !recipe.requiredStationType);
        }

        if (recipesToShow.length === 0) {
            this.recipeListElement.innerHTML = `<li>No recipes available ${this.currentStationType ? 'for this station' : 'for hand-crafting'}.</li>`;
            this.clearRecipeDetails();
            return;
        }

        recipesToShow.forEach((recipe, index) => {
            if (!recipe || typeof recipe.id === 'undefined') {
                return;
            }

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

        const recipeToSelect = recipesToShow.find(r => r && r.id === this.selectedRecipeId);

        if (recipeToSelect) {
            this.displayRecipeDetails(recipeToSelect);
        } else if (recipesToShow.length > 0 && recipesToShow[0] && typeof recipesToShow[0].id !== 'undefined') {
            this.displayRecipeDetails(recipesToShow[0]);
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
        this.recipeDetailSkill.textContent = recipe.skillRequired || "None";
        this.recipeDetailSkillLevel.textContent = recipe.skillLevelRequired || "N/A";
        this.recipeDetailWorkbench.textContent = recipe.workbenchRequired || "None";

        this.recipeDetailComponents.innerHTML = '';
        if (recipe.components && recipe.components.length > 0) {
            recipe.components.forEach(comp => {
                const displayName = this.craftingManager.getComponentDisplayName(comp);
                const matchingItems = this.inventoryManager.findItemsByFamily(this.gameState.inventory.container.items, comp.family, comp.require);
                const playerHas = matchingItems.reduce((sum, item) => sum + item.quantity, 0);

                const listItem = document.createElement('li');
                listItem.textContent = `${displayName}: ${playerHas} / ${comp.quantity}`;
                listItem.style.color = playerHas >= comp.quantity ? "lightgreen" : "lightcoral";
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
            return;
        }
        const quantityToCraft = parseInt(this.craftQuantityInput.value, 10);
        if (isNaN(quantityToCraft) || quantityToCraft <= 0) {
            return;
        }

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

window.CraftingUIManager = CraftingUIManager;
