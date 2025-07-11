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
        this.currentStationType = null; // NEW: To store the type of station UI is opened at
        this.logPrefix = "[CraftingUIManager]"; // Changed from CraftingUI
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

        logToConsole(`${this.logPrefix} Initialized.`, "blue");
    }

    open(stationType = null) {
        if (!this.craftingUIElement) {
            console.error(`${this.logPrefix} Crafting UI panel element not found. Cannot open.`);
            return;
        }
        if (!this.craftingManager) { // Check instance property
            console.error(`${this.logPrefix} CraftingManager not available. Cannot open Crafting UI.`);
            logToConsole(`${this.logPrefix} CraftingManager not ready. UI will not open.`, "orange");
            return;
        }

        this.currentStationType = stationType;
        this.gameState.activeCraftingStationType = stationType; // Set global flag

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
        this.gameState.activeCraftingStationType = null; // Clear global flag
        logToConsole(`${this.logPrefix} Hidden.`, "silver");
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
    }

    toggle(stationType = null) {
        if (!this.craftingUIElement) return;
        if (this.craftingUIElement.classList.contains('hidden')) {
            this.open(stationType);
        } else {
            if (this.currentStationType !== stationType) {
                this.hide();
                if (stationType !== undefined) {
                    this.open(stationType);
                }
            } else {
                this.hide();
            }
        }
    }

    renderRecipeList() {
        if (!this.craftingManager || !this.recipeListElement) { // Check instance property
            console.error(`${this.logPrefix} CraftingManager or recipe list element not available.`);
            return;
        }

        this.recipeListElement.innerHTML = '';
        let allRecipes = this.craftingManager.getKnownAndAvailableRecipes();

        if (this.currentStationType) {
            allRecipes = allRecipes.filter(recipe =>
                !recipe.requiredStationType || recipe.requiredStationType === this.currentStationType
            );
        } else {
            allRecipes = allRecipes.filter(recipe => !recipe.requiredStationType);
        }

        if (allRecipes.length === 0) {
            this.recipeListElement.innerHTML = `<li>No recipes available ${this.currentStationType ? 'for this station' : 'for hand-crafting'}.</li>`;
            this.clearRecipeDetails();
            return;
        }

        // Store availableRecipes to be used later for default display
        const availableRecipes = allRecipes;

        allRecipes.forEach(recipe => {
            const listItem = document.createElement('li');
            const canCurrentlyCraft = this.craftingManager.canCraft(recipe.id, this.gameState.inventory.container.items);

            listItem.textContent = recipe.name;
            listItem.dataset.recipeId = recipe.id;
            listItem.style.cursor = "pointer";
            listItem.style.color = canCurrentlyCraft ? "lightgreen" : "lightcoral";
            listItem.addEventListener('click', () => this.displayRecipeDetails(recipe));
            this.recipeListElement.appendChild(listItem);
        });

        if (this.selectedRecipeId && availableRecipes.find(r => r.id === this.selectedRecipeId)) {
            this.displayRecipeDetails(availableRecipes.find(r => r.id === this.selectedRecipeId));
        } else if (availableRecipes.length > 0) {
            this.displayRecipeDetails(availableRecipes[0]);
        } else {
            this.clearRecipeDetails();
        }
    }

    displayRecipeDetails(recipe) {
        if (!recipe || !this.recipeDetailName) {
            this.clearRecipeDetails();
            return;
        }
        this.selectedRecipeId = recipe.id;

        this.recipeDetailName.textContent = recipe.name || "-";
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
                const compItemDef = this.assetManager ? this.assetManager.getItem(comp.itemId) : { name: comp.itemId };
                const playerHas = this.inventoryManager ? this.inventoryManager.countItems(comp.itemId, this.gameState.inventory.container.items) : 0;
                const listItem = document.createElement('li');
                listItem.textContent = `${compItemDef?.name || comp.itemId}: ${playerHas} / ${comp.quantity}`;
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
        if (!this.selectedRecipeId || !this.craftingManager) { // Check instance property
            logToConsole(`${this.logPrefix} No recipe selected or craftingManager not available.`, "orange");
            return;
        }
        const quantityToCraft = parseInt(this.craftQuantityInput.value, 10);
        if (isNaN(quantityToCraft) || quantityToCraft <= 0) {
            logToConsole(`${this.logPrefix} Invalid quantity to craft: ${this.craftQuantityInput.value}`, "orange");
            // Assuming uiManager is not a direct dependency here, but accessed via window if needed.
            // if (window.uiManager) window.uiManager.showToastNotification("Invalid quantity.", "error");
            return;
        }

        logToConsole(`${this.logPrefix} Attempting to craft ${quantityToCraft} of ${this.selectedRecipeId}...`, "event");

        let successCount = 0;
        for (let i = 0; i < quantityToCraft; i++) {
            const success = await this.craftingManager.craftItem(this.selectedRecipeId);
            if (success) {
                successCount++;
            } else {
                logToConsole(`${this.logPrefix} Crafting stopped after ${successCount} successes due to failure (e.g. missing components for subsequent items).`, "orange");
                break;
            }
        }

        if (successCount > 0) {
            // Changed renderCraftingMenu to renderRecipeList as renderCraftingMenu is not a method of this class
            this.renderRecipeList();
            if (this.selectedRecipeId) {
                const currentRecipeData = this.craftingManager.recipes[this.selectedRecipeId];
                if (currentRecipeData) this.displayRecipeDetails(currentRecipeData);
                else this.clearRecipeDetails();
            }
        }
    }
}

// Removed: window.CraftingUI = CraftingUI;
// Initialization will be handled by script.js creating an instance of CraftingUIManager
// and potentially assigning it to window.CraftingUI there.
