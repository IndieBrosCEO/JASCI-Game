// js/tooltip.js

let entityTooltipElement = null;
let mapContainerElement = null;
const TILE_SIZE_APPROX = { width: 10, height: 16 }; // Approximate, may need adjustment or dynamic calculation

function initEntityTooltip(_mapContainerElement) {
    mapContainerElement = _mapContainerElement;
    entityTooltipElement = document.getElementById('entityTooltip');

    if (!mapContainerElement) {
        console.error("Tooltip: Map container element not provided for initialization.");
        return;
    }
    if (!entityTooltipElement) {
        console.error("Tooltip: Tooltip element with ID 'entityTooltip' not found.");
        return;
    }

    mapContainerElement.addEventListener('mousemove', handleMapMouseMove);
    mapContainerElement.addEventListener('mouseleave', hideEntityTooltip); // Hide when mouse leaves map
    // Also hide if mouse enters a UI panel that might overlap map, e.g. right-panel
    const rightPanel = document.getElementById('right-panel');
    if (rightPanel) {
        rightPanel.addEventListener('mouseenter', hideEntityTooltip);
    }
    const leftPanel = document.getElementById('left-panel');
    if (leftPanel) {
        leftPanel.addEventListener('mouseenter', hideEntityTooltip);
    }
}

function handleMapMouseMove(event) {
    if (!gameState || !gameState.gameStarted || !mapContainerElement || !entityTooltipElement || !window.mapRenderer) {
        hideEntityTooltip();
        return;
    }

    const rect = mapContainerElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Approximate tile size based on the map container's first child (a tile span)
    // This is a bit fragile and assumes the first child is representative.
    let tileWidth = TILE_SIZE_APPROX.width;
    let tileHeight = TILE_SIZE_APPROX.height;
    const firstTileSpan = mapContainerElement.querySelector('.tile');

    if (firstTileSpan) {
        // getComputedStyle is more reliable than offsetWidth/Height for text nodes or complex content
        const computedStyle = window.getComputedStyle(firstTileSpan);
        // For text nodes, width might not be directly usable.
        // A more robust way would be to get the font size and estimate, or have fixed tile dimensions.
        // For now, if offsetWidth is zero (like for a space char), use default.
        tileWidth = firstTileSpan.offsetWidth > 0 ? firstTileSpan.offsetWidth : TILE_SIZE_APPROX.width;

        // Height is also tricky with <br>. Let's use line-height from mapContainer or a default.
        const mcStyle = window.getComputedStyle(mapContainerElement);
        const lineHeight = parseFloat(mcStyle.lineHeight);
        tileHeight = !isNaN(lineHeight) && lineHeight > 0 ? lineHeight : TILE_SIZE_APPROX.height;

    }


    const hoverX = Math.floor(mouseX / tileWidth);
    const hoverY = Math.floor(mouseY / tileHeight);
    const currentZ = gameState.currentViewZ;

    let entityToShow = null;

    // Check if player is at these coordinates
    if (gameState.playerPos && gameState.playerPos.x === hoverX && gameState.playerPos.y === hoverY && gameState.playerPos.z === currentZ) {
        entityToShow = gameState; // Use gameState for player as it holds stats, health, etc.
        // We'll need to adapt how we access player.name, player.faceData
    } else {
        // Check NPCs
        if (gameState.npcs) {
            entityToShow = gameState.npcs.find(npc =>
                npc.mapPos && npc.mapPos.x === hoverX && npc.mapPos.y === hoverY && npc.mapPos.z === currentZ
            );
        }
    }

    if (entityToShow) {
        const fowDataForZ = gameState.fowData ? gameState.fowData[currentZ.toString()] : null;
        const fowStatus = fowDataForZ?.[hoverY]?.[hoverX];

        if (fowStatus === 'visible' || fowStatus === 'visited') {
            showEntityTooltip(entityToShow, event);
        } else {
            hideEntityTooltip();
        }
    } else {
        hideEntityTooltip();
    }
}

function showEntityTooltip(entity, mouseEvent) {
    if (!entityTooltipElement || !entity) {
        hideEntityTooltip();
        return;
    }

    let name, faceData, wieldedWeapon, healthData;

    if (entity === gameState) { // It's the player
        name = document.getElementById('charName')?.value || "Player";
        faceData = gameState.player?.face; // Corrected: directly access gameState.player
        wieldedWeapon = gameState.player?.wieldedWeapon || "Unarmed"; // Default to Unarmed if undefined
        healthData = gameState.health;
    } else { // It's an NPC
        name = entity.name;
        faceData = entity.faceData;
        // Get weapon name from equippedWeaponId
        if (entity.equippedWeaponId && window.assetManager) {
            const weaponDef = window.assetManager.getItem(entity.equippedWeaponId);
            wieldedWeapon = weaponDef ? weaponDef.name : "Unknown Weapon";
        } else {
            wieldedWeapon = "Unarmed";
        }
        healthData = entity.health;
    }

    if (!healthData) { // If entity somehow has no health data, don't show tooltip
        hideEntityTooltip();
        return;
    }

    // Ensure face is generated if missing (especially for player if not done at char creation end)
    if (faceData && !faceData.asciiFace && typeof window.generateAsciiFace === 'function') {
        // This assumes all sub-parameters of faceData are present
        // For player, this should be handled by faceGenerator.js. For NPC, by initializeNpcFace.
        // This is a fallback.
        try {
            faceData.asciiFace = window.generateAsciiFace(faceData);
        } catch (e) {
            faceData.asciiFace = "Error generating face.";
        }
    }


    let html = `<h5>${name || "Unknown"}</h5>`;

    if (faceData && faceData.asciiFace) {
        html += `<div class="section-title">Appearance</div><pre>${faceData.asciiFace}</pre>`;
    }

    html += `<div class="section-title">Weapon</div><p>${wieldedWeapon}</p>`; // Changed label and uses derived wieldedWeapon

    html += `<div class="section-title">Health</div><ul>`;
    for (const partName in healthData) {
        if (healthData.hasOwnProperty(partName)) {
            const part = healthData[partName];
            const formattedName = window.formatBodyPartName ? window.formatBodyPartName(partName) : partName;
            html += `<li><strong>${formattedName}:</strong> ${part.current}/${part.max}</li>`;
        }
    }
    html += `</ul>`;

    entityTooltipElement.innerHTML = html;
    entityTooltipElement.classList.remove('hidden');

    // Positioning logic
    let x = mouseEvent.clientX + 15; // Offset from cursor
    let y = mouseEvent.clientY + 15;

    // Adjust if tooltip goes off-screen
    const tooltipRect = entityTooltipElement.getBoundingClientRect(); // Get actual size after content
    if (x + tooltipRect.width > window.innerWidth) {
        x = mouseEvent.clientX - tooltipRect.width - 15;
    }
    if (y + tooltipRect.height > window.innerHeight) {
        y = mouseEvent.clientY - tooltipRect.height - 15;
    }
    // Ensure it doesn't go off top/left either
    if (x < 0) x = 0;
    if (y < 0) y = 0;


    entityTooltipElement.style.left = `${x}px`;
    entityTooltipElement.style.top = `${y}px`;
    entityTooltipElement.style.opacity = 1;

}

function hideEntityTooltip() {
    if (entityTooltipElement) {
        entityTooltipElement.classList.add('hidden');
        entityTooltipElement.style.opacity = 0;
    }
}

// Expose init function to be called from script.js
window.initEntityTooltip = initEntityTooltip;
