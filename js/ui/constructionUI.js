// js/ui/constructionUI.js

class ConstructionUIManager {
    constructor(constructionManager, inventoryManager, assetManager, gameState, mapRenderer) {
        this.constructionManager = constructionManager;
        this.inventoryManager = inventoryManager;
        this.assetManager = assetManager;
        this.gameState = gameState;
        this.mapRenderer = mapRenderer; // Added mapRenderer dependency

        this.isOpen = false;
        this.selectedCategory = null;
        this.selectedConstructionDefId = null;
        this.logPrefix = "[ConstructionUIManager]";

        this.dom = {
            uiPanel: null,
            categoryList: null,
            buildableList: null,
            detailName: null,
            detailDescription: null,
            detailSize: null,
            detailSkill: null,
            detailSkillLevel: null, // Retained for clarity, though might be merged in display
            detailComponents: null,
            detailTimeToBuild: null,
            selectButton: null,
            placementInstructions: null,
            closeButton: null,
        };
    }

    initialize() {
        this.dom.uiPanel = document.getElementById('constructionUI');
        this.dom.categoryList = document.getElementById('constructionCategoryList');
        this.dom.buildableList = document.getElementById('constructionBuildableList');
        this.dom.detailName = document.getElementById('detailConstructionName');
        this.dom.detailDescription = document.getElementById('detailConstructionDescription');
        this.dom.detailSize = document.getElementById('detailConstructionSize');
        this.dom.detailSkill = document.getElementById('detailConstructionSkill'); // This is the container
        this.dom.detailSkillLevel = document.getElementById('detailConstructionSkillLevel'); // Potentially unused if merged
        this.dom.detailComponents = document.getElementById('detailConstructionComponents');
        this.dom.detailTimeToBuild = document.getElementById('detailConstructionTime');
        this.dom.selectButton = document.getElementById('selectConstructionButton');
        this.dom.placementInstructions = document.getElementById('placementInstructions');
        this.dom.closeButton = document.getElementById('closeConstructionUIButton');

        if (!this.dom.uiPanel) {
            console.error(`${this.logPrefix} Error: UI Panel not found.`);
            return;
        }

        this.dom.closeButton.addEventListener('click', () => this.close());
        this.dom.selectButton.addEventListener('click', () => this.enterPlacementMode());

        this.populateCategories();
        logToConsole(`${this.logPrefix} Initialized.`, "info");
    }

