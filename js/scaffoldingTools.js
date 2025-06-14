// js/scaffoldingTools.js

/**
 * Parses a simplified text format into a dialogue JSON object.
 *
 * Format Rules:
 * - First line must be `:: DialogueID`
 * - Node definition: `:: NODE_NAME` (or `:: START` for the first node explicitly)
 * - NPC line: `NPC: Some text here`
 * - Player choice: `- Choice text -> NEXT_NODE_ID`
 * - Player choice with END: `- Choice text -> END` (sets endsConversation: true)
 * - Conditions: Append to choice text, e.g., `- Choice (if flag:my_flag) -> NEXT_NODE`
 *   - Supported: `(if flag:flag_name)`, `(if !flag:flag_name)`
 *   - Supported: `(if questActive:quest_id)`, `(if !questActive:quest_id)`
 *   - Supported: `(if questCompleted:quest_id)`, `(if !questCompleted:quest_id)`
 * - Actions: Append to choice text (after condition, if any), e.g., `- Choice [setFlag:my_flag] -> NEXT_NODE`
 *   - Supported: `[setFlag:flag_name]`, `[setFlag:flag_name:value]`, `[clearFlag:flag_name]`
 *   - Supported: `[startQuest:quest_id]`
 *   - Multiple actions can be chained: e.g. `[setFlag:flag1][startQuest:quest2]`
 */
function parseSimpleDialogueText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')); // Ignore empty lines and comments
    const dialogue = { id: null, startNode: null, nodes: {} };
    let currentNodeName = null;
    let isFirstNodeDefinition = true;

    if (lines.length === 0) {
        console.error("Dialogue text is empty.");
        return null;
    }

    if (lines[0].startsWith(":: ")) {
        dialogue.id = lines[0].substring(3).trim();
        lines.shift();
    } else {
        console.error("Dialogue text must start with ':: DialogueID'");
        return null;
    }

    for (const line of lines) {
        if (line.startsWith(":: ")) {
            currentNodeName = line.substring(3).trim();
            if (isFirstNodeDefinition) {
                dialogue.startNode = currentNodeName;
                isFirstNodeDefinition = false;
            }
            dialogue.nodes[currentNodeName] = { id: currentNodeName, npcLines: [], playerChoices: [] };
        } else if (line.startsWith("NPC:")) {
            if (!currentNodeName) {
                console.warn("NPC line found outside a node definition:", line);
                continue;
            }
            dialogue.nodes[currentNodeName].npcLines.push(line.substring(4).trim());
        } else if (line.startsWith("-")) {
            if (!currentNodeName) {
                console.warn("Player choice found outside a node definition:", line);
                continue;
            }

            const choiceRegex = /-\s*(.*?)\s*(->\s*([A-Z0-9_]+))\s*$/;
            let remainingLine = line.substring(1).trim();

            const parts = remainingLine.split("->");
            if (parts.length < 2) {
                console.warn("Malformed choice line (missing '->'):", line);
                continue;
            }

            const nextNode = parts.pop().trim();
            let choiceTextAndExtras = parts.join("->").trim();

            const choiceObj = { text: "", nextNode: nextNode };

            // Extract actions first using a global regex
            const actionsRegex = /\[(.*?)\]/g;
            let match;
            choiceObj.actions = [];
            while((match = actionsRegex.exec(choiceTextAndExtras)) !== null) {
                const actionContent = match[1];
                const actionParts = actionContent.split(':');
                const actionType = actionParts[0];
                const actionParam = actionParts[1];
                const actionValue = actionParts[2];

                if (actionType === "setFlag") {
                    choiceObj.actions.push({ type: "setFlag", flag: actionParam, value: actionValue !== undefined ? (actionValue.toLowerCase() === 'true' || (actionValue.toLowerCase() !== 'false' && !!actionValue)) : true });
                } else if (actionType === "clearFlag") {
                     choiceObj.actions.push({ type: "clearFlag", flag: actionParam });
                } else if (actionType === "startQuest") {
                     choiceObj.actions.push({ type: "startQuest", questId: actionParam });
                }
                // Add more action types here
            }
            choiceTextAndExtras = choiceTextAndExtras.replace(actionsRegex, "").trim(); // Remove actions from string

            // Extract conditions
            const conditionRegex = /\((if\s+.*?)\)/;
            const conditionMatch = choiceTextAndExtras.match(conditionRegex);
            if (conditionMatch) {
                const conditionContent = conditionMatch[1].trim();
                if (conditionContent.startsWith("if flag:")) {
                    choiceObj.condition = { type: "flagSet", flag: conditionContent.substring(8).trim() };
                } else if (conditionContent.startsWith("if !flag:")) {
                    choiceObj.condition = { type: "flagNotSet", flag: conditionContent.substring(9).trim() };
                } else if (conditionContent.startsWith("if questActive:")) {
                    choiceObj.condition = { type: "questActive", questId: conditionContent.substring(15).trim() };
                } else if (conditionContent.startsWith("if !questActive:")) {
                    choiceObj.condition = { type: "questNotActive", questId: conditionContent.substring(16).trim() };
                } else if (conditionContent.startsWith("if questCompleted:")) {
                    choiceObj.condition = { type: "questCompleted", questId: conditionContent.substring(18).trim() };
                } else if (conditionContent.startsWith("if !questCompleted:")) {
                    choiceObj.condition = { type: "questNotCompleted", questId: conditionContent.substring(19).trim() };
                }
                // Add more condition types here
                choiceTextAndExtras = choiceTextAndExtras.replace(conditionRegex, "").trim();
            }

            choiceObj.text = choiceTextAndExtras.trim();
            if (!choiceObj.actions.length) delete choiceObj.actions;


            if (nextNode === "END") {
                choiceObj.endsConversation = true;
                delete choiceObj.nextNode;
            }
            dialogue.nodes[currentNodeName].playerChoices.push(choiceObj);
        }
    }

    if (!dialogue.startNode && Object.keys(dialogue.nodes).length > 0) {
        console.warn("No explicit start node (e.g. ':: START') found, defaulting to the first defined node:", Object.keys(dialogue.nodes)[0]);
        dialogue.startNode = Object.keys(dialogue.nodes)[0];
    } else if (dialogue.startNode && !dialogue.nodes[dialogue.startNode]) {
        console.error(`Specified startNode '${dialogue.startNode}' does not exist as a defined node.`);
        return null; // Or try to recover, e.g. pick first node
    }


    return dialogue;
}

