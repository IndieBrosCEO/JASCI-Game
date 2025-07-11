// js/ui/vehicleModificationUI.js

class VehicleModificationUIManager {
    constructor(vehicleManager, inventoryManager, assetManager, gameState) {
        this.vehicleManager = vehicleManager;
        this.inventoryManager = inventoryManager;
        this.assetManager = assetManager;
        this.gameState = gameState;

        this.isOpen = false;
        this.currentVehicleId = null;
        this.logPrefix = "[VehicleModificationUIManager]";

        this.dom = {
            uiPanel: null,
            vehicleNameSpan: null,
            chassisNameSpan: null,
            chassisHPSpan: null,
            partSlotsList: null,
            playerInventoryList: null,
            partDetailSection: null,
            selectedPartNameDetail: null,
            selectedPartTypeDetail: null,
            selectedPartDurabilityDetail: null,
            selectedPartWeightDetail: null,
            selectedPartEffectsDetail: null,
            repairActionSection: null,
            repairPartName: null,
            repairPartMaterials: null,
            confirmRepairButton: null,
            closeButton: null,
        };
    }

    initialize() {
        this.dom.uiPanel = document.getElementById('vehicleModificationUI');
        this.dom.vehicleNameSpan = document.getElementById('vehicleModUIName');
        this.dom.chassisNameSpan = document.getElementById('vehicleChassisName');
        this.dom.chassisHPSpan = document.getElementById('vehicleChassisHP');
        this.dom.partSlotsList = document.getElementById('vehiclePartSlotsList');
        this.dom.playerInventoryList = document.getElementById('playerVehiclePartsInventory');

        this.dom.partDetailSection = document.getElementById('vehiclePartDetailSection');
        this.dom.selectedPartNameDetail = document.getElementById('selectedPartNameDetail');
        this.dom.selectedPartTypeDetail = document.getElementById('selectedPartTypeDetail');
        this.dom.selectedPartDurabilityDetail = document.getElementById('selectedPartDurabilityDetail');
        this.dom.selectedPartWeightDetail = document.getElementById('selectedPartWeightDetail');
        this.dom.selectedPartEffectsDetail = document.getElementById('selectedPartEffectsDetail');

        this.dom.repairActionSection = document.getElementById('repairActionSection');
        this.dom.repairPartName = document.getElementById('repairPartName');
        this.dom.repairPartMaterials = document.getElementById('repairPartMaterials');
        this.dom.confirmRepairButton = document.getElementById('confirmRepairButton');

        this.dom.closeButton = document.getElementById('closeVehicleModUIButton');

        if (this.dom.closeButton) {
            this.dom.closeButton.addEventListener('click', () => this.close());
        }
        if (this.dom.confirmRepairButton) {
            this.dom.confirmRepairButton.addEventListener('click', () => this.handleRepairPart());
        }

        logToConsole(`${this.logPrefix} Initialized.`, "info");
    }