    open() {
        logToConsole(`${this.logPrefix}.open() called.`, "debug");
        if (!this.dom.uiPanel) {
            console.error(`${this.logPrefix} Error: UI Panel element not found. Cannot open.`);
            return;
        }
        if (!this.constructionManager) {
            logToConsole(`${this.logPrefix} Error: ConstructionManager not available. Cannot open Construction UI.`, "error");
            return;
        }
        this.isOpen = true;
        this.dom.uiPanel.classList.remove('hidden');
        this.selectedCategory = null;
        this.selectedConstructionDefId = null;
        this.populateCategories();
        this.renderBuildableList();
        this.clearDetail();
        this.dom.selectButton.disabled = true;
        this.dom.placementInstructions.classList.add('hidden');
        this.gameState.isConstructionModeActive = false;
        logToConsole(`${this.logPrefix} Opened.`, "info");
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.7 });
    }

    close() {
        this.isOpen = false;
        if (!this.dom.uiPanel) return; // Guard against missing panel
        this.dom.uiPanel.classList.add('hidden');
        this.selectedConstructionDefId = null;
        this.gameState.isConstructionModeActive = false;
        if (this.dom.placementInstructions) this.dom.placementInstructions.classList.add('hidden');
        logToConsole(`${this.logPrefix} Closed.`, "info");
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
        if (this.mapRenderer) this.mapRenderer.scheduleRender();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    populateCategories() {
        if (!this.dom.categoryList || !this.constructionManager) return;
        this.dom.categoryList.innerHTML = '';

        const definitions = Object.values(this.constructionManager.constructionDefinitions);
        const categories = [...new Set(definitions.map(def => def.category || "uncategorized"))];

        categories.sort().forEach(category => {
            const li = document.createElement('li');
            li.textContent = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            li.dataset.category = category;
            li.addEventListener('click', () => {
                this.selectedCategory = category;
                this.renderBuildableList();
                this.clearDetail();
                this.dom.selectButton.disabled = true;
            });
            this.dom.categoryList.appendChild(li);
        });
        if (!this.selectedCategory && categories.length > 0) {
            this.selectedCategory = categories[0];
        }
    }

    renderBuildableList() {
        // logToConsole(`${this.logPrefix}.renderBuildableList() called.`, "debug");
        if (!this.dom.buildableList || !this.constructionManager) {
            logToConsole(`${this.logPrefix}.renderBuildableList() - buildableList DOM or constructionManager missing.`, "error");
            return;
        }
        this.dom.buildableList.innerHTML = '';

        // Get ALL construction definitions with their skill status
        let allDefinitionsWithSkillStatus = [];
        if (this.constructionManager && typeof this.constructionManager.getAllConstructionDefinitionsWithStatus === 'function') {
            allDefinitionsWithSkillStatus = this.constructionManager.getAllConstructionDefinitionsWithStatus();
            logToConsole(`${this.logPrefix}.renderBuildableList() - Received from manager (count: ${allDefinitionsWithSkillStatus.length}):`, JSON.parse(JSON.stringify(allDefinitionsWithSkillStatus)));
        } else {
            logToConsole(`${this.logPrefix}.renderBuildableList() - constructionManager or getAllConstructionDefinitionsWithStatus method missing.`, "error");
        }

        const itemsInCategory = allDefinitionsWithSkillStatus.filter(def =>
            def && (!this.selectedCategory || def.category === this.selectedCategory || (this.selectedCategory === "uncategorized" && !def.category))
        );

        logToConsole(`${this.logPrefix}.renderBuildableList() - Filtered to itemsInCategory (count: ${itemsInCategory.length}) for category: ${this.selectedCategory || 'All'}.`, "debug", JSON.parse(JSON.stringify(itemsInCategory)));

        if (itemsInCategory.length === 0 && allDefinitionsWithSkillStatus.length > 0) {
            this.dom.buildableList.innerHTML = '<li>No items in this category.</li>';
            this.clearDetail();
            this.dom.selectButton.disabled = true;
            return;
        }
        if (allDefinitionsWithSkillStatus.length === 0) {
            this.dom.buildableList.innerHTML = '<li>No construction definitions loaded.</li>';
            this.clearDetail();
            this.dom.selectButton.disabled = true;
            return;
        }

        itemsInCategory.forEach(def => {
            const li = document.createElement('li');
            // Now check full buildability (skills + components)
            const canCurrentlyBuild = this.constructionManager.canBuild(def.id);

            li.textContent = def.name;
            li.dataset.constructionId = def.id;
            li.style.cursor = "pointer";


            if (!canCurrentlyBuild) {
                li.classList.add('cannot-build'); // This class should make it appear grayed out
                // The title will provide more specific reasons on hover.
                if (!def.meetsSkillReqs) {
                    li.title = "Skill requirements not met.";
                } else {
                    // If skills are met, it must be missing components (or potentially placement, but that's not checked here)
                    li.title = "Missing required components.";
                }
            } else {
                li.title = "You can build this.";
                // Potentially add a 'can-build' class if specific styling for available items is needed beyond default.
                // li.classList.add('can-build');
            }

            li.addEventListener('click', () => {
                this.selectedConstructionDefId = def.id;
                this.renderDetail(def);
                this.dom.selectButton.disabled = !canCurrentlyBuild;
            });
            this.dom.buildableList.appendChild(li);
        });
    }

    renderDetail(definition) {
        if (!definition) {
            this.clearDetail();
            return;
        }
        this.dom.detailName.textContent = definition.name;
        this.dom.detailDescription.textContent = definition.description;
        this.dom.detailSize.textContent = definition.size ? `${definition.size.width}x${definition.size.height}` : '1x1';

        this.dom.detailSkill.innerHTML = ''; // Clear previous skill details
        this.dom.detailComponents.innerHTML = ''; // Clear previous component details

        // Skill Requirement Display
        if (definition.skillRequired && definition.skillLevelRequired) {
            const player = this.gameState; // Use instance gameState
            // Assuming getSkillValue is globally accessible or part of a utility manager
            // If getSkillValue is not global, it would need to be passed or accessed via a manager
            const playerScore = typeof getSkillValue === 'function' ? getSkillValue(definition.skillRequired, player) : 0;
            const skillLi = document.createElement('li');
            const skillSpan = document.createElement('span');
            skillSpan.textContent = `${definition.skillRequired}: ${playerScore}/${definition.skillLevelRequired}`;
            if (playerScore >= definition.skillLevelRequired) {
                skillSpan.classList.add('req-met');
            } else {
                skillSpan.classList.add('req-not-met');
            }
            skillLi.appendChild(skillSpan);
            this.dom.detailSkill.appendChild(skillLi);
        } else {
            const skillLi = document.createElement('li');
            skillLi.textContent = "Skill: None";
            this.dom.detailSkill.appendChild(skillLi);
        }

        // Component Requirements Display
        const recipeToUse = definition.recipe || definition;
        if (recipeToUse.components && recipeToUse.components.length > 0) {
            recipeToUse.components.forEach(comp => {
                let displayName = "";
                let hasEnough = false;
                let currentCount = 0;

                // We need to check if constructionManager has recipeResolver
                // If UI doesn't have direct access, we might need to duplicate some logic or expose a helper
                // Ideally, we use RecipeResolver if available on window or through manager

                // For display purposes, resolving complex requirements perfectly to a "count" is hard
                // because multiple items might match. We'll try to show a summary.

                const resolver = this.constructionManager.recipeResolver || (window.RecipeResolver ? new window.RecipeResolver(this.assetManager) : null);

                if (resolver && this.gameState.inventory) {
                    const resolved = resolver.resolveComponent(comp, this.gameState.inventory.container.items);
                    if (resolved) {
                        currentCount = resolved.found;
                        hasEnough = true;
                    } else {
                        // Even if not enough, we want to know how many we found
                        // But resolveComponent returns null if not enough.
                        // We need a way to just count.
                        // Let's manually count for display.

                        // Re-use logic from RecipeResolver but without the threshold check?
                        // Or just modify resolveComponent to return what it found?
                        // Since we can't modify RecipeResolver easily from here without checking its code again,
                        // let's assume if it returns null, we might have 0 or some partial amount.

                        // Fallback: manual check for display
                        const inventoryItems = this.gameState.inventory.container.items;
                        if (comp.family) {
                             const validItems = inventoryItems.filter(invItem => {
                                const itemDef = this.assetManager.getItem(invItem.id);
                                if (!itemDef || itemDef.family !== comp.family) return false;
                                return resolver.matchesRequirements(itemDef, comp.require);
                            });
                            currentCount = validItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
                        } else if (comp.itemId) {
                             const foundItems = inventoryItems.filter(i => i.id === comp.itemId);
                             currentCount = foundItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
                        }
                    }
                }

                if (currentCount >= comp.quantity) hasEnough = true;

                if (comp.family) {
                    displayName = `Family: ${comp.family}`;
                    if (comp.require) {
                        // Add details like " (type: log)"
                        const reqs = Object.entries(comp.require).map(([k, v]) => `${k}: ${v}`).join(', ');
                        if (reqs) displayName += ` (${reqs})`;
                    }
                } else if (comp.itemId) {
                    const itemDef = this.assetManager ? this.assetManager.getItem(comp.itemId) : null;
                    displayName = itemDef ? itemDef.name : comp.itemId;
                } else {
                    displayName = "Unknown Component";
                }

                const compLi = document.createElement('li');
                const compSpan = document.createElement('span');
                compSpan.textContent = `${displayName}: ${currentCount}/${comp.quantity}`;

                if (hasEnough) {
                    compSpan.classList.add('req-met');
                } else {
                    compSpan.classList.add('req-not-met');
                }
                compLi.appendChild(compSpan);
                this.dom.detailComponents.appendChild(compLi);
            });
        } else {
            const compLi = document.createElement('li');
            compLi.textContent = 'Components: None';
            this.dom.detailComponents.appendChild(compLi);
        }
        this.dom.detailTimeToBuild.textContent = `${definition.timeToBuild || 0} turns`;
    }

    clearDetail() {
        this.dom.detailName.textContent = "-";
        this.dom.detailDescription.textContent = "-";
        this.dom.detailSize.textContent = "-";
        this.dom.detailSkill.innerHTML = "<li>Skill: -</li>"; // Use innerHTML for consistency
        // this.dom.detailSkillLevel.textContent = "-"; // If it were a separate element
        this.dom.detailComponents.innerHTML = '<li>Components: -</li>'; // Use innerHTML
        this.dom.detailTimeToBuild.textContent = "-";
    }

    enterPlacementMode() {
        if (!this.selectedConstructionDefId) {
            logToConsole(`${this.logPrefix} No construction selected for placement.`, "warn");
            return;
        }
        const definition = this.constructionManager.constructionDefinitions[this.selectedConstructionDefId];
        if (!definition) {
            logToConsole(`${this.logPrefix} Construction definition ${this.selectedConstructionDefId} not found.`, "error");
            return;
        }

        this.gameState.isConstructionModeActive = true;
        this.gameState.selectedConstructionId = this.selectedConstructionDefId;
        if (this.dom.placementInstructions) this.dom.placementInstructions.classList.remove('hidden');
        logToConsole(`${this.logPrefix} Entering placement mode for ${definition.name}. Click on map to place.`, "info");
    }

    exitPlacementMode() {
        this.gameState.isConstructionModeActive = false;
        this.gameState.selectedConstructionId = null;
        if (this.dom.placementInstructions) this.dom.placementInstructions.classList.add('hidden');
        if (this.mapRenderer) this.mapRenderer.scheduleRender();
        logToConsole(`${this.logPrefix} Exited placement mode.`, "info");
    }
}

// Removed: window.ConstructionUI = ConstructionUI;
// Initialization will be handled by script.js creating an instance of ConstructionUIManager
// and assigning it to window.ConstructionUI there.

// --- BEGIN TEMPORARY DEBUGGING ---
try {
    if (typeof ConstructionUIManager !== 'undefined') {
        window.ConstructionUIManager = ConstructionUIManager;
        console.log('[ConstructionUIManager DEBUG] Successfully assigned ConstructionUIManager class to window.ConstructionUIManager.');
    } else {
        console.error('[ConstructionUIManager DEBUG] ConstructionUIManager class name is undefined at point of explicit window assignment.');
    }
} catch (e) {
    console.error('[ConstructionUIManager DEBUG] Error during explicit window assignment:', e);
}
// --- END TEMPORARY DEBUGGING ---
