// js/ui/constructionUI.js

class ConstructionUIManager {
    constructor(constructionManager, inventoryManager, assetManager, gameState, mapRenderer) {
        this.constructionManager = constructionManager;
        this.inventoryManager = inventoryManager;
        this.assetManager = assetManager;
        this.gameState = gameState;
        this.mapRenderer = mapRenderer;

        this.isOpen = false;
        this.selectedCategory = null;
        this.selectedConstructionDefId = null;
        this.logPrefix = "[ConstructionUIManager]";

        this.dom = {
            uiPanel: null,
            tabsContainer: null, // New
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
        };
    }

    initialize() {
        this.dom.uiPanel = document.getElementById('constructionUI');
        this.dom.tabsContainer = document.getElementById('constructionTabs');
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
            console.error(`${this.logPrefix} Error: UI Panel not found.`);
            return;
        }

        this.dom.closeButton.addEventListener('click', () => this.close());
        this.dom.selectButton.addEventListener('click', () => this.enterPlacementMode());

        // Initialize with default category if possible, but renderTabs will handle it
        logToConsole(`${this.logPrefix} Initialized.`, "info");
    }

    open() {
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

        // Always refresh categories and list on open
        this.renderTabs();
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
        if (!this.dom.uiPanel) return;
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

    renderTabs() {
        if (!this.dom.tabsContainer || !this.constructionManager) return;
        this.dom.tabsContainer.innerHTML = '';

        const definitions = Object.values(this.constructionManager.constructionDefinitions);
        const categories = [...new Set(definitions.map(def => def.category || "uncategorized"))];
        categories.sort();

        // Ensure we have a selected category
        if (!this.selectedCategory && categories.length > 0) {
            this.selectedCategory = categories[0];
        } else if (categories.length > 0 && !categories.includes(this.selectedCategory)) {
             this.selectedCategory = categories[0];
        }

        categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'tab-button';
            if (category === this.selectedCategory) {
                btn.classList.add('active');
            }
            // Format category name
            btn.textContent = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            btn.addEventListener('click', () => {
                this.selectedCategory = category;
                this.renderTabs(); // Update active state
                this.renderBuildableList();
                this.clearDetail();
                this.dom.selectButton.disabled = true;
            });
            this.dom.tabsContainer.appendChild(btn);
        });
    }

    renderBuildableList() {
        if (!this.dom.buildableList || !this.constructionManager) {
            return;
        }
        this.dom.buildableList.innerHTML = '';

        let allDefinitionsWithSkillStatus = [];
        if (this.constructionManager && typeof this.constructionManager.getAllConstructionDefinitionsWithStatus === 'function') {
            allDefinitionsWithSkillStatus = this.constructionManager.getAllConstructionDefinitionsWithStatus();
        }

        const itemsInCategory = allDefinitionsWithSkillStatus.filter(def =>
            def && (!this.selectedCategory || def.category === this.selectedCategory || (this.selectedCategory === "uncategorized" && !def.category))
        );

        if (itemsInCategory.length === 0) {
            this.dom.buildableList.innerHTML = '<li>No items in this category.</li>';
            this.clearDetail();
            this.dom.selectButton.disabled = true;
            return;
        }

        itemsInCategory.forEach(def => {
            const li = document.createElement('li');
            const canCurrentlyBuild = this.constructionManager.canBuild(def.id);

            li.textContent = def.name;
            li.dataset.constructionId = def.id;
            li.style.cursor = "pointer";

            if (!canCurrentlyBuild) {
                li.classList.add('cannot-build');
                if (!def.meetsSkillReqs) {
                    li.title = "Skill requirements not met.";
                } else {
                    li.title = "Missing required components.";
                }
            } else {
                li.title = "You can build this.";
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

        this.dom.detailSkill.innerHTML = '';
        this.dom.detailComponents.innerHTML = '';

        // Skill Requirement Display
        if (definition.skillRequired && definition.skillLevelRequired) {
            const player = this.gameState;
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

        // Tool Requirements Display
        if (recipeToUse.tools_required && recipeToUse.tools_required.length > 0) {
            recipeToUse.tools_required.forEach(toolId => {
                const itemDef = this.assetManager ? this.assetManager.getItem(toolId) : null;
                const displayName = itemDef ? itemDef.name : toolId;
                let hasTool = false;
                if (this.inventoryManager && this.gameState.inventory && this.gameState.inventory.container) {
                     hasTool = this.inventoryManager.hasItem(toolId, 1, this.gameState.inventory.container.items);
                }

                const li = document.createElement('li');
                const span = document.createElement('span');
                span.textContent = `Tool: ${displayName}`;

                if (hasTool) {
                    span.classList.add('req-met');
                } else {
                    span.classList.add('req-not-met');
                }
                li.appendChild(span);
                this.dom.detailComponents.appendChild(li);
            });
        }

        if (recipeToUse.components && recipeToUse.components.length > 0) {
            recipeToUse.components.forEach(comp => {
                let displayName = "";
                let hasEnough = false;
                let currentCount = 0;

                const resolver = this.constructionManager.recipeResolver || (window.RecipeResolver ? new window.RecipeResolver(this.assetManager) : null);

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
        this.dom.detailSkill.innerHTML = "<li>Skill: -</li>";
        this.dom.detailComponents.innerHTML = '<li>Components: -</li>';
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

try {
    if (typeof ConstructionUIManager !== 'undefined') {
        window.ConstructionUIManager = ConstructionUIManager;
    }
} catch (e) {
    console.error('[ConstructionUIManager] Error during explicit window assignment:', e);
}
