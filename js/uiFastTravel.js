// js/uiFastTravel.js

// Conceptual HTML (assumed to be in index.html):
// <div id="fast-travel-screen" style="display:none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 1px solid black; background: white; padding: 20px; z-index: 1000;">
//   <h2>Fast Travel</h2>
//   <div>Current Location: <span id="ft-current-location">N/A</span></div>
//   <hr>
//   <div>
//     <label for="ft-destination-select">Travel to:</label>
//     <select id="ft-destination-select">
//       <option value="">-- Select Destination --</option>
//     </select>
//   </div>
//   <div id="ft-travel-info" style="margin-top: 10px; margin-bottom: 10px;">
//     <p>Select a destination to see travel details.</p>
//   </div>
//   <button id="ft-travel-button" disabled>Travel</button>
//   <button id="ft-close-button">Close</button>
// </div>

let currentSelectedDestinationInfo = null;

function openFastTravelUI() {
    if (!window.campaignManager || !window.globalStateManager || !window.gameState) {
        console.error("FastTravelUI: CampaignManager, GlobalStateManager, or GameState not found.");
        alert("Fast travel system not available.");
        return;
    }
    const activeCampaign = window.campaignManager.getActiveCampaignManifest();
    if (!activeCampaign) {
        console.warn("FastTravelUI: No active campaign.");
        alert("Fast travel not available: No active campaign.");
        return;
    }

    const worldMapData = window.campaignManager.getActiveCampaignWorldMap();
    const playerNodeId = window.globalStateManager.getPlayerCurrentNodeId();

    const fastTravelScreen = document.getElementById('fast-travel-screen');
    if (!fastTravelScreen) {
        console.error("FastTravelUI: HTML element 'fast-travel-screen' not found.");
        return;
    }

    if (!worldMapData || !worldMapData.locations || !playerNodeId) { // Note: world_map.json uses "locations" not "nodes"
        console.warn("FastTravelUI: World map data or player current location not available.");
        alert("Fast travel data is missing.");
        fastTravelScreen.style.display = 'none';
        return;
    }

    const currentLocationElement = document.getElementById('ft-current-location');
    const destinationSelect = document.getElementById('ft-destination-select');

    const playerNode = worldMapData.locations.find(n => n.id === playerNodeId);
    if (currentLocationElement) currentLocationElement.textContent = playerNode ? playerNode.name : "Unknown";

    if (destinationSelect) {
        destinationSelect.innerHTML = '<option value="">-- Select Destination --</option>';
        worldMapData.locations.forEach(node => {
            // Conditions for being a fast travel destination:
            // 1. Not the player's current location.
            // 2. Must be a fast travel hub (`isFastTravelHub: true`).
            // 3. Must have been discovered (`globalStateManager.isMapNodeDiscovered(node.id)`).
            if (node.id !== playerNodeId && node.isFastTravelHub && window.globalStateManager.isMapNodeDiscovered(node.id)) {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = node.name;
                destinationSelect.appendChild(option);
            }
        });
    }

    currentSelectedDestinationInfo = null;
    updateTravelInfoDisplay(); // Initialize/clear travel info
    fastTravelScreen.style.display = 'block';
}

function closeFastTravelUI() {
    const fastTravelScreen = document.getElementById('fast-travel-screen');
    if (fastTravelScreen) {
        fastTravelScreen.style.display = 'none';
    }
}

function handleDestinationChange() {
    const destinationSelect = document.getElementById('ft-destination-select');
    if (!destinationSelect) return;
    const selectedNodeId = destinationSelect.value;
    currentSelectedDestinationInfo = null;

    if (selectedNodeId && window.campaignManager && window.globalStateManager) {
        const worldMapData = window.campaignManager.getActiveCampaignWorldMap();
        const playerNodeId = window.globalStateManager.getPlayerCurrentNodeId();

        if (!worldMapData || !worldMapData.connections || !worldMapData.locations) return;

        // Find connection - assumes travelTime is on the connection.
        // Fast travel typically uses direct "flight" times, not necessarily path-based connections.
        // For simplicity, let's assume a placeholder travel time if no direct connection with travelTime exists.
        // A more robust system might have a matrix of travel times between hubs or calculate it.

        const destinationNode = worldMapData.locations.find(n => n.id === selectedNodeId);
        if (!destinationNode) {
            updateTravelInfoDisplay();
            return;
        }

        let travelTimeHours = 1; // Default placeholder travel time
        let encounterRisk = 0.05; // Default placeholder risk
        let encounterTable = "generic_road_encounters"; // Default placeholder table

        // Attempt to find a connection to get more specific data
        const connection = worldMapData.connections.find(
            c => (c.from === playerNodeId && c.to === selectedNodeId) || (c.from === selectedNodeId && c.to === playerNodeId)
        );

        if (connection) {
            travelTimeHours = connection.travelTime || travelTimeHours; // travelTime in hours
            encounterRisk = connection.baseEncounterRisk !== undefined ? connection.baseEncounterRisk : encounterRisk;
            encounterTable = connection.encounterTable || encounterTable;
        } else {
            // If no direct connection, use a higher default time or a calculation based on distance if map has coordinates
            console.warn(`FastTravelUI: No direct connection found in world_map.json between ${playerNodeId} and ${selectedNodeId}. Using default travel time/risk.`);
             // Example: rough distance based on mapPosition (if available)
            const playerNode = worldMapData.locations.find(n => n.id === playerNodeId);
            if (playerNode && playerNode.mapPosition && destinationNode.mapPosition) {
                const dist = Math.sqrt(Math.pow(playerNode.mapPosition.x - destinationNode.mapPosition.x, 2) + Math.pow(playerNode.mapPosition.y - destinationNode.mapPosition.y, 2));
                travelTimeHours = Math.max(1, Math.round(dist / 50)); // Arbitrary scaling factor for distance to hours
            } else {
                travelTimeHours = 5; // Fallback if no coordinates
            }
        }

        currentSelectedDestinationInfo = {
            nodeId: selectedNodeId,
            name: destinationNode.name,
            travelTime: travelTimeHours,
            encounterRisk: encounterRisk,
            encounterTable: encounterTable
        };
    }
    updateTravelInfoDisplay();
}

