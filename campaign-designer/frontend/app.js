document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Getters ---
    const loadManifestButton = document.getElementById('loadManifestButton');
    const fileUploader = document.getElementById('fileUploader');
    const exportCampaignButton = document.getElementById('exportCampaignButton'); // Added this line

    const campaignIdInput = document.getElementById('campaignId');
    const campaignNameInput = document.getElementById('campaignName');
    // ... (rest of DOM getters remain the same)
    const campaignVersionInput = document.getElementById('campaignVersion');
    const campaignDescriptionInput = document.getElementById('campaignDescription');
    const campaignAuthorInput = document.getElementById('campaignAuthor');
    const errorMessagesDiv = document.getElementById('errorMessages');

    const npcList = document.getElementById('npcList');
    const showCreateNpcFormButton = document.getElementById('showCreateNpcFormButton');
    const createNpcForm = document.getElementById('createNpcForm');
    const createNpcIdInput = document.getElementById('createNpcId');
    const createNpcNameInput = document.getElementById('createNpcName');
    const saveNewNpcButton = document.getElementById('saveNewNpcButton');
    const cancelCreateNpcButton = document.getElementById('cancelCreateNpcButton');
    const editNpcForm = document.getElementById('editNpcForm');
    const editingNpcOriginalIdInput = document.getElementById('editingNpcOriginalId');
    const editNpcIdInput = document.getElementById('editNpcId');
    const editNpcNameInput = document.getElementById('editNpcName');
    const editNpcTemplateIdInput = document.getElementById('editNpcTemplateId');
    const saveNpcChangesButton = document.getElementById('saveNpcChangesButton');
    const cancelEditNpcButton = document.getElementById('cancelEditNpcButton');
    const deleteNpcButton = document.getElementById('deleteNpcButton');
    const duplicateNpcButton = document.getElementById('duplicateNpcButton');

    const dialogueDirectoryDisplay = document.getElementById('dialogueDirectoryDisplay');
    const refreshDialogueListButton = document.getElementById('refreshDialogueListButton');
    const dialogueFilesList = document.getElementById('dialogueFilesList');
    const showCreateDialogueFileFormButton = document.getElementById('showCreateDialogueFileFormButton');
    const createDialogueFileForm = document.getElementById('createDialogueFileForm');
    const newDialogueFileNameInput = document.getElementById('newDialogueFileName');
    const newDialogueIdInput = document.getElementById('newDialogueId');
    const saveNewDialogueFileButton = document.getElementById('saveNewDialogueFileButton');
    const cancelCreateDialogueFileButton = document.getElementById('cancelCreateDialogueFileButton');
    const dialogueEditorSection = document.getElementById('dialogueEditorSection');
    const editingDialogueFileNameSpan = document.getElementById('editingDialogueFileName');
    const dialogueMetaIdInput = document.getElementById('dialogueMetaId');
    const dialogueMetaStartingNodeInput = document.getElementById('dialogueMetaStartingNode');
    const saveDialogueChangesButton = document.getElementById('saveDialogueChangesButton');
    const toggleVisualDialogueEditorButton = document.getElementById('toggleVisualDialogueEditorButton');
    const visualDialogueEditorPlaceholderDiv = document.getElementById('visualDialogueEditorPlaceholder');
    const textualDialogueEditorControlsDiv = document.getElementById('textualDialogueEditorControls');
    const dialogueNodesList = document.getElementById('dialogueNodesList');
    const addNewDialogueNodeButton = document.getElementById('addNewDialogueNodeButton');
    const dialogueNodeEditArea = document.getElementById('dialogueNodeEditArea');
    const editingNodeIdDisplay = document.getElementById('editingNodeIdDisplay');
    const nodeNpcLineTextArea = document.getElementById('nodeNpcLine');
    const nodePlayerChoicesList = document.getElementById('nodePlayerChoicesList');
    const addNewChoiceToNodeButton = document.getElementById('addNewChoiceToNodeButton');
    const deleteCurrentNodeButton = document.getElementById('deleteCurrentNodeButton');

    const questsFileDisplay = document.getElementById('questsFileDisplay');
    const questsList = document.getElementById('questsList');
    const showCreateQuestFormButton = document.getElementById('showCreateQuestFormButton');
    const createQuestForm = document.getElementById('createQuestForm');
    const newQuestIdInput = document.getElementById('newQuestId');
    const newQuestTitleInput = document.getElementById('newQuestTitle');
    const newQuestDescriptionInput = document.getElementById('newQuestDescription');
    const saveNewQuestButton = document.getElementById('saveNewQuestButton');
    const cancelCreateQuestButton = document.getElementById('cancelCreateQuestButton');
    const editQuestForm = document.getElementById('editQuestForm');
    const editingQuestOriginalIdInput = document.getElementById('editingQuestOriginalId');
    const editQuestIdInput = document.getElementById('editQuestId');
    const editQuestTitleInput = document.getElementById('editQuestTitle');
    const editQuestDescriptionInput = document.getElementById('editQuestDescription');
    const saveQuestChangesButton = document.getElementById('saveQuestChangesButton');
    const cancelEditQuestButton = document.getElementById('cancelEditQuestButton');
    const deleteQuestButton = document.getElementById('deleteQuestButton');
    const questObjectivesList = document.getElementById('questObjectivesList');
    const addNewQuestObjectiveRowButton = document.getElementById('addNewQuestObjectiveRowButton');

    const zonesFileDisplay = document.getElementById('zonesFileDisplay');
    const zonesList = document.getElementById('zonesList');
    const showCreateZoneFormButton = document.getElementById('showCreateZoneFormButton');
    const createZoneForm = document.getElementById('createZoneForm');
    const newZoneIdInput = document.getElementById('newZoneId');
    const newZoneNameInput = document.getElementById('newZoneName');
    const newZoneMapFilePathInput = document.getElementById('newZoneMapFilePath');
    const saveNewZoneButton = document.getElementById('saveNewZoneButton');
    const cancelCreateZoneButton = document.getElementById('cancelCreateZoneButton');
    const editZoneForm = document.getElementById('editZoneForm');
    const editingZoneOriginalIdInput = document.getElementById('editingZoneOriginalId');
    const editZoneIdInput = document.getElementById('editZoneId');
    const editZoneNameInput = document.getElementById('editZoneName');
    const editZoneMapFilePathInput = document.getElementById('editZoneMapFilePath');
    const saveZoneChangesButton = document.getElementById('saveZoneChangesButton');
    const deleteZoneButton = document.getElementById('deleteZoneButton');
    const cancelEditZoneButton = document.getElementById('cancelEditZoneButton');

    const worldMapFileDisplay = document.getElementById('worldMapFileDisplay');
    const worldMapNodesList = document.getElementById('worldMapNodesList');
    const showCreateWorldMapNodeFormButton = document.getElementById('showCreateWorldMapNodeFormButton');
    const createWorldMapNodeForm = document.getElementById('createWorldMapNodeForm');
    const newWorldMapNodeIdInput = document.getElementById('newWorldMapNodeId');
    const newWorldMapNodeNameInput = document.getElementById('newWorldMapNodeName');
    const newWorldMapNodeZoneIdInput = document.getElementById('newWorldMapNodeZoneId');
    const saveNewWorldMapNodeButton = document.getElementById('saveNewWorldMapNodeButton');
    const cancelCreateWorldMapNodeButton = document.getElementById('cancelCreateWorldMapNodeButton');
    const editWorldMapNodeForm = document.getElementById('editWorldMapNodeForm');
    const editingWorldMapNodeOriginalIdInput = document.getElementById('editingWorldMapNodeOriginalId');
    const editWorldMapNodeIdInput = document.getElementById('editWorldMapNodeId');
    const editWorldMapNodeNameInput = document.getElementById('editWorldMapNodeName');
    const editWorldMapNodeZoneIdInput = document.getElementById('editWorldMapNodeZoneId');
    const saveWorldMapNodeChangesButton = document.getElementById('saveWorldMapNodeChangesButton');
    const deleteWorldMapNodeButton = document.getElementById('deleteWorldMapNodeButton');
    const cancelEditWorldMapNodeButton = document.getElementById('cancelEditWorldMapNodeButton');

    const schedulesFileDisplay = document.getElementById('schedulesFileDisplay');
    const scheduleIdsList = document.getElementById('scheduleIdsList');
    const showCreateScheduleIdFormButton = document.getElementById('showCreateScheduleIdFormButton');
    const createScheduleIdForm = document.getElementById('createScheduleIdForm');
    const newScheduleIdNameInput = document.getElementById('newScheduleIdName');
    const saveNewScheduleIdButton = document.getElementById('saveNewScheduleIdButton');
    const cancelCreateScheduleIdButton = document.getElementById('cancelCreateScheduleIdButton');
    const editScheduleEntriesForm = document.getElementById('editScheduleEntriesForm');
    const editingScheduleIdNameSpan = document.getElementById('editingScheduleIdName');
    const scheduleEntriesList = document.getElementById('scheduleEntriesList');
    const entryTimeInput = document.getElementById('entryTime');
    const entryActionInput = document.getElementById('entryAction');
    const entryMapIdInput = document.getElementById('entryMapId');
    const entryWaypointIdInput = document.getElementById('entryWaypointId');
    const addScheduleEntryButton = document.getElementById('addScheduleEntryButton');
    const saveScheduleChangesButton = document.getElementById('saveScheduleChangesButton');
    const closeScheduleEditorButton = document.getElementById('closeScheduleEditorButton');

    const randomEncountersFileDisplay = document.getElementById('randomEncountersFileDisplay');
    const randomEncountersList = document.getElementById('randomEncountersList');
    const showCreateRandomEncounterFormButton = document.getElementById('showCreateRandomEncounterFormButton');
    const createRandomEncounterForm = document.getElementById('createRandomEncounterForm');
    const newEncounterIdInput = document.getElementById('newEncounterId');
    const newEncounterDescriptionInput = document.getElementById('newEncounterDescription');
    const newEncounterProbabilityInput = document.getElementById('newEncounterProbability');
    const newEncounterNpcIdsInput = document.getElementById('newEncounterNpcIds');
    const saveNewRandomEncounterButton = document.getElementById('saveNewRandomEncounterButton');
    const cancelCreateRandomEncounterButton = document.getElementById('cancelCreateRandomEncounterButton');
    const editRandomEncounterForm = document.getElementById('editRandomEncounterForm');
    const editingRandomEncounterOriginalIdInput = document.getElementById('editingRandomEncounterOriginalId');
    const editEncounterIdInput = document.getElementById('editEncounterId');
    const editEncounterDescriptionInput = document.getElementById('editEncounterDescription');
    const editEncounterProbabilityInput = document.getElementById('editEncounterProbability');
    const editEncounterNpcIdsInput = document.getElementById('editEncounterNpcIds');
    const saveRandomEncounterChangesButton = document.getElementById('saveRandomEncounterChangesButton');
    const deleteRandomEncounterButton = document.getElementById('deleteRandomEncounterButton');
    const cancelEditRandomEncounterButton = document.getElementById('cancelEditRandomEncounterButton');

    const storyBeatsFileDisplay = document.getElementById('storyBeatsFileDisplay');
    const storyBeatsTableBody = document.getElementById('storyBeatsTableBody');
    const showCreateStoryBeatFormButton = document.getElementById('showCreateStoryBeatFormButton');
    const createStoryBeatForm = document.getElementById('createStoryBeatForm');
    const newStoryBeatIdInput = document.getElementById('newStoryBeatId');
    const newStoryBeatValueInput = document.getElementById('newStoryBeatValue');
    const saveNewStoryBeatButton = document.getElementById('saveNewStoryBeatButton');
    const cancelCreateStoryBeatButton = document.getElementById('cancelCreateStoryBeatButton');
    const saveAllStoryBeatChangesButton = document.getElementById('saveAllStoryBeatChangesButton');

    // --- Campaign Data Store ---
    let campaignDataStore = {};
    function resetCampaignDataStore() { /* ... (previous content unchanged) ... */ }
    resetCampaignDataStore();

    // --- State Variables ---
    // ... (previous content unchanged) ...
    let currentLoadedFile = null;
    let currentCampaignRoot = "";

    let currentNpcs = [];
    let currentDialogueFiles = [];
    let currentDialogueData = null;
    let originalDialogueDataBeforeEdit = null;
    let currentlyEditingNodeId = null;
    let currentQuests = [];
    let originalQuestDataBeforeEdit = null;
    let currentZones = [];
    let originalZoneDataBeforeEdit = null;
    let currentWorldMapData = { nodes: [], connections: [] };
    let originalWorldMapNodeDataBeforeEdit = null;
    let currentSchedulesData = {};
    let currentlyEditingScheduleId = null;
    let originalSchedulesDataBeforeEdit = null;
    let currentRandomEncounters = [];
    let originalRandomEncounterDataBeforeEdit = null;
    let currentStoryBeatsData = {};
    let originalStoryBeatsDataForSaveAttempt = null;

    let currentNpcFilePathFull = null;
    let currentDialogueDirectory = '';
    let currentQuestsFilePath = '';
    let currentZonesFilePath = '';
    let currentWorldMapFilePath = '';
    let currentSchedulesFilePath = '';
    let currentRandomEncountersFilePath = '';
    let currentStoryBeatsFilePath = '';


    async function loadInitialData() { console.log("Client-side only. Data loading initiated by file selection."); }

    loadManifestButton.addEventListener('click', async () => {
        clearAllUIAndData();
        currentLoadedFile = null; currentCampaignRoot = ""; // Reset these specific states

        const fileInput = document.getElementById('fileUploader');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            displayError("Please select a campaign file (.zip or .json) first."); return;
        }
        const file = fileInput.files[0];
        currentLoadedFile = file;
        console.log(`[App.js] Selected file: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);

        try {
            if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
                await processZipFile(file);
            } else if (file.name.endsWith('.json') || file.type === 'application/json') {
                await processSingleJsonFile(file);
                 // For single JSON, assume it's the manifest and it doesn't define sub-files in its 'filePaths' for this load.
                 // The user would have to package everything into a ZIP for a full campaign load.
            } else {
                displayError("Invalid file type. Please select a .zip or .json file."); clearAllUIAndData(); return;
            }
            loadAllDataFromStoreAndRender(); // This will populate current... vars and render UI
        } catch (error) {
            console.error("Error processing file:", error); displayError(`Error processing file: ${error.message}`); clearAllUIAndData();
        }
    });

    async function processZipFile(file) { /* ... (previous content unchanged) ... */ }
    async function processSingleJsonFile(file) { /* ... (previous content unchanged) ... */ }
    function populateManifestUI(data) { /* ... (previous content unchanged) ... */ }
    function loadAllDataFromStoreAndRender() { /* ... (previous content unchanged) ... */ }

    // --- NPC CRUD ---
    // ... (NPC CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllNpcForms() { createNpcForm.style.display = 'none'; editNpcForm.style.display = 'none'; editingNpcOriginalIdInput.value = ''; editNpcTemplateIdInput.value = ''; }
    function renderNpcList() {
        npcList.innerHTML = '';
        const filePathForDisplay = npcList.dataset.filePath || "N/A";
        if (currentNpcs.length === 0) { npcList.innerHTML = `<li>No NPCs found or loaded from '${filePathForDisplay}'.</li>`; return; }
        currentNpcs.forEach(npc => {
            const listItem = document.createElement('li');
            listItem.textContent = `ID: ${npc.id || 'N/A'}, Name: ${npc.name || 'N/A'} `;
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit'; editButton.setAttribute('data-npc-id', npc.id);
            editButton.style.marginLeft = '10px'; editButton.addEventListener('click', handleEditNpc);
            listItem.appendChild(editButton);
            npcList.appendChild(listItem);
        });
    }
    function handleEditNpc(eventOrNpcId) {
        const npcId = typeof eventOrNpcId === 'string' ? eventOrNpcId : eventOrNpcId.target.getAttribute('data-npc-id');
        const npcToEdit = campaignDataStore.npcs.find(npc => npc.id === npcId);
        if (npcToEdit) {
            hideAllNpcForms();
            editingNpcOriginalIdInput.value = npcToEdit.id;
            editNpcIdInput.value = npcToEdit.id;
            editNpcNameInput.value = npcToEdit.name || '';
            editNpcTemplateIdInput.value = npcToEdit.templateId || 'None';
            editNpcForm.style.display = 'block'; clearErrorMessages();
        } else { displayError("Could not find NPC to edit in data store."); }
    }
    showCreateNpcFormButton.addEventListener('click', () => {
        if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; }
        hideAllNpcForms(); createNpcIdInput.value = ''; createNpcNameInput.value = '';
        createNpcForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateNpcButton.addEventListener('click', () => { hideAllNpcForms(); });
    saveNewNpcButton.addEventListener('click', () => {
        const newId = createNpcIdInput.value.trim(); const newName = createNpcNameInput.value.trim();
        if (!newId || !newName) { displayError("NPC ID and Name are required."); return; }
        if (campaignDataStore.npcs.some(npc => npc.id === newId)) { displayError(`NPC ID '${newId}' already exists.`); return; }
        const newNpc = { id: newId, name: newName, templateId: "None" };
        campaignDataStore.npcs.push(newNpc);
        currentNpcs = campaignDataStore.npcs;
        renderNpcList(); hideAllNpcForms();
        displayMessage("New NPC added to local data. Export campaign to save changes.");
    });
    cancelEditNpcButton.addEventListener('click', () => { hideAllNpcForms(); });
    saveNpcChangesButton.addEventListener('click', () => {
        const originalId = editingNpcOriginalIdInput.value;
        const newName = editNpcNameInput.value.trim();
        if (!newName) { displayError("NPC Name cannot be empty."); return; }
        const npcIndex = campaignDataStore.npcs.findIndex(npc => npc.id === originalId);
        if (npcIndex === -1) { displayError("Could not find NPC in store to update."); hideAllNpcForms(); return; }
        campaignDataStore.npcs[npcIndex].name = newName;
        currentNpcs = campaignDataStore.npcs;
        renderNpcList(); hideAllNpcForms();
        displayMessage("NPC changes saved to local data. Export campaign to save changes.");
    });
    deleteNpcButton.addEventListener('click', () => {
        const npcIdToDelete = editingNpcOriginalIdInput.value;
        if (!npcIdToDelete) { displayError("No NPC selected to delete."); return; }
        if (!confirm(`Delete NPC ID: ${npcIdToDelete} from local data?`)) return;
        const npcIndex = campaignDataStore.npcs.findIndex(npc => npc.id === npcIdToDelete);
        if (npcIndex === -1) { displayError(`NPC ID '${npcIdToDelete}' not found in store.`); hideAllNpcForms(); return; }
        campaignDataStore.npcs.splice(npcIndex, 1);
        currentNpcs = campaignDataStore.npcs;
        renderNpcList(); hideAllNpcForms();
        displayMessage(`NPC '${npcIdToDelete}' deleted from local data. Export campaign to save changes.`);
    });
    duplicateNpcButton.addEventListener('click', () => {
        const originalNpcId = editingNpcOriginalIdInput.value;
        if (!originalNpcId) { displayError("No NPC selected to duplicate."); return; }
        const originalNpc = campaignDataStore.npcs.find(npc => npc.id === originalNpcId);
        if (!originalNpc) { displayError(`Original NPC ID '${originalNpcId}' not found in store.`); return; }
        let newNpcId = prompt(`Enter new unique ID for duplicated NPC (original: ${originalNpcId}):`);
        if (newNpcId === null) return;
        newNpcId = newNpcId.trim();
        if (!newNpcId) { alert("New ID cannot be empty."); return; }
        if (campaignDataStore.npcs.some(npc => npc.id === newNpcId)) { alert(`ID '${newNpcId}' already exists.`); return; }
        const duplicatedNpc = JSON.parse(JSON.stringify(originalNpc));
        duplicatedNpc.id = newNpcId;
        campaignDataStore.npcs.push(duplicatedNpc);
        currentNpcs = campaignDataStore.npcs;
        renderNpcList(); hideAllNpcForms();
        displayMessage(`NPC '${originalNpc.name}' duplicated as '${newNpcId}' in local data. Export to save changes.`);
    });

    // --- Dialogue CRUD ---
    // ... (Dialogue CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllDialogueForms() { createDialogueFileForm.style.display = 'none'; dialogueEditorSection.style.display = 'none'; textualDialogueEditorControlsDiv.style.display = 'none'; visualDialogueEditorPlaceholderDiv.style.display = 'none'; dialogueNodeEditArea.style.display = 'none'; originalDialogueDataBeforeEdit = null; currentlyEditingNodeId = null; toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup"; }
    showCreateDialogueFileFormButton.addEventListener('click', () => {
        if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; }
        hideAllDialogueForms(); newDialogueFileNameInput.value = ''; newDialogueIdInput.value = '';
        createDialogueFileForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateDialogueFileButton.addEventListener('click', () => { hideAllDialogueForms(); });
    saveNewDialogueFileButton.addEventListener('click', () => {
        const newFileName = newDialogueFileNameInput.value.trim();
        const newDialogueIdValue = newDialogueIdInput.value.trim();
        if (!newFileName || !newDialogueIdValue) { displayError("File Name and Dialogue ID are required."); return; }
        if (!newFileName.endsWith('.json')) { displayError("File Name must end with .json"); return; }
        const dialogueKey = newFileName;
        if (campaignDataStore.dialogues[dialogueKey]) { displayError(`Dialogue file "${dialogueKey}" already exists in store.`); return; }
        const newDialogueContent = { id: newDialogueIdValue, startingNode: "start", nodes: { "start": { nodeId: "start", npcLine: "Hello.", choices: [] } } };
        campaignDataStore.dialogues[dialogueKey] = newDialogueContent;
        currentDialogueFiles = Object.keys(campaignDataStore.dialogues);
        renderDialogueFilesList(); hideAllDialogueForms();
        displayMessage(`Dialogue file "${dialogueKey}" created in local data. Export to save changes.`);
    });
    function renderDialogueFilesList() {
        dialogueFilesList.innerHTML = '';
        if (!currentDialogueDirectory && currentDialogueFiles.length === 0) { dialogueFilesList.innerHTML = '<li>Dialogue directory not specified or no dialogues loaded.</li>'; return; }
        if (currentDialogueFiles.length === 0) { dialogueFilesList.innerHTML = `<li>No JSON files found or loaded for directory '${dialogueDirectoryDisplay.value}'.</li>`; return; }
        currentDialogueFiles.forEach(dialogueKey => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#'; link.textContent = dialogueKey; link.dataset.filename = dialogueKey;
            link.onclick = (e) => { e.preventDefault(); loadDialogueFileContent(dialogueKey); };
            li.appendChild(link);
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete'; delBtn.classList.add('button-danger'); delBtn.dataset.filename = dialogueKey;
            delBtn.style.marginLeft = '10px'; delBtn.onclick = handleDeleteDialogueFile;
            li.appendChild(delBtn);
            dialogueFilesList.appendChild(li);
        });
    }
    function loadDialogueFileContent(dialogueKey) {
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        currentDialogueData = campaignDataStore.dialogues[dialogueKey];
        if (!currentDialogueData) { displayError(`Dialogue content for "${dialogueKey}" not found in store.`); clearDialogueEditorFieldsAndState(); return; }
        currentlyEditingDialogueFilePath = dialogueKey;
        editingDialogueFileNameSpan.textContent = dialogueKey; clearErrorMessages();
        originalDialogueDataBeforeEdit = JSON.parse(JSON.stringify(currentDialogueData));
        dialogueMetaIdInput.value = currentDialogueData.id || '';
        dialogueMetaStartingNodeInput.value = currentDialogueData.startingNode || '';
        renderSelectableDialogueNodesList();
        dialogueEditorSection.style.display = 'block'; textualDialogueEditorControlsDiv.style.display = 'block';
        visualDialogueEditorPlaceholderDiv.style.display = 'none'; toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
        dialogueNodeEditArea.style.display = 'none';
    }
    function renderSelectableDialogueNodesList() {
        dialogueNodesList.innerHTML = '';
        if (!currentDialogueData || !currentDialogueData.nodes || Object.keys(currentDialogueData.nodes).length === 0) {
            dialogueNodesList.innerHTML = '<li>No nodes. Click "Add New Dialogue Node".</li>'; return;
        }
        for (const nodeId in currentDialogueData.nodes) {
            const li = document.createElement('li');
            li.style.cursor = 'pointer'; li.textContent = nodeId;
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit'; editBtn.style.marginLeft = '10px';
            editBtn.onclick = (e) => { e.stopPropagation(); selectDialogueNodeForEditing(nodeId); };
            li.appendChild(editBtn);
            if (nodeId === currentlyEditingNodeId) li.style.backgroundColor = '#e0e0e0';
            li.onclick = () => selectDialogueNodeForEditing(nodeId);
            dialogueNodesList.appendChild(li);
        }
     }
    function selectDialogueNodeForEditing(nodeId) {
        if (!currentDialogueData.nodes[nodeId]) {
            displayError(`Node ${nodeId} not found.`); dialogueNodeEditArea.style.display = 'none';
            currentlyEditingNodeId = null; renderSelectableDialogueNodesList(); return;
        }
        currentlyEditingNodeId = nodeId;
        const node = currentDialogueData.nodes[nodeId];
        editingNodeIdDisplay.textContent = nodeId;
        nodeNpcLineTextArea.value = node.npcLine || '';
        if (!node.choices) node.choices = [];
        renderNodePlayerChoicesList(node.choices);
        textualDialogueEditorControlsDiv.style.display = 'block';
        visualDialogueEditorPlaceholderDiv.style.display = 'none';
        toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
        dialogueNodeEditArea.style.display = 'block';
        renderSelectableDialogueNodesList();
    }
    function parseFlagsString(flagsString) { return flagsString ? flagsString.split(',').map(f => f.trim()).filter(f => f) : []; }
    function formatFlagsArray(flagsArray) { return flagsArray ? flagsArray.join(',') : ""; }
    function renderNodePlayerChoicesList(choicesArray) {
        nodePlayerChoicesList.innerHTML = '';
        if (!choicesArray || choicesArray.length === 0) {
            nodePlayerChoicesList.innerHTML = '<li>No player choices.</li>'; return;
        }
        choicesArray.forEach((choice, index) => {
            const li = document.createElement('li');
            li.style.marginBottom = '10px'; li.style.padding = '5px'; li.style.border = '1px dashed #ccc';
            li.innerHTML = `
                <div><label>Choice ${index + 1} Text:</label><br><input type="text" class="choice-text-input" value="${choice.text || ''}" data-index="${index}" style="width:90%;"></div>
                <div><label>Next Node ID:</label><br><input type="text" class="choice-nextnodeid-input" value="${choice.nextNodeId || ''}" data-index="${index}" style="width:90%;"></div>
                <div><label>Flags (comma-separated):</label><br><input type="text" class="choice-flags-input" value="${formatFlagsArray(choice.flags)}" data-index="${index}" style="width:90%;"></div>
            `;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove Choice'; removeBtn.classList.add('button-danger');
            removeBtn.style.marginTop = '5px'; removeBtn.onclick = () => removeChoiceFromCurrentNode(index);
            li.appendChild(removeBtn);
            nodePlayerChoicesList.appendChild(li);
        });
    }
    nodeNpcLineTextArea.addEventListener('change', (event) => { if (currentlyEditingNodeId && currentDialogueData.nodes[currentlyEditingNodeId]) currentDialogueData.nodes[currentlyEditingNodeId].npcLine = event.target.value; });
    nodePlayerChoicesList.addEventListener('change', (event) => {
        if (!currentlyEditingNodeId || !currentDialogueData.nodes[currentlyEditingNodeId]) return;
        const target = event.target; const index = parseInt(target.dataset.index);
        const choices = currentDialogueData.nodes[currentlyEditingNodeId].choices;
        if (choices && choices[index]) {
            if (target.classList.contains('choice-text-input')) choices[index].text = target.value;
            else if (target.classList.contains('choice-nextnodeid-input')) choices[index].nextNodeId = target.value;
            else if (target.classList.contains('choice-flags-input')) choices[index].flags = parseFlagsString(target.value);
        }
    });
    addNewChoiceToNodeButton.addEventListener('click', () => {
        if (!currentlyEditingNodeId || !currentDialogueData.nodes[currentlyEditingNodeId]) { displayError("No node selected."); return; }
        const node = currentDialogueData.nodes[currentlyEditingNodeId];
        if (!node.choices) node.choices = [];
        node.choices.push({ text: "New Choice", nextNodeId: "", flags: [] });
        renderNodePlayerChoicesList(node.choices);
    });
    function removeChoiceFromCurrentNode(index) {
        if (!currentlyEditingNodeId || !currentDialogueData.nodes[currentlyEditingNodeId] || !currentDialogueData.nodes[currentlyEditingNodeId].choices) return;
        const choices = currentDialogueData.nodes[currentlyEditingNodeId].choices;
        if (index >= 0 && index < choices.length) {
            if (confirm(`Remove choice: "${choices[index].text}"?`)) {
                choices.splice(index, 1); renderNodePlayerChoicesList(choices);
            }
        }
    }
    addNewDialogueNodeButton.addEventListener('click', () => {
        if (!currentDialogueData) { displayError("No dialogue file loaded."); return; }
        const newId = prompt("Enter unique ID for the new dialogue node:");
        if (!newId || newId.trim() === "") { displayMessage("Node ID cannot be empty."); return; }
        const id = newId.trim();
        if (currentDialogueData.nodes && currentDialogueData.nodes[id]) { displayError(`Node ID "${id}" already exists.`); return; }
        if (!currentDialogueData.nodes) currentDialogueData.nodes = {};
        currentDialogueData.nodes[id] = { nodeId: id, npcLine: "Newly Added Node", choices: [] };
        renderSelectableDialogueNodesList(); selectDialogueNodeForEditing(id);
    });
    deleteCurrentNodeButton.addEventListener('click', () => {
        if (!currentlyEditingNodeId || !currentDialogueData.nodes[currentlyEditingNodeId]) { displayError("No node selected."); return; }
        if (!confirm(`Delete node "${currentlyEditingNodeId}" and its choices? This also clears choices from other nodes pointing to it.`)) return;
        const deletedNodeId = currentlyEditingNodeId;
        delete currentDialogueData.nodes[deletedNodeId];
        for (const nodeId in currentDialogueData.nodes) {
            const node = currentDialogueData.nodes[nodeId];
            if (node.choices) node.choices.forEach(choice => { if (choice.nextNodeId === deletedNodeId) choice.nextNodeId = ""; });
        }
        currentlyEditingNodeId = null; dialogueNodeEditArea.style.display = 'none';
        editingNodeIdDisplay.textContent = ''; nodeNpcLineTextArea.value = ''; nodePlayerChoicesList.innerHTML = '';
        renderSelectableDialogueNodesList(); displayMessage(`Node "${deletedNodeId}" deleted.`);
    });
    saveDialogueChangesButton.addEventListener('click', () => {
        if (!currentDialogueData || !currentlyEditingDialogueFilePath) { displayError("No dialogue loaded for saving."); return; }
        const dialogueKey = currentlyEditingDialogueFilePath;
        currentDialogueData.id = dialogueMetaIdInput.value.trim();
        currentDialogueData.startingNode = dialogueMetaStartingNodeInput.value.trim();
        campaignDataStore.dialogues[dialogueKey] = JSON.parse(JSON.stringify(currentDialogueData));
        originalDialogueDataBeforeEdit = JSON.parse(JSON.stringify(currentDialogueData));
        displayMessage(`Dialogue "${dialogueKey}" changes saved to local data. Export to save changes.`);
    });
    function handleDeleteDialogueFile(event) {
        const dialogueKey = event.target.dataset.filename;
        if (!dialogueKey) { displayError("Could not determine dialogue file to delete."); return; }
        if (!confirm(`Delete dialogue file: "${dialogueKey}" from local data?`)) return;
        if (campaignDataStore.dialogues[dialogueKey]) {
            delete campaignDataStore.dialogues[dialogueKey];
            if (currentlyEditingDialogueFilePath === dialogueKey) clearDialogueEditorFieldsAndState();
            currentDialogueFiles = Object.keys(campaignDataStore.dialogues);
            renderDialogueFilesList();
            displayMessage(`Dialogue "${dialogueKey}" deleted from local data. Export to save changes.`);
        } else { displayError(`Dialogue "${dialogueKey}" not found in store.`); }
    }
    refreshDialogueListButton.addEventListener('click', () => { currentDialogueFiles = Object.keys(campaignDataStore.dialogues || {}); renderDialogueFilesList();});
    toggleVisualDialogueEditorButton.addEventListener('click', () => { /* ... (unchanged) ... */ });

    // --- Quests CRUD ---
    // ... (Quest CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllQuestForms() { createQuestForm.style.display = 'none'; editQuestForm.style.display = 'none'; originalQuestDataBeforeEdit = null; questObjectivesList.innerHTML = ''; }
    function renderQuestsList() {
        questsList.innerHTML = '';
        const filePathForDisplay = questsFileDisplay.value || "N/A";
        if (currentQuests.length === 0) { questsList.innerHTML = `<li>No Quests found or loaded from '${filePathForDisplay}'.</li>`; return; }
        currentQuests.forEach(quest => {
            const li = document.createElement('li');
            li.innerHTML = `ID: ${quest.id || 'N/A'}, Title: ${quest.title || 'Untitled'} `;
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit'; editBtn.dataset.questId = quest.id;
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditQuest(quest.id);
            li.appendChild(editBtn);
            questsList.appendChild(li);
        });
    }
    function renderQuestObjectives(quest) {
        questObjectivesList.innerHTML = '';
        if (!quest || !quest.objectives || quest.objectives.length === 0) {
            questObjectivesList.innerHTML = '<li>No objectives.</li>'; return;
        }
        quest.objectives.forEach((obj, index) => {
            const li = document.createElement('li');
            li.style.borderBottom = '1px dashed #eee'; li.style.marginBottom = '5px'; li.style.paddingBottom = '5px';
            li.innerHTML = `
                <div style="display:grid; grid-template-columns: auto 1fr auto; gap: 5px 10px; align-items: center;">
                    <label>Type:</label><input type="text" class="quest-obj-type-input" value="${obj.type || ''}" data-index="${index}" style="width:100%;">
                    <button type="button" class="remove-quest-objective-button button-danger" data-index="${index}" style="padding:3px 6px;">X</button>
                    <label>Target:</label><input type="text" class="quest-obj-target-input" value="${obj.target || ''}" data-index="${index}" style="width:100%;"><span></span>
                    <label>Count:</label><input type="number" class="quest-obj-count-input" value="${obj.count || 1}" min="1" data-index="${index}" style="width:70px;"><span></span>
                    <label>Desc:</label><input type="text" class="quest-obj-desc-input" value="${obj.description || ''}" data-index="${index}" style="width:100%;"><span></span>
                </div>`;
            questObjectivesList.appendChild(li);
        });
     }
    questObjectivesList.addEventListener('change', (event) => {
        const target = event.target; const index = parseInt(target.dataset.index);
        const questId = editingQuestOriginalIdInput.value;
        const quest = campaignDataStore.quests.find(q => q.id === questId); // Find in store
        if (!quest || !quest.objectives || isNaN(index) || index < 0 || index >= quest.objectives.length) return;
        let propName = '';
        if (target.classList.contains('quest-obj-type-input')) propName = 'type';
        else if (target.classList.contains('quest-obj-target-input')) propName = 'target';
        else if (target.classList.contains('quest-obj-count-input')) propName = 'count';
        else if (target.classList.contains('quest-obj-desc-input')) propName = 'description';
        if (propName) {
            let value = target.value;
            if (propName === 'count') value = parseInt(value) || 1;
            quest.objectives[index][propName] = value; // Directly modify store's object
        }
     });
    questObjectivesList.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-quest-objective-button')) {
            const index = parseInt(event.target.dataset.index);
            const questId = editingQuestOriginalIdInput.value;
            const quest = campaignDataStore.quests.find(q => q.id === questId); // Find in store
            if (quest && quest.objectives && !isNaN(index) && index >= 0 && index < quest.objectives.length) {
                if (confirm(`Remove objective: "${quest.objectives[index].description || 'New Objective'}"?`)) {
                    quest.objectives.splice(index, 1); // Directly modify store's object
                    renderQuestObjectives(quest); // Re-render objectives for this quest
                }
            }
        }
    });
    addNewQuestObjectiveRowButton.addEventListener('click', () => {
        const questId = editingQuestOriginalIdInput.value;
        const quest = campaignDataStore.quests.find(q => q.id === questId); // Find in store
        if (!quest) { displayError("No quest selected."); return; }
        if (!quest.objectives) quest.objectives = [];
        quest.objectives.push({ type: "", target: "", count: 1, description: "New Objective" }); // Modify store
        renderQuestObjectives(quest); // Re-render
    });
    function handleEditQuest(questId) {
        const questToEdit = campaignDataStore.quests.find(q => q.id === questId);
        if (!questToEdit) { displayError(`Quest ID '${questId}' not found.`); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        originalQuestDataBeforeEdit = JSON.parse(JSON.stringify(questToEdit));
        editingQuestOriginalIdInput.value = questToEdit.id;
        editQuestIdInput.value = questToEdit.id;
        editQuestTitleInput.value = questToEdit.title || '';
        editQuestDescriptionInput.value = questToEdit.description || '';
        renderQuestObjectives(questToEdit);
        editQuestForm.style.display = 'block'; clearErrorMessages();
    }
    showCreateQuestFormButton.addEventListener('click', () => { if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; } hideAllQuestForms(); newQuestIdInput.value = ''; newQuestTitleInput.value = ''; newQuestDescriptionInput.value = ''; createQuestForm.style.display = 'block'; });
    cancelCreateQuestButton.addEventListener('click', () => { hideAllQuestForms(); });
    saveNewQuestButton.addEventListener('click', () => {
        const newId = newQuestIdInput.value.trim(); const newTitle = newQuestTitleInput.value.trim(); const newDesc = newQuestDescriptionInput.value.trim();
        if (!newId || !newTitle) { displayError("Quest ID and Title are required."); return; }
        if (campaignDataStore.quests.some(q => q.id === newId)) { displayError(`Quest ID '${newId}' already exists.`); return; }
        const newQuest = { id: newId, title: newTitle, description: newDesc, objectives: [], rewards: {}, conditions: {} };
        campaignDataStore.quests.push(newQuest);
        currentQuests = campaignDataStore.quests;
        renderQuestsList(); hideAllQuestForms();
        displayMessage("New quest saved to local data. Export to save changes.");
    });
    cancelEditQuestButton.addEventListener('click', () => {
        if (originalQuestDataBeforeEdit && editingQuestOriginalIdInput.value) {
            const questIndex = campaignDataStore.quests.findIndex(q => q.id === editingQuestOriginalIdInput.value);
            if (questIndex !== -1) {
                campaignDataStore.quests[questIndex] = JSON.parse(JSON.stringify(originalQuestDataBeforeEdit));
                currentQuests = campaignDataStore.quests;
                 renderQuestsList(); // Re-render the main list if needed
            }
        }
        hideAllQuestForms();
    });
    saveQuestChangesButton.addEventListener('click', () => {
        const originalId = editingQuestOriginalIdInput.value;
        const questIndex = campaignDataStore.quests.findIndex(q => q.id === originalId);
        if (questIndex === -1) { displayError(`Quest ID '${originalId}' not found in store.`); hideAllQuestForms(); return; }
        campaignDataStore.quests[questIndex].title = editQuestTitleInput.value.trim();
        campaignDataStore.quests[questIndex].description = editQuestDescriptionInput.value.trim();
        currentQuests = campaignDataStore.quests;
        originalQuestDataBeforeEdit = JSON.parse(JSON.stringify(campaignDataStore.quests[questIndex]));
        renderQuestsList();
        displayMessage("Quest changes saved to local data. Export to save changes.");
    });
    deleteQuestButton.addEventListener('click', () => {
        const questIdDel = editingQuestOriginalIdInput.value;
        if (!questIdDel) { displayError("No quest selected."); return; }
        const questTitle = campaignDataStore.quests.find(q=>q.id === questIdDel)?.title || questIdDel;
        if (!confirm(`Delete quest: "${questTitle}" from local data?`)) return;
        const questIndex = campaignDataStore.quests.findIndex(q => q.id === questIdDel);
        if (questIndex === -1) { displayError(`Quest ID '${questIdDel}' not found in store.`); hideAllQuestForms(); return; }
        campaignDataStore.quests.splice(questIndex, 1);
        currentQuests = campaignDataStore.quests;
        renderQuestsList(); hideAllQuestForms();
        displayMessage(`Quest "${questTitle}" deleted from local data. Export to save changes.`);
    });

    // --- Zones CRUD ---
    // ... (Zone CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllZoneForms() { createZoneForm.style.display = 'none'; editZoneForm.style.display = 'none'; originalZoneDataBeforeEdit = null; }
    function renderZonesList() {
        zonesList.innerHTML = ''; const filePathForDisplay = zonesFileDisplay.value || "N/A";
        if (currentZones.length === 0) { zonesList.innerHTML = `<li>No Zones found or loaded from '${filePathForDisplay}'.</li>`; return; }
        currentZones.forEach(zone => {
            const li = document.createElement('li');
            li.innerHTML = `ID: ${zone.id || 'N/A'}, Name: ${zone.name || 'Untitled'} (Map: ${zone.mapFilePath || 'N/A'})`;
            const editBtn = document.createElement('button'); editBtn.textContent = 'Edit'; editBtn.dataset.zoneId = zone.id;
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditZone(zone.id);
            li.appendChild(editBtn); zonesList.appendChild(li);
        });
    }
    function handleEditZone(zoneId) {
        const zoneToEdit = campaignDataStore.zones.find(z => z.id === zoneId);
        if (!zoneToEdit) { displayError(`Zone ID '${zoneId}' not found.`); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        originalZoneDataBeforeEdit = JSON.parse(JSON.stringify(zoneToEdit));
        editingZoneOriginalIdInput.value = zoneToEdit.id; editZoneIdInput.value = zoneToEdit.id;
        editZoneNameInput.value = zoneToEdit.name || ''; editZoneMapFilePathInput.value = zoneToEdit.mapFilePath || '';
        editZoneForm.style.display = 'block'; clearErrorMessages();
    }
    showCreateZoneFormButton.addEventListener('click', () => { if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; } hideAllZoneForms(); newZoneIdInput.value = ''; newZoneNameInput.value = ''; newZoneMapFilePathInput.value = ''; createZoneForm.style.display = 'block'; });
    cancelCreateZoneButton.addEventListener('click', () => { hideAllZoneForms(); });
    saveNewZoneButton.addEventListener('click', () => {
        const id = newZoneIdInput.value.trim(); const name = newZoneNameInput.value.trim(); const map = newZoneMapFilePathInput.value.trim();
        if (!id || !name) { displayError("Zone ID and Name required."); return; }
        if (campaignDataStore.zones.some(z => z.id === id)) { displayError(`Zone ID '${id}' already exists.`); return; }
        const newZone = { id, name, mapFilePath: map, npcs: [], items: [], triggers: [] };
        campaignDataStore.zones.push(newZone); currentZones = campaignDataStore.zones;
        renderZonesList(); hideAllZoneForms(); displayMessage("New zone saved to local data.");
    });
    cancelEditZoneButton.addEventListener('click', () => {
        if(originalZoneDataBeforeEdit && editingZoneOriginalIdInput.value){
            const zoneIndex = campaignDataStore.zones.findIndex(z => z.id === editingZoneOriginalIdInput.value);
            if(zoneIndex !== -1) campaignDataStore.zones[zoneIndex] = JSON.parse(JSON.stringify(originalZoneDataBeforeEdit));
            currentZones = campaignDataStore.zones;
        }
        hideAllZoneForms();
    });
    saveZoneChangesButton.addEventListener('click', () => {
        const originalId = editingZoneOriginalIdInput.value;
        const zoneIndex = campaignDataStore.zones.findIndex(z => z.id === originalId);
        if (zoneIndex === -1) { displayError("Zone not found in store."); return; }
        campaignDataStore.zones[zoneIndex].name = editZoneNameInput.value.trim();
        campaignDataStore.zones[zoneIndex].mapFilePath = editZoneMapFilePathInput.value.trim();
        currentZones = campaignDataStore.zones;
        originalZoneDataBeforeEdit = JSON.parse(JSON.stringify(campaignDataStore.zones[zoneIndex]));
        renderZonesList(); displayMessage("Zone changes saved to local data.");
    });
    deleteZoneButton.addEventListener('click', () => {
        const zoneIdDel = editingZoneOriginalIdInput.value;
        const zoneName = campaignDataStore.zones.find(z=>z.id === zoneIdDel)?.name || zoneIdDel;
        if (!confirm(`Delete zone: "${zoneName}"?`)) return;
        const zoneIndex = campaignDataStore.zones.findIndex(z => z.id === zoneIdDel);
        if (zoneIndex === -1) { displayError("Zone not found in store."); return; }
        campaignDataStore.zones.splice(zoneIndex, 1); currentZones = campaignDataStore.zones;
        renderZonesList(); hideAllZoneForms(); displayMessage("Zone deleted from local data.");
    });

    // --- World Map CRUD ---
    // ... (World Map CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllWorldMapForms() { createWorldMapNodeForm.style.display = 'none'; editWorldMapNodeForm.style.display = 'none'; originalWorldMapNodeDataBeforeEdit = null; }
    function renderWorldMapNodesList() {
        worldMapNodesList.innerHTML = ''; const filePathForDisplay = worldMapFileDisplay.value || "N/A";
        if (!currentWorldMapData || currentWorldMapData.nodes.length === 0) { worldMapNodesList.innerHTML = `<li>No World Map Nodes found or loaded from '${filePathForDisplay}'.</li>`; return; }
        currentWorldMapData.nodes.forEach(node => {
            const li = document.createElement('li');
            li.innerHTML = `ID: ${node.id}, Name: ${node.name || 'Unnamed'} (Zone: ${node.zoneId || 'None'}) `;
            const editBtn = document.createElement('button'); editBtn.textContent = 'Edit'; editBtn.dataset.nodeId = node.id;
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditWorldMapNode(node.id);
            li.appendChild(editBtn); worldMapNodesList.appendChild(li);
        });
    }
    function handleEditWorldMapNode(nodeId) {
        const nodeToEdit = campaignDataStore.worldMap.nodes.find(n => n.id === nodeId);
        if (!nodeToEdit) { displayError("Node not found."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        originalWorldMapNodeDataBeforeEdit = JSON.parse(JSON.stringify(nodeToEdit));
        editingWorldMapNodeOriginalIdInput.value = nodeToEdit.id; editWorldMapNodeIdInput.value = nodeToEdit.id;
        editWorldMapNodeNameInput.value = nodeToEdit.name || ''; editWorldMapNodeZoneIdInput.value = nodeToEdit.zoneId || '';
        editWorldMapNodeForm.style.display = 'block';
    }
    showCreateWorldMapNodeFormButton.addEventListener('click', () => { if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; } hideAllWorldMapForms(); newWorldMapNodeIdInput.value = ''; newWorldMapNodeNameInput.value = ''; newWorldMapNodeZoneIdInput.value = ''; createWorldMapNodeForm.style.display = 'block';});
    cancelCreateWorldMapNodeButton.addEventListener('click', () => { hideAllWorldMapForms(); });
    saveNewWorldMapNodeButton.addEventListener('click', () => {
        const id = newWorldMapNodeIdInput.value.trim(); const name = newWorldMapNodeNameInput.value.trim(); const zoneId = newWorldMapNodeZoneIdInput.value.trim() || null;
        if (!id || !name) { displayError("Node ID and Name required."); return; }
        if (campaignDataStore.worldMap.nodes.some(n => n.id === id)) { displayError("Node ID already exists."); return; }
        campaignDataStore.worldMap.nodes.push({ id, name, zoneId }); currentWorldMapData = campaignDataStore.worldMap;
        renderWorldMapNodesList(); hideAllWorldMapForms(); displayMessage("New map node saved to local data.");
    });
    cancelEditWorldMapNodeButton.addEventListener('click', () => {
        if(originalWorldMapNodeDataBeforeEdit && editingWorldMapNodeOriginalIdInput.value){
            const nodeIndex = campaignDataStore.worldMap.nodes.findIndex(n => n.id === editingWorldMapNodeOriginalIdInput.value);
            if(nodeIndex !== -1) campaignDataStore.worldMap.nodes[nodeIndex] = JSON.parse(JSON.stringify(originalWorldMapNodeDataBeforeEdit));
            currentWorldMapData = campaignDataStore.worldMap;
        }
        hideAllWorldMapForms();
    });
    saveWorldMapNodeChangesButton.addEventListener('click', () => {
        const originalId = editingWorldMapNodeOriginalIdInput.value;
        const nodeIndex = campaignDataStore.worldMap.nodes.findIndex(n => n.id === originalId);
        if (nodeIndex === -1) { displayError("Node not found."); return; }
        campaignDataStore.worldMap.nodes[nodeIndex].name = editWorldMapNodeNameInput.value.trim();
        campaignDataStore.worldMap.nodes[nodeIndex].zoneId = editWorldMapNodeZoneIdInput.value.trim() || null;
        currentWorldMapData = campaignDataStore.worldMap;
        originalWorldMapNodeDataBeforeEdit = JSON.parse(JSON.stringify(campaignDataStore.worldMap.nodes[nodeIndex]));
        renderWorldMapNodesList(); displayMessage("Node changes saved to local data.");
    });
    deleteWorldMapNodeButton.addEventListener('click', () => {
        const nodeIdDel = editingWorldMapNodeOriginalIdInput.value;
        const nodeName = campaignDataStore.worldMap.nodes.find(n=>n.id === nodeIdDel)?.name || nodeIdDel;
        if (!confirm(`Delete node: "${nodeName}"? Associated connections will also be removed.`)) return;
        const nodeIndex = campaignDataStore.worldMap.nodes.findIndex(n => n.id === nodeIdDel);
        if (nodeIndex === -1) { displayError("Node not found."); return; }
        campaignDataStore.worldMap.nodes.splice(nodeIndex, 1);
        campaignDataStore.worldMap.connections = campaignDataStore.worldMap.connections.filter(c => c.from !== nodeIdDel && c.to !== nodeIdDel);
        currentWorldMapData = campaignDataStore.worldMap;
        renderWorldMapNodesList(); hideAllWorldMapForms(); displayMessage("Node deleted from local data.");
    });

    // --- Schedules CRUD ---
    // ... (Schedule CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllScheduleForms() { createScheduleIdForm.style.display = 'none'; editScheduleEntriesForm.style.display = 'none'; currentlyEditingScheduleId = null; originalSchedulesDataBeforeEdit = null; /* Might need more reset for schedule editor UI */ }
    function renderScheduleIdsList() {
        scheduleIdsList.innerHTML = ''; const filePathForDisplay = schedulesFileDisplay.value || "N/A";
        if (Object.keys(currentSchedulesData).length === 0) { scheduleIdsList.innerHTML = `<li>No Schedules found or loaded from '${filePathForDisplay}'.</li>`; return; }
        for (const id in currentSchedulesData) {
            const li = document.createElement('li'); li.textContent = id;
            const editBtn = document.createElement('button'); editBtn.textContent = 'Edit Entries';
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditScheduleEntries(id); li.appendChild(editBtn);
            const delBtn = document.createElement('button'); delBtn.textContent = 'Delete ID';
            delBtn.style.marginLeft = '5px'; delBtn.classList.add('button-danger');
            delBtn.onclick = () => handleDeleteScheduleId(id); li.appendChild(delBtn);
            scheduleIdsList.appendChild(li);
        }
    }
    function renderScheduleEntriesList() {
        scheduleEntriesList.innerHTML = '';
        if (!currentlyEditingScheduleId || !currentSchedulesData[currentlyEditingScheduleId]) { scheduleEntriesList.innerHTML = '<li>No schedule selected or it has no entries.</li>'; return; }
        const entries = currentSchedulesData[currentlyEditingScheduleId];
        if (entries.length === 0) { scheduleEntriesList.innerHTML = '<li>No entries. Add one below.</li>'; return; }
        entries.forEach((entry, index) => {
            const li = document.createElement('li');
            li.textContent = `Time: ${entry.time}, Action: ${entry.action}, Map: ${entry.mapId}, Waypoint: ${entry.waypointId}`;
            const removeBtn = document.createElement('button'); removeBtn.textContent = 'Remove';
            removeBtn.style.marginLeft = '10px'; removeBtn.classList.add('button-danger');
            removeBtn.onclick = () => handleRemoveScheduleEntry(index); li.appendChild(removeBtn);
            scheduleEntriesList.appendChild(li);
        });
    }
    function handleEditScheduleEntries(scheduleId) {
        if (!campaignDataStore.schedules.hasOwnProperty(scheduleId)) { displayError("Schedule ID not found."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        currentlyEditingScheduleId = scheduleId;
        originalSchedulesDataBeforeEdit = JSON.parse(JSON.stringify(campaignDataStore.schedules));
        editingScheduleIdNameSpan.textContent = scheduleId;
        renderScheduleEntriesList(); editScheduleEntriesForm.style.display = 'block';
    }
    showCreateScheduleIdFormButton.addEventListener('click', () => { if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; } hideAllScheduleForms(); newScheduleIdNameInput.value = ''; createScheduleIdForm.style.display = 'block'; });
    cancelCreateScheduleIdButton.addEventListener('click', () => { hideAllScheduleForms(); });
    saveNewScheduleIdButton.addEventListener('click', () => {
        const newId = newScheduleIdNameInput.value.trim();
        if (!newId) { displayError("Schedule ID cannot be empty."); return; }
        if (campaignDataStore.schedules.hasOwnProperty(newId)) { displayError("Schedule ID already exists."); return; }
        campaignDataStore.schedules[newId] = []; currentSchedulesData = campaignDataStore.schedules;
        renderScheduleIdsList(); hideAllScheduleForms(); displayMessage("New schedule ID created in local data.");
    });
    addScheduleEntryButton.addEventListener('click', () => {
        if (!currentlyEditingScheduleId) { displayError("No schedule selected."); return; }
        const time = entryTimeInput.value.trim(); const action = entryActionInput.value.trim();
        const mapId = entryMapIdInput.value.trim(); const waypointId = entryWaypointIdInput.value.trim();
        if (!time || !action || !mapId || !waypointId) { displayError("All entry fields required."); return; }
        if (!/^\d{2}:\d{2}$/.test(time)) { displayError("Time must be HH:MM."); return; }
        campaignDataStore.schedules[currentlyEditingScheduleId].push({ time, action, mapId, waypointId });
        currentSchedulesData = campaignDataStore.schedules; renderScheduleEntriesList();
        entryTimeInput.value = ''; entryActionInput.value = ''; entryMapIdInput.value = ''; entryWaypointIdInput.value = '';
    });
    saveScheduleChangesButton.addEventListener('click', () => {
        if (!currentlyEditingScheduleId) { displayError("No schedule selected for saving."); return; }
        originalSchedulesDataBeforeEdit = JSON.parse(JSON.stringify(campaignDataStore.schedules));
        displayMessage(`Changes for schedule '${currentlyEditingScheduleId}' saved to local data.`);
    });
    closeScheduleEditorButton.addEventListener('click', () => {
        if (originalSchedulesDataBeforeEdit && currentlyEditingScheduleId &&
            JSON.stringify(campaignDataStore.schedules[currentlyEditingScheduleId]) !== JSON.stringify(originalSchedulesDataBeforeEdit[currentlyEditingScheduleId])) {
            if (confirm("Unsaved changes to current schedule. Close and revert these changes?")) {
                campaignDataStore.schedules[currentlyEditingScheduleId] = JSON.parse(JSON.stringify(originalSchedulesDataBeforeEdit[currentlyEditingScheduleId]));
                currentSchedulesData = campaignDataStore.schedules;
            } else { return; }
        }
        hideAllScheduleForms();
    });
    function handleDeleteScheduleId(scheduleId) {
        if (!confirm(`Delete Schedule ID "${scheduleId}" and all its entries from local data?`)) return;
        if (campaignDataStore.schedules.hasOwnProperty(scheduleId)) {
            delete campaignDataStore.schedules[scheduleId];
            if (currentlyEditingScheduleId === scheduleId) hideAllScheduleForms();
            currentSchedulesData = campaignDataStore.schedules; renderScheduleIdsList();
            displayMessage(`Schedule ID "${scheduleId}" deleted from local data.`);
        }
    }
    function handleRemoveScheduleEntry(index) {
        if (!currentlyEditingScheduleId || !campaignDataStore.schedules[currentlyEditingScheduleId]) return;
        const entry = campaignDataStore.schedules[currentlyEditingScheduleId][index];
        if (confirm(`Remove entry: ${entry.time} - ${entry.action} from local data?`)) {
            campaignDataStore.schedules[currentlyEditingScheduleId].splice(index, 1);
            currentSchedulesData = campaignDataStore.schedules; renderScheduleEntriesList();
        }
    }

    // --- Random Encounters CRUD ---
    // ... (Random Encounter CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllRandomEncounterForms() { createRandomEncounterForm.style.display = 'none'; editRandomEncounterForm.style.display = 'none'; originalRandomEncounterDataBeforeEdit = null; }
    function renderRandomEncountersList() {
        randomEncountersList.innerHTML = ''; const filePathForDisplay = randomEncountersFileDisplay.value || "N/A";
        if (currentRandomEncounters.length === 0) { randomEncountersList.innerHTML = `<li>No Random Encounters found or loaded from '${filePathForDisplay}'.</li>`; return; }
        currentRandomEncounters.forEach(group => {
            const li = document.createElement('li');
            li.innerHTML = `ID: ${group.id}, Desc: ${group.description || 'N/A'} (Prob: ${group.probability || 0}, NPCs: ${(group.npcIds || []).join(', ')}) `;
            const editBtn = document.createElement('button'); editBtn.textContent = 'Edit'; editBtn.dataset.encounterId = group.id;
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditRandomEncounter(group.id);
            li.appendChild(editBtn); randomEncountersList.appendChild(li);
        });
    }
    function handleEditRandomEncounter(encounterId) {
        const groupToEdit = campaignDataStore.randomEncounters.find(e => e.id === encounterId);
        if (!groupToEdit) { displayError("Encounter group not found."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        originalRandomEncounterDataBeforeEdit = JSON.parse(JSON.stringify(groupToEdit));
        editingRandomEncounterOriginalIdInput.value = groupToEdit.id; editEncounterIdInput.value = groupToEdit.id;
        editEncounterDescriptionInput.value = groupToEdit.description || '';
        editEncounterProbabilityInput.value = groupToEdit.probability || 0;
        editEncounterNpcIdsInput.value = (groupToEdit.npcIds || []).join(', ');
        editRandomEncounterForm.style.display = 'block';
    }
    showCreateRandomEncounterFormButton.addEventListener('click', () => { if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; } hideAllRandomEncounterForms(); newEncounterIdInput.value = ''; newEncounterDescriptionInput.value = ''; newEncounterProbabilityInput.value = '0.1'; newEncounterNpcIdsInput.value = ''; createRandomEncounterForm.style.display = 'block'; });
    cancelCreateRandomEncounterButton.addEventListener('click', () => { hideAllRandomEncounterForms(); });
    saveNewRandomEncounterButton.addEventListener('click', () => {
        const id = newEncounterIdInput.value.trim(); const desc = newEncounterDescriptionInput.value.trim();
        const prob = parseFloat(newEncounterProbabilityInput.value); const npcIdsStr = newEncounterNpcIdsInput.value.trim();
        if (!id || !desc) { displayError("Group ID and Description required."); return; }
        if (isNaN(prob) || prob < 0 || prob > 1) { displayError("Probability must be 0.0-1.0."); return; }
        if (campaignDataStore.randomEncounters.some(e => e.id === id)) { displayError("Group ID already exists."); return; }
        const npcIds = npcIdsStr ? npcIdsStr.split(',').map(s => s.trim()).filter(s => s) : [];
        campaignDataStore.randomEncounters.push({ id, description: desc, probability: prob, npcIds });
        currentRandomEncounters = campaignDataStore.randomEncounters;
        renderRandomEncountersList(); hideAllRandomEncounterForms(); displayMessage("New encounter group saved to local data.");
    });
    cancelEditRandomEncounterButton.addEventListener('click', () => {
         if(originalRandomEncounterDataBeforeEdit && editingRandomEncounterOriginalIdInput.value){
            const encIndex = campaignDataStore.randomEncounters.findIndex(e => e.id === editingRandomEncounterOriginalIdInput.value);
            if(encIndex !== -1) campaignDataStore.randomEncounters[encIndex] = JSON.parse(JSON.stringify(originalRandomEncounterDataBeforeEdit));
            currentRandomEncounters = campaignDataStore.randomEncounters;
        }
        hideAllRandomEncounterForms();
    });
    saveRandomEncounterChangesButton.addEventListener('click', () => {
        const originalId = editingRandomEncounterOriginalIdInput.value;
        const encIndex = campaignDataStore.randomEncounters.findIndex(e => e.id === originalId);
        if (encIndex === -1) { displayError("Group not found."); return; }
        campaignDataStore.randomEncounters[encIndex].description = editEncounterDescriptionInput.value.trim();
        campaignDataStore.randomEncounters[encIndex].probability = parseFloat(editEncounterProbabilityInput.value);
        campaignDataStore.randomEncounters[encIndex].npcIds = editEncounterNpcIdsInput.value.trim().split(',').map(s => s.trim()).filter(s => s);
        currentRandomEncounters = campaignDataStore.randomEncounters;
        originalRandomEncounterDataBeforeEdit = JSON.parse(JSON.stringify(campaignDataStore.randomEncounters[encIndex]));
        renderRandomEncountersList(); displayMessage("Group changes saved to local data.");
    });
    deleteRandomEncounterButton.addEventListener('click', () => {
        const groupIdDel = editingRandomEncounterOriginalIdInput.value;
        const groupDesc = campaignDataStore.randomEncounters.find(e=>e.id === groupIdDel)?.description || groupIdDel;
        if (!confirm(`Delete group: "${groupDesc}"?`)) return;
        const encIndex = campaignDataStore.randomEncounters.findIndex(e => e.id === groupIdDel);
        if (encIndex === -1) { displayError("Group not found."); return; }
        campaignDataStore.randomEncounters.splice(encIndex, 1); currentRandomEncounters = campaignDataStore.randomEncounters;
        renderRandomEncountersList(); hideAllRandomEncounterForms(); displayMessage("Group deleted from local data.");
    });

    // --- Story Beats CRUD ---
    // ... (Story Beat CRUD functions from previous step, confirmed to use campaignDataStore)
    function hideAllStoryBeatForms() { createStoryBeatForm.style.display = 'none'; }
    function parseStoryBeatValue(valStr) { if (valStr.toLowerCase() === 'true') return true; if (valStr.toLowerCase() === 'false') return false; if (!isNaN(parseFloat(valStr)) && isFinite(valStr)) return parseFloat(valStr); return valStr; }
    function renderStoryBeatsTable() {
        storyBeatsTableBody.innerHTML = ''; const filePathForDisplay = storyBeatsFileDisplay.value || "N/A";
        if (Object.keys(currentStoryBeatsData).length === 0) { storyBeatsTableBody.innerHTML = `<tr><td colspan="3">No Story Beats found or loaded from '${filePathForDisplay}'.</td></tr>`; return; }
        for (const beatId in currentStoryBeatsData) {
            if (currentStoryBeatsData.hasOwnProperty(beatId)) {
                const val = currentStoryBeatsData[beatId]; const row = storyBeatsTableBody.insertRow();
                row.insertCell().textContent = beatId;
                const valCell = row.insertCell(); const valInput = document.createElement('input');
                valInput.type = 'text'; valInput.className = 'story-beat-value-input'; valInput.dataset.beatId = beatId;
                valInput.value = String(val); valCell.appendChild(valInput);
                const actCell = row.insertCell(); const delBtn = document.createElement('button');
                delBtn.textContent = 'Delete'; delBtn.classList.add('button-danger'); delBtn.dataset.beatId = beatId;
                delBtn.onclick = handleDeleteStoryBeat; actCell.appendChild(delBtn);
            }
        }
    }
    function handleDeleteStoryBeat(event) {
        const beatId = event.target.dataset.beatId;
        if (!beatId || !confirm(`Delete beat: "${beatId}" from local data?`)) return;
        if (campaignDataStore.storyBeats.hasOwnProperty(beatId)) {
            delete campaignDataStore.storyBeats[beatId]; currentStoryBeatsData = campaignDataStore.storyBeats;
            renderStoryBeatsTable(); displayMessage(`Beat "${beatId}" deleted from local data.`);
        }
    }
    showCreateStoryBeatFormButton.addEventListener('click', () => { if (!campaignDataStore.manifest) { displayError("Load a campaign first."); return; } hideAllStoryBeatForms(); newStoryBeatIdInput.value = ''; newStoryBeatValueInput.value = 'false'; createStoryBeatForm.style.display = 'block'; });
    cancelCreateStoryBeatButton.addEventListener('click', () => { hideAllStoryBeatForms(); });
    saveNewStoryBeatButton.addEventListener('click', () => {
        const newId = newStoryBeatIdInput.value.trim(); const newValStr = newStoryBeatValueInput.value.trim();
        if (!newId) { displayError("Beat ID required."); return; }
        if (campaignDataStore.storyBeats.hasOwnProperty(newId)) { displayError("Beat ID already exists."); return; }
        campaignDataStore.storyBeats[newId] = parseStoryBeatValue(newValStr); currentStoryBeatsData = campaignDataStore.storyBeats;
        renderStoryBeatsTable(); hideAllStoryBeatForms(); displayMessage(`Beat "${newId}" created in local data.`);
    });
    saveAllStoryBeatChangesButton.addEventListener('click', () => {
        if (!campaignDataStore.storyBeats) { displayError("No Story Beats loaded."); return; }
        const inputs = storyBeatsTableBody.querySelectorAll('.story-beat-value-input');
        inputs.forEach(input => {
            const id = input.dataset.beatId; if (id && campaignDataStore.storyBeats.hasOwnProperty(id)) { // Ensure beat still exists
                campaignDataStore.storyBeats[id] = parseStoryBeatValue(input.value.trim());
            }
        });
        currentStoryBeatsData = campaignDataStore.storyBeats;
        renderStoryBeatsTable();
        displayMessage("Story beat changes saved to local data.");
    });

    // --- Campaign Export Functionality ---
    exportCampaignButton.addEventListener('click', async () => {
        clearErrorMessages();
        if (!campaignDataStore.manifest) {
            displayError("No campaign manifest loaded. Please load a campaign first.");
            return;
        }
        if (!campaignDataStore.manifest.id || !campaignDataStore.manifest.name) {
            displayError("Campaign manifest must have an ID and Name to be exported.");
            return;
        }

        displayMessage("Preparing campaign export...");

        try {
            const zip = new JSZip();
            let baseFolder = currentCampaignRoot; // e.g., "mycampaign/" or ""

            // 1. Add Manifest
            const manifestFileName = campaignDataStore.manifest.fileName || "campaign.json"; // Assuming manifest might store its own preferred filename
            zip.file(baseFolder + manifestFileName, JSON.stringify(campaignDataStore.manifest, null, 2));

            // 2. Add other primary data files based on manifest.filePaths
            const filePaths = campaignDataStore.manifest.filePaths || {};
            const dataMapping = {
                npcs: campaignDataStore.npcs,
                quests: campaignDataStore.quests,
                worldzones: campaignDataStore.zones, // Ensure key matches manifest
                worldmap: campaignDataStore.worldMap,
                schedules: campaignDataStore.schedules,
                randomencounters: campaignDataStore.randomEncounters,
                storybeatsfile: campaignDataStore.storyBeats
            };

            for (const key in filePaths) {
                if (dataMapping.hasOwnProperty(key.toLowerCase())) {
                    const data = dataMapping[key.toLowerCase()];
                    if (data) { // Check if data exists in store
                        const pathInZip = baseFolder + filePaths[key];
                        zip.file(pathInZip, JSON.stringify(data, null, 2));
                    } else {
                        console.warn(`Data for manifest key '${key}' not found in campaignDataStore. Skipping file: ${filePaths[key]}`);
                    }
                } else if (key.toLowerCase() === 'dialogues') {
                    // Dialogue directory path from manifest
                    const dialogueBaseDirInZip = baseFolder + filePaths[key];
                    if (Object.keys(campaignDataStore.dialogues).length > 0) {
                        for (const dialogueFileName in campaignDataStore.dialogues) { // dialogueFileName is relative to dialogueBaseDir
                            const dialogueData = campaignDataStore.dialogues[dialogueFileName];
                            // Ensure dialogueBaseDirInZip ends with a slash if it's a directory
                            const fullDialoguePath = (dialogueBaseDirInZip.endsWith('/') ? dialogueBaseDirInZip : dialogueBaseDirInZip + '/') + dialogueFileName;
                            zip.file(fullDialoguePath, JSON.stringify(dialogueData, null, 2));
                        }
                    }
                }
            }

            // Add any other files that might have been loaded (e.g. from a more complex ZIP structure)
            if (campaignDataStore.otherFiles) {
                for (const otherFilePath in campaignDataStore.otherFiles) {
                     // Assume otherFilePath is already relative to currentCampaignRoot or absolute within the zip context
                    zip.file(baseFolder + otherFilePath, typeof campaignDataStore.otherFiles[otherFilePath] === 'string' ? campaignDataStore.otherFiles[otherFilePath] : JSON.stringify(campaignDataStore.otherFiles[otherFilePath], null, 2));
                }
            }


            // Generate ZIP and trigger download
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const campaignFileName = (campaignDataStore.manifest.name || campaignDataStore.manifest.id || "campaign") + ".zip";

            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = campaignFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            displayMessage(`Campaign "${campaignDataStore.manifest.name}" exported successfully as ${campaignFileName}!`);

        } catch (error) {
            console.error("Error exporting campaign:", error);
            displayError(`Error exporting campaign: ${error.message}`);
        }
    });


    // --- Utility and Cleanup Functions ---
    // ... (clear functions and display/error messages remain the same)
    function clearAllUIAndData() { resetCurrentPathsAndData(); resetCampaignDataStore(); clearManifestDetails(); clearNpcDetails(); clearDialogueDetails(); clearQuestDetails(); clearZoneDetails(); clearWorldMapDetails(); clearScheduleDetails(); clearRandomEncounterDetails(); clearStoryBeatDetails(); clearErrorMessages(); hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms(); console.log("All UI and data cleared."); }
    function clearManifestDetails() { campaignIdInput.value = ''; campaignNameInput.value = ''; campaignVersionInput.value = ''; campaignDescriptionInput.value = ''; campaignAuthorInput.value = ''; }
    function clearNpcDetailsInternal() { currentNpcs = []; hideAllNpcForms(); }
    function clearNpcDetails() { clearNpcDetailsInternal(); npcList.dataset.filePath = "N/A"; renderNpcList(); }
    function clearDialogueEditorFieldsAndState() { dialogueEditorSection.style.display = 'none'; editingDialogueFileNameSpan.textContent = ''; dialogueMetaIdInput.value = ''; dialogueMetaStartingNodeInput.value = ''; dialogueNodeEditArea.style.display = 'none'; editingNodeIdDisplay.textContent = ''; nodeNpcLineTextArea.value = ''; nodePlayerChoicesList.innerHTML = ''; dialogueNodesList.innerHTML = ''; currentDialogueData = null; currentlyEditingDialogueFilePath = null; originalDialogueDataBeforeEdit = null; currentlyEditingNodeId = null; }
    function clearDialogueDetails() { currentDialogueDirectory = ''; currentDialogueFiles = []; dialogueDirectoryDisplay.value = ''; hideAllDialogueForms(); renderDialogueFilesList(); clearDialogueEditorFieldsAndState(); }
    function clearQuestDetails() { currentQuests = []; questsFileDisplay.value = ''; hideAllQuestForms(); renderQuestsList(); }
    function clearZoneDetails() { currentZones = []; zonesFileDisplay.value = ''; hideAllZoneForms(); renderZonesList(); }
    function clearWorldMapDetails() { currentWorldMapData = { nodes: [], connections: [] }; worldMapFileDisplay.value = ''; hideAllWorldMapForms(); renderWorldMapNodesList(); }
    function clearScheduleDetails() { currentSchedulesData = {}; schedulesFileDisplay.value = ''; hideAllScheduleForms(); renderScheduleIdsList(); editScheduleEntriesForm.style.display = 'none'; }
    function clearRandomEncounterDetails() { currentRandomEncounters = []; randomEncountersFileDisplay.value = ''; hideAllRandomEncounterForms(); renderRandomEncountersList(); }
    function clearStoryBeatDetails() { currentStoryBeatsData = {}; storyBeatsFileDisplay.value = ''; hideAllStoryBeatForms(); renderStoryBeatsTable(); }
    function resetCurrentPathsAndData() { currentLoadedFile = null; currentCampaignRoot = ""; currentNpcFilePathFull = null; currentDialogueDirectory = ''; currentQuestsFilePath = ''; currentZonesFilePath = ''; currentWorldMapFilePath = ''; currentSchedulesFilePath = ''; currentRandomEncountersFilePath = ''; currentStoryBeatsFilePath = ''; currentlyEditingDialogueFilePath = null; currentDialogueData = null; originalDialogueDataBeforeEdit = null; currentlyEditingNodeId = null; originalQuestDataBeforeEdit = null; originalZoneDataBeforeEdit = null; originalWorldMapNodeDataBeforeEdit = null; currentlyEditingScheduleId = null; originalSchedulesDataBeforeEdit = null; originalRandomEncounterDataBeforeEdit = null; originalStoryBeatsDataForSaveAttempt = null; }
    function displayError(message) { errorMessagesDiv.textContent = message; errorMessagesDiv.style.color = 'red'; }
    function displayMessage(message) { errorMessagesDiv.textContent = message; errorMessagesDiv.style.color = 'green'; }
    function clearErrorMessages() { errorMessagesDiv.textContent = ''; }


    loadInitialData().then(() => { clearAllUIAndData(); });
    console.log("app.js: Export functionality added.");
});
