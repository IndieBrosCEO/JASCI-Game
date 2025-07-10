// js/tooltip.js

function showLookTooltip(event, gameState, mapRenderer, assetManager) {
    const tooltipElement = document.getElementById('entityTooltip');
    if (!tooltipElement || !gameState.isLookModeActive) {
        if (tooltipElement) {
            tooltipElement.classList.add('hidden');
            tooltipElement.style.opacity = '0'; // Ensure opacity is reset if used for transitions
        }
        return;
    }

    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();
    const scrollLeft = mapContainer.scrollLeft;
    const scrollTop = mapContainer.scrollTop;

    const mouseXRelative = event.clientX - rect.left + scrollLeft;
    const mouseYRelative = event.clientY - rect.top + scrollTop;

    let tileWidth = 10;
    let tileHeight = 18;
    const tempSpan = document.createElement('span');
    tempSpan.style.fontFamily = getComputedStyle(mapContainer).fontFamily;
    tempSpan.style.fontSize = getComputedStyle(mapContainer).fontSize;
    tempSpan.style.lineHeight = getComputedStyle(mapContainer).lineHeight;
    tempSpan.style.position = 'absolute';
    tempSpan.style.visibility = 'hidden';
    tempSpan.textContent = 'M';
    document.body.appendChild(tempSpan);
    tileWidth = tempSpan.offsetWidth;
    tileHeight = tempSpan.offsetHeight;
    document.body.removeChild(tempSpan);

    if (tileWidth === 0 || tileHeight === 0) {
        console.warn("Tooltip: Failed to measure tile dimensions accurately. Using defaults.");
        tileWidth = 10;
        tileHeight = 18;
    }

    const mapX = Math.floor(mouseXRelative / tileWidth);
    const mapY = Math.floor(mouseYRelative / tileHeight);
    const mapZ = gameState.currentViewZ;

    const mapData = mapRenderer.getCurrentMapData();
    if (!mapData || !mapData.dimensions || mapX < 0 || mapX >= mapData.dimensions.width || mapY < 0 || mapY >= mapData.dimensions.height) {
        tooltipElement.classList.add('hidden');
        tooltipElement.style.opacity = '0';
        return;
    }

    let htmlContent = '';

    // Basic Info
    htmlContent += `<div class="section-title">Cell Info</div>`;
    htmlContent += `<ul>`;
    htmlContent += `<li><strong>Coords:</strong> (${mapX}, ${mapY}, Z:${mapZ})</li>`;
    htmlContent += `<li><strong>Distance:</strong> ${getDistance3D(gameState.playerPos, { x: mapX, y: mapY, z: mapZ }).toFixed(1)}</li>`;
    const lightLevel = getTileLightingLevel(mapX, mapY, mapZ, gameState);
    htmlContent += `<li><strong>Light:</strong> ${lightLevel.charAt(0).toUpperCase() + lightLevel.slice(1)}</li>`;
    htmlContent += `</ul>`;

    // Tile Layers
    htmlContent += `<div class="section-title">Layers</div><ul>`;
    const currentLevelData = mapData.levels[mapZ.toString()];
    if (currentLevelData) {
        const tileBottomRaw = currentLevelData.bottom?.[mapY]?.[mapX];
        const tileMiddleRaw = currentLevelData.middle?.[mapY]?.[mapX];
        const effTileBottomId = (typeof tileBottomRaw === 'object' && tileBottomRaw?.tileId !== undefined) ? tileBottomRaw.tileId : tileBottomRaw;
        const effTileMiddleId = (typeof tileMiddleRaw === 'object' && tileMiddleRaw?.tileId !== undefined) ? tileMiddleRaw.tileId : tileMiddleRaw;
        const tileDefBottom = assetManager.tilesets[effTileBottomId];
        const tileDefMiddle = assetManager.tilesets[effTileMiddleId];
        htmlContent += `<li><strong>Bottom:</strong> ${tileDefBottom ? tileDefBottom.name : (effTileBottomId || 'Empty')}</li>`;
        htmlContent += `<li><strong>Middle:</strong> ${tileDefMiddle ? tileDefMiddle.name : (effTileMiddleId || 'Empty')}</li>`;
    } else {
        htmlContent += `<li>Bottom: N/A</li><li>Middle: N/A</li>`;
    }
    htmlContent += `</ul>`;

    // Items
    const itemsOnCell = gameState.floorItems.filter(item => item.x === mapX && item.y === mapY && item.z === mapZ);
    if (itemsOnCell.length > 0) {
        htmlContent += `<div class="section-title">Items</div><ul>`;
        itemsOnCell.forEach(item => {
            htmlContent += `<li>${(assetManager.getItem(item.itemId) || { name: item.itemId }).name}</li>`;
        });
        htmlContent += `</ul>`;
    }

    // Entity (Player or NPC)
    let entityObject = null;
    if (gameState.playerPos.x === mapX && gameState.playerPos.y === mapY && gameState.playerPos.z === mapZ) {
        entityObject = gameState; // Special case for player
    } else {
        entityObject = gameState.npcs.find(n => n.mapPos?.x === mapX && n.mapPos?.y === mapY && n.mapPos?.z === mapZ && n.health?.torso?.current > 0 && n.health?.head?.current > 0);
    }

    if (entityObject) {
        const isPlayer = (entityObject === gameState);
        const entityName = isPlayer ? (document.getElementById('charName')?.value || "Player") : (entityObject.name || entityObject.id);

        htmlContent += `<h5>${entityName}</h5>`; // Name as title

        if (isPlayer && gameState.player.face?.asciiFace) {
            htmlContent += `<div class="section-title">Appearance</div><pre>${gameState.player.face.asciiFace}</pre>`;
        } else if (!isPlayer && entityObject.faceData?.asciiFace) { // Humanoid NPC with generated face
            htmlContent += `<div class="section-title">Appearance</div><pre>${entityObject.faceData.asciiFace}</pre>`;
        } else if (!isPlayer && entityObject.asciiPortrait) { // Animal NPC with predefined portrait
            htmlContent += `<div class="section-title">Appearance</div><pre>${entityObject.asciiPortrait}</pre>`;
        }

        let wieldedWeaponName = "Unarmed";
        if (!isPlayer && entityObject.equippedWeaponId) {
            const weaponDef = assetManager.getItem(entityObject.equippedWeaponId);
            if (weaponDef) wieldedWeaponName = weaponDef.name;
        } else if (isPlayer) {
            // Player wielding logic (simplified: check hand slots)
            const primaryHand = gameState.inventory.handSlots[0];
            const secondaryHand = gameState.inventory.handSlots[1];
            if (primaryHand) wieldedWeaponName = primaryHand.name;
            if (secondaryHand && primaryHand) wieldedWeaponName += ` & ${secondaryHand.name}`;
            else if (secondaryHand) wieldedWeaponName = secondaryHand.name;
        }
        htmlContent += `<div class="section-title">Wielding</div><ul><li>${wieldedWeaponName}</li></ul>`;

        const healthObj = isPlayer ? gameState.health : entityObject.health;
        if (healthObj) {
            htmlContent += `<div class="section-title">Health</div><ul>`;
            for (const partName in healthObj) {
                if (Object.hasOwnProperty.call(healthObj, partName)) {
                    const part = healthObj[partName];
                    const formattedPartName = window.formatBodyPartName ? window.formatBodyPartName(partName) : partName;
                    htmlContent += `<li><strong>${formattedPartName}:</strong> ${part.current}/${part.max}</li>`;
                }
            }
            htmlContent += `</ul>`;
        }
    } else {
        htmlContent += `<div class="section-title">Entity</div><ul><li>None</li></ul>`;
    }

    tooltipElement.innerHTML = htmlContent;
    tooltipElement.classList.remove('hidden');
    tooltipElement.style.opacity = '1';


    let tooltipX = event.clientX + 20; // Offset slightly more from cursor
    let tooltipY = event.clientY + 20;

    if (tooltipX + tooltipElement.offsetWidth > window.innerWidth - 10) { // 10px buffer from edge
        tooltipX = event.clientX - tooltipElement.offsetWidth - 20;
    }
    if (tooltipY + tooltipElement.offsetHeight > window.innerHeight - 10) {
        tooltipY = event.clientY - tooltipElement.offsetHeight - 20;
    }
    if (tooltipX < 10) tooltipX = 10; // Prevent going off left edge
    if (tooltipY < 10) tooltipY = 10; // Prevent going off top edge

    tooltipElement.style.left = `${tooltipX}px`;
    tooltipElement.style.top = `${tooltipY}px`;
}

function hideLookTooltip() {
    const tooltipElement = document.getElementById('entityTooltip');
    if (tooltipElement) {
        tooltipElement.classList.add('hidden');
        tooltipElement.style.opacity = '0';
    }
}

if (typeof window !== 'undefined') {
    window.showLookTooltip = showLookTooltip;
    window.hideLookTooltip = hideLookTooltip;
}