    open(vehicleId) {
        if (!vehicleId) {
            logToConsole(`${this.logPrefix} Error: No vehicleId provided to open.`, "error");
            return;
        }
        this.currentVehicleId = vehicleId;
        const vehicle = this.vehicleManager ? this.vehicleManager.getVehicleById(vehicleId) : null;

        if (!vehicle) {
            logToConsole(`${this.logPrefix} Error: Vehicle with ID ${vehicleId} not found.`, "error");
            this.currentVehicleId = null;
            return;
        }

        if (this.dom.uiPanel) {
            this.isOpen = true;
            this.dom.uiPanel.classList.remove('hidden');
            this.dom.vehicleNameSpan.textContent = vehicle.name || "Unnamed Vehicle";
            this.renderVehicleSlots(vehicle);
            this.renderPlayerInventory(vehicle);
            this.clearPartDetail();
            logToConsole(`${this.logPrefix} Opened for ${vehicle.name}.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_menu_open_01.wav');
        } else {
            logToConsole(`${this.logPrefix} Error: UI Panel not found in DOM.`, "error");
        }
    }

    close() {
        if (this.dom.uiPanel) {
            this.isOpen = false;
            this.currentVehicleId = null;
            this.dom.uiPanel.classList.add('hidden');
            logToConsole(`${this.logPrefix} Closed.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_menu_close_01.wav');
        }
    }

    toggle(vehicleId) {
        if (this.isOpen && this.currentVehicleId === vehicleId) {
            this.close();
        } else {
            this.open(vehicleId);
        }
    }

    renderVehicleSlots(vehicle) {
        if (!this.dom.partSlotsList || !this.vehicleManager || !this.vehicleManager.vehicleParts) return;
        this.dom.partSlotsList.innerHTML = '';

        const chassisDef = this.vehicleManager.vehicleParts[vehicle.chassis];
        if (chassisDef) {
            this.dom.chassisNameSpan.textContent = chassisDef.name;
            this.dom.chassisHPSpan.textContent = `${vehicle.durability[vehicle.chassis]}/${chassisDef.durability}`;
        } else {
            this.dom.chassisNameSpan.textContent = "Unknown Chassis";
            this.dom.chassisHPSpan.textContent = "N/A";
        }

        for (const slotType in vehicle.attachedParts) {
            const slots = vehicle.attachedParts[slotType];
            slots.forEach((partId, index) => {
                const li = document.createElement('li');
                let content = `${slotType} ${index + 1}: `;
                if (partId) {
                    const partDef = this.vehicleManager.vehicleParts[partId];
                    content += `[${partDef ? partDef.name : 'Unknown Part'} (HP: ${vehicle.durability[partId]}/${partDef ? partDef.durability : '?'})] `;

                    const removeButton = document.createElement('button');
                    removeButton.textContent = "Remove";
                    removeButton.onclick = () => this.handleRemovePart(slotType, index);
                    li.appendChild(removeButton);

                    const repairButton = document.createElement('button');
                    repairButton.textContent = "Repair";
                    repairButton.onclick = () => this.showRepairOptions(partId, slotType, index);
                    li.appendChild(repairButton);

                } else {
                    content += `[Empty] `;
                    const installButton = document.createElement('button');
                    installButton.textContent = "Install";
                    installButton.onclick = () => this.handleInstallPart(slotType, index);
                    li.appendChild(installButton);
                }
                const textNode = document.createTextNode(content);
                li.prepend(textNode);
                this.dom.partSlotsList.appendChild(li);
            });
        }
    }

    renderPlayerInventory(vehicle) {
        if (!this.dom.playerInventoryList || !this.gameState || !this.gameState.inventory || !this.gameState.inventory.container) return;
        this.dom.playerInventoryList.innerHTML = '';

        const playerParts = this.gameState.inventory.container.items.filter(item => {
            const itemDef = this.assetManager ? this.assetManager.getItem(item.id) : null;
            return itemDef && itemDef.itemCategory === 'vehicle_part';
        });

        if (playerParts.length === 0) {
            this.dom.playerInventoryList.innerHTML = '<li>No vehicle parts in inventory.</li>';
            return;
        }

        playerParts.forEach(partItem => {
            const partDef = this.assetManager.getItem(partItem.id);
            if (partDef) {
                const li = document.createElement('li');
                li.textContent = `${partDef.name} (Type: ${partDef.vehiclePartType || 'N/A'}) `;

                const detailsButton = document.createElement('button');
                detailsButton.textContent = "Details";
                detailsButton.onclick = () => this.showPartDetail(partDef.id, 'inventory');
                li.appendChild(detailsButton);

                const installButton = document.createElement('button');
                installButton.textContent = "Install";
                installButton.onclick = () => this.handleInstallPartFromInventory(partDef.id);
                li.appendChild(installButton);

                this.dom.playerInventoryList.appendChild(li);
            }
        });
    }

    showPartDetail(partId, source = 'slot') {
        this.dom.partDetailSection.classList.remove('hidden');
        let partDef = null;
        if (source === 'inventory') {
            const itemDef = this.assetManager ? this.assetManager.getItem(partId) : null;
            if (itemDef && itemDef.vehiclePartEquivalentId && this.vehicleManager) {
                partDef = this.vehicleManager.vehicleParts[itemDef.vehiclePartEquivalentId];
            } else if (itemDef && itemDef.itemCategory === 'vehicle_part' && this.vehicleManager) {
                partDef = this.vehicleManager.vehicleParts[partId];
            }
        } else {
            partDef = this.vehicleManager ? this.vehicleManager.vehicleParts[partId] : null;
        }

        if (partDef) {
            this.dom.selectedPartNameDetail.textContent = partDef.name;
            this.dom.selectedPartTypeDetail.textContent = partDef.type;
            this.dom.selectedPartDurabilityDetail.textContent = partDef.durability;
            this.dom.selectedPartWeightDetail.textContent = partDef.weight;
            let effectsText = "None";
            if (partDef.effects) {
                effectsText = Object.entries(partDef.effects).map(([key, value]) => `${key}: ${value}`).join(', ');
            }
            this.dom.selectedPartEffectsDetail.textContent = effectsText;
            this.dom.repairActionSection.classList.add('hidden');
        } else {
            this.clearPartDetail();
            logToConsole(`${this.logPrefix}: Could not find definition for part ID "${partId}" (source: ${source}) to show details.`, "warn");
        }
    }

    clearPartDetail() {
        this.dom.partDetailSection.classList.add('hidden');
        this.dom.selectedPartNameDetail.textContent = "-";
        this.dom.selectedPartTypeDetail.textContent = "-";
        this.dom.selectedPartDurabilityDetail.textContent = "-";
        this.dom.selectedPartWeightDetail.textContent = "-";
        this.dom.selectedPartEffectsDetail.textContent = "-";
        this.dom.repairActionSection.classList.add('hidden');
    }

    showRepairOptions(partId, slotType, slotIndex) {
        this.showPartDetail(partId, 'slot');
        const vehicle = this.vehicleManager.getVehicleById(this.currentVehicleId);
        const partDef = this.vehicleManager.vehicleParts[partId];
        if (!vehicle || !partDef || vehicle.durability[partId] === undefined) return;

        if (vehicle.durability[partId] < partDef.durability) {
            this.dom.repairActionSection.classList.remove('hidden');
            this.dom.repairPartName.textContent = partDef.name;
            if (partDef.repairMaterials && this.assetManager && this.inventoryManager) {
                let materialsText = "Requires: ";
                const playerHasAllMaterials = partDef.repairMaterials.every(mat => {
                    const itemDef = this.assetManager.getItem(mat.itemId);
                    const playerHas = this.inventoryManager.countItems(mat.itemId);
                    materialsText += `${itemDef ? itemDef.name : mat.itemId} (${playerHas}/${mat.quantity}), `;
                    return playerHas >= mat.quantity;
                });
                this.dom.repairPartMaterials.textContent = materialsText.slice(0, -2);
                this.dom.confirmRepairButton.disabled = !playerHasAllMaterials;
                this.dom.repairPartMaterials.style.color = playerHasAllMaterials ? "" : "orange";
            } else {
                this.dom.repairPartMaterials.textContent = "No materials specified or missing manager.";
                this.dom.confirmRepairButton.disabled = true;
            }
            this.dom.confirmRepairButton.dataset.partId = partId;
            this.dom.confirmRepairButton.dataset.slotType = slotType;
            this.dom.confirmRepairButton.dataset.slotIndex = slotIndex;
        } else {
            logToConsole(`${partDef.name} is already at full durability.`, "info");
            this.dom.repairActionSection.classList.add('hidden');
        }
    }

    handleRepairPart() {
        const partId = this.dom.confirmRepairButton.dataset.partId;
        if (!this.currentVehicleId || !partId) {
            logToConsole(`${this.logPrefix} Error: Missing vehicle or part context for repair.`, "error");
            return;
        }
        if (this.gameState.actionPointsRemaining < 1) { // AP_COST_REPAIR_PART
            logToConsole("Not enough Action Points to repair.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        const partDef = this.vehicleManager.vehicleParts[partId];
        if (!partDef) {
            logToConsole(`${this.logPrefix} Error: Part definition not found for repair.`, "error");
            return;
        }

        const requiredMaterials = partDef.repairMaterials || [];
        if (requiredMaterials.length > 0 && !requiredMaterials.every(mat => this.inventoryManager.countItems(mat.itemId) >= mat.quantity)) {
            logToConsole("Not enough materials to repair (UI check).", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_02.wav');
            // if (window.uiManager) window.uiManager.showToastNotification("Not enough materials!", "error");
            return;
        }

        const success = this.vehicleManager.repairVehiclePart(this.currentVehicleId, partId, partDef.durability, requiredMaterials);
        if (success) {
            logToConsole(`Repair successful for ${partDef.name}.`, "info");
            this.gameState.actionPointsRemaining--;
            if (window.turnManager) window.turnManager.updateTurnUI();
            const vehicle = this.vehicleManager.getVehicleById(this.currentVehicleId);
            if (vehicle) {
                this.renderVehicleSlots(vehicle);
                this.showRepairOptions(partId, this.dom.confirmRepairButton.dataset.slotType, parseInt(this.dom.confirmRepairButton.dataset.slotIndex));
            }
            if (window.audioManager) window.audioManager.playSoundAtLocation('vehicle_repair_01.wav', vehicle.mapPos, {}, { maxDistance: 20 });
        } else {
            logToConsole(`Repair on ${partDef.name} failed.`, "warn");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    }

    handleInstallPartFromInventory(partDefinitionIdFromInventory) {
        if (!this.currentVehicleId || !partDefinitionIdFromInventory || !this.vehicleManager) return;

        const vehicle = this.vehicleManager.getVehicleById(this.currentVehicleId);
        const itemDef = this.assetManager.getItem(partDefinitionIdFromInventory);
        if (!itemDef || !itemDef.vehiclePartEquivalentId) {
            logToConsole(`${this.logPrefix}: Item ${partDefinitionIdFromInventory} is not a vehicle part or has no vehicle equivalent.`, "warn");
            return;
        }
        const vehiclePartIdToInstall = itemDef.vehiclePartEquivalentId;
        const partDefToInstall = this.vehicleManager.vehicleParts[vehiclePartIdToInstall];

        if (!vehicle || !partDefToInstall) {
            logToConsole(`${this.logPrefix} Error: Vehicle or part definition not found for install.`, "error");
            return;
        }

        let installed = false;
        for (const slotType in vehicle.attachedParts) {
            if (partDefToInstall.type === slotType || slotType.startsWith(partDefToInstall.type)) {
                const slots = vehicle.attachedParts[slotType];
                for (let i = 0; i < slots.length; i++) {
                    if (slots[i] === null) {
                        const apCostInstall = 1;
                        if (this.gameState.actionPointsRemaining < apCostInstall) {
                            logToConsole("Not enough AP to install part.", "orange");
                            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                            return;
                        }
                        if (!this.inventoryManager.removeItemsFromInventory(partDefinitionIdFromInventory, 1, this.gameState.inventory.container.items)) {
                            logToConsole(`Failed to remove item ${partDefinitionIdFromInventory} from inventory for install.`, "error");
                            // if (window.uiManager) window.uiManager.showToastNotification("Could not find part in inventory to install.", "error");
                            return;
                        }
                        if (this.vehicleManager.addPartToVehicle(this.currentVehicleId, vehiclePartIdToInstall, slotType, i)) {
                            logToConsole(`Installed ${partDefToInstall.name} into ${slotType} ${i + 1}.`, "info");
                            this.gameState.actionPointsRemaining -= apCostInstall;
                            if (window.turnManager) window.turnManager.updateTurnUI();
                            this.renderVehicleSlots(vehicle);
                            this.renderPlayerInventory(vehicle);
                            this.clearPartDetail();
                            installed = true;
                            break;
                        }
                    }
                }
            }
            if (installed) break;
        }
        if (!installed) {
            logToConsole(`No compatible empty slot found for ${partDefToInstall.name} or install failed.`, "warn");
        }
    }

    handleInstallPart(slotType, slotIndex) {
        logToConsole(`Selected empty slot ${slotType}[${slotIndex}] to install a part. Please select a compatible part from your inventory.`, "info");
        this.dom.playerInventoryList.querySelectorAll('li').forEach(li => {
            // TODO: Add logic to check compatibility and highlight
            // li.classList.add('highlight-compatible');
        });
    }

    handleRemovePart(slotType, slotIndex) {
        if (!this.currentVehicleId || !this.vehicleManager) return;
        const apCostRemove = 1;
        if (this.gameState.actionPointsRemaining < apCostRemove) {
            logToConsole("Not enough AP to remove part.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        const removedPartVehicleDef = this.vehicleManager.removePartFromVehicle(this.currentVehicleId, slotType, slotIndex);
        if (removedPartVehicleDef) {
            logToConsole(`Removed ${removedPartVehicleDef.name} from ${slotType} ${slotIndex + 1}.`, "info");
            let itemEquivalentId = removedPartVehicleDef.id;
            if (this.assetManager) {
                const foundItemEntry = Object.entries(this.assetManager.itemsData).find(([itemId, itemDef]) => itemDef.vehiclePartEquivalentId === removedPartVehicleDef.id);
                if (foundItemEntry) {
                    itemEquivalentId = foundItemEntry[0];
                } else {
                    logToConsole(`${this.logPrefix}: No specific item found with vehiclePartEquivalentId ${removedPartVehicleDef.id}. Assuming item ID is ${itemEquivalentId}.`, "info_minor");
                }
            }
            if (itemEquivalentId && this.inventoryManager.addItemToInventoryById(itemEquivalentId, 1)) {
                logToConsole(`Added ${removedPartVehicleDef.name} (Item ID: ${itemEquivalentId}) back to player inventory.`, "info");
            } else {
                logToConsole(`Could not add ${removedPartVehicleDef.name} (Item ID: ${itemEquivalentId}) to inventory.`, "warn");
                // if (window.uiManager) window.uiManager.showToastNotification(`${removedPartVehicleDef.name} couldn't be added to inventory!`, "warning");
            }
            this.gameState.actionPointsRemaining -= apCostRemove;
            if (window.turnManager) window.turnManager.updateTurnUI();
            const vehicle = this.vehicleManager.getVehicleById(this.currentVehicleId);
            if (vehicle) {
                this.renderVehicleSlots(vehicle);
                this.renderPlayerInventory(vehicle);
            }
            this.clearPartDetail();
        } else {
            logToConsole("Failed to remove part.", "warn");
        }
    }
}

// Removed: window.VehicleModificationUI = VehicleModificationUI;
// Initialization will be handled by script.js creating an instance of VehicleModificationUIManager
// and assigning it to window.VehicleModificationUI there.
