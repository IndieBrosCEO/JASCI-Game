// js/ui/vehicleModificationUI.js

const VehicleModificationUI = {
    isOpen: false,
    currentVehicleId: null,
    dom: {
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
    },

    initialize: function () {
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
        // Add other event listeners (e.g., for confirmRepairButton) when that logic is fleshed out.
        if (this.dom.confirmRepairButton) {
            this.dom.confirmRepairButton.addEventListener('click', () => this.handleRepairPart());
        }

        logToConsole("VehicleModificationUI initialized.", "info");
    },

    open: function (vehicleId) {
        if (!vehicleId) {
            logToConsole("VehicleModificationUI Error: No vehicleId provided to open.", "error");
            return;
        }
        this.currentVehicleId = vehicleId;
        const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(vehicleId) : null;

        if (!vehicle) {
            logToConsole(`VehicleModificationUI Error: Vehicle with ID ${vehicleId} not found.`, "error");
            this.currentVehicleId = null;
            return;
        }

        if (this.dom.uiPanel) {
            this.isOpen = true;
            this.dom.uiPanel.classList.remove('hidden');
            this.dom.vehicleNameSpan.textContent = vehicle.name || "Unnamed Vehicle";
            this.renderVehicleSlots(vehicle);
            this.renderPlayerInventory(vehicle); // Pass vehicle to know context for compatible parts
            this.clearPartDetail();
            logToConsole(`VehicleModificationUI opened for ${vehicle.name}.`, "info");
            // TODO: Play UI open sound
            if (window.audioManager) window.audioManager.playUiSound('ui_menu_open_01.wav'); // Placeholder
        } else {
            logToConsole("VehicleModificationUI Error: UI Panel not found in DOM.", "error");
        }
    },

    close: function () {
        if (this.dom.uiPanel) {
            this.isOpen = false;
            this.currentVehicleId = null;
            this.dom.uiPanel.classList.add('hidden');
            logToConsole("VehicleModificationUI closed.", "info");
            // TODO: Play UI close sound
            if (window.audioManager) window.audioManager.playUiSound('ui_menu_close_01.wav'); // Placeholder
        }
    },

    toggle: function (vehicleId) {
        if (this.isOpen && this.currentVehicleId === vehicleId) {
            this.close();
        } else {
            this.open(vehicleId);
        }
    },

    renderVehicleSlots: function (vehicle) {
        if (!this.dom.partSlotsList || !window.vehicleManager || !window.vehicleManager.vehicleParts) return;
        this.dom.partSlotsList.innerHTML = '';

        const chassisDef = window.vehicleManager.vehicleParts[vehicle.chassis];
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
                    const partDef = window.vehicleManager.vehicleParts[partId];
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
                    installButton.onclick = () => this.handleInstallPart(slotType, index); // Needs more context (which part to install)
                    li.appendChild(installButton);
                }
                const textNode = document.createTextNode(content);
                li.prepend(textNode); // Add text before buttons
                this.dom.partSlotsList.appendChild(li);
            });
        }
    },

    renderPlayerInventory: function (vehicle) {
        if (!this.dom.playerInventoryList || !window.gameState || !window.gameState.inventory || !window.gameState.inventory.container) return;
        this.dom.playerInventoryList.innerHTML = '';

        // Filter player's inventory for items that are vehicle parts
        const playerParts = window.gameState.inventory.container.items.filter(item => {
            const itemDef = window.assetManager ? window.assetManager.getItem(item.id) : null; // Items store full def now
            return itemDef && itemDef.itemCategory === 'vehicle_part';
        });

        if (playerParts.length === 0) {
            this.dom.playerInventoryList.innerHTML = '<li>No vehicle parts in inventory.</li>';
            return;
        }

        playerParts.forEach(partItem => {
            const partDef = window.assetManager.getItem(partItem.id); // partItem is an Item instance
            if (partDef) { // partDef here is the item definition from items.json
                const li = document.createElement('li');
                li.textContent = `${partDef.name} (Type: ${partDef.vehiclePartType || 'N/A'}) `; // Assuming vehiclePartType is on item def

                // "Show Details" button (optional, or click item to show details)
                const detailsButton = document.createElement('button');
                detailsButton.textContent = "Details";
                detailsButton.onclick = () => this.showPartDetail(partDef.id, 'inventory'); // Pass part definition ID
                li.appendChild(detailsButton);

                // "Install" button - this needs context of which slot to install into.
                // For a better UI, clicking "Install" on an empty slot (in renderVehicleSlots)
                // would then highlight compatible parts in this list.
                // For now, this button might be non-functional or open a sub-selection.
                // Let's make it simple: clicking install here could try to find first available compatible slot.
                const installButton = document.createElement('button');
                installButton.textContent = "Install";
                installButton.onclick = () => this.handleInstallPartFromInventory(partDef.id);
                li.appendChild(installButton);

                this.dom.playerInventoryList.appendChild(li);
            }
        });
    },

    showPartDetail: function (partId, source = 'slot') { // source can be 'slot' or 'inventory'
        this.dom.partDetailSection.classList.remove('hidden');
        let partDef = null;
        if (source === 'inventory') { // If from inventory, partId is an item ID that links to a vehicle part
            const itemDef = window.assetManager ? window.assetManager.getItem(partId) : null;
            if (itemDef && itemDef.vehiclePartEquivalentId && window.vehicleManager) { // Assuming itemDef has vehiclePartEquivalentId
                partDef = window.vehicleManager.vehicleParts[itemDef.vehiclePartEquivalentId];
            } else if (itemDef && itemDef.itemCategory === 'vehicle_part' && window.vehicleManager) {
                // Fallback: if item IS the vehicle part def (less likely with current structure)
                partDef = window.vehicleManager.vehicleParts[partId];
            }
        } else { // from a vehicle slot
            partDef = window.vehicleManager ? window.vehicleManager.vehicleParts[partId] : null;
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
            this.dom.repairActionSection.classList.add('hidden'); // Hide repair by default
        } else {
            this.clearPartDetail();
            logToConsole(`VehicleModUI: Could not find definition for part ID "${partId}" (source: ${source}) to show details.`, "warn");
        }
    },

    clearPartDetail: function () {
        this.dom.partDetailSection.classList.add('hidden');
        this.dom.selectedPartNameDetail.textContent = "-";
        this.dom.selectedPartTypeDetail.textContent = "-";
        this.dom.selectedPartDurabilityDetail.textContent = "-";
        this.dom.selectedPartWeightDetail.textContent = "-";
        this.dom.selectedPartEffectsDetail.textContent = "-";
        this.dom.repairActionSection.classList.add('hidden');
    },

    showRepairOptions: function (partId, slotType, slotIndex) {
        this.showPartDetail(partId, 'slot'); // Show details of the part first
        const vehicle = window.vehicleManager.getVehicleById(this.currentVehicleId);
        const partDef = window.vehicleManager.vehicleParts[partId];
        if (!vehicle || !partDef || vehicle.durability[partId] === undefined) return;

        if (vehicle.durability[partId] < partDef.durability) {
            this.dom.repairActionSection.classList.remove('hidden');
            this.dom.repairPartName.textContent = partDef.name;
            // TODO: Dynamically list materials based on partDef.repairMaterials or similar
            if (partDef.repairMaterials && window.assetManager && window.inventoryManager) {
                let materialsText = "Requires: ";
                const playerHasAllMaterials = partDef.repairMaterials.every(mat => {
                    const itemDef = window.assetManager.getItem(mat.itemId);
                    const playerHas = window.inventoryManager.countItems(mat.itemId);
                    materialsText += `${itemDef ? itemDef.name : mat.itemId} (${playerHas}/${mat.quantity}), `;
                    return playerHas >= mat.quantity;
                });
                this.dom.repairPartMaterials.textContent = materialsText.slice(0, -2); // Remove trailing comma and space
                this.dom.confirmRepairButton.disabled = !playerHasAllMaterials;
                if (!playerHasAllMaterials) {
                    this.dom.repairPartMaterials.style.color = "orange";
                } else {
                    this.dom.repairPartMaterials.style.color = ""; // Reset color
                }
            } else {
                this.dom.repairPartMaterials.textContent = "No materials specified or missing manager.";
                this.dom.confirmRepairButton.disabled = true; // Cannot repair if no materials defined
            }
            // Store context for the actual repair action
            this.dom.confirmRepairButton.dataset.partId = partId;
            this.dom.confirmRepairButton.dataset.slotType = slotType;
            this.dom.confirmRepairButton.dataset.slotIndex = slotIndex;
        } else {
            logToConsole(`${partDef.name} is already at full durability.`, "info");
            this.dom.repairActionSection.classList.add('hidden');
        }
    },

    handleRepairPart: function () {
        const partId = this.dom.confirmRepairButton.dataset.partId;
        // const slotType = this.dom.confirmRepairButton.dataset.slotType;
        // const slotIndex = this.dom.confirmRepairButton.dataset.slotIndex;

        if (!this.currentVehicleId || !partId) {
            logToConsole("VehicleModUI Error: Missing vehicle or part context for repair.", "error");
            return;
        }
        if (window.gameState.actionPointsRemaining < 1) { // AP_COST_REPAIR_PART or similar constant
            logToConsole("Not enough Action Points to repair.", "orange");
            // TODO: Play error sound
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        const partDef = window.vehicleManager.vehicleParts[partId];
        if (!partDef) {
            logToConsole("VehicleModUI Error: Part definition not found for repair.", "error");
            return;
        }

        // TODO: Actual material consumption check and list - Done in showRepairOptions for enabling button, vehicleManager handles actual consumption
        // The vehicleManager.repairVehiclePart should ideally take the partDef to access repairMaterials.
        // For now, we assume vehicleManager can fetch it or it's passed correctly.

        const requiredMaterials = partDef.repairMaterials || [];
        // Double check materials before attempting (though button should be disabled if not met)
        if (requiredMaterials.length > 0 && !requiredMaterials.every(mat => window.inventoryManager.countItems(mat.itemId) >= mat.quantity)) {
            logToConsole("Not enough materials to repair (UI check).", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_02.wav'); // Different error for materials
            if (window.uiManager) window.uiManager.showToastNotification("Not enough materials!", "error");
            return;
        }


        const success = window.vehicleManager.repairVehiclePart(this.currentVehicleId, partId, partDef.durability, requiredMaterials); // Repair to full, pass materials
        if (success) {
            logToConsole(`Repair successful for ${partDef.name}.`, "info");
            window.gameState.actionPointsRemaining--; // Use AP_COST_REPAIR_PART
            if (window.turnManager) window.turnManager.updateTurnUI();
            // Refresh UI
            const vehicle = window.vehicleManager.getVehicleById(this.currentVehicleId);
            if (vehicle) {
                this.renderVehicleSlots(vehicle);
                this.showRepairOptions(partId, this.dom.confirmRepairButton.dataset.slotType, parseInt(this.dom.confirmRepairButton.dataset.slotIndex)); // Reshow details/repair options
            }
            // TODO: Play repair sound
            if (window.audioManager) window.audioManager.playSoundAtLocation('vehicle_repair_01.wav', vehicle.mapPos, {}, { maxDistance: 20 }); // Placeholder
        } else {
            logToConsole(`Repair on ${partDef.name} failed (e.g., already full, or manager-side material check failed).`, "warn");
            // TODO: Play failure sound if applicable (e.g. no materials)
            // This assumes vehicleManager.repairVehiclePart returns false if materials were insufficient on its end or part was full.
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    },

    handleInstallPartFromInventory: function (partDefinitionIdFromInventory) {
        // This is a simplified install: tries to find the first compatible empty slot.
        // A better UI would involve selecting an empty slot first, then choosing a part.
        if (!this.currentVehicleId || !partDefinitionIdFromInventory || !window.vehicleManager) return;

        const vehicle = window.vehicleManager.getVehicleById(this.currentVehicleId);
        // The partDefinitionIdFromInventory is an ITEM ID. We need its vehiclePartEquivalentId.
        const itemDef = window.assetManager.getItem(partDefinitionIdFromInventory);
        if (!itemDef || !itemDef.vehiclePartEquivalentId) {
            logToConsole(`VehicleModUI: Item ${partDefinitionIdFromInventory} is not a vehicle part or has no vehicle equivalent.`, "warn");
            return;
        }
        const vehiclePartIdToInstall = itemDef.vehiclePartEquivalentId;
        const partDefToInstall = window.vehicleManager.vehicleParts[vehiclePartIdToInstall];

        if (!vehicle || !partDefToInstall) {
            logToConsole("VehicleModUI Error: Vehicle or part definition not found for install.", "error");
            return;
        }

        let installed = false;
        for (const slotType in vehicle.attachedParts) {
            if (partDefToInstall.type === slotType || slotType.startsWith(partDefToInstall.type)) { // Basic compatibility
                const slots = vehicle.attachedParts[slotType];
                for (let i = 0; i < slots.length; i++) {
                    if (slots[i] === null) { // Found an empty compatible slot
                        // TODO: Check AP
                        const apCostInstall = 1; // Example AP cost
                        if (window.gameState.actionPointsRemaining < apCostInstall) {
                            logToConsole("Not enough AP to install part.", "orange");
                            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                            return;
                        }

                        // TODO: Consume item from player inventory (partDefinitionIdFromInventory)
                        if (!window.inventoryManager.removeItemsFromInventory(partDefinitionIdFromInventory, 1, window.gameState.inventory.container.items)) {
                            logToConsole(`Failed to remove item ${partDefinitionIdFromInventory} from inventory for install.`, "error");
                            if (window.uiManager) window.uiManager.showToastNotification("Could not find part in inventory to install.", "error");
                            return;
                        }

                        if (window.vehicleManager.addPartToVehicle(this.currentVehicleId, vehiclePartIdToInstall, slotType, i)) {
                            logToConsole(`Installed ${partDefToInstall.name} into ${slotType} ${i + 1}.`, "info");
                            window.gameState.actionPointsRemaining -= apCostInstall;
                            if (window.turnManager) window.turnManager.updateTurnUI();
                            this.renderVehicleSlots(vehicle);
                            this.renderPlayerInventory(vehicle); // Refresh inventory list
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
    },

    handleInstallPart: function (slotType, slotIndex) {
        // This would be called when clicking "Install" on an EMPTY slot.
        // It should ideally highlight compatible parts in the player inventory section
        // and change the mode to "selecting part to install for slot X".
        logToConsole(`Selected empty slot ${slotType}[${slotIndex}] to install a part. Please select a compatible part from your inventory.`, "info");
        // For now, just a log. The actual installation would happen via handleInstallPartFromInventory or a more complex flow.
        // Highlight compatible parts in inventory:
        this.dom.playerInventoryList.querySelectorAll('li').forEach(li => {
            // Logic to check if part in li is compatible with slotType
            // Example: based on partDef.type matching slotType
            // li.classList.add('highlight-compatible');
        });

    },

    handleRemovePart: function (slotType, slotIndex) {
        if (!this.currentVehicleId || !window.vehicleManager) return;
        // TODO: Check AP
        const apCostRemove = 1; // Example AP cost
        if (window.gameState.actionPointsRemaining < apCostRemove) {
            logToConsole("Not enough AP to remove part.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        const removedPartVehicleDef = window.vehicleManager.removePartFromVehicle(this.currentVehicleId, slotType, slotIndex); // This returns the vehicle part definition
        if (removedPartVehicleDef) {
            logToConsole(`Removed ${removedPartVehicleDef.name} from ${slotType} ${slotIndex + 1}.`, "info");

            // TODO: Add removedPartDef back to player inventory
            // We need to find the ITEM ID that corresponds to this VEHICLE PART ID.
            // Assuming vehiclePartDef.id is the key in vehicleManager.vehicleParts, and this ID is also used as the item ID for the part item.
            // Or, if there's a mapping like itemDef.vehiclePartEquivalentId === removedPartVehicleDef.id
            let itemEquivalentId = removedPartVehicleDef.id; // Simplest assumption: the vehicle part ID is the item ID

            // More robust: Search assetManager for an item that defines this vehiclePartEquivalentId
            if (window.assetManager) {
                const foundItemEntry = Object.entries(window.assetManager.itemsData).find(([itemId, itemDef]) => itemDef.vehiclePartEquivalentId === removedPartVehicleDef.id);
                if (foundItemEntry) {
                    itemEquivalentId = foundItemEntry[0];
                } else {
                    // If no explicit mapping, stick with the assumption that part ID is item ID
                    logToConsole(`VehicleModUI: No specific item found with vehiclePartEquivalentId ${removedPartVehicleDef.id}. Assuming item ID is ${itemEquivalentId}.`, "info_minor");
                }
            }

            if (itemEquivalentId && window.inventoryManager.addItemToInventoryById(itemEquivalentId, 1)) {
                logToConsole(`Added ${removedPartVehicleDef.name} (Item ID: ${itemEquivalentId}) back to player inventory.`, "info");
            } else {
                logToConsole(`Could not add ${removedPartVehicleDef.name} (Item ID: ${itemEquivalentId}) to inventory (full or item not found by ID?). Dropping might be an option.`, "warn");
                if (window.uiManager) window.uiManager.showToastNotification(`${removedPartVehicleDef.name} couldn't be added to inventory!`, "warning");
            }

            window.gameState.actionPointsRemaining -= apCostRemove;
            if (window.turnManager) window.turnManager.updateTurnUI();
            const vehicle = window.vehicleManager.getVehicleById(this.currentVehicleId);
            if (vehicle) {
                this.renderVehicleSlots(vehicle);
                this.renderPlayerInventory(vehicle);
            }
            this.clearPartDetail();
        } else {
            logToConsole("Failed to remove part.", "warn");
        }
    }
};

// Initialize the UI when the script loads
// This assumes gameState, assetManager, vehicleManager are globally available or become available soon.
// Actual call to initialize might be better placed after main game init.
// document.addEventListener('DOMContentLoaded', () => VehicleModificationUI.initialize());
// For now, let's assume it's called from script.js after other managers are ready.
if (typeof window !== 'undefined') {
    window.VehicleModificationUI = VehicleModificationUI;
    // Example of how it might be initialized in your main script:
    // if (window.VehicleModificationUI) window.VehicleModificationUI.initialize();
}
