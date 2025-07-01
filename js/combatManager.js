const MEMORY_DURATION_THRESHOLD = 20; // Turns an NPC remembers a last seen position
const RECENTLY_VISITED_MAX_SIZE = 5; // Max number of tiles to keep in recent memory for exploration
const NPC_EXPLORATION_RADIUS = 10; // How far an NPC might pick a random exploration point
const MAX_EXPLORATION_TARGET_ATTEMPTS = 10; // How many times to try finding a new random exploration target

class CombatManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.initiativeTracker = [];
        this.currentTurnIndex = 0;
        this.defenseTypeChangeListener = null;
    }

    populateWeaponSelect() {
        const weaponSelect = document.getElementById('combatWeaponSelect');
        if (!weaponSelect) return;
        weaponSelect.innerHTML = '';
        const unarmedOption = document.createElement('option');
        unarmedOption.value = "unarmed";
        unarmedOption.textContent = "Unarmed";
        weaponSelect.appendChild(unarmedOption);
        const handSlots = this.gameState.inventory.handSlots;
        [handSlots[0], handSlots[1]].forEach(item => {
            if (item && item.type && (item.type.includes("melee") || item.type.includes("firearm") || item.type.includes("bow") || item.type.includes("crossbow") || item.type.includes("thrown") || item.type.includes("weapon_ranged_other") || item.type.includes("weapon_utility_spray"))) {
                const weaponOption = document.createElement('option');
                weaponOption.value = item.id || item.name;
                weaponOption.textContent = item.name;
                weaponOption.dataset.itemData = JSON.stringify(item);
                weaponSelect.appendChild(weaponOption);
            }
        });
        weaponSelect.removeEventListener('change', this.handleWeaponSelectionChange.bind(this));
        weaponSelect.addEventListener('change', this.handleWeaponSelectionChange.bind(this));
        this.handleWeaponSelectionChange({ target: weaponSelect });
    }

    handleWeaponSelectionChange(event) {
        const weaponSelect = event.target;
        const fireModeSelect = document.getElementById('combatFireModeSelect');
        const grappleButton = document.getElementById('attemptGrappleButton');
        const confirmAttackButton = document.getElementById('confirmAttackButton');
        const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        const reloadWeaponButton = document.getElementById('reloadWeaponButton');

        if (!fireModeSelect || !grappleButton || !confirmAttackButton || !bodyPartSelect || !reloadWeaponButton) {
            console.error("One or more UI elements for attack declaration not found in handleWeaponSelectionChange");
            return;
        }

        const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
        let weaponObject = null;
        fireModeSelect.innerHTML = '';

        if (selectedOption.value === "unarmed") weaponObject = null;
        else if (selectedOption.dataset.itemData) weaponObject = JSON.parse(selectedOption.dataset.itemData);
        else weaponObject = this.assetManager.getItem(selectedOption.value);

        const primaryHandItem = this.gameState.inventory.handSlots[0];
        const offHandItem = this.gameState.inventory.handSlots[1];
        const isDualWieldingFirearms = primaryHandItem?.type.includes("firearm") && offHandItem?.type.includes("firearm");

        grappleButton.classList.toggle('hidden', !(selectedOption.value === "unarmed" && !isDualWieldingFirearms));

        if (weaponObject && (weaponObject.type.includes("firearm") || weaponObject.tags?.includes("launcher_treated_as_rifle"))) {
            if (weaponObject.fireModes?.length > 0) {
                weaponObject.fireModes.forEach(mode => {
                    const option = document.createElement('option');
                    option.value = mode; option.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
                    fireModeSelect.appendChild(option);
                });
                fireModeSelect.value = weaponObject.fireModes.includes("single") ? "single" : weaponObject.fireModes[0];
                fireModeSelect.classList.remove('hidden');
            } else {
                const singleOption = document.createElement('option'); singleOption.value = "single"; singleOption.textContent = "Single";
                fireModeSelect.appendChild(singleOption); fireModeSelect.value = "single";
                fireModeSelect.classList.toggle('hidden', !weaponObject.tags?.includes("launcher_treated_as_rifle"));
            }
        } else {
            const singleOption = document.createElement('option'); singleOption.value = "single"; singleOption.textContent = "Single";
            fireModeSelect.appendChild(singleOption); fireModeSelect.value = "single";
            fireModeSelect.classList.add('hidden');
        }
        confirmAttackButton.classList.remove('hidden');
        bodyPartSelect.classList.remove('hidden');
        reloadWeaponButton.classList.toggle('hidden', !(weaponObject && (weaponObject.type.includes("firearm") || weaponObject.tags?.includes("launcher_treated_as_rifle") || weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow") || weaponObject.type === "weapon_thrown_explosive")));
    }

    shareAggroWithTeam(damagedEntity, attacker, threatAmount) {
        if (!damagedEntity || !attacker || threatAmount <= 0) return;
        const isDamagedEntityPlayer = damagedEntity === this.gameState;
        const teamId = isDamagedEntityPlayer ? this.gameState.player.teamId : damagedEntity.teamId;
        if (typeof teamId === 'undefined') {
            logToConsole(`WARN: shareAggroWithTeam - damagedEntity ${isDamagedEntityPlayer ? 'Player' : (damagedEntity.name || damagedEntity.id)} has no teamId.`, 'orange');
            return;
        }

        this.gameState.npcs.forEach(npc => {
            if (npc.teamId === teamId && npc !== attacker && npc !== damagedEntity) {
                if (!npc.aggroList) npc.aggroList = [];
                let entry = npc.aggroList.find(e => e.entityRef === attacker);
                if (entry) entry.threat += threatAmount;
                else npc.aggroList.push({ entityRef: attacker, threat: threatAmount });
                npc.aggroList.sort((a, b) => b.threat - a.threat);
            }
        });
        if (this.gameState.player.teamId === teamId && attacker !== this.gameState && damagedEntity !== this.gameState) {
            if (!this.gameState.player.aggroList) this.gameState.player.aggroList = [];
            let entry = this.gameState.player.aggroList.find(e => e.entityRef === attacker);
            if (entry) entry.threat += threatAmount;
            else this.gameState.player.aggroList.push({ entityRef: attacker, threat: threatAmount });
            this.gameState.player.aggroList.sort((a, b) => b.threat - a.threat);
        }
    }

    promptPlayerAttackDeclaration() {
        this.gameState.isWaitingForPlayerCombatInput = true;
        logToConsole(`[promptPlayerAttackDeclaration] Set isWaitingForPlayerCombatInput to TRUE. Phase: ${this.gameState.combatPhase}`, 'magenta');
        const defenderDisplay = document.getElementById('currentDefender');
        const attackDeclUI = document.getElementById('attackDeclarationUI');

        if (this.gameState.retargetingJustHappened) {
            logToConsole(`Retargeting complete. New target: ${this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id) : 'None'}.`, 'lightblue');
            this.gameState.retargetingJustHappened = false;
        } else if (this.gameState.isRetargeting) {
            logToConsole("Player is selecting a new target. Click on the map.", 'lightblue');
            if (defenderDisplay) defenderDisplay.textContent = "Retargeting: Select new target on map";
            if (attackDeclUI) attackDeclUI.classList.add('hidden');
            return;
        } else if (this.gameState.targetConfirmed) {
            if (this.gameState.selectedTargetEntity) {
                this.gameState.combatCurrentDefender = this.gameState.selectedTargetEntity;
                // Ensure defenderMapPos is correctly 3D from the entity or targetingCoords
                this.gameState.defenderMapPos = this.gameState.selectedTargetEntity.mapPos ?
                    { ...this.gameState.selectedTargetEntity.mapPos } :
                    (this.gameState.targetingCoords || null); // targetingCoords should be 3D
                logToConsole(`Target acquired via targeting system: ${this.gameState.selectedTargetEntity.name || this.gameState.selectedTargetEntity.id} at Z:${this.gameState.defenderMapPos?.z}`, 'lightblue');
            } else if (this.gameState.targetingCoords) { // Ensure targetingCoords exists
                this.gameState.defenderMapPos = { ...this.gameState.targetingCoords }; // targetingCoords is already 3D
                logToConsole(`Targeting system selected tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}, Z:${this.gameState.defenderMapPos.z}.`, 'lightblue');
            } else {
                logToConsole("Error: Target confirmed but no selected entity or targetingCoords available.", "red");
                this.gameState.combatCurrentDefender = null;
                this.gameState.defenderMapPos = null;
            }
            this.gameState.targetConfirmed = false;
        } else if (!this.gameState.combatCurrentDefender && this.gameState.isInCombat) {
            // Auto-target logic needs to be 3D LOS aware for the player as well.
            // For now, this auto-targets the first live NPC, which might not have LOS.
            // This part is less critical for "player targeting" feature but good to note.
            const liveNpcs = this.initiativeTracker.filter(e => !e.isPlayer && e.entity.health?.torso?.current > 0 && e.entity.health?.head?.current > 0);
            if (liveNpcs.length > 0) {
                this.gameState.combatCurrentDefender = liveNpcs[0].entity;
                this.gameState.defenderMapPos = liveNpcs[0].entity.mapPos ? { ...liveNpcs[0].entity.mapPos } : null;
                logToConsole(`Auto-targeting ${this.gameState.combatCurrentDefender.name}.`, 'lightblue');
            } else { logToConsole("No valid NPC targets. Combat may end.", 'orange'); this.endCombat(); return; }
        }

        if (defenderDisplay) {
            if (this.gameState.combatCurrentDefender && this.gameState.defenderMapPos) {
                defenderDisplay.textContent = `Defender: ${this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id} (Z:${this.gameState.defenderMapPos.z})`;
            } else if (this.gameState.defenderMapPos) {
                defenderDisplay.textContent = `Defender: Tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}, Z:${this.gameState.defenderMapPos.z}`;
            } else {
                defenderDisplay.textContent = "Defender: None (Click on map to target)";
            }
        }
        if (attackDeclUI && !this.gameState.isRetargeting) attackDeclUI.classList.remove('hidden');
        this.populateWeaponSelect();
        const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        if (bodyPartSelect) bodyPartSelect.value = "Torso";
        this.gameState.combatPhase = 'playerAttackDeclare';
        if (!this.gameState.isRetargeting) logToConsole("Declare your attack using the UI.", 'lightblue');
    }

    promptPlayerDefenseDeclaration(attackData) {
        this.gameState.isWaitingForPlayerCombatInput = true;
        logToConsole(`[promptPlayerDefenseDeclaration] Set isWaitingForPlayerCombatInput to TRUE. Phase: ${this.gameState.combatPhase}`, 'magenta');
        const defenseTypeSelect = document.getElementById('combatDefenseTypeSelect');
        const blockingLimbSelect = document.getElementById('combatBlockingLimbSelect');
        const defenseUI = document.getElementById('defenseDeclarationUI');
        if (!defenseTypeSelect || !blockingLimbSelect || !defenseUI) {
            logToConsole("Defense UI elements not found! Defaulting to Dodge.", 'red');
            this.gameState.playerDefenseChoice = { type: "Dodge", blockingLimb: null, description: "UI Error - Defaulted" };
            this.gameState.combatPhase = 'resolveRolls'; this.processAttack(); return;
        }
        document.getElementById('defenderPrompt').innerHTML = '';
        defenseTypeSelect.value = "Dodge"; blockingLimbSelect.classList.add('hidden');
        const canBlockArmed = this.gameState.inventory.handSlots.some(item => item?.type.includes("melee"));
        const blockArmedOption = defenseTypeSelect.querySelector('option[value="BlockArmed"]');
        if (blockArmedOption) blockArmedOption.disabled = !canBlockArmed;
        if (!canBlockArmed && defenseTypeSelect.value === "BlockArmed") defenseTypeSelect.value = "Dodge";
        if (this.defenseTypeChangeListener) defenseTypeSelect.removeEventListener('change', this.defenseTypeChangeListener);
        this.defenseTypeChangeListener = (event) => {
            blockingLimbSelect.classList.toggle('hidden', event.target.value !== 'BlockUnarmed');
            if (event.target.value === 'BlockUnarmed') blockingLimbSelect.value = "leftArm";
        };
        defenseTypeSelect.addEventListener('change', this.defenseTypeChangeListener);
        logToConsole(`${this.gameState.combatCurrentAttacker?.name || "Opponent"} is attacking ${(attackData?.bodyPart) || "your body"} with ${attackData?.weapon?.name || "Unarmed"}! Choose your defense.`, 'orange');
        defenseUI.classList.remove('hidden'); this.gameState.combatPhase = 'playerDefenseDeclare';
    }

    startCombat(participants) {
        this.initiativeTracker = []; this.gameState.playerMovedThisTurn = false;
        participants.forEach(p => {
            if (!p) return;
            const isPlayer = p === this.gameState;
            this.initiativeTracker.push({ entity: p, initiative: rollDie(20) + getStatModifier("Dexterity", isPlayer ? this.gameState : p), isPlayer });
            if (!isPlayer) p.movedThisTurn = false;
        });
        this.initiativeTracker.sort((a, b) => b.initiative - a.initiative || (a.isPlayer ? -1 : (b.isPlayer ? 1 : 0)));
        this.currentTurnIndex = -1; this.gameState.isInCombat = true;
        logToConsole("Combat Started!", 'red');
        this.updateInitiativeDisplay(); this.nextTurn();
    }

    updateInitiativeDisplay() {
        const display = document.getElementById('initiativeDisplay'); if (!display) return;
        const heading = display.querySelector('h4'); display.innerHTML = ''; if (heading) display.appendChild(heading);
        this.initiativeTracker.forEach((entry, index) => {
            const p = document.createElement('p');
            p.textContent = `${entry.isPlayer ? (document.getElementById('charName')?.value || "Player") : (entry.entity?.name || entry.entity?.id || "Unknown NPC")}: ${entry.initiative}`;
            if (index === this.currentTurnIndex) { p.style.fontWeight = 'bold'; p.style.color = 'green'; }
            display.appendChild(p);
        });
    }

    async nextTurn(previousAttackerEntity = null) {
        const callSource = previousAttackerEntity ? (previousAttackerEntity === this.gameState ? 'PlayerEndTurn/OutOfAP' : previousAttackerEntity.name) : 'System';
        logToConsole(`[nextTurn CALL] Source: ${callSource}. Current isWaitingForPlayerCombatInput: ${this.gameState.isWaitingForPlayerCombatInput}`, 'magenta');

        if (window.animationManager) while (window.animationManager.isAnimationPlaying()) await new Promise(r => setTimeout(r, 50));

        if (this.gameState.isWaitingForPlayerCombatInput) {
            logToConsole(`[nextTurn DEFERRED] Waiting for player input. Source: ${callSource}.`, 'magenta');
            return;
        }
        if (!this.gameState.isInCombat || this.initiativeTracker.length === 0) { this.endCombat(); return; }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initiativeTracker.length;
        if (this.currentTurnIndex === 0 && previousAttackerEntity) logToConsole("New combat round started.", 'lightblue');

        const currentEntry = this.initiativeTracker[this.currentTurnIndex];
        if (!currentEntry?.entity) { logToConsole("Error: Invalid turn entry. Ending combat.", 'red'); this.endCombat(); return; }

        this.gameState.combatCurrentAttacker = currentEntry.entity;
        const attacker = currentEntry.entity;
        const attackerName = currentEntry.isPlayer ? (document.getElementById('charName')?.value || "Player") : (attacker.name || attacker.id || "Unknown");
        this.gameState.attackerMapPos = currentEntry.isPlayer ? { ...this.gameState.playerPos } : (attacker.mapPos ? { ...attacker.mapPos } : null);
        logToConsole(`--- ${attackerName}'s Turn --- (${this.gameState.isWaitingForPlayerCombatInput ? "WAITING FLAG TRUE" : "WAITING FLAG FALSE"})`, 'lightblue'); // Added flag status here

        if (attacker?.statusEffects) {
            logToConsole(`--- Processing status effects for ${attackerName} --- (${this.gameState.isWaitingForPlayerCombatInput})`, 'teal');
            let effectsToRemove = [];
            for (const effectId in attacker.statusEffects) {
                const effect = attacker.statusEffects[effectId];
                if (effect.damagePerTurn && effect.damageType) {
                    let partToDamage = (currentEntry.isPlayer ? this.gameState : attacker).health?.torso;
                    if (partToDamage) {
                        const DPT = effect.damagePerTurn;
                        partToDamage.current = Math.max(0, partToDamage.current - DPT);
                        logToConsole(`${attackerName} takes ${DPT} ${effect.damageType} from ${effect.displayName}. Torso: ${partToDamage.current}/${partToDamage.max}`, 'red');
                        if (partToDamage.current <= 0) {
                            logToConsole(`DEFEATED: ${attackerName} by ${effect.displayName}!`, 'darkred');
                            if (currentEntry.isPlayer) { this.endCombat(); window.gameOver(this.gameState); return; }
                            else {
                                this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== attacker);
                                this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== attacker);
                                if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health?.torso?.current > 0)) { this.endCombat(); return; }
                                await this.nextTurn(attacker); return;
                            }
                        }
                    }
                }
                if (effect.duration > 0) effect.duration--;
                if (effect.duration <= 0) { effectsToRemove.push(effectId); logToConsole(`${effect.displayName} worn off for ${attackerName}.`, 'teal'); }
                else logToConsole(`${effect.displayName} on ${attackerName}: ${effect.duration} turns left.`, 'grey');
            }
            effectsToRemove.forEach(id => delete attacker.statusEffects[id]);
            if (currentEntry.isPlayer && window.renderCharacterInfo) window.renderCharacterInfo();
            if (currentEntry.isPlayer && window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        }

        // Process environmental effects (Smoke and Tear Gas tiles)
        if (this.gameState.environmentalEffects) {
            let changed = false;
            // Smoke Tiles
            if (this.gameState.environmentalEffects.smokeTiles) {
                for (let i = this.gameState.environmentalEffects.smokeTiles.length - 1; i >= 0; i--) {
                    const smokeTile = this.gameState.environmentalEffects.smokeTiles[i];
                    smokeTile.duration--;
                    if (smokeTile.duration <= 0) {
                        logToConsole(`Smoke dissipates at (${smokeTile.x}, ${smokeTile.y}).`, 'grey');
                        this.gameState.environmentalEffects.smokeTiles.splice(i, 1); changed = true;
                    }
                }
            }
            // Tear Gas Tiles
            if (this.gameState.environmentalEffects.tearGasTiles) {
                for (let i = this.gameState.environmentalEffects.tearGasTiles.length - 1; i >= 0; i--) {
                    const gasTile = this.gameState.environmentalEffects.tearGasTiles[i];
                    gasTile.duration--;
                    if (gasTile.duration <= 0) {
                        logToConsole(`Tear gas dissipates at (${gasTile.x}, ${gasTile.y}).`, 'grey');
                        this.gameState.environmentalEffects.tearGasTiles.splice(i, 1); changed = true;
                    }
                }
            }
            if (changed && window.mapRenderer) window.mapRenderer.scheduleRender();

            // Update character statuses based on environmental effects
            this.initiativeTracker.map(e => e.entity).forEach(combatant => {
                if (!combatant || (!combatant.mapPos && combatant !== this.gameState)) return;
                const pos = (combatant === this.gameState) ? this.gameState.playerPos : combatant.mapPos; if (!pos) return;

                // Smoke status
                const isOnSmokeTile = this.gameState.environmentalEffects.smokeTiles?.some(s => s.x === pos.x && s.y === pos.y);
                let currentInSmokeStatus = combatant.statusEffects ? combatant.statusEffects["in_smoke"] : null;
                if (isOnSmokeTile) {
                    if (!currentInSmokeStatus) {
                        if (!combatant.statusEffects) combatant.statusEffects = {};
                        combatant.statusEffects["in_smoke"] = { id: "in_smoke", displayName: "In Smoke", duration: 1, sourceItemId: "smoke_grenade_thrown", description: "Vision obscured. Attack -2." };
                    } else currentInSmokeStatus.duration = Math.max(currentInSmokeStatus.duration, 1);
                } else if (currentInSmokeStatus) delete combatant.statusEffects["in_smoke"];

                // Tear Gas status & DoT
                const isOnTearGasTile = this.gameState.environmentalEffects.tearGasTiles?.some(t => t.x === pos.x && t.y === pos.y);
                let currentTearGasStatus = combatant.statusEffects ? combatant.statusEffects["irritated_tear_gas"] : null;
                if (isOnTearGasTile) {
                    const combatantName = combatant === this.gameState ? "Player" : (combatant.name || combatant.id);
                    if (!currentTearGasStatus) {
                        if (!combatant.statusEffects) combatant.statusEffects = {};
                        combatant.statusEffects["irritated_tear_gas"] = { id: "irritated_tear_gas", displayName: "Irritated (Tear Gas)", duration: 1, sourceItemId: "tear_gas_grenade_thrown", accuracyPenalty: -2, description: "Eyes watering, coughing. Accuracy -2. Takes damage." };
                        logToConsole(`${combatantName} enters tear gas.`, 'orange');
                    } else {
                        currentTearGasStatus.duration = Math.max(currentTearGasStatus.duration, 1);
                    }
                    const tearGasDamage = Math.max(0, rollDiceNotation(parseDiceNotation("1d2-1")));
                    if (tearGasDamage > 0) {
                        logToConsole(`${combatantName} takes ${tearGasDamage} damage from tear gas.`, 'red');
                        this.applyDamage(this.gameState.combatCurrentAttacker || { name: "Environment" }, combatant, "Torso", tearGasDamage, "Chemical", { name: "Tear Gas Cloud" });
                        let healthEntity = combatant === this.gameState ? this.gameState : combatant;
                        if (healthEntity.health.torso.current <= 0 || healthEntity.health.head.current <= 0) {
                            logToConsole(`DEFEATED: ${combatantName} succumbed to tear gas!`, 'darkred');
                            if (combatant === this.gameState) { this.endCombat(); window.gameOver(this.gameState); return; }
                            else {
                                this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== combatant);
                                this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== combatant);
                                window.mapRenderer.scheduleRender();
                                if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health?.torso?.current > 0)) { this.endCombat(); return; }
                            }
                        }
                    }
                } else if (currentTearGasStatus && !isOnTearGasTile) {
                    // If status was only from tile, it should be removed. If from direct hit, normal duration applies.
                    // Current logic: status applied if on tile has duration 1, so it wears off if they move.
                }
                if (combatant === this.gameState && window.renderCharacterInfo) window.renderCharacterInfo();
                if (combatant === this.gameState && window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
            });
        }


        if (currentEntry.isPlayer) {
            logToConsole(`[nextTurn] Setting up PLAYER turn. Initial isWaiting: ${this.gameState.isWaitingForPlayerCombatInput}`, 'green');
            // REMOVED: playerForcedEndTurnWithZeroAP block that caused premature turn skip.
            // Player turn should always proceed if it's their turn in initiative.
            // AP/MP reset below ensures they have resources.
            this.gameState.playerMovedThisTurn = false;

            // Reset Player AP/MP at the start of their turn in combat
            this.gameState.actionPointsRemaining = 1; // Default, adjust if player has different base AP
            this.gameState.movementPointsRemaining = 6; // Default, adjust if player has different base MP
            this.gameState.hasDashed = false;
            logToConsole(`[nextTurn] Player AP/MP RESET. AP: ${this.gameState.actionPointsRemaining}, MP: ${this.gameState.movementPointsRemaining}`, 'yellow');

            window.turnManager.updateTurnUI(); // Update UI with refreshed AP/MP

            if (!this.gameState.retargetingJustHappened) {
                this.gameState.combatCurrentDefender = null; this.gameState.defenderMapPos = null;
                const aggroTarget = this.gameState.player?.aggroList?.find(a => a.entityRef && a.entityRef !== this.gameState && a.entityRef.health?.torso?.current > 0 && a.entityRef.health?.head?.current > 0 && a.entityRef.teamId !== this.gameState.player.teamId && this.initiativeTracker.find(e => e.entity === a.entityRef));
                if (aggroTarget) { this.gameState.combatCurrentDefender = aggroTarget.entityRef; this.gameState.defenderMapPos = { ...aggroTarget.entityRef.mapPos }; logToConsole(`Player auto-targets ${aggroTarget.entityRef.name} from aggro.`, 'lightblue'); }
                else {
                    let closest = null, minDist = Infinity;
                    this.initiativeTracker.forEach(e => {
                        const cand = e.entity;
                        if (cand !== this.gameState && cand.health?.torso?.current > 0 && cand.health?.head?.current > 0 && cand.teamId !== this.gameState.player.teamId && cand.mapPos && this.gameState.playerPos) {
                            const d = Math.abs(this.gameState.playerPos.x - cand.mapPos.x) + Math.abs(this.gameState.playerPos.y - cand.mapPos.y);
                            if (d < minDist) { minDist = d; closest = cand; }
                        }
                    });
                    if (closest) { this.gameState.combatCurrentDefender = closest; this.gameState.defenderMapPos = { ...closest.mapPos }; logToConsole(`Player auto-targets nearest enemy: ${closest.name}.`, 'lightblue'); }
                    else logToConsole("Player found no valid enemies.", 'orange');
                }
            }
            this.gameState.isRetargeting = false;
            this.promptPlayerAttackDeclaration(); // Sets isWaitingForPlayerCombatInput = true
            logToConsole(`[nextTurn] PLAYER turn setup complete. isWaiting (after prompt): ${this.gameState.isWaitingForPlayerCombatInput}`, 'green');
        } else { // NPC's turn
            attacker.movedThisTurn = false;
            attacker.currentActionPoints = attacker.defaultActionPoints || 1;
            attacker.currentMovementPoints = attacker.defaultMovementPoints || 6; // Standard MP for NPCs
            logToConsole(`[nextTurn] NPC (${attackerName}) AP/MP RESET. AP: ${attacker.currentActionPoints}, MP: ${attacker.currentMovementPoints}`, 'yellow');

            this.gameState.combatCurrentDefender = this.gameState; // Default target for NPC
            this.gameState.defenderMapPos = this.gameState.playerPos ? { ...this.gameState.playerPos } : null;

            this.gameState.combatPhase = 'attackerDeclare';
            await this.executeNpcCombatTurn(attacker);
        }
    }

    endCombat() {
        logToConsole("Combat Ending...", 'lightblue');
        this.gameState.isInCombat = false; this.gameState.combatPhase = null; this.gameState.attackerMapPos = null; this.gameState.defenderMapPos = null; this.gameState.combatCurrentDefender = null;
        this.initiativeTracker.forEach(e => { if (e.entity?.statusEffects) { e.entity.statusEffects.isGrappled = false; e.entity.statusEffects.grappledBy = null; } });
        if (this.gameState.statusEffects) { this.gameState.statusEffects.isGrappled = false; this.gameState.statusEffects.grappledBy = null; }
        if (this.gameState.environmentalEffects) {
            this.gameState.environmentalEffects.smokeTiles = [];
            this.gameState.environmentalEffects.tearGasTiles = [];
        }
        this.initiativeTracker = []; this.currentTurnIndex = 0;
        const initiativeDisplay = document.getElementById('initiativeDisplay'); if (initiativeDisplay) { const h = initiativeDisplay.querySelector('h4'); initiativeDisplay.innerHTML = ''; if (h) initiativeDisplay.appendChild(h); }
        document.getElementById('attackDeclarationUI')?.classList.add('hidden');
        document.getElementById('defenseDeclarationUI')?.classList.add('hidden');
        this.updateCombatUI(); logToConsole("Combat Ended.", 'lightblue');
        const defenseSelect = document.getElementById('combatDefenseTypeSelect');
        if (defenseSelect && this.defenseTypeChangeListener) { defenseSelect.removeEventListener('change', this.defenseTypeChangeListener); this.defenseTypeChangeListener = null; }
        window.mapRenderer.scheduleRender();
    }

    handleConfirmedAttackDeclaration() {
        logToConsole(`[handleConfirmedAttackDeclaration] Setting isWaitingForPlayerCombatInput to FALSE. Current phase: ${this.gameState.combatPhase}`, 'magenta');
        this.gameState.isWaitingForPlayerCombatInput = false; this.gameState.retargetingJustHappened = false;
        const weaponSelect = document.getElementById('combatWeaponSelect'); const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        const selectedVal = weaponSelect.value; let weaponObj = null, attackType = "unarmed";
        if (selectedVal === "unarmed") { weaponObj = null; attackType = "melee"; }
        else {
            weaponObj = this.gameState.inventory.handSlots.find(i => i && (i.id === selectedVal || i.name === selectedVal)) || this.assetManager.getItem(selectedVal);
            if (weaponObj) {
                if (weaponObj.type.includes("melee")) attackType = "melee";
                else if (weaponObj.type.includes("firearm") || weaponObj.type.includes("bow") || weaponObj.type.includes("crossbow") || weaponObj.type.includes("weapon_ranged_other") || weaponObj.type.includes("thrown") || weaponObj.type.includes("weapon_utility_spray")) attackType = "ranged";
                else { logToConsole(`WARN: Unknown weapon type '${weaponObj.type}' for ${weaponObj.name}. Defaulting to unarmed.`, 'orange'); weaponObj = null; attackType = "melee"; }
            } else { logToConsole(`WARN: Weapon '${selectedVal}' not found. Defaulting to unarmed.`, 'orange'); weaponObj = null; attackType = "melee"; }
        }
        if (!this.gameState.combatCurrentDefender && !(weaponObj?.type === "weapon_thrown_utility" || weaponObj?.type === "weapon_utility_spray")) {
            logToConsole("ERROR: No target selected for non-utility attack.", 'red'); this.promptPlayerAttackDeclaration(); return;
        }
        const fireMode = document.getElementById('combatFireModeSelect')?.value || "single";
        const bodyPart = bodyPartSelect.value;
        const currentTargetName = this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id) : "tile";
        this.gameState.pendingCombatAction = { target: this.gameState.combatCurrentDefender, weapon: weaponObj, attackType, bodyPart, fireMode, actionType: "attack", entity: this.gameState, skillToUse: null, targetTile: null, actionDescription: `${weaponObj ? weaponObj.name : "Unarmed"} attack on ${currentTargetName}'s ${bodyPart}` };
        logToConsole(`Player declares: ${attackType} attack on ${currentTargetName}'s ${bodyPart} with ${weaponObj ? weaponObj.name : 'Unarmed'} (Mode: ${fireMode}).`, 'lightgreen');

        // Ensure targetTile is set for all thrown types that might need it (explosives, utilities, liquids)
        if (weaponObj?.type?.includes("thrown")) {
            let skill = "Strength"; // Default for generic thrown
            if (weaponObj.type === "weapon_thrown_explosive") skill = "Explosives";
            // Potentially other skills for other thrown types if needed in future

            this.gameState.pendingCombatAction.skillToUse = skill;

            if (this.gameState.combatCurrentDefender && this.gameState.combatCurrentDefender.mapPos) {
                // Ensure mapPos includes Z, it should if NPCs are correctly initialized
                this.gameState.pendingCombatAction.targetTile = { ...this.gameState.combatCurrentDefender.mapPos };
            } else if (this.gameState.defenderMapPos) {
                // defenderMapPos should be 3D from targeting system
                this.gameState.pendingCombatAction.targetTile = { ...this.gameState.defenderMapPos };
            } else {
                logToConsole("ERROR: Target tile for thrown item not determined (no defender with pos and no 3D tile target).", 'red');
                this.promptPlayerAttackDeclaration(); return;
            }
            logToConsole(`Throwing ${weaponObj.name} (Skill: ${skill}) at/towards tile (${this.gameState.pendingCombatAction.targetTile.x},${this.gameState.pendingCombatAction.targetTile.y}, Z:${this.gameState.pendingCombatAction.targetTile.z}).`, 'lightgreen');
        } else { // Not a thrown item, check for dual wield if applicable
            const pHand = this.gameState.inventory.handSlots[0], oHand = this.gameState.inventory.handSlots[1];
            this.gameState.dualWieldPending = pHand?.type.includes("firearm") && oHand?.type.includes("firearm") && weaponObj?.id === pHand.id;
            if (this.gameState.dualWieldPending) logToConsole("Dual wield attack initiated.", 'lightgreen');
        }
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'defenderDeclare'; this.handleDefenderActionPrompt();
    }

    handleConfirmedDefenseDeclaration() {
        logToConsole(`[handleConfirmedDefenseDeclaration] Setting isWaitingForPlayerCombatInput to FALSE. Current phase: ${this.gameState.combatPhase}`, 'magenta');
        this.gameState.isWaitingForPlayerCombatInput = false;
        const defenseType = document.getElementById('combatDefenseTypeSelect').value;
        const blockingLimb = defenseType === 'BlockUnarmed' ? document.getElementById('combatBlockingLimbSelect').value : null;
        this.gameState.playerDefenseChoice = { type: defenseType, blockingLimb, description: defenseType + (blockingLimb ? ` with ${blockingLimb}` : "") };
        logToConsole(`Player defends: ${this.gameState.playerDefenseChoice.description}.`, 'lightgreen');
        document.getElementById('defenseDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'resolveRolls'; this.processAttack();
    }

    decideNpcDefense() {
        const npc = this.gameState.combatCurrentDefender; const attackData = this.gameState.pendingCombatAction;
        let defense = "Dodge";
        if (attackData.attackType === "ranged" && attackData.weapon && !attackData.weapon.type.includes("thrown")) defense = "None";
        else if (attackData.attackType === "melee" || attackData.weapon?.type.includes("thrown")) {
            const npcWeapon = npc.equippedWeaponId ? this.assetManager.getItem(npc.equippedWeaponId) : null;
            if (npcWeapon?.type.includes("melee")) defense = "BlockArmed";
            else if (getSkillValue("Unarmed", npc) > 0 && getSkillModifier("Unarmed", npc) >= getStatModifier("Dexterity", npc) - 2) defense = "BlockUnarmed";
        }
        this.gameState.npcDefenseChoice = defense; logToConsole(`${npc.name} defends: ${defense}.`, 'gold');
    }

    handleDefenderActionPrompt() {
        const defender = this.gameState.combatCurrentDefender, attacker = this.gameState.combatCurrentAttacker;
        if (!defender && !(this.gameState.pendingCombatAction?.targetTile && (this.gameState.pendingCombatAction?.weapon?.type === "weapon_thrown_explosive" || this.gameState.pendingCombatAction?.weapon?.type === "weapon_thrown_utility"))) {
            logToConsole(`Error: Defender not set & not valid area effect. Attacker: ${attacker?.name}.`, 'red');
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration(); else this.nextTurn(attacker); return;
        }
        if (defender === this.gameState) {
            if (!this.gameState.pendingCombatAction || Object.keys(this.gameState.pendingCombatAction).length === 0) {
                this.gameState.playerDefenseChoice = { type: "Dodge", blockingLimb: null, description: "Error - No attack data" };
                this.gameState.combatPhase = 'resolveRolls'; this.processAttack(); return;
            }
            if (this.gameState.pendingCombatAction.attackType === "ranged" && this.gameState.pendingCombatAction.weapon && !this.gameState.pendingCombatAction.weapon.type.includes("thrown") && !(this.gameState.pendingCombatAction.weapon.tags?.includes("launcher_treated_as_rifle") && this.gameState.pendingCombatAction.weapon.explodesOnImpact)) {
                this.gameState.playerDefenseChoice = { type: "None", blockingLimb: null, description: "No active defense vs non-thrown/non-explosive ranged" };
                this.gameState.combatPhase = 'resolveRolls'; this.processAttack();
            } else this.promptPlayerDefenseDeclaration(this.gameState.pendingCombatAction);
        } else if (defender) { this.decideNpcDefense(); this.gameState.combatPhase = 'resolveRolls'; this.processAttack(); }
        else { logToConsole("Attacking tile. No defender action.", 'gold'); this.gameState.combatPhase = 'resolveRolls'; this.processAttack(); }
    }

    calculateAttackRoll(attacker, weapon, targetBodyPartArg, actionContext = {}) {
        const attackerNameForLog = (attacker === this.gameState || attacker === this.gameState.player) ? (document.getElementById('charName')?.value || "Player") : (attacker.name || attacker.id);
        let skillName, skillBasedModifier;
        actionContext.attackerMovementPenalty = (attacker === this.gameState && this.gameState.playerMovedThisTurn) || (attacker !== this.gameState && attacker.movedThisTurn) ? -2 : 0;
        const rangeModifier = actionContext.rangeModifier || 0;
        const attackModifierForFireMode = actionContext.attackModifier || 0;

        if (actionContext.skillToUse === "Explosives") { skillName = "Explosives"; skillBasedModifier = getSkillModifier(skillName, attacker); }
        else if (!weapon || weapon === "unarmed" || !weapon.type) { skillName = "Unarmed"; skillBasedModifier = getSkillModifier(skillName, attacker); }
        else if (weapon.type.includes("melee")) { skillName = "Melee Weapons"; skillBasedModifier = getSkillModifier(skillName, attacker); }
        else if (weapon.type.includes("firearm") || weapon.type.includes("bow") || weapon.type.includes("crossbow") || weapon.tags?.includes("launcher_treated_as_rifle")) { skillName = "Guns"; skillBasedModifier = getSkillModifier(skillName, attacker); }
        else if (weapon.type.includes("thrown")) { skillName = "Strength"; skillBasedModifier = getStatModifier("Strength", attacker); }
        else { skillName = "Unarmed"; skillBasedModifier = getSkillModifier(skillName, attacker); }
        actionContext.skillName = skillName; actionContext.skillBasedModifier = skillBasedModifier;

        let targetX, targetY;
        if (actionContext.skillToUse === "Explosives" && this.gameState.pendingCombatAction?.targetTile) {
            targetX = this.gameState.pendingCombatAction.targetTile.x; targetY = this.gameState.pendingCombatAction.targetTile.y;
        } else if (this.gameState.combatCurrentDefender?.mapPos) {
            targetX = this.gameState.combatCurrentDefender.mapPos.x; targetY = this.gameState.combatCurrentDefender.mapPos.y;
        }
        let isLitBySource = false;
        if (typeof targetX === 'number' && this.gameState.lightSources && typeof isTileIlluminated === 'function') {
            for (const source of this.gameState.lightSources) { if (isTileIlluminated(targetX, targetY, source)) { isLitBySource = true; break; } }
        }
        const ambientColorHex = (typeof getAmbientLightColor === 'function' && this.gameState.currentTime?.hours !== undefined) ? getAmbientLightColor(this.gameState.currentTime.hours) : '#FFFFFF';
        const isAmbientDark = ['#303045'].includes(ambientColorHex.toUpperCase());
        let lightingPenalty = (!isLitBySource && isAmbientDark) ? -2 : 0;

        let statusEffectAttackPenalty = 0;
        if (attacker.statusEffects) {
            if (attacker.statusEffects["blinded_pepper_spray"]?.visionPenalty) {
                statusEffectAttackPenalty += attacker.statusEffects["blinded_pepper_spray"].visionPenalty;
            }
            if (attacker.statusEffects["irritated_tear_gas"]?.accuracyPenalty) {
                statusEffectAttackPenalty += attacker.statusEffects["irritated_tear_gas"].accuracyPenalty;
            }
            if (attacker.statusEffects["in_smoke"]) {
                statusEffectAttackPenalty += -2;
            }
        }
        const defender = this.gameState.combatCurrentDefender;
        if (defender && defender.statusEffects && defender.statusEffects["in_smoke"]) {
            statusEffectAttackPenalty += -2;
        }

        let baseRoll = rollDie(20);
        if (actionContext.isSecondAttack) baseRoll = Math.min(rollDie(20), rollDie(20));
        actionContext.bodyPartModifier = 0;
        if (this.gameState.combatCurrentDefender && targetBodyPartArg) {
            if (targetBodyPartArg.toLowerCase() === "head") actionContext.bodyPartModifier = -4;
            else if (["leftArm", "rightArm", "leftLeg", "rightLeg"].includes(targetBodyPartArg)) actionContext.bodyPartModifier = -1;
        }
        const totalAttackRoll = baseRoll + skillBasedModifier + actionContext.bodyPartModifier + rangeModifier + attackModifierForFireMode + actionContext.attackerMovementPenalty + lightingPenalty + statusEffectAttackPenalty;
        actionContext.statusEffectAttackPenalty = statusEffectAttackPenalty;
        actionContext.lightingPenaltyApplied = lightingPenalty;

        const canCrit = !(actionContext.isSecondAttack || actionContext.isBurst || actionContext.isAutomatic);
        return { roll: totalAttackRoll, naturalRoll: baseRoll, isCriticalHit: canCrit && baseRoll === 20, isCriticalMiss: canCrit && baseRoll === 1 };
    }

    calculateDefenseRoll(defender, defenseType, attackerWeapon, coverBonus = 0, actionContext = {}) {
        if (!defender) return { roll: 0, naturalRoll: 0, isCriticalSuccess: false, isCriticalFailure: false, coverBonusApplied: 0, movementBonusApplied: 0, defenseSkillValue: 0, defenseSkillName: "N/A", statusEffectDefensePenalty: 0 };
        let statusEffectDefensePenalty = 0;
        let defenderMovementBonus = (defender === this.gameState && this.gameState.playerMovedThisTurn) || (defender !== this.gameState && defender.movedThisTurn) ? 2 : 0;
        if (defenseType === "None") {
            const baseRoll = rollDie(20);
            const totalDefenseRoll = baseRoll + coverBonus + defenderMovementBonus + statusEffectDefensePenalty;
            return { roll: totalDefenseRoll, naturalRoll: baseRoll, isCriticalSuccess: baseRoll === 20, isCriticalFailure: baseRoll === 1, coverBonusApplied: coverBonus, movementBonusApplied: defenderMovementBonus, defenseSkillValue: 0, defenseSkillName: "Passive", statusEffectDefensePenalty };
        }
        const baseRoll = rollDie(20);
        let baseDefenseValue = 0, defenseSkillName = "";
        switch (defenseType) {
            case "Dodge": defenseSkillName = "Unarmed + Dexterity"; baseDefenseValue = getStatModifier("Dexterity", defender) + getSkillModifier("Unarmed", defender); break;
            case "BlockUnarmed": defenseSkillName = "Unarmed + Constitution"; baseDefenseValue = getStatModifier("Constitution", defender) + getSkillModifier("Unarmed", defender); break;
            case "BlockArmed": defenseSkillName = "Melee Weapons"; baseDefenseValue = getSkillModifier("Melee Weapons", defender); break;
        }
        const totalDefenseRoll = baseRoll + baseDefenseValue + coverBonus + defenderMovementBonus + statusEffectDefensePenalty;
        return { roll: totalDefenseRoll, naturalRoll: baseRoll, isCriticalSuccess: baseRoll === 20, isCriticalFailure: baseRoll === 1, coverBonusApplied: coverBonus, movementBonusApplied: defenderMovementBonus, defenseSkillValue: baseDefenseValue, defenseSkillName, statusEffectDefensePenalty };
    }

    applySpecialEffect(attacker, item, targetEntity = null, impactTile = null) {
        if (!item || !item.specialEffect) { logToConsole(`Item ${item?.name} has no specialEffect string.`, 'grey'); return; }
        const effectString = item.specialEffect;
        const burstRadiusFt = item.burstRadiusFt || 0;
        const burstRadiusTiles = Math.ceil(burstRadiusFt / 5);
        logToConsole(`Applying special effect "${effectString}" from ${item.name}. Radius: ${burstRadiusFt}ft (${burstRadiusTiles}t).`, 'cyan');
        let affectedEntities = [];
        let areaEffectProcessedThisCall = false;

        if (burstRadiusTiles > 0 && impactTile) {
            affectedEntities = this.getCharactersInBlastRadius(impactTile, burstRadiusTiles);
            logToConsole(`Effect "${effectString}" targets ${affectedEntities.length} entities in burst radius around (${impactTile.x},${impactTile.y}).`, 'cyan');

            if (item.id === "smoke_grenade_thrown" && !areaEffectProcessedThisCall) {
                if (!this.gameState.environmentalEffects) this.gameState.environmentalEffects = {};
                if (!this.gameState.environmentalEffects.smokeTiles) this.gameState.environmentalEffects.smokeTiles = [];
                const smokeDuration = 5;
                for (let dx = -burstRadiusTiles; dx <= burstRadiusTiles; dx++) {
                    for (let dy = -burstRadiusTiles; dy <= burstRadiusTiles; dy++) {
                        if (Math.sqrt(dx * dx + dy * dy) <= burstRadiusTiles) {
                            const tileX = impactTile.x + dx; const tileY = impactTile.y + dy;
                            const existingSmoke = this.gameState.environmentalEffects.smokeTiles.find(st => st.x === tileX && st.y === tileY);
                            if (existingSmoke) existingSmoke.duration = Math.max(existingSmoke.duration, smokeDuration);
                            else this.gameState.environmentalEffects.smokeTiles.push({ x: tileX, y: tileY, duration: smokeDuration });
                        }
                    }
                }
                logToConsole(`Smoke cloud created at (${impactTile.x},${impactTile.y}), radius ${burstRadiusTiles}t, duration ${smokeDuration} turns.`, 'grey');
                if (window.mapRenderer) window.mapRenderer.scheduleRender();
                areaEffectProcessedThisCall = true;
            } else if (item.id === "tear_gas_grenade_thrown" && !areaEffectProcessedThisCall) {
                if (!this.gameState.environmentalEffects) this.gameState.environmentalEffects = {};
                if (!this.gameState.environmentalEffects.tearGasTiles) this.gameState.environmentalEffects.tearGasTiles = [];
                const gasDuration = 4;
                for (let dx = -burstRadiusTiles; dx <= burstRadiusTiles; dx++) {
                    for (let dy = -burstRadiusTiles; dy <= burstRadiusTiles; dy++) {
                        if (Math.sqrt(dx * dx + dy * dy) <= burstRadiusTiles) {
                            const tileX = impactTile.x + dx; const tileY = impactTile.y + dy;
                            const existingGas = this.gameState.environmentalEffects.tearGasTiles.find(gt => gt.x === tileX && gt.y === tileY);
                            if (existingGas) existingGas.duration = Math.max(existingGas.duration, gasDuration);
                            else this.gameState.environmentalEffects.tearGasTiles.push({ x: tileX, y: tileY, duration: gasDuration });
                        }
                    }
                }
                logToConsole(`Tear gas cloud created at (${impactTile.x},${impactTile.y}), radius ${burstRadiusTiles}t, duration ${gasDuration} turns.`, 'yellow');
                if (window.mapRenderer) window.mapRenderer.scheduleRender();
                areaEffectProcessedThisCall = true;
            }
        } else if (targetEntity) affectedEntities.push(targetEntity);
        else { logToConsole(`WARN: No target/impact for special effect "${effectString}" of ${item.name}.`, 'orange'); return; }

        affectedEntities.forEach(entity => {
            if (!entity.statusEffects) entity.statusEffects = {};
            const entityName = entity === this.gameState ? "Player" : (entity.name || entity.id);
            let existingEffect, duration, damagePerTurn, penalty;

            if (effectString === "Creates smoke screen" && item.id === "smoke_grenade_thrown") {
                existingEffect = entity.statusEffects["in_smoke"]; duration = 2;
                if (!existingEffect) entity.statusEffects["in_smoke"] = { id: "in_smoke", displayName: "In Smoke", duration, sourceItemId: item.id, description: "Vision obscured. Attack -2." };
                else existingEffect.duration = Math.max(existingEffect.duration, duration);
                logToConsole(`${entityName} is in smoke.`, 'grey');
            } else if (effectString === "Causes irritation, coughing, crying" && item.id === "tear_gas_grenade_thrown") {
                existingEffect = entity.statusEffects["irritated_tear_gas"]; duration = 3; penalty = -2;
                if (!existingEffect) entity.statusEffects["irritated_tear_gas"] = { id: "irritated_tear_gas", displayName: "Irritated (Tear Gas)", duration, sourceItemId: item.id, accuracyPenalty: penalty, description: `Eyes watering, coughing. Accuracy ${penalty}.` };
                else existingEffect.duration = Math.max(existingEffect.duration, duration);
                logToConsole(`${entityName} ${existingEffect ? 'tear gas refreshed' : 'irritated by tear gas!'}. Accuracy ${penalty}.`, 'orange');
            } else if (effectString === "Temporary Blindness and Irritation" && item.id === "pepper_spray") {
                existingEffect = entity.statusEffects["blinded_pepper_spray"]; duration = 2; penalty = -10;
                if (!existingEffect) entity.statusEffects["blinded_pepper_spray"] = { id: "blinded_pepper_spray", displayName: "Blinded (Pepper Spray)", duration, sourceItemId: item.id, visionPenalty: penalty, description: `Eyes burning. Attack Roll ${penalty}.` };
                else existingEffect.duration = Math.max(existingEffect.duration, duration);
                logToConsole(`${entityName} ${existingEffect ? 'pepper spray blindness refreshed' : 'blinded by pepper spray!'}. Vision Penalty ${penalty}.`, 'red');
            } else if (item.id === "acid_mild_thrown" && targetEntity === entity && (effectString === "Lingering Acid Burn" || !effectString || effectString === "")) {
                existingEffect = entity.statusEffects["acid_burn"]; duration = 3; damagePerTurn = rollDie(2);
                if (!existingEffect) entity.statusEffects["acid_burn"] = { id: "acid_burn", displayName: "Acid Burn", duration, sourceItemId: item.id, damagePerTurn, damageType: "Acid", description: `Corrosive acid burns, ${damagePerTurn} Acid dmg/turn.` };
                else { existingEffect.duration = Math.max(existingEffect.duration, duration); existingEffect.damagePerTurn = Math.max(existingEffect.damagePerTurn, damagePerTurn); }
                logToConsole(`${entityName} ${existingEffect ? 'acid burn refreshed/intensified' : 'suffering acid burn!'}. Dmg/turn: ${entity.statusEffects["acid_burn"].damagePerTurn}.`, 'darkgreen');
            }
            if (entity === this.gameState && window.renderCharacterInfo) window.renderCharacterInfo();
            if (entity === this.gameState && window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        });

        // Handle Lingering Acid Burn specifically if not covered by the loop (e.g. direct hit of acid_mild_thrown)
        // This ensures the DoT is applied to the primary target even if it wasn't in a generic "affectedEntities" list for some reason
        // or if the specialEffect string wasn't processed for it in the loop.
        if (item.id === "acid_mild_thrown" && effectString === "Lingering Acid Burn" && targetEntity) {
            if (!targetEntity.statusEffects) targetEntity.statusEffects = {};
            let existingAcidEffect = targetEntity.statusEffects["acid_burn"];
            const acidDuration = 3; // Duration in turns
            const acidDmgPerTurn = Math.max(1, rollDie(2)); // 1d2, min 1 damage per turn

            if (!existingAcidEffect) {
                targetEntity.statusEffects["acid_burn"] = {
                    id: "acid_burn",
                    displayName: "Acid Burn",
                    duration: acidDuration,
                    sourceItemId: item.id,
                    damagePerTurn: acidDmgPerTurn,
                    damageType: "Acid",
                    description: `Corrosive acid burns, ${acidDmgPerTurn} Acid dmg/turn.`
                };
            } else {
                existingAcidEffect.duration = Math.max(existingAcidEffect.duration, acidDuration);
                existingAcidEffect.damagePerTurn = Math.max(existingAcidEffect.damagePerTurn, acidDmgPerTurn); // Or sum, or refresh; max seems reasonable
            }
            const entityNameForLog = targetEntity === this.gameState ? "Player" : (targetEntity.name || targetEntity.id);
            logToConsole(`${entityNameForLog} ${existingAcidEffect ? 'acid burn refreshed/intensified' : 'suffering acid burn!'}. Dmg/turn: ${targetEntity.statusEffects["acid_burn"].damagePerTurn}.`, 'darkgreen');

            if (targetEntity === this.gameState && window.renderCharacterInfo) window.renderCharacterInfo();
            if (targetEntity === this.gameState && window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        }
    }

    calculateAndApplyMeleeDamage(attacker, target, weapon, hitSuccess, attackNaturalRoll, defenseNaturalRoll, targetBodyPartForDamage) {
        if (!hitSuccess || !target) { if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)'; return; }
        let damageAmount = 0, damageType = "", damageLogSuffix = "";
        if (weapon === null) {
            damageType = "Bludgeoning";
            const unarmedMod = getSkillModifier("Unarmed", attacker);
            damageAmount = unarmedMod <= 0 ? Math.max(0, rollDie(2) - 1) : rollDie(unarmedMod);
            damageLogSuffix = unarmedMod <= 0 ? `(1d2-1, Mod: ${unarmedMod})` : `(1d${unarmedMod}, Mod: ${unarmedMod})`;
        } else {
            damageType = weapon.damageType || "Physical";
            damageAmount = rollDiceNotation(parseDiceNotation(weapon.damage));
            damageLogSuffix = `(${weapon.damage})`;
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Raw Damage: ${damageAmount} ${damageType} ${damageLogSuffix}`;
        this.applyDamage(attacker, target, targetBodyPartForDamage, damageAmount, damageType, weapon);
    }

    calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPartForDamage, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess || !target) { if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)'; return; }
        const damageType = weapon.damageType || "Ballistic";
        let totalDamageThisVolley = 0;
        logToConsole(`HITS: ${attacker === this.gameState ? "Player" : attacker.name}'s ${weapon.name} strikes ${numHits} time(s)! (Base Damage: ${weapon.damage})`, attacker === this.gameState ? 'lightgreen' : (numHits > 1 ? 'orangered' : 'orange'));
        for (let i = 0; i < numHits; i++) {
            const damageAmountThisBullet = rollDiceNotation(parseDiceNotation(weapon.damage));
            totalDamageThisVolley += damageAmountThisBullet;
            this.applyDamage(attacker, target, targetBodyPartForDamage, damageAmountThisBullet, damageType, weapon, i + 1, numHits);
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Total Raw Damage: ${totalDamageThisVolley} ${damageType} (${numHits} hits)`;
    }

    async processAttack() {
        let logMsg = "";
        if (this.gameState.combatPhase !== 'resolveRolls') { this.nextTurn(); return; }
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;
        const { weapon, attackType, bodyPart: intendedBodyPart, fireMode = "single", actionType = "attack" } = this.gameState.pendingCombatAction || {};

        if (!this.gameState.pendingCombatAction?.actionType) {
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration(); else this.nextTurn(); return;
        }
        if (actionType === "Reload") {
            logToConsole(`${attacker === this.gameState ? "Player" : attacker.name} reloads ${this.gameState.pendingCombatAction.weapon?.name || 'weapon'}.`, attacker === this.gameState ? 'lightgreen' : 'gold');
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) { this.promptPlayerAttackDeclaration(); return; }
                this.gameState.actionPointsRemaining--; window.turnManager.updateTurnUI();
            }
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
                else await this.nextTurn(attacker);
            } else await this.nextTurn(attacker); return;
        }

        let actionContext = { isGrappling: false, rangeModifier: 0, attackModifier: 0, isBurst: false, isAutomatic: false, isSecondAttack: false, skillToUse: this.gameState.pendingCombatAction.skillToUse };

        if (attackType === 'melee' && window.animationManager && defender) {
            if (weapon?.id === 'chain_saw_melee') window.animationManager.playAnimation('chainsawAttack', { attacker, defender, duration: 800, frameDuration: 40 });
            else if (weapon?.id === 'whip') window.animationManager.playAnimation('whipCrack', { attacker, defender, duration: 700 });
            else window.animationManager.playAnimation('meleeSwing', { attacker, x: attacker.mapPos?.x ?? this.gameState.playerPos.x, y: attacker.mapPos?.y ?? this.gameState.playerPos.y, originalSprite: (attacker === this.gameState ? '☻' : (attacker.sprite || '?')), originalColor: (attacker === this.gameState ? 'green' : (attacker.color || 'white')), duration: 600 });
        } else if (weapon?.type?.includes("thrown") && weapon.type !== "weapon_utility_spray" && window.animationManager) { // Exclude spray types from generic throwing
            const attackerPos = attacker.mapPos || this.gameState.playerPos;
            let targetPos = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos;
            if (attackerPos && targetPos) window.animationManager.playAnimation('throwing', { startPos: attackerPos, endPos: targetPos, sprite: (weapon.sprite || 'o'), color: (weapon.color || 'cyan'), duration: 600, attacker, defender });
        } else if (attackType === 'ranged' && weapon && !weapon.type?.includes("thrown") && weapon.type !== "weapon_utility_spray" && !weapon.tags?.includes("launcher_treated_as_rifle") && window.animationManager) {
            const attackerPos = attacker.mapPos || this.gameState.playerPos;
            const defenderPos = defender?.mapPos || this.gameState.defenderMapPos;
            if (attackerPos && defenderPos) window.animationManager.playAnimation('rangedBullet', { startPos: attackerPos, endPos: defenderPos, sprite: weapon.projectileSprite || '*', color: weapon.projectileColor || 'yellow', duration: 400, attacker, defender });
        } else if (weapon?.id === 'flamethrower' && window.animationManager) {
            const attackerPos = attacker.mapPos || this.gameState.playerPos;
            const targetPos = this.gameState.defenderMapPos || defender?.mapPos || this.gameState.pendingCombatAction?.targetTile;
            if (attackerPos && targetPos) window.animationManager.playAnimation('flamethrower', { attacker, targetPos, duration: 1500, particleSpawnRate: 10, particleLifetime: 500, coneAngle: Math.PI / 6, maxRange: 6 });
        } else if (weapon && (weapon.id === 'taser' || weapon.id === 'stun_gun_melee') && window.animationManager && defender) {
            window.animationManager.playAnimation('taser', { attacker, defender, duration: 500, isMelee: weapon.id === 'stun_gun_melee' });
        } else if (weapon && (weapon.id === 'smoke_grenade_thrown' || weapon.id === 'tear_gas_grenade_thrown' || weapon.id === 'pepper_spray') && window.animationManager) {
            let cloudParams = { attacker, duration: 5000, activeSpawningDuration: 1000, particleSpriteOptions: ['░', '▒', '▓'], particleLifetime: 4000, expansionSpeed: 0.03, spawnRate: 15 };
            cloudParams.centerPos = this.gameState.defenderMapPos || defender?.mapPos || this.gameState.pendingCombatAction?.targetTile || attacker.mapPos || this.gameState.playerPos;
            cloudParams.maxRadius = (weapon.burstRadiusFt || 20) / 5;
            if (weapon.id === 'smoke_grenade_thrown') cloudParams.particleColor = 'grey';
            else if (weapon.id === 'tear_gas_grenade_thrown') { cloudParams.particleColor = 'yellow'; cloudParams.particleSpriteOptions = ['%', '§']; }
            else if (weapon.id === 'pepper_spray') {
                cloudParams.centerPos = attacker.mapPos || this.gameState.playerPos;
                if (defender && defender.mapPos) cloudParams.coneDirection = { ...defender.mapPos };
                else if (this.gameState.defenderMapPos) cloudParams.coneDirection = { ...this.gameState.defenderMapPos };
                else cloudParams.coneDirection = { x: (attacker.mapPos || this.gameState.playerPos).x + 1, y: (attacker.mapPos || this.gameState.playerPos).y }; // Fallback

                cloudParams.maxRadius = 1.5;
                cloudParams.duration = 1500;
                cloudParams.activeSpawningDuration = 500;
                cloudParams.particleLifetime = 1000;
                cloudParams.particleColor = 'orange';
                cloudParams.particleSpriteOptions = ['*', '⁂', '※']; // More visible sprites
                cloudParams.coneAngle = Math.PI / 6;
                cloudParams.spawnRate = 20;
                logToConsole(`Pepper spray by ${attacker.name || 'Player'} from (${cloudParams.centerPos.x},${cloudParams.centerPos.y}) towards (${cloudParams.coneDirection.x},${cloudParams.coneDirection.y}) with sprites: ${cloudParams.particleSpriteOptions.join('')}`, 'debug');
            }
            window.animationManager.playAnimation('gasCloud', cloudParams);
        } else if (weapon?.id === 'acid_mild_thrown' && window.animationManager) {
            const impactPos = defender?.mapPos || this.gameState.pendingCombatAction?.targetTile;
            if (impactPos) window.animationManager.playAnimation('liquidSplash', { impactPos, duration: 800, splashSprites: ['∴', '※', '*', '.'], sizzleSprites: ['.', '◦', '.'], color: 'limegreen' });
        }

        if (actionType === "attack" && attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining <= 0) { this.promptPlayerAttackDeclaration(); return; }
            this.gameState.actionPointsRemaining--; window.turnManager.updateTurnUI();
        } else if (actionType === "grapple") { this.nextTurn(attacker); return; }

        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const defenderName = defender ? ((defender === this.gameState) ? "Player" : defender.name) : "Tile";
        let attackResult, defenseResult;

        // --- LOS Check for NPC Attacker ---
        if (attacker !== this.gameState && defender) { // Check LOS if attacker is NPC and there's a defender
            const npcPos = attacker.mapPos;
            const defenderPos = (defender === this.gameState) ? this.gameState.playerPos : defender.mapPos;

            if (npcPos && defenderPos) {
                if (!window.hasLineOfSight3D(npcPos, defenderPos)) {
                    logToConsole(`NPC ATTACK CANCELED: ${attackerName} lost Line of Sight to ${defenderName}.`, 'orange');
                    // NPC should ideally pick a new action here (e.g., move, find new target)
                    // For now, just end this attack attempt and proceed to next turn segment or next turn.
                    // This might mean the NPC does nothing if it only had 1 AP.
                    if (this.gameState.isInCombat) {
                        // If attacker was NPC, just proceed to next turn, as their action (attack) failed.
                        this.nextTurn(attacker);
                    }
                    return; // Stop further processing of this attack
                } else {
                    logToConsole(`NPC ATTACK: ${attackerName} confirmed Line of Sight to ${defenderName}.`, 'grey');
                }
            }
        }
        // --- End LOS Check ---

        if (attackType === 'melee' && defender) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos; // Includes .z
            const defenderMapPos = defender.mapPos; // Includes .z
            if (attackerMapPos && defenderMapPos) {
                const distance3D = getDistance3D(attackerMapPos, defenderMapPos);
                // Melee range could be slightly more than 1 for diagonal in 3D, e.g., sqrt(1^2+1^2+1^2) approx 1.73
                // For simplicity, let's say direct adjacency in 3D (Manhattan distance of 1 for x,y,z combined, or stricter like current)
                // Current check is Manhattan distance > 1 on XY plane. Let's make it 3D Manhattan.
                const manhattanDistance3D = Math.abs(attackerMapPos.x - defenderMapPos.x) +
                    Math.abs(attackerMapPos.y - defenderMapPos.y) +
                    Math.abs(attackerMapPos.z - defenderMapPos.z);
                if (manhattanDistance3D > 1) { // Only allow melee if directly adjacent in 3D
                    logToConsole(`MELEE FAIL: ${attackerName}'s attack on ${defenderName} fails (Out of Range - Dist: ${distance3D.toFixed(1)}, Manhattan: ${manhattanDistance3D}).`, 'orange');
                    if (attacker === this.gameState) {
                        if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                        else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
                        else this.nextTurn(attacker);
                    } else this.nextTurn(attacker); return;
                }
            }
        }
        // Pass attacker to getDefenderCoverBonus for 3D cover calculation
        let coverBonus = (defender && defender.mapPos && attacker && attacker.mapPos) ? this.getDefenderCoverBonus(attacker, defender) : 0;
        if (attackType === 'ranged' && weapon) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos; // Includes .z
            const targetMapPos = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos; // Includes .z

            if (attackerMapPos && targetMapPos) {
                const distance = getDistance3D(attackerMapPos, targetMapPos); // Use 3D distance
                actionContext.isGrappling = attacker.statusEffects?.isGrappled && attacker.statusEffects.grappledBy === (defender === this.gameState ? 'player' : defender?.id);

                // Range modifiers based on 3D distance (these are examples, can be tuned)
                // Effective range of weapons might be defined in weapon stats later.
                if (distance <= 1.8) actionContext.rangeModifier = (weapon.tags?.includes("requires_grapple_for_point_blank") && defender && actionContext.isGrappling) ? 15 : (weapon.tags?.includes("requires_grapple_for_point_blank") ? 0 : 15); // Point blank
                else if (distance <= weapon.optimalRange || 10) actionContext.rangeModifier = 5; // Optimal/Short
                else if (distance <= weapon.effectiveRange || 30) actionContext.rangeModifier = 0; // Medium / Effective
                else if (distance <= weapon.maxRange || 60) actionContext.rangeModifier = -5; // Long
                else actionContext.rangeModifier = -10; // Extreme

                // Weapon-specific range adjustments (example)
                if (distance > (weapon.effectiveRange || 30)) { // If beyond effective range
                    let mod = 0;
                    if (weapon.type.includes("bow")) mod = -3;
                    else if (weapon.type.includes("shotgun")) mod = -5; // Shotguns drop off faster
                    else if (weapon.type.includes("rifle") && !weapon.tags?.includes("sniper")) mod = 0; // Rifles maintain better
                    else if (weapon.tags?.includes("sniper")) mod = 2; // Snipers excel at range
                    actionContext.rangeModifier += mod;
                }
                logToConsole(`Ranged attack: Dist3D=${distance.toFixed(1)}, RangeMod=${actionContext.rangeModifier}`, 'grey');
            }
            if (weapon.type.includes("firearm") || weapon.tags?.includes("launcher_treated_as_rifle")) {
                if (fireMode === "burst") { actionContext.attackModifier = -5; actionContext.isBurst = true; }
                else if (fireMode === "auto") { actionContext.attackModifier = -8; actionContext.isAutomatic = true; }
            }
        }
        attackResult = this.calculateAttackRoll(attacker, weapon, defender ? intendedBodyPart : null, actionContext);
        defenseResult = this.calculateDefenseRoll(defender, defender ? ((defender === this.gameState ? this.gameState.playerDefenseChoice?.type : this.gameState.npcDefenseChoice) || "Dodge") : "None", weapon, coverBonus, {});

        logMsg = `ATTACK: ${attackerName} targets ${defender ? defenderName + "'s " + intendedBodyPart : "tile at " + (this.gameState.pendingCombatAction?.targetTile?.x || '?') + "," + (this.gameState.pendingCombatAction?.targetTile?.y || '?')} with ${weapon ? weapon.name : 'Unarmed'} (Mode: ${fireMode}). ` +
            `Roll: ${attackResult.roll} (Nat: ${attackResult.naturalRoll}, Skill (${actionContext.skillName}): ${actionContext.skillBasedModifier}, ` +
            `BodyPart: ${actionContext.bodyPartModifier}, Range: ${actionContext.rangeModifier}, Mode: ${actionContext.attackModifier}, Move: ${actionContext.attackerMovementPenalty}, Light: ${actionContext.lightingPenaltyApplied || 0}, Status: ${actionContext.statusEffectAttackPenalty || 0})`;
        logToConsole(logMsg, window.getSkillColor(actionContext.skillName));
        if (actionContext.lightingPenaltyApplied !== 0) {
            logToConsole(`Lighting: ${attackerName}'s target is in darkness. Applying ${actionContext.lightingPenaltyApplied} penalty.`, 'orange');
        }
        // Specific status penalty logs are now within calculateAttackRoll

        if (defender) {
            let defType = (defender === this.gameState ? this.gameState.playerDefenseChoice?.type : this.gameState.npcDefenseChoice) || "Dodge";
            if (defType !== "None") {
                logToConsole(`DEFENSE: ${defenderName} (${defType} - ${defenseResult.defenseSkillName}). ` +
                    `Roll: ${defenseResult.roll} (Nat: ${defenseResult.naturalRoll}, Skill: ${defenseResult.defenseSkillValue}, Cover: +${defenseResult.coverBonusApplied}, Move: +${defenseResult.movementBonusApplied || 0}, Status: ${defenseResult.statusEffectDefensePenalty || 0})`, window.getSkillColor(defenseResult.defenseSkillName?.split(" + ")[0]));
            } else logToConsole(`DEFENSE: ${defenderName} (None - Ranged). Effective defense from cover: ${defenseResult.roll}`, defender === this.gameState ? 'lightblue' : 'gold');
        }
        let hit = false;
        if (defender) {
            const defChoiceType = (defender === this.gameState ? this.gameState.playerDefenseChoice?.type : this.gameState.npcDefenseChoice) || "Dodge";
            if (attackResult.isCriticalHit) hit = true;
            else if (attackResult.isCriticalMiss) hit = false;
            else if (defenseResult.isCriticalFailure && defChoiceType !== "None") hit = true;
            else if (defenseResult.isCriticalSuccess && defChoiceType !== "None" && !attackResult.isCriticalHit) hit = false;
            else hit = attackResult.roll > defenseResult.roll;
            logToConsole(hit ? `RESULT: Hit! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.` : `RESULT: Miss! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.`, hit ? (attacker === this.gameState ? 'lightgreen' : 'orange') : (attacker === this.gameState ? 'orange' : 'lightgreen'));
        } else if (weapon?.type === "weapon_thrown_explosive" || (weapon?.type === "weapon_thrown_utility")) {
            hit = true;
            logToConsole(`RESULT: ${weapon.name} lands at targeted tile.`, attacker === this.gameState ? 'lightgreen' : 'gold');
        }

        if (weapon?.specialEffect && (hit || weapon.type?.includes("utility"))) {
            this.applySpecialEffect(attacker, weapon, (defender && hit ? defender : null), this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos || attacker?.mapPos || this.gameState.playerPos);
        }

        const isThrownExplosive = weapon?.type === "weapon_thrown_explosive";
        const isImpactLauncher = weapon?.explodesOnImpact && !isThrownExplosive;
        const explosiveProps = (isThrownExplosive || isImpactLauncher) ? (this.assetManager.getItem(weapon.ammoType) || weapon) : null;
        let explosionProcessed = false;

        if (isImpactLauncher && !isThrownExplosive && weapon && window.animationManager && explosiveProps?.burstRadiusFt > 0) {
            const attackerPos = attacker.mapPos || this.gameState.playerPos;
            const defenderPos = defender?.mapPos || this.gameState.defenderMapPos;
            if (attackerPos && defenderPos) await window.animationManager.playAnimation('launcherProjectile', { startPos: attackerPos, endPos: defenderPos, sprite: weapon.projectileSprite || '►', color: weapon.projectileColor || 'orange', duration: 600, attacker, defender });
        }

        if (explosiveProps?.burstRadiusFt > 0) {
            let determinedImpactTile = null;
            if (isThrownExplosive) determinedImpactTile = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || (attacker.mapPos || this.gameState.playerPos);
            else if (isImpactLauncher && hit && defender?.mapPos) determinedImpactTile = defender.mapPos;

            if (determinedImpactTile) {
                explosionProcessed = true;
                const burstRadiusTiles = Math.ceil(explosiveProps.burstRadiusFt / 5);
                logToConsole(`EXPLOSION: ${explosiveProps.name} detonates. Radius: ${burstRadiusTiles}t`, 'orangered');
                if (window.animationManager) window.animationManager.playAnimation('explosion', { centerPos: determinedImpactTile, radius: burstRadiusTiles, duration: 1000, sourceWeapon: weapon });
                this.getCharactersInBlastRadius(determinedImpactTile, burstRadiusTiles).forEach(char => {
                    let affectedByBlast = true;
                    const charNameForLog = char === this.gameState ? "Player" : (char.name || char.id);
                    if (isThrownExplosive && (char !== defender || (char === defender && !hit))) {
                        if ((rollDie(20) + getStatModifier("Dexterity", char)) >= attackResult.roll) {
                            affectedByBlast = false; logToConsole(`${charNameForLog} dodged blast!`, 'lightgreen');
                        } else logToConsole(`${charNameForLog} failed to dodge blast.`, 'orange');
                    }
                    if (affectedByBlast) this.applyDamage(attacker, char, "Torso", rollDiceNotation(parseDiceNotation(explosiveProps.damage)), explosiveProps.damageType, explosiveProps);
                });
            }
        }
        if (hit && !explosionProcessed && defender) {
            let actualTargetBodyPart = intendedBodyPart;
            if (((defender === this.gameState ? this.gameState.playerDefenseChoice?.type : this.gameState.npcDefenseChoice) || "Dodge") === "BlockUnarmed" && defenseResult.naturalRoll >= 11) {
                actualTargetBodyPart = (defender === this.gameState ? this.gameState.playerDefenseChoice?.blockingLimb : null) || intendedBodyPart;
                logToConsole(`Block redirects to ${actualTargetBodyPart}.`, 'grey');
            }
            let numHitsCalc = 1;
            if (attackType === "ranged" && weapon?.type.includes("firearm")) {
                if (actionContext.isBurst) numHitsCalc = rollDie(3);
                else if (actionContext.isAutomatic) numHitsCalc = Math.min(rollDie(6), rollDie(6));
                if (numHitsCalc > 1) logToConsole(`${fireMode} fire: ${numHitsCalc} shots connect.`, 'grey');
            }
            this.gameState.combatPhase = 'applyDamage';
            if (attackType === 'melee') this.calculateAndApplyMeleeDamage(attacker, defender, weapon, hit, attackResult.naturalRoll, defenseResult.naturalRoll, actualTargetBodyPart);
            else if (attackType === 'ranged' && !isImpactLauncher) this.calculateAndApplyRangedDamage(attacker, defender, weapon, actualTargetBodyPart, hit, attackResult, numHitsCalc);
        }

        if (hit && defender && weapon?.id === 'molotov_cocktail_thrown' && window.animationManager) {
            const impactTileMolotov = defender.mapPos || this.gameState.defenderMapPos || this.gameState.pendingCombatAction?.targetTile;
            if (impactTileMolotov) window.animationManager.playAnimation('explosion', { centerPos: impactTileMolotov, radius: 1, explosionSprites: ['~', '≈', '*', '#'], color: 'orange', duration: 1500, sourceWeapon: weapon, attacker });
        }

        if (weapon && weapon.id === "acid_mild_thrown" && weapon.splashDamage && !explosionProcessed) {
            const splashDamageAmount = parseInt(weapon.splashDamage, 10);
            if (!isNaN(splashDamageAmount) && splashDamageAmount > 0) {
                let impactCenterTile = null;
                if (hit && defender && defender.mapPos) impactCenterTile = { ...defender.mapPos };
                else if (this.gameState.pendingCombatAction?.targetTile) impactCenterTile = { ...this.gameState.pendingCombatAction.targetTile };
                else if (this.gameState.defenderMapPos) impactCenterTile = { ...this.gameState.defenderMapPos };
                if (impactCenterTile) {
                    logToConsole(`${weapon.name} splashes acid! Splash: ${splashDamageAmount} Acid.`, 'green');
                    const splashRadiusTiles = 1;
                    const charactersInSplash = this.getCharactersInBlastRadius(impactCenterTile, splashRadiusTiles);
                    charactersInSplash.forEach(splashTarget => {
                        if (!(hit && defender === splashTarget)) {
                            logToConsole(`${splashTarget.name || "Player"} hit by acid splash!`, 'darkgreen');
                            this.applyDamage(attacker, splashTarget, "Torso", splashDamageAmount, "Acid", { name: "Acid Splash" });
                        }
                    });
                }
            }
        }

        if (weapon?.type?.includes("thrown") && (weapon.type !== "weapon_thrown_explosive" || explosionProcessed)) {
            if (attacker === this.gameState) {
                const itemUsed = this.gameState.pendingCombatAction?.weapon;
                let handIdx = -1;
                if (itemUsed) {
                    if (this.gameState.inventory.handSlots[0]?.id === itemUsed.id) handIdx = 0;
                    else if (this.gameState.inventory.handSlots[1]?.id === itemUsed.id) handIdx = 1;
                }
                if (handIdx !== -1) {
                    logToConsole(`Player threw ${this.gameState.inventory.handSlots[handIdx].name}. Removing from hand.`, 'grey');
                    this.gameState.inventory.handSlots[handIdx] = null; window.updateInventoryUI();
                    if (this.gameState.combatPhase === 'playerAttackDeclare') this.populateWeaponSelect();
                } else logToConsole(`WARN: Thrown item ${itemUsed?.name} not found in player hands to remove.`, 'orange');
            }
        }

        if (this.gameState.isInCombat) {
            if (defender && ((defender === this.gameState && (this.gameState.health.head.current <= 0 || this.gameState.health.torso.current <= 0)) || (defender !== this.gameState && (defender.health?.head?.current <= 0 || defender.health?.torso?.current <= 0)))) {
                if (this.initiativeTracker.find(e => e.entity === defender)) {
                    logToConsole(`DEFEATED: ${defenderName} has fallen!`, 'red');
                    this.initiativeTracker = this.initiativeTracker.filter(entry => entry.entity !== defender);
                    this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                    if (defender === this.gameState) { this.endCombat(); window.gameOver(this.gameState); return; }
                    window.mapRenderer.scheduleRender();
                }
            }
            if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health?.torso?.current > 0 && e.entity.health?.head?.current > 0) && this.initiativeTracker.some(e => e.isPlayer && e.entity.health?.torso?.current > 0 && e.entity.health?.head?.current > 0)) {
                logToConsole("All hostile NPCs defeated. Ending combat.", 'fuchsia'); this.endCombat(); return;
            }
            if (this.gameState.dualWieldPending && attacker === this.gameState) {
                this.gameState.dualWieldPending = false;
                const offHandWeapon = this.gameState.inventory.handSlots[1];
                if (offHandWeapon?.type.includes("firearm")) {
                    logToConsole(`Dual Wield: Off-hand attack with ${offHandWeapon.name}.`, 'lightgreen');
                    let offHandActionCtx = { isSecondAttack: true, rangeModifier: 0, attackerMovementPenalty: actionContext.attackerMovementPenalty };
                    const attackerMPos = attacker.mapPos || this.gameState.playerPos;
                    const defenderMPosOff = defender?.mapPos;
                    if (attackerMPos && defenderMPosOff) {
                        const distOff = Math.sqrt(Math.pow(defenderMPosOff.x - attackerMPos.x, 2) + Math.pow(defenderMPosOff.y - attackerMPos.y, 2));
                        if (distOff <= 1) offHandActionCtx.rangeModifier = 15; else if (distOff <= 3) offHandActionCtx.rangeModifier = 5;
                        else if (distOff <= 6) offHandActionCtx.rangeModifier = 0; else if (distOff <= 20) offHandActionCtx.rangeModifier = -5;
                        else if (distOff <= 60) offHandActionCtx.rangeModifier = -10; else offHandActionCtx.rangeModifier = -15;
                    }
                    const offHandAtkRes = this.calculateAttackRoll(attacker, offHandWeapon, intendedBodyPart, offHandActionCtx);
                    logToConsole(`DUAL WIELD ATTACK (Off-hand): Roll ${offHandAtkRes.roll} (Nat ${offHandAtkRes.naturalRoll})`, 'lightblue');
                    if (defender) {
                        const offHandDefRes = this.calculateDefenseRoll(defender, "None", offHandWeapon, this.getDefenderCoverBonus(defender), {});
                        logToConsole(`DUAL WIELD DEFENSE (Off-hand): Passive ${offHandDefRes.roll}`, 'gold');
                        if (offHandAtkRes.roll > offHandDefRes.roll && !offHandAtkRes.isCriticalMiss) {
                            logToConsole("DUAL WIELD HIT (Off-hand)!", 'lightgreen');
                            this.calculateAndApplyRangedDamage(attacker, defender, offHandWeapon, intendedBodyPart, true, offHandAtkRes, 1);
                        } else logToConsole("DUAL WIELD MISS (Off-hand).", 'orange');
                    }
                } else logToConsole("DUAL WIELD: Off-hand not a firearm. Skipping.", 'orange');
            }
            this.gameState.playerDefenseChoice = null; this.gameState.npcDefenseChoice = null;
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                else if (this.gameState.movementPointsRemaining > 0) {
                    document.getElementById('attackDeclarationUI')?.classList.add('hidden');
                    document.getElementById('defenseDeclarationUI')?.classList.add('hidden');
                    window.turnManager.updateTurnUI();
                    logToConsole("Player has 0 AP, >0 MP. Can move or end turn.", 'lightblue');
                }
                else await this.nextTurn(attacker);
            } else await this.nextTurn(attacker);
        } else this.updateCombatUI();
    }

    endPlayerTurn() {
        logToConsole(`[endPlayerTurn] Setting isWaitingForPlayerCombatInput to FALSE. Current phase: ${this.gameState.combatPhase}`, 'magenta');
        this.gameState.isWaitingForPlayerCombatInput = false;
        if (this.gameState.isInCombat && this.gameState.combatCurrentAttacker === this.gameState) {
            logToConsole("Player manually ends turn.", 'lightblue');
            // this.gameState.playerForcedEndTurnWithZeroAP = this.gameState.actionPointsRemaining === 0; // Flag is obsolete
            this.gameState.actionPointsRemaining = 0; this.gameState.movementPointsRemaining = 0;
            window.turnManager.updateTurnUI();
            this.nextTurn(this.gameState);
        } else logToConsole("Cannot end player turn: Not in combat or not player's turn.", 'orange');
    }

    handleReloadActionDeclaration() {
        const weaponSelect = document.getElementById('combatWeaponSelect');
        const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
        let weaponObject = null;
        if (selectedOption.value === "unarmed") { logToConsole("Cannot reload Unarmed.", 'orange'); return; }
        else if (selectedOption.dataset.itemData) weaponObject = JSON.parse(selectedOption.dataset.itemData);
        else weaponObject = this.assetManager.getItem(selectedOption.value);
        if (!weaponObject) { logToConsole("No weapon to reload.", 'orange'); return; }
        if (!(weaponObject.type.includes("firearm") || weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow"))) { logToConsole(`Cannot reload ${weaponObject.name}.`, 'orange'); return; }
        if (this.gameState.actionPointsRemaining <= 0) { logToConsole("No AP to reload.", 'orange'); return; }
        this.gameState.pendingCombatAction = { actionType: "Reload", weapon: weaponObject, entity: this.gameState, actionDescription: `reloads ${weaponObject.name}` };
        logToConsole(`Player reloads ${weaponObject.name}.`, 'lightgreen');
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'resolveRolls';
        this.processAttack();
    }

    handleGrappleAttemptDeclaration() {
        if (this.gameState.actionPointsRemaining <= 0) { logToConsole("No AP to grapple.", 'orange'); return; }
        const primaryHandItem = this.gameState.inventory.handSlots[0];
        const offHandItem = this.gameState.inventory.handSlots[1];
        if (primaryHandItem?.type.includes("firearm") && offHandItem?.type.includes("firearm")) {
            logToConsole("Cannot grapple while dual-wielding firearms.", 'orange'); this.promptPlayerAttackDeclaration(); return;
        }
        if (!this.gameState.combatCurrentDefender) { logToConsole("No target to grapple.", 'orange'); this.promptPlayerAttackDeclaration(); return; }
        this.gameState.pendingCombatAction = { actionType: "grapple", target: this.gameState.combatCurrentDefender, entity: this.gameState, actionDescription: `attempts to grapple ${this.gameState.combatCurrentDefender.name}` };
        logToConsole(`Player attempts to grapple ${this.gameState.combatCurrentDefender.name}.`, 'lightgreen');
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'resolveGrapple';
        this.processGrapple();
    }

    processGrapple() {
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;
        if (!attacker || !defender) { logToConsole("Error: Attacker or Defender missing for grapple.", 'red'); this.nextTurn(attacker); return; }
        if (attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining <= 0) { this.promptPlayerAttackDeclaration(); return; }
            this.gameState.actionPointsRemaining--; window.turnManager.updateTurnUI();
            logToConsole(`AP spent for grapple. Remaining: ${this.gameState.actionPointsRemaining}`, 'lightblue');
        }
        const attackerRoll = rollDie(20) + getSkillValue("Unarmed", attacker);
        const defenderRoll = rollDie(20) + getSkillValue("Unarmed", defender);
        logToConsole(`GRAPPLE: ${(attacker === this.gameState ? "Player" : attacker.name)} rolls ${attackerRoll} vs ${defender.name}'s ${defenderRoll}.`, 'grey');
        if (attackerRoll > defenderRoll) {
            if (!defender.statusEffects) defender.statusEffects = {};
            defender.statusEffects.isGrappled = true;
            defender.statusEffects.grappledBy = (attacker === this.gameState) ? "player" : (attacker.id || "npc");
            logToConsole(`RESULT: Grapple Succeeded! ${defender.name} is grappled.`, 'lightgreen');
            if (window.animationManager) window.animationManager.playAnimation('grapple', { attacker, defender, duration: 800 });
        } else logToConsole("RESULT: Grapple Failed!", 'orange');

        if (attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
            else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
            else this.nextTurn(this.gameState);
        } else this.nextTurn(attacker);
    }

    getDefenderCoverBonus(defender) {
        let coverBonus = 0;
        if (defender?.mapPos && defender.mapPos.z !== undefined && this.gameState.mapLevels && this.assetManager?.getTileset()) {
            const { x, y, z } = defender.mapPos;
            const zStr = z.toString();
            const levelData = this.gameState.mapLevels[zStr];

            if (levelData) {
                // Define which layers on the defender's Z-level provide cover.
                // This might need to be more sophisticated later, considering attacker's angle.
                const layersToCheckForCover = ['building', 'item', 'landscape']; // 'object' was mentioned, ensure 'item' covers it.
                for (const layerName of layersToCheckForCover) {
                    const tileId = levelData[layerName]?.[y]?.[x];
                    if (tileId) {
                        const baseTileId = (typeof tileId === 'object' && tileId.tileId) ? tileId.tileId : tileId;
                        const tileDef = this.assetManager.getTileset()[baseTileId];
                        if (tileDef?.coverBonus) {
                            coverBonus = Math.max(coverBonus, parseInt(tileDef.coverBonus, 10) || 0);
                        }
                    }
                }
            }
        }
        if (coverBonus > 0) logToConsole(`${defender.name || "Defender"} gets +${coverBonus} cover bonus from tile at their position. (Note: 3D cover relative to attacker not yet fully implemented)`, 'grey');
        return coverBonus;
    }

    // Updated getDefenderCoverBonus to consider attacker's position for 3D cover
    getDefenderCoverBonus(attacker, defender) {
        if (!attacker || !attacker.mapPos || !defender || !defender.mapPos) return 0;

        const losLine = getLine3D(attacker.mapPos.x, attacker.mapPos.y, attacker.mapPos.z,
            defender.mapPos.x, defender.mapPos.y, defender.mapPos.z);
        if (!losLine || losLine.length < 2) return 0; // No line or only start/end point

        let maxCoverBonus = 0;

        // Iterate LOS path, excluding start (attacker) and end (defender) points
        for (let i = 1; i < losLine.length - 1; i++) {
            const point = losLine[i];
            const tileDef = this._getTileProperties(window.mapRenderer.getCollisionTileAt(point.x, point.y, point.z));
            // Check all layers at this point for cover
            // This simplified check uses getCollisionTileAt which returns the first impassable tile.
            // A more thorough check might iterate layers at point.x, point.y, point.z.

            if (tileDef && tileDef.coverBonus) {
                // Potentially, if a tile provides cover, it might fully obscure, or offer partial.
                // For now, take the highest cover bonus found along the path.
                // More complex: accumulate cover or check if LOS is fully blocked.
                maxCoverBonus = Math.max(maxCoverBonus, parseInt(tileDef.coverBonus, 10) || 0);
                // If a very high cover is found, we might consider the target obscured.
                // For now, just accumulate the highest bonus.
            }
            // Also check the landscape layer specifically if not returned by getCollisionTileAt (e.g. a berm)
            const zStr = point.z.toString();
            const mapLevels = window.mapRenderer.getCurrentMapData()?.levels;
            if (mapLevels && mapLevels[zStr] && mapLevels[zStr].landscape) {
                const landscapeTileId = mapLevels[zStr].landscape[point.y]?.[point.x];
                if (landscapeTileId) {
                    const landscapeTileDef = this._getTileProperties(landscapeTileId);
                    if (landscapeTileDef && landscapeTileDef.coverBonus) {
                        maxCoverBonus = Math.max(maxCoverBonus, parseInt(landscapeTileDef.coverBonus, 10) || 0);
                    }
                }
            }
        }

        if (maxCoverBonus > 0) {
            logToConsole(`${defender.name || "Defender"} gets +${maxCoverBonus} 3D cover bonus against ${attacker.name || "Attacker"}.`, 'grey');
        }
        return maxCoverBonus;
    }


    getCharactersInBlastRadius(impactTile, burstRadiusTiles) { // impactTile should have x, y, z
        const affected = [];
        const { x: impX, y: impY, z: impZ } = impactTile; // Expect impactTile to have x, y, z

        const checkEntity = (entity, entityPos) => { // entityPos should have x, y, z
            if (!entity || !entityPos || entityPos.x === undefined || entityPos.y === undefined || entityPos.z === undefined) return;

            // For a spherical blast, use 3D distance
            const distance = getDistance3D(impactTile, entityPos);

            if (distance <= burstRadiusTiles && entity.health?.torso?.current > 0 && entity.health?.head?.current > 0) {
                affected.push(entity);
            }
        };

        // Check player
        checkEntity(this.gameState, this.gameState.playerPos);
        // Check NPCs
        this.gameState.npcs.forEach(npc => checkEntity(npc, npc.mapPos));

        logToConsole(`Blast radius check at (${impX},${impY},${impZ}) with ${burstRadiusTiles}t radius found ${affected.length} characters.`, 'grey');
        return affected;
    }

    applyDamage(attacker, entity, bodyPartName, damageAmount, damageType, weapon, bulletNum = 0, totalBullets = 0) {
        const accessKey = bodyPartName.toLowerCase().replace(/\s/g, '');
        const entityName = (entity === this.gameState) ? "Player" : (entity.name || entity.id);
        const isPlayerVictim = (entity === this.gameState);
        let part = isPlayerVictim ? this.gameState.health?.[accessKey] : entity.health?.[accessKey];
        if (!part) { logToConsole(`Error: Invalid body part '${accessKey}' for ${entityName}.`, 'red'); return; }

        const effectiveArmor = isPlayerVictim ? window.getArmorForBodyPart(accessKey, entity) : (entity.armor?.[accessKey] || 0);
        const reducedDamage = Math.max(0, damageAmount - effectiveArmor);
        logToConsole(`DAMAGE${bulletNum > 0 ? ` (Bullet ${bulletNum}/${totalBullets})` : ''}: ${(attacker === this.gameState ? "Player" : attacker.name)}'s ${weapon ? weapon.name : "Unarmed"} deals ${reducedDamage} ${damageType} to ${entityName}'s ${bodyPartName} (Raw: ${damageAmount}, Armor: ${effectiveArmor}).`, (attacker === this.gameState && !isPlayerVictim) ? 'orange' : 'indianred');
        part.current = Math.max(0, part.current - reducedDamage);
        logToConsole(`INFO: ${entityName} ${accessKey} HP: ${part.current}/${part.max}.`, isPlayerVictim ? 'lightblue' : 'gold');
        this.shareAggroWithTeam(entity, attacker, damageAmount);

        if (part.current === 0) {
            const fmtPartName = window.formatBodyPartName ? window.formatBodyPartName(accessKey) : accessKey.toUpperCase();
            if (part.inCrisis) {
                logToConsole(`FATAL HIT: ${entityName}'s already crippled ${fmtPartName} was struck again! Character has died.`, 'darkred');
                window.gameOver(entity);
            } else {
                part.inCrisis = true; part.crisisTimer = 3; part.crisisDamageType = damageType;
                logToConsole(`CRISIS START: ${entityName}'s ${fmtPartName} critically injured! (Timer: 3 turns).`, isPlayerVictim ? 'red' : 'orangered');
            }
            if (weapon?.explodesOnImpact) {
                part.isDestroyed = true;
                logToConsole(`CRITICAL DAMAGE: ${entityName}'s ${fmtPartName} is DESTROYED by explosion!`, 'darkred');
            }
        }
        if (isPlayerVictim && window.renderHealthTable) window.renderHealthTable(entity);
    }

    handleRetargetButtonClick() {
        this.gameState.isRetargeting = true;
        this.gameState.retargetingJustHappened = false;
        this.gameState.combatCurrentDefender = null; this.gameState.defenderMapPos = null; this.gameState.selectedTargetEntity = null;
        logToConsole("Retargeting: Click new target on map.", 'lightblue');
        this.promptPlayerAttackDeclaration();
        this.updateCombatUI();
    }

    _getTileProperties(tileId) { return tileId && this.assetManager.tilesets ? this.assetManager.tilesets[tileId] : null; }

    // _isTilePassable is now effectively replaced by mapRenderer.isWalkable for consistency.
    // isTileOccupied remains relevant.

    // Renamed and updated to check for player as well
    isTileOccupied(x, y, z, currentNpcId = null) {
        // Check if player is at the target location
        if (this.gameState.playerPos.x === x && this.gameState.playerPos.y === y && this.gameState.playerPos.z === z) {
            // If an NPC is checking, and player is there, it's occupied.
            // If player is checking their own spot (not typical for movement validation), it's not "occupied" by another.
            // This logic assumes currentNpcId is null if player is self-checking, or needs a specific ID.
            // For NPC movement, currentNpcId will be the NPC's ID.
            return true; // Occupied by player
        }

        // Check if any other NPC is at the target location
        return this.gameState.npcs.some(npc => {
            // If currentNpcId is provided and matches this NPC, don't count it as occupied by "another"
            if (currentNpcId && npc.id === currentNpcId) {
                return false;
            }
            return npc.mapPos?.x === x &&
                npc.mapPos?.y === y &&
                npc.mapPos?.z === z &&
                npc.health?.torso?.current > 0; // Consider only live NPCs
        });
    }

    _isTilePassableAndUnoccupiedForNpc(x, y, z, npcId) {
        // Use window.mapRenderer.isWalkable instead of the removed _isTilePassable
        const isPassable = window.mapRenderer && typeof window.mapRenderer.isWalkable === 'function' ?
            window.mapRenderer.isWalkable(x, y, z) : false;
        if (!isPassable) {
            // Optional: log if tile is not passable for debugging pathfinding issues
            // logToConsole(`_isTilePassableAndUnoccupiedForNpc: Tile (${x},${y},${z}) is not walkable.`, 'debug');
        }
        const isOccupied = this.isTileOccupied(x, y, z, npcId);
        if (isOccupied) {
            // Optional: log if tile is occupied
            // logToConsole(`_isTilePassableAndUnoccupiedForNpc: Tile (${x},${y},${z}) is occupied.`, 'debug');
        }
        return isPassable && !isOccupied;
    }

    async moveNpcTowardsTarget(npc, targetPos) { // targetPos can have x,y,z
        if (!npc.mapPos || npc.currentMovementPoints <= 0 || !targetPos) return false;

        const path = window.findPath3D(npc.mapPos, targetPos, npc, window.mapRenderer.getCurrentMapData(), this.assetManager.tilesets);

        if (!path || path.length <= 1) { // No path or already at target (path includes start)
            logToConsole(`NPC ${npc.name || npc.id}: No path to target or already at target. Path: ${JSON.stringify(path)}`, 'grey');
            return false;
        }

        // Path[0] is current location, path[1] is the next step.
        const nextStep = path[1];

        if (!this._isTilePassableAndUnoccupiedForNpc(nextStep.x, nextStep.y, nextStep.z, npc.id)) {
            logToConsole(`NPC ${npc.name || npc.id}: Next step (${nextStep.x},${nextStep.y},${nextStep.z}) on path is blocked or occupied. Recalculate or wait.`, 'orange');
            // TODO: Handle blocked path, e.g., by trying to find an alternative or waiting.
            return false;
        }

        const originalPos = { ...npc.mapPos };
        let direction = null;

        if (nextStep.x > originalPos.x) direction = 'right';
        else if (nextStep.x < originalPos.x) direction = 'left';
        else if (nextStep.y > originalPos.y) direction = 'down';
        else if (nextStep.y < originalPos.y) direction = 'up';
        // findPath3D should ideally also indicate if a Z-move is the primary intent for this step,
        // for now, attemptCharacterMove will handle z-transitions based on the tile.

        if (!direction) { // This implies nextStep.x === originalPos.x && nextStep.y === originalPos.y
            logToConsole(`NPC ${npc.name || npc.id}: No clear cardinal direction to next step (${nextStep.x},${nextStep.y},${nextStep.z}) from (${originalPos.x},${originalPos.y},${originalPos.z}). Evaluating Z-change.`, 'grey');

            if (nextStep.z !== originalPos.z) { // Path indicates a Z-level change at the current X,Y
                // Check if NPC is currently on a z-transition tile that facilitates this specific move
                let canTransitionFromCurrentTile = false;
                const currentTileZStr = originalPos.z.toString();
                const currentMapData = window.mapRenderer.getCurrentMapData();
                const currentLevelData = currentMapData?.levels?.[currentTileZStr];
                let zTransitionDef = null;

                if (currentLevelData && this.assetManager?.tilesets) {
                    const checkTileForZTransition = (tileIdOnLayer) => {
                        if (!tileIdOnLayer) return null;
                        const baseId = (typeof tileIdOnLayer === 'object' && tileIdOnLayer.tileId !== undefined) ? tileIdOnLayer.tileId : tileIdOnLayer;
                        if (baseId && this.assetManager.tilesets[baseId]) {
                            const def = this.assetManager.tilesets[baseId];
                            // Check if it's a z_transition AND if its target_dz matches the intended move direction
                            if (def.tags?.includes('z_transition') && def.target_dz !== undefined) {
                                // Check if the tile's dz allows reaching nextStep.z from originalPos.z
                                if (originalPos.z + def.target_dz === nextStep.z) {
                                    return def; // This tile allows the specific Z change pathfinding wants
                                }
                            }
                        }
                        return null;
                    };

                    let npcTileOnMiddleRaw = currentLevelData.middle?.[originalPos.y]?.[originalPos.x];
                    zTransitionDef = checkTileForZTransition(npcTileOnMiddleRaw);

                    if (!zTransitionDef) {
                        let npcTileOnBottomRaw = currentLevelData.bottom?.[originalPos.y]?.[originalPos.x];
                        zTransitionDef = checkTileForZTransition(npcTileOnBottomRaw);
                    }

                    if (zTransitionDef) {
                        canTransitionFromCurrentTile = true;
                        logToConsole(`NPC ${npc.name || npc.id}: Is on a Z-transition tile ('${zTransitionDef.name}') that allows Z-change from ${originalPos.z} to ${nextStep.z}. Proceeding.`, 'grey');
                        // Use an arbitrary horizontal direction; attemptCharacterMove section 1 (On Z-transition)
                        // should handle the vertical movement based on the tile the NPC is ON.
                        direction = 'right';
                    } else {
                        logToConsole(`NPC ${npc.name || npc.id}: Path suggests Z-change from ${originalPos.z} to ${nextStep.z} at same X,Y, but NPC is on solid ground (not a matching Z-transition tile). Move blocked.`, 'orange');
                        return false; // CRITICAL: Block the move. NPC cannot phase through solid floor.
                    }
                } else {
                    logToConsole(`NPC ${npc.name || npc.id}: Lacking map data or tilesets to verify Z-transition at current location for Z-change. Move blocked for safety.`, 'orange');
                    return false; // Block if critical data is missing
                }
            } else { // nextStep is same X,Y,Z as originalPos - this shouldn't happen if path.length > 1 caught it.
                logToConsole(`NPC ${npc.name || npc.id}: Path results in no change in X,Y,Z. Halting this move segment.`, 'orange');
                return false;
            }
        }
        // Ensure direction is set if we haven't returned false by now.
        if (!direction) {
            // This case should ideally not be reached if the logic above is complete.
            // It implies a horizontal move was intended but somehow direction wasn't set,
            // or a Z-move was intended but didn't set direction (which it should if valid).
            logToConsole(`NPC ${npc.name || npc.id}: Direction not set after evaluating path step. Path: ${JSON.stringify(path)}, OriginalPos: ${JSON.stringify(originalPos)}, NextStep: ${JSON.stringify(nextStep)}. Halting.`, 'red');
            return false;
        }

        const moveSuccessful = await window.attemptCharacterMove(npc, direction, this.assetManager);

        if (moveSuccessful) {
            // npc.mapPos and npc.currentMovementPoints are updated by attemptCharacterMove
            npc.movedThisTurn = true; // attemptCharacterMove doesn't set this context-specific flag

            // Play animation after successful logical move
            if (window.animationManager) {
                // originalPos was before the move, npc.mapPos is after.
                // nextStep might be more accurate if attemptCharacterMove didn't result in a fall to a different Z.
                // For simplicity, animate from originalPos to current npc.mapPos.
                await window.animationManager.playAnimation('movement', {
                    entity: npc,
                    startPos: originalPos, // Position before attemptCharacterMove
                    endPos: { ...npc.mapPos }, // Position after attemptCharacterMove
                    sprite: npc.sprite,
                    color: npc.color,
                    duration: 300
                });
            }

            logToConsole(`ACTION: ${npc.name || npc.id} attempted move in direction ${direction}. New Pos: (${npc.mapPos.x},${npc.mapPos.y}, Z:${npc.mapPos.z}). MP Left: ${npc.currentMovementPoints}`, 'gold');

            if (this.gameState.combatCurrentAttacker === npc) {
                this.gameState.attackerMapPos = { ...npc.mapPos };
            }
            window.mapRenderer.scheduleRender();
            if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
            return true;
        } else {
            logToConsole(`NPC ${npc.name || npc.id}: attemptCharacterMove failed for direction ${direction}.`, 'orange');
            return false;
        }
    }

    _npcSelectTarget(npc) {
        const npcName = npc.name || npc.id || "NPC";
        this.gameState.combatCurrentDefender = null; this.gameState.defenderMapPos = null;
        if (npc.aggroList?.length > 0) {
            for (const aggroEntry of npc.aggroList) {
                const target = aggroEntry.entityRef;
                const targetPos = target === this.gameState ? this.gameState.playerPos : target.mapPos;
                if (target && target !== npc && target.health?.torso?.current > 0 && target.health?.head?.current > 0 &&
                    target.teamId !== npc.teamId && targetPos && this.initiativeTracker.find(e => e.entity === target)) {
                    if (window.hasLineOfSight3D(npc.mapPos, targetPos)) {
                        this.gameState.combatCurrentDefender = target;
                        this.gameState.defenderMapPos = { ...targetPos };
                        logToConsole(`NPC TARGETING: ${npcName} selected ${target === this.gameState ? "Player" : (target.name || target.id)} from aggro (Threat: ${aggroEntry.threat}) with LOS.`, 'gold');
                        return true;
                    } else {
                        logToConsole(`NPC TARGETING: ${npcName} has no LOS to aggro target ${target === this.gameState ? "Player" : (target.name || target.id)}.`, 'grey');
                    }
                }
            }
        }

        // Fallback to closest enemy with LOS if no aggro target with LOS
        let validTargets = [];
        this.initiativeTracker.forEach(entry => {
            const candidate = entry.entity;
            const candPos = candidate === this.gameState ? this.gameState.playerPos : candidate.mapPos;
            if (candidate !== npc && candidate.health?.torso?.current > 0 && candidate.health?.head?.current > 0 &&
                candidate.teamId !== npc.teamId && npc.mapPos && candPos) {
                if (window.hasLineOfSight3D(npc.mapPos, candPos)) {
                    const dist = getDistance3D(npc.mapPos, candPos); // Use 3D distance
                    validTargets.push({ entity: candidate, pos: candPos, distance: dist });
                }
            }
        });

        if (validTargets.length > 0) {
            validTargets.sort((a, b) => a.distance - b.distance); // Sort by 3D distance
            const closestTargetWithLOS = validTargets[0];
            this.gameState.combatCurrentDefender = closestTargetWithLOS.entity;
            this.gameState.defenderMapPos = { ...closestTargetWithLOS.pos };
            logToConsole(`NPC TARGETING: ${npcName} selected nearest enemy with LOS: ${closestTargetWithLOS.entity === this.gameState ? "Player" : (closestTargetWithLOS.entity.name || closestTargetWithLOS.entity.id)} (Dist: ${closestTargetWithLOS.distance.toFixed(1)}).`, 'gold');

            // Update NPC memory upon successful targeting
            if (npc.memory) { // Ensure npc.memory exists
                npc.memory.lastSeenTargetPos = { ...this.gameState.defenderMapPos }; // Store a copy
                npc.memory.lastSeenTargetTimestamp = this.gameState.currentTime?.totalTurns || 0;
                npc.memory.explorationTarget = null; // Clear any previous exploration target
                logToConsole(`NPC ${npcName} memory updated: last seen target at (${npc.memory.lastSeenTargetPos.x},${npc.memory.lastSeenTargetPos.y}, Z:${npc.memory.lastSeenTargetPos.z}) at turn ${npc.memory.lastSeenTargetTimestamp}. Exploration target cleared.`, 'debug');
            }
            return true;
        }

        logToConsole(`NPC TARGETING: ${npcName} found no valid targets with LOS.`, 'orange');
        return false;
    }

    async executeNpcCombatTurn(npc) {
        const npcName = npc.name || npc.id || "NPC";
        if (!npc || npc.health?.torso?.current <= 0 || npc.health?.head?.current <= 0) {
            logToConsole(`INFO: ${npcName} incapacitated. Skipping turn.`, 'orange');
            await this.nextTurn(npc);
            return;
        }
        if (!npc.aggroList) npc.aggroList = [];
        if (!npc.memory) {
            npc.memory = { lastSeenTargetPos: null, lastSeenTargetTimestamp: 0, recentlyVisitedTiles: [], explorationTarget: null, lastKnownSafePos: { ...(npc.mapPos || { x: 0, y: 0, z: 0 }) } };
        }
        logToConsole(`NPC TURN: ${npcName} (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints})`, 'gold');

        let turnEnded = false;
        let anAttackSequenceHandledNextTurn = false;

        // --- Combat Phase: NPC attempts to find and engage a target ---
        if (this._npcSelectTarget(npc)) { // Also updates memory if target found
            // Loop for combat actions (attack, move to attack, drop)
            for (let iter = 0; !turnEnded && (npc.currentActionPoints > 0 || npc.currentMovementPoints > 0) && iter < 10; iter++) {
                let currentTarget = this.gameState.combatCurrentDefender, currentTargetPos = this.gameState.defenderMapPos;
                if (!currentTarget || currentTarget.health?.torso?.current <= 0 || currentTarget.health?.head?.current <= 0) {
                    if (!this._npcSelectTarget(npc)) { turnEnded = true; break; }
                    currentTarget = this.gameState.combatCurrentDefender; currentTargetPos = this.gameState.defenderMapPos;
                    if (!currentTarget) { turnEnded = true; break; }
                }

                let actionTakenInIter = false;
                let weaponToUse = npc.equippedWeaponId ? this.assetManager.getItem(npc.equippedWeaponId) : null;
                let attackType = weaponToUse ? (weaponToUse.type.includes("melee") ? "melee" : (weaponToUse.type.includes("firearm") || weaponToUse.type.includes("bow") || weaponToUse.type.includes("crossbow") || weaponToUse.type.includes("weapon_ranged_other") || weaponToUse.type.includes("thrown") ? "ranged" : "melee")) : "melee";
                const fireMode = weaponToUse?.fireModes?.includes("burst") ? "burst" : (weaponToUse?.fireModes?.[0] || "single");
                const distanceToTarget3D = npc.mapPos && currentTargetPos ? getDistance3D(npc.mapPos, currentTargetPos) : Infinity;
                const canAttack = (attackType === 'melee' && distanceToTarget3D <= 1.8) || (attackType === 'ranged');

                if (canAttack && npc.currentActionPoints > 0) {
                    logToConsole(`NPC ACTION: ${npcName} attacks ${currentTarget.name || "Player"} with ${weaponToUse ? weaponToUse.name : "Unarmed"}.`, 'gold');
                    this.gameState.pendingCombatAction = { target: currentTarget, weapon: weaponToUse, attackType, bodyPart: "Torso", fireMode, actionType: "attack", entity: npc, actionDescription: `${attackType} by ${npcName}` };
                    npc.currentActionPoints--;
                    actionTakenInIter = true;
                    this.gameState.combatPhase = 'defenderDeclare';
                    this.handleDefenderActionPrompt();
                    anAttackSequenceHandledNextTurn = true;
                    if (this.gameState.combatPhase === 'playerDefenseDeclare') {
                        logToConsole(`NPC ${npcName} is attacking Player. Waiting for Player's defense input. executeNpcCombatTurn returns.`, 'gold');
                        return;
                    }
                    turnEnded = true;
                    break;
                } else if (npc.currentMovementPoints > 0) {
                    let dropExecuted = await this._evaluateAndExecuteNpcDrop(npc);
                    if (dropExecuted) {
                        actionTakenInIter = true;
                    } else {
                        if (await this.moveNpcTowardsTarget(npc, currentTargetPos)) {
                            actionTakenInIter = true;
                        }
                    }
                }
                if (!actionTakenInIter) turnEnded = true;
                if (npc.currentActionPoints === 0 && npc.currentMovementPoints === 0) turnEnded = true;
            }
        } else {
            // --- Exploration/Memory Phase: No direct combat target found ---
            logToConsole(`NPC ACTION: ${npcName} no direct combat target. Considering exploration/memory or strategic waiting.`, 'gold');
            if (npc.currentMovementPoints > 0 && npc.memory) {
                let pathfindingTarget = null;
                const currentTime = this.gameState.currentTime?.totalTurns || 0;

                // 1. Check memory for a recent target
                if (npc.memory.lastSeenTargetPos && (currentTime - (npc.memory.lastSeenTargetTimestamp || 0) < MEMORY_DURATION_THRESHOLD)) {
                    if (npc.mapPos.x === npc.memory.lastSeenTargetPos.x &&
                        npc.mapPos.y === npc.memory.lastSeenTargetPos.y &&
                        npc.mapPos.z === npc.memory.lastSeenTargetPos.z) {
                        logToConsole(`${npcName} is at last known target pos. Clearing memory to explore.`, 'grey');
                        npc.memory.lastSeenTargetPos = null;
                    } else {
                        pathfindingTarget = npc.memory.lastSeenTargetPos;
                        logToConsole(`${npcName} moving towards last known target pos: (${pathfindingTarget.x},${pathfindingTarget.y}, Z:${pathfindingTarget.z}) (Turn ${npc.memory.lastSeenTargetTimestamp}).`, 'gold');
                    }
                } else {
                    if (npc.memory.lastSeenTargetPos) {
                        logToConsole(`${npcName} memory of last target is stale (seen at ${npc.memory.lastSeenTargetTimestamp}, current ${currentTime}). Clearing.`, 'grey');
                        npc.memory.lastSeenTargetPos = null;
                    }
                }

                // 2. Continue towards current exploration target if no combat memory
                if (!pathfindingTarget && npc.memory.explorationTarget) {
                    if (npc.mapPos.x === npc.memory.explorationTarget.x && npc.mapPos.y === npc.memory.explorationTarget.y && npc.mapPos.z === npc.memory.explorationTarget.z) {
                        logToConsole(`${npcName} reached previous exploration target. Clearing to find a new one.`, 'grey');
                        npc.memory.explorationTarget = null;
                        const arrivedKey = `${npc.mapPos.x},${npc.mapPos.y},${npc.mapPos.z}`;
                        if (!npc.memory.recentlyVisitedTiles.includes(arrivedKey)) {
                            npc.memory.recentlyVisitedTiles.push(arrivedKey);
                            if (npc.memory.recentlyVisitedTiles.length > RECENTLY_VISITED_MAX_SIZE) {
                                npc.memory.recentlyVisitedTiles.shift();
                            }
                        }
                    } else {
                        pathfindingTarget = npc.memory.explorationTarget;
                        logToConsole(`${npcName} continuing to exploration target: (${pathfindingTarget.x},${pathfindingTarget.y}, Z:${pathfindingTarget.z})`, 'gold');
                    }
                }

                // 3. Find new exploration target if needed
                if (!pathfindingTarget) {
                    logToConsole(`${npcName} needs a new exploration target.`, 'grey');
                    let attempts = 0;
                    const mapData = window.mapRenderer.getCurrentMapData();
                    if (mapData && mapData.dimensions && npc.mapPos) {
                        while (attempts < MAX_EXPLORATION_TARGET_ATTEMPTS && !pathfindingTarget) {
                            const angle = Math.random() * 2 * Math.PI;
                            const radius = 1 + Math.floor(Math.random() * (NPC_EXPLORATION_RADIUS - 1));
                            const targetX = Math.max(0, Math.min(mapData.dimensions.width - 1, Math.floor(npc.mapPos.x + Math.cos(angle) * radius)));
                            const targetY = Math.max(0, Math.min(mapData.dimensions.height - 1, Math.floor(npc.mapPos.y + Math.sin(angle) * radius)));
                            const targetZ = npc.mapPos.z;

                            const visitedKey = `${targetX},${targetY},${targetZ}`;
                            if (window.mapRenderer.isWalkable(targetX, targetY, targetZ) &&
                                !this.isTileOccupied(targetX, targetY, targetZ, npc.id) &&
                                !npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                                pathfindingTarget = { x: targetX, y: targetY, z: targetZ };
                                npc.memory.explorationTarget = pathfindingTarget;
                                logToConsole(`${npcName} selected new random exploration target: (${targetX},${targetY}, Z:${targetZ})`, 'gold');
                                break;
                            }
                            attempts++;
                        }
                    }
                    if (!pathfindingTarget && attempts >= MAX_EXPLORATION_TARGET_ATTEMPTS) {
                        logToConsole(`${npcName} failed to find a new random exploration target after ${attempts} attempts. Trying last known safe position.`, 'orange');
                        if (npc.memory.lastKnownSafePos &&
                            (npc.memory.lastKnownSafePos.x !== npc.mapPos.x ||
                                npc.memory.lastKnownSafePos.y !== npc.mapPos.y ||
                                npc.memory.lastKnownSafePos.z !== npc.mapPos.z)) {
                            pathfindingTarget = npc.memory.lastKnownSafePos;
                            logToConsole(`${npcName} will move towards last known safe position: (${pathfindingTarget.x},${pathfindingTarget.y}, Z:${pathfindingTarget.z})`, 'gold');
                        } else {
                            logToConsole(`${npcName} is already at its last known safe position or has no safe position. Waiting.`, 'grey');
                        }
                    }
                }

                // 4. Move towards the determined pathfinding target
                if (pathfindingTarget) {
                    if (await this.moveNpcTowardsTarget(npc, pathfindingTarget)) {
                        npc.memory.lastKnownSafePos = { ...npc.mapPos };
                        const visitedKey = `${npc.mapPos.x},${npc.mapPos.y},${npc.mapPos.z}`;
                        if (!npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                            npc.memory.recentlyVisitedTiles.push(visitedKey);
                            if (npc.memory.recentlyVisitedTiles.length > RECENTLY_VISITED_MAX_SIZE) {
                                npc.memory.recentlyVisitedTiles.shift();
                            }
                        }
                        if (npc.memory.explorationTarget && npc.mapPos.x === npc.memory.explorationTarget.x &&
                            npc.mapPos.y === npc.memory.explorationTarget.y && npc.mapPos.z === npc.memory.explorationTarget.z) {
                            logToConsole(`${npcName} reached current exploration target. Clearing it.`, 'grey');
                            npc.memory.explorationTarget = null;
                        }
                    } else {
                        logToConsole(`${npcName} could not move towards target (${pathfindingTarget.x},${pathfindingTarget.y}, Z:${pathfindingTarget.z}). Clearing exploration target if it was this one.`, 'orange');
                        if (npc.memory.explorationTarget && npc.memory.explorationTarget.x === pathfindingTarget.x &&
                            npc.memory.explorationTarget.y === pathfindingTarget.y && npc.memory.explorationTarget.z === pathfindingTarget.z) {
                            npc.memory.explorationTarget = null;
                        }
                        if (npc.memory.lastSeenTargetPos && npc.memory.lastSeenTargetPos.x === pathfindingTarget.x &&
                            npc.memory.lastSeenTargetPos.y === pathfindingTarget.y && npc.memory.lastSeenTargetPos.z === pathfindingTarget.z) {
                            logToConsole(`${npcName} failed to move to lastSeenTargetPos, clearing it to prevent repeated attempts.`, 'orange');
                            npc.memory.lastSeenTargetPos = null;
                        }
                    }
                } else {
                    logToConsole(`${npcName} has no pathfinding target (memory/exploration). Waiting this turn segment.`, 'grey');
                }
            } else if (npc.memory) {
                logToConsole(`${npcName} no MP for exploration/memory movement. Waiting.`, 'grey');
            } else {
                logToConsole(`${npcName} has no memory object or no MP. Waiting.`, 'grey');
            }
            // After attempting memory/exploration movement, the NPC's turn for major actions is done in this branch.
            // The anAttackSequenceHandledNextTurn flag will be false, so nextTurn will be called below.
        }

        if (!anAttackSequenceHandledNextTurn) {
            logToConsole(`NPC TURN END: ${npcName} (No attack sequence initiated that would handle nextTurn, or only moved/idled). AP Left: ${npc.currentActionPoints}, MP Left: ${npc.currentMovementPoints}. Calling nextTurn.`, 'gold');
            await this.nextTurn(npc);
        } else {
            logToConsole(`NPC TURN END: ${npcName} (Attack sequence handled nextTurn OR waiting for player defense). AP Left: ${npc.currentActionPoints}, MP Left: ${npc.currentMovementPoints}.`, 'gold');
        }
    }

    /**
     * Main logic for an NPC's turn in combat.
     * Handles target selection, attacking, moving towards a target, tactical drops,
     * and exploration/memory-based movement if no combat target is found.
     * @param {object} npc - The NPC object taking its turn.
     */
    async executeNpcCombatTurn(npc) {
        const npcName = npc.name || npc.id || "NPC";
        if (!npc || npc.health?.torso?.current <= 0 || npc.health?.head?.current <= 0) { logToConsole(`INFO: ${npcName} incapacitated. Skipping turn.`, 'orange'); await this.nextTurn(npc); return; }
        if (!npc.aggroList) npc.aggroList = [];
        if (!npc.memory) { // Ensure memory object exists, crucial for new logic
            npc.memory = { lastSeenTargetPos: null, lastSeenTargetTimestamp: 0, recentlyVisitedTiles: [], explorationTarget: null, lastKnownSafePos: { ...(npc.mapPos || { x: 0, y: 0, z: 0 }) } };
        }
        logToConsole(`NPC TURN: ${npcName} (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints})`, 'gold');

        let turnEnded = false;
        let actionTakenThisTurn = false; // Tracks if any significant action (attack/move) was taken in the entire turn

        // --- Combat Phase: NPC attempts to find and engage a target ---
        if (this._npcSelectTarget(npc)) {
            actionTakenThisTurn = true;
            // Loop for combat actions (attack, move to attack, drop) as long as NPC has AP/MP
            for (let iter = 0; !turnEnded && (npc.currentActionPoints > 0 || npc.currentMovementPoints > 0) && iter < 10; iter++) {
                let currentTarget = this.gameState.combatCurrentDefender, currentTargetPos = this.gameState.defenderMapPos;
                // Re-evaluate target if current one is invalid or defeated
                if (!currentTarget || currentTarget.health?.torso?.current <= 0 || currentTarget.health?.head?.current <= 0) {
                    if (!this._npcSelectTarget(npc)) { turnEnded = true; break; }
                    currentTarget = this.gameState.combatCurrentDefender; currentTargetPos = this.gameState.defenderMapPos;
                    if (!currentTarget) { turnEnded = true; break; }
                }

                let actionTakenInIter = false;
                let weaponToUse = npc.equippedWeaponId ? this.assetManager.getItem(npc.equippedWeaponId) : null;
                let attackType = weaponToUse ? (weaponToUse.type.includes("melee") ? "melee" : (weaponToUse.type.includes("firearm") || weaponToUse.type.includes("bow") || weaponToUse.type.includes("crossbow") || weaponToUse.type.includes("weapon_ranged_other") || weaponToUse.type.includes("thrown") ? "ranged" : "melee")) : "melee";
                const fireMode = weaponToUse?.fireModes?.includes("burst") ? "burst" : (weaponToUse?.fireModes?.[0] || "single");
                const distanceToTarget3D = npc.mapPos && currentTargetPos ? getDistance3D(npc.mapPos, currentTargetPos) : Infinity;
                const canAttack = (attackType === 'melee' && distanceToTarget3D <= 1.8) || (attackType === 'ranged');

                if (canAttack && npc.currentActionPoints > 0) { // Try to attack if possible
                    logToConsole(`NPC ACTION: ${npcName} attacks ${currentTarget.name || "Player"} with ${weaponToUse ? weaponToUse.name : "Unarmed"}.`, 'gold');
                    this.gameState.pendingCombatAction = { target: currentTarget, weapon: weaponToUse, attackType, bodyPart: "Torso", fireMode, actionType: "attack", entity: npc, actionDescription: `${attackType} by ${npcName}` };
                    npc.currentActionPoints--;
                    actionTakenInIter = true;
                    this.gameState.combatPhase = 'defenderDeclare';
                    this.handleDefenderActionPrompt();
                    if (this.gameState.combatPhase === 'playerDefenseDeclare') return; // Wait for player defense input
                } else if (npc.currentMovementPoints > 0) { // If cannot attack, try to move
                    // Attempt tactical drop first
                    let dropExecuted = await this._evaluateAndExecuteNpcDrop(npc);
                    if (dropExecuted) {
                        actionTakenInIter = true;
                    } else { // If no drop, try standard pathfinding
                        if (await this.moveNpcTowardsTarget(npc, currentTargetPos)) {
                            actionTakenInIter = true;
                        }
                    }
                }

                if (!actionTakenInIter) turnEnded = true; // If no action in this iteration, end combat actions for this turn
                if (npc.currentActionPoints === 0 && npc.currentMovementPoints === 0) turnEnded = true; // No more points
            }
        } else {
            // --- Exploration/Memory Phase: No combat target found ---
            logToConsole(`NPC ACTION: ${npcName} no direct combat target. Considering exploration/memory.`);
            actionTakenThisTurn = true; // Attempting exploration is considered an action for the turn's flow
            if (npc.currentMovementPoints > 0 && npc.memory) {
                let pathfindingTarget = null;
                const currentTime = this.gameState.currentTime?.totalTurns || 0;

                // 1. Check memory for a recent target
                if (npc.memory.lastSeenTargetPos && (currentTime - npc.memory.lastSeenTargetTimestamp < MEMORY_DURATION_THRESHOLD)) {
                    pathfindingTarget = npc.memory.lastSeenTargetPos;
                    logToConsole(`${npcName} moving towards last known target pos: (${pathfindingTarget.x},${pathfindingTarget.y},${pathfindingTarget.z})`);
                } else {
                    if (npc.memory.lastSeenTargetPos) logToConsole(`${npcName} memory of last target faded.`);
                    npc.memory.lastSeenTargetPos = null; // Clear faded memory
                }

                // 2. Continue towards current exploration target if no combat memory
                if (!pathfindingTarget && npc.memory.explorationTarget) {
                    if (npc.mapPos.x === npc.memory.explorationTarget.x && npc.mapPos.y === npc.memory.explorationTarget.y && npc.mapPos.z === npc.memory.explorationTarget.z) {
                        logToConsole(`${npcName} reached previous exploration target. Clearing.`);
                        npc.memory.explorationTarget = null; // Reached, clear to find a new one
                    } else {
                        pathfindingTarget = npc.memory.explorationTarget;
                        logToConsole(`${npcName} continuing to exploration target: (${pathfindingTarget.x},${pathfindingTarget.y},${pathfindingTarget.z})`);
                    }
                }

                // 3. Find new exploration target if needed
                if (!pathfindingTarget) {
                    let attempts = 0;
                    const mapData = window.mapRenderer.getCurrentMapData();
                    if (mapData && mapData.dimensions) { // Check if mapData and dimensions are available
                        while (attempts < MAX_EXPLORATION_TARGET_ATTEMPTS && !pathfindingTarget) {
                            const angle = Math.random() * 2 * Math.PI;
                            const radius = 1 + Math.random() * (NPC_EXPLORATION_RADIUS - 1); // Ensure radius > 0 for actual movement
                            const targetX = Math.floor(npc.mapPos.x + Math.cos(angle) * radius);
                            const targetY = Math.floor(npc.mapPos.y + Math.sin(angle) * radius);
                            const targetZ = npc.mapPos.z; // Explore on the same Z-level for now

                            if (targetX >= 0 && targetX < mapData.dimensions.width && targetY >= 0 && targetY < mapData.dimensions.height) {
                                const visitedKey = `${targetX},${targetY},${targetZ}`;
                                if (window.mapRenderer.isWalkable(targetX, targetY, targetZ) &&
                                    !this.isTileOccupied(targetX, targetY, targetZ, npc.id) &&
                                    !npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                                    pathfindingTarget = { x: targetX, y: targetY, z: targetZ };
                                    npc.memory.explorationTarget = pathfindingTarget;
                                    logToConsole(`${npcName} selected new random exploration target: (${targetX},${targetY},${targetZ})`);
                                    break;
                                }
                            }
                            attempts++;
                        }
                    }
                    if (!pathfindingTarget && attempts >= MAX_EXPLORATION_TARGET_ATTEMPTS) {
                        logToConsole(`${npcName} failed to find exploration target after ${attempts} attempts. Will use lastKnownSafePos or wait.`);
                        // Try to move to last known safe position if it's different from current
                        pathfindingTarget = npc.memory.lastKnownSafePos &&
                            (npc.memory.lastKnownSafePos.x !== npc.mapPos.x ||
                                npc.memory.lastKnownSafePos.y !== npc.mapPos.y ||
                                npc.memory.lastKnownSafePos.z !== npc.mapPos.z)
                            ? npc.memory.lastKnownSafePos : null;
                        if (pathfindingTarget) logToConsole(`${npcName} will move towards last known safe position.`);
                    }
                }

                // 4. Move towards the determined pathfinding target (from memory or exploration)
                if (pathfindingTarget) {
                    if (await this.moveNpcTowardsTarget(npc, pathfindingTarget)) {
                        // Update memory after a successful move
                        npc.memory.lastKnownSafePos = { ...npc.mapPos };
                        const visitedKey = `${npc.mapPos.x},${npc.mapPos.y},${npc.mapPos.z}`;
                        if (!npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                            npc.memory.recentlyVisitedTiles.push(visitedKey);
                            if (npc.memory.recentlyVisitedTiles.length > RECENTLY_VISITED_MAX_SIZE) {
                                npc.memory.recentlyVisitedTiles.shift(); // Keep buffer size limited
                            }
                        }
                        // If exploration target was reached, clear it
                        if (npc.memory.explorationTarget && npc.mapPos.x === npc.memory.explorationTarget.x &&
                            npc.mapPos.y === npc.memory.explorationTarget.y && npc.mapPos.z === npc.memory.explorationTarget.z) {
                            logToConsole(`${npcName} reached exploration target. Clearing.`);
                            npc.memory.explorationTarget = null;
                        }
                    } else {
                        logToConsole(`${npcName} could not move towards exploration/memory target. Clearing exploration target.`);
                        npc.memory.explorationTarget = null; // Clear if stuck, to re-pick next time
                    }
                } else {
                    logToConsole(`${npcName} has no exploration target and no memory to pursue. Waiting.`);
                }
            } else if (npc.memory) { // No movement points, but has memory object
                logToConsole(`${npcName} no MP for exploration. Waiting.`);
            }
            turnEnded = true; // Exploration/memory processing takes one "action block" for the turn.
        }

        // Final check to ensure turn ends if NPC is out of points and no specific action was taken to end it sooner.
        if (!turnEnded && !actionTakenThisTurn && npc.currentActionPoints === 0 && npc.currentMovementPoints === 0) {
            turnEnded = true;
        }

        // If this function hasn't returned early (i.e., player wasn't defending),
        // and an attack wasn't made and processed (which would have called nextTurn via processAttack),
        // then this NPC's turn is ending due to other reasons (e.g., movement, ran out of points without attacking, no valid target).
        // In this case, explicitly call nextTurn.
        if (!actionTakenThisTurn || (actionTakenThisTurn && !anAttackWasMadeAndProcessedThisTurn)) {
            logToConsole(`NPC TURN END (no attack processed that calls nextTurn, or no action taken): ${npcName}. AP Left: ${npc.currentActionPoints}, MP Left: ${npc.currentMovementPoints}. Calling nextTurn.`, 'gold');
            await this.nextTurn(npc);
        } else {
            // An attack was processed, and its corresponding processAttack call handled invoking nextTurn,
            // OR this function returned early because the player is defending (in which case processAttack will handle nextTurn later).
            // No additional nextTurn call is needed from here.
            logToConsole(`NPC TURN END (attack processed and nextTurn handled, or waiting for player defense): ${npcName}. AP Left: ${npc.currentActionPoints}, MP Left: ${npc.currentMovementPoints}.`, 'gold');
        }
    }

    /**
     * Evaluates and potentially executes a tactical drop for an NPC.
     * Checks adjacent tiles for drop opportunities, considers fall height and NPC's willingness (willpower check).
     * @param {object} npc - The NPC considering the drop.
     * @returns {Promise<boolean>} True if a drop action was successfully initiated, false otherwise.
     */
    async _evaluateAndExecuteNpcDrop(npc) {
        if (!npc.mapPos || !this.gameState.combatCurrentDefender || !this.gameState.defenderMapPos || typeof window.mapRenderer?.isTileEmpty !== 'function' || typeof window.mapRenderer?.isWalkable !== 'function' || typeof window.npcShouldTakeFall !== 'function') {
            return false; // Missing necessary data or functions
        }

        const currentTargetPos = this.gameState.defenderMapPos;
        const possibleDrops = [];
        const adjacentOffsets = [
            { dx: 0, dy: -1, dir: 'up' }, { dx: 0, dy: 1, dir: 'down' },
            { dx: -1, dy: 0, dir: 'left' }, { dx: 1, dy: 0, dir: 'right' }
        ];
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData || !mapData.dimensions) return false;

        // Iterate over adjacent tiles to find potential drop spots
        for (const offset of adjacentOffsets) {
            const adjX = npc.mapPos.x + offset.dx;
            const adjY = npc.mapPos.y + offset.dy;
            const adjZ = npc.mapPos.z; // The Z-level of the "air" tile the NPC steps into

            // Boundary check
            if (adjX < 0 || adjX >= mapData.dimensions.width || adjY < 0 || adjY >= mapData.dimensions.height) continue;

            // Check if the adjacent tile at current Z is empty (e.g., air)
            if (window.mapRenderer.isTileEmpty(adjX, adjY, adjZ)) {
                let landingZ = -Infinity;
                let currentScanZ = adjZ - 1; // Start scanning one level below the "air" tile
                let foundLandingSpot = false;
                const minZLevel = Object.keys(mapData.levels).reduce((min, k) => Math.min(min, parseInt(k)), Infinity);

                // Project downwards to find a walkable landing spot
                for (let i = 0; i < 100 && currentScanZ >= minZLevel; i++) { // Max 100 levels scan or map min Z
                    if (window.mapRenderer.isWalkable(adjX, adjY, currentScanZ)) {
                        landingZ = currentScanZ;
                        foundLandingSpot = true;
                        break;
                    }
                    currentScanZ--;
                }

                if (foundLandingSpot) {
                    const fallHeight = adjZ - landingZ; // adjZ is npc.mapPos.z
                    if (fallHeight > 0) { // Must be an actual drop
                        if (window.npcShouldTakeFall(npc, fallHeight)) { // NPC willpower check
                            possibleDrops.push({
                                targetDropTile: { x: adjX, y: adjY, z: adjZ }, // The "air" tile to move into
                                landingPos: { x: adjX, y: adjY, z: landingZ },    // Expected landing position
                                fallHeight: fallHeight,
                                direction: offset.dir // Direction to move to initiate the drop
                            });
                        }
                    }
                }
            }
        }

        if (possibleDrops.length > 0) {
            let bestDrop = null;
            let bestDropScore = -Infinity; // Using a score to evaluate drops

            // Evaluate drops based on a simple heuristic
            for (const drop of possibleDrops) {
                let score = 0;
                const distToTargetAfterDrop = getDistance3D(drop.landingPos, currentTargetPos);
                score -= distToTargetAfterDrop; // Closer to target is better

                // Significant bonus for landing on the same Z-level as the target
                if (drop.landingPos.z === currentTargetPos.z) {
                    score += 50;
                    // Bonus if current target is below and this drop reaches their Z
                    if (currentTargetPos.z < npc.mapPos.z) score += 25;
                }
                // Penalty for high fall damage potential (proportional to fallHeight)
                score -= drop.fallHeight * 2;

                if (score > bestDropScore) {
                    bestDropScore = score;
                    bestDrop = drop;
                }
            }

            // Condition to take the drop: If a "best" drop is found and meets certain criteria
            // Example criteria: target is below current Z and drop lands on target's Z.
            // This can be tuned for more sophisticated decision-making.
            if (bestDrop && (currentTargetPos.z < npc.mapPos.z && bestDrop.landingPos.z === currentTargetPos.z)) {
                logToConsole(`NPC ${npc.name || npc.id}: Decided tactical drop to (${bestDrop.targetDropTile.x},${bestDrop.targetDropTile.y}) -> Z:${bestDrop.landingPos.z}. Score: ${bestDropScore.toFixed(1)}`, "yellow");

                if (npc.currentMovementPoints > 0) {
                    const mpBeforeMove = npc.currentMovementPoints;
                    // Attempt to move into the "air" tile; this will trigger a fall via attemptCharacterMove -> initiateFallCheck
                    const moveSuccessful = await window.attemptCharacterMove(npc, bestDrop.direction, this.assetManager);

                    if (moveSuccessful) {
                        if (npc.currentMovementPoints < mpBeforeMove) { // Check if MP was actually spent
                            npc.movedThisTurn = true;
                        }
                        this.gameState.attackerMapPos = { ...npc.mapPos }; // Update combat state's record of attacker's new pos
                        window.mapRenderer.scheduleRender();
                        if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
                        return true; // Drop action successfully initiated
                    } else {
                        logToConsole(`NPC ${npc.name || npc.id}: Tactical drop move initiation failed for direction ${bestDrop.direction}.`, "orange");
                    }
                } else {
                    logToConsole(`NPC ${npc.name || npc.id}: Wanted to drop but no MP.`, "orange");
                }
            }
        }
        return false; // No drop action taken
    }

    updateCombatUI() {
        const updateElement = (id, prefix, entity) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = prefix;
                if (entity) {
                    const name = (entity === this.gameState) ? (document.getElementById('charName')?.value || "Player") : (entity.name || entity.id);
                    const color = window.getTeamColor(entity);
                    const span = document.createElement('span');
                    span.style.color = color; span.textContent = name || '-';
                    el.appendChild(span);
                } else if (id === 'currentDefender' && this.gameState.defenderMapPos) {
                    el.append(`Tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}`);
                } else el.append('-');
            }
        };
        updateElement('currentAttacker', 'Attacker: ', this.gameState.combatCurrentAttacker);
        updateElement('currentDefender', 'Defender: ', this.gameState.combatCurrentDefender);

        const attackerPromptEl = document.getElementById('attackerPrompt');
        const defenderPromptEl = document.getElementById('defenderPrompt');
        if (attackerPromptEl && (this.gameState.combatPhase !== 'playerAttackDeclare' || document.getElementById('attackDeclarationUI').classList.contains('hidden'))) attackerPromptEl.innerHTML = '';
        if (defenderPromptEl && (this.gameState.combatPhase !== 'playerDefenseDeclare' || document.getElementById('defenseDeclarationUI').classList.contains('hidden'))) defenderPromptEl.innerHTML = '';
        if (!this.gameState.isInCombat) {
            ['attackRollResult', 'defenseRollResult', 'damageResult'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = `${id.replace('Result', ' Roll')}: -`; });
            this.gameState.attackerMapPos = null; this.gameState.defenderMapPos = null;
            window.mapRenderer.scheduleRender();
        }
    }

    async processNpcOutOfCombatBehavior(npc, maxMovesPerCycle = 3) {
        const npcName = npc.name || npc.id || "NPC_OOC";
        if (!npc || npc.health?.torso?.current <= 0 || npc.health?.head?.current <= 0) {
            // logToConsole(`INFO: ${npcName} incapacitated. Skipping out-of-combat behavior.`, 'grey');
            return;
        }

        if (!npc.mapPos) {
            // logToConsole(`INFO: ${npcName} has no mapPos. Skipping out-of-combat behavior.`, 'orange');
            return;
        }

        if (!npc.memory) {
            npc.memory = {
                lastSeenTargetPos: null,
                lastSeenTargetTimestamp: 0,
                recentlyVisitedTiles: [],
                explorationTarget: null,
                lastKnownSafePos: { ...npc.mapPos }
            };
        }

        let movesMadeThisCycle = 0;

        // Determine Pathfinding Target
        let pathfindingTarget = npc.memory.explorationTarget;

        if (pathfindingTarget && npc.mapPos.x === pathfindingTarget.x && npc.mapPos.y === pathfindingTarget.y && npc.mapPos.z === pathfindingTarget.z) {
            logToConsole(`NPC_OOC ${npcName}: Reached previous exploration target (${pathfindingTarget.x},${pathfindingTarget.y}, Z:${pathfindingTarget.z}). Clearing.`, 'cyan');
            const visitedKey = `${npc.mapPos.x},${npc.mapPos.y},${npc.mapPos.z}`;
            if (!npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                npc.memory.recentlyVisitedTiles.push(visitedKey);
                if (npc.memory.recentlyVisitedTiles.length > RECENTLY_VISITED_MAX_SIZE) {
                    npc.memory.recentlyVisitedTiles.shift();
                }
            }
            pathfindingTarget = null;
            npc.memory.explorationTarget = null;
        }

        if (!pathfindingTarget) {
            let attempts = 0;
            const mapData = window.mapRenderer.getCurrentMapData();
            const OOC_EXPLORATION_RADIUS = NPC_EXPLORATION_RADIUS * 1.5; // Can explore a bit further when OOC

            if (mapData && mapData.dimensions) {
                while (attempts < MAX_EXPLORATION_TARGET_ATTEMPTS && !pathfindingTarget) {
                    const angle = Math.random() * 2 * Math.PI;
                    const radius = 2 + Math.floor(Math.random() * (OOC_EXPLORATION_RADIUS - 2)); // Min radius 2 to encourage actual movement
                    const targetX = Math.max(0, Math.min(mapData.dimensions.width - 1, Math.floor(npc.mapPos.x + Math.cos(angle) * radius)));
                    const targetY = Math.max(0, Math.min(mapData.dimensions.height - 1, Math.floor(npc.mapPos.y + Math.sin(angle) * radius)));
                    const targetZ = npc.mapPos.z; // Primarily explore current Z-level

                    const visitedKey = `${targetX},${targetY},${targetZ}`;
                    if (window.mapRenderer.isWalkable(targetX, targetY, targetZ) &&
                        !this.isTileOccupied(targetX, targetY, targetZ, npc.id) &&
                        !npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                        pathfindingTarget = { x: targetX, y: targetY, z: targetZ };
                        npc.memory.explorationTarget = pathfindingTarget;
                        logToConsole(`NPC_OOC ${npcName}: Selected new OOC exploration target: (${targetX},${targetY}, Z:${targetZ})`, 'cyan');
                        break;
                    }
                    attempts++;
                }
            }
            if (!pathfindingTarget && attempts >= MAX_EXPLORATION_TARGET_ATTEMPTS) {
                logToConsole(`NPC_OOC ${npcName}: Failed to find OOC exploration target after ${attempts} attempts. May move to safe pos or idle.`, 'grey');
                if (npc.memory.lastKnownSafePos &&
                    (npc.memory.lastKnownSafePos.x !== npc.mapPos.x ||
                        npc.memory.lastKnownSafePos.y !== npc.mapPos.y ||
                        npc.memory.lastKnownSafePos.z !== npc.mapPos.z)) {
                    pathfindingTarget = npc.memory.lastKnownSafePos;
                } else {
                    // logToConsole(`NPC_OOC ${npcName}: No suitable exploration target and already at safe pos. Idling.`, 'grey');
                }
            }
        }

        // Execute Movement if a target is set and NPC has moves for this cycle
        if (pathfindingTarget && movesMadeThisCycle < maxMovesPerCycle) {
            // We need a way to limit moves within moveNpcTowardsTarget or do it step-by-step here
            // For now, let's assume moveNpcTowardsTarget can be adapted or we simplify.
            // Simplified: Try to move one step.

            // Re-use combat movement logic for now, it needs npc.currentMovementPoints
            // This is a temporary bridge; ideally, OOC movement wouldn't use combat MP.
            const originalCombatMP = npc.currentMovementPoints;
            npc.currentMovementPoints = maxMovesPerCycle - movesMadeThisCycle; // Give it budget for this cycle

            if (npc.currentMovementPoints > 0) {
                if (await this.moveNpcTowardsTarget(npc, pathfindingTarget)) {
                    movesMadeThisCycle = (maxMovesPerCycle - movesMadeThisCycle) - npc.currentMovementPoints; // Consumed MP
                    npc.memory.lastKnownSafePos = { ...npc.mapPos };
                    const visitedKey = `${npc.mapPos.x},${npc.mapPos.y},${npc.mapPos.z}`;
                    if (!npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                        npc.memory.recentlyVisitedTiles.push(visitedKey);
                        if (npc.memory.recentlyVisitedTiles.length > RECENTLY_VISITED_MAX_SIZE) {
                            npc.memory.recentlyVisitedTiles.shift();
                        }
                    }
                    if (npc.memory.explorationTarget && npc.mapPos.x === npc.memory.explorationTarget.x &&
                        npc.mapPos.y === npc.memory.explorationTarget.y && npc.mapPos.z === npc.memory.explorationTarget.z) {
                        logToConsole(`NPC_OOC ${npcName}: Reached OOC exploration target. Clearing.`, 'cyan');
                        npc.memory.explorationTarget = null;
                    }
                } else {
                    // Failed to move (e.g. path blocked, or no path)
                    // If it was an exploration target, clear it to avoid getting stuck
                    if (npc.memory.explorationTarget && npc.memory.explorationTarget.x === pathfindingTarget.x &&
                        npc.memory.explorationTarget.y === pathfindingTarget.y && npc.memory.explorationTarget.z === pathfindingTarget.z) {
                        logToConsole(`NPC_OOC ${npcName}: Could not move towards OOC exploration target. Clearing it.`, 'orange');
                        npc.memory.explorationTarget = null;
                    }
                }
            }
            npc.currentMovementPoints = originalCombatMP; // Restore original combat MP
        }
        // No explicit nextTurn call here, as this is outside the combat turn sequence.
    }
}
window.CombatManager = CombatManager;