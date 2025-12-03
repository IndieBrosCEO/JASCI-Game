// js/dialogueManager.js

class DialogueManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.currentDialogue = null;
        this.currentNodeKey = null;
        this.currentNpc = null;
        this.isActive = false;

        this.dialogueUI = document.getElementById('dialogueUI');
        this.dialogueText = document.getElementById('dialogueText'); // Renamed for clarity
        this.dialogueOptions = document.getElementById('dialogueOptions'); // Renamed for clarity
        this.speakerName = document.getElementById('speakerName');
        this.speakerPortraitImage = document.getElementById('speakerPortraitImage');
        this.speakerAsciiPortrait = document.getElementById('speakerAsciiPortrait');

        if (!this.dialogueUI || !this.dialogueText || !this.dialogueOptions || !this.speakerName || !this.speakerPortraitImage || !this.speakerAsciiPortrait) {
            console.error("Some dialogue UI elements not found in the DOM.");
        }
    }

    startDialogue(npc, startNodeKey = 'start') {
        if (!npc || !this.assetManager) {
            console.error("Cannot start dialogue: NPC or AssetManager is missing.", { npc, assetManager: this.assetManager });
            return;
        }

        const npcDef = this.assetManager.getNpc(npc.definitionId);
        if (!npcDef || !npcDef.dialogueFile) {
            console.warn(`NPC ${npc.name} (${npc.definitionId}) has no dialogue file specified.`);
            // Optional: Fallback to a generic greeting
            this.showSimpleMessage(npc.name, "I have nothing to say to you right now.");
            return;
        }

        const dialogueData = this.assetManager.getDialogue(npcDef.dialogueFile);
        if (!dialogueData) {
            console.error(`Dialogue file ${npcDef.dialogueFile} not found or failed to load.`);
            this.showSimpleMessage(npc.name, "[Dialogue File Not Found]");
            return;
        }

        this.currentDialogue = dialogueData;
        this.currentNpc = npc;
        this.isActive = true;
        this.gameState.isDialogueActive = true; // Let other systems know

        this.dialogueUI.classList.remove('hidden');
        this.displayNode(startNodeKey);
    }

    displayNode(nodeKey) {
        this.currentNodeKey = nodeKey;
        const node = this.currentDialogue[nodeKey];

        if (!node) {
            console.error(`Dialogue node "${nodeKey}" not found in the current dialogue file.`);
            this.endDialogue();
            return;
        }

        if (node.actions) {
            this.executeActions(node.actions);
        }

        this.updateSpeakerDisplay();

        this.dialogueText.innerHTML = this.parseText(node.text);
        this.dialogueOptions.innerHTML = '';

        if (node.choices && node.choices.length > 0) {
            node.choices.forEach(choice => {
                if (this.evaluateCondition(choice.condition)) {
                    const li = document.createElement('li');
                    li.textContent = `> ${this.parseText(choice.text)}`;
                    li.onclick = () => this.selectChoice(choice);
                    this.dialogueOptions.appendChild(li);
                }
            });
        } else {
            // If there are no choices, it's either a monologue leading to another node or the end.
            if (node.next) {
                // Automatically go to the next node after a short delay (or a click)
                const li = document.createElement('li');
                li.textContent = "[Continue]";
                li.onclick = () => this.displayNode(node.next);
                this.dialogueOptions.appendChild(li);
            } else {
                const li = document.createElement('li');
                li.textContent = "[End Conversation]";
                li.onclick = () => this.endDialogue();
                this.dialogueOptions.appendChild(li);
            }
        }
    }

    selectChoice(choice) {
        // TODO: Implement actions
        // if (choice.actions) {
        //     this.executeActions(choice.actions);
        // }

        if (choice.goTo) {
            this.displayNode(choice.goTo);
        } else {
            this.endDialogue();
        }
    }

    endDialogue() {
        this.isActive = false;
        this.gameState.isDialogueActive = false;
        this.currentDialogue = null;
        this.currentNpc = null;
        this.currentNodeKey = null;

        this.dialogueUI.classList.add('hidden');
    }

    parseText(text) {
        if (!text) return "";
        let parsedText = text.replace(/{playerName}/g, this.gameState.player.name || "Adventurer");
        if (this.currentNpc) {
            parsedText = parsedText.replace(/{npcName}/g, this.currentNpc.name);
        }
        return parsedText;
    }

    showSimpleMessage(title, message) {
        this.dialogueUI.classList.remove('hidden');
        this.speakerName.textContent = title;
        this.speakerPortraitImage.style.display = 'none';
        this.speakerAsciiPortrait.style.display = 'none';
        this.dialogueText.innerHTML = message;
        this.dialogueOptions.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = "[Close]";
        li.onclick = () => this.dialogueUI.classList.add('hidden');
        this.dialogueOptions.appendChild(li);
    }

    updateSpeakerDisplay() {
        if (!this.currentNpc) return;

        const npcDef = this.assetManager.getNpc(this.currentNpc.definitionId);
        this.speakerName.textContent = this.currentNpc.name;

        if (npcDef.portraitHeadUrl) {
            this.speakerPortraitImage.src = npcDef.portraitHeadUrl;
            this.speakerPortraitImage.style.display = 'block';
            this.speakerAsciiPortrait.style.display = 'none';
        } else if (npcDef.asciiPortrait) {
            this.speakerAsciiPortrait.innerHTML = npcDef.asciiPortrait;
            this.speakerAsciiPortrait.style.display = 'block';
            this.speakerPortraitImage.style.display = 'none';
        } else {
            // Fallback for player or NPCs without portraits
            this.speakerPortraitImage.style.display = 'none';
            this.speakerAsciiPortrait.style.display = 'none';
        }
    }

    evaluateCondition(condition) {
        if (!condition) {
            return true; // No condition means the choice is always available.
        }

        if (condition.type === 'skillCheck' && condition.expression) {
            // E.g., "skill:Charisma>10"
            const parts = condition.expression.match(/(\w+):(\w+)([><=]+)(\d+)/);
            if (!parts) {
                console.warn(`Invalid condition expression: ${condition.expression}`);
                return true; // Default to true if expression is malformed
            }

            const [, type, statName, operator, valueStr] = parts;
            const value = parseInt(valueStr, 10);
            let playerValue;

            if (type === 'skill') {
                playerValue = this.gameState.player.skills[statName] || 0;
            } else if (type === 'stat') {
                playerValue = this.gameState.player.stats[statName] || 0;
            } else {
                console.warn(`Unknown condition type: ${type}`);
                return true;
            }

            switch (operator) {
                case '>': return playerValue > value;
                case '<': return playerValue < value;
                case '>=': return playerValue >= value;
                case '<=': return playerValue <= value;
                case '==': return playerValue == value;
                case '=': return playerValue == value;
                default:
                    console.warn(`Unsupported operator in condition: ${operator}`);
                    return true;
            }
        }

        // Add other condition types here (e.g., item check, quest status)

        return true; // Default to true if condition type is unknown
    }

    executeActions(actions) {
        if (!actions) return;

        actions.forEach(actionString => {
            const [action, ...args] = actionString.split(':');
            const params = args.length > 0 ? args.join(':').split(',') : [];

            switch (action) {
                case 'giveItem':
                    if (params.length === 2) {
                        const itemId = params[0];
                        const quantity = parseInt(params[1], 10);
                        // Assuming you have a global inventoryManager
                        if (window.inventoryManager) {
                            window.inventoryManager.addItem(itemId, quantity);
                            console.log(`Gave player ${quantity} of ${itemId}`);
                        } else {
                            console.warn("inventoryManager not found, cannot give item.");
                        }
                    } else {
                        console.warn(`Invalid giveItem action format: ${actionString}`);
                    }
                    break;
                case 'startCombat':
                    console.log("startCombat action triggered");
                    if (this.currentNpc && window.combatManager) {
                        this.endDialogue(); // End dialogue before starting combat
                        window.combatManager.startCombat([this.gameState, this.currentNpc]);
                    } else {
                        console.warn("Cannot start combat: currentNpc or combatManager is missing.");
                    }
                    break;
                case 'startQuest':
                    if (params.length === 1 && window.questManager) {
                        window.questManager.startQuest(params[0]);
                    }
                    break;
                case 'completeQuest':
                    if (params.length === 1 && window.questManager) {
                        window.questManager.completeQuest(params[0]);
                    }
                    break;
                case 'advanceQuest':
                    // advanceQuest:questId:type:target:amount
                    // e.g., advanceQuest:sample_quest:talk:npc_guide:1
                    // params would be [questId, type, target, amount]
                    if (params.length >= 3 && window.questManager) {
                        const qId = params[0];
                        const qType = params[1];
                        const qTarget = params[2];
                        const qAmt = params.length > 3 ? parseInt(params[3]) : 1;
                        window.questManager.updateObjective(qType, qTarget, qAmt);
                    }
                    break;
                // Add more actions here
                default:
                    console.warn(`Unknown dialogue action: ${action}`);
            }
        });
    }
}

// This makes the DialogueManager globally available.
// In script.js, we will create an instance and assign it to window.dialogueManager.
