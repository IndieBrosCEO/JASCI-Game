// js/uiCampaignSelect.js

// Assume these HTML elements exist (conceptual):
// <div id="campaign-select-screen">
//   <h2>Select a Campaign</h2>
//   <ul id="campaign-list"></ul>
//   <button id="start-campaign-button" style="display:none;">Start Selected Campaign</button>
// </div>
// <div id="main-game-screen" style="display:none;">... game content ...</div>

let selectedCampaignId = null;

async function populateCampaignList() {
    const campaignListElement = document.getElementById('campaign-list');
    const startButton = document.getElementById('start-campaign-button');

    if (!campaignListElement) {
        console.error("UI Error: Campaign list element 'campaign-list' not found.");
        return;
    }
    if (!window.campaignManager) {
        console.error("UI Error: CampaignManager (window.campaignManager) not found.");
        return;
    }

    try {
        const campaigns = await window.campaignManager.listAvailableCampaigns();
        campaignListElement.innerHTML = ''; // Clear existing list

        if (!campaigns || campaigns.length === 0) {
            campaignListElement.innerHTML = '<li>No campaigns available or index missing.</li>';
            if(startButton) startButton.style.display = 'none';
            return;
        }

        campaigns.forEach(campaign => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${campaign.name}</strong> (v${campaign.version || 'N/A'})<br><small>${campaign.description || 'No description.'}</small>`;
            listItem.dataset.campaignId = campaign.id;
            listItem.style.cursor = 'pointer';
            listItem.style.padding = '10px';
            listItem.style.borderBottom = '1px solid #eee';

            listItem.addEventListener('click', () => {
                document.querySelectorAll('#campaign-list li').forEach(li => {
                    li.classList.remove('selected');
                    li.style.backgroundColor = ''; // Clear background
                });
                listItem.classList.add('selected');
                listItem.style.backgroundColor = '#e0e0e0'; // Highlight selected
                selectedCampaignId = campaign.id;
                if(startButton) startButton.style.display = 'inline-block';
                console.log(`UI: Selected campaign '${selectedCampaignId}'`);
            });
            campaignListElement.appendChild(listItem);
        });
    } catch (error) {
        console.error("Failed to populate campaign list:", error);
        campaignListElement.innerHTML = '<li>Error loading campaigns. See console.</li>';
        if(startButton) startButton.style.display = 'none';
    }
}

async function handleStartCampaign() {
    if (!selectedCampaignId) {
        alert("Please select a campaign first.");
        return;
    }
    console.log(`UI: Attempting to start campaign '${selectedCampaignId}'...`);

    const startButton = document.getElementById('start-campaign-button');
    if(startButton) startButton.disabled = true;


    // CampaignManager.activateCampaign already calls deactivateCurrentCampaign.
    const activated = await window.campaignManager.activateCampaign(selectedCampaignId);

    if (activated) {
        console.log(`UI: Campaign '${selectedCampaignId}' activated successfully by CampaignManager.`);

        if (window.globalStateManager) {
            const campaignSaveSlot = selectedCampaignId + "_autosave"; // Or a more general slot
            console.log(`UI: Attempting to load game state from slot '${campaignSaveSlot}'...`);
            window.globalStateManager.loadGameState(campaignSaveSlot);
            // loadGameState will internally call applyLoadedData, which resets states.
            // If no save exists, it applies an empty state, effectively starting fresh for that slot.
        } else {
            console.warn("UI: GlobalStateManager not found. Cannot load campaign-specific game state.");
        }

        const campaignSelectScreen = document.getElementById('campaign-select-screen');
        const mainGameScreen = document.getElementById('main-game-screen');

        if (campaignSelectScreen) campaignSelectScreen.style.display = 'none';
        else console.warn("UI: campaign-select-screen element not found to hide.");

        if (mainGameScreen) mainGameScreen.style.display = 'block'; // Or 'flex', 'grid' etc. depending on layout
        else console.warn("UI: main-game-screen element not found to show.");

        window.dispatchEvent(new CustomEvent('campaignWasLoaded', {
            detail: {
                campaignId: selectedCampaignId,
                manifest: window.campaignManager.getActiveCampaignManifest() // Pass along manifest if useful
            }
        }));

        console.log("UI: Campaign loaded. Main game screen should be visible. Further game initialization (e.g., map loading, player setup) should be triggered by 'campaignWasLoaded' event or subsequent logic in main game script.");

    } else {
        alert(`Failed to activate campaign '${selectedCampaignId}'. Check console for errors.`);
        if(startButton) startButton.disabled = false;
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (window.campaignManager) {
         populateCampaignList();
    } else {
        console.error("CampaignManager (window.campaignManager) not ready on DOMContentLoaded for uiCampaignSelect. Make sure it's loaded and initialized before this script.");
    }

    const startButton = document.getElementById('start-campaign-button');
    if (startButton) {
        startButton.addEventListener('click', handleStartCampaign);
    } else {
        console.warn("UI: Start campaign button ('start-campaign-button') not found.");
    }
});
