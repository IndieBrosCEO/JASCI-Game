document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Getters ---
    const loadManifestButton = document.getElementById('loadManifestButton');
    const saveManifestButton = document.getElementById('saveManifestButton');
    const campaignIdInput = document.getElementById('campaignId');
    const campaignNameInput = document.getElementById('campaignName');
    const campaignVersionInput = document.getElementById('campaignVersion');
    const campaignDescriptionInput = document.getElementById('campaignDescription');
    const campaignAuthorInput = document.getElementById('campaignAuthor');
    const entryMapInput = document.getElementById('entryMap');
    const filePathsList = document.getElementById('filePathsList');
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

    // --- State Variables ---
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
    async function loadNpcTemplates() {
        try {
            const response = await fetch('/api/read-json?path=assets/definitions/base_npc_templates.json');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                console.error('Failed to load NPC templates:', errorData.error || response.status);
                npcTemplates = {}; return;
            }
            npcTemplates = await response.json();
            if (typeof npcTemplates !== 'object' || npcTemplates === null) {
                console.error('Invalid NPC template format: Not an object.');
                npcTemplates = {};
            }
        } catch (error) {
            console.error('Error loading NPC templates:', error);
            npcTemplates = {};
        }
    }

    // --- Manifest Loading ---
    loadManifestButton.addEventListener('click', async () => {
        clearManifestDetails(); clearNpcDetails(); clearDialogueDetails(); clearQuestDetails(); clearZoneDetails(); clearWorldMapDetails(); clearScheduleDetails(); clearRandomEncounterDetails(); clearStoryBeatDetails();
        clearErrorMessages(); hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();

        let filePath = prompt("Enter path to campaign.json (e.g., campaigns/fallbrook/campaign.json):", "campaigns/fallbrook/campaign.json");
        if (!filePath) {
            displayError("File path cannot be empty.");
            return;
        }

        filePath = filePath.trim().replace(/^"|"$/g, ''); // Trim and remove surrounding quotes

        // Attempt to normalize absolute paths containing 'JASCI-Game' to be relative to project root
        // This specifically looks for "JASCI-Game/" followed by "campaigns/" or "assets/"
        const projectFolderName = 'JASCI-Game';
        const relevantSubfolders = ['campaigns/', 'assets/'];
        let foundAndNormalized = false;

        for (const subfolder of relevantSubfolders) {
            // Check for patterns like "JASCI-Game/campaigns/" or "JASCI-Game\campaigns\"
            let searchSegment = projectFolderName + '/' + subfolder;
            let index = filePath.toUpperCase().indexOf(searchSegment.toUpperCase());
            if (index !== -1) {
                // Extract from the start of the subfolder (e.g., "campaigns/...")
                filePath = filePath.substring(index + projectFolderName.length + 1);
                foundAndNormalized = true;
                break;
            }

            // Check for backslash version
            searchSegment = projectFolderName + '\\' + subfolder; // Need to escape backslashes for regex-like string search
            index = filePath.toUpperCase().indexOf(searchSegment.toUpperCase());
            if (index !== -1) {
                filePath = filePath.substring(index + projectFolderName.length + 1).replace(/\\/g, '/'); // Normalize backslashes to forward slashes
                foundAndNormalized = true;
                break;
            }
        }

        // If not normalized yet, and it's an absolute path, it might be problematic.
        // For now, we'll let it pass to the server for the server-side validation to catch,
        // or it might be a relative path that's already correct (e.g. user types 'campaigns/other/').

        console.log(`[App.js] Processed filePath for manifest load: ${filePath}`); // For debugging

        currentManifestPath = filePath;
        currentCampaignRoot = filePath.substring(0, filePath.lastIndexOf('/') + 1);

        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentManifestPath)}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                resetCurrentPathsAndData(); throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            const manifestData = await response.json();
            if (typeof manifestData !== 'object' || manifestData === null) {
                resetCurrentPathsAndData(); displayError("Invalid manifest format."); return;
            }
            populateManifestUI(manifestData);
            if (manifestData.filePaths && typeof manifestData.filePaths === 'object') {
                let npcPathFound = false; let dialoguePathFound = false; let questsPathFound = false; let zonesPathFound = false; let worldMapPathFound = false; let schedulesPathFound = false; let encountersPathFound = false; let storyBeatsPathFound = false;
                for (const key in manifestData.filePaths) {
                    const pathValue = manifestData.filePaths[key];
                    if (key.toLowerCase() === 'npcs' && pathValue) { await loadNpcData(pathValue); npcPathFound = true; }
                    if (key.toLowerCase() === 'dialogues' && pathValue) {
                        currentDialogueDirectory = currentCampaignRoot + pathValue;
                        if (!currentDialogueDirectory.endsWith('/')) currentDialogueDirectory += '/';
                        dialogueDirectoryDisplay.value = currentDialogueDirectory;
                        await loadDialogueFiles(); dialoguePathFound = true;
                    }
                    if (key.toLowerCase() === 'quests' && pathValue) {
                        currentQuestsFilePath = currentCampaignRoot + pathValue;
                        questsFileDisplay.value = currentQuestsFilePath;
                        await loadQuestsData(); questsPathFound = true;
                    }
                    if (key.toLowerCase() === 'worldzones' && pathValue) {
                        currentZonesFilePath = currentCampaignRoot + pathValue;
                        zonesFileDisplay.value = currentZonesFilePath;
                        await loadZonesData(); zonesPathFound = true;
                    }
                    if (key.toLowerCase() === 'worldmap' && pathValue) {
                        currentWorldMapFilePath = currentCampaignRoot + pathValue;
                        worldMapFileDisplay.value = currentWorldMapFilePath;
                        await loadWorldMapData(); worldMapPathFound = true;
                    }
                    if (key.toLowerCase() === 'schedules' && pathValue) {
                        currentSchedulesFilePath = currentCampaignRoot + pathValue;
                        schedulesFileDisplay.value = currentSchedulesFilePath;
                        await loadSchedulesData(); schedulesPathFound = true;
                    }
                    if (key.toLowerCase() === 'randomencounters' && pathValue) {
                        currentRandomEncountersFilePath = currentCampaignRoot + pathValue;
                        randomEncountersFileDisplay.value = currentRandomEncountersFilePath;
                        await loadRandomEncountersData(); encountersPathFound = true;
                    }
                    if (key.toLowerCase() === 'storybeatsfile' && pathValue) {
                        currentStoryBeatsFilePath = currentCampaignRoot + pathValue;
                        storyBeatsFileDisplay.value = currentStoryBeatsFilePath;
                        await loadStoryBeatsData(); storyBeatsPathFound = true;
                    }
                }
                if (!npcPathFound) renderNpcList();
                if (!dialoguePathFound) renderDialogueFilesList();
                if (!questsPathFound) renderQuestsList();
                if (!zonesPathFound) renderZonesList();
                if (!worldMapPathFound) renderWorldMapNodesList();
                if (!schedulesPathFound) renderScheduleIdsList();
                if (!encountersPathFound) renderRandomEncountersList();
                if (!storyBeatsPathFound) renderStoryBeatsTable();
            } else {
                renderNpcList(); renderDialogueFilesList(); renderQuestsList(); renderZonesList(); renderWorldMapNodesList(); renderScheduleIdsList(); renderRandomEncountersList(); renderStoryBeatsTable();
            }
        } catch (error) {
            resetCurrentPathsAndData(); console.error('Error loading manifest:', error);
            displayError(`Error loading manifest: ${error.message}`);
        }
    });
    function populateManifestUI(data) {
        campaignIdInput.value = data.id || '';
        campaignNameInput.value = data.name || '';
        campaignVersionInput.value = data.version || '';
        campaignDescriptionInput.value = data.description || '';
        campaignAuthorInput.value = data.author || '';
        entryMapInput.value = data.entryMap || '';

        filePathsList.innerHTML = '';
        if (data.filePaths && typeof data.filePaths === 'object' && Object.keys(data.filePaths).length > 0) {
            for (const key in data.filePaths) {
                const listItem = document.createElement('li');
                listItem.textContent = `${key}: ${data.filePaths[key]}`;
                filePathsList.appendChild(listItem);
            }
        } else {
            filePathsList.innerHTML = "<li>No data file paths defined in manifest.</li>";
        }
    }

    // --- NPC Data & Functions ---
    function hideAllNpcForms() {
        createNpcForm.style.display = 'none';
        editNpcForm.style.display = 'none';
        editingNpcOriginalIdInput.value = '';
        editNpcTemplateIdInput.value = '';
    }
    async function loadNpcData(npcFilePathRelative) {
        if (!currentCampaignRoot) { displayError("Campaign root path not set."); return; }
        currentNpcFilePathFull = currentCampaignRoot + npcFilePathRelative;
        clearNpcDetailsInternal();
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentNpcFilePathFull)}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                throw new Error(`Failed to load NPCs: ${errorData.error || response.status}`);
            }
            currentNpcs = await response.json();
            if (!Array.isArray(currentNpcs)) currentNpcs = [];
        } catch (error) {
            console.error('Error loading NPC data:', error); displayError(`Error loading NPC data: ${error.message}`);
            currentNpcs = [];
        }
        renderNpcList();
    }
    function renderNpcList() {
        npcList.innerHTML = '';
        if (currentNpcs.length === 0) {
            npcList.innerHTML = `<li>No NPCs found or loaded from '${currentNpcFilePathFull || 'N/A'}'.</li>`; return;
        }
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
        const npcToEdit = currentNpcs.find(npc => npc.id === npcId);
        if (npcToEdit) {
            hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
            editingNpcOriginalIdInput.value = npcToEdit.id;
            editNpcIdInput.value = npcToEdit.id;
            editNpcNameInput.value = npcToEdit.name || '';
            editNpcTemplateIdInput.value = npcToEdit.templateId || 'None';
            editNpcForm.style.display = 'block'; clearErrorMessages();
        } else { displayError("Could not find NPC to edit."); }
    }
    showCreateNpcFormButton.addEventListener('click', () => {
        if (!currentNpcFilePathFull) { displayError("NPC file path not known."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        createNpcIdInput.value = ''; createNpcNameInput.value = '';
        createNpcForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateNpcButton.addEventListener('click', () => { hideAllNpcForms(); });
    saveNewNpcButton.addEventListener('click', async () => {
        const newId = createNpcIdInput.value.trim();
        const newName = createNpcNameInput.value.trim();
        if (!newId || !newName) { displayError("NPC ID and Name are required."); return; }
        if (currentNpcs.some(npc => npc.id === newId)) { displayError(`NPC ID '${newId}' already exists.`); return; }
        const newNpc = { id: newId, name: newName };
        const oldNpcs = [...currentNpcs]; currentNpcs.push(newNpc);
        renderNpcList(); hideAllNpcForms();
        if (!currentNpcFilePathFull) { displayError("Critical: NPC file path missing."); currentNpcs = oldNpcs; renderNpcList(); return; }
        try { await saveNpcsToFile(); displayMessage("New NPC saved!"); }
        catch (error) { displayError(`Error saving NPC: ${error.message}`); currentNpcs = oldNpcs; renderNpcList(); }
    });
    cancelEditNpcButton.addEventListener('click', () => { hideAllNpcForms(); });
    saveNpcChangesButton.addEventListener('click', async () => {
        const originalId = editingNpcOriginalIdInput.value;
        const newName = editNpcNameInput.value.trim();
        if (!newName) { displayError("NPC Name cannot be empty."); return; }
        const npcIndex = currentNpcs.findIndex(npc => npc.id === originalId);
        if (npcIndex === -1) { displayError("Could not find NPC to update."); hideAllNpcForms(); return; }
        const oldNpcData = { ...currentNpcs[npcIndex] }; currentNpcs[npcIndex].name = newName;
        renderNpcList(); hideAllNpcForms();
        if (!currentNpcFilePathFull) { displayError("Critical: NPC file path missing."); currentNpcs[npcIndex] = oldNpcData; renderNpcList(); return; }
        try { await saveNpcsToFile(); displayMessage("NPC changes saved!"); }
        catch (error) { displayError(`Error saving NPC changes: ${error.message}`); currentNpcs[npcIndex] = oldNpcData; renderNpcList(); }
    });
    deleteNpcButton.addEventListener('click', async () => {
        const npcIdToDelete = editingNpcOriginalIdInput.value;
        if (!npcIdToDelete) { displayError("No NPC selected to delete."); return; }
        if (!confirm(`Delete NPC ID: ${npcIdToDelete}?`)) return;
        const npcIndex = currentNpcs.findIndex(npc => npc.id === npcIdToDelete);
        if (npcIndex === -1) { displayError(`NPC ID '${npcIdToDelete}' not found.`); hideAllNpcForms(); return; }
        const deletedNpcData = { ...currentNpcs[npcIndex] }; const oldNpcs = [...currentNpcs];
        currentNpcs.splice(npcIndex, 1);
        renderNpcList(); hideAllNpcForms();
        if (!currentNpcFilePathFull) { displayError("Critical: NPC file path missing."); currentNpcs = oldNpcs; renderNpcList(); return; }
        try { await saveNpcsToFile(); displayMessage(`NPC '${deletedNpcData.name}' deleted.`); }
        catch (error) { displayError(`Error deleting NPC: ${error.message}. Reverted.`); currentNpcs = oldNpcs; renderNpcList(); }
    });
    duplicateNpcButton.addEventListener('click', async () => {
        const originalNpcId = editingNpcOriginalIdInput.value;
        if (!originalNpcId) { displayError("No NPC selected to duplicate."); return; }
        const originalNpc = currentNpcs.find(npc => npc.id === originalNpcId);
        if (!originalNpc) { displayError(`Original NPC ID '${originalNpcId}' not found.`); return; }
        let newNpcId = ''; let promptCancelled = false;
        while (true) {
            newNpcId = prompt(`New unique ID for duplicated NPC (original: ${originalNpcId}):`);
            if (newNpcId === null) { promptCancelled = true; break; }
            newNpcId = newNpcId.trim();
            if (!newNpcId) { alert("New ID cannot be empty."); continue; }
            if (currentNpcs.some(npc => npc.id === newNpcId)) { alert(`ID '${newNpcId}' already exists.`); continue; }
            break;
        }
        if (promptCancelled) { displayMessage("Duplication cancelled."); return; }
        const duplicatedNpc = JSON.parse(JSON.stringify(originalNpc)); duplicatedNpc.id = newNpcId;
        const oldNpcs = [...currentNpcs]; currentNpcs.push(duplicatedNpc);
        renderNpcList(); hideAllNpcForms();
        if (!currentNpcFilePathFull) { displayError("Critical: NPC file path missing."); currentNpcs = oldNpcs; renderNpcList(); return; }
        try { await saveNpcsToFile(); displayMessage(`NPC '${originalNpc.name}' duplicated as '${newNpcId}'.`); }
        catch (error) { displayError(`Error saving duplicated NPC: ${error.message}. Reverted.`); currentNpcs = oldNpcs; renderNpcList(); }
    });
    async function saveNpcsToFile() {
        if (!currentNpcFilePathFull) throw new Error("NPC file path undefined.");
        const response = await fetch('/api/write-json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentNpcFilePathFull, data: currentNpcs }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        return await response.json();
    }

    // --- Dialogue Files & Node Editor ---
    function hideAllDialogueForms() {
        createDialogueFileForm.style.display = 'none';
        dialogueEditorSection.style.display = 'none';
        textualDialogueEditorControlsDiv.style.display = 'none';
        visualDialogueEditorPlaceholderDiv.style.display = 'none';
        dialogueNodeEditArea.style.display = 'none';
        originalDialogueDataBeforeEdit = null;
        currentlyEditingNodeId = null;
        toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
    }

    showCreateDialogueFileFormButton.addEventListener('click', () => {
        if (!currentDialogueDirectory) {
            displayError("Dialogue directory not set. Load a campaign manifest with a dialogue path.");
            return;
        }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        newDialogueFileNameInput.value = '';
        newDialogueIdInput.value = '';
        createDialogueFileForm.style.display = 'block';
        clearErrorMessages();
    });
    cancelCreateDialogueFileButton.addEventListener('click', () => { hideAllDialogueForms(); });
    saveNewDialogueFileButton.addEventListener('click', async () => {
        const newFileName = newDialogueFileNameInput.value.trim();
        const newDialogueIdValue = newDialogueIdInput.value.trim();
        if (!newFileName || !newDialogueIdValue) { displayError("File Name and Dialogue ID are required."); return; }
        if (!newFileName.endsWith('.json')) { displayError("File Name must end with .json"); return; }
        if (currentDialogueFiles.includes(newFileName)) { displayError(`File "${newFileName}" already exists.`); return; }
        const fullPath = currentDialogueDirectory + newFileName;
        const newDialogueContent = { id: newDialogueIdValue, startingNode: "start", nodes: { "start": { nodeId: "start", npcLine: "Hello.", choices: [] } } };
        try {
            const response = await fetch('/api/write-json', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: fullPath, data: newDialogueContent }),
            });
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            hideAllDialogueForms(); await loadDialogueFiles();
            displayMessage(`Dialogue file "${newFileName}" created.`);
        } catch (error) { displayError(`Error creating dialogue file: ${error.message}`); }
    });
    async function loadDialogueFiles() {
        if (!currentDialogueDirectory) { renderDialogueFilesList(); return; }
        try {
            const response = await fetch(`/api/list-files?directoryPath=${encodeURIComponent(currentDialogueDirectory)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentDialogueFiles = await response.json();
            if (!Array.isArray(currentDialogueFiles)) { currentDialogueFiles = []; throw new Error("Invalid files list format."); }
        } catch (error) { displayError(`Error loading dialogue files: ${error.message}`); currentDialogueFiles = []; }
        renderDialogueFilesList();
    }
    function renderDialogueFilesList() {
        dialogueFilesList.innerHTML = '';
        if (!currentDialogueDirectory) { dialogueFilesList.innerHTML = '<li>Dialogue directory not specified.</li>'; return; }
        if (currentDialogueFiles.length === 0) { dialogueFilesList.innerHTML = `<li>No JSON files in '${currentDialogueDirectory}'.</li>`; return; }
        currentDialogueFiles.forEach(fileName => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#'; link.textContent = fileName; link.dataset.filename = fileName;
            link.onclick = (e) => { e.preventDefault(); loadDialogueFileContent(fileName); };
            li.appendChild(link);
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete'; delBtn.classList.add('button-danger'); delBtn.dataset.filename = fileName;
            delBtn.style.marginLeft = '10px'; delBtn.onclick = handleDeleteDialogueFile;
            li.appendChild(delBtn);
            dialogueFilesList.appendChild(li);
        });
    }

    async function loadDialogueFileContent(fileName) {
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        currentlyEditingDialogueFilePath = currentDialogueDirectory + fileName;
        editingDialogueFileNameSpan.textContent = fileName;
        clearErrorMessages();
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentlyEditingDialogueFilePath)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentDialogueData = await response.json();
            if (!currentDialogueData.nodes) currentDialogueData.nodes = {};
            if (typeof currentDialogueData.id === 'undefined') currentDialogueData.id = "";
            if (typeof currentDialogueData.startingNode === 'undefined') currentDialogueData.startingNode = "";
            originalDialogueDataBeforeEdit = JSON.parse(JSON.stringify(currentDialogueData));
            dialogueMetaIdInput.value = currentDialogueData.id;
            dialogueMetaStartingNodeInput.value = currentDialogueData.startingNode;
            renderSelectableDialogueNodesList();
            dialogueEditorSection.style.display = 'block';
            textualDialogueEditorControlsDiv.style.display = 'block';
            visualDialogueEditorPlaceholderDiv.style.display = 'none';
            toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
            dialogueNodeEditArea.style.display = 'none';
        } catch (error) { displayError(`Error loading dialogue: ${error.message}`); clearDialogueEditorFieldsAndState(); }
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

    nodeNpcLineTextArea.addEventListener('change', (event) => {
        if (currentlyEditingNodeId && currentDialogueData.nodes[currentlyEditingNodeId]) {
            currentDialogueData.nodes[currentlyEditingNodeId].npcLine = event.target.value;
        }
    });
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
    saveDialogueChangesButton.addEventListener('click', async () => {
        if (!currentDialogueData || !currentlyEditingDialogueFilePath) { displayError("No dialogue loaded."); return; }
        const newDialogueIdValue = dialogueMetaIdInput.value.trim();
        const newStartingNodeValue = dialogueMetaStartingNodeInput.value.trim();
        if (!newDialogueIdValue) { displayError("Dialogue ID cannot be empty."); return; }
        const dataToSave = JSON.parse(JSON.stringify(currentDialogueData));
        dataToSave.id = newDialogueIdValue; dataToSave.startingNode = newStartingNodeValue;
        try {
            await fetch('/api/write-json', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: currentlyEditingDialogueFilePath, data: dataToSave }),
            }).then(async response => {
                if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
                currentDialogueData = JSON.parse(JSON.stringify(dataToSave));
                originalDialogueDataBeforeEdit = JSON.parse(JSON.stringify(currentDialogueData));
                displayMessage("Dialogue changes saved.");
            });
        } catch (error) {
            displayError(`Error saving dialogue: ${error.message}`);
            if (originalDialogueDataBeforeEdit) {
                currentDialogueData = JSON.parse(JSON.stringify(originalDialogueDataBeforeEdit));
                dialogueMetaIdInput.value = currentDialogueData.id || '';
                dialogueMetaStartingNodeInput.value = currentDialogueData.startingNode || '';
                renderSelectableDialogueNodesList();
                if (currentlyEditingNodeId && currentDialogueData.nodes[currentlyEditingNodeId]) {
                    selectDialogueNodeForEditing(currentlyEditingNodeId);
                } else { dialogueNodeEditArea.style.display = 'none'; }
            }
        }
    });
    async function handleDeleteDialogueFile(event) {
        const fileName = event.target.dataset.filename;
        if (!fileName) { displayError("Could not determine file."); return; }
        const fullPath = currentDialogueDirectory + fileName;
        if (!confirm(`Delete dialogue file: "${fileName}"?`)) return;
        try {
            const response = await fetch('/api/delete-file', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: fullPath }),
            });
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            displayMessage(`Dialogue file "${fileName}" deleted.`);
            if (currentlyEditingDialogueFilePath === fullPath) clearDialogueEditorFieldsAndState();
            await loadDialogueFiles();
        } catch (error) { displayError(`Error deleting dialogue file: ${error.message}`); }
    }
    refreshDialogueListButton.addEventListener('click', loadDialogueFiles);
    toggleVisualDialogueEditorButton.addEventListener('click', () => {
        if (visualDialogueEditorPlaceholderDiv.style.display === 'none') {
            visualDialogueEditorPlaceholderDiv.style.display = 'block';
            textualDialogueEditorControlsDiv.style.display = 'none';
            toggleVisualDialogueEditorButton.textContent = "Show Textual Editor";
        } else {
            visualDialogueEditorPlaceholderDiv.style.display = 'none';
            if (currentDialogueData) {
                textualDialogueEditorControlsDiv.style.display = 'block';
            } else {
                textualDialogueEditorControlsDiv.style.display = 'none';
            }
            toggleVisualDialogueEditorButton.textContent = "Toggle Visual Editor Mockup";
        }
    });

    // --- Quests & Objectives ---
    function hideAllQuestForms() {
        createQuestForm.style.display = 'none';
        editQuestForm.style.display = 'none';
        originalQuestDataBeforeEdit = null;
        questObjectivesList.innerHTML = '';
    }
    showCreateQuestFormButton.addEventListener('click', () => {
        if (!currentQuestsFilePath) { displayError("Quests file path not set."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        newQuestIdInput.value = ''; newQuestTitleInput.value = ''; newQuestDescriptionInput.value = '';
        createQuestForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateQuestButton.addEventListener('click', () => { hideAllQuestForms(); });
    saveNewQuestButton.addEventListener('click', async () => {
        const newId = newQuestIdInput.value.trim(); const newTitle = newQuestTitleInput.value.trim(); const newDesc = newQuestDescriptionInput.value.trim();
        if (!newId || !newTitle) { displayError("Quest ID and Title are required."); return; }
        if (currentQuests.some(q => q.id === newId)) { displayError(`Quest ID '${newId}' already exists.`); return; }
        const newQuest = { id: newId, title: newTitle, description: newDesc, objectives: [], rewards: {}, conditions: {} };
        const oldQuests = [...currentQuests]; currentQuests.push(newQuest);
        renderQuestsList(); hideAllQuestForms();
        try { await saveQuestsToFile(); displayMessage("New quest saved!"); }
        catch (error) { displayError(`Error saving quest: ${error.message}`); currentQuests = oldQuests; renderQuestsList(); }
    });
    async function saveQuestsToFile() {
        if (!currentQuestsFilePath) throw new Error("Quests file path undefined.");
        const response = await fetch('/api/write-json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentQuestsFilePath, data: currentQuests }),
        });
        if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
        return await response.json();
    }
    async function loadQuestsData() {
        if (!currentQuestsFilePath) { renderQuestsList(); return; }
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentQuestsFilePath)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentQuests = await response.json();
            if (!Array.isArray(currentQuests)) { console.error("Invalid quests format.", currentQuests); currentQuests = []; }
        } catch (error) { displayError(`Error loading quests: ${error.message}`); currentQuests = []; }
        renderQuestsList();
    }
    function renderQuestsList() {
        questsList.innerHTML = '';
        if (!currentQuestsFilePath) { questsList.innerHTML = '<li>Quests file path not specified.</li>'; return; }
        if (currentQuests.length === 0) { questsList.innerHTML = `<li>No quests in '${currentQuestsFilePath}'.</li>`; return; }
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
        const quest = currentQuests.find(q => q.id === questId);
        if (!quest || !quest.objectives || isNaN(index) || index < 0 || index >= quest.objectives.length) return;
        let propName = '';
        if (target.classList.contains('quest-obj-type-input')) propName = 'type';
        else if (target.classList.contains('quest-obj-target-input')) propName = 'target';
        else if (target.classList.contains('quest-obj-count-input')) propName = 'count';
        else if (target.classList.contains('quest-obj-desc-input')) propName = 'description';
        if (propName) {
            let value = target.value;
            if (propName === 'count') value = parseInt(value) || 1;
            quest.objectives[index][propName] = value;
        }
    });
    questObjectivesList.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-quest-objective-button')) {
            const index = parseInt(event.target.dataset.index);
            const questId = editingQuestOriginalIdInput.value;
            const quest = currentQuests.find(q => q.id === questId);
            if (quest && quest.objectives && !isNaN(index) && index >= 0 && index < quest.objectives.length) {
                if (confirm(`Remove objective: "${quest.objectives[index].description || 'New Objective'}"?`)) {
                    quest.objectives.splice(index, 1); renderQuestObjectives(quest);
                }
            }
        }
    });
    addNewQuestObjectiveRowButton.addEventListener('click', () => {
        const questId = editingQuestOriginalIdInput.value;
        const quest = currentQuests.find(q => q.id === questId);
        if (!quest) { displayError("No quest selected."); return; }
        if (!quest.objectives) quest.objectives = [];
        quest.objectives.push({ type: "", target: "", count: 1, description: "New Objective" });
        renderQuestObjectives(quest);
    });
    function handleEditQuest(questId) {
        const questToEdit = currentQuests.find(q => q.id === questId);
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
    cancelEditQuestButton.addEventListener('click', () => { hideAllQuestForms(); });
    saveQuestChangesButton.addEventListener('click', async () => {
        const originalId = editingQuestOriginalIdInput.value;
        if (!originalQuestDataBeforeEdit || originalQuestDataBeforeEdit.id !== originalId) { displayError("No quest loaded or ID mismatch."); return; }
        const newTitle = editQuestTitleInput.value.trim();
        const newDesc = editQuestDescriptionInput.value.trim();
        if (!newTitle) { displayError("Quest Title cannot be empty."); return; }
        const qIndex = currentQuests.findIndex(q => q.id === originalId);
        if (qIndex === -1) { displayError(`Quest ID '${originalId}' not found.`); hideAllQuestForms(); return; }
        const prevQuestState = JSON.parse(JSON.stringify(currentQuests[qIndex]));
        currentQuests[qIndex].title = newTitle; currentQuests[qIndex].description = newDesc;
        renderQuestsList();
        try {
            await saveQuestsToFile();
            originalQuestDataBeforeEdit = JSON.parse(JSON.stringify(currentQuests[qIndex]));
            displayMessage("Quest changes saved.");
        } catch (error) {
            displayError(`Error saving quest: ${error.message}`);
            currentQuests[qIndex] = prevQuestState;
            editQuestTitleInput.value = currentQuests[qIndex].title;
            editQuestDescriptionInput.value = currentQuests[qIndex].description;
            renderQuestObjectives(currentQuests[qIndex]); renderQuestsList();
        }
    });
    deleteQuestButton.addEventListener('click', async () => {
        const questIdDel = editingQuestOriginalIdInput.value;
        if (!questIdDel) { displayError("No quest selected."); return; }
        const qDel = currentQuests.find(q => q.id === questIdDel);
        if (!qDel) { displayError(`Quest ID '${questIdDel}' not found.`); hideAllQuestForms(); return; }
        if (!confirm(`Delete quest: "${qDel.title || questIdDel}"?`)) return;
        const oldQs = [...currentQuests]; const qIdx = currentQuests.findIndex(q => q.id === questIdDel);
        if (qIdx !== -1) currentQuests.splice(qIdx, 1); else { displayError("Quest not found for deletion."); return; }
        renderQuestsList(); hideAllQuestForms();
        try { await saveQuestsToFile(); displayMessage(`Quest "${qDel.title || questIdDel}" deleted.`); }
        catch (error) { displayError(`Error deleting: ${error.message}. Reverted.`); currentQuests = oldQs; renderQuestsList(); }
    });

    // --- Zones ---
    function hideAllZoneForms() { createZoneForm.style.display = 'none'; editZoneForm.style.display = 'none'; originalZoneDataBeforeEdit = null; }
    async function loadZonesData() {
        if (!currentZonesFilePath) { renderZonesList(); return; }
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentZonesFilePath)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentZones = await response.json();
            if (!Array.isArray(currentZones)) { console.error("Invalid zones format.", currentZones); currentZones = []; }
        } catch (error) { displayError(`Error loading zones: ${error.message}`); currentZones = []; }
        renderZonesList();
    }
    function renderZonesList() {
        zonesList.innerHTML = '';
        if (!currentZonesFilePath) { zonesList.innerHTML = '<li>Zones file path not specified.</li>'; return; }
        if (currentZones.length === 0) { zonesList.innerHTML = `<li>No zones in '${currentZonesFilePath}'.</li>`; return; }
        currentZones.forEach(zone => {
            const li = document.createElement('li');
            li.innerHTML = `ID: ${zone.id || 'N/A'}, Name: ${zone.name || 'Untitled'} `;
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit'; editBtn.dataset.zoneId = zone.id;
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditZone(zone.id);
            li.appendChild(editBtn);
            zonesList.appendChild(li);
        });
    }
    async function saveZonesToFile() {
        if (!currentZonesFilePath) throw new Error("Zones file path undefined.");
        const response = await fetch('/api/write-json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentZonesFilePath, data: currentZones }),
        });
        if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
        return await response.json();
    }
    function handleEditZone(zoneId) {
        const zoneToEdit = currentZones.find(z => z.id === zoneId);
        if (!zoneToEdit) { displayError(`Zone ID '${zoneId}' not found.`); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        originalZoneDataBeforeEdit = JSON.parse(JSON.stringify(zoneToEdit));
        editingZoneOriginalIdInput.value = zoneToEdit.id;
        editZoneIdInput.value = zoneToEdit.id;
        editZoneNameInput.value = zoneToEdit.name || '';
        editZoneMapFilePathInput.value = zoneToEdit.mapFilePath || '';
        editZoneForm.style.display = 'block'; clearErrorMessages();
    }
    showCreateZoneFormButton.addEventListener('click', () => {
        if (!currentZonesFilePath) { displayError("Zones file path not set."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        newZoneIdInput.value = ''; newZoneNameInput.value = ''; newZoneMapFilePathInput.value = '';
        createZoneForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateZoneButton.addEventListener('click', () => { hideAllZoneForms(); });
    saveNewZoneButton.addEventListener('click', async () => {
        const id = newZoneIdInput.value.trim(); const name = newZoneNameInput.value.trim(); const mapFilePath = newZoneMapFilePathInput.value.trim();
        if (!id || !name) { displayError("Zone ID and Name required."); return; }
        if (currentZones.some(z => z.id === id)) { displayError(`Zone ID '${id}' already exists.`); return; }
        const newZone = { id, name, mapFilePath, npcs: [], items: [], triggers: [] };
        const oldZones = [...currentZones]; currentZones.push(newZone);
        renderZonesList(); hideAllZoneForms();
        try { await saveZonesToFile(); displayMessage("New zone saved!"); }
        catch (error) { displayError(`Error saving zone: ${error.message}`); currentZones = oldZones; renderZonesList(); }
    });
    cancelEditZoneButton.addEventListener('click', () => { hideAllZoneForms(); });
    saveZoneChangesButton.addEventListener('click', async () => {
        const originalId = editingZoneOriginalIdInput.value;
        if (!originalZoneDataBeforeEdit || originalZoneDataBeforeEdit.id !== originalId) { displayError("No zone loaded or ID mismatch."); return; }
        const newName = editZoneNameInput.value.trim(); const newMap = editZoneMapFilePathInput.value.trim();
        if (!newName) { displayError("Zone Name required."); return; }
        const zIndex = currentZones.findIndex(z => z.id === originalId);
        if (zIndex === -1) { displayError(`Zone ID '${originalId}' not found.`); hideAllZoneForms(); return; }
        const prevZoneState = JSON.parse(JSON.stringify(currentZones[zIndex]));
        currentZones[zIndex].name = newName; currentZones[zIndex].mapFilePath = newMap;
        renderZonesList();
        try { await saveZonesToFile(); originalZoneDataBeforeEdit = JSON.parse(JSON.stringify(currentZones[zIndex])); displayMessage("Zone changes saved."); }
        catch (error) {
            displayError(`Error saving zone: ${error.message}`); currentZones[zIndex] = prevZoneState;
            editZoneNameInput.value = currentZones[zIndex].name; editZoneMapFilePathInput.value = currentZones[zIndex].mapFilePath;
            renderZonesList();
        }
    });
    deleteZoneButton.addEventListener('click', async () => {
        const zoneIdDel = editingZoneOriginalIdInput.value;
        if (!zoneIdDel) { displayError("No zone selected."); return; }
        const zDel = currentZones.find(z => z.id === zoneIdDel);
        if (!zDel) { displayError(`Zone ID '${zoneIdDel}' not found.`); hideAllZoneForms(); return; }
        if (!confirm(`Delete zone: "${zDel.name || zoneIdDel}"?`)) return;
        const oldZs = [...currentZones]; const zIdx = currentZones.findIndex(z => z.id === zoneIdDel);
        if (zIdx !== -1) currentZones.splice(zIdx, 1); else { displayError("Zone not found for deletion."); return; }
        renderZonesList(); hideAllZoneForms();
        try { await saveZonesToFile(); displayMessage(`Zone "${zDel.name || zoneIdDel}" deleted.`); }
        catch (error) { displayError(`Error deleting: ${error.message}. Reverted.`); currentZones = oldZs; renderZonesList(); }
    });

    // --- World Map Nodes ---
    function hideAllWorldMapForms() { createWorldMapNodeForm.style.display = 'none'; editWorldMapNodeForm.style.display = 'none'; originalWorldMapNodeDataBeforeEdit = null; }
    async function loadWorldMapData() {
        if (!currentWorldMapFilePath) { renderWorldMapNodesList(); return; }
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentWorldMapFilePath)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentWorldMapData = await response.json();
            if (!currentWorldMapData) currentWorldMapData = { nodes: [], connections: [] };
            if (!Array.isArray(currentWorldMapData.nodes)) currentWorldMapData.nodes = [];
            if (!Array.isArray(currentWorldMapData.connections)) currentWorldMapData.connections = [];
        } catch (error) { displayError(`Error loading world map: ${error.message}`); currentWorldMapData = { nodes: [], connections: [] }; }
        renderWorldMapNodesList();
    }
    function renderWorldMapNodesList() {
        worldMapNodesList.innerHTML = '';
        if (!currentWorldMapFilePath) { worldMapNodesList.innerHTML = '<li>World Map file not specified.</li>'; return; }
        if (!currentWorldMapData || currentWorldMapData.nodes.length === 0) { worldMapNodesList.innerHTML = `<li>No nodes in '${currentWorldMapFilePath}'.</li>`; return; }
        currentWorldMapData.nodes.forEach(node => {
            const li = document.createElement('li');
            li.innerHTML = `ID: ${node.id}, Name: ${node.name || 'Unnamed'} (Zone: ${node.zoneId || 'None'}) `;
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit'; editBtn.dataset.nodeId = node.id;
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditWorldMapNode(node.id);
            li.appendChild(editBtn);
            worldMapNodesList.appendChild(li);
        });
    }
    async function saveWorldMapDataToFile() {
        if (!currentWorldMapFilePath) throw new Error("World map file path undefined.");
        if (!currentWorldMapData) throw new Error("World map data is null.");
        const response = await fetch('/api/write-json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentWorldMapFilePath, data: currentWorldMapData }),
        });
        if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
        return await response.json();
    }
    function handleEditWorldMapNode(nodeId) {
        if (!currentWorldMapData || !currentWorldMapData.nodes) return;
        const nodeToEdit = currentWorldMapData.nodes.find(n => n.id === nodeId);
        if (!nodeToEdit) { displayError(`Node ID '${nodeId}' not found.`); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        originalWorldMapNodeDataBeforeEdit = JSON.parse(JSON.stringify(nodeToEdit));
        editingWorldMapNodeOriginalIdInput.value = nodeToEdit.id;
        editWorldMapNodeIdInput.value = nodeToEdit.id;
        editWorldMapNodeNameInput.value = nodeToEdit.name || '';
        editWorldMapNodeZoneIdInput.value = nodeToEdit.zoneId || '';
        editWorldMapNodeForm.style.display = 'block'; clearErrorMessages();
    }
    showCreateWorldMapNodeFormButton.addEventListener('click', () => {
        if (!currentWorldMapFilePath) { displayError("World Map file path not set."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        newWorldMapNodeIdInput.value = ''; newWorldMapNodeNameInput.value = ''; newWorldMapNodeZoneIdInput.value = '';
        createWorldMapNodeForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateWorldMapNodeButton.addEventListener('click', () => { hideAllWorldMapForms(); });
    saveNewWorldMapNodeButton.addEventListener('click', async () => {
        const id = newWorldMapNodeIdInput.value.trim(); const name = newWorldMapNodeNameInput.value.trim(); const zoneId = newWorldMapNodeZoneIdInput.value.trim() || null;
        if (!id || !name) { displayError("Node ID and Name required."); return; }
        if (!currentWorldMapData) currentWorldMapData = { nodes: [], connections: [] };
        if (currentWorldMapData.nodes.some(n => n.id === id)) { displayError(`Node ID '${id}' already exists.`); return; }
        const newNode = { id, name, zoneId };
        const oldMapData = JSON.parse(JSON.stringify(currentWorldMapData));
        currentWorldMapData.nodes.push(newNode);
        renderWorldMapNodesList(); hideAllWorldMapForms();
        try { await saveWorldMapDataToFile(); displayMessage("New map node saved!"); }
        catch (error) { displayError(`Error saving node: ${error.message}`); currentWorldMapData = oldMapData; renderWorldMapNodesList(); }
    });
    cancelEditWorldMapNodeButton.addEventListener('click', () => { hideAllWorldMapForms(); });
    saveWorldMapNodeChangesButton.addEventListener('click', async () => {
        const originalId = editingWorldMapNodeOriginalIdInput.value;
        if (!originalWorldMapNodeDataBeforeEdit || originalWorldMapNodeDataBeforeEdit.id !== originalId) { displayError("No node loaded or ID mismatch."); return; }
        const newName = editWorldMapNodeNameInput.value.trim(); const newZoneId = editWorldMapNodeZoneIdInput.value.trim() || null;
        if (!newName) { displayError("Node Name required."); return; }
        const nodeIdx = currentWorldMapData.nodes.findIndex(n => n.id === originalId);
        if (nodeIdx === -1) { displayError(`Node ID '${originalId}' not found.`); hideAllWorldMapForms(); return; }
        const prevNodeState = JSON.parse(JSON.stringify(currentWorldMapData.nodes[nodeIdx]));
        currentWorldMapData.nodes[nodeIdx].name = newName; currentWorldMapData.nodes[nodeIdx].zoneId = newZoneId;
        renderWorldMapNodesList();
        try { await saveWorldMapDataToFile(); originalWorldMapNodeDataBeforeEdit = JSON.parse(JSON.stringify(currentWorldMapData.nodes[nodeIdx])); displayMessage("Node changes saved."); }
        catch (error) {
            displayError(`Error saving node: ${error.message}`); currentWorldMapData.nodes[nodeIdx] = prevNodeState;
            editWorldMapNodeNameInput.value = currentWorldMapData.nodes[nodeIdx].name;
            editWorldMapNodeZoneIdInput.value = currentWorldMapData.nodes[nodeIdx].zoneId || '';
            renderWorldMapNodesList();
        }
    });
    deleteWorldMapNodeButton.addEventListener('click', async () => {
        const nodeIdDel = editingWorldMapNodeOriginalIdInput.value;
        if (!nodeIdDel) { displayError("No node selected."); return; }
        const nDel = currentWorldMapData.nodes.find(n => n.id === nodeIdDel);
        if (!nDel) { displayError(`Node ID '${nodeIdDel}' not found.`); hideAllWorldMapForms(); return; }
        if (!confirm(`Delete node: "${nDel.name || nodeIdDel}"? Associated connections will be removed.`)) return;
        const oldMapData = JSON.parse(JSON.stringify(currentWorldMapData));
        const nIdx = currentWorldMapData.nodes.findIndex(n => n.id === nodeIdDel);
        if (nIdx !== -1) currentWorldMapData.nodes.splice(nIdx, 1); else { displayError("Node not found for deletion."); return; }
        if (currentWorldMapData.connections) {
            currentWorldMapData.connections = currentWorldMapData.connections.filter(c => c.from !== nodeIdDel && c.to !== nodeIdDel);
        }
        renderWorldMapNodesList(); hideAllWorldMapForms();
        try { await saveWorldMapDataToFile(); displayMessage(`Node "${nDel.name || nodeIdDel}" deleted.`); }
        catch (error) { displayError(`Error deleting node: ${error.message}. Reverted.`); currentWorldMapData = oldMapData; renderWorldMapNodesList(); }
    });

    // --- Schedules ---
    function hideAllScheduleForms() { createScheduleIdForm.style.display = 'none'; editScheduleEntriesForm.style.display = 'none'; currentlyEditingScheduleId = null; originalSchedulesDataBeforeEdit = null; }
    async function loadSchedulesData() {
        if (!currentSchedulesFilePath) { renderScheduleIdsList(); return; }
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentSchedulesFilePath)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentSchedulesData = await response.json();
            if (typeof currentSchedulesData !== 'object' || currentSchedulesData === null) { currentSchedulesData = {}; }
        } catch (error) { displayError(`Error loading schedules: ${error.message}`); currentSchedulesData = {}; }
        renderScheduleIdsList();
    }
    function renderScheduleIdsList() {
        scheduleIdsList.innerHTML = '';
        if (!currentSchedulesFilePath) { scheduleIdsList.innerHTML = '<li>Schedules file not specified.</li>'; return; }
        const ids = Object.keys(currentSchedulesData);
        if (ids.length === 0) { scheduleIdsList.innerHTML = `<li>No schedules in '${currentSchedulesFilePath}'.</li>`; return; }
        ids.forEach(id => {
            const li = document.createElement('li'); li.textContent = id;
            const editBtn = document.createElement('button'); editBtn.textContent = 'Edit Entries';
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditScheduleEntries(id);
            li.appendChild(editBtn);
            const delBtn = document.createElement('button'); delBtn.textContent = 'Delete ID';
            delBtn.style.marginLeft = '5px'; delBtn.classList.add('button-danger');
            delBtn.onclick = () => handleDeleteScheduleId(id);
            li.appendChild(delBtn);
            scheduleIdsList.appendChild(li);
        });
    }
    async function saveSchedulesDataToFile() {
        if (!currentSchedulesFilePath) throw new Error("Schedules file path undefined.");
        const response = await fetch('/api/write-json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentSchedulesFilePath, data: currentSchedulesData }),
        });
        if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
        return await response.json();
    }
    function renderScheduleEntriesList() {
        scheduleEntriesList.innerHTML = '';
        if (!currentlyEditingScheduleId || !currentSchedulesData[currentlyEditingScheduleId]) {
            scheduleEntriesList.innerHTML = '<li>No schedule selected or it has no entries.</li>'; return;
        }
        const entries = currentSchedulesData[currentlyEditingScheduleId];
        if (entries.length === 0) { scheduleEntriesList.innerHTML = '<li>No entries. Add one below.</li>'; return; }
        entries.forEach((entry, index) => {
            const li = document.createElement('li');
            li.textContent = `Time: ${entry.time}, Action: ${entry.action}, Map: ${entry.mapId}, Waypoint: ${entry.waypointId}`;
            const removeBtn = document.createElement('button'); removeBtn.textContent = 'Remove';
            removeBtn.style.marginLeft = '10px'; removeBtn.classList.add('button-danger');
            removeBtn.onclick = () => handleRemoveScheduleEntry(index);
            li.appendChild(removeBtn);
            scheduleEntriesList.appendChild(li);
        });
    }
    function handleRemoveScheduleEntry(index) {
        if (!currentlyEditingScheduleId || !currentSchedulesData[currentlyEditingScheduleId]) return;
        const entry = currentSchedulesData[currentlyEditingScheduleId][index];
        if (confirm(`Remove entry: ${entry.time} - ${entry.action}?`)) {
            currentSchedulesData[currentlyEditingScheduleId].splice(index, 1);
            renderScheduleEntriesList();
        }
    }
    function handleEditScheduleEntries(scheduleId) {
        if (!currentSchedulesData.hasOwnProperty(scheduleId)) { displayError(`Schedule ID '${scheduleId}' not found.`); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        currentlyEditingScheduleId = scheduleId;
        originalSchedulesDataBeforeEdit = JSON.parse(JSON.stringify(currentSchedulesData));
        editingScheduleIdNameSpan.textContent = scheduleId;
        renderScheduleEntriesList();
        editScheduleEntriesForm.style.display = 'block'; clearErrorMessages();
    }
    showCreateScheduleIdFormButton.addEventListener('click', () => {
        if (!currentSchedulesFilePath) { displayError("Schedules file path not set."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        newScheduleIdNameInput.value = '';
        createScheduleIdForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateScheduleIdButton.addEventListener('click', () => { hideAllScheduleForms(); });
    saveNewScheduleIdButton.addEventListener('click', async () => {
        const newId = newScheduleIdNameInput.value.trim();
        if (!newId) { displayError("Schedule ID cannot be empty."); return; }
        if (currentSchedulesData.hasOwnProperty(newId)) { displayError(`Schedule ID '${newId}' already exists.`); return; }
        const oldData = JSON.parse(JSON.stringify(currentSchedulesData));
        currentSchedulesData[newId] = [];
        renderScheduleIdsList(); hideAllScheduleForms();
        try { await saveSchedulesDataToFile(); displayMessage(`Schedule ID '${newId}' created.`); }
        catch (error) { displayError(`Error creating ID: ${error.message}`); currentSchedulesData = oldData; renderScheduleIdsList(); }
    });
    addScheduleEntryButton.addEventListener('click', () => {
        if (!currentlyEditingScheduleId) { displayError("No schedule selected."); return; }
        const time = entryTimeInput.value.trim(); const action = entryActionInput.value.trim();
        const mapId = entryMapIdInput.value.trim(); const waypointId = entryWaypointIdInput.value.trim();
        if (!time || !action || !mapId || !waypointId) { displayError("All entry fields required."); return; }
        if (!/^\d{2}:\d{2}$/.test(time)) { displayError("Time must be HH:MM."); return; }
        if (!currentSchedulesData[currentlyEditingScheduleId]) currentSchedulesData[currentlyEditingScheduleId] = [];
        currentSchedulesData[currentlyEditingScheduleId].push({ time, action, mapId, waypointId });
        renderScheduleEntriesList();
        entryTimeInput.value = ''; entryActionInput.value = ''; entryMapIdInput.value = ''; entryWaypointIdInput.value = '';
    });
    saveScheduleChangesButton.addEventListener('click', async () => {
        if (!currentlyEditingScheduleId) { displayError("No schedule selected."); return; }
        try {
            await saveSchedulesDataToFile();
            originalSchedulesDataBeforeEdit = JSON.parse(JSON.stringify(currentSchedulesData));
            displayMessage(`Changes for schedule '${currentlyEditingScheduleId}' saved.`);
        } catch (error) {
            displayError(`Error saving changes: ${error.message}.`);
            if (originalSchedulesDataBeforeEdit && originalSchedulesDataBeforeEdit[currentlyEditingScheduleId]) {
                currentSchedulesData[currentlyEditingScheduleId] = JSON.parse(JSON.stringify(originalSchedulesDataBeforeEdit[currentlyEditingScheduleId]));
                renderScheduleEntriesList();
                displayError(`Error saving changes: ${error.message}. Reverted entries for this schedule.`);
            } else if (originalSchedulesDataBeforeEdit) { // Schedule ID was new, and save failed
                delete currentSchedulesData[currentlyEditingScheduleId]; // remove it
                renderScheduleIdsList(); // update list of IDs
                displayError(`Error saving new schedule ${currentlyEditingScheduleId}: ${error.message}. Creation reverted.`);
            } else {
                displayError(`Error saving changes: ${error.message}. Could not fully revert.`);
            }
        }
    });
    closeScheduleEditorButton.addEventListener('click', () => {
        if (originalSchedulesDataBeforeEdit && currentlyEditingScheduleId &&
            JSON.stringify(currentSchedulesData[currentlyEditingScheduleId]) !== JSON.stringify(originalSchedulesDataBeforeEdit[currentlyEditingScheduleId])) {
            if (!confirm("Unsaved changes to current schedule. Close and revert these changes?")) return;
            currentSchedulesData[currentlyEditingScheduleId] = JSON.parse(JSON.stringify(originalSchedulesDataBeforeEdit[currentlyEditingScheduleId]));
        }
        hideAllScheduleForms();
    });
    async function handleDeleteScheduleId(scheduleId) {
        if (!confirm(`Delete Schedule ID "${scheduleId}" and all its entries?`)) return;
        const oldData = JSON.parse(JSON.stringify(currentSchedulesData));
        if (currentSchedulesData.hasOwnProperty(scheduleId)) {
            delete currentSchedulesData[scheduleId];
            if (currentlyEditingScheduleId === scheduleId) hideAllScheduleForms();
            renderScheduleIdsList();
            try { await saveSchedulesDataToFile(); displayMessage(`Schedule ID "${scheduleId}" deleted.`); }
            catch (error) { displayError(`Error deleting: ${error.message}. Reverted.`); currentSchedulesData = oldData; renderScheduleIdsList(); }
        } else { displayError("Schedule ID not found."); }
    }

    // --- Random Encounters ---
    function hideAllRandomEncounterForms() { createRandomEncounterForm.style.display = 'none'; editRandomEncounterForm.style.display = 'none'; originalRandomEncounterDataBeforeEdit = null; }
    async function loadRandomEncountersData() {
        if (!currentRandomEncountersFilePath) { renderRandomEncountersList(); return; }
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentRandomEncountersFilePath)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentRandomEncounters = await response.json();
            if (!Array.isArray(currentRandomEncounters)) { console.error("Invalid encounters format.", currentRandomEncounters); currentRandomEncounters = []; }
        } catch (error) { displayError(`Error loading encounters: ${error.message}`); currentRandomEncounters = []; }
        renderRandomEncountersList();
    }
    function renderRandomEncountersList() {
        randomEncountersList.innerHTML = '';
        if (!currentRandomEncountersFilePath) { randomEncountersList.innerHTML = '<li>Encounters file not specified.</li>'; return; }
        if (currentRandomEncounters.length === 0) { randomEncountersList.innerHTML = `<li>No groups in '${currentRandomEncountersFilePath}'.</li>`; return; }
        currentRandomEncounters.forEach(group => {
            const li = document.createElement('li');
            li.innerHTML = `ID: ${group.id}, Desc: ${group.description || 'N/A'} (Prob: ${group.probability || 0}) `;
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit'; editBtn.dataset.encounterId = group.id;
            editBtn.style.marginLeft = '10px'; editBtn.onclick = () => handleEditRandomEncounter(group.id);
            li.appendChild(editBtn);
            randomEncountersList.appendChild(li);
        });
    }
    async function saveRandomEncountersToFile() {
        if (!currentRandomEncountersFilePath) throw new Error("Encounters file path undefined.");
        const response = await fetch('/api/write-json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentRandomEncountersFilePath, data: currentRandomEncounters }),
        });
        if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
        return await response.json();
    }
    function handleEditRandomEncounter(encounterId) {
        const groupToEdit = currentRandomEncounters.find(e => e.id === encounterId);
        if (!groupToEdit) { displayError(`Group ID '${encounterId}' not found.`); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        originalRandomEncounterDataBeforeEdit = JSON.parse(JSON.stringify(groupToEdit));
        editingRandomEncounterOriginalIdInput.value = groupToEdit.id;
        editEncounterIdInput.value = groupToEdit.id;
        editEncounterDescriptionInput.value = groupToEdit.description || '';
        editEncounterProbabilityInput.value = groupToEdit.probability || 0;
        editEncounterNpcIdsInput.value = (groupToEdit.npcIds || []).join(', ');
        editRandomEncounterForm.style.display = 'block'; clearErrorMessages();
    }
    showCreateRandomEncounterFormButton.addEventListener('click', () => {
        if (!currentRandomEncountersFilePath) { displayError("Encounters file path not set."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        newEncounterIdInput.value = ''; newEncounterDescriptionInput.value = '';
        newEncounterProbabilityInput.value = '0.1'; newEncounterNpcIdsInput.value = '';
        createRandomEncounterForm.style.display = 'block'; clearErrorMessages();
    });
    cancelCreateRandomEncounterButton.addEventListener('click', () => { hideAllRandomEncounterForms(); });
    saveNewRandomEncounterButton.addEventListener('click', async () => {
        const id = newEncounterIdInput.value.trim(); const desc = newEncounterDescriptionInput.value.trim();
        const prob = parseFloat(newEncounterProbabilityInput.value); const npcIdsStr = newEncounterNpcIdsInput.value.trim();
        if (!id || !desc) { displayError("Group ID and Description required."); return; }
        if (isNaN(prob) || prob < 0 || prob > 1) { displayError("Probability must be 0.0-1.0."); return; }
        if (currentRandomEncounters.some(e => e.id === id)) { displayError(`Group ID '${id}' already exists.`); return; }
        const npcIds = npcIdsStr ? npcIdsStr.split(',').map(s => s.trim()).filter(s => s) : [];
        const newGroup = { id, description: desc, probability: prob, npcIds };
        const oldEnc = [...currentRandomEncounters]; currentRandomEncounters.push(newGroup);
        renderRandomEncountersList(); hideAllRandomEncounterForms();
        try { await saveRandomEncountersToFile(); displayMessage("New encounter group saved!"); }
        catch (error) { displayError(`Error saving group: ${error.message}`); currentRandomEncounters = oldEnc; renderRandomEncountersList(); }
    });
    cancelEditRandomEncounterButton.addEventListener('click', () => { hideAllRandomEncounterForms(); });
    saveRandomEncounterChangesButton.addEventListener('click', async () => {
        const originalId = editingRandomEncounterOriginalIdInput.value;
        if (!originalRandomEncounterDataBeforeEdit || originalRandomEncounterDataBeforeEdit.id !== originalId) { displayError("No group loaded or ID mismatch."); return; }
        const newDesc = editEncounterDescriptionInput.value.trim(); const newProb = parseFloat(editEncounterProbabilityInput.value);
        const newNpcIdsStr = editEncounterNpcIdsInput.value.trim();
        if (!newDesc) { displayError("Description required."); return; }
        if (isNaN(newProb) || newProb < 0 || newProb > 1) { displayError("Probability must be 0.0-1.0."); return; }
        const encIndex = currentRandomEncounters.findIndex(e => e.id === originalId);
        if (encIndex === -1) { displayError(`Group ID '${originalId}' not found.`); hideAllRandomEncounterForms(); return; }
        const newNpcIds = newNpcIdsStr ? newNpcIdsStr.split(',').map(s => s.trim()).filter(s => s) : [];
        const prevEncState = JSON.parse(JSON.stringify(currentRandomEncounters[encIndex]));
        currentRandomEncounters[encIndex].description = newDesc; currentRandomEncounters[encIndex].probability = newProb; currentRandomEncounters[encIndex].npcIds = newNpcIds;
        renderRandomEncountersList();
        try { await saveRandomEncountersToFile(); originalRandomEncounterDataBeforeEdit = JSON.parse(JSON.stringify(currentRandomEncounters[encIndex])); displayMessage("Group changes saved."); }
        catch (error) {
            displayError(`Error saving group: ${error.message}`); currentRandomEncounters[encIndex] = prevEncState;
            editEncounterDescriptionInput.value = currentRandomEncounters[encIndex].description;
            editEncounterProbabilityInput.value = currentRandomEncounters[encIndex].probability;
            editEncounterNpcIdsInput.value = (currentRandomEncounters[encIndex].npcIds || []).join(', ');
            renderRandomEncountersList();
        }
    });
    deleteRandomEncounterButton.addEventListener('click', async () => {
        const groupIdDel = editingRandomEncounterOriginalIdInput.value;
        if (!groupIdDel) { displayError("No group selected."); return; }
        const gDel = currentRandomEncounters.find(e => e.id === groupIdDel);
        if (!gDel) { displayError(`Group ID '${groupIdDel}' not found.`); hideAllRandomEncounterForms(); return; }
        if (!confirm(`Delete group: "${gDel.description || groupIdDel}"?`)) return;
        const oldEnc = [...currentRandomEncounters]; const gIdx = currentRandomEncounters.findIndex(e => e.id === groupIdDel);
        if (gIdx !== -1) currentRandomEncounters.splice(gIdx, 1); else { displayError("Group not found for deletion."); return; }
        renderRandomEncountersList(); hideAllRandomEncounterForms();
        try { await saveRandomEncountersToFile(); displayMessage(`Group "${gDel.description || groupIdDel}" deleted.`); }
        catch (error) { displayError(`Error deleting: ${error.message}. Reverted.`); currentRandomEncounters = oldEnc; renderRandomEncountersList(); }
    });

    // --- Story Beats ---
    function hideAllStoryBeatForms() { createStoryBeatForm.style.display = 'none'; }
    async function loadStoryBeatsData() {
        if (!currentStoryBeatsFilePath) { renderStoryBeatsTable(); return; }
        try {
            const response = await fetch(`/api/read-json?path=${encodeURIComponent(currentStoryBeatsFilePath)}`);
            if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
            currentStoryBeatsData = await response.json();
            if (typeof currentStoryBeatsData !== 'object' || currentStoryBeatsData === null || Array.isArray(currentStoryBeatsData)) {
                currentStoryBeatsData = {};
            }
        } catch (error) { displayError(`Error loading story beats: ${error.message}`); currentStoryBeatsData = {}; }
        renderStoryBeatsTable();
    }
    function renderStoryBeatsTable() {
        storyBeatsTableBody.innerHTML = '';
        if (!currentStoryBeatsFilePath) { storyBeatsTableBody.innerHTML = '<tr><td colspan="3">Story Beats file not specified.</td></tr>'; return; }
        if (Object.keys(currentStoryBeatsData).length === 0) { storyBeatsTableBody.innerHTML = `<tr><td colspan="3">No beats in '${currentStoryBeatsFilePath}'.</td></tr>`; return; }
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
    async function saveStoryBeatsDataToFile() {
        if (!currentStoryBeatsFilePath) throw new Error("Story Beats file path undefined.");
        const response = await fetch('/api/write-json', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentStoryBeatsFilePath, data: currentStoryBeatsData }),
        });
        if (!response.ok) { throw new Error((await response.json()).error || `HTTP error ${response.status}`); }
        return await response.json();
    }
    async function handleDeleteStoryBeat(event) {
        const beatId = event.target.dataset.beatId;
        if (!beatId) { displayError("Could not determine beat to delete."); return; }
        if (!confirm(`Delete beat: "${beatId}"?`)) return;
        const oldData = JSON.parse(JSON.stringify(currentStoryBeatsData));
        if (currentStoryBeatsData.hasOwnProperty(beatId)) {
            delete currentStoryBeatsData[beatId]; renderStoryBeatsTable();
            try { await saveStoryBeatsDataToFile(); displayMessage(`Beat "${beatId}" deleted.`); }
            catch (error) { displayError(`Error deleting beat: ${error.message}. Reverted.`); currentStoryBeatsData = oldData; renderStoryBeatsTable(); }
        } else { displayError("Beat not found for deletion."); }
    }
    showCreateStoryBeatFormButton.addEventListener('click', () => {
        if (!currentStoryBeatsFilePath) { displayError("Story Beats file not set."); return; }
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
        newStoryBeatIdInput.value = ''; newStoryBeatValueInput.value = 'false';
        createStoryBeatForm.style.display = 'block'; clearErrorMessages();
    });
    saveAllStoryBeatChangesButton.addEventListener('click', async () => {
        if (!currentStoryBeatsFilePath) { displayError("No Story Beats file loaded."); return; }
        originalStoryBeatsDataForSaveAttempt = JSON.parse(JSON.stringify(currentStoryBeatsData));
        const newBeats = {}; const inputs = storyBeatsTableBody.querySelectorAll('.story-beat-value-input');
        inputs.forEach(input => { const id = input.dataset.beatId; if (id) newBeats[id] = parseStoryBeatValue(input.value.trim()); });
        currentStoryBeatsData = newBeats;
        try { await saveStoryBeatsDataToFile(); originalStoryBeatsDataForSaveAttempt = null; displayMessage("Story beat changes saved."); }
        catch (error) {
            displayError(`Error saving beats: ${error.message}. Reverted.`);
            currentStoryBeatsData = originalStoryBeatsDataForSaveAttempt; originalStoryBeatsDataForSaveAttempt = null;
            renderStoryBeatsTable();
        }
    });
    cancelCreateStoryBeatButton.addEventListener('click', () => { hideAllStoryBeatForms(); });
    saveNewStoryBeatButton.addEventListener('click', async () => {
        const newId = newStoryBeatIdInput.value.trim(); const newValStr = newStoryBeatValueInput.value.trim();
        if (!newId) { displayError("Beat ID required."); return; }
        if (currentStoryBeatsData.hasOwnProperty(newId)) { displayError(`Beat ID '${newId}' already exists.`); return; }
        const parsedVal = parseStoryBeatValue(newValStr);
        const oldData = JSON.parse(JSON.stringify(currentStoryBeatsData));
        currentStoryBeatsData[newId] = parsedVal;
        renderStoryBeatsTable(); hideAllStoryBeatForms();
        try { await saveStoryBeatsDataToFile(); displayMessage(`Beat "${newId}" created.`); }
        catch (error) { displayError(`Error creating beat: ${error.message}`); currentStoryBeatsData = oldData; renderStoryBeatsTable(); }
    });

    // --- Manifest Saving ---
    saveManifestButton.addEventListener('click', async () => {
        clearErrorMessages();
        if (!currentManifestPath) { displayError("No campaign manifest loaded."); return; }
        if (!campaignIdInput.value || !campaignNameInput.value) { displayError("Campaign ID and Name required."); return; }
        const manifestData = gatherManifestDataFromUI();
        try {
            const response = await fetch('/api/write-json', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentManifestPath, data: manifestData }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            displayMessage((await response.json()).message || "Manifest saved!");
        } catch (error) { console.error('Error saving manifest:', error); displayError(`Error saving manifest: ${error.message}`); }
    });
    function gatherManifestDataFromUI() {
        const data = {
            id: campaignIdInput.value, name: campaignNameInput.value,
            version: campaignVersionInput.value,
            description: campaignDescriptionInput.value,
            author: campaignAuthorInput.value,
            entryMap: entryMapInput.value, filePaths: {}
        };
        const pathItems = filePathsList.getElementsByTagName('li');
        for (let item of pathItems) {
            const text = item.textContent; const parts = text.split(': ');
            if (parts.length === 2) {
                const key = parts[0]; const value = parts[1];
                if (key && value && !["No data file paths defined in manifest.", "No additional file paths found or format is incorrect.", "No NPCs loaded or defined."].includes(key) && !text.startsWith("Error loading")) {
                    data.filePaths[key] = value;
                }
            }
        }
        return data;
    }

    // --- Utility and Cleanup Functions ---
    function clearManifestDetails() {
        campaignIdInput.value = ''; campaignNameInput.value = ''; campaignVersionInput.value = '';
        campaignDescriptionInput.value = ''; campaignAuthorInput.value = ''; entryMapInput.value = '';
        filePathsList.innerHTML = '<li>Load a campaign manifest to see file paths.</li>';
    }
    function clearNpcDetailsInternal() { currentNpcs = []; hideAllNpcForms(); }
    function clearNpcDetails() { clearNpcDetailsInternal(); currentNpcFilePathFull = null; renderNpcList(); }
    function clearDialogueEditorFieldsAndState() {
        dialogueEditorSection.style.display = 'none';
        editingDialogueFileNameSpan.textContent = '';
        dialogueMetaIdInput.value = '';
        dialogueMetaStartingNodeInput.value = '';
        dialogueNodeEditArea.style.display = 'none';
        editingNodeIdDisplay.textContent = '';
        nodeNpcLineTextArea.value = '';
        nodePlayerChoicesList.innerHTML = '';
        dialogueNodesList.innerHTML = '';
        currentDialogueData = null;
        currentlyEditingDialogueFilePath = null;
        originalDialogueDataBeforeEdit = null;
        currentlyEditingNodeId = null;
    }
    function clearDialogueDetails() {
        currentDialogueDirectory = ''; currentDialogueFiles = [];
        dialogueDirectoryDisplay.value = '';
        hideAllDialogueForms();
        renderDialogueFilesList();
        dialogueNodesList.innerHTML = '';
    }
    function clearQuestDetails() {
        currentQuestsFilePath = ''; currentQuests = [];
        questsFileDisplay.value = '';
        hideAllQuestForms();
        renderQuestsList();
    }
    function clearZoneDetails() {
        currentZonesFilePath = ''; currentZones = [];
        zonesFileDisplay.value = '';
        hideAllZoneForms();
        renderZonesList();
    }
    function clearWorldMapDetails() {
        currentWorldMapFilePath = ''; currentWorldMapData = { nodes: [], connections: [] };
        worldMapFileDisplay.value = '';
        hideAllWorldMapForms();
        renderWorldMapNodesList();
    }
    function clearScheduleDetails() {
        currentSchedulesFilePath = ''; currentSchedulesData = {};
        schedulesFileDisplay.value = '';
        hideAllScheduleForms();
        renderScheduleIdsList();
    }
    function clearRandomEncounterDetails() {
        currentRandomEncountersFilePath = '';
        currentRandomEncounters = [];
        randomEncountersFileDisplay.value = '';
        hideAllRandomEncounterForms();
        renderRandomEncountersList();
    }
    function clearStoryBeatDetails() {
        currentStoryBeatsFilePath = '';
        currentStoryBeatsData = {};
        storyBeatsFileDisplay.value = '';
        hideAllStoryBeatForms();
        renderStoryBeatsTable();
        originalStoryBeatsDataForSaveAttempt = null;
    }

    function resetCurrentPathsAndData() {
        currentManifestPath = null; currentCampaignRoot = null;
        clearNpcDetails(); clearDialogueDetails(); clearQuestDetails(); clearZoneDetails(); clearWorldMapDetails(); clearScheduleDetails(); clearRandomEncounterDetails(); clearStoryBeatDetails();
    }
    function displayError(message) { errorMessagesDiv.textContent = message; errorMessagesDiv.style.color = 'red'; }
    function displayMessage(message) { errorMessagesDiv.textContent = message; errorMessagesDiv.style.color = 'green'; }
    function clearErrorMessages() { errorMessagesDiv.textContent = ''; }

    // --- Initial setup ---
    loadInitialData().then(() => {
        clearManifestDetails();
        renderNpcList(); renderDialogueFilesList(); renderQuestsList(); renderZonesList(); renderWorldMapNodesList(); renderScheduleIdsList(); renderRandomEncountersList(); renderStoryBeatsTable();
        hideAllNpcForms(); hideAllDialogueForms(); hideAllQuestForms(); hideAllZoneForms(); hideAllWorldMapForms(); hideAllScheduleForms(); hideAllRandomEncounterForms(); hideAllStoryBeatForms();
    });
    console.log("app.js loaded");

    // UI Enhancement Event Listeners (Browse, Search)
    document.querySelectorAll('.browse-button').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const targetInputId = event.target.dataset.targetInput;
            alert(`File browser/picker for '${targetInputId}' not implemented.`);
        });
    });
    document.querySelectorAll('.search-input').forEach(input => {
        input.addEventListener('input', (event) => {
            let sectionName = event.target.id.replace('search', '').replace('Input', '');
            if (sectionName.endsWith('s') && !sectionName.endsWith('ss')) { }
            else if (sectionName.endsWith('y')) { sectionName = sectionName.slice(0, -1) + "ies"; }
            else { sectionName = sectionName + "s"; }
            console.log(`Search for ${sectionName} (ID: ${event.target.id}) not implemented. Term: ${event.target.value}`);
        });
    });
});
