document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Getters ---
    // ... (All existing getters from previous steps) ...
    const loadManifestButton = document.getElementById('loadManifestButton'); // etc.
    const errorMessagesDiv = document.getElementById('errorMessages');
    // Dialogue Editor specific for this task
    const dialogueEditorSection = document.getElementById('dialogueEditorSection');
    const toggleVisualDialogueEditorButton = document.getElementById('toggleVisualDialogueEditorButton');
    const visualDialogueEditorPlaceholderDiv = document.getElementById('visualDialogueEditorPlaceholder');
    const textualDialogueEditorControlsDiv = document.getElementById('textualDialogueEditorControls');
    // (other dialogue elements like dialogueNodesList, addNewDialogueNodeButton, dialogueNodeEditArea are already defined)


    // --- State Variables ---
    // ... (All state variables as previously defined) ...
    let currentManifestPath = null;
    let currentCampaignRoot = null;
    let currentNpcFilePathFull = null;
    let currentNpcs = [];
    let npcTemplates = {};
    let currentDialogueDirectory = '';
    let currentDialogueFiles = [];
    let currentlyEditingDialogueFilePath = null;
    let currentDialogueData = null;
    let originalDialogueDataBeforeEdit = null;
    let currentlyEditingNodeId = null;
    let currentQuestsFilePath = '';
    let currentQuests = [];
    let originalQuestDataBeforeEdit = null;
    let currentZonesFilePath = '';
    let currentZones = [];
    let originalZoneDataBeforeEdit = null;
    let currentWorldMapFilePath = '';
    let currentWorldMapData = null;
    let originalWorldMapNodeDataBeforeEdit = null;
    let currentSchedulesFilePath = '';
    let currentSchedulesData = {};
    let currentlyEditingScheduleId = null;
    let originalSchedulesDataBeforeEdit = null;
    let currentRandomEncountersFilePath = '';
    let currentRandomEncounters = [];
    let originalRandomEncounterDataBeforeEdit = null;
    let currentStoryBeatsFilePath = '';
    let currentStoryBeatsData = {};
    let originalStoryBeatsDataForSaveAttempt = null;


    // --- Initial Data Loading ---
    async function loadInitialData() { await loadNpcTemplates(); }
    async function loadNpcTemplates() { /* ... as before ... */ }

    // --- Manifest Loading ---
    loadManifestButton.addEventListener('click', async () => { /* ... as before ... */ });
    function populateManifestUI(data) { /* ... as before ... */ }

    // --- NPC Data & Functions ---
    // ... (All NPC functions as before, ensuring hideAll forms includes new ones) ...
    function handleEditNpc(event) { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ }
    document.getElementById('showCreateNpcFormButton').addEventListener('click', () => { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ });
    async function loadNpcData(npcFilePathRelative) { /* ... */ } function renderNpcList() { /* ... */ } async function saveNpcsToFile() { /* ... */ }


    // --- Dialogue Files & Node Editor ---
    function hideAllDialogueForms() {
        document.getElementById('createDialogueFileForm').style.display = 'none';
        dialogueEditorSection.style.display = 'none'; // Hides the whole editor including toggle button initially
        textualDialogueEditorControlsDiv.style.display = 'none'; // Hide textual controls
        visualDialogueEditorPlaceholderDiv.style.display = 'none'; // Hide visual placeholder
        document.getElementById('dialogueNodeEditArea').style.display = 'none';
        originalDialogueDataBeforeEdit = null;
        currentlyEditingNodeId = null;
        toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
    }

    document.getElementById('showCreateDialogueFileFormButton').addEventListener('click', () => {
        if (!currentDialogueDirectory) {
            displayError("Dialogue directory not set. Load a campaign manifest with a dialogue path.");
            return;
        }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        document.getElementById('newDialogueFileName').value = '';
        document.getElementById('newDialogueId').value = '';
        document.getElementById('createDialogueFileForm').style.display = 'block';
        clearErrorMessages();
    });
    document.getElementById('cancelCreateDialogueFileButton').addEventListener('click', () => { hideAllDialogueForms(); });
    document.getElementById('saveNewDialogueFileButton').addEventListener('click', async () => { /* ... */ });
    async function loadDialogueFiles() { /* ... */ }
    function renderDialogueFilesList() { /* ... (Ensure file names are clickable to call loadDialogueFileContent) ... */ }

    async function loadDialogueFileContent(fileName) {
        hideAllDialogueForms();
        hideAllNpcForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();

        currentlyEditingDialogueFilePath = currentDialogueDirectory + fileName;
        editingDialogueFileNameSpan.textContent = fileName;
        clearErrorMessages();

        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentlyEditingDialogueFilePath)}`);
            // ... (rest of fetch and error handling as before) ...
            if (!response.ok) { /* ... */ throw new Error(/* ... */); }
            currentDialogueData = await response.json();
            if (!currentDialogueData.nodes) currentDialogueData.nodes = {};
            if (!currentDialogueData.id) currentDialogueData.id = "";
            if (!currentDialogueData.startingNode) currentDialogueData.startingNode = "";

            originalDialogueDataBeforeEdit = JSON.parse(JSON.stringify(currentDialogueData));

            dialogueMetaIdInput.value = currentDialogueData.id;
            dialogueMetaStartingNodeInput.value = currentDialogueData.startingNode;

            renderSelectableDialogueNodesList();

            dialogueEditorSection.style.display = 'block'; // Show the main dialogue editor section
            textualDialogueEditorControlsDiv.style.display = 'block'; // Show textual controls by default
            visualDialogueEditorPlaceholderDiv.style.display = 'none'; // Ensure visual is hidden
            toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
            dialogueNodeEditArea.style.display = 'none';

        } catch (error) { /* ... (error handling as before, ensure clearDialogueEditorFieldsAndState is called) ... */ }
    }

    function renderSelectableDialogueNodesList() { /* ... as before ... */ }
    function selectDialogueNodeForEditing(nodeId) { /* ... as before, but ensure textualDialogueEditorControlsDiv is visible if a node is selected */
        if (!currentDialogueData || !currentDialogueData.nodes || !currentDialogueData.nodes[nodeId]) {
            displayError(`Node ${nodeId} not found.`);
            dialogueNodeEditArea.style.display = 'none';
            currentlyEditingNodeId = null;
            renderSelectableDialogueNodesList();
            return;
        }
        currentlyEditingNodeId = nodeId;
        const node = currentDialogueData.nodes[nodeId];

        editingNodeIdDisplay.textContent = nodeId;
        nodeNpcLineInput.value = node.npcLine || '';
        if (!node.choices) node.choices = [];
        renderNodePlayerChoicesList(node.choices);

        textualDialogueEditorControlsDiv.style.display = 'block'; // Ensure this is visible
        visualDialogueEditorPlaceholderDiv.style.display = 'none'; // Ensure visual is hidden
        toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
        dialogueNodeEditArea.style.display = 'block';
        renderSelectableDialogueNodesList();
    }

    function parseFlagsString(flagsString) { /* ... */ }
    function formatFlagsArray(flagsArray) { /* ... */ }
    function renderNodePlayerChoicesList(choicesArray) { /* ... */ }

    nodeNpcLineInput.addEventListener('change', (event) => { /* ... */ });
    nodePlayerChoicesList.addEventListener('change', (event) => { /* ... */ });
    addNewChoiceToNodeButton.addEventListener('click', () => { /* ... */ });
    function removeChoiceFromCurrentNode(index) { /* ... */ }
    addNewDialogueNodeButton.addEventListener('click', () => { /* ... */ });
    deleteCurrentNodeButton.addEventListener('click', () => { /* ... */ });
    saveDialogueChangesButton.addEventListener('click', async () => { /* ... */ });
    async function handleDeleteDialogueFile(event) { /* ... */ }
    refreshDialogueListButton.addEventListener('click', loadDialogueFiles);

    toggleVisualDialogueEditorButton.addEventListener('click', () => {
        if (visualDialogueEditorPlaceholderDiv.style.display === 'none') {
            visualDialogueEditorPlaceholderDiv.style.display = 'block';
            textualDialogueEditorControlsDiv.style.display = 'none';
            toggleVisualDialogueEditorButton.textContent = "Show Textual Editor";
        } else {
            visualDialogueEditorPlaceholderDiv.style.display = 'none';
            if (currentDialogueData) { // Only show textual controls if a dialogue is loaded
                textualDialogueEditorControlsDiv.style.display = 'block';
                // If a node was being edited, it remains visible. If not, dialogueNodeEditArea remains hidden.
            } else {
                textualDialogueEditorControlsDiv.style.display = 'none';
            }
            toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
        }
    });


    // --- Quests & Objectives ---
    // ... (All Quest functions as before, ensuring hideAll forms includes new ones) ...
    function handleEditQuest(questId) { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ }
    document.getElementById('showCreateQuestFormButton').addEventListener('click', () => { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ });
    document.getElementById('addNewQuestObjectiveRowButton').addEventListener('click', () => { /* ... */ });
    async function loadQuestsData() { /* ... */ } function renderQuestsList() { /* ... */ } async function saveQuestsToFile() { /* ... */ } function renderQuestObjectives(quest) { /* ... */ }

    // --- Zones ---
    // ... (All Zone functions as before, ensuring hideAll forms includes new ones) ...
    function handleEditZone(zoneId) { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ }
    document.getElementById('showCreateZoneFormButton').addEventListener('click', () => { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ });
    async function loadZonesData() { /* ... */ } function renderZonesList() { /* ... */ } async function saveZonesToFile() { /* ... */ }

    // --- World Map Nodes ---
    // ... (All World Map functions as before, ensuring hideAll forms includes new ones) ...
    function handleEditWorldMapNode(nodeId) { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ }
    document.getElementById('showCreateWorldMapNodeFormButton').addEventListener('click', () => { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ });
    async function loadWorldMapData() { /* ... */ } function renderWorldMapNodesList() { /* ... */ } async function saveWorldMapDataToFile() { /* ... */ }

    // --- Schedules ---
    // ... (All Schedule functions as before, ensuring hideAll forms includes new ones) ...
    function handleEditScheduleEntries(scheduleId) { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ }
    document.getElementById('showCreateScheduleIdFormButton').addEventListener('click', () => { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ });
    async function loadSchedulesData() { /* ... */ } function renderScheduleIdsList() { /* ... */ } async function saveSchedulesDataToFile() { /* ... */ } function renderScheduleEntriesList() { /* ... */ } function handleRemoveScheduleEntry(index) { /* ... */ }

    // --- Random Encounters ---
    // ... (All Random Encounter functions as before, ensuring hideAll forms includes new ones) ...
    function handleEditRandomEncounter(encounterId) { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ }
    document.getElementById('showCreateRandomEncounterFormButton').addEventListener('click', () => { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ });
    async function loadRandomEncountersData() { /* ... */ } function renderRandomEncountersList() { /* ... */ } async function saveRandomEncountersToFile() { /* ... */ }

    // --- Story Beats ---
    // ... (All Story Beat functions as before, ensuring hideAll forms includes new ones) ...
    document.getElementById('showCreateStoryBeatFormButton').addEventListener('click', () => { /* ... */ hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); /* ... */ });
    async function loadStoryBeatsData() { /* ... */ } function renderStoryBeatsTable() { /* ... */ } async function saveStoryBeatsDataToFile() { /* ... */ } async function handleDeleteStoryBeat(event) { /* ... */ }


    // --- Manifest Saving ---
    saveManifestButton.addEventListener('click', async () => { /* ... */ });
    function gatherManifestDataFromUI() { /* ... */ }

    // --- Utility and Cleanup Functions ---
    // ... (All hideAll... and clear...Detail functions as before, ensure new ones are called in resetCurrentPathsAndData) ...
    function hideAllNpcForms() { /* ... */ } function clearManifestDetails() { /* ... */ } function clearNpcDetailsInternal() { /* ... */ } function clearNpcDetails() { /* ... */ }
    function clearDialogueEditorFieldsAndState() {
        // dialogueEditorSection itself is hidden by hideAllDialogueForms
        editingDialogueFileNameSpan.textContent = '';
        dialogueMetaIdInput.value = '';
        dialogueMetaStartingNodeInput.value = '';

        dialogueNodeEditArea.style.display = 'none';
        editingNodeIdDisplay.textContent = '';
        nodeNpcLineInput.value = '';
        nodePlayerChoicesList.innerHTML = '';
        dialogueNodesList.innerHTML = '';

        currentDialogueData = null;
        currentlyEditingDialogueFilePath = null;
        originalDialogueDataBeforeEdit = null;
        currentlyEditingNodeId = null;
    }
    function clearDialogueDetails() {
        currentDialogueDirectory = '';
        currentDialogueFiles = [];
        document.getElementById('dialogueDirectoryDisplay').value = '';
        hideAllDialogueForms(); // This will call clearDialogueEditorFieldsAndState
        renderDialogueFilesList();
        dialogueNodesList.innerHTML = ''; // Explicitly clear selectable nodes list too
    }
    function clearQuestDetails() { /* ... */ } function clearZoneDetails() { /* ... */ } function clearWorldMapDetails() { /* ... */ } function clearScheduleDetails() { /* ... */ } function clearRandomEncounterDetails() { /* ... */ } function clearStoryBeatDetails() { /* ... */ }
    function hideAllQuestForms() { /* ... */ } function hideAllZoneForms() { /* ... */ } function hideAllWorldMapForms() { /* ... */ } function hideAllScheduleForms() { /* ... */ } function hideAllRandomEncounterForms() { /* ... */ } function hideAllStoryBeatForms() { /* ... */ }

    function resetCurrentPathsAndData() { /* ... (Call all clear...Details functions) ... */ }
    function displayError(message) { errorMessagesDiv.textContent = message; errorMessagesDiv.style.color = 'red'; }
    function displayMessage(message) { errorMessagesDiv.textContent = message; errorMessagesDiv.style.color = 'green'; }
    function clearErrorMessages() { errorMessagesDiv.textContent = ''; }

    // --- Initial setup ---
    loadInitialData().then(() => { /* ... (Call all render and hide functions) ... */ });
    console.log("app.js loaded");

    // UI Enhancement Event Listeners (Browse, Search)
    document.querySelectorAll('.browse-button').forEach(button => { /* ... */ });
    document.querySelectorAll('.search-input').forEach(input => { /* ... */ });
});
