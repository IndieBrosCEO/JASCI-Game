// js/ui/craftingUI.js

const CraftingUI = {
    craftingUIElement: null,
    recipeListElement: null,
    recipeDetailName: null,
    recipeDetailResult: null,
    recipeDetailResultQty: null,
    recipeDetailTime: null,
    recipeDetailSkill: null,
    recipeDetailSkillLevel: null,
    recipeDetailWorkbench: null,
    recipeDetailComponents: null,
    craftQuantityInput: null,
    craftButton: null,
    closeCraftingButton: null,

    selectedRecipeId: null,
    currentStationType: null, // NEW: To store the type of station UI is opened at
    logPrefix: "[CraftingUI]",

    initialize: function () {
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
    },

    // Modified to accept stationType
    open: function (stationType = null) {
        if (!this.craftingUIElement) {
            console.error(`${this.logPrefix} Crafting UI panel element not found. Cannot open.`);
            return;
        }
        if (!window.craftingManager) {
            console.error(`${this.logPrefix} CraftingManager not available. Cannot open Crafting UI.`);
            logToConsole(`${this.logPrefix} CraftingManager not ready. UI will not open.`, "orange");
            // Optionally, show a message to the player via a generic UI manager if available
            // if (window.uiManager) window.uiManager.showToastNotification("Crafting system not ready.", "error");
            return;
        }

        this.currentStationType = stationType;
        window.gameState.activeCraftingStationType = stationType; // Set global flag

        this.renderRecipeList(); // Will use this.currentStationType
        this.craftingUIElement.classList.remove('hidden');
        logToConsole(`${this.logPrefix} Opened ${stationType ? 'at ' + stationType : 'for general crafting'}.`, "silver");
        // TODO: Play UI open sound (e.g., ui_menu_open_01.wav) - Already has placeholder
        if (window.audioManager) window.audioManager.playUiSound('ui_menu_open_01.wav', { volume: 0.7 }); // Changed to a more specific open sound
    },

    hide: function () {
        if (!this.craftingUIElement) return;
        this.craftingUIElement.classList.add('hidden');
        this.selectedRecipeId = null;
        this.currentStationType = null;
        window.gameState.activeCraftingStationType = null; // Clear global flag
        logToConsole(`${this.logPrefix} Hidden.`, "silver");
        // TODO: Play UI close sound (e.g., ui_menu_close_01.wav)
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
    },

    // Modified toggle to pass stationType if needed, or clear it
    toggle: function (stationType = null) {
        if (!this.craftingUIElement) return;
        if (this.craftingUIElement.classList.contains('hidden')) {
            this.open(stationType);
        } else {
            // If toggling off, or opening for a different/no station, ensure station context is reset
            if (this.currentStationType !== stationType) {
                this.hide(); // Hide first (clears stationType)
                if (stationType !== undefined) { // If a new stationType is provided (even if null for general)
                    this.open(stationType);
                }
            } else { // Just closing the current view
                this.hide();
            }
        }
    },

    renderRecipeList: function () { // Now implicitly uses this.currentStationType
        if (!window.craftingManager || !this.recipeListElement) {
            console.error(`${this.logPrefix} CraftingManager or recipe list element not available.`);
            return;
        }

        this.recipeListElement.innerHTML = ''; // Clear old list
        let allRecipes = window.craftingManager.getKnownAndAvailableRecipes();

        // Filter by currentStationType
        if (this.currentStationType) {
            allRecipes = allRecipes.filter(recipe =>
                !recipe.requiredStationType || recipe.requiredStationType === this.currentStationType
            );
        } else { // No station, so only show recipes that don't require a station
            allRecipes = allRecipes.filter(recipe => !recipe.requiredStationType);
        }

        if (allRecipes.length === 0) {
            this.recipeListElement.innerHTML = `<li>No recipes available ${this.currentStationType ? 'for this station' : 'for hand-crafting'}.</li>`;
            this.clearRecipeDetails();
            return;
        }

        allRecipes.forEach(recipe => {
            const listItem = document.createElement('li');
            // canCraft will now check activeCraftingStationType from gameState internally
            const canCurrentlyCraft = window.craftingManager.canCraft(recipe.id, window.gameState.inventory.container.items);

            listItem.textContent = recipe.name;
            listItem.dataset.recipeId = recipe.id;
            listItem.style.cursor = "pointer";
            listItem.style.color = canCurrentlyCraft ? "lightgreen" : "lightcoral"; // Highlight if craftable
            listItem.addEventListener('click', () => this.displayRecipeDetails(recipe));
            this.recipeListElement.appendChild(listItem);
        });

        // Display details for the first recipe by default, or selected one
        if (this.selectedRecipeId && availableRecipes.find(r => r.id === this.selectedRecipeId)) {
            this.displayRecipeDetails(availableRecipes.find(r => r.id === this.selectedRecipeId));
        } else if (availableRecipes.length > 0) {
            this.displayRecipeDetails(availableRecipes[0]);
        } else {
            this.clearRecipeDetails();
        }
    },

    displayRecipeDetails: function (recipe) {
        if (!recipe || !this.recipeDetailName) { // Check one of the detail elements
            this.clearRecipeDetails();
            return;
        }
        this.selectedRecipeId = recipe.id;

        this.recipeDetailName.textContent = recipe.name || "-";
        const resultItemDef = window.assetManager ? window.assetManager.getItem(recipe.resultItemId) : { name: recipe.resultItemId };
        this.recipeDetailResult.textContent = resultItemDef?.name || recipe.resultItemId;
        this.recipeDetailResultQty.textContent = recipe.resultQuantity || 1;
        this.recipeDetailTime.textContent = `${recipe.timeToCraft || 0} turns`;
        this.recipeDetailSkill.textContent = recipe.skillRequired || "None";
        this.recipeDetailSkillLevel.textContent = recipe.skillLevelRequired || "N/A";
        this.recipeDetailWorkbench.textContent = recipe.workbenchRequired || "None";

        this.recipeDetailComponents.innerHTML = '';
        if (recipe.components && recipe.components.length > 0) {
            recipe.components.forEach(comp => {
                const compItemDef = window.assetManager ? window.assetManager.getItem(comp.itemId) : { name: comp.itemId };
                const playerHas = window.inventoryManager ? window.inventoryManager.countItems(comp.itemId, window.gameState.inventory.container.items) : 0;
                const listItem = document.createElement('li');
                listItem.textContent = `${compItemDef?.name || comp.itemId}: ${playerHas} / ${comp.quantity}`;
                listItem.style.color = playerHas >= comp.quantity ? "lightgreen" : "lightcoral";
                this.recipeDetailComponents.appendChild(listItem);
            });
        } else {
            this.recipeDetailComponents.innerHTML = '<li>None</li>';
        }

        // Update Craft button state
        if (this.craftButton) {
            const canPlayerCraft = window.craftingManager ? window.craftingManager.canCraft(recipe.id, window.gameState.inventory.container.items) : false;
            this.craftButton.disabled = !canPlayerCraft;
        }
        this.craftQuantityInput.value = 1; // Reset quantity
    },

    clearRecipeDetails: function () {
        this.selectedRecipeId = null;
        if (!this.recipeDetailName) return; // Ensure elements exist

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
    },

    handleCraftAttempt: async function () {
        if (!this.selectedRecipeId || !window.craftingManager) {
            logToConsole(`${this.logPrefix} No recipe selected or craftingManager not available.`, "orange");
            return;
        }
        const quantityToCraft = parseInt(this.craftQuantityInput.value, 10);
        if (isNaN(quantityToCraft) || quantityToCraft <= 0) {
            logToConsole(`${this.logPrefix} Invalid quantity to craft: ${this.craftQuantityInput.value}`, "orange");
            if (window.uiManager) window.uiManager.showToastNotification("Invalid quantity.", "error");
            return;
        }

        logToConsole(`${this.logPrefix} Attempting to craft ${quantityToCraft} of ${this.selectedRecipeId}...`, "event");

        let successCount = 0;
        for (let i = 0; i < quantityToCraft; i++) {
            const success = await window.craftingManager.craftItem(this.selectedRecipeId);
            if (success) {
                successCount++;
            } else {
                logToConsole(`${this.logPrefix} Crafting stopped after ${successCount} successes due to failure (e.g. missing components for subsequent items).`, "orange");
                // Toast for partial success/failure already handled by craftItem if it shows its own toasts
                break;
            }
        }

        if (successCount > 0) {
            // Refresh the recipe list and details to reflect consumed components and potentially new craftable states
            this.renderCraftingMenu();
            if (this.selectedRecipeId) { // Re-display details for the (potentially still) selected recipe
                const currentRecipeData = window.craftingManager.recipes[this.selectedRecipeId];
                if (currentRecipeData) this.displayRecipeDetails(currentRecipeData);
                else this.clearRecipeDetails(); // If recipe somehow became invalid
            }
        }
    }
};

// Expose to global window object if it's intended to be called from HTML or other scripts directly
window.CraftingUI = CraftingUI;

// Initialization should ideally be called from a main game setup script
// after the DOM is loaded and other managers are ready.
// Example:
// document.addEventListener('DOMContentLoaded', () => {
//   if (window.CraftingUI) window.CraftingUI.initialize();
// });
