// js/ui/constructionUI.js

const ConstructionUI = {
    isOpen: false,
    selectedCategory: null,
    selectedConstructionDefId: null,
    dom: {
        uiPanel: null,
        categoryList: null,
        buildableList: null,
        detailName: null,
        detailDescription: null,
        detailSize: null,
        detailSkill: null,
        detailSkillLevel: null,
        detailComponents: null,
        detailTimeToBuild: null,
        selectButton: null,
        placementInstructions: null,
        closeButton: null,
    },

    initialize: function () {
        this.dom.uiPanel = document.getElementById('constructionUI');
        this.dom.categoryList = document.getElementById('constructionCategoryList');
        this.dom.buildableList = document.getElementById('constructionBuildableList');
        this.dom.detailName = document.getElementById('detailConstructionName');
        this.dom.detailDescription = document.getElementById('detailConstructionDescription');
        this.dom.detailSize = document.getElementById('detailConstructionSize');
        this.dom.detailSkill = document.getElementById('detailConstructionSkill');
        this.dom.detailSkillLevel = document.getElementById('detailConstructionSkillLevel');
        this.dom.detailComponents = document.getElementById('detailConstructionComponents');
        this.dom.detailTimeToBuild = document.getElementById('detailConstructionTime');
        this.dom.selectButton = document.getElementById('selectConstructionButton');
        this.dom.placementInstructions = document.getElementById('placementInstructions');
        this.dom.closeButton = document.getElementById('closeConstructionUIButton');

        if (!this.dom.uiPanel) {
            console.error("ConstructionUI Error: UI Panel not found.");
            return;
        }

        this.dom.closeButton.addEventListener('click', () => this.close());
        this.dom.selectButton.addEventListener('click', () => this.enterPlacementMode());

        this.populateCategories();
        logToConsole("ConstructionUI initialized.", "info");
    },

    open: function () {
        logToConsole("ConstructionUI.open() called.", "debug"); // DEBUG
        if (!this.dom.uiPanel) {
            console.error("ConstructionUI Error: UI Panel element not found. Cannot open.");
            logToConsole("ConstructionUI.open() - UI Panel element not found.", "error"); // DEBUG
            return;
        }
        if (!window.constructionManager) {
            logToConsole("ConstructionUI Error: ConstructionManager not available. Cannot open Construction UI.", "error");
            logToConsole("ConstructionUI.open() - ConstructionManager not available.", "error"); // DEBUG
            // if (window.uiManager) window.uiManager.showToastNotification("Construction system not ready.", "error");
            return;
        }
        this.isOpen = true;
        this.dom.uiPanel.classList.remove('hidden');
        this.selectedCategory = null; // Reset category
        this.selectedConstructionDefId = null;
        logToConsole("ConstructionUI.open() - Calling populateCategories...", "debug"); // DEBUG
        this.populateCategories(); // Repopulate categories in case definitions changed
        logToConsole("ConstructionUI.open() - Calling renderBuildableList...", "debug"); // DEBUG
        this.renderBuildableList(); // Render based on no category or first category
        this.clearDetail();
        this.dom.selectButton.disabled = true;
        this.dom.placementInstructions.classList.add('hidden');
        window.gameState.isConstructionModeActive = false; // Ensure placement mode is off
        logToConsole("ConstructionUI opened.", "info");
        // TODO: Play UI open sound (e.g., ui_menu_open_01.wav)
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.7 });
    },

    close: function () {
        this.isOpen = false;
        this.dom.uiPanel.classList.add('hidden');
        this.selectedConstructionDefId = null;
        window.gameState.isConstructionModeActive = false; // Ensure placement mode is off
        this.dom.placementInstructions.classList.add('hidden');
        logToConsole("ConstructionUI closed.", "info");
        // TODO: Play UI close sound (e.g., ui_menu_close_01.wav)
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
        if (window.mapRenderer) window.mapRenderer.scheduleRender(); // Clear any placement preview
    },

    toggle: function () {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    populateCategories: function () {
        if (!this.dom.categoryList || !window.constructionManager) return;
        this.dom.categoryList.innerHTML = '';

        const definitions = Object.values(window.constructionManager.constructionDefinitions);
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
        // Select first category by default if none selected
        if (!this.selectedCategory && categories.length > 0) {
            this.selectedCategory = categories[0];
        }
    },

    renderBuildableList: function () {
        logToConsole("ConstructionUI.renderBuildableList() called.", "debug"); // Existing DEBUG log
        if (!this.dom.buildableList || !window.constructionManager) {
            logToConsole("ConstructionUI.renderBuildableList() - buildableList DOM or constructionManager missing.", "error");
            return;
        }
        this.dom.buildableList.innerHTML = '';

        // getBuildableList now returns all definitions, each with a 'meetsSkillReqs' flag.
        const allDefinitions = window.constructionManager.getBuildableList();
        logToConsole(`ConstructionUI.renderBuildableList() - Received ${allDefinitions.length} total definitions from manager.`, "debug");

        const itemsInCategory = allDefinitions.filter(def =>
            !this.selectedCategory || def.category === this.selectedCategory || (this.selectedCategory === "uncategorized" && !def.category)
        );

        logToConsole(`ConstructionUI.renderBuildableList() - Filtered to ${itemsInCategory.length} items for category: ${this.selectedCategory || 'All'}.`, "debug");

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
            // constructionManager.canBuild() checks both skills AND components.
            const canCurrentlyBuild = window.constructionManager.canBuild(def.id);

            li.textContent = def.name;
            li.dataset.constructionId = def.id;

            if (!canCurrentlyBuild) {
                li.classList.add('cannot-build'); // General class for graying out
                // def.meetsSkillReqs is from the augmented definition list
                if (!def.meetsSkillReqs) {
                    li.title = "Skill requirements not met.";
                } else {
                    // If skills are met, but canCurrentlyBuild is false, it must be components.
                    li.title = "Missing required components.";
                }
            } else {
                li.title = "Can build this item."; // Or leave empty if preferred
            }

            li.addEventListener('click', () => {
                this.selectedConstructionDefId = def.id;
                this.renderDetail(def); // Pass the full augmented definition object
                // The select button should only be enabled if BOTH skills and components are met.
                this.dom.selectButton.disabled = !canCurrentlyBuild;
            });
            this.dom.buildableList.appendChild(li);
        });
    },

    renderDetail: function (definition) {
        this.dom.detailName.textContent = definition.name;
        this.dom.detailDescription.textContent = definition.description;
        this.dom.detailSize.textContent = definition.size ? `${definition.size.width}x${definition.size.height}` : '1x1';

        // Clear previous skill and component details
        this.dom.detailSkill.innerHTML = ''; // Assuming detailSkill is a container (e.g., a <ul> or <div>)
        this.dom.detailSkillLevel.innerHTML = ''; // Clear this if it was separate, or combine into detailSkill
        this.dom.detailComponents.innerHTML = '';

        // Skill Requirement Display
        if (definition.skillRequired && definition.skillLevelRequired) {
            const player = window.gameState; // Or however player state is accessed
            const playerScore = getSkillValue(definition.skillRequired, player); // Ensure getSkillValue is globally accessible or via manager
            const skillLi = document.createElement('li');
            const skillSpan = document.createElement('span');
            skillSpan.textContent = `${definition.skillRequired}: ${playerScore}/${definition.skillLevelRequired}`;
            if (playerScore >= definition.skillLevelRequired) {
                skillSpan.classList.add('req-met');
            } else {
                skillSpan.classList.add('req-not-met');
            }
            skillLi.appendChild(skillSpan);
            this.dom.detailSkill.appendChild(skillLi); // Append to the skill container
        } else {
            const skillLi = document.createElement('li');
            skillLi.textContent = "Skill: None";
            this.dom.detailSkill.appendChild(skillLi);
        }
        // If detailSkillLevel was a separate DOM element and you want to keep it that way, adjust accordingly.
        // For simplicity, I'm putting skill level directly in the text above. If it was for the level number only:
        // this.dom.detailSkillLevel.textContent = definition.skillLevelRequired || '-'; // This would not be colored.


        // Component Requirements Display
        if (definition.components && definition.components.length > 0) {
            definition.components.forEach(comp => {
                const itemDef = window.assetManager ? window.assetManager.getItem(comp.itemId) : null;
                const compName = itemDef ? itemDef.name : comp.itemId;
                // Count items from player's main inventory container
                const playerHas = window.inventoryManager ? window.inventoryManager.countItems(comp.itemId, window.gameState.inventory.container.items) : 0;

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
    },

    clearDetail: function () {
        this.dom.detailName.textContent = "-";
        this.dom.detailDescription.textContent = "-";
        this.dom.detailSize.textContent = "-";
        this.dom.detailSkill.textContent = "-";
        this.dom.detailSkillLevel.textContent = "-";
        this.dom.detailComponents.innerHTML = '';
        this.dom.detailTimeToBuild.textContent = "-";
    },

    enterPlacementMode: function () {
        if (!this.selectedConstructionDefId) {
            logToConsole("No construction selected for placement.", "warn");
            return;
        }
        const definition = window.constructionManager.constructionDefinitions[this.selectedConstructionDefId];
        if (!definition) {
            logToConsole(`Construction definition ${this.selectedConstructionDefId} not found.`, "error");
            return;
        }

        window.gameState.isConstructionModeActive = true;
        window.gameState.selectedConstructionId = this.selectedConstructionDefId; // Store ID for placement logic
        this.dom.placementInstructions.classList.remove('hidden');
        logToConsole(`Entering placement mode for ${definition.name}. Click on map to place.`, "info");
        // The actual map click handling and placement preview will be in script.js or mapRenderer.js
        // For now, this UI just sets the state.
        // Consider closing the UI panel automatically or greying it out during placement.
        // For now, let's keep it open but indicate placement mode.
    },

    exitPlacementMode: function () { // Can be called by Escape key or after successful placement
        window.gameState.isConstructionModeActive = false;
        window.gameState.selectedConstructionId = null;
        if (this.dom.placementInstructions) this.dom.placementInstructions.classList.add('hidden');
        if (window.mapRenderer) window.mapRenderer.scheduleRender(); // Clear any preview
        logToConsole("Exited placement mode.", "info");
    }
};

// Initialization should be called from main script after dependencies are ready.
// e.g., document.addEventListener('DOMContentLoaded', () => ConstructionUI.initialize());
if (typeof window !== 'undefined') {
    window.ConstructionUI = ConstructionUI;
}
