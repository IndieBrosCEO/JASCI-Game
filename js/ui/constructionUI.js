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
        logToConsole(`${this.logPrefix}.renderBuildableList() called.`, "debug");
        if (!this.dom.buildableList || !this.constructionManager) {
            logToConsole(`${this.logPrefix}.renderBuildableList() - buildableList DOM or constructionManager missing.`, "error");
            return;
        }
        this.dom.buildableList.innerHTML = '';

        const allDefinitions = this.constructionManager.getBuildableList();
        logToConsole(`${this.logPrefix}.renderBuildableList() - Received ${allDefinitions.length} total definitions from manager.`, "debug");

        const itemsInCategory = allDefinitions.filter(def =>
            !this.selectedCategory || def.category === this.selectedCategory || (this.selectedCategory === "uncategorized" && !def.category)
        );

        logToConsole(`${this.logPrefix}.renderBuildableList() - Filtered to ${itemsInCategory.length} items for category: ${this.selectedCategory || 'All'}.`, "debug");

        if (itemsInCategory.length === 0 && allDefinitions.length > 0) {
            this.dom.buildableList.innerHTML = '<li>No items in this category.</li>';
            return;
        }
        if (allDefinitions.length === 0) {
            this.dom.buildableList.innerHTML = '<li>No construction definitions loaded.</li>';
            return;
        }

        itemsInCategory.forEach(def => {
            const li = document.createElement('li');
            const canCurrentlyBuild = this.constructionManager.canBuild(def.id);

            li.textContent = def.name;
            li.dataset.constructionId = def.id;

            if (!canCurrentlyBuild) {
                li.classList.add('cannot-build');
                if (!def.meetsSkillReqs) {
                    li.title = "Skill requirements not met.";
                } else {
                    li.title = "Missing required components.";
                }
            } else {
                li.title = "Can build this item.";
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
        if (definition.components && definition.components.length > 0) {
            definition.components.forEach(comp => {
                const itemDef = this.assetManager ? this.assetManager.getItem(comp.itemId) : null;
                const compName = itemDef ? itemDef.name : comp.itemId;
                const playerHas = this.inventoryManager ? this.inventoryManager.countItems(comp.itemId, this.gameState.inventory.container.items) : 0;

                const compLi = document.createElement('li');
                const compSpan = document.createElement('span');
                compSpan.textContent = `${compName}: ${playerHas}/${comp.quantity}`;

                if (playerHas >= comp.quantity) {
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
