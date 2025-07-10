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
        let dialogueIdToLoad = npc.defaultDialogueId || 'default'; // Default dialogue for the NPC

        // --- Reputation-based dialogue selection ---
        if (window.factionManager && npcFactionId !== 'neutral') {
            const playerRep = window.factionManager.getPlayerReputation(npcFactionId, window.gameState);
            const thresholds = window.factionManager.ReputationThreshold;

            if (playerRep <= thresholds.Hostile && dialoguesForNpc?.dialogues?.['hostile_default']) {
                dialogueIdToLoad = 'hostile_default';
            } else if (playerRep <= thresholds.Unfriendly && dialoguesForNpc?.dialogues?.['unfriendly_default']) {
                dialogueIdToLoad = 'unfriendly_default';
            } else if (playerRep >= thresholds.Allied && dialoguesForNpc?.dialogues?.['allied_default']) {
                dialogueIdToLoad = 'allied_default';
            } else if (playerRep >= thresholds.Friendly && dialoguesForNpc?.dialogues?.['friendly_default']) {
                dialogueIdToLoad = 'friendly_default';
            }
            // Further logic for quest-specific dialogues could override reputation-based defaults
        }
        // Example: Check if a specific quest related to this NPC is active and at a certain stage
        // This check should come AFTER reputation-based general dialogue selection if quest dialogues are more specific.
        // if (window.questManager && window.questManager.getQuestState('scout_east_road') === 'started' && npc.id === 'guard_01') {
        //    dialogueIdToLoad = 'quest_scout_east_road_complete'; 
        // }

        const npcDialogueFile = `assets/dialogues/${npc.dialogueFile || (npc.id + '_dialogues.json')}`;
        let dialoguesForNpc;
        try {
            dialoguesForNpc = await window.assetManager.loadData(npcDialogueFile);
            if (!dialoguesForNpc || !dialoguesForNpc.dialogues) throw new Error("Dialogue file loaded but is empty, invalid, or missing 'dialogues' object.");
        } catch (e) {
            logToConsole(`Dialogue file ${npcDialogueFile} not found or error. Trying sample_dialogues.json for NPC ${npc.id}. Error: ${e.message}`, 'orange');
            try {
                const sampleDialogues = await window.assetManager.loadData('assets/dialogues/sample_dialogues.json');
                if (sampleDialogues && sampleDialogues[npc.id] && sampleDialogues[npc.id].dialogues) {
                    dialoguesForNpc = sampleDialogues[npc.id];
                } else {
                    logToConsole(`NPC ${npc.id} not found or has no dialogues in sample_dialogues.json. Cannot start dialogue.`, 'red');
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
        if (dialoguesForNpc.dialogues[dialogueIdToLoad]) {
            this.currentDialogueData = dialoguesForNpc.dialogues[dialogueIdToLoad];
        } else if (dialoguesForNpc.dialogues['default']) {
            logToConsole(`Dialogue ID '${dialogueIdToLoad}' not found for NPC ${npc.id}. Falling back to 'default' dialogue.`, 'yellow');
            dialogueIdToLoad = 'default'; // Update for logging purposes
            this.currentDialogueData = dialoguesForNpc.dialogues['default'];
        } else {
            logToConsole(`No dialogue found for ID '${dialogueIdToLoad}' or 'default' for NPC ${npc.id}.`, 'red');
            this.endDialogue();
            return;
        }

        this.currentNodeId = this.currentDialogueData.startNode;
        this.renderCurrentNode();
        this.dialogueUI.classList.remove('hidden');
        window.gameState.isDialogueActive = true;
        if (window.uiManager && typeof window.uiManager.setFocus === 'function') {
            window.uiManager.setFocus('dialogue');
        }
        logToConsole(`Dialogue started with ${npc.name || npc.id}. Dialogue ID: ${dialogueIdToLoad}`, 'lightblue');
    },

    renderCurrentNode() {
        if (!this.currentDialogueData || !this.currentNodeId || !this.currentDialogueData.nodes[this.currentNodeId] && !this.tempQuestOffer) {
            // Allow rendering even if node is invalid IF a tempQuestOffer is pending (it will define its own display)
            // However, if tempQuestOffer relies on a base node that's invalid, that's an issue.
            // The current logic for tempQuestOffer in handlePlayerChoice assumes the *next* node for quest offer exists.
            // If that nextNode itself is invalid, then this check is fine.
            logToConsole("Error: Current dialogue node is invalid and no pending dynamic offer.", 'red', { data: this.currentDialogueData, nodeId: this.currentNodeId });
            this.endDialogue();
            return;
        }

        this.playerChoicesElement.innerHTML = ''; // Clear old choices

        if (this.tempQuestOffer) {
            // Dynamically inject quest offer into NPC text and choices for this specific render.
            // This is a targeted solution for procedural quest offers. A more generic placeholder system
            // (e.g., replacing "{quest_name}" or "{npc_disposition}" in text) would be a larger feature.
            const node = this.currentDialogueData.nodes[this.currentNodeId]; // Base node for context if needed
            const npcNameForOffer = this.currentNpc ? this.currentNpc.name : "Someone";
            let npcTextWithOffer = node ? node.npcText.replace(/\n/g, '<br>') : ""; // Use node's text as base if available

            npcTextWithOffer += `<br><br><i>[${npcNameForOffer} offers you a task:]</i><br><b>${this.tempQuestOffer.displayName}</b><br>${this.tempQuestOffer.description}`;
            this.npcTextElement.innerHTML = npcTextWithOffer;

            const acceptChoiceData = { text: "Accept Task", action: "accept_procedural_quest", questInstanceId: this.tempQuestOffer.questInstanceId, successNode: this.tempQuestOffer.successNodeOnAccept || "quest_accepted_generic", failureNode: this.tempQuestOffer.failureNodeOnAccept || "quest_accept_fail_generic" };
            const declineChoiceData = { text: "Decline Task", nextNode: this.tempQuestOffer.nextNodeOnDecline || (node ? node.playerChoices.find(c => c.text.toLowerCase().includes("decline"))?.nextNode : null) || this.currentDialogueData.startNode };

            [acceptChoiceData, declineChoiceData].forEach((dynamicChoice, index) => {
                const li = document.createElement('li');
                // Pass the whole choice object for handlePlayerChoiceDynamic
                li.innerHTML = `<button data-dynamic-choice-object='${JSON.stringify(dynamicChoice)}'>${index + 1}. ${dynamicChoice.text}</button>`;
                li.querySelector('button').addEventListener('click', (e) => {
                    const choiceData = JSON.parse(e.target.dataset.dynamicChoiceObject);
                    this.handlePlayerChoiceDynamic(choiceData);
                });
                this.playerChoicesElement.appendChild(li);
            });
            // Important: tempQuestOffer is NOT cleared here. It's cleared after the player makes a choice in handlePlayerChoiceDynamic.
        } else {
            // Standard node rendering
            const node = this.currentDialogueData.nodes[this.currentNodeId];
            if (!node) { // Should have been caught by the top check, but safeguard
                logToConsole("Error: Invalid node ID during standard render.", 'red', { nodeId: this.currentNodeId });
                this.endDialogue();
                return;
            }
            this.npcTextElement.innerHTML = node.npcText.replace(/\n/g, '<br>');

            node.playerChoices.forEach((choice, index) => {
                const li = document.createElement('li');
                let choiceText = choice.text;
                if (choice.skillCheck) {
                    choiceText = `[${choice.skillCheck.skill}] ${choice.text}`;
                }
                li.innerHTML = `<button data-choice-index="${index}">${index + 1}. ${choiceText}</button>`;
                li.querySelector('button').addEventListener('click', () => this.handlePlayerChoice(index));
                this.playerChoicesElement.appendChild(li);
            });
        }
    },

    async handlePlayerChoice(choiceIndex) { // This handles choices from the static JSON definition
        if (!this.currentDialogueData || !this.currentNodeId || !this.currentDialogueData.nodes[this.currentNodeId]) {
            this.endDialogue();
            return;
        }

        const node = this.currentDialogueData.nodes[this.currentNodeId];
        const choice = node.playerChoices[choiceIndex];

        if (!choice) {
            logToConsole(`Error: Invalid player choice index ${choiceIndex}.`, 'red');
            this.endDialogue();
            return;
        }

        // Process quest flags
        if (choice.questFlags && window.questManager) {
            choice.questFlags.forEach(qf => {
                window.questManager.updateQuestState(qf.questId || qf.flag, qf.status !== undefined ? qf.status : qf.value);
                logToConsole(`Dialogue: Set quest flag '${qf.questId || qf.flag}' to '${qf.status !== undefined ? qf.status : qf.value}'.`, 'teal');
            });
        }

        // Process rewards
        if (choice.rewards && window.inventoryManager) {
            for (const rewardString of choice.rewards) { // Changed from forEach to for...of
                const parts = rewardString.split('_'); // e.g., "gold_100", "xp_50", "item_apple"
                const type = parts[0];
                const value = parts.length > 1 ? parts.slice(1).join('_') : null; // Handles item IDs with underscores

                if (type === "xp" && value) {
                    const amount = parseInt(value, 10);
                    if (!isNaN(amount)) {
                        window.gameState.playerXP += amount;
                        logToConsole(`Player awarded ${amount} XP. Total XP: ${window.gameState.playerXP}`, 'lime');
                        if (window.characterManager && typeof window.characterManager.checkForLevelUp === 'function') {
                            window.characterManager.checkForLevelUp(window.gameState);
                        }
                        if (window.renderCharacterInfo) window.renderCharacterInfo(); // Update UI
                    }
                } else if (type === "gold" && value) {
                    const amount = parseInt(value, 10);
                    if (!isNaN(amount)) {
                        window.gameState.playerGold = (window.gameState.playerGold || 0) + amount;
                        logToConsole(`Player awarded ${amount} gold. Total gold: ${window.gameState.playerGold}`, 'lime');
                        if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
                    }
                } else if (type === "item" && value) { // value is item ID
                    const itemData = await window.assetManager.getItem(value); // await is now valid here
                    if (itemData) {
                        // Assuming addItemToInventory is synchronous or doesn't need await here.
                        // If addItemToInventory itself becomes async, it would also need await.
                        window.inventoryManager.addItemToInventory(itemData, 1);
                        logToConsole(`Player awarded item: ${itemData.name}`, 'lime');
                    } else {
                        logToConsole(`WARN: Could not find item definition for reward ID '${value}'`, 'orange');
                    }
                }
            }
        }

        // Handle specific actions like recruitment or giving orders
        let actionProcessed = false;
        if (choice.action) {
            switch (choice.action) {
                case "attempt_recruit":
                    if (window.companionManager && this.currentNpc) {
                        const recruitResult = window.companionManager.attemptRecruitNpc(this.currentNpc.id);
                        if (recruitResult.success) {
                            this.currentNodeId = choice.successNode || choice.nextNode; // Fallback to nextNode if successNode not defined
                            logToConsole(`Recruitment of ${this.currentNpc.name} successful!`, "event-success");
                        } else {
                            this.currentNodeId = choice.failureNode || choice.nextNode; // Fallback
                            logToConsole(`Recruitment of ${this.currentNpc.name} failed: ${recruitResult.reason}`, "event");
                            if (recruitResult.rollResult) {
                                logToConsole(`Skill check details: Rolled ${recruitResult.rollResult.total} vs DC ${recruitResult.rollResult.dc} for ${recruitResult.rollResult.skill}.`, "silver");
                            }
                        }
                        actionProcessed = true;
                    } else {
                        logToConsole("CompanionManager not available or no current NPC for recruitment.", "error");
                        this.currentNodeId = choice.nextNode; // Proceed normally if manager missing
                    }
                    break;
                case "set_companion_order":
                    if (window.companionManager && this.currentNpc && choice.order) {
                        if (window.companionManager.isCompanion(this.currentNpc.id)) {
                            window.companionManager.setCompanionOrder(this.currentNpc.id, choice.order);
                            // Order set, proceed to nextNode as usual for this kind of choice.
                            this.currentNodeId = choice.nextNode;
                        } else {
                            logToConsole(`${this.currentNpc.name} is not currently a companion. Cannot set order.`, "warn");
                            this.currentNodeId = choice.nextNode; // Or a specific "not_companion_node"
                        }
                        actionProcessed = true; // Even if not a companion, the action was 'handled'
                    } else {
                        logToConsole("CompanionManager, NPC, or order not specified for set_companion_order.", "error");
                        this.currentNodeId = choice.nextNode; // Default progression
                    }
                    break;
                case "offer_procedural_quest":
                    if (window.proceduralQuestManager && this.currentNpc && choice.factionIdForQuest) {
                        const questOffer = window.proceduralQuestManager.generateQuestOffer(choice.factionIdForQuest);
                        if (questOffer) {
                            // Store the offer details temporarily, perhaps on the dialogue manager or a temp gameState var,
                            // so the next node can display it and offer accept/decline.
                            this.tempQuestOffer = questOffer;
                            this.currentNodeId = choice.nextNodeForQuestOffer || choice.nextNode; // Node that presents the offer
                            logToConsole(`Generated procedural quest offer: ${questOffer.displayName}`, "info");
                        } else {
                            this.currentNodeId = choice.failureNode || choice.nextNode; // Node if no quest could be generated
                            logToConsole("Failed to generate a procedural quest offer.", "warn");
                        }
                        actionProcessed = true;
                    } else {
                        logToConsole("ProceduralQuestManager, NPC, or factionIdForQuest not specified.", "error");
                        this.currentNodeId = choice.nextNode; // Default progression
                    }
                    break;
                case "accept_procedural_quest":
                    if (window.proceduralQuestManager && choice.questInstanceId) {
                        if (window.proceduralQuestManager.acceptProceduralQuest(choice.questInstanceId)) {
                            logToConsole(`Accepted procedural quest: ${choice.questInstanceId}`, "event-success");
                            this.currentNodeId = choice.successNode || choice.nextNode;
                        } else {
                            logToConsole(`Failed to accept procedural quest: ${choice.questInstanceId}`, "warn");
                            this.currentNodeId = choice.failureNode || choice.nextNode;
                        }
                        actionProcessed = true;
                    } else {
                        logToConsole("ProceduralQuestManager or questInstanceId not specified for acceptance.", "error");
                        this.currentNodeId = choice.nextNode;
                    }
                    break;
                // Add other specific actions here if needed
            }
        }

        // Handle skill checks (if no specific action overrode node navigation)
        if (!actionProcessed && choice.skillCheck) {
            const skillCheck = choice.skillCheck;
            const playerSkill = getSkillValue(skillCheck.skill, window.gameState); // Assuming gameState.player for player skills
            const playerModifier = getSkillModifier(skillCheck.skill, window.gameState);
            const roll = rollDie(20);
            const totalRoll = roll + playerModifier;

            let dc = skillCheck.dc;
            if (dc === "npcWillpower" && this.currentNpc) {
                const npcWillpower = getStatValue("Willpower", this.currentNpc) || 10; // Default if NPC has no willpower
                dc = 10 + getStatModifier("Willpower", this.currentNpc); // Example DC calculation
            } else if (typeof dc !== 'number') {
                logToConsole(`WARN: Invalid DC '${dc}' for skill check. Defaulting to 15.`, 'orange');
                dc = 15;
            }

            logToConsole(`Skill Check: ${skillCheck.skill}. Player rolls ${roll} + ${playerModifier} (mod) = ${totalRoll} vs DC ${dc}.`, 'silver');

            if (totalRoll >= dc) {
                logToConsole(`Skill Check Success!`, 'green');
                this.currentNodeId = skillCheck.successNode;
                // Optional: Apply positive disposition or other success effects
                if (this.currentNpc && window.factionManager) {
                    // window.factionManager.adjustNpcDisposition(this.currentNpc.id, 5); // Example temporary boost
                }
            } else {
                logToConsole(`Skill Check Failed.`, 'red');
                this.currentNodeId = skillCheck.failureNode;
                // Optional: Apply negative disposition or other failure effects
                if (this.currentNpc && window.factionManager) {
                    // window.factionManager.adjustNpcDisposition(this.currentNpc.id, -5); // Example temporary hit
                }
            }
        } else if (!actionProcessed) { // Only default to nextNode if no action or skill check handled it
            this.currentNodeId = choice.nextNode;
        }

        // If an action resulted in a temporary quest offer, the next node should display it.
        // The renderCurrentNode needs to be aware of this.tempQuestOffer.
        if (this.tempQuestOffer && this.currentDialogueData.nodes[this.currentNodeId]) {
            let nodeToRender = this.currentDialogueData.nodes[this.currentNodeId];
            // Dynamically inject quest offer into NPC text and choices for this specific render.
            // This is a targeted solution for procedural quest offers. A more generic placeholder system
            // (e.g., replacing "{quest_name}" or "{npc_disposition}" in text) would be a larger feature.
            // For now, this direct modification achieves the display of the current quest offer.
            const originalNpcText = nodeToRender.npcText; // Assuming this node is not otherwise dynamically modified elsewhere per render.
            let tempNpcText = `${originalNpcText}`; // Start with original

            // Check if the quest offer text has already been injected (e.g. if re-rendering same node without choice)
            // This simple check might not be robust enough if originalNpcText could naturally contain similar phrasing.
            if (!tempNpcText.includes(this.tempQuestOffer.displayName)) {
                tempNpcText = `${originalNpcText}<br><br><i>[${this.currentNpc.name} offers you a task:]</i><br><b>${this.tempQuestOffer.displayName}</b><br>${this.tempQuestOffer.description}`;
            }

            this.npcTextElement.innerHTML = tempNpcText.replace(/\n/g, '<br>');


            // Temporarily override choices for this render pass to show accept/decline
            this.playerChoicesElement.innerHTML = ''; // Clear existing choices from node definition for this render

            const acceptChoice = { text: "Accept Task", action: "accept_procedural_quest", questInstanceId: this.tempQuestOffer.questInstanceId, successNode: choice.successNodeOnAccept || "quest_accepted_generic", failureNode: choice.failureNodeOnAccept || "quest_accept_fail_generic" };
            const declineChoice = { text: "Decline Task", nextNode: choice.nextNodeOnDecline || node.playerChoices.find(c => c.text.toLowerCase().includes("decline"))?.nextNode || this.currentDialogueData.startNode };

            [acceptChoice, declineChoice].forEach((dynamicChoice, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<button data-choice-index="${index}" data-dynamic-choice="true" data-action="${dynamicChoice.action || ''}" data-quest-id="${dynamicChoice.questInstanceId || ''}" data-next-node="${dynamicChoice.nextNode || ''}" data-success-node="${dynamicChoice.successNode || ''}" data-failure-node="${dynamicChoice.failureNode || ''}">${index + 1}. ${dynamicChoice.text}</button>`;
                li.querySelector('button').addEventListener('click', (e) => {
                    // Since we are dynamically inserting, the choiceIndex is just 0 or 1 for these two.
                    // We need to pass the actual choice object or its relevant properties.
                    this.handlePlayerChoiceDynamic(dynamicChoice);
                });
                this.playerChoicesElement.appendChild(li);
            });

            // Clear the temporary offer AFTER preparing it for rendering.
            // The actual accept/decline choice will handle the next step.
            // This ensures that if the player cancels or the dialogue ends before choosing,
            // the temp offer isn't stuck.
            this.tempQuestOffer = null;
        }


        if (choice.triggersCombat && this.currentNpc) {
            logToConsole("Dialogue choice triggers combat!", "red");
            this.endDialogue(); // End dialogue before combat starts
            if (window.combatManager && typeof window.combatManager.startCombat === 'function') {
                // Make the NPC immediately hostile by adding player to their aggro list with high threat.
                if (!this.currentNpc.aggroList) {
                    this.currentNpc.aggroList = [];
                }
                // Remove existing player entry to avoid duplicates, then add with high threat
                this.currentNpc.aggroList = this.currentNpc.aggroList.filter(entry => entry.entityRef !== window.gameState);
                this.currentNpc.aggroList.unshift({ entityRef: window.gameState, threat: 1000 }); // Add to front with high threat

                logToConsole(`Added player to ${this.currentNpc.name}'s aggro list due to dialogue choice.`, "orange");

                // Optionally, ensure teamId makes them hostile if not already via faction relations.
                // For now, direct aggro is the primary mechanism.

                window.combatManager.startCombat([window.gameState, this.currentNpc]);
            } else {
                logToConsole("ERROR: combatManager not found or startCombat is not a function. Cannot trigger combat.", "red");
            }
            return; // Exit handling as combat has started
        }


        if (choice.endsConversation || !this.currentNodeId || !this.currentDialogueData.nodes[this.currentNodeId]) {
            this.endDialogue();
        } else {
            this.renderCurrentNode();
        }
    },

    endDialogue() {
        this.dialogueUI.classList.add('hidden');
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

// Initialize the dialogue manager when the script loads
// Ensure this runs after the DOM is ready if it directly manipulates UI elements not yet loaded.
// Using a DOMContentLoaded listener or placing script at end of body is typical.
// For now, assuming initialize will be called by main script setup.
// window.dialogueManager.initialize(); 
