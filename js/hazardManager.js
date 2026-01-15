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

    triggerMistTransformation() {
        const playerPos = this.gameState.playerPos;
        // Spawn Bio-Muncher at player position
        if (window.npcManager && typeof window.npcManager.spawnNpc === 'function') {
            // "bio_muncher" is the ID we added to npcs.json
            window.npcManager.spawnNpc("bio_muncher", playerPos.x, playerPos.y, playerPos.z);
        }

        // Handle Player Death/Game Over
        if (window.combatManager) {
            // Apply massive damage to kill player or trigger specific game over
            // Or just call gameOver directly if accessible?
            // combatManager.applyDamage handles death logic
            window.combatManager.applyDamage(null, this.gameState, 'head', 999, 'Transformation');
        } else {
            // Fallback
            alert("You have transformed into a Bio-Muncher! Game Over.");
            location.reload();
        }
    }

    applyHazardEffect(type, intensity) {
        intensity = intensity || 1;

        // Mitigation Logic (Gas Mask, Suit, etc.)
        let mitigation = 0;

        // Check worn clothing for gas mask tag
        if (this.gameState.player && this.gameState.player.wornClothing) {
            for (const layer in this.gameState.player.wornClothing) {
                const item = this.gameState.player.wornClothing[layer];
                if (item && item.tags && item.tags.includes('gas_mask')) {
                    mitigation = 1; // Full mitigation for now? Or reduction?
                    // If type is mist, full mitigation
                    if (type === 'orange_mist') mitigation = intensity;
                    // If type is radiation, maybe partial?
                    if (type === 'radiation') mitigation = intensity * 0.5;
                    break;
                }
            }
        }

        const effectiveIntensity = Math.max(0, intensity - mitigation);

        if (effectiveIntensity <= 0) return;

        if (type === 'orange_mist') {
            if (!this.gameState.hazards) this.gameState.hazards = { mistExposure: 0 };
            this.gameState.hazards.mistExposure += effectiveIntensity;

            // Threshold is 6 seconds (or turns). Assuming 1 turn = 1 second for hazard tick?
            // Or if intensity is 1 per turn.
            const MIST_TRANSFORMATION_THRESHOLD = 6;

            if (this.gameState.hazards.mistExposure >= MIST_TRANSFORMATION_THRESHOLD) {
                console.warn("Hazard: Mist exposure critical! Transformation imminent.");
                if (window.uiManager) window.uiManager.showToastNotification("The Orange Mist rewrites your DNA...", "danger");

                // Trigger Transformation Logic
                this.triggerMistTransformation();

            } else {
                if (window.uiManager) window.uiManager.showToastNotification("You cough as the orange mist fills your lungs.", "warning");
            }
        } else if (type === 'radiation') {
            if (!this.gameState.hazards) this.gameState.hazards = {};
            this.gameState.hazards.radiationDose = (this.gameState.hazards.radiationDose || 0) + effectiveIntensity;

            const dose = this.gameState.hazards.radiationDose;
            console.log(`Hazard: Radiation Dose. Total: ${dose}`);

            if (dose > 100) {
                if (window.combatManager) window.combatManager.applyDamage(null, this.gameState, 'torso', 1, 'Radiation');
                if (window.uiManager) window.uiManager.showToastNotification("You feel sick from radiation poisoning.", "danger");
            } else if (dose > 50) {
                if (window.uiManager && Math.random() < 0.2) window.uiManager.showToastNotification("You feel nauseous.", "warning");
            }

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