/**
 * Generates a basic quest JSON object.
 */
function generateBasicQuestJson(id, title, giverNpcId, type = "Miscellaneous", objectivesConfig = [], rewardsConfig = [], startConditions = [], onCompletionActions = []) {
    if (!id || !title) {
        console.error("Quest ID and Title are required.");
        return null;
    }

    const quest = {
        id: id,
        title: title,
        description: `A ${type.toLowerCase()} quest given by ${giverNpcId || 'an unknown source'}.`,
        type: type,
        giverNpcId: giverNpcId || null,
        startConditions: startConditions,
        objectives: [],
        rewards: [],
        onCompletionActions: onCompletionActions,
        isRepeatable: false // Default, can be overridden
    };

    objectivesConfig.forEach((objConf, index) => {
        const objective = {
            id: objConf.id || `obj${index + 1}`,
            description: objConf.description || "Complete this objective.",
            type: objConf.type || "custom", // e.g., collect, kill, reach_location, talk_to_npc
            progressText: objConf.progressText || `${objConf.description}: {status}`,
            locationHint: objConf.locationHint || null
        };

        if (objConf.target) objective.target = objConf.target; // e.g., { npcTypeId: "goblin", count: 5 }
        if (objConf.itemToCollect) objective.itemToCollect = objConf.itemToCollect; // e.g., { itemId: "macguffin", count: 1 }
        if (objConf.targetNpcId) objective.targetNpcId = objConf.targetNpcId;
        if (objConf.targetLocation) objective.targetLocation = objConf.targetLocation;
        if (objConf.onCompletionActions) objective.onCompletionActions = objConf.onCompletionActions;


        quest.objectives.push(objective);
    });

    rewardsConfig.forEach(rewConf => {
        const reward = {
            type: rewConf.type || "experience", // e.g., experience, item, currency, factionReputation
        };
        if (rewConf.amount) reward.amount = rewConf.amount;
        if (rewConf.itemId) reward.itemId = rewConf.itemId;
        if (rewConf.quantity) reward.quantity = rewConf.quantity;
        if (rewConf.currencyId) reward.currencyId = rewConf.currencyId;
        if (rewConf.factionId) reward.factionId = rewConf.factionId;

        quest.rewards.push(reward);
    });

    return quest;
}


