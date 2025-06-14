class DialogueManager {
    constructor(campaignMgr, globalStateMgrInstance) {
        this.campaignManager = campaignMgr;
        this.globalStateManager = globalStateMgrInstance;
        this.currentDialogue = null;
        this.currentNode = null;
        this.currentNpcContext = null; // Added
        this.onConversationEnd = null; // Callback when conversation ends
    }

    startConversation(dialogueId, onEndCallback, npcContext = null) {
        if (!this.campaignManager) {
            console.error("DialogueManager: CampaignManager not available.");
            return false;
        }
        if (!this.globalStateManager) {
            console.error("DialogueManager: GlobalStateManager not available.");
            return false;
        }
        const dialogueData = this.campaignManager.getDialogueData(dialogueId);
        if (!dialogueData) {
            console.error(`DialogueManager: Dialogue data for '${dialogueId}' not found.`);
            return false;
        }

        this.currentDialogue = dialogueData;
        this.currentNode = dialogueData.nodes[dialogueData.startNode];
        this.currentNpcContext = npcContext;
        this.onConversationEnd = onEndCallback;
        console.log(`Conversation started with '${dialogueId}', at node '${dialogueData.startNode}'. NPC Context:`, npcContext);
        return this.getCurrentDialogueState();
    }

    getCurrentDialogueState() {
        if (!this.currentNode) return null;

        const availableChoices = (this.currentNode.playerChoices || []).filter(choice => {
            if (choice.condition) {
                if (!this.globalStateManager.evaluateCondition(choice.condition)) {
                    console.log(`DialogueManager: Condition not met for choice '${choice.text}':`, choice.condition);
                    return false; // Condition not met, choice not available
                }
            }
            return true; // Choice is available
        });

        return {
            npcLines: this.currentNode.npcLines || [],
            playerChoices: availableChoices.map(choice => ({ text: choice.text, choiceId: choice.nextNode })), // choiceId simplifies selection
            endsConversation: !!this.currentNode.endsConversation
        };
    }

    makeChoice(choiceId_nextNode) {
        if (!this.currentDialogue || !this.currentNode) {
            console.error("DialogueManager: No active conversation or node.");
            return null;
        }

        const choiceMade = (this.currentNode.playerChoices || []).find(c => c.nextNode === choiceId_nextNode);

        if (choiceMade && choiceMade.actions) {
            choiceMade.actions.forEach(action => {
                this.globalStateManager.processAction(action, this.currentDialogue.id);
            });
        }

        if (this.currentNode.endsConversation || (choiceMade && choiceMade.nextNode && this.currentDialogue.nodes[choiceMade.nextNode]?.endsConversation)) {
            this.endConversation();
            return null; // Conversation ended
        }

        if (choiceMade && choiceMade.nextNode && this.currentDialogue.nodes[choiceMade.nextNode]) {
            this.currentNode = this.currentDialogue.nodes[choiceMade.nextNode];
        } else if (choiceMade && choiceMade.nextNode) { // choice implies next node but it's missing
             console.warn(`DialogueManager: Next node '${choiceMade.nextNode}' not found for choice '${choiceMade.text}'. Ending conversation.`);
             this.endConversation();
             return null;
        } else { // No valid choice or path from current node, or implicit end
            this.endConversation();
            return null;
        }

        return this.getCurrentDialogueState();
    }

    endConversation() {
        console.log(`Conversation ended with '${this.currentDialogue?.id}'.`);
        this.currentDialogue = null;
        this.currentNode = null;
        if (this.onConversationEnd) {
            this.onConversationEnd();
            this.onConversationEnd = null;
        }
    }
}

// Make it a singleton or provide a global instance
// For now, assuming it's created and passed CampaignManager when needed.
// const dialogueManager = new DialogueManager(campaignManager); // If campaignManager is global
