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
        this.dialogueNPCText = document.getElementById('dialogueNPCText');
        this.dialoguePlayerChoices = document.getElementById('dialoguePlayerChoices');

        if (!this.dialogueUI || !this.dialogueNPCText || !this.dialoguePlayerChoices) {
            console.error("Dialogue UI elements not found in the DOM.");
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

        this.dialogueNPCText.innerHTML = this.parseText(node.text);
        this.dialoguePlayerChoices.innerHTML = '';

        if (node.choices && node.choices.length > 0) {
            node.choices.forEach(choice => {
                // TODO: Implement condition checking
                // if (this.evaluateConditions(choice.conditions)) {
                const li = document.createElement('li');
                li.textContent = this.parseText(choice.text);
                li.onclick = () => this.selectChoice(choice);
                this.dialoguePlayerChoices.appendChild(li);
                // }
            });
        } else {
            // If there are no choices, it's either a monologue leading to another node or the end.
            if (node.next) {
                // Automatically go to the next node after a short delay (or a click)
                 const li = document.createElement('li');
                 li.textContent = "[Continue]";
                 li.onclick = () => this.displayNode(node.next);
                 this.dialoguePlayerChoices.appendChild(li);
            } else {
                 const li = document.createElement('li');
                 li.textContent = "[End Conversation]";
                 li.onclick = () => this.endDialogue();
                 this.dialoguePlayerChoices.appendChild(li);
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
        this.dialogueNPCText.innerHTML = `<strong>${title}:</strong> ${message}`;
        this.dialoguePlayerChoices.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = "[Close]";
        li.onclick = () => this.dialogueUI.classList.add('hidden');
        this.dialoguePlayerChoices.appendChild(li);
    }

    // TODO: Stubs for more advanced features
    // evaluateConditions(conditions) { return true; }
    // executeActions(actions) { }
}

// This makes the DialogueManager globally available.
// In script.js, we will create an instance and assign it to window.dialogueManager.