/*
// --- Example Usage ---

// --- Dialogue Scaffolding Example ---
const sampleDialogueText = `
:: SAMPLE_CONVO_01
# This is a comment and will be ignored.

:: START
NPC: Hello there, traveler! Welcome to our humble town.
- Who are you? -> WHO_ARE_YOU
- What is this place? (if flag:knows_town_name) -> ABOUT_PLACE
- Just passing through. [setFlag:player_is_passing_through] -> END

:: WHO_ARE_YOU
NPC: I am Barnaby, the local loremaster.
NPC: And you are...?
- I'm [PlayerName]. [setFlag:player_introduced] -> START
- Doesn't matter. -> START

:: ABOUT_PLACE
NPC: This is the town of Scaffoldingville.
- Nice place. (if !flag:player_is_passing_through) -> START
- I must go. -> END
`;

function testDialogueParser() {
    console.log("--- Testing Dialogue Parser ---");
    const dialogueResult = parseSimpleDialogueText(sampleDialogueText);
    console.log(JSON.stringify(dialogueResult, null, 2));

    const anotherSample = `
:: TEST_ACTIONS_CONDITIONS
:: NODE1
NPC: Choose wisely.
- Option 1 (if flag:can_choose_1) [setFlag:chose_1] -> NODE2
- Option 2 (if !flag:chose_1) [startQuest:some_quest][clearFlag:can_choose_1] -> NODE3
- Option 3 -> END
:: NODE2
NPC: You chose option 1.
- Back -> NODE1
:: NODE3
NPC: You chose option 2.
- Okay -> END
    `;
    const dialogueResult2 = parseSimpleDialogueText(anotherSample);
    console.log(JSON.stringify(dialogueResult2, null, 2));
}

// testDialogueParser(); // Uncomment to run test in browser console


// --- Quest Scaffolding Example ---

function testQuestGenerator() {
    console.log("--- Testing Quest Generator ---");
    const quest1Objectives = [
        {
            id: "kill_rats",
            description: "Exterminate the giant rats in the cellar.",
            type: "kill",
            target: { npcTypeId: "giant_rat_cellar", count: 5 },
            progressText: "Rats killed: {currentCount}/{targetCount}",
            locationHint: "The old wine cellar beneath the tavern."
        },
        {
            id: "report_to_innkeeper",
            description: "Report your success to the innkeeper.",
            type: "talk_to_npc",
            targetNpcId: "innkeeper_boris",
            onCompletionActions: [{type: "setFlag", flag: "rats_cleared_inn_cellar"}]
        }
    ];
    const quest1Rewards = [
        { type: "experience", amount: 100 },
        { type: "currency", currencyId: "silver_pieces", amount: 25 },
        { type: "item", itemId: "ale_coupon", quantity: 1 }
    ];
    const quest1StartConditions = [
        { type: "flagNotSet", flag: "rats_cleared_inn_cellar" }
    ];
    const quest1CompletionActions = [
        { type: "adjustFactionRep", factionId: "town_inn", amount: 10 }
    ];

    const sampleQuest1 = generateBasicQuestJson(
        "cellar_rat_extermination",
        "Cellar Rat Extermination",
        "innkeeper_boris",
        "Bounty",
        quest1Objectives,
        quest1Rewards,
        quest1StartConditions,
        quest1CompletionActions
    );
    console.log(JSON.stringify(sampleQuest1, null, 2));

    const sampleQuest2 = generateBasicQuestJson(
        "fetch_herbs_alchemist",
        "Herbal Remedy",
        "alchemist_elara",
        "Gathering",
        [
            {
                id: "gather_moonbloom",
                description: "Gather 3 Moonbloom flowers.",
                type: "collect",
                itemToCollect: { itemId: "moonbloom_flower", count: 3 },
                locationHint: "Moonbloom grows near ancient stones, often seen at night."
            }
        ],
        [
            { type: "experience", amount: 75 },
            { type: "item", itemId: "potion_minor_healing", quantity: 2 }
        ]
    );
    console.log(JSON.stringify(sampleQuest2, null, 2));
}

// testQuestGenerator(); // Uncomment to run test in browser console

*/
