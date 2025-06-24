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
                this.gameState.defenderMapPos = this.gameState.selectedTargetEntity.mapPos ? { ...this.gameState.selectedTargetEntity.mapPos } : null;
                logToConsole(`Target acquired via targeting system: ${this.gameState.selectedTargetEntity.name || this.gameState.selectedTargetEntity.id}`, 'lightblue');
            } else {
                this.gameState.defenderMapPos = { ...this.gameState.targetingCoords };
                logToConsole(`Targeting system selected tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}.`, 'lightblue');
            }
            this.gameState.targetConfirmed = false;
        } else if (!this.gameState.combatCurrentDefender && this.gameState.isInCombat) {
            const liveNpcs = this.initiativeTracker.filter(e => !e.isPlayer && e.entity.health?.torso?.current > 0 && e.entity.health?.head?.current > 0);
            if (liveNpcs.length > 0) {
                this.gameState.combatCurrentDefender = liveNpcs[0].entity;
                this.gameState.defenderMapPos = liveNpcs[0].entity.mapPos ? { ...liveNpcs[0].entity.mapPos } : null;
                logToConsole(`Auto-targeting ${this.gameState.combatCurrentDefender.name}.`, 'lightblue');
            } else { logToConsole("No valid NPC targets. Combat may end.", 'orange'); this.endCombat(); return; }
        }

        if (defenderDisplay) {
            if (this.gameState.combatCurrentDefender) defenderDisplay.textContent = `Defender: ${this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id}`;
            else if (this.gameState.defenderMapPos) defenderDisplay.textContent = `Defender: Tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}`;
            else defenderDisplay.textContent = "Defender: None (Click on map to target)";
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
        if (window.animationManager) while (window.animationManager.isAnimationPlaying()) await new Promise(r => setTimeout(r, 50));
        if (this.gameState.isWaitingForPlayerCombatInput) { logToConsole("INFO: nextTurn() deferred.", 'grey'); return; }
        if (!this.gameState.isInCombat || this.initiativeTracker.length === 0) { this.endCombat(); return; }
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initiativeTracker.length;
        if (this.currentTurnIndex === 0 && previousAttackerEntity) logToConsole("New combat round started.", 'lightblue');

        const currentEntry = this.initiativeTracker[this.currentTurnIndex];
        if (!currentEntry?.entity) { logToConsole("Error: Invalid turn entry. Ending combat.", 'red'); this.endCombat(); return; }
        this.gameState.combatCurrentAttacker = currentEntry.entity;
        const attacker = currentEntry.entity;
        const attackerName = currentEntry.isPlayer ? (document.getElementById('charName')?.value || "Player") : (attacker.name || attacker.id || "Unknown");
        this.gameState.attackerMapPos = currentEntry.isPlayer ? { ...this.gameState.playerPos } : (attacker.mapPos ? { ...attacker.mapPos } : null);
        logToConsole(`--- ${attackerName}'s Turn ---`, 'lightblue');

        if (attacker?.statusEffects) {
            logToConsole(`--- Processing status effects for ${attackerName} ---`, 'teal');
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
            if (this.gameState.playerForcedEndTurnWithZeroAP) { this.gameState.playerForcedEndTurnWithZeroAP = false; this.nextTurn(currentEntry.entity); return; }
            this.gameState.playerMovedThisTurn = false; this.gameState.actionPointsRemaining = 1; this.gameState.movementPointsRemaining = 6;
            window.turnManager.updateTurnUI();
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
        } else {
            attacker.movedThisTurn = false; attacker.currentActionPoints = attacker.defaultActionPoints || 1; attacker.currentMovementPoints = attacker.defaultMovementPoints || 0;
            this.gameState.combatCurrentDefender = this.gameState;
            this.gameState.defenderMapPos = this.gameState.playerPos ? { ...this.gameState.playerPos } : null;
        }
        this.updateCombatUI(); window.mapRenderer.scheduleRender();
        if (currentEntry.isPlayer) this.promptPlayerAttackDeclaration();
        else { this.gameState.combatPhase = 'attackerDeclare'; await this.executeNpcCombatTurn(attacker); }
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
                this.gameState.pendingCombatAction.targetTile = { ...this.gameState.combatCurrentDefender.mapPos };
            } else if (this.gameState.defenderMapPos) { // A tile was targeted (defenderMapPos is set from targeting system)
                this.gameState.pendingCombatAction.targetTile = { ...this.gameState.defenderMapPos };
            }
            else {
                logToConsole("ERROR: Target tile for thrown item not determined (no defender with pos and no tile target).", 'red');
                this.promptPlayerAttackDeclaration(); return;
            }
            logToConsole(`Throwing ${weaponObj.name} (Skill: ${skill}) at/towards tile (${this.gameState.pendingCombatAction.targetTile.x},${this.gameState.pendingCombatAction.targetTile.y}).`, 'lightgreen');
        } else { // Not a thrown item, check for dual wield if applicable
            const pHand = this.gameState.inventory.handSlots[0], oHand = this.gameState.inventory.handSlots[1];
            this.gameState.dualWieldPending = pHand?.type.includes("firearm") && oHand?.type.includes("firearm") && weaponObj?.id === pHand.id;
            if (this.gameState.dualWieldPending) logToConsole("Dual wield attack initiated.", 'lightgreen');
        }
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'defenderDeclare'; this.handleDefenderActionPrompt();
    }

    handleConfirmedDefenseDeclaration() {
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

        if (attackType === 'melee' && defender) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
            const defenderMapPos = defender.mapPos || this.gameState.playerPos;
            if (attackerMapPos && defenderMapPos && (Math.abs(attackerMapPos.x - defenderMapPos.x) + Math.abs(attackerMapPos.y - defenderMapPos.y) > 1)) {
                logToConsole(`MELEE FAIL: ${attackerName}'s attack on ${defenderName} fails (Out of Range).`, 'orange');
                if (attacker === this.gameState) {
                    if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                    else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
                    else this.nextTurn(attacker);
                } else this.nextTurn(attacker); return;
            }
        }
        let coverBonus = (defender && defender.mapPos) ? this.getDefenderCoverBonus(defender) : 0;
        if (attackType === 'ranged' && weapon) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
            const targetMapPos = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos;
            if (attackerMapPos && targetMapPos) {
                const distance = Math.sqrt(Math.pow(targetMapPos.x - attackerMapPos.x, 2) + Math.pow(targetMapPos.y - attackerMapPos.y, 2));
                actionContext.isGrappling = attacker.statusEffects?.isGrappled && attacker.statusEffects.grappledBy === (defender === this.gameState ? 'player' : defender?.id);
                if (distance <= 1) actionContext.rangeModifier = (weapon.tags?.includes("requires_grapple_for_point_blank") && defender && actionContext.isGrappling) ? 15 : (weapon.tags?.includes("requires_grapple_for_point_blank") ? 0 : 15);
                else if (distance <= 3) actionContext.rangeModifier = 5; else if (distance <= 6) actionContext.rangeModifier = 0;
                else if (distance <= 20) actionContext.rangeModifier = -5; else if (distance <= 60) actionContext.rangeModifier = -10;
                else actionContext.rangeModifier = -15;
                if (distance > 6) {
                    let mod = 0;
                    if (weapon.type.includes("bow")) mod = -3; else if (weapon.type.includes("shotgun")) mod = -2;
                    else if (weapon.type.includes("rifle") && !weapon.tags?.includes("sniper")) mod = 2; else if (weapon.tags?.includes("sniper")) mod = 5;
                    actionContext.rangeModifier += mod;
                }
                logToConsole(`Ranged attack: Dist=${distance.toFixed(1)}, RangeMod=${actionContext.rangeModifier}`, 'grey');
            }
            if (weapon.type.includes("firearm")) {
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
        this.gameState.isWaitingForPlayerCombatInput = false;
        if (this.gameState.isInCombat && this.gameState.combatCurrentAttacker === this.gameState) {
            logToConsole("Player manually ends turn.", 'lightblue');
            this.gameState.playerForcedEndTurnWithZeroAP = this.gameState.actionPointsRemaining === 0;
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
        if (defender?.mapPos && this.gameState.layers && this.assetManager?.getTileset()) {
            const { x, y } = defender.mapPos;
            ['building', 'object', 'landscape'].forEach(layerName => {
                const tileId = this.gameState.layers[layerName]?.[y]?.[x];
                if (tileId) {
                    const tileDef = this.assetManager.getTileset()[tileId];
                    if (tileDef?.coverBonus) coverBonus = Math.max(coverBonus, parseInt(tileDef.coverBonus, 10) || 0);
                }
            });
        }
        if (coverBonus > 0) logToConsole(`${defender.name || "Defender"} gets +${coverBonus} cover bonus.`, 'grey');
        return coverBonus;
    }

    getCharactersInBlastRadius(impactTile, burstRadiusTiles) {
        const affected = [];
        const { x: impX, y: impY } = impactTile;
        const checkEntity = (entity, entityPos) => {
            if (entity && entityPos && (Math.abs(entityPos.x - impX) + Math.abs(entityPos.y - impY) <= burstRadiusTiles) && entity.health?.torso?.current > 0 && entity.health?.head?.current > 0) {
                affected.push(entity);
            }
        };
        checkEntity(this.gameState, this.gameState.playerPos);
        this.gameState.npcs.forEach(npc => checkEntity(npc, npc.mapPos));
        logToConsole(`Blast radius check at (${impX},${impY}) with ${burstRadiusTiles}t radius found ${affected.length} characters.`, 'grey');
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
    _isTilePassable(x, y) {
        if (!this.gameState.layers || x < 0 || y < 0 || !this.gameState.layers.landscape || y >= this.gameState.layers.landscape.length || x >= this.gameState.layers.landscape[0].length) return false;
        for (const layerName of ['building', 'item']) {
            const tileId = this.gameState.layers[layerName]?.[y]?.[x];
            if (tileId && this._getTileProperties(tileId)?.tags?.includes("impassable")) return false;
        }
        return true;
    }
    _isTileOccupiedByOtherNpc(x, y, currentNpcId) { return this.gameState.npcs.some(npc => npc.id !== currentNpcId && npc.mapPos?.x === x && npc.mapPos?.y === y && npc.health?.torso?.current > 0); }
    _isTilePassableAndUnoccupiedForNpc(x, y, npcId) { return this._isTilePassable(x, y) && !this._isTileOccupiedByOtherNpc(x, y, npcId); }

    async moveNpcTowardsTarget(npc, targetPos) {
        if (!npc.mapPos || npc.currentMovementPoints <= 0) return false;
        const originalPos = { ...npc.mapPos };
        const dx = targetPos.x - npc.mapPos.x, dy = targetPos.y - npc.mapPos.y;
        let moved = false, newPos = { ...originalPos };
        const tryMove = (nx, ny) => { if (this._isTilePassableAndUnoccupiedForNpc(nx, ny, npc.id)) { newPos = { x: nx, y: ny }; return true; } return false; };
        if (Math.abs(dx) > Math.abs(dy)) { if (dx !== 0) moved = tryMove(npc.mapPos.x + Math.sign(dx), npc.mapPos.y); if (!moved && dy !== 0) moved = tryMove(npc.mapPos.x, npc.mapPos.y + Math.sign(dy)); }
        else { if (dy !== 0) moved = tryMove(npc.mapPos.x, npc.mapPos.y + Math.sign(dy)); if (!moved && dx !== 0) moved = tryMove(npc.mapPos.x + Math.sign(dx), npc.mapPos.y); }
        if (moved) {
            if (window.animationManager) await window.animationManager.playAnimation('movement', { entity: npc, startPos: originalPos, endPos: newPos, sprite: npc.sprite, color: npc.color, duration: 300 });
            npc.mapPos.x = newPos.x; npc.mapPos.y = newPos.y; npc.currentMovementPoints--; npc.movedThisTurn = true;
            logToConsole(`ACTION: ${npc.name || npc.id} moves to (${npc.mapPos.x},${npc.mapPos.y}). MP Left: ${npc.currentMovementPoints}`, 'gold');
            this.gameState.attackerMapPos = { ...npc.mapPos }; window.mapRenderer.scheduleRender();
        }
        return moved;
    }

    _npcSelectTarget(npc) {
        const npcName = npc.name || npc.id || "NPC";
        this.gameState.combatCurrentDefender = null; this.gameState.defenderMapPos = null;
        if (npc.aggroList?.length > 0) {
            for (const aggroEntry of npc.aggroList) {
                const target = aggroEntry.entityRef;
                if (target && target !== npc && target.health?.torso?.current > 0 && target.health?.head?.current > 0 && target.teamId !== npc.teamId && (target.mapPos || target === this.gameState) && this.initiativeTracker.find(e => e.entity === target)) {
                    this.gameState.combatCurrentDefender = target; this.gameState.defenderMapPos = target === this.gameState ? { ...this.gameState.playerPos } : { ...target.mapPos };
                    logToConsole(`NPC TARGETING: ${npcName} selected ${target === this.gameState ? "Player" : (target.name || target.id)} from aggro (Threat: ${aggroEntry.threat}).`, 'gold'); return true;
                }
            }
        }
        let closestTarget = null, minDistance = Infinity;
        this.initiativeTracker.forEach(entry => {
            const candidate = entry.entity;
            if (candidate !== npc && candidate.health?.torso?.current > 0 && candidate.health?.head?.current > 0 && candidate.teamId !== npc.teamId && npc.mapPos && (candidate.mapPos || candidate === this.gameState)) {
                const candPos = candidate === this.gameState ? this.gameState.playerPos : candidate.mapPos;
                if (candPos) {
                    const dist = Math.abs(npc.mapPos.x - candPos.x) + Math.abs(npc.mapPos.y - candPos.y);
                    if (dist < minDistance) { minDistance = dist; closestTarget = candidate; }
                }
            }
        });
        if (closestTarget) {
            this.gameState.combatCurrentDefender = closestTarget; this.gameState.defenderMapPos = closestTarget === this.gameState ? { ...this.gameState.playerPos } : { ...closestTarget.mapPos };
            logToConsole(`NPC TARGETING: ${npcName} selected nearest enemy: ${closestTarget === this.gameState ? "Player" : (closestTarget.name || closestTarget.id)}.`, 'gold'); return true;
        }
        logToConsole(`NPC TARGETING: ${npcName} found no valid targets.`, 'orange');
        return false;
    }

    async executeNpcCombatTurn(npc) {
        const npcName = npc.name || npc.id || "NPC";
        if (!npc || npc.health?.torso?.current <= 0 || npc.health?.head?.current <= 0) { logToConsole(`INFO: ${npcName} incapacitated. Skipping turn.`, 'orange'); await this.nextTurn(npc); return; }
        if (!npc.aggroList) npc.aggroList = [];
        logToConsole(`NPC TURN: ${npcName} (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints})`, 'gold');
        if (!this._npcSelectTarget(npc)) { logToConsole(`NPC ACTION: ${npcName} no target. Ending turn.`, 'orange'); await this.nextTurn(npc); return; }

        let turnEnded = !this.gameState.combatCurrentDefender;
        for (let iter = 0; !turnEnded && (npc.currentActionPoints > 0 || npc.currentMovementPoints > 0) && iter < 10; iter++) {
            let currentTarget = this.gameState.combatCurrentDefender, currentTargetPos = this.gameState.defenderMapPos;
            if (!currentTarget || currentTarget.health?.torso?.current <= 0 || currentTarget.health?.head?.current <= 0) {
                if (!this._npcSelectTarget(npc)) { turnEnded = true; break; }
                currentTarget = this.gameState.combatCurrentDefender; currentTargetPos = this.gameState.defenderMapPos;
                if (!currentTarget) { turnEnded = true; break; }
            }
            let actionTaken = false;
            let weaponToUse = npc.equippedWeaponId ? this.assetManager.getItem(npc.equippedWeaponId) : null;
            let attackType = weaponToUse ? (weaponToUse.type.includes("melee") ? "melee" : (weaponToUse.type.includes("firearm") || weaponToUse.type.includes("bow") || weaponToUse.type.includes("crossbow") || weaponToUse.type.includes("weapon_ranged_other") || weaponToUse.type.includes("thrown") ? "ranged" : "melee")) : "melee";
            const fireMode = weaponToUse?.fireModes?.includes("burst") ? "burst" : (weaponToUse?.fireModes?.[0] || "single");
            const distanceToTarget = npc.mapPos && currentTargetPos ? (Math.abs(npc.mapPos.x - currentTargetPos.x) + Math.abs(npc.mapPos.y - currentTargetPos.y)) : Infinity;
            const canAttack = (attackType === 'melee' && distanceToTarget <= 1) || (attackType === 'ranged');

            if (canAttack && npc.currentActionPoints > 0) {
                logToConsole(`NPC ACTION: ${npcName} attacks ${currentTarget.name || "Player"} with ${weaponToUse ? weaponToUse.name : "Unarmed"}.`, 'gold');
                this.gameState.pendingCombatAction = { target: currentTarget, weapon: weaponToUse, attackType, bodyPart: "Torso", fireMode, actionType: "attack", entity: npc, actionDescription: `${attackType} by ${npcName}` };
                npc.currentActionPoints--; actionTaken = true; this.gameState.combatPhase = 'defenderDeclare';
                this.handleDefenderActionPrompt();
                if (this.gameState.combatPhase === 'playerDefenseDeclare') return;
            } else if (distanceToTarget > 1 && attackType === 'melee' && npc.currentMovementPoints > 0) {
                if (await this.moveNpcTowardsTarget(npc, currentTargetPos)) actionTaken = true;
                else { logToConsole(`NPC ACTION: ${npcName} cannot reach target for melee.`, 'orange'); turnEnded = true; }
            } else if (npc.currentMovementPoints > 0) {
                if (await this.moveNpcTowardsTarget(npc, currentTargetPos)) actionTaken = true;
                else { logToConsole(`NPC ACTION: ${npcName} has no clear action and cannot move closer.`, 'orange'); turnEnded = true; }
            } else {
                turnEnded = true;
            }
            if (!actionTaken && !(npc.currentActionPoints > 0 && canAttack)) turnEnded = true;
            if (npc.currentActionPoints === 0 && npc.currentMovementPoints === 0) turnEnded = true;
        }
        logToConsole(`NPC TURN END: ${npcName}. AP Left: ${npc.currentActionPoints}, MP Left: ${npc.currentMovementPoints}.`, 'gold');
        await this.nextTurn(npc);
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