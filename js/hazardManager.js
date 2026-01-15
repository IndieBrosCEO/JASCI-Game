class HazardManager {
    constructor(gameState) {
        this.gameState = gameState;
        // Initialize exposure tracking if needed
        if (!this.gameState.hazards) {
            this.gameState.hazards = {
                mistExposure: 0,
                radiationDose: 0
            };
        }
    }

    processTurn() {
        const player = this.gameState.player;
        const pos = this.gameState.playerPos;
        const mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

        if (!mapData || !mapData.zones) return;

        // Find hazards at player position
        const activeHazards = mapData.zones.filter(zone =>
            zone.type === 'hazard' &&
            zone.z === pos.z &&
            pos.x >= zone.x && pos.x < zone.x + zone.width &&
            pos.y >= zone.y && pos.y < zone.y + zone.height
        );

        activeHazards.forEach(zone => {
            this.applyHazardEffect(zone.hazardType, zone.hazardValue);
        });
    }

    applyHazardEffect(type, intensity) {
        intensity = intensity || 1;

        // Mitigation Logic (Gas Mask, Suit, etc.)
        // This relies on inventory checks.
        // Simplified for now.

        let mitigation = 0;
        // Example: Check head slot for gas mask
        // const headItem = this.gameState.player.wornClothing[ClothingLayers.HEAD_BOTTOM];
        // if (headItem && headItem.tags.includes('gas_mask')) mitigation = 1;

        const effectiveIntensity = Math.max(0, intensity - mitigation);

        if (effectiveIntensity <= 0) return;

        if (type === 'orange_mist') {
            if (!this.gameState.hazards) this.gameState.hazards = { mistExposure: 0 };
            this.gameState.hazards.mistExposure += effectiveIntensity;

            console.log(`Hazard: Exposed to Orange Mist. Level: ${this.gameState.hazards.mistExposure}`);

            if (this.gameState.hazards.mistExposure > 100) {
                // Transformation logic or damage
                console.warn("Hazard: Mist exposure critical!");
                // Trigger event?
            } else if (this.gameState.hazards.mistExposure % 20 === 0) {
                if (window.uiManager) window.uiManager.showToastNotification("You cough as the orange mist fills your lungs.", "warning");
            }
        } else if (type === 'radiation') {
            if (!this.gameState.hazards) this.gameState.hazards = {};
            this.gameState.hazards.radiationDose = (this.gameState.hazards.radiationDose || 0) + effectiveIntensity;
            console.log(`Hazard: Radiation Dose. Total: ${this.gameState.hazards.radiationDose}`);
            if (window.uiManager && Math.random() < 0.2) window.uiManager.showToastNotification("The Geiger counter clicks.", "warning");
        } else if (type === 'fire') {
            // Instant damage
            if (window.combatManager) {
                window.combatManager.applyDamage(null, this.gameState, 'torso', effectiveIntensity, 'Fire');
                if (window.uiManager) window.uiManager.showToastNotification(`You are burning! Took ${effectiveIntensity} damage.`, "danger");
            }
        }
    }
}

window.HazardManager = HazardManager;
