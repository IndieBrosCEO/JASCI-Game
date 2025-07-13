// js/dialogueManager.js

window.dialogueManager = {
    currentDialogueData: null,
    currentNpc: null,
    currentNodeId: null,
    dialogueUI: null,
    npcTextElement: null,
    playerChoicesElement: null,

    async initialize() {
        this.dialogueUI = document.getElementById('dialogueUI');
        this.npcTextElement = document.getElementById('dialogueNPCText');
        this.playerChoicesElement = document.getElementById('dialoguePlayerChoices');

        if (!this.dialogueUI || !this.npcTextElement || !this.playerChoicesElement) {
            console.error("Dialogue UI elements not found!");
            return;
        }
        // Ensure it's hidden by default
        this.dialogueUI.classList.add('hidden');
    },

    async startDialogue(npc) {
        if (!npc || !npc.id) {
            console.error("Cannot start dialogue: NPC or NPC ID is invalid.", npc);
            return;
        }
        this.currentNpc = npc;
        const npcFactionId = npc.factionId || 'neutral'; // Get NPC's faction

        // Determine which dialogue to load
        let dialogueIdToLoad = npc.dialogue_start_node || 'default'; // Default dialogue for the NPC

        const npcDialogueFile = `assets/dialogues/${npc.dialogueFile || (npc.id + '_dialogues.json')}`;
        let dialoguesForNpc;
        try {
            dialoguesForNpc = await window.assetManager.loadData(npcDialogueFile);
            if (!dialoguesForNpc) throw new Error("Dialogue file loaded but is empty or invalid.");
        } catch (e) {
            logToConsole(`Dialogue file ${npcDialogueFile} not found or error. Trying sample_dialogues.json for NPC ${npc.id}. Error: ${e.message}`, 'orange');
            try {
                const sampleDialogues = await window.assetManager.loadData('assets/dialogues/sample_dialogues.json');
                if (sampleDialogues && sampleDialogues[npc.id]) {
                    dialoguesForNpc = sampleDialogues[npc.id];
                } else {
                    logToConsole(`NPC ${npc.id} not found in sample_dialogues.json. Cannot start dialogue.`, 'red');
                    this.endDialogue();
                    return;
                }
            } catch (sampleError) {
                logToConsole(`Failed to load sample_dialogues.json. Cannot start dialogue for ${npc.id}. Error: ${sampleError.message}`, 'red');
                this.endDialogue();
                return;
            }
        }

        // Attempt to load the determined dialogueId; fall back to 'default' if specific one not found
        if (dialoguesForNpc[dialogueIdToLoad]) {
            this.currentDialogueData = dialoguesForNpc[dialogueIdToLoad];
        } else if (dialoguesForNpc['default']) {
            logToConsole(`Dialogue ID '${dialogueIdToLoad}' not found for NPC ${npc.id}. Falling back to 'default' dialogue.`, 'yellow');
            dialogueIdToLoad = 'default'; // Update for logging purposes
            this.currentDialogueData = dialoguesForNpc['default'];
        } else {
            logToConsole(`No dialogue found for ID '${dialogueIdToLoad}' or 'default' for NPC ${npc.id}.`, 'red');
            this.endDialogue();
            return;
        }

        this.currentNodeId = this.currentDialogueData.start;
        this.renderCurrentNode();
        this.dialogueUI.classList.remove('hidden');
        window.gameState.isDialogueActive = true;
        if (window.uiManager && typeof window.uiManager.setFocus === 'function') {
            window.uiManager.setFocus('dialogue');
        }
        logToConsole(`Dialogue started with ${npc.name || npc.id}. Dialogue ID: ${dialogueIdToLoad}`, 'lightblue');
    },

    renderCurrentNode() {
        if (!this.currentDialogueData || !this.currentNodeId || !this.currentDialogueData[this.currentNodeId]) {
            logToConsole("Error: Current dialogue node is invalid.", 'red', { data: this.currentDialogueData, nodeId: this.currentNodeId });
            this.endDialogue();
            return;
        }

        const node = this.currentDialogueData[this.currentNodeId];
        this.npcTextElement.innerHTML = node.text.replace(/\n/g, '<br>');
        this.playerChoicesElement.innerHTML = ''; // Clear old choices

        node.options.forEach((choice, index) => {
            const li = document.createElement('li');
            let choiceText = choice.text;
            if (choice.skillCheck) {
                choiceText = `[${choice.skillCheck.skill}] ${choice.text}`;
            }
            li.innerHTML = `<button data-choice-index="${index}">${index + 1}. ${choiceText}</button>`;
            li.querySelector('button').addEventListener('click', () => this.handlePlayerChoice(index));
            this.playerChoicesElement.appendChild(li);
        });
    },

    async handlePlayerChoice(choiceIndex) {
        if (!this.currentDialogueData || !this.currentNodeId || !this.currentDialogueData[this.currentNodeId]) {
            this.endDialogue();
            return;
        }

        const node = this.currentDialogueData[this.currentNodeId];
        const choice = node.options[choiceIndex];

        if (!choice) {
            logToConsole(`Error: Invalid player choice index ${choiceIndex}.`, 'red');
            this.endDialogue();
            return;
        }

        if (choice.action) {
            switch (choice.action) {
                case "sell_fish":
                    if (window.inventoryManager) {
                        const fishItems = window.inventoryManager.getInventoryItemsByTag("fish");
                        let totalValue = 0;
                        fishItems.forEach(fishItem => {
                            const fishDef = window.assetManager.getFish(fishItem.id);
                            if (fishDef) {
                                totalValue += fishDef.value * fishItem.quantity;
                                window.inventoryManager.removeItems(fishItem.id, fishItem.quantity, window.gameState.inventory.container.items);
                            }
                        });
                        if (totalValue > 0) {
                            window.gameState.player.silver += totalValue;
                            logToConsole(`You sold fish for ${totalValue} silver.`, "event-success");
                            if (window.updateInventoryUI) window.updateInventoryUI();
                        } else {
                            logToConsole("You don't have any fish to sell.", "info");
                        }
                    }
                    break;
                case "start_quest":
                    if (window.proceduralQuestManager) {
                        window.proceduralQuestManager.startQuest(choice.quest_id);
                        logToConsole(`Quest "${choice.quest_id}" started.`, "event-success");
                    }
                    break;
            }
        }

        if (choice.next) {
            this.currentNodeId = choice.next;
            this.renderCurrentNode();
        } else {
            this.endDialogue();
        }
    },

    endDialogue() {
        if (this.dialogueUI) {
            this.dialogueUI.classList.add('hidden');
        }
        this.currentDialogueData = null;
        this.currentNpc = null;
        this.currentNodeId = null;
        window.gameState.isDialogueActive = false;
        if (window.uiManager && typeof window.uiManager.setFocus === 'function') {
            window.uiManager.setFocus('map'); // Or whatever the default focus is
        }
        logToConsole("Dialogue ended.", 'lightblue');
        if (window.mapRenderer) window.mapRenderer.scheduleRender(); // Might be needed if dialogue changed NPC state visually
    }
};