function updateTravelInfoDisplay() {
    const travelInfoDiv = document.getElementById('ft-travel-info');
    const travelButton = document.getElementById('ft-travel-button');
    if (!travelInfoDiv || !travelButton) return;

    if (currentSelectedDestinationInfo) {
        travelInfoDiv.innerHTML = `
            <p>Destination: <strong>${currentSelectedDestinationInfo.name}</strong></p>
            <p>Estimated Travel Time: ${currentSelectedDestinationInfo.travelTime} hours</p>
            <p>Potential Encounter Risk: ${Math.round((currentSelectedDestinationInfo.encounterRisk || 0) * 100)}%</p>
        `;
        travelButton.disabled = false;
    } else {
        travelInfoDiv.innerHTML = "<p>Select a valid destination to see travel details.</p>";
        travelButton.disabled = true;
    }
}

async function executeTravel() {
    if (!currentSelectedDestinationInfo || !window.globalStateManager || !window.gameState || !window.campaignManager || !window.Time) {
        alert("Cannot execute travel. Destination or required managers/objects missing.");
        return;
    }

    const { nodeId: destinationNodeId, travelTime, encounterTable, encounterRisk } = currentSelectedDestinationInfo;
    console.log(`FastTravel: Traveling to ${destinationNodeId}. Time: ${travelTime}h. Encounter Table: ${encounterTable}, Risk: ${encounterRisk}`);

    document.getElementById('ft-travel-button').disabled = true;


    // 1. Advance Game Time
    // Use the global Time object and pass gameState
    window.Time.advanceTimeSpecific(travelTime, 0, window.gameState);

    // 2. Random Encounter Check
    const randomEncountersData = window.campaignManager.getActiveCampaignRandomEncounters();
    if (randomEncountersData && randomEncountersData.encounterTables && randomEncountersData.encounterTables[encounterTable]) {
        const table = randomEncountersData.encounterTables[encounterTable];
        if (Math.random() < encounterRisk && table.encounters && table.encounters.length > 0) {
            // Simplified weighted random choice - assumes weights are positive integers
            let totalWeight = 0;
            table.encounters.forEach(e => totalWeight += (e.weight || 0));
            let randomRoll = Math.random() * totalWeight;
            let chosenEncounter = null;
            for (const encounterRef of table.encounters) {
                if (randomRoll < (encounterRef.weight || 0)) {
                    chosenEncounter = encounterRef;
                    break;
                }
                randomRoll -= (encounterRef.weight || 0);
            }

            if (chosenEncounter && chosenEncounter.id !== "nothing_common" && chosenEncounter.id !== "nothing_less_common") { // Assuming 'nothing' encounters exist
                 console.log(`RANDOM ENCOUNTER TRIGGERED: ${chosenEncounter.id}`);
                 alert(`Random Encounter! (Placeholder: ${chosenEncounter.id})`);
                 // TODO: Set game state to handle the encounter, then resume/cancel travel.
                 // For now, travel completes.
            } else {
                 console.log("FastTravel: No specific random encounter on this trip (rolled nothing or table empty).");
            }
        } else {
             console.log("FastTravel: No random encounter on this trip (risk not met or table missing/empty).");
        }
    } else {
        console.warn(`FastTravel: Encounter table '${encounterTable}' not found or random encounters data missing.`);
    }

    // 3. Update Player Location
    window.globalStateManager.setPlayerCurrentNodeId(destinationNodeId);

    const currentTime = window.gameState.currentTime;
    const currentDay = window.gameState.currentDay;
    console.log(`FastTravel: Arrived at ${destinationNodeId}. New time: Day ${currentDay}, ${String(currentTime.hours).padStart(2, '0')}:${String(currentTime.minutes).padStart(2, '0')}`);

    closeFastTravelUI();
    window.dispatchEvent(new CustomEvent('playerLocationChanged', { detail: { newNodeId: destinationNodeId } }));
    // Game should listen to 'playerLocationChanged' and 'timeUpdated' to refresh UI, load new map, etc.
}

document.addEventListener('DOMContentLoaded', () => {
    const ftDestinationSelect = document.getElementById('ft-destination-select');
    if (ftDestinationSelect) {
        ftDestinationSelect.addEventListener('change', handleDestinationChange);
    }
    const ftTravelButton = document.getElementById('ft-travel-button');
    if (ftTravelButton) {
        ftTravelButton.addEventListener('click', executeTravel);
    }
    const ftCloseButton = document.getElementById('ft-close-button');
    if (ftCloseButton) {
        ftCloseButton.addEventListener('click', closeFastTravelUI);
    }

    // Example: Setup a button to open the fast travel UI
    // const openFTButton = document.getElementById('open-fast-travel-ui-button');
    // if(openFTButton) {
    //     openFTButton.addEventListener('click', openFastTravelUI);
    // }
});

// Make openFastTravelUI globally accessible if needed for other UI elements to call
window.openFastTravelUI = openFastTravelUI;
