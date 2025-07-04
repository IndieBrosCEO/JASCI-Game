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
        const combatUIDiv = document.getElementById('combatUIDiv');
        if (combatUIDiv) {
            logToConsole(`[CombatManager.startCombat] Found #combatUIDiv. Current classes: ${combatUIDiv.className}`, 'debug');
            logToConsole(`[CombatManager.startCombat] Computed display before change: ${window.getComputedStyle(combatUIDiv).display}`, 'debug');
            combatUIDiv.classList.remove('hidden');
            logToConsole(`[CombatManager.startCombat] #combatUIDiv classes after remove 'hidden': ${combatUIDiv.className}`, 'debug');
            // Force a reflow before checking computed style again, though it might not be necessary for simple class changes.
            // void combatUIDiv.offsetWidth; 
            setTimeout(() => { // Use setTimeout to allow browser to repaint/reflow
                if (document.getElementById('combatUIDiv')) { // Re-check existence in case of async issues
                    logToConsole(`[CombatManager.startCombat] Computed display AFTER remove 'hidden' (async check): ${window.getComputedStyle(document.getElementById('combatUIDiv')).display}`, 'debug');
                    const mapContainer = document.getElementById('mapContainer');
                    if (mapContainer) {
                        logToConsole(`[CombatManager.startCombat] Parent #mapContainer display: ${window.getComputedStyle(mapContainer).display}`, 'debug');
                        const middlePanel = document.getElementById('middle-panel');
                        if (middlePanel) {
                            logToConsole(`[CombatManager.startCombat] Grandparent #middle-panel display: ${window.getComputedStyle(middlePanel).display}`, 'debug');
                        }
                    }
                }
            }, 0);
        } else {
            console.error("CombatManager: combatUIDiv not found in DOM, cannot make it visible.");
            logToConsole("[CombatManager.startCombat] ERROR: #combatUIDiv not found in DOM.", "error");
        }

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
            // Call the main NPC turn execution function from npcDecisions.js
            if (window.executeNpcTurn) {
                await window.executeNpcTurn(attacker, this.gameState, this, this.assetManager);
            } else {
                logToConsole(`ERROR: window.executeNpcTurn is not defined. NPC ${attackerName} cannot take a turn.`, "red");
                await this.nextTurn(attacker); // Skip turn if logic is missing
            }
        }
    }

    endCombat() {
        logToConsole("Combat Ending...", 'lightblue');
        this.gameState.isInCombat = false;
        this.gameState.combatPhase = null;
        this.gameState.attackerMapPos = null;
        this.gameState.defenderMapPos = null;
        this.gameState.combatCurrentDefender = null;
        this.gameState.combatCurrentAttacker = null; // Ensure attacker is cleared
        this.gameState.isWaitingForPlayerCombatInput = false; // Ensure this flag is reset

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

        const combatUIDiv = document.getElementById('combatUIDiv');
        if (combatUIDiv) {
            logToConsole(`[CombatManager.endCombat] Found #combatUIDiv. Current classes: ${combatUIDiv.className}`, 'debug');
            combatUIDiv.classList.add('hidden');
            logToConsole(`[CombatManager.endCombat] #combatUIDiv classes after add 'hidden': ${combatUIDiv.className}`, 'debug');
            setTimeout(() => { // Use setTimeout to allow browser to repaint/reflow
                if (document.getElementById('combatUIDiv')) {
                    logToConsole(`[CombatManager.endCombat] Computed display AFTER add 'hidden' (async check): ${window.getComputedStyle(document.getElementById('combatUIDiv')).display}`, 'debug');
                }
            }, 0);
        } else {
            console.error("CombatManager: combatUIDiv not found in DOM, cannot hide it post-combat.");
            logToConsole("[CombatManager.endCombat] ERROR: #combatUIDiv not found in DOM.", "error");
        }
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

        const attackerPos = attacker?.mapPos || this.gameState.playerPos; // For sounds from attacker
        const effectImpactPos = impactTile || targetEntity?.mapPos || attackerPos; // For sounds at impact

        if (burstRadiusTiles > 0 && impactTile) {
            affectedEntities = this.getCharactersInBlastRadius(impactTile, burstRadiusTiles);
            logToConsole(`Effect "${effectString}" targets ${affectedEntities.length} entities in burst radius around (${impactTile.x},${impactTile.y}).`, 'cyan');

            if (item.id === "smoke_grenade_thrown" && !areaEffectProcessedThisCall) {
                if (window.audioManager && effectImpactPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', effectImpactPos, {}, { volume: 0.6 }); // Placeholder for gas_hiss_01.wav
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
                if (window.audioManager && effectImpactPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', effectImpactPos, {}, { volume: 0.6 }); // Placeholder for gas_hiss_01.wav
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
                // Sound already played at cloud creation
                existingEffect = entity.statusEffects["in_smoke"]; duration = 2;
                if (!existingEffect) entity.statusEffects["in_smoke"] = { id: "in_smoke", displayName: "In Smoke", duration, sourceItemId: item.id, description: "Vision obscured. Attack -2." };
                else existingEffect.duration = Math.max(existingEffect.duration, duration);
                logToConsole(`${entityName} is in smoke.`, 'grey');
            } else if (effectString === "Causes irritation, coughing, crying" && item.id === "tear_gas_grenade_thrown") {
                // Sound already played at cloud creation
                existingEffect = entity.statusEffects["irritated_tear_gas"]; duration = 3; penalty = -2;
                if (!existingEffect) entity.statusEffects["irritated_tear_gas"] = { id: "irritated_tear_gas", displayName: "Irritated (Tear Gas)", duration, sourceItemId: item.id, accuracyPenalty: penalty, description: `Eyes watering, coughing. Accuracy ${penalty}.` };
                else existingEffect.duration = Math.max(existingEffect.duration, duration);
                logToConsole(`${entityName} ${existingEffect ? 'tear gas refreshed' : 'irritated by tear gas!'}. Accuracy ${penalty}.`, 'orange');
            } else if (effectString === "Temporary Blindness and Irritation" && item.id === "pepper_spray") {
                // Sound for pepper spray activation should have happened in processAttack
                // This is for the effect *on the target*
                if (window.audioManager && entity && (entity.mapPos || entity === this.gameState)) {
                    const targetPosition = entity === this.gameState ? this.gameState.playerPos : entity.mapPos;
                    // No specific "pepper spray hit target" sound, maybe a generic affliction sound later
                }
                existingEffect = entity.statusEffects["blinded_pepper_spray"]; duration = 2; penalty = -10;
                if (!existingEffect) entity.statusEffects["blinded_pepper_spray"] = { id: "blinded_pepper_spray", displayName: "Blinded (Pepper Spray)", duration, sourceItemId: item.id, visionPenalty: penalty, description: `Eyes burning. Attack Roll ${penalty}.` };
                else existingEffect.duration = Math.max(existingEffect.duration, duration);
                logToConsole(`${entityName} ${existingEffect ? 'pepper spray blindness refreshed' : 'blinded by pepper spray!'}. Vision Penalty ${penalty}.`, 'red');
            } else if (item.id === "acid_mild_thrown" && targetEntity === entity && (effectString === "Lingering Acid Burn" || !effectString || effectString === "")) {
                if (window.audioManager && effectImpactPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', effectImpactPos, {}, { volume: 0.5 }); // Placeholder for acid_sizzle_01.wav (on impact/target)
                existingEffect = entity.statusEffects["acid_burn"]; duration = 3; damagePerTurn = rollDie(2);
                if (!existingEffect) entity.statusEffects["acid_burn"] = { id: "acid_burn", displayName: "Acid Burn", duration, sourceItemId: item.id, damagePerTurn, damageType: "Acid", description: `Corrosive acid burns, ${damagePerTurn} Acid dmg/turn.` };
                else { existingEffect.duration = Math.max(existingEffect.duration, duration); existingEffect.damagePerTurn = Math.max(existingEffect.damagePerTurn, damagePerTurn); }
                logToConsole(`${entityName} ${existingEffect ? 'acid burn refreshed/intensified' : 'suffering acid burn!'}. Dmg/turn: ${entity.statusEffects["acid_burn"].damagePerTurn}.`, 'darkgreen');
            } else if (item.id === 'taser' || item.id === 'stun_gun_melee') { // Assuming specialEffect string is "Stun" or similar
                if (window.audioManager && targetEntity && (targetEntity.mapPos || targetEntity === this.gameState)) {
                    const targetPosition = targetEntity === this.gameState ? this.gameState.playerPos : targetEntity.mapPos;
                    window.audioManager.playSoundAtLocation('ui_click_01.wav', targetPosition, {}, { volume: 0.7 }); // Placeholder for taser_hit_01.wav
                }
                // Apply stun effect logic here
            }
            if (entity === this.gameState && window.renderCharacterInfo) window.renderCharacterInfo();
            if (entity === this.gameState && window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        });

        if (item.id === "acid_mild_thrown" && effectString === "Lingering Acid Burn" && targetEntity) {
            if (!targetEntity.statusEffects) targetEntity.statusEffects = {};
            let existingAcidEffect = targetEntity.statusEffects["acid_burn"];
            const acidDuration = 3;
            const acidDmgPerTurn = Math.max(1, rollDie(2));

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
                existingAcidEffect.damagePerTurn = Math.max(existingAcidEffect.damagePerTurn, acidDmgPerTurn);
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
        const targetPosition = target === this.gameState ? this.gameState.playerPos : target.mapPos;

        if (weapon === null) { // Unarmed
            damageType = "Bludgeoning";
            const unarmedMod = getSkillModifier("Unarmed", attacker);
            damageAmount = unarmedMod <= 0 ? Math.max(0, rollDie(2) - 1) : rollDie(unarmedMod);
            damageLogSuffix = unarmedMod <= 0 ? `(1d2-1, Mod: ${unarmedMod})` : `(1d${unarmedMod}, Mod: ${unarmedMod})`;
            if (window.audioManager && targetPosition) {
                window.audioManager.playUnarmedHitSound({ sourcePosition: targetPosition }); // Uses existing random unarmed hit
            }
        } else { // Armed Melee
            damageType = weapon.damageType || "Physical";
            damageAmount = rollDiceNotation(parseDiceNotation(weapon.damage));
            damageLogSuffix = `(${weapon.damage})`;
            if (window.audioManager && targetPosition) {
                let hitSoundName = 'melee_unarmed_hit_01.wav'; // Default placeholder
                if (weapon.type.includes("blade")) {
                    // TODO: Differentiate between flesh and armor hit when armor system is more detailed
                    hitSoundName = 'ui_click_01.wav'; // Placeholder for melee_blade_hit_flesh_01.wav or melee_blade_hit_armor_01.wav
                } else if (weapon.type.includes("blunt")) {
                    hitSoundName = 'ui_click_01.wav'; // Placeholder for melee_blunt_hit_flesh_01.wav or melee_blunt_hit_armor_01.wav
                } else if (weapon.id === 'chain_saw_melee') {
                    hitSoundName = 'ui_error_01.wav'; // Placeholder for chainsaw hit (distinct from attack sound)
                }
                window.audioManager.playSoundAtLocation(hitSoundName, targetPosition, {}, { volume: 0.8 });
            }
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Raw Damage: ${damageAmount} ${damageType} ${damageLogSuffix}`;
        this.applyDamage(attacker, target, targetBodyPartForDamage, damageAmount, damageType, weapon);
    }

    calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPartForDamage, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess || !target) { if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)'; return; }
        const damageType = weapon.damageType || "Ballistic";
        let totalDamageThisVolley = 0;
        logToConsole(`HITS: ${attacker === this.gameState ? "Player" : attacker.name}'s ${weapon.name} strikes ${numHits} time(s)! (Base Damage: ${weapon.damage})`, attacker === this.gameState ? 'lightgreen' : (numHits > 1 ? 'orangered' : 'orange'));

        const targetPosition = target === this.gameState ? this.gameState.playerPos : target.mapPos;

        for (let i = 0; i < numHits; i++) {
            const damageAmountThisBullet = rollDiceNotation(parseDiceNotation(weapon.damage));
            totalDamageThisVolley += damageAmountThisBullet;
            if (window.audioManager && targetPosition) {
                let hitSound = 'ui_click_01.wav'; // Placeholder for bullet_hit_flesh_01.wav
                if (weapon.type.includes("bow") || weapon.type.includes("crossbow")) {
                    hitSound = 'ui_click_01.wav'; // Placeholder for arrow_hit_01.wav
                }
                // TODO: Add bullet_hit_concrete/metal/wood/dirt based on target tile properties if not flesh
                window.audioManager.playSoundAtLocation(hitSound, targetPosition, {}, { volume: 0.7 });
            }
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
            if (window.audioManager && (attacker.mapPos || attacker === this.gameState)) {
                const reloadSoundPos = attacker === this.gameState ? this.gameState.playerPos : attacker.mapPos;
                let reloadSound = 'ui_click_01.wav'; // Generic placeholder
                if (weapon?.type?.includes("pistol")) reloadSound = 'ui_click_01.wav'; // Placeholder for reload_pistol_01.wav
                else if (weapon?.type?.includes("rifle")) reloadSound = 'ui_click_01.wav'; // Placeholder for reload_rifle_01.wav
                else if (weapon?.type?.includes("shotgun")) reloadSound = 'ui_click_01.wav'; // Placeholder for reload_shotgun_01.wav
                // TODO: Consider reload_mag_insert_01.wav as part of these, or if it's separate.
                window.audioManager.playSoundAtLocation(reloadSound, reloadSoundPos, {}, { volume: 0.6 });
            }
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

        const attackerPos = attacker.mapPos || this.gameState.playerPos; // Common attacker position

        if (attackType === 'melee' && defender) {
            if (window.audioManager && attackerPos) {
                if (!weapon) {
                    window.audioManager.playSoundAtLocation('melee_unarmed_swing_01.wav', attackerPos);
                } else {
                    let swingSound = 'melee_armed_swing_01.wav'; // Default armed swing
                    if (weapon.id === 'chain_saw_melee') swingSound = 'ui_error_01.wav'; // Placeholder for chainsaw_attack_01.wav
                    else if (weapon.id === 'whip') swingSound = 'ui_click_01.wav'; // Placeholder for whip_crack_01.wav
                    window.audioManager.playSoundAtLocation(swingSound, attackerPos);
                }
            }
            if (window.animationManager) {
                if (weapon?.id === 'chain_saw_melee') window.animationManager.playAnimation('chainsawAttack', { attacker, defender, duration: 800, frameDuration: 40 });
                else if (weapon?.id === 'whip') window.animationManager.playAnimation('whipCrack', { attacker, defender, duration: 700 });
                else window.animationManager.playAnimation('meleeSwing', { attacker, x: attackerPos.x, y: attackerPos.y, originalSprite: (attacker === this.gameState ? '☻' : (attacker.sprite || '?')), originalColor: (attacker === this.gameState ? 'green' : (attacker.color || 'white')), duration: 600 });
            }
        } else if (weapon?.type?.includes("thrown") && weapon.type !== "weapon_utility_spray") {
            if (window.audioManager && attackerPos) {
                window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.6 }); // Placeholder for throw_item_01.wav
                if (weapon.type === "weapon_thrown_explosive" && weapon.tags?.includes("grenade")) {
                    window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.4 }); // Placeholder for grenade_pin_01.wav (played by attacker)
                }
            }
            if (window.animationManager) {
                let targetPos = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos;
                if (attackerPos && targetPos) window.animationManager.playAnimation('throwing', { startPos: attackerPos, endPos: targetPos, sprite: (weapon.sprite || 'o'), color: (weapon.color || 'cyan'), duration: 600, attacker, defender });
            }
        } else if (attackType === 'ranged' && weapon && !weapon.type?.includes("thrown") && weapon.type !== "weapon_utility_spray" && !weapon.tags?.includes("launcher_treated_as_rifle")) {
            if (window.audioManager && attackerPos) {
                let fireSoundName = 'ui_click_01.wav'; // Default placeholder for weapon_empty_click_01.wav if ammo is out (needs ammo check)
                // Assuming ammo check happens before this, otherwise need to handle empty click
                if (weapon.type.includes("pistol")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_pistol_01.wav
                else if (weapon.type.includes("submachine_gun")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_smg_01.wav
                else if (weapon.type.includes("rifle") && !weapon.tags?.includes("assault_rifle") && !weapon.tags?.includes("machine_gun")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_rifle_01.wav
                else if (weapon.tags?.includes("assault_rifle")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_ar_loop.wav (needs loop management)
                else if (weapon.type.includes("shotgun")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_shotgun_01.wav
                else if (weapon.tags?.includes("machine_gun")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_mg_loop.wav (needs loop management)
                else if (weapon.type.includes("bow")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_bow_01.wav
                else if (weapon.type.includes("crossbow")) fireSoundName = 'ui_click_01.wav'; // Placeholder for fire_crossbow_01.wav
                window.audioManager.playSoundAtLocation(fireSoundName, attackerPos, {}, { volume: 0.9 });
            }
            if (window.animationManager) {
                const defenderPos = defender?.mapPos || this.gameState.defenderMapPos;
                if (attackerPos && defenderPos) {
                    window.animationManager.playAnimation('rangedBullet', { startPos: attackerPos, endPos: defenderPos, sprite: weapon.projectileSprite || '*', color: weapon.projectileColor || 'yellow', duration: 400, attacker, defender });
                    // Placeholder for bullet_whiz_01.wav - could play from a point along the bullet path or near defender if it's a near miss
                    if (window.audioManager) window.audioManager.playSoundAtLocation('ui_click_01.wav', defenderPos, {}, { volume: 0.3, maxDistance: 15 }); // Placeholder for whiz near target
                }
            }
        } else if (weapon?.tags?.includes("launcher_treated_as_rifle") && weapon.explodesOnImpact) { // Launchers (rocket, grenade launcher)
            if (window.audioManager && attackerPos) {
                let launchSound = 'ui_error_01.wav'; // Generic loud placeholder
                if (weapon.ammoType?.includes("rocket")) launchSound = 'ui_error_01.wav'; // Placeholder for fire_rocket_01.wav
                else launchSound = 'ui_error_01.wav'; // Placeholder for fire_launcher_01.wav (for grenades)
                window.audioManager.playSoundAtLocation(launchSound, attackerPos, {}, { volume: 1.0 });
            }
            // Animation for projectile is handled later in processAttack before explosion
        } else if (weapon?.id === 'flamethrower') {
            if (window.audioManager && attackerPos) {
                window.audioManager.playSoundAtLocation('ui_error_01.wav', attackerPos, {}, { volume: 0.7, loop: false }); // Placeholder for flame_start_01.wav
                // TODO: Manage flame_loop.wav (start/stop based on duration or continuous fire).
                // TODO: Play flame_end_01.wav when stopping.
            }
            if (window.animationManager) {
                const targetPos = this.gameState.defenderMapPos || defender?.mapPos || this.gameState.pendingCombatAction?.targetTile;
                if (attackerPos && targetPos) window.animationManager.playAnimation('flamethrower', { attacker, targetPos, duration: 1500, particleSpawnRate: 10, particleLifetime: 500, coneAngle: Math.PI / 6, maxRange: 6 });
            }
        } else if (weapon && (weapon.id === 'taser' || weapon.id === 'stun_gun_melee') && defender) {
            if (window.audioManager && attackerPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.7 }); // Placeholder for taser_fire_01.wav
            // Hit sound (taser_hit_01.wav) is in applySpecialEffect.
            if (window.animationManager) window.animationManager.playAnimation('taser', { attacker, defender, duration: 500, isMelee: weapon.id === 'stun_gun_melee' });
        } else if (weapon && weapon.id === 'pepper_spray' && (this.gameState.defenderMapPos || defender?.mapPos)) {
            const sprayOrigin = attackerPos;
            const sprayTargetPos = this.gameState.defenderMapPos || defender?.mapPos;
            if (window.audioManager && sprayOrigin) window.audioManager.playSoundAtLocation('ui_click_01.wav', sprayOrigin, {}, { volume: 0.5 }); // Placeholder for pepper_spray_01.wav
            if (window.animationManager) {
                let cloudParams = { attacker, duration: 5000, activeSpawningDuration: 1000, particleSpriteOptions: ['░', '▒', '▓'], particleLifetime: 4000, expansionSpeed: 0.03, spawnRate: 15 };
                cloudParams.centerPos = sprayOrigin;
                cloudParams.coneDirection = sprayTargetPos ? { ...sprayTargetPos } : { x: sprayOrigin.x + 1, y: sprayOrigin.y, z: sprayOrigin.z };
                cloudParams.maxRadius = 1.5; cloudParams.duration = 1500; cloudParams.activeSpawningDuration = 500;
                cloudParams.particleLifetime = 1000; cloudParams.particleColor = 'orange';
                cloudParams.particleSpriteOptions = ['*', '⁂', '※']; cloudParams.coneAngle = Math.PI / 6; cloudParams.spawnRate = 20;
                window.animationManager.playAnimation('gasCloud', cloudParams); // Using gasCloud, needs specific pepper spray anim if different
            }
        } else if (weapon?.id === 'acid_mild_thrown' && window.animationManager) {
            // Throw sound was played earlier. This is for visual splash. Sizzle sound in applySpecialEffect.
            const impactPos = defender?.mapPos || this.gameState.pendingCombatAction?.targetTile;
            if (impactPos) window.animationManager.playAnimation('liquidSplash', { impactPos, duration: 800, splashSprites: ['∴', '※', '*', '.'], sizzleSprites: ['.', '◦', '.'], color: 'limegreen' });
        }


        if (actionType === "attack" && attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining <= 0) { this.promptPlayerAttackDeclaration(); return; }
            this.gameState.actionPointsRemaining--; window.turnManager.updateTurnUI();
        } else if (actionType === "grapple") {
            // Grapple attempt sound (melee_grapple_attempt_01.wav)
            if (window.audioManager && attackerPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.6 }); // Placeholder
            this.nextTurn(attacker); return;
        }


        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const defenderName = defender ? ((defender === this.gameState) ? "Player" : defender.name) : "Tile";
        let attackResult, defenseResult;

        // --- Line of Sight Checks ---
        const currentTilesetsForLOS = window.assetManager ? window.assetManager.tilesets : null; // Corrected: window.assetManager
        const currentMapDataForLOS = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

        if (!currentTilesetsForLOS || !currentMapDataForLOS || !currentMapDataForLOS.levels) { // Added check for .levels
            logToConsole(`LOS CHECK ERROR (CombatManager): Crucial data missing. Tilesets: ${!!currentTilesetsForLOS}, MapData: ${!!currentMapDataForLOS}, MapData.levels: ${currentMapDataForLOS ? !!currentMapDataForLOS.levels : 'N/A'}.`, "red");
            if (attacker === this.gameState) { // Player's turn
                // Refund AP potentially, or just allow re-declaration
                this.gameState.actionPointsRemaining++; // Simplistic AP refund, needs robust handling if AP cost varies
                window.turnManager.updateTurnUI();
                this.promptPlayerAttackDeclaration();
            } else { // NPC's turn
                this.nextTurn(attacker);
            }
            return; // Stop processing this attack
        }

        if (attackType === 'ranged') { // Centralized LOS check for all ranged attacks
            const attackerActualPos = attacker.mapPos || this.gameState.playerPos;
            let targetActualPos = null;
            if (defender && defender.mapPos) {
                targetActualPos = defender.mapPos;
            } else if (this.gameState.pendingCombatAction?.targetTile) {
                targetActualPos = this.gameState.pendingCombatAction.targetTile;
            } else if (this.gameState.defenderMapPos) {
                targetActualPos = this.gameState.defenderMapPos;
            }

            if (attackerActualPos && targetActualPos) {
                logToConsole(`[CombatManager перед LOS Ranged] Tilesets: ${!!currentTilesetsForLOS} (Keys: ${currentTilesetsForLOS ? Object.keys(currentTilesetsForLOS).length : 'N/A'}), MapData: ${!!currentMapDataForLOS}, Levels: ${currentMapDataForLOS ? !!currentMapDataForLOS.levels : 'N/A'}`, 'purple');
                if (!window.hasLineOfSight3D(attackerActualPos, targetActualPos, currentTilesetsForLOS, currentMapDataForLOS)) {
                    const who = attacker === this.gameState ? "PLAYER" : "NPC";
                    logToConsole(`${who} RANGED ATTACK CANCELED: ${attackerName} has no Line of Sight to target at (${targetActualPos.x},${targetActualPos.y}, Z:${targetActualPos.z}).`, 'orange');
                    if (attacker === this.gameState) {
                        // AP was spent in handleConfirmedAttackDeclaration.
                        // To prevent losing AP on a bad LOS, this check should ideally be there.
                        // For now, AP is lost. Player gets to try another action if AP allows, or turn ends.
                        if (this.gameState.actionPointsRemaining > 0) {
                            this.promptPlayerAttackDeclaration();
                        } else {
                            this.nextTurn(attacker);
                        }
                    } else { // NPC
                        this.nextTurn(attacker);
                    }
                    return; // Stop processing this attack
                } else {
                    // logToConsole(`${attacker === this.gameState ? "PLAYER" : "NPC"} RANGED ATTACK: ${attackerName} confirmed Line of Sight to target.`, 'grey');
                }
            } else {
                logToConsole("RANGED LOS CHECK SKIPPED: Attacker or target position undefined.", "yellow");
                // Allow to proceed if it's an area effect not requiring a specific entity LOS, though targetTile should be set.
                // If it's a direct attack and targetActualPos is null, it will likely fail later.
            }
        }
        // End of centralized LOS check for ranged

        if (attackType === 'melee' && defender) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
            const defenderMapPos = defender.mapPos;
            if (attackerMapPos && defenderMapPos) {
                const dx = Math.abs(attackerMapPos.x - defenderMapPos.x);
                const dy = Math.abs(attackerMapPos.y - defenderMapPos.y);
                const dz = Math.abs(attackerMapPos.z - defenderMapPos.z);

                let inMeleeRange = false;
                if (dz === 0) { // Same Z-level
                    const manhattanXY = dx + dy;
                    // Allows Manhattan distance 1 (cardinal) and 2 (diagonal)
                    // Must not be the same tile (manhattanXY > 0)
                    if (manhattanXY > 0 && manhattanXY <= 2) {
                        inMeleeRange = true;
                    }
                } else if (dz === 1) { // One Z-level difference
                    // Must be directly above or below (dx=0, dy=0)
                    if (dx === 0 && dy === 0) {
                        inMeleeRange = true;
                    }
                }
                // If dz > 1, or conditions above not met, inMeleeRange remains false.

                if (!inMeleeRange) {
                    logToConsole(`MELEE FAIL: ${attackerName}'s attack on ${defenderName} fails (Out of Range - dx:${dx}, dy:${dy}, dz:${dz}).`, 'orange');
                    if (attacker === this.gameState) {
                        if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                        else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
                        else this.nextTurn(attacker);
                    } else this.nextTurn(attacker); return;
                }
            }
        }

        let coverBonus = (defender && defender.mapPos && attacker && attacker.mapPos) ? this.getDefenderCoverBonus(attacker, defender) : 0;
        if (attackType === 'ranged' && weapon) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
            const targetMapPos = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos;

            if (attackerMapPos && targetMapPos) {
                const distance = getDistance3D(attackerMapPos, targetMapPos);
                actionContext.isGrappling = attacker.statusEffects?.isGrappled && attacker.statusEffects.grappledBy === (defender === this.gameState ? 'player' : defender?.id);
                if (distance <= 1.8) actionContext.rangeModifier = (weapon.tags?.includes("requires_grapple_for_point_blank") && defender && actionContext.isGrappling) ? 15 : (weapon.tags?.includes("requires_grapple_for_point_blank") ? 0 : 15);
                else if (distance <= weapon.optimalRange || 10) actionContext.rangeModifier = 5;
                else if (distance <= weapon.effectiveRange || 30) actionContext.rangeModifier = 0;
                else if (distance <= weapon.maxRange || 60) actionContext.rangeModifier = -5;
                else actionContext.rangeModifier = -10;
                if (distance > (weapon.effectiveRange || 30)) {
                    let mod = 0;
                    if (weapon.type.includes("bow")) mod = -3;
                    else if (weapon.type.includes("shotgun")) mod = -5;
                    else if (weapon.type.includes("rifle") && !weapon.tags?.includes("sniper")) mod = 0;
                    else if (weapon.tags?.includes("sniper")) mod = 2;
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

        if (defender) {
            let defType = (defender === this.gameState ? this.gameState.playerDefenseChoice?.type : this.gameState.npcDefenseChoice) || "Dodge";
            if (defType !== "None") {
                logToConsole(`DEFENSE: ${defenderName} (${defType} - ${defenseResult.defenseSkillName}). ` +
                    `Roll: ${defenseResult.roll} (Nat: ${defenseResult.naturalRoll}, Skill: ${defenseResult.defenseSkillValue}, Cover: +${defenseResult.coverBonusApplied}, Move: +${defenseResult.movementBonusApplied || 0}, Status: ${defenseResult.statusEffectDefensePenalty || 0})`, window.getSkillColor(defenseResult.defenseSkillName?.split(" + ")[0]));
                // Play block sound if applicable
                if (defType.toLowerCase().includes("block") && window.audioManager && (defender.mapPos || defender === this.gameState)) {
                    const defenderSoundPos = defender === this.gameState ? this.gameState.playerPos : defender.mapPos;
                    let blockSound = 'ui_click_01.wav'; // Generic placeholder
                    // TODO: Differentiate melee_block_metal_01.wav vs melee_block_wood_01.wav based on weapon/shield
                    window.audioManager.playSoundAtLocation(blockSound, defenderSoundPos, {}, { volume: 0.7 });
                }
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

            // Critical Hit/Miss Sounds
            if (window.audioManager && (attackerPos || defender?.mapPos)) {
                const soundPos = attackerPos || (defender === this.gameState ? this.gameState.playerPos : defender.mapPos);
                if (attackResult.isCriticalHit) window.audioManager.playSoundAtLocation('ui_confirm_01.wav', soundPos, {}, { volume: 0.9 }); // Placeholder for combat_crit_hit_01.wav
                else if (attackResult.isCriticalMiss) window.audioManager.playSoundAtLocation('ui_error_01.wav', soundPos, {}, { volume: 0.7 }); // Placeholder for combat_crit_miss_01.wav
            }
            logToConsole(hit ? `RESULT: Hit! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.` : `RESULT: Miss! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.`, hit ? (attacker === this.gameState ? 'lightgreen' : 'orange') : (attacker === this.gameState ? 'orange' : 'lightgreen'));
        } else if (weapon?.type === "weapon_thrown_explosive" || (weapon?.type === "weapon_thrown_utility")) {
            hit = true; // For area effects, 'hit' means it lands as intended.
            logToConsole(`RESULT: ${weapon.name} lands at targeted tile.`, attacker === this.gameState ? 'lightgreen' : 'gold');
        }

        if (weapon?.specialEffect && (hit || weapon.type?.includes("utility"))) {
            this.applySpecialEffect(attacker, weapon, (defender && hit ? defender : null), this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos || attacker?.mapPos || this.gameState.playerPos);
        }

        const isThrownExplosive = weapon?.type === "weapon_thrown_explosive";
        const isImpactLauncher = weapon?.explodesOnImpact && !isThrownExplosive; // e.g. Rocket Launcher, Grenade Launcher
        const explosiveProps = (isThrownExplosive || isImpactLauncher) ? (this.assetManager.getItem(weapon.ammoType) || weapon) : null;
        let explosionProcessed = false;

        // Animation for launcher projectiles (rockets, launched grenades)
        if (isImpactLauncher && !isThrownExplosive && weapon && window.animationManager && explosiveProps?.burstRadiusFt > 0) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
            const defenderMapPos = defender?.mapPos || this.gameState.defenderMapPos; // Target of the projectile
            if (attackerMapPos && defenderMapPos) await window.animationManager.playAnimation('launcherProjectile', { startPos: attackerMapPos, endPos: defenderMapPos, sprite: weapon.projectileSprite || '►', color: weapon.projectileColor || 'orange', duration: 600, attacker, defender });
        }

        // Handle grenade bounce sound for thrown explosives before explosion
        if (isThrownExplosive && weapon.tags?.includes("grenade") && window.audioManager) {
            const impactTileForBounce = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || (attacker.mapPos || this.gameState.playerPos);
            if (impactTileForBounce) window.audioManager.playSoundAtLocation('ui_click_01.wav', impactTileForBounce, {}, { volume: 0.5 }); // Placeholder for grenade_bounce_01.wav
        }


        if (explosiveProps?.burstRadiusFt > 0) {
            let determinedImpactTile = null;
            if (isThrownExplosive) determinedImpactTile = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || (attacker.mapPos || this.gameState.playerPos);
            else if (isImpactLauncher && hit && defender?.mapPos) determinedImpactTile = defender.mapPos; // Launcher projectile hits defender
            else if (isImpactLauncher && !hit && this.gameState.defenderMapPos) determinedImpactTile = this.gameState.defenderMapPos; // Launcher projectile misses defender but hits tile

            if (determinedImpactTile) {
                explosionProcessed = true;
                const burstRadiusTiles = Math.ceil(explosiveProps.burstRadiusFt / 5);
                logToConsole(`EXPLOSION: ${explosiveProps.name} detonates. Radius: ${burstRadiusTiles}t`, 'orangered');
                if (window.audioManager) {
                    let explosionSound = 'ui_error_01.wav'; // Default loud placeholder
                    // TODO: Differentiate small vs large explosion based on explosiveProps or weapon tags
                    if (burstRadiusTiles <= 2) explosionSound = 'ui_error_01.wav'; // Placeholder for explosion_small_01.wav
                    else explosionSound = 'ui_error_01.wav'; // Placeholder for explosion_large_01.wav
                    window.audioManager.playSoundAtLocation(explosionSound, determinedImpactTile, {}, { volume: 1.0 });
                    // Placeholder for explosion_debris_01.wav
                    window.audioManager.playSoundAtLocation('ui_click_01.wav', determinedImpactTile, {}, { volume: 0.6, delay: 100 }); // Delayed debris sound
                }
                if (window.animationManager) window.animationManager.playAnimation('explosion', { centerPos: determinedImpactTile, radius: burstRadiusTiles, duration: 1000, sourceWeapon: weapon });
                this.getCharactersInBlastRadius(determinedImpactTile, burstRadiusTiles).forEach(char => {
                    let affectedByBlast = true;
                    const charNameForLog = char === this.gameState ? "Player" : (char.name || char.id);
                    if (isThrownExplosive && (char !== defender || (char === defender && !hit))) {
                        if ((rollDie(20) + getStatModifier("Dexterity", char)) >= attackResult.roll) { // Dodge roll vs original attack roll for scatter
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

        if (hit && defender && weapon?.id === 'molotov_cocktail_thrown') {
            const impactTileMolotov = defender.mapPos || this.gameState.defenderMapPos || this.gameState.pendingCombatAction?.targetTile;
            if (impactTileMolotov) {
                if (window.audioManager) {
                    window.audioManager.playSoundAtLocation('ui_error_01.wav', impactTileMolotov, {}, { volume: 0.8 }); // Placeholder for molotov_ignite_01.wav
                    // TODO: Consider playing fire_loop_med.wav if it creates a lasting fire effect. Requires loop management.
                }
                if (window.animationManager) window.animationManager.playAnimation('explosion', { centerPos: impactTileMolotov, radius: 1, explosionSprites: ['~', '≈', '*', '#'], color: 'orange', duration: 1500, sourceWeapon: weapon, attacker });
            }
        } else if (weapon?.id === 'thermite_grenade_thrown' && hit) { // Thermite
            const impactTileThermite = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || (attacker.mapPos || this.gameState.playerPos);
            if (window.audioManager && impactTileThermite) {
                // Placeholder for thermite_loop.wav (needs loop management for duration)
                window.audioManager.playSoundAtLocation('ui_error_01.wav', impactTileThermite, {}, { volume: 0.7, loop: true, duration: 5000 }); // Long loop placeholder
            }
            // TODO: Add visual effect for thermite burning
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
                        if (!(hit && defender === splashTarget)) { // Don't double-dip damage on primary target if already hit
                            logToConsole(`${splashTarget.name || "Player"} hit by acid splash!`, 'darkgreen');
                            // Acid sizzle for splash targets
                            if (window.audioManager && splashTarget.mapPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', splashTarget.mapPos, {}, { volume: 0.4 }); // Placeholder for acid_sizzle_01.wav
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
                    // Play off-hand fire sound
                    if (window.audioManager && attackerPos) {
                        let offHandFireSound = 'ui_click_01.wav'; // Placeholder
                        if (offHandWeapon.type.includes("pistol")) offHandFireSound = 'ui_click_01.wav'; // Placeholder for fire_pistol_01.wav
                        // ... other off-hand weapon types
                        window.audioManager.playSoundAtLocation(offHandFireSound, attackerPos, {}, { volume: 0.85 }); // Slightly different volume/pitch?
                    }

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
                        const offHandDefRes = this.calculateDefenseRoll(defender, "None", offHandWeapon, this.getDefenderCoverBonus(attacker, defender), {}); // Pass attacker for 3D cover
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
        this.processAttack(); // This will handle the reload sound via actionType "Reload"
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
        // Grapple attempt sound is played at the start of processAttack if actionType is "grapple"
        // For player, this means it's played when processGrapple calls processAttack or similar logic flow.
        // For NPC, it would be when their AI decides to grapple.
        // For now, let's ensure it's in processGrapple itself.
        this.processGrapple();
    }

    processGrapple() {
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;
        if (!attacker || !defender) { logToConsole("Error: Attacker or Defender missing for grapple.", 'red'); this.nextTurn(attacker); return; }

        const attackerPos = attacker.mapPos || this.gameState.playerPos;
        if (window.audioManager && attackerPos) {
            window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.6 }); // Placeholder for melee_grapple_attempt_01.wav
        }

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
            if (window.audioManager && attackerPos) window.audioManager.playSoundAtLocation('ui_confirm_01.wav', attackerPos, {}, { volume: 0.7 }); // Placeholder for melee_grapple_success_01.wav
            if (window.animationManager) window.animationManager.playAnimation('grapple', { attacker, defender, duration: 800 });
        } else {
            logToConsole("RESULT: Grapple Failed!", 'orange');
            if (window.audioManager && attackerPos) window.audioManager.playSoundAtLocation('ui_error_01.wav', attackerPos, {}, { volume: 0.6 }); // Placeholder for melee_grapple_fail_01.wav
        }


        if (attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
            else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
            else this.nextTurn(this.gameState);
        } else this.nextTurn(attacker);
    }

    getDefenderCoverBonus(attacker, defender) {
        if (!attacker || !attacker.mapPos || !defender || !defender.mapPos) return 0;

        const losLine = getLine3D(attacker.mapPos.x, attacker.mapPos.y, attacker.mapPos.z,
            defender.mapPos.x, defender.mapPos.y, defender.mapPos.z);
        if (!losLine || losLine.length < 2) return 0;

        let maxCoverBonus = 0;
        for (let i = 1; i < losLine.length - 1; i++) {
            const point = losLine[i];
            const tileDef = this._getTileProperties(window.mapRenderer.getCollisionTileAt(point.x, point.y, point.z));
            if (tileDef && tileDef.coverBonus) {
                maxCoverBonus = Math.max(maxCoverBonus, parseInt(tileDef.coverBonus, 10) || 0);
            }
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


    getCharactersInBlastRadius(impactTile, burstRadiusTiles) {
        const affected = [];
        const { x: impX, y: impY, z: impZ } = impactTile;

        const checkEntity = (entity, entityPos) => {
            if (!entity || !entityPos || entityPos.x === undefined || entityPos.y === undefined || entityPos.z === undefined) return;
            const distance = getDistance3D(impactTile, entityPos);
            if (distance <= burstRadiusTiles && entity.health?.torso?.current > 0 && entity.health?.head?.current > 0) {
                affected.push(entity);
            }
        };
        checkEntity(this.gameState, this.gameState.playerPos);
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
        const soundPosition = isPlayerVictim ? this.gameState.playerPos : entity.mapPos;


        if (reducedDamage > 0 && window.audioManager && soundPosition) {
            if (isPlayerVictim) {
                if (reducedDamage >= 4 || reducedDamage >= part.max * 0.4) {
                    window.audioManager.playSoundAtLocation('ui_error_01.wav', soundPosition, {}, { volume: 0.8 }); // Placeholder for player_hurt_heavy_01.wav
                } else {
                    window.audioManager.playSoundAtLocation('ui_error_01.wav', soundPosition, {}, { volume: 0.5 }); // Placeholder for player_hurt_light_01.wav
                }
            } else { // NPC victim
                if (reducedDamage >= 4 || reducedDamage >= part.max * 0.4) {
                    window.audioManager.playSoundAtLocation('ui_error_01.wav', soundPosition, {}, { volume: 0.7 }); // Placeholder for npc_hurt_heavy_01.wav
                } else {
                    window.audioManager.playSoundAtLocation('ui_error_01.wav', soundPosition, {}, { volume: 0.4 }); // Placeholder for npc_hurt_light_01.wav
                }
            }
        }


        logToConsole(`DAMAGE${bulletNum > 0 ? ` (Bullet ${bulletNum}/${totalBullets})` : ''}: ${(attacker === this.gameState ? "Player" : attacker.name)}'s ${weapon ? weapon.name : "Unarmed"} deals ${reducedDamage} ${damageType} to ${entityName}'s ${bodyPartName} (Raw: ${damageAmount}, Armor: ${effectiveArmor}).`, (attacker === this.gameState && !isPlayerVictim) ? 'orange' : 'indianred');
        part.current = Math.max(0, part.current - reducedDamage);
        logToConsole(`INFO: ${entityName} ${accessKey} HP: ${part.current}/${part.max}.`, isPlayerVictim ? 'lightblue' : 'gold');
        this.shareAggroWithTeam(entity, attacker, damageAmount);

        if (part.current === 0) {
            const fmtPartName = window.formatBodyPartName ? window.formatBodyPartName(accessKey) : accessKey.toUpperCase();
            if (part.inCrisis) {
                logToConsole(`FATAL HIT: ${entityName}'s already crippled ${fmtPartName} was struck again! Character has died.`, 'darkred');
                if (window.audioManager && soundPosition) {
                    const deathSound = isPlayerVictim ? 'ui_error_01.wav' : 'ui_error_01.wav'; // Placeholder for player_death_01.wav or npc_death_01.wav
                    const deathVolume = isPlayerVictim ? 1.0 : 0.8;
                    window.audioManager.playSoundAtLocation(deathSound, soundPosition, {}, { volume: deathVolume });
                }
                window.gameOver(entity); // gameOver handles player vs NPC death differentiation internally for display
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
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Placeholder for ui_target_mode_01.wav
        this.promptPlayerAttackDeclaration();
        this.updateCombatUI();
    }

    _getTileProperties(tileId) { return tileId && this.assetManager.tilesets ? this.assetManager.tilesets[tileId] : null; }

    async executeNpcCombatTurn(npc) {
        const npcName = npc.name || npc.id || "NPC";
        if (!npc || npc.health?.torso?.current <= 0 || npc.health?.head?.current <= 0) {
            logToConsole(`INFO: ${npcName} incapacitated. Skipping turn.`, 'orange');
            await this.nextTurn(npc);
            return;
        }
        if (!npc.memory) {
            npc.memory = { lastSeenTargetPos: null, lastSeenTargetTimestamp: 0, recentlyVisitedTiles: [], explorationTarget: null, lastKnownSafePos: { ...(npc.mapPos || { x: 0, y: 0, z: 0 }) } };
        }
        if (!npc.aggroList) npc.aggroList = [];

        const attackInitiated = await window.handleNpcCombatTurn(npc, this.gameState, this, this.assetManager);

        if (attackInitiated) {
            this.gameState.combatPhase = 'defenderDeclare';
            this.handleDefenderActionPrompt();
        } else {
            logToConsole(`CombatManager: NPC ${npcName} did not initiate an attack via handleNpcCombatTurn. Ending turn.`, 'grey');
            await this.nextTurn(npc);
        }
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
}
window.CombatManager = CombatManager;