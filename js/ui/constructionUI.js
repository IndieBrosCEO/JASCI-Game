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
        if (!window.constructionManager) {
            logToConsole("ConstructionUI Error: ConstructionManager not available.", "error");
            return;
        }
        this.isOpen = true;
        this.dom.uiPanel.classList.remove('hidden');
        this.selectedCategory = null; // Reset category
        this.selectedConstructionDefId = null;
        this.populateCategories(); // Repopulate categories in case definitions changed
        this.renderBuildableList(); // Render based on no category or first category
        this.clearDetail();
        this.dom.selectButton.disabled = true;
        this.dom.placementInstructions.classList.add('hidden');
        window.gameState.isConstructionModeActive = false; // Ensure placement mode is off
        logToConsole("ConstructionUI opened.", "info");
    },

    close: function () {
        this.isOpen = false;
        this.dom.uiPanel.classList.add('hidden');
        this.selectedConstructionDefId = null;
        window.gameState.isConstructionModeActive = false; // Ensure placement mode is off
        this.dom.placementInstructions.classList.add('hidden');
        logToConsole("ConstructionUI closed.", "info");
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
        if (!this.dom.buildableList || !window.constructionManager) return;
        this.dom.buildableList.innerHTML = '';

        const buildableItems = window.constructionManager.getBuildableList(); // Gets all player can *skill-wise* build

        const itemsInCategory = buildableItems.filter(def =>
            !this.selectedCategory || def.category === this.selectedCategory || (this.selectedCategory === "uncategorized" && !def.category)
        );

        if (itemsInCategory.length === 0) {
            this.dom.buildableList.innerHTML = '<li>No buildable items in this category or meet skill requirements.</li>';
            return;
        }

        itemsInCategory.forEach(def => {
            const li = document.createElement('li');
            const canAfford = window.constructionManager.canBuild(def.id); // Checks components too
            li.textContent = def.name;
            li.dataset.constructionId = def.id;
            if (!canAfford) {
                li.classList.add('cannot-afford');
                li.title = "Missing components or skill too low.";
            }
            li.addEventListener('click', () => {
                this.selectedConstructionDefId = def.id;
                this.renderDetail(def);
                this.dom.selectButton.disabled = !canAfford;
            });
            this.dom.buildableList.appendChild(li);
        });
    },

    renderDetail: function (definition) {
        this.dom.detailName.textContent = definition.name;
        this.dom.detailDescription.textContent = definition.description;
        this.dom.detailSize.textContent = definition.size ? `${definition.size.width}x${definition.size.height}` : '1x1';
        this.dom.detailSkill.textContent = definition.skillRequired || 'None';
        this.dom.detailSkillLevel.textContent = definition.skillLevelRequired || '-';

        this.dom.detailComponents.innerHTML = '';
        if (definition.components && definition.components.length > 0) {
            definition.components.forEach(comp => {
                const itemDef = window.assetManager ? window.assetManager.getItem(comp.itemId) : null;
                const compName = itemDef ? itemDef.name : comp.itemId;
                const playerHas = window.inventoryManager ? window.inventoryManager.countItems(comp.itemId) : 0;
                const li = document.createElement('li');
                li.textContent = `${compName}: ${playerHas}/${comp.quantity}`;
                if (playerHas < comp.quantity) {
                    li.style.color = 'orange';
                }
                this.dom.detailComponents.appendChild(li);
            });
        } else {
            this.dom.detailComponents.innerHTML = '<li>None</li>';
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
