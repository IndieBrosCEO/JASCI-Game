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
        // logToConsole(`${this.logPrefix} toggle() called with stationType: ${stationType}. Current UI stationType: ${this.currentStationType}. Is hidden: ${this.craftingUIElement.classList.contains('hidden')}. Call stack:`, new Error().stack);
        if (!this.craftingUIElement) return;

        if (this.craftingUIElement.classList.contains('hidden')) {
            // logToConsole(`${this.logPrefix} toggle: UI is hidden, calling open(${stationType === null ? 'general' : stationType})`);
            this.open(stationType);
        } else {
            // UI is currently open
            if (stationType === null || stationType === undefined) {
                // If toggling general crafting and it's already open (currentStationType might be null or a specific station), just hide it.
                // logToConsole(`${this.logPrefix} toggle: General toggle for already open UI (current: '${this.currentStationType}'). Hiding.`);
                this.hide();
            } else if (this.currentStationType !== stationType) {
                // It's open, but for a different station, and a new specific stationType is provided.
                // logToConsole(`${this.logPrefix} toggle: UI is open for '${this.currentStationType}', but different station '${stationType}' requested. Hiding then re-opening.`);
                this.hide();
                this.open(stationType); // Re-open for the new station
            } else {
                // It's open for the exact same specific station, and toggle is called again for that station. Hide it.
                // logToConsole(`${this.logPrefix} toggle: UI is open for station '${this.currentStationType}' and same station toggle requested. Hiding.`);
                this.hide();
            }
        }
    }

    renderRecipeList() {
        // logToConsole(`${this.logPrefix} renderRecipeList CALLED. Current station: ${this.currentStationType}`);
        if (!this.craftingManager || !this.recipeListElement) {
            console.error(`${this.logPrefix} CraftingManager or recipe list element not available.`);
            return;
        }

        this.recipeListElement.innerHTML = '';
        let allSystemRecipes = [];
        if (this.craftingManager && typeof this.craftingManager.getAllRecipes === 'function') {
            allSystemRecipes = this.craftingManager.getAllRecipes(); // This method now logs internally
            logToConsole(`[CraftingUI] renderRecipeList: Received ${allSystemRecipes.length} recipes from getAllRecipes().`);
            if (allSystemRecipes.length > 0) {
                logToConsole(`[CraftingUI]   First recipe object received by UI:`, allSystemRecipes[0]);
                if (allSystemRecipes[0] && typeof allSystemRecipes[0].id !== 'undefined') {
                    logToConsole(`[CraftingUI]   ID of first recipe received: ${allSystemRecipes[0].id}`);
                } else {
                    logToConsole(`[CraftingUI]   First recipe received by UI IS UNDEFINED or MISSING 'id' property.`, 'orange');
                }
            }
        } else {
            logToConsole(`[CraftingUI] renderRecipeList: this.craftingManager or getAllRecipes is not available.`, 'red');
            allSystemRecipes = [];
        }


        // Filter by station type if a station is active
        let recipesToShow = [];
        if (this.currentStationType) {
            // logToConsole(`[CraftingUI] Filtering for station: ${this.currentStationType}`);
            recipesToShow = allSystemRecipes.filter(recipe =>
                !recipe.requiredStationType || recipe.requiredStationType === this.currentStationType
            );
        } else {
            // If no specific station, show recipes that don't require a station (hand-craftable)
            // logToConsole('[CraftingUI] Filtering for hand-craftable (no station required).');
            recipesToShow = allSystemRecipes.filter(recipe => !recipe.requiredStationType);
        }
        // logToConsole(`[CraftingUI] recipesToShow after station filtering (count: ${recipesToShow.length}):`, JSON.parse(JSON.stringify(recipesToShow)));

        // If no station-specific recipes, but we want to show all, then don't filter by station if the goal is to show everything regardless of current context.
        // For this feature, we want to show all recipes *potentially* craftable at a station, or hand-craftable.
        // The current filtering by station type is correct. We list recipes compatible with the current context.

        if (recipesToShow.length === 0) {
            // logToConsole('[CraftingUI] No recipes to show after filtering. Displaying empty message.');
            this.recipeListElement.innerHTML = `<li>No recipes available ${this.currentStationType ? 'for this station' : 'for hand-crafting'}.</li>`;
            this.clearRecipeDetails();
            return;
        }

        recipesToShow.forEach((recipe, index) => {
            if (!recipe || typeof recipe.id === 'undefined') {
                logToConsole(`[CraftingUI]   Recipe at index ${index} is undefined or has no id. Skipping.`, 'orange');
                return; // Skip this iteration if fundamental properties are missing
            }

            const listItem = document.createElement('li');
            // Check if the player *can actually craft it now* (skills, materials, correct station type already filtered)
            const canCurrentlyCraft = this.craftingManager.canCraft(recipe.id, this.gameState.inventory.container.items);

            listItem.textContent = recipe.name || 'Unnamed Recipe'; // Fallback for name
            listItem.dataset.recipeId = recipe.id;
            listItem.style.cursor = "pointer";

            if (canCurrentlyCraft) {
                listItem.style.color = "lightgreen"; // Or use a class: listItem.classList.add('craftable');
                listItem.title = "You can craft this.";
            } else {
                listItem.style.color = "lightcoral"; // Existing color for "cannot craft right now"
                listItem.classList.add('recipe-unavailable'); // Class for gray-out styling
                listItem.title = "Cannot craft: Missing skill, materials, or wrong station.";
            }
            listItem.addEventListener('click', () => this.displayRecipeDetails(recipe));
            this.recipeListElement.appendChild(listItem);
        });

        // Logic for selecting a default recipe to display details for
        const recipeToSelect = recipesToShow.find(r => r && r.id === this.selectedRecipeId);

        if (recipeToSelect) {
            this.displayRecipeDetails(recipeToSelect);
        } else if (recipesToShow.length > 0 && recipesToShow[0] && typeof recipesToShow[0].id !== 'undefined') {
            this.displayRecipeDetails(recipesToShow[0]); // Display first in the current list if it's valid
        } else {
            this.clearRecipeDetails();
        }
    }

    displayRecipeDetails(recipe) {
        if (!recipe || typeof recipe.id === 'undefined' || !this.recipeDetailName) {
            logToConsole(`${this.logPrefix} displayRecipeDetails: Invalid recipe or missing detail name element. Recipe:`, recipe, 'orange');
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

        // Component Requirements Display
        const recipeToUse = recipe.recipe || recipe; // Fallback if recipe is just flat

        // Show tools first
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

        if (recipeToUse.components && recipeToUse.components.length > 0) {
            recipeToUse.components.forEach(comp => {
                let displayName = "";
                let hasEnough = false;
                let currentCount = 0;

                // Logic similar to constructionUI.js to resolve counts
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

// --- BEGIN TEMPORARY DEBUGGING ---
// Attempt to explicitly assign the class to the window object
// to see if it helps with the "CraftingUIManager is undefined" issue in script.js
try {
    if (typeof CraftingUIManager !== 'undefined') {
        window.CraftingUIManager = CraftingUIManager;
        console.log('[CraftingUIManager DEBUG] Successfully assigned CraftingUIManager class to window.CraftingUIManager.');
    } else {
        console.error('[CraftingUIManager DEBUG] CraftingUIManager class name is undefined at point of explicit window assignment.');
    }
} catch (e) {
    console.error('[CraftingUIManager DEBUG] Error during explicit window assignment:', e);
}
// --- END TEMPORARY DEBUGGING ---
