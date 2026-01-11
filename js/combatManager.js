class CombatManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.initiativeTracker = [];
        this.currentTurnIndex = 0;
        this.isProcessingTurn = false;
        this.defenseTypeChangeListener = null;
        this.turnsToProcess = 0;
        this.backgroundRoundResolve = null;
        this.isBackgroundSimulation = false;
    }

    updateCombatLOSLine(attackerEntity, targetEntityOrPos, weaponObj) {
        if (!this.gameState.isInCombat) {
            this.gameState.rangedAttackData = null;
            if (window.mapRenderer) window.mapRenderer.scheduleRender();
            return;
        }

        const attackerPos = (attackerEntity === this.gameState) ? this.gameState.playerPos : attackerEntity?.mapPos;
        let targetPos = null;

        if (targetEntityOrPos) {
            // Check if targetEntityOrPos is a position object {x, y, z}
            if (targetEntityOrPos.x !== undefined && targetEntityOrPos.y !== undefined && targetEntityOrPos.z !== undefined) {
                targetPos = targetEntityOrPos;
            } else if (targetEntityOrPos.mapPos) { // Else, assume it's an entity with a mapPos
                targetPos = targetEntityOrPos.mapPos;
            }
        }

        if (attackerPos && targetPos) {
            const distance = getDistance3D(attackerPos, targetPos);
            let rangeBracketText = "";
            let rangeModifierValue = 0; // This will store the actual modifier number

            if (weaponObj) {
                const optimalRange = weaponObj.optimalRange || (weaponObj.effectiveRange / 2) || 5;
                const effectiveRange = weaponObj.effectiveRange || 10;
                const maxRange = weaponObj.maxRange || (weaponObj.effectiveRange * 2) || 20;

                if (distance <= optimalRange) {
                    rangeBracketText = "Optimal";
                    rangeModifierValue = 5; // Example modifier, actual values from game rules
                } else if (distance <= effectiveRange) {
                    rangeBracketText = "Effective";
                    rangeModifierValue = 0;
                } else if (distance <= maxRange) {
                    rangeBracketText = "Max";
                    rangeModifierValue = -5;
                } else {
                    rangeBracketText = "Out of Range";
                    rangeModifierValue = -10; // Or a very large penalty
                }
                // This is a simplified version of range modifier calculation.
                // The full logic is in calculateAttackRoll. We should aim to reflect that more accurately.
                // For now, this provides a basic structure.
            }

            const modifierText = weaponObj ?
                `Range: ${distance.toFixed(1)} (${rangeBracketText}, ${rangeModifierValue > 0 ? '+' : ''}${rangeModifierValue})` :
                `Dist: ${distance.toFixed(1)}`;

            this.gameState.rangedAttackData = {
                start: { ...attackerPos },
                end: { ...targetPos },
                distance: distance.toFixed(1), // Keep raw distance for other uses
                modifierText: modifierText     // This now contains the detailed string
            };
            // logToConsole(`LOS line updated: ${modifierText}. Weapon: ${weaponObj ? weaponObj.name : 'None'}`, 'grey');
        } else {
            this.gameState.rangedAttackData = null; // Clear if no valid attacker/target
        }

        if (window.mapRenderer) {
            window.mapRenderer.scheduleRender();
        }
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
                // Display current ammo for firearms, bows, crossbows
                let displayText = item.name;
                if (item.type.includes("firearm") || item.type.includes("bow") || item.type.includes("crossbow")) {
                    displayText += ` (${item.currentAmmo !== undefined ? item.currentAmmo : 'N/A'}/${item.magazineSize !== undefined ? item.magazineSize : 'N/A'})`;
                }
                weaponOption.textContent = displayText;
                weaponOption.dataset.itemData = JSON.stringify(item); // Ensure currentAmmo is part of itemData if it's dynamic
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
        const releaseGrappleButton = document.getElementById('releaseGrappleButton');


        if (!fireModeSelect || !grappleButton || !confirmAttackButton || !bodyPartSelect || !reloadWeaponButton || !releaseGrappleButton) {
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

        const playerIsGrapplingSomeone = this.gameState.statusEffects?.isGrappling && this.gameState.statusEffects.grappledBy === 'player';

        grappleButton.classList.toggle('hidden', !(selectedOption.value === "unarmed" && !isDualWieldingFirearms && !playerIsGrapplingSomeone));
        releaseGrappleButton.classList.toggle('hidden', !playerIsGrapplingSomeone);


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

        if (this.gameState.isInCombat && this.gameState.combatCurrentAttacker) {
            this.updateCombatLOSLine(this.gameState.combatCurrentAttacker, this.gameState.combatCurrentDefender || this.gameState.defenderMapPos, weaponObject);
        }
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
        if (this.gameState.player.teamId === teamId && attacker !== this.gameState.player && damagedEntity !== this.gameState.player) {
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
                // logToConsole(`Target acquired via targeting system: ${this.gameState.selectedTargetEntity.name || this.gameState.selectedTargetEntity.id} at Z:${this.gameState.defenderMapPos?.z}`, 'lightblue');
            } else if (this.gameState.targetingCoords) { // Ensure targetingCoords exists
                this.gameState.defenderMapPos = { ...this.gameState.targetingCoords }; // targetingCoords is already 3D
                // logToConsole(`Targeting system selected tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}, Z:${this.gameState.defenderMapPos.z}.`, 'lightblue');
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

        // Populate body parts based on current defender
        this.populateTargetBodyParts(this.gameState.combatCurrentDefender);

        // Update LOS line display
        if (this.gameState.combatCurrentAttacker && (this.gameState.combatCurrentDefender || this.gameState.defenderMapPos)) {
            const selectedWeaponOption = document.getElementById('combatWeaponSelect')?.options[document.getElementById('combatWeaponSelect').selectedIndex];
            let weaponForLOS = null;
            if (selectedWeaponOption) {
                if (selectedWeaponOption.value === "unarmed") weaponForLOS = null;
                else if (selectedWeaponOption.dataset.itemData) weaponForLOS = JSON.parse(selectedWeaponOption.dataset.itemData);
                else weaponForLOS = this.assetManager.getItem(selectedWeaponOption.value);
            }
            this.updateCombatLOSLine(this.gameState.combatCurrentAttacker, this.gameState.combatCurrentDefender || this.gameState.defenderMapPos, weaponForLOS);
        } else {
            this.updateCombatLOSLine(null, null, null); // Clear line if no valid attacker/target
        }

        this.gameState.combatPhase = 'playerAttackDeclare';
        if (!this.gameState.isRetargeting) logToConsole("Declare your attack using the UI.", 'lightblue');
    }

    promptPlayerDefenseDeclaration(attackData) {
        this.updateCombatUI();
        this.gameState.isWaitingForPlayerCombatInput = true;
        logToConsole(`[promptPlayerDefenseDeclaration] Set isWaitingForPlayerCombatInput to TRUE. Phase: ${this.gameState.combatPhase}`, 'magenta');
        const defenseTypeSelect = document.getElementById('combatDefenseTypeSelect');
        const blockingLimbSelect = document.getElementById('combatBlockingLimbSelect');
        const dodgeDebtWarning = document.getElementById('dodgeDebtWarning');
        const defenseUI = document.getElementById('defenseDeclarationUI');

        if (!defenseTypeSelect || !blockingLimbSelect || !defenseUI || !dodgeDebtWarning) {
            logToConsole("Defense UI elements not found! Defaulting to Dodge.", 'red');
            this.gameState.playerDefenseChoice = { type: "Dodge", blockingLimb: null, description: "UI Error - Defaulted" };
            this.gameState.combatPhase = 'resolveRolls'; this.processAttack(); return;
        }
        document.getElementById('defenderPrompt').innerHTML = '';

        // Determine if player can dodge
        // Derived stat "Movement Speed" is in feet. 30ft = 6 tiles.
        const derivedStats = window.calculateDerivedStats ? window.calculateDerivedStats(this.gameState) : {};
        const maxSpeedFeet = derivedStats["Movement Speed"] || 30;
        const maxSpeedTiles = Math.floor(maxSpeedFeet / 5);
        const currentDebtTiles = (this.gameState.player.movementDebt || 0) / 5;
        const debtCostTiles = 2; // 10 ft

        const canDodge = (currentDebtTiles + debtCostTiles) <= maxSpeedTiles &&
            !this.gameState.statusEffects?.isGrappled &&
            this.gameState.playerPosture !== 'prone'; // Restrained check implies grappled or similar

        const dodgeOption = defenseTypeSelect.querySelector('option[value="Dodge"]');
        if (dodgeOption) {
            if (!canDodge) {
                dodgeOption.disabled = true;
                dodgeOption.textContent = "Dodge (Cannot Dodge)";
            } else {
                dodgeOption.disabled = false;
                dodgeOption.textContent = "Dodge";
            }
        }

        // Default selection logic
        if (defenseTypeSelect.value === "Dodge" && !canDodge) {
            defenseTypeSelect.value = "BlockUnarmed"; // Fallback
        }

        // Initial UI State based on current selection
        const updateUIForSelection = (val) => {
            blockingLimbSelect.classList.toggle('hidden', val !== 'BlockUnarmed');
            dodgeDebtWarning.classList.toggle('hidden', val !== 'Dodge');
            if (val === 'BlockUnarmed') blockingLimbSelect.value = "leftArm";
        };

        updateUIForSelection(defenseTypeSelect.value);

        const canBlockArmed = this.gameState.inventory.handSlots.some(item => item?.type.includes("melee"));
        const blockArmedOption = defenseTypeSelect.querySelector('option[value="BlockArmed"]');
        if (blockArmedOption) blockArmedOption.disabled = !canBlockArmed;
        if (!canBlockArmed && defenseTypeSelect.value === "BlockArmed") defenseTypeSelect.value = canDodge ? "Dodge" : "BlockUnarmed";

        if (this.defenseTypeChangeListener) defenseTypeSelect.removeEventListener('change', this.defenseTypeChangeListener);
        this.defenseTypeChangeListener = (event) => {
            updateUIForSelection(event.target.value);
        };
        defenseTypeSelect.addEventListener('change', this.defenseTypeChangeListener);

        logToConsole(`${this.gameState.combatCurrentAttacker?.name || "Opponent"} is attacking ${(attackData?.bodyPart) || "your body"} with ${attackData?.weapon?.name || "Unarmed"}! Choose your defense.`, 'orange');
        defenseUI.classList.remove('hidden'); this.gameState.combatPhase = 'playerDefenseDeclare';
    }

    get isPlayerInvolved() {
        return this.initiativeTracker.some(entry => entry.entity === this.gameState || entry.entity === this.gameState.player);
    }

    startCombat(participants, initialTarget = null) {
        // If we were in background mode and now we are starting a new combat (escalation),
        // we must release the background runner so endTurn can finish.
        if (this.backgroundRoundResolve) {
            this.backgroundRoundResolve();
            this.backgroundRoundResolve = null;
        }

        const combatUIDiv = document.getElementById('combatUIDiv');
        const playerInvolved = participants.some(p => p === this.gameState || p === this.gameState.player);

        if (combatUIDiv) {
            if (playerInvolved) {
                combatUIDiv.classList.remove('hidden');
            } else {
                logToConsole(`[CombatManager.startCombat] Player not involved. Keeping combat UI hidden.`, 'lightblue');
            }
        } else {
            console.error("CombatManager: combatUIDiv not found in DOM, cannot make it visible.");
            logToConsole("[CombatManager.startCombat] ERROR: #combatUIDiv not found in DOM.", "error");
        }

        if (initialTarget) {
            this.gameState.combatCurrentDefender = initialTarget;
            logToConsole(`Initial target set to: ${initialTarget.name || initialTarget.id}`, 'lightblue');
        }

        this.updateCombatUI();
        this.initiativeTracker = []; this.gameState.playerMovedThisTurn = false;
        participants.forEach(p => {
            if (!p) return;
            const isPlayer = p === this.gameState;
            this.initiativeTracker.push({
                entity: p,
                initiative: rollDie(20) + getStatModifier("Dexterity", isPlayer ? this.gameState : p),
                tieBreaker: Math.random(),
                isPlayer
            });
            if (!isPlayer) p.movedThisTurn = false;
        });
        this.initiativeTracker.sort((a, b) => b.initiative - a.initiative || b.tieBreaker - a.tieBreaker);
        this.currentTurnIndex = -1; this.gameState.isInCombat = true;
        logToConsole("Combat Started!", 'red');
        this.updateInitiativeDisplay();

        if (participants.some(p => p === this.gameState || p === this.gameState.player)) {
            this.nextTurn();
        } else {
            logToConsole("Combat started in background. Waiting for turn tick.", 'grey');
            this.turnsToProcess = 0;
        }
    }

    populateTargetBodyParts(defender) {
        const select = document.getElementById('combatBodyPartSelect');
        if (!select) return;
        select.innerHTML = '';

        if (defender && defender.health) {
            Object.keys(defender.health).forEach(partKey => {
                const option = document.createElement('option');
                option.value = partKey;
                // Use global formatter if available, otherwise capitalize
                option.textContent = window.formatBodyPartName ? window.formatBodyPartName(partKey) : (partKey.charAt(0).toUpperCase() + partKey.slice(1));
                select.appendChild(option);
            });
            // Default selection logic
            if (defender.health.torso) select.value = "torso";
            else if (defender.health.body) select.value = "body";
            else if (select.options.length > 0) select.selectedIndex = 0;
        } else {
            // Fallback if no defender (e.g. tile targeting) or no health data
            // Default to standard humanoid parts or empty if purely tile-based
            const standardParts = ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];
            standardParts.forEach(part => {
                const option = document.createElement('option');
                option.value = part;
                option.textContent = window.formatBodyPartName ? window.formatBodyPartName(part) : part;
                select.appendChild(option);
            });
            select.value = "torso";
        }
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
        if (this.isProcessingTurn) {
            logToConsole(`[nextTurn SKIPPED] Already processing a turn. Called by: ${previousAttackerEntity ? (previousAttackerEntity.name || 'player') : 'System'}.`, 'purple');
            return;
        }

        // --- End of Turn Effects (Bleeding, Environment) ---
        if (previousAttackerEntity) {
            const entityName = previousAttackerEntity === this.gameState ? "Player" : (previousAttackerEntity.name || previousAttackerEntity.id);
            const healthEntity = previousAttackerEntity === this.gameState ? this.gameState.player : previousAttackerEntity;

            // 1. Bleeding Damage (End of Turn)
            if (previousAttackerEntity.statusEffects && previousAttackerEntity.statusEffects.bleeding && previousAttackerEntity.statusEffects.bleeding.value > 0) {
                const bleedDmg = previousAttackerEntity.statusEffects.bleeding.value;
                if (healthEntity.health) {
                    const partKey = healthEntity.health.torso ? 'torso' : (healthEntity.health.body ? 'body' : null);
                    if (partKey) {
                        const part = healthEntity.health[partKey];
                        const wasInCrisis = part.current <= 0 && part.crisisTimer > 0;

                        logToConsole(`${entityName} takes ${bleedDmg} Bleeding damage to ${partKey} (End of Turn).`, 'red');
                        // Direct modification to bypass armor/etc, as bleeding is internal/existing wound
                        part.current = Math.max(0, part.current - bleedDmg);

                        if (part.current <= 0) {
                            if (wasInCrisis) {
                                // Already in crisis and took damage -> Death
                                logToConsole(`FATAL: ${entityName} succumbed to bleeding while in Critical Condition!`, 'darkred');
                                part.isDestroyed = true;
                                part.crisisTimer = 0;
                            } else if (part.crisisTimer === 0) {
                                // Just entered crisis
                                part.crisisTimer = 3;
                                logToConsole(`${entityName}'s ${partKey} enters Critical Condition from Bleeding!`, 'darkred');
                            }
                        }
                    }
                }
            }

            // 2. Update Health Crisis (End of Turn)
            if (window.updateHealthCrisis) {
                window.updateHealthCrisis(previousAttackerEntity);
            }

            // 3. Tear Gas (End of Turn)
            if (this.gameState.environmentalEffects?.tearGasTiles) {
                const entityPos = previousAttackerEntity === this.gameState ? this.gameState.playerPos : previousAttackerEntity.mapPos;
                if (entityPos) {
                    const isOnTearGasTile = this.gameState.environmentalEffects.tearGasTiles.some(t => t.x === entityPos.x && t.y === entityPos.y);
                    if (isOnTearGasTile) {
                        const tearGasDamage = Math.max(0, rollDiceNotation(parseDiceNotation("1d2-1")));
                        if (tearGasDamage > 0) {
                            logToConsole(`${entityName} ends turn in tear gas and takes ${tearGasDamage} damage.`, 'red');
                            this.applyDamage({ name: "Tear Gas" }, previousAttackerEntity, "torso", tearGasDamage, "Chemical", { name: "Tear Gas Cloud" });
                        }
                    }
                }
            }

            // Check for Death after End of Turn Effects
            // We specifically check for isDestroyed because bleeding sets it if fatal.
            const isTorsoDead = healthEntity.health.torso && healthEntity.health.torso.current <= 0 && healthEntity.health.torso.isDestroyed;
            const isHeadDead = healthEntity.health.head && healthEntity.health.head.current <= 0 && healthEntity.health.head.isDestroyed;
            const isBodyDead = healthEntity.health.body && healthEntity.health.body.current <= 0 && healthEntity.health.body.isDestroyed; // Fallback

            if (isTorsoDead || isHeadDead || isBodyDead) {

                logToConsole(`DEFEATED: ${entityName} succumbed to injuries at end of turn!`, 'darkred');
                if (previousAttackerEntity === this.gameState) {
                    this.endCombat();
                    window.gameOver(this.gameState);
                    return;
                } else {
                    if (window.inventoryManager && typeof window.inventoryManager.createCorpse === 'function') {
                        window.inventoryManager.createCorpse(previousAttackerEntity);
                    } else if (window.inventoryManager && typeof window.inventoryManager.dropInventory === 'function') {
                        window.inventoryManager.dropInventory(previousAttackerEntity);
                    }

                    const idxToRemove = this.initiativeTracker.findIndex(e => e.entity === previousAttackerEntity);
                    this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== previousAttackerEntity);

                    const npcIndex = this.gameState.npcs.findIndex(n => n.id === previousAttackerEntity.id);
                    if (npcIndex !== -1) {
                        this.gameState.npcs.splice(npcIndex, 1);
                    }

                    if (idxToRemove !== -1 && idxToRemove <= this.currentTurnIndex) {
                        this.currentTurnIndex--;
                    }

                    window.mapRenderer.scheduleRender();
                    if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health?.torso?.current > 0)) {
                        this.endCombat();
                        return;
                    }
                }
            }
        }

        // Background Combat Flow Control
        if (this.gameState.isInCombat && !this.isPlayerInvolved) {
            if (this.turnsToProcess <= 0) {
                if (this.backgroundRoundResolve) {
                    const resolve = this.backgroundRoundResolve;
                    this.backgroundRoundResolve = null;
                    resolve();
                }
                return;
            }
            this.turnsToProcess--;
        }

        this.isProcessingTurn = true;
        logToConsole(`[nextTurn START] Lock acquired. Called by: ${previousAttackerEntity ? (previousAttackerEntity.name || 'player') : 'System'}.`, 'purple');

        const callSource = previousAttackerEntity ? (previousAttackerEntity === this.gameState ? 'PlayerEndTurn/OutOfAP' : previousAttackerEntity.name) : 'System';
        // logToConsole(`[nextTurn CALL] Source: ${callSource}. Current isWaitingForPlayerCombatInput: ${this.gameState.isWaitingForPlayerCombatInput}`, 'magenta');

        if (window.animationManager && !this.isBackgroundSimulation) while (window.animationManager.isAnimationPlaying()) await new Promise(r => setTimeout(r, 50));

        // Yield to event loop to prevent freezing in NPC-only combat loops
        await new Promise(r => setTimeout(r, 0));

        if (this.gameState.isWaitingForPlayerCombatInput) {
            // logToConsole(`[nextTurn DEFERRED] Waiting for player input. Source: ${callSource}.`, 'magenta');
            this.isProcessingTurn = false;
            return;
        }
        if (!this.gameState.isInCombat || this.initiativeTracker.length === 0) {
            this.endCombat();
            this.isProcessingTurn = false;
            return;
        }

        let attempts = 0;
        let nextAttackerFound = false;
        let attacker, attackerName, currentEntry;

        while (!nextAttackerFound && attempts < this.initiativeTracker.length + 1) { // Loop to find a live attacker
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initiativeTracker.length;
            if (attempts === 0 && this.currentTurnIndex === 0 && previousAttackerEntity) {
                logToConsole("New combat round started.", 'lightblue');
            }

            currentEntry = this.initiativeTracker[this.currentTurnIndex];
            if (!currentEntry?.entity) {
                logToConsole("Error: Invalid turn entry found. Skipping.", 'red');
                attempts++;
                continue;
            }

            attacker = currentEntry.entity;
            const isPlayer = currentEntry.isPlayer;
            const healthObj = isPlayer ? this.gameState.player.health : attacker.health;
            const head = healthObj?.head;
            const torso = healthObj?.torso;

            // Alive if current > 0 OR in crisis (timer > 0)
            const isHeadAlive = head && (head.current > 0 || head.crisisTimer > 0);
            const isTorsoAlive = torso && (torso.current > 0 || torso.crisisTimer > 0);

            // Fallback for simple entities without head/torso structure
            const isSimpleAlive = healthObj && healthObj.current > 0 && !head && !torso;

            if ((isHeadAlive && isTorsoAlive) || isSimpleAlive) {
                nextAttackerFound = true;
            } else {
                attackerName = isPlayer ? (document.getElementById('charName')?.value || "Player") : (attacker.name || attacker.id || "Unknown NPC");
                logToConsole(`Skipping turn for incapacitated or invalid entity: ${attackerName}. HeadHP: ${head?.current}, TorsoHP: ${torso?.current}`, 'grey');
                // If it's the player and they are dead, combat should end or game over.
                // Note: Player crisis handling might differ, usually player gets to act in crisis? Yes.
                // The check above (isHeadAlive && isTorsoAlive) allows acting in crisis.
                // If they are NOT alive (destroyed or timer 0), then we end.
                if (isPlayer && (!isHeadAlive || !isTorsoAlive)) {
                    logToConsole("Player is incapacitated. Ending combat.", "red");
                    this.endCombat(); // This should trigger gameOver if player is dead
                    window.gameOver(this.gameState); // Explicitly call gameOver for player
                    return;
                }
                // If an NPC is dead, they are already filtered from initiativeTracker in applyDamage.
                // This check is a safeguard.
            }
            attempts++;
        }

        if (!nextAttackerFound) {
            logToConsole("Error: No live attackers found in initiative after checking all. Ending combat.", 'red');
            this.endCombat();
            this.isProcessingTurn = false;
            return;
        }

        // At this point, 'attacker' and 'currentEntry' refer to a live entity.
        this.gameState.combatCurrentAttacker = attacker;
        this.updateCombatUI();
        attackerName = currentEntry.isPlayer ? (document.getElementById('charName')?.value || "Player") : (attacker.name || attacker.id || "Unknown");
        this.gameState.attackerMapPos = currentEntry.isPlayer ? { ...this.gameState.playerPos } : (attacker.mapPos ? { ...attacker.mapPos } : null);
        logToConsole(`--- ${attackerName}'s Turn ---`, 'lightblue');

        // Clear player-specific LOS line data if it's not the player's turn
        if (!currentEntry.isPlayer) {
            this.gameState.rangedAttackData = null;
        }

        if (attacker?.statusEffects) {
            logToConsole(`--- Processing status effects for ${attackerName} --- (${this.gameState.isWaitingForPlayerCombatInput})`, 'teal');
            let effectsToRemove = [];
            for (const effectId in attacker.statusEffects) {
                const effect = attacker.statusEffects[effectId];
                if (!effect) continue;

                if (effect.damagePerTurn && effect.damageType) {
                    let partToDamage = (currentEntry.isPlayer ? this.gameState : attacker).health?.torso;
                    if (partToDamage) {
                        const DPT = effect.damagePerTurn;
                        partToDamage.current = Math.max(0, partToDamage.current - DPT);
                        logToConsole(`${attackerName} takes ${DPT} ${effect.damageType} from ${effect.displayName}. torso: ${partToDamage.current}/${partToDamage.max}`, 'red');
                        if (partToDamage.current <= 0) {
                            logToConsole(`DEFEATED: ${attackerName} by ${effect.displayName}!`, 'darkred');
                            if (currentEntry.isPlayer) {
                                this.endCombat();
                                window.gameOver(this.gameState);
                                this.isProcessingTurn = false;
                                return;
                            }
                            else {
                                // NPC death is handled in applyDamage; if they die from status here,
                                // they should be removed from initiativeTracker and npcs list.
                                if (window.inventoryManager && typeof window.inventoryManager.dropInventory === 'function') {
                                    window.inventoryManager.dropInventory(attacker);
                                }
                                this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== attacker);
                                this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== attacker);
                                if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health?.torso?.current > 0 && e.entity.health?.head?.current > 0)) {
                                    this.endCombat();
                                    this.isProcessingTurn = false;
                                    return;
                                }
                                // Since the current attacker died from status, immediately try to go to the next turn.
                                // The loop at the start of nextTurn will find the next valid attacker.
                                await this.nextTurn(attacker);
                                this.isProcessingTurn = false;
                                return;
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



        if (currentEntry.isPlayer) {
            logToConsole(`[nextTurn] Setting up PLAYER turn. Initial isWaiting: ${this.gameState.isWaitingForPlayerCombatInput}`, 'green');
            // REMOVED: playerForcedEndTurnWithZeroAP block that caused premature turn skip.
            // Player turn should always proceed if it's their turn in initiative.
            // AP/MP reset below ensures they have resources.
            this.gameState.playerMovedThisTurn = false;

            // Reset Player AP/MP at the start of their turn in combat
            const derivedStats = window.calculateDerivedStats ? window.calculateDerivedStats(this.gameState) : {};
            const maxAP = derivedStats["Action Points"] || this.gameState.player.defaultActionPoints || 1;
            const maxSpeedFeet = derivedStats["Movement Speed"] || 30;
            const maxMP = Math.floor(maxSpeedFeet / 5);

            const currentDebt = this.gameState.player.movementDebt || 0;
            const debtTiles = Math.floor(currentDebt / 5);

            this.gameState.actionPointsRemaining = maxAP;
            this.gameState.movementPointsRemaining = Math.max(0, maxMP - debtTiles);
            this.gameState.player.movementDebt = 0; // Reset debt after applying it
            this.gameState.hasDashed = false;

            logToConsole(`[nextTurn] Player AP/MP RESET. AP: ${this.gameState.actionPointsRemaining}, MP: ${this.gameState.movementPointsRemaining} (Max: ${maxMP}, Debt: ${debtTiles})`, 'yellow');

            window.turnManager.updateTurnUI(); // Update UI with refreshed AP/MP

            if (this.gameState.selectedTargetEntity) {
                this.gameState.combatCurrentDefender = this.gameState.selectedTargetEntity;
                this.gameState.defenderMapPos = this.gameState.selectedTargetEntity.mapPos ? { ...this.gameState.selectedTargetEntity.mapPos } : null;
                logToConsole(`[nextTurn] Player's turn starts with pre-selected target: ${this.gameState.combatCurrentDefender.name}.`, 'lightblue');
                // Consume the pre-selected target state so it's not reused on subsequent turns.
                this.gameState.selectedTargetEntity = null;
                this.gameState.targetConfirmed = false;
            } else if (!this.gameState.retargetingJustHappened) {
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

            // Defender selection should be handled by NPC AI (selectNpcCombatTarget).
            // Do NOT force default to player, as this breaks NPC vs NPC combat where player is not involved.
            // If combatCurrentDefender is already set (e.g. from previous turn or persistent targeting), we can leave it,
            // but usually selectNpcCombatTarget will override it.
            // Clearing it ensures AI makes a fresh decision.
            // this.gameState.combatCurrentDefender = null;
            // this.gameState.defenderMapPos = null;

            this.gameState.combatPhase = 'attackerDeclare';
            // IMPORTANT: release the lock BEFORE giving control to the AI, because the AI/resolve path
            // will call processAttack() -> nextTurn() again. If we keep the lock, that nextTurn() gets skipped.
            this.isProcessingTurn = false;

            // Call the main NPC turn execution function from npcDecisions.js
            if (window.executeNpcTurn) {
                await window.executeNpcTurn(attacker, this.gameState, this, this.assetManager);
                return; // Let the resolve path advance the turn; don't fall through and re-acquire the lock
            } else {
                logToConsole(`ERROR: window.executeNpcTurn is not defined. NPC ${attackerName} cannot take a turn.`, "red");
                // Failsafe so combat doesn't stall
                await this.nextTurn(attacker);
                return;
            }
        }
        this.isProcessingTurn = false;
        logToConsole(`[nextTurn END] Lock released.`, 'purple');
    }

    endCombat() {
        logToConsole("Combat Ending...", 'lightblue');
        if (this.backgroundRoundResolve) {
            this.backgroundRoundResolve();
            this.backgroundRoundResolve = null;
        }
        this.gameState.isInCombat = false;
        this.gameState.combatPhase = null;
        this.gameState.attackerMapPos = null;
        this.gameState.defenderMapPos = null;
        this.gameState.combatCurrentDefender = null;
        this.gameState.combatCurrentAttacker = null;
        this.gameState.isWaitingForPlayerCombatInput = false;
        this.gameState.rangedAttackData = null;
        this.isProcessingTurn = false;
        this.gameState.pendingCombatAction = null;

        this.initiativeTracker.forEach(e => { if (e.entity?.statusEffects) { e.entity.statusEffects.isGrappled = false; e.entity.statusEffects.grappledBy = null; } });
        if (this.gameState.statusEffects) { this.gameState.statusEffects.isGrappled = false; this.gameState.statusEffects.grappledBy = null; }
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

        // Crippled Arm Check for Attack
        const health = this.gameState.player.health;
        let isLeftCrippled = health && health.leftArm && health.leftArm.current <= 0;
        let isRightCrippled = health && health.rightArm && health.rightArm.current <= 0;

        // If weapon is two-handed (e.g. rifle, bow, some melee), need both arms.
        // If weapon is one-handed, need specific arm.
        // Assuming slot 0 is primary (Right?) and slot 1 is off-hand (Left?).
        // Or assume generic "Hand Slots".
        // Let's assume standard: Primary = Right, Off-hand = Left for simplicity, OR checking if *any* arm is available for 1H.
        // Simplified Logic:
        // - 2H Weapon: Fails if ANY arm crippled.
        // - 1H Weapon: Fails if associated arm crippled (or if both crippled).
        // - Unarmed: Can kick? Usually "Unarmed" implies punches. Let's assume fails if both arms crippled, or specific arm used.
        // Since we don't strictly track which hand holds what in the selection (just "unarmed" or "weaponID"),
        // we check the inventory slots.
        const handSlots = this.gameState.inventory.handSlots;
        const mainHandItem = handSlots[0]; // Usually Right
        const offHandItem = handSlots[1]; // Usually Left

        if (weaponObj) {
            // Is it 2H?
            const isTwoHanded = weaponObj.tags && (weaponObj.tags.includes("two_handed") || weaponObj.type.includes("rifle") || weaponObj.type.includes("bow") || weaponObj.type.includes("crossbow"));
            if (isTwoHanded) {
                if (isLeftCrippled || isRightCrippled) {
                    logToConsole("Cannot use two-handed weapon with a crippled arm!", 'red');
                    this.promptPlayerAttackDeclaration();
                    return;
                }
            } else {
                // 1H Weapon. Which hand is it in?
                if (mainHandItem && mainHandItem.id === weaponObj.id) {
                    // Right Hand (Slot 0)
                    if (isRightCrippled) {
                        logToConsole("Cannot attack with crippled Right Arm!", 'red');
                        this.promptPlayerAttackDeclaration();
                        return;
                    }
                } else if (offHandItem && offHandItem.id === weaponObj.id) {
                    // Left Hand (Slot 1)
                    if (isLeftCrippled) {
                        logToConsole("Cannot attack with crippled Left Arm!", 'red');
                        this.promptPlayerAttackDeclaration();
                        return;
                    }
                } else {
                    // Weapon not in hand? (Maybe from select list but not equipped?)
                    // Assume main hand for safety if not found
                    if (isRightCrippled && isLeftCrippled) {
                         logToConsole("Cannot attack with both arms crippled!", 'red');
                         this.promptPlayerAttackDeclaration();
                         return;
                    }
                }
            }
        } else {
            // Unarmed
            if (isRightCrippled && isLeftCrippled) {
                logToConsole("Cannot punch with both arms crippled!", 'red');
                // Maybe allow Kick if legs ok? For now, restriction as per prompt "Crippled Arm: cannot attack".
                this.promptPlayerAttackDeclaration();
                return;
            }
        }

        if (!this.gameState.combatCurrentDefender && !(weaponObj?.type === "weapon_thrown_utility" || weaponObj?.type === "weapon_utility_spray")) {
            logToConsole("ERROR: No target selected for non-utility attack.", 'red'); this.promptPlayerAttackDeclaration(); return;
        }
        const fireMode = document.getElementById('combatFireModeSelect')?.value || "single";
        const bodyPart = bodyPartSelect.value;
        const currentTargetName = this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id) : "tile";

        // Ammo Check for Firearms, Bows, Crossbows
        if (weaponObj && (weaponObj.type.includes("firearm") || weaponObj.type.includes("bow") || weaponObj.type.includes("crossbow"))) {
            if (weaponObj.currentAmmo !== undefined && weaponObj.currentAmmo <= 0) {
                logToConsole(`${weaponObj.name} is out of ammo! Reload required.`, 'orange');
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Placeholder for weapon_empty_click_01.wav
                this.promptPlayerAttackDeclaration(); // Re-prompt, allowing reload or choosing another weapon
                return;
            }
        }

        this.gameState.pendingCombatAction = {
            target: this.gameState.combatCurrentDefender,
            weapon: weaponObj,
            attackType,
            bodyPart,
            fireMode,
            actionType: "attack",
            entity: this.gameState,
            skillToUse: null,
            targetTile: null,
            actionDescription: `${weaponObj ? weaponObj.name : "Unarmed"} attack on ${currentTargetName}'s ${bodyPart}`
        };

        // Clear previous ranged attack line display data
        this.gameState.rangedAttackData = null;

        // If it's a ranged attack, calculate and store line data
        if (attackType === "ranged" && weaponObj && this.gameState.combatCurrentAttacker && (this.gameState.combatCurrentDefender || this.gameState.defenderMapPos)) {
            const attackerPos = this.gameState.combatCurrentAttacker === this.gameState ? this.gameState.playerPos : this.gameState.combatCurrentAttacker.mapPos;
            const targetPos = this.gameState.combatCurrentDefender ? this.gameState.combatCurrentDefender.mapPos : this.gameState.defenderMapPos;

            if (attackerPos && targetPos) {
                const distance = getDistance3D(attackerPos, targetPos);
                let rangeModifier = 0;
                // Simplified range modifier calculation for display (actual calculation in calculateAttackRoll)
                if (distance <= (weaponObj.optimalRange || 10)) rangeModifier = 5;
                else if (distance <= (weaponObj.effectiveRange || 30)) rangeModifier = 0;
                else if (distance <= (weaponObj.maxRange || 60)) rangeModifier = -5;
                else rangeModifier = -10;
                // This is a simplified version. The full logic is in calculateAttackRoll.
                // For display, we might just show distance. The modifier can be complex.
                // Let's store the line and the calculated distance for now.
                // The modifier text can be "Range Mod: [value]" from calculateAttackRoll's context.

                this.gameState.rangedAttackData = {
                    start: attackerPos,
                    end: targetPos,
                    distance: distance.toFixed(1),
                    modifierText: `(Mod: ${rangeModifier})` // Store the simplified modifier for display
                };
                logToConsole(`Ranged attack line data set: ${JSON.stringify(this.gameState.rangedAttackData)}`, 'grey');
            }
        }


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

    async handleConfirmedDefenseDeclaration() {
        logToConsole(`[handleConfirmedDefenseDeclaration] Setting isWaitingForPlayerCombatInput to FALSE. Current phase: ${this.gameState.combatPhase}`, 'magenta');
        this.gameState.isWaitingForPlayerCombatInput = false;
        const defenseType = document.getElementById('combatDefenseTypeSelect').value;
        const blockingLimb = defenseType === 'BlockUnarmed' ? document.getElementById('combatBlockingLimbSelect').value : null;
        let description = defenseType;

        // Crippled Arm Check for Block
        if (defenseType === 'BlockUnarmed' || defenseType === 'BlockArmed') {
            const health = this.gameState.player.health;
            if (blockingLimb) {
                // Check specific limb if chosen
                if (health[blockingLimb] && health[blockingLimb].current <= 0) {
                    logToConsole(`Cannot block with crippled ${blockingLimb}! Defaulting to Dodge (or None).`, 'red');
                    // Fallback
                    // Ideally we re-prompt, but for flow simplicity we downgrade defense
                    this.gameState.playerDefenseChoice = { type: "None", blockingLimb: null, description: "Defense Failed (Crippled Limb)" };
                    this.gameState.combatPhase = 'resolveRolls';
                    await this.processAttack();
                    return;
                }
            } else {
                // Armed block or general unarmed block (if limb not specified in UI yet, assume standard arms)
                // For BlockArmed, check hand holding weapon?
                // Let's assume Block requires at least one good arm.
                const isLeftCrippled = health && health.leftArm && health.leftArm.current <= 0;
                const isRightCrippled = health && health.rightArm && health.rightArm.current <= 0;

                if (isLeftCrippled && isRightCrippled) {
                     logToConsole(`Cannot block with both arms crippled!`, 'red');
                     this.gameState.playerDefenseChoice = { type: "None", blockingLimb: null, description: "Defense Failed (Crippled Limbs)" };
                     this.gameState.combatPhase = 'resolveRolls';
                     await this.processAttack();
                     return;
                }
            }
        }

        if (defenseType === 'Dodge') {
            description = "Dodges";

            // Apply Movement Debt
            if (!this.gameState.player.movementDebt) this.gameState.player.movementDebt = 0;
            this.gameState.player.movementDebt += 10; // 10 ft
            logToConsole(`Movement Debt Increased to ${this.gameState.player.movementDebt}ft.`, 'grey');
        } else if (defenseType === 'BlockUnarmed') {
            description = `Blocks with ${blockingLimb}`;
        }

        this.gameState.playerDefenseChoice = { type: defenseType, blockingLimb, description };
        logToConsole(`Player defends: ${description}.`, 'lightgreen');
        document.getElementById('defenseDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'resolveRolls';
        await this.processAttack();
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
        // Allow defender to be gameState.player OR gameState (legacy fallback)
        if (defender === this.gameState.player || defender === this.gameState) {
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
        if (!actionContext.detailedModifiers) actionContext.detailedModifiers = [];
        if (skillBasedModifier !== 0) actionContext.detailedModifiers.push({ text: `Skill (${skillName}): ${skillBasedModifier > 0 ? '+' : ''}${skillBasedModifier}`, value: skillBasedModifier, type: skillBasedModifier > 0 ? 'positive' : 'negative' });

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
        if (lightingPenalty !== 0) actionContext.detailedModifiers.push({ text: `Lighting: ${lightingPenalty}`, value: lightingPenalty, type: 'negative' });


        let statusEffectAttackPenalty = 0;
        if (attacker.statusEffects) {
            if (attacker.statusEffects["blinded_pepper_spray"]?.visionPenalty) {
                statusEffectAttackPenalty += attacker.statusEffects["blinded_pepper_spray"].visionPenalty;
            }
            if (attacker.statusEffects["irritated_tear_gas"]?.accuracyPenalty) {
                statusEffectAttackPenalty += attacker.statusEffects["irritated_tear_gas"].accuracyPenalty;
            }
            if (attacker.statusEffects["in_smoke"]) { // Attacker in smoke
                statusEffectAttackPenalty += -2;
            }
        }
        const defender = this.gameState.combatCurrentDefender;
        if (defender && defender.statusEffects && defender.statusEffects["in_smoke"]) { // Defender in smoke
            statusEffectAttackPenalty += -2;
        }
        if (statusEffectAttackPenalty !== 0) actionContext.detailedModifiers.push({ text: `Status: ${statusEffectAttackPenalty}`, value: statusEffectAttackPenalty, type: 'negative' });


        // Advantage / Disadvantage Logic
        let roll1 = actionContext.naturalRollOverride !== undefined ? actionContext.naturalRollOverride : rollDie(20);
        let roll2 = actionContext.naturalRollOverride !== undefined ? actionContext.naturalRollOverride : rollDie(20);
        let baseRoll = roll1;

        // Check for Aiming status (Advantage)
        if (attacker.aimingEffect) {
            actionContext.advantage = true;
        }

        // Check for Dual Wield Second Attack (Disadvantage)
        if (actionContext.isSecondAttack) {
            actionContext.disadvantage = true;
        }

        if (actionContext.advantage && !actionContext.disadvantage) {
            baseRoll = Math.max(roll1, roll2);
            actionContext.detailedModifiers.push({ text: "Advantage", value: 0, type: 'positive' });
        } else if (actionContext.disadvantage && !actionContext.advantage) {
            baseRoll = Math.min(roll1, roll2);
            actionContext.detailedModifiers.push({ text: "Disadvantage", value: 0, type: 'negative' });
        } else if (actionContext.advantage && actionContext.disadvantage) {
            baseRoll = roll1; // Cancel out
            actionContext.detailedModifiers.push({ text: "Adv/Dis Cancel", value: 0, type: 'neutral' });
        }

        // Perk: Battle Focus (Wil) - +1 Aim bonus
        if (attacker.aimingEffect && window.perkManager && window.perkManager.hasPerk("Battle Focus")) {
            actionContext.detailedModifiers.push({ text: "Perk (Battle Focus): +1", value: 1, type: 'positive' });
            // Battle Focus adds +1 to the roll on top of advantage
            skillBasedModifier += 1; // Add to static mods
        }

        // Perk: True Call (Per) - Reduce called shot penalties by 1
        let calledShotReducer = 0;
        if (window.perkManager && window.perkManager.hasPerk("True Call")) {
            calledShotReducer = 1;
        }

        // Perk: Controlled Burst (Dex) - Reduce Burst/Auto penalties by 2
        let burstReducer = 0;
        if (window.perkManager && window.perkManager.hasPerk("Controlled Burst") && (actionContext.isBurst || actionContext.isAutomatic)) {
            burstReducer = 2;
            actionContext.detailedModifiers.push({ text: "Perk (Controlled Burst): +2", value: 2, type: 'positive' });
        }

        // Perk: Rangefinder (Per) - Reduce range penalties by 1 (Long/Very Long/Extremely Long)
        let rangePenaltyReducer = 0;
        if (window.perkManager && window.perkManager.hasPerk("Rangefinder") && rangeModifier < 0) {
            rangePenaltyReducer = 1;
            actionContext.detailedModifiers.push({ text: "Perk (Rangefinder): +1", value: 1, type: 'positive' });
        }

        actionContext.bodyPartModifier = 0;
        if (this.gameState.combatCurrentDefender && targetBodyPartArg) {
            if (targetBodyPartArg.toLowerCase() === "head") actionContext.bodyPartModifier = -4;
            else if (["leftArm", "rightArm", "leftLeg", "rightLeg"].includes(targetBodyPartArg)) actionContext.bodyPartModifier = -1;

            // Apply True Call reduction
            if (actionContext.bodyPartModifier < 0) {
                const reduction = Math.min(Math.abs(actionContext.bodyPartModifier), calledShotReducer);
                if (reduction > 0) {
                    actionContext.bodyPartModifier += reduction;
                    actionContext.detailedModifiers.push({ text: "Perk (True Call)", value: reduction, type: 'positive' });
                }
            }
        }
        if (actionContext.bodyPartModifier !== 0) actionContext.detailedModifiers.push({ text: `Target: ${actionContext.bodyPartModifier}`, value: actionContext.bodyPartModifier, type: 'negative' });

        // Apply Rangefinder
        const effectiveRangeMod = Math.min(0, rangeModifier + rangePenaltyReducer);
        const finalRangeMod = rangeModifier > 0 ? rangeModifier : effectiveRangeMod;

        if (finalRangeMod !== 0) actionContext.detailedModifiers.push({ text: `Range: ${finalRangeMod > 0 ? '+' : ''}${finalRangeMod}`, value: finalRangeMod, type: finalRangeMod > 0 ? 'positive' : 'negative' });

        // Apply Controlled Burst
        const effectiveFireModeMod = Math.min(0, attackModifierForFireMode + burstReducer);
        if (effectiveFireModeMod !== 0) actionContext.detailedModifiers.push({ text: `Mode: ${effectiveFireModeMod}`, value: effectiveFireModeMod, type: 'negative' });

        if (actionContext.attackerMovementPenalty !== 0) actionContext.detailedModifiers.push({ text: `Movement: ${actionContext.attackerMovementPenalty}`, value: actionContext.attackerMovementPenalty, type: 'negative' });

        // Companion Loyalty Bonuses
        let loyaltyBonus = 0;
        if (attacker.isFollowingPlayer && typeof attacker.loyalty === 'number') {
            if (attacker.loyalty >= 90) {
                loyaltyBonus = 2;
                actionContext.detailedModifiers.push({ text: "Devoted Companion", value: 2, type: 'positive' });
            } else if (attacker.loyalty >= 75) {
                loyaltyBonus = 1;
                actionContext.detailedModifiers.push({ text: "Loyal Companion", value: 1, type: 'positive' });
            }
        }

        const totalAttackRoll = baseRoll + skillBasedModifier + actionContext.bodyPartModifier + finalRangeMod + effectiveFireModeMod + actionContext.attackerMovementPenalty + lightingPenalty + statusEffectAttackPenalty + loyaltyBonus;
        actionContext.statusEffectAttackPenalty = statusEffectAttackPenalty; // Keep for logging
        actionContext.lightingPenaltyApplied = lightingPenalty; // Keep for logging

        const canCrit = !(actionContext.isSecondAttack || actionContext.isBurst || actionContext.isAutomatic);
        return { roll: totalAttackRoll, naturalRoll: baseRoll, isCriticalHit: canCrit && baseRoll === 20, isCriticalMiss: canCrit && baseRoll === 1, detailedModifiers: actionContext.detailedModifiers };
    }

    calculateDefenseRoll(defender, defenseType, attackerWeapon, coverBonus = 0, actionContext = {}) {
        if (!defender) return { roll: 0, naturalRoll: 0, isCriticalSuccess: false, isCriticalFailure: false, coverBonusApplied: 0, movementBonusApplied: 0, defenseSkillValue: 0, defenseSkillName: "N/A", statusEffectDefensePenalty: 0, detailedModifiers: [] };

        if (!actionContext.detailedModifiers) actionContext.detailedModifiers = [];
        let statusEffectDefensePenalty = 0; // Example, implement actual status effect checks here
        // if (statusEffectDefensePenalty !== 0) actionContext.detailedModifiers.push({ text: `Status: ${statusEffectDefensePenalty}`, value: statusEffectDefensePenalty, type: 'negative' });

        // Perk: Catfoot (Dex) - +1 defense if ending turn in cover
        let catfootBonus = 0;
        if (window.perkManager && window.perkManager.hasPerk("Catfoot") && coverBonus > 0) {
            catfootBonus = 1;
            actionContext.detailedModifiers.push({ text: "Perk (Catfoot): +1", value: 1, type: 'positive' });
        }

        // Perk: Unshakable (Wil) - +1 defense if HP <= 50%
        let unshakableBonus = 0;
        if (window.perkManager && window.perkManager.hasPerk("Unshakable")) {
            const health = defender === this.gameState ? this.gameState.player.health : defender.health;
            if (health) {
                const maxTotal = Object.values(health).reduce((sum, part) => sum + part.max, 0);
                const currentTotal = Object.values(health).reduce((sum, part) => sum + part.current, 0);
                if (currentTotal <= maxTotal / 2) {
                    unshakableBonus = 1;
                    actionContext.detailedModifiers.push({ text: "Perk (Unshakable): +1", value: 1, type: 'positive' });
                }
            }
        }

        // Perk: Clinch Fighter (Str) - +2 Block (Unarmed) while grappling
        let clinchFighterBonus = 0;
        if (window.perkManager && window.perkManager.hasPerk("Clinch Fighter") && defenseType === "BlockUnarmed" && defender.statusEffects?.isGrappling) {
            clinchFighterBonus = 2;
            actionContext.detailedModifiers.push({ text: "Perk (Clinch Fighter): +2", value: 2, type: 'positive' });
        }

        // Perk: Evasive Footwork (Dex) - +1 Dodge
        let evasiveFootworkBonus = 0;
        if (window.perkManager && window.perkManager.hasPerk("Evasive Footwork") && defenseType === "Dodge") {
            evasiveFootworkBonus = 1;
            actionContext.detailedModifiers.push({ text: "Perk (Evasive Footwork): +1", value: 1, type: 'positive' });
        }

        let defenderMovementBonus = (defender === this.gameState && this.gameState.playerMovedThisTurn) || (defender !== this.gameState && defender.movedThisTurn) ? 2 : 0;
        if (defenderMovementBonus !== 0) actionContext.detailedModifiers.push({ text: `Movement: +${defenderMovementBonus}`, value: defenderMovementBonus, type: 'positive' });
        if (coverBonus !== 0) actionContext.detailedModifiers.push({ text: `Cover: +${coverBonus}`, value: coverBonus, type: 'positive' });


        if (defenseType === "None") {
            const baseRoll = actionContext.naturalRollOverride !== undefined ? actionContext.naturalRollOverride : rollDie(20);
            const totalDefenseRoll = baseRoll + coverBonus + defenderMovementBonus + statusEffectDefensePenalty + catfootBonus + unshakableBonus;
            return { roll: totalDefenseRoll, naturalRoll: baseRoll, isCriticalSuccess: baseRoll === 20, isCriticalFailure: baseRoll === 1, coverBonusApplied: coverBonus, movementBonusApplied: defenderMovementBonus, defenseSkillValue: 0, defenseSkillName: "Passive", statusEffectDefensePenalty, detailedModifiers: actionContext.detailedModifiers };
        }

        const baseRoll = actionContext.naturalRollOverride !== undefined ? actionContext.naturalRollOverride : rollDie(20);
        let baseDefenseValue = 0, defenseSkillName = "";
        switch (defenseType) {
            case "Dodge": defenseSkillName = "Unarmed + Dexterity"; baseDefenseValue = getStatModifier("Dexterity", defender) + getSkillModifier("Unarmed", defender); break;
            case "BlockUnarmed": defenseSkillName = "Unarmed"; baseDefenseValue = getSkillModifier("Unarmed", defender); break;
            case "BlockArmed": defenseSkillName = "Melee Weapons"; baseDefenseValue = getSkillModifier("Melee Weapons", defender); break;
        }
        if (baseDefenseValue !== 0) actionContext.detailedModifiers.push({ text: `Skill (${defenseSkillName}): ${baseDefenseValue > 0 ? '+' : ''}${baseDefenseValue}`, value: baseDefenseValue, type: baseDefenseValue > 0 ? 'positive' : 'negative' });

        const totalDefenseRoll = baseRoll + baseDefenseValue + coverBonus + defenderMovementBonus + statusEffectDefensePenalty + catfootBonus + unshakableBonus + clinchFighterBonus + evasiveFootworkBonus;
        return { roll: totalDefenseRoll, naturalRoll: baseRoll, isCriticalSuccess: baseRoll === 20, isCriticalFailure: baseRoll === 1, coverBonusApplied: coverBonus, movementBonusApplied: defenderMovementBonus, defenseSkillValue: baseDefenseValue, defenseSkillName, statusEffectDefensePenalty, detailedModifiers: actionContext.detailedModifiers };
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
                const smokeDuration = 5;
                if (window.gasManager) {
                    for (let dx = -burstRadiusTiles; dx <= burstRadiusTiles; dx++) {
                        for (let dy = -burstRadiusTiles; dy <= burstRadiusTiles; dy++) {
                            if (Math.sqrt(dx * dx + dy * dy) <= burstRadiusTiles) {
                                const tileX = impactTile.x + dx; const tileY = impactTile.y + dy;
                                // Assuming smoke rises or spreads on impact Z
                                window.gasManager.spawnGas(tileX, tileY, impactTile.z, 'smoke', smokeDuration, 1.0);
                            }
                        }
                    }
                    logToConsole(`Smoke cloud created at (${impactTile.x},${impactTile.y}), radius ${burstRadiusTiles}t, duration ${smokeDuration} turns.`, 'grey');
                }
                if (window.mapRenderer) window.mapRenderer.scheduleRender();
                areaEffectProcessedThisCall = true;
            } else if (item.id === "tear_gas_grenade_thrown" && !areaEffectProcessedThisCall) {
                if (window.audioManager && effectImpactPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', effectImpactPos, {}, { volume: 0.6 }); // Placeholder for gas_hiss_01.wav
                const gasDuration = 4;
                if (window.gasManager) {
                    for (let dx = -burstRadiusTiles; dx <= burstRadiusTiles; dx++) {
                        for (let dy = -burstRadiusTiles; dy <= burstRadiusTiles; dy++) {
                            if (Math.sqrt(dx * dx + dy * dy) <= burstRadiusTiles) {
                                const tileX = impactTile.x + dx; const tileY = impactTile.y + dy;
                                window.gasManager.spawnGas(tileX, tileY, impactTile.z, 'tear_gas', gasDuration, 1.0);
                            }
                        }
                    }
                    logToConsole(`Tear gas cloud created at (${impactTile.x},${impactTile.y}), radius ${burstRadiusTiles}t, duration ${gasDuration} turns.`, 'yellow');
                }
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
            } else if (item.id === 'taser' || item.id === 'stun_gun_melee' || effectString === "Digestive Clamp Taser") { // Assuming specialEffect string is "Stun" or similar
                if (window.audioManager && targetEntity && (targetEntity.mapPos || targetEntity === this.gameState)) {
                    const targetPosition = targetEntity === this.gameState ? this.gameState.playerPos : targetEntity.mapPos;
                    window.audioManager.playSoundAtLocation('ui_click_01.wav', targetPosition, {}, { volume: 0.7 }); // Placeholder for taser_hit_01.wav
                }

                existingEffect = entity.statusEffects["stunned"]; duration = 1;
                if (!existingEffect) {
                    entity.statusEffects["stunned"] = { id: "stunned", displayName: "Stunned", duration: 1, sourceItemId: item.id, description: "Cannot act." };
                    // For player, reduce AP to 0 immediately if it's their turn, or ensure they skip next turn
                    if (entity === this.gameState) this.gameState.actionPointsRemaining = 0;
                    else entity.currentActionPoints = 0;
                    logToConsole(`${entityName} is stunned!`, 'red');
                } else {
                    existingEffect.duration = Math.max(existingEffect.duration, duration);
                }

                if (effectString === "Digestive Clamp Taser") {
                    // Apply Grapple
                    if (!entity.statusEffects.isGrappled) {
                        entity.statusEffects.isGrappled = true;
                        entity.statusEffects.grappledBy = (attacker === this.gameState) ? "player" : (attacker.id || "npc");
                        logToConsole(`${entityName} is grappled by Digestive Clamp!`, 'red');
                    }
                    // Apply Digestive Enzyme DOT
                    let clampEffect = entity.statusEffects["digestive_clamp"];
                    if (!clampEffect) {
                        entity.statusEffects["digestive_clamp"] = { id: "digestive_clamp", displayName: "Digestive Clamp", duration: 10, sourceItemId: item.id, damagePerTurn: 1, damageType: "Acid", description: "Digesting, 1 damage/turn." };
                    } else {
                        clampEffect.duration = 10;
                    }
                }
            } else if (effectString === "Digestive Clamp") {
                // Apply Grapple
                if (!entity.statusEffects) entity.statusEffects = {};
                if (!entity.statusEffects.isGrappled) {
                    entity.statusEffects.isGrappled = true;
                    entity.statusEffects.grappledBy = (attacker === this.gameState) ? "player" : (attacker.id || "npc");
                    logToConsole(`${entityName} is grappled by Digestive Clamp!`, 'red');
                }
                // Apply Digestive Enzyme DOT
                let clampEffect = entity.statusEffects["digestive_clamp"];
                if (!clampEffect) {
                    entity.statusEffects["digestive_clamp"] = { id: "digestive_clamp", displayName: "Digestive Clamp", duration: 10, sourceItemId: item.id, damagePerTurn: 1, damageType: "Acid", description: "Digesting, 1 damage/turn." };
                } else {
                    clampEffect.duration = 10;
                }
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

    async calculateAndApplyMeleeDamage(attacker, target, weapon, hitSuccess, attackNaturalRoll, defenseNaturalRoll, targetBodyPartForDamage) {
        if (!hitSuccess || !target) { if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)'; return; }

        let damageAmount = 0;
        let damageType = "";
        let damageDiceNotation = "0";
        let damageModifiers = []; // For melee, this might include Strength bonus for some weapons, etc.
        const attackerName = (attacker === this.gameState) ? "Player" : (attacker.name || attacker.id);

        const targetPosition = target === this.gameState ? this.gameState.playerPos : target.mapPos;

        if (weapon === null) { // Unarmed
            damageType = "Bludgeoning";
            const unarmedMod = getSkillModifier("Unarmed", attacker);
            // Unarmed damage: 1d(UnarmedMod) or 1d2-1 if mod <=0
            damageDiceNotation = unarmedMod <= 0 ? "1d2-1" : `1d${unarmedMod}`;
            // For animation, we pass the raw dice. The modifier is part of the dice string here.
            // If UnarmedMod itself was a bonus *to* a base die, it would be a separate modifier.
            // For now, the rollDiceNotation handles "1d2-1" correctly.
            // damageAmount = unarmedMod <= 0 ? Math.max(0, rollDie(2) - 1) : rollDie(unarmedMod); // Old way
            if (window.audioManager && targetPosition) {
                window.audioManager.playUnarmedHitSound({ sourcePosition: targetPosition }); // Uses existing random unarmed hit sounds
            }
        } else { // Armed Melee
            damageType = weapon.damageType || "Physical";
            damageDiceNotation = weapon.damage; // e.g., "1d6+2"
            // If weapon.damage includes a static bonus (e.g. "1d6+2"), rollDiceNotation handles it.
            // If Strength should add to melee damage, it would be a modifier:
            // const strBonus = getStatModifier("Strength", attacker);
            // if (strBonus !== 0 && weapon.addsStrengthToDamage) { // Assuming a weapon property
            //    damageModifiers.push({text: `Str Bonus: ${strBonus > 0 ? '+' : ''}${strBonus}`, value: strBonus, type: strBonus > 0 ? 'positive' : 'negative'});
            // }
            // damageAmount = rollDiceNotation(parseDiceNotation(weapon.damage)); // Old way
            if (window.audioManager && targetPosition) {
                let hitSoundName = 'melee_unarmed_hit_01.wav'; // Default placeholder if no specific armed sound matches
                if (weapon.type.includes("blade")) {
                    hitSoundName = 'ui_click_01.wav'; // Placeholder for melee_blade_hit_01.wav or similar
                } else if (weapon.type.includes("blunt")) {
                    hitSoundName = 'ui_click_01.wav'; // Placeholder for melee_blunt_hit_01.wav or similar
                } else if (weapon.id === 'chain_saw_melee') {
                    hitSoundName = 'ui_error_01.wav'; // Placeholder for chainsaw_hit_flesh_01.wav or impact sound
                } else if (weapon.id === 'whip') {
                    // Whip crack sound is played on swing animation; hit sound might be different or part of it.
                    // For now, using a generic click for a distinct hit impact if any.
                    hitSoundName = 'ui_click_01.wav'; // Placeholder for whip_hit_01.wav or flesh_impact_light_01.wav
                }
                window.audioManager.playSoundAtLocation(hitSoundName, targetPosition, {}, { volume: 0.8 });
            }
        }

        const isPlayerInvolved = (attacker === this.gameState || attacker === this.gameState.player) || (target === this.gameState || target === this.gameState.player);

        if (isPlayerInvolved) {
            await window.animationManager.playAnimation('diceRoll', {
                diceNotation: damageDiceNotation,
                rollingEntityName: `${attackerName} Damage Roll (${weapon ? weapon.name : 'Unarmed'})`,
                entity: target, // Animation appears near target
                modifiers: damageModifiers, // Pass any applicable damage modifiers
                onComplete: (rolledDamage) => {
                    damageAmount = rolledDamage;
                    logToConsole(`Rolled Damage for ${weapon ? weapon.name : 'Unarmed'}: ${damageAmount} (Notation: ${damageDiceNotation})`, 'grey');
                }
            });
        } else {
            const parsed = parseDiceNotation(damageDiceNotation);
            damageAmount = rollDiceNotation(parsed);
            damageAmount = Math.max(0, damageAmount);
            logToConsole(`Rolled Damage for ${weapon ? weapon.name : 'Unarmed'}: ${damageAmount} (Notation: ${damageDiceNotation})`, 'grey');
        }

        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Raw Damage: ${damageAmount} ${damageType} (${damageDiceNotation})`;
        this.applyDamage(attacker, target, targetBodyPartForDamage, damageAmount, damageType, weapon);
    }

    async calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPartForDamage, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess || !target) { if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)'; return; }

        const damageType = weapon.damageType || "Ballistic";
        const damageDiceNotation = weapon.damage; // e.g., "2d6"
        let totalDamageThisVolley = 0;
        const attackerName = (attacker === this.gameState) ? "Player" : (attacker.name || attacker.id);
        const weaponName = weapon.name;

        logToConsole(`HITS: ${attackerName}'s ${weaponName} strikes ${numHits} time(s)! (Base Damage Notation: ${damageDiceNotation})`, attacker === this.gameState ? 'lightgreen' : (numHits > 1 ? 'orangered' : 'orange'));

        const targetPosition = target === this.gameState ? this.gameState.playerPos : target.mapPos;

        for (let i = 0; i < numHits; i++) {
            let damageAmountThisBullet = 0;
            // Ranged weapons usually don't have modifiers like Str directly to damage dice, but could have penetration, etc.
            // For now, assuming damageModifiers for ranged are empty unless specified by weapon type (e.g. critical hit bonus)
            const damageModifiers = [];

            const isPlayerInvolved = (attacker === this.gameState || attacker === this.gameState.player) || (target === this.gameState || target === this.gameState.player);

            if (isPlayerInvolved) {
                await window.animationManager.playAnimation('diceRoll', {
                    diceNotation: damageDiceNotation,
                    rollingEntityName: `${attackerName} Damage (Hit ${i + 1}/${numHits}, ${weaponName})`,
                    entity: target, // Animation appears near target
                    modifiers: damageModifiers,
                    onComplete: (rolledDamage) => {
                        damageAmountThisBullet = rolledDamage;
                        logToConsole(`Rolled Damage (Hit ${i + 1}): ${damageAmountThisBullet} for ${weaponName}`, 'grey');
                    }
                });
            } else {
                const parsed = parseDiceNotation(damageDiceNotation);
                damageAmountThisBullet = rollDiceNotation(parsed);
                damageAmountThisBullet = Math.max(0, damageAmountThisBullet);
                logToConsole(`Rolled Damage (Hit ${i + 1}): ${damageAmountThisBullet} for ${weaponName}`, 'grey');
            }

            totalDamageThisVolley += damageAmountThisBullet;
            if (window.audioManager && targetPosition) {
                let hitSound = 'ui_click_01.wav';
                if (weapon.type.includes("bow") || weapon.type.includes("crossbow")) hitSound = 'ui_click_01.wav';
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
        // Use 'let' for variables that might be reassigned (intendedBodyPart)
        let { weapon, attackType, bodyPart: intendedBodyPart, fireMode = "single", actionType = "attack" } = this.gameState.pendingCombatAction || {};

        if (!this.gameState.pendingCombatAction?.actionType) {
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration(); else this.nextTurn(); return;
        }
        if (actionType === "use_item") {
            const item = this.gameState.pendingCombatAction.item;

            // Call InventoryManager to handle effects and removal
            if (window.inventoryManager && typeof window.inventoryManager.consumeItem === 'function') {
                const consumed = window.inventoryManager.consumeItem(item, attacker);
                if (!consumed) {
                    logToConsole(`${attacker === this.gameState ? "Player" : attacker.name} tried to use ${item.name} but failed.`, 'orange');
                }
            } else {
                logToConsole("Error: InventoryManager not found for item use.", "red");
            }

            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) { this.promptPlayerAttackDeclaration(); return; }
                this.gameState.actionPointsRemaining--; window.turnManager.updateTurnUI();
            } else {
                if (attacker.currentActionPoints > 0) attacker.currentActionPoints--;
            }

            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
                else await this.nextTurn(attacker);
            } else await this.nextTurn(attacker);
            return;
        }

        if (actionType === "Reload") {
            logToConsole(`${attacker === this.gameState ? "Player" : attacker.name} reloads ${this.gameState.pendingCombatAction.weapon?.name || 'weapon'}.`, attacker === this.gameState ? 'lightgreen' : 'gold');
            if (window.audioManager && (attacker.mapPos || attacker === this.gameState)) {
                const reloadSoundPos = attacker === this.gameState ? this.gameState.playerPos : attacker.mapPos;
                let reloadSound = 'ui_click_01.wav'; // Generic placeholder
                if (weapon?.type?.includes("pistol")) {
                    reloadSound = 'ui_click_01.wav'; // TODO: Play reload_pistol_01.wav when available
                } else if (weapon?.type?.includes("rifle")) {
                    reloadSound = 'ui_click_01.wav'; // TODO: Play reload_rifle_01.wav when available (also for SMG if no specific sound)
                } else if (weapon?.type?.includes("shotgun")) {
                    reloadSound = 'ui_click_01.wav'; // TODO: Play reload_shotgun_01.wav when available
                } else if (weapon?.type?.includes("bow")) {
                    reloadSound = 'ui_click_01.wav'; // TODO: Play reload_bow_01.wav or arrow_nock_01.wav when available
                } else if (weapon?.type?.includes("crossbow")) {
                    reloadSound = 'ui_click_01.wav'; // TODO: Play reload_crossbow_01.wav when available
                }
                window.audioManager.playSoundAtLocation(reloadSound, reloadSoundPos, {}, { volume: 0.6 });
            }

            // Actual ammo replenishment logic
            if (weapon && (weapon.type.includes("firearm") || weapon.type.includes("bow") || weapon.type.includes("crossbow"))) {
                const ammoTypeNeeded = weapon.ammoType;
                let ammoFoundInInventory = false;

                // Determine inventory to check
                const invContainer = (attacker === this.gameState) ?
                    this.gameState.inventory.container :
                    (attacker.inventory ? attacker.inventory.container : null);

                if (invContainer && invContainer.items) {
                    const inventoryItems = invContainer.items;
                    for (let i = 0; i < inventoryItems.length; i++) {
                        const invItem = inventoryItems[i];
                        if (invItem.type === "ammunition" && invItem.ammoType === ammoTypeNeeded && invItem.quantity > 0) {
                            weapon.currentAmmo = weapon.magazineSize;
                            invItem.quantity--; // Consume one "box" or "unit" of ammo
                            if (invItem.quantity <= 0) {
                                inventoryItems.splice(i, 1); // Remove empty ammo item
                                logToConsole(`Used up ${invItem.name}.`, 'grey');
                            } else {
                                logToConsole(`Reloaded from ${invItem.name}. Remaining in stack: ${invItem.quantity}`, 'grey');
                            }
                            ammoFoundInInventory = true;
                            logToConsole(`${weapon.name} reloaded. Ammo: ${weapon.currentAmmo}/${weapon.magazineSize}`, 'lightgreen');
                            if (attacker === this.gameState && window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
                            break;
                        }
                    }
                }
                if (!ammoFoundInInventory) {
                    logToConsole(`No ${ammoTypeNeeded} ammo found in inventory to reload ${weapon.name}.`, 'orange');
                    if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                }
            }


            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) { this.promptPlayerAttackDeclaration(); return; }
                this.gameState.actionPointsRemaining--; window.turnManager.updateTurnUI();
            } else {
                // Deduct AP for NPC
                if (attacker.currentActionPoints > 0) attacker.currentActionPoints--;
            }

            // After reload, refresh weapon select to show updated ammo count
            if (attacker === this.gameState) this.populateWeaponSelect();

            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                else if (this.gameState.movementPointsRemaining > 0) this.gameState.combatPhase = 'playerPostAction';
                else await this.nextTurn(attacker);
            } else await this.nextTurn(attacker); return;
        }

        let actionContext = { isGrappling: false, rangeModifier: 0, attackModifier: 0, isBurst: false, isAutomatic: false, isSecondAttack: false, skillToUse: this.gameState.pendingCombatAction.skillToUse };

        const attackerPos = attacker.mapPos || this.gameState.playerPos; // Common attacker position

        if (attackType === 'melee' && defender) {
            if (window.audioManager && attackerPos && !this.isBackgroundSimulation) {
                if (!weapon) {
                    window.audioManager.playSoundAtLocation('melee_unarmed_swing_01.wav', attackerPos);
                } else {
                    let swingSound = 'melee_armed_swing_01.wav'; // Default armed swing
                    if (weapon.id === 'chain_saw_melee') swingSound = 'ui_error_01.wav'; // Placeholder for chainsaw_attack_01.wav
                    else if (weapon.id === 'whip') swingSound = 'ui_click_01.wav'; // Placeholder for whip_crack_01.wav
                    window.audioManager.playSoundAtLocation(swingSound, attackerPos);
                }
            }
            if (window.animationManager && !this.isBackgroundSimulation) {
                if (weapon?.id === 'chain_saw_melee') window.animationManager.playAnimation('chainsawAttack', { attacker, defender, duration: 800, frameDuration: 40 });
                else if (weapon?.id === 'whip') window.animationManager.playAnimation('whipCrack', { attacker, defender, duration: 700 });
                else window.animationManager.playAnimation('meleeSwing', { attacker, x: attackerPos.x, y: attackerPos.y, originalSprite: (attacker === this.gameState ? '☻' : (attacker.sprite || '?')), originalColor: (attacker === this.gameState ? 'green' : (attacker.color || 'white')), duration: 600 });
            }
        } else if (weapon?.type?.includes("thrown") && weapon.type !== "weapon_utility_spray") {
            if (window.audioManager && attackerPos && !this.isBackgroundSimulation) {
                window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.6 }); // Placeholder for throw_item_01.wav
                if (weapon.type === "weapon_thrown_explosive" && weapon.tags?.includes("grenade")) {
                    window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.4 }); // Placeholder for grenade_pin_01.wav (played by attacker)
                }
            }
            if (window.animationManager && !this.isBackgroundSimulation) {
                let targetPos = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos;
                if (attackerPos && targetPos) window.animationManager.playAnimation('throwing', { startPos: attackerPos, endPos: targetPos, sprite: (weapon.sprite || 'o'), color: (weapon.color || 'cyan'), duration: 600, attacker, defender });
            }
        } else if (attackType === 'ranged' && weapon && !weapon.type?.includes("thrown") && weapon.type !== "weapon_utility_spray" && !weapon.tags?.includes("launcher_treated_as_rifle")) {
            // Muzzle Flash Effect
            if (attackerPos && this.gameState.lightSources) {
                const muzzleFlashColor = (weapon.type && weapon.type.includes("laser")) ? "#FF0000" : "#FFFF88"; // Red for lasers, yellow for guns
                const flashLight = {
                    x: attackerPos.x,
                    y: attackerPos.y,
                    z: attackerPos.z,
                    radius: 4, // Short burst of light
                    intensity: 2.0, // Very bright
                    color: muzzleFlashColor,
                    temporary: true,
                    duration: 150 // ms
                };

                this.gameState.lightSources.push(flashLight);
                // Remove it after a short delay
                setTimeout(() => {
                    const idx = this.gameState.lightSources.indexOf(flashLight);
                    if (idx > -1) {
                        this.gameState.lightSources.splice(idx, 1);
                        if (window.mapRenderer) window.mapRenderer.scheduleRender();
                    }
                }, 150);
                if (window.mapRenderer) window.mapRenderer.scheduleRender();
            }

            if (window.audioManager && attackerPos && !this.isBackgroundSimulation) {
                let fireSoundName = 'ui_click_01.wav'; // Default placeholder for generic ranged fire or if specific sound is missing. weapon_empty_click_01.wav is handled before processAttack.
                // Specific fire sounds (actual files are missing, these are placeholders for when they are added)
                if (weapon.type.includes("pistol")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_pistol_01.wav
                else if (weapon.type.includes("submachine_gun")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_smg_01.wav
                else if (weapon.type.includes("rifle") && !weapon.tags?.includes("assault_rifle") && !weapon.tags?.includes("machine_gun")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_rifle_01.wav
                else if (weapon.tags?.includes("assault_rifle")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_ar_loop.wav (needs loop management)
                else if (weapon.type.includes("shotgun")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_shotgun_01.wav
                else if (weapon.tags?.includes("machine_gun")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_mg_loop.wav (needs loop management)
                else if (weapon.type.includes("bow")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_bow_01.wav
                else if (weapon.type.includes("crossbow")) fireSoundName = 'ui_click_01.wav'; // TODO: Play fire_crossbow_01.wav
                window.audioManager.playSoundAtLocation(fireSoundName, attackerPos, {}, { volume: 0.9 });
            }
            if (window.animationManager && !this.isBackgroundSimulation) {
                const defenderPos = defender?.mapPos || this.gameState.defenderMapPos;
                if (attackerPos && defenderPos) {
                    window.animationManager.playAnimation('rangedBullet', { startPos: attackerPos, endPos: defenderPos, sprite: weapon.projectileSprite || '*', color: weapon.projectileColor || 'yellow', duration: 400, attacker, defender });
                    // Placeholder for bullet_whiz_01.wav - could play from a point along the bullet path or near defender if it's a near miss
                    if (window.audioManager) window.audioManager.playSoundAtLocation('ui_click_01.wav', defenderPos, {}, { volume: 0.3, maxDistance: 15 }); // Placeholder for whiz near target
                }
            }
        } else if (weapon?.tags?.includes("launcher_treated_as_rifle") && weapon.explodesOnImpact) { // Launchers (rocket, grenade launcher)
            if (window.audioManager && attackerPos && !this.isBackgroundSimulation) {
                let launchSound = 'ui_error_01.wav'; // Generic loud placeholder
                if (weapon.ammoType?.includes("rocket")) {
                    launchSound = 'fire_rocket_01.wav';
                } else { // Assuming other launchers (e.g., grenade launchers)
                    launchSound = 'fire_launcher_01.wav';
                }
                window.audioManager.playSoundAtLocation(launchSound, attackerPos, {}, { volume: 1.0 });
            }
            // Animation for projectile is handled later in processAttack before explosion
        } else if (weapon?.aoeType === 'cone') {
            const targetPos = this.gameState.defenderMapPos || defender?.mapPos || this.gameState.pendingCombatAction?.targetTile;

            // Audio & Animation
            if (window.audioManager && attackerPos) {
                // Placeholder sound - ideally differentiate based on weapon ID
                window.audioManager.playSoundAtLocation('ui_error_01.wav', attackerPos, {}, { volume: 0.7, loop: false });
            }
            if (window.animationManager && attackerPos && targetPos) {
                if (weapon.id === 'flamethrower') {
                    window.animationManager.playAnimation('flamethrower', {
                        attacker,
                        targetPos,
                        duration: 1500,
                        particleSpawnRate: 15,
                        particleLifetime: 600,
                        coneAngle: Math.PI / 6,
                        maxRange: weapon.effectiveRange || 6
                    });
                } else if (weapon.id === 'pepper_spray') {
                    window.animationManager.playAnimation('gasCloud', {
                        centerPos: attackerPos, // GasCloud uses centerPos as origin
                        coneDirection: targetPos, // And optional direction
                        maxRadius: weapon.effectiveRange || 3,
                        duration: 1500,
                        coneAngle: Math.PI / 6,
                        particleColor: 'orange',
                        particleSpriteOptions: ['*', '⁂', '※'],
                        expansionSpeed: 0.1,
                        activeSpawningDuration: 500
                    });
                }
            }

            // Cone Calculation & Effect Application
            if (targetPos && window.MapUtils) {
                const mapUtils = new window.MapUtils(this.gameState, this.assetManager, window.mapRenderer);
                const coneAngle = Math.PI / 6; // 30 degrees spread
                const range = weapon.effectiveRange || 6;
                const affectedTiles = mapUtils.getTilesInCone(attackerPos, targetPos, coneAngle, range);

                logToConsole(`${weapon.name} sprays a cone effect! Affected tiles: ${affectedTiles.length}`, 'orange');

                // Determine target Z based on aiming
                const targetZ = targetPos.z !== undefined ? targetPos.z : attackerPos.z;
                const distTarget = Math.sqrt(Math.pow(targetPos.x - attackerPos.x, 2) + Math.pow(targetPos.y - attackerPos.y, 2));
                const zDiff = targetZ - attackerPos.z;

                affectedTiles.forEach(tile => {
                    // Calculate interpolated Z for this tile
                    let tileZ = attackerPos.z;
                    if (distTarget > 0) {
                        const distTile = Math.sqrt(Math.pow(tile.x - attackerPos.x, 2) + Math.pow(tile.y - attackerPos.y, 2));
                        const progress = distTile / distTarget;
                        tileZ = Math.round(attackerPos.z + (zDiff * Math.min(1.0, progress)));
                    }

                    // 1. Tile Effects
                    if (weapon.tags?.includes('fire_source') && Math.random() < 0.3) {
                        if (window.fireManager) window.fireManager.igniteTile(tile.x, tile.y, tileZ);
                    }

                    // 2. Entity Effects
                    const entity = this.getCharactersInBlastRadius({ x: tile.x, y: tile.y, z: tileZ }, 0)[0]; // radius 0 = exact tile
                    if (entity && entity !== attacker) {
                        if (weapon.id === 'flamethrower') {
                            const damage = rollDiceNotation(parseDiceNotation(weapon.damage));
                            logToConsole(`${entity.name || entity.id} caught in fire cone at Z:${tileZ}!`, 'orangered');
                            this.applyDamage(attacker, entity, "torso", damage, "Fire", weapon);
                        } else if (weapon.id === 'pepper_spray') {
                            this.applySpecialEffect(attacker, weapon, entity, null);
                        }
                    }
                });
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
            this.gameState.actionPointsRemaining--;

            // Decrement ammo if it's a firearm/bow/crossbow attack
            if (weapon && (weapon.type.includes("firearm") || weapon.type.includes("bow") || weapon.type.includes("crossbow"))) {
                if (weapon.currentAmmo !== undefined && weapon.currentAmmo > 0) {
                    weapon.currentAmmo--;
                    logToConsole(`${weapon.name} ammo: ${weapon.currentAmmo}/${weapon.magazineSize}`, 'grey');
                    // Update the weapon instance in handSlots if it's the player
                    if (attacker === this.gameState) {
                        const handSlotIndex = this.gameState.inventory.handSlots.findIndex(slotItem => slotItem && slotItem.id === weapon.id);
                        if (handSlotIndex !== -1) {
                            this.gameState.inventory.handSlots[handSlotIndex] = { ...weapon }; // Update with new ammo count
                        }
                    }
                }
            }
            window.turnManager.updateTurnUI();

        } else if (actionType === "grapple") {
            // Grapple attempt sound (melee_grapple_attempt_01.wav)
            if (window.audioManager && attackerPos) window.audioManager.playSoundAtLocation('ui_click_01.wav', attackerPos, {}, { volume: 0.6 }); // Placeholder
            this.nextTurn(attacker); return;
        }


        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const defenderName = defender ? ((defender === this.gameState) ? "Player" : defender.name) : "Tile";
        let attackResult, defenseResult, hit = false;
        const animationPromises = []; // To store promises from animations
        let coverBonus = 0;

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
                // logToConsole(`[CombatManager перед LOS Ranged] Tilesets: ${!!currentTilesetsForLOS} (Keys: ${currentTilesetsForLOS ? Object.keys(currentTilesetsForLOS).length : 'N/A'}), MapData: ${!!currentMapDataForLOS}, Levels: ${currentMapDataForLOS ? !!currentMapDataForLOS.levels : 'N/A'}`, 'purple');
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
                // Perk: Eagle Eye (for melee? no, range usually. Wait, Eagle Eye is vision)
                // Perk: Grapple Specialist handled in grapple logic.
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

        // Calculate Cover Bonus
        if (defender && defender.mapPos && attacker && (attacker.mapPos || attacker === this.gameState)) {
            const attackerPosition = (attacker === this.gameState) ? this.gameState.playerPos : attacker.mapPos;
            if (attackerPosition) { // Ensure attackerPosition is valid
                coverBonus = this.getDefenderCoverBonus(attackerPosition, defender); // Pass attacker's actual position

                // Perk: Squad Leader (Cha) - Allies within 5 tiles increase cover bonus by +1
                if (defender !== this.gameState && defender.teamId === this.gameState.player.teamId && window.perkManager && window.perkManager.hasPerk("Squad Leader")) {
                    const distToLeader = getDistance3D(this.gameState.playerPos, defender.mapPos);
                    if (distToLeader <= 5 && coverBonus > 0) {
                        coverBonus += 1;
                        logToConsole("Squad Leader bonus applied to cover.", "cyan");
                    }
                }
            }
        }

        if (attackType === 'ranged' && weapon) {
            const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
            const targetMapPos = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos;

            if (attackerMapPos && targetMapPos) {
                const distance = getDistance3D(attackerMapPos, targetMapPos);
                actionContext.isGrappling = attacker.statusEffects?.isGrappled && attacker.statusEffects.grappledBy === (defender === this.gameState.player ? 'player' : defender?.id);
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

        // --- Attacker's Roll ---
        actionContext.detailedModifiers = []; // Ensure it's reset for attacker
        attackResult = this.calculateAttackRoll(attacker, weapon, defender ? intendedBodyPart : null, actionContext);

        const isPlayerInvolved = (attacker === this.gameState || attacker === this.gameState.player) || (defender && (defender === this.gameState || defender === this.gameState.player));

        if (isPlayerInvolved) {
            const attackerDisplayPromise = window.animationManager.playAnimation('diceRoll', {
                diceNotation: '1d20', // This is mostly for display if fixedNaturalRoll is provided
                fixedNaturalRoll: attackResult.naturalRoll,
                fixedResult: attackResult.roll,
                rollingEntityName: `${attackerName} Attack`,
                entity: attacker,
                modifiers: attackResult.detailedModifiers,
                duration: 1500 + (attackResult.detailedModifiers.length * 500),
                onComplete: (finalDisplayValue) => { // finalDisplayValue should match attackResult.roll
                    logToConsole(`ATTACK: ${attackerName} targets ${defender ? defenderName + "'s " + intendedBodyPart : "tile"} with ${weapon ? weapon.name : 'Unarmed'}. Final Roll: ${finalDisplayValue} (Natural: ${attackResult.naturalRoll})`);
                }
            });
            animationPromises.push(attackerDisplayPromise);
        } else {
            logToConsole(`ATTACK: ${attackerName} targets ${defender ? defenderName + "'s " + intendedBodyPart : "tile"} with ${weapon ? weapon.name : 'Unarmed'}. Final Roll: ${attackResult.roll} (Natural: ${attackResult.naturalRoll})`);
        }
        await Promise.all(animationPromises);
        animationPromises.length = 0;


        // --- Defender's Roll (if applicable) ---
        if (defender) {
            const defChoiceType = (defender === this.gameState ? this.gameState.playerDefenseChoice?.type : this.gameState.npcDefenseChoice) || "Dodge";
            let defenderActionContext = { detailedModifiers: [] }; // Reset for defender

            if (defChoiceType !== "None") {
                defenseResult = this.calculateDefenseRoll(defender, defChoiceType, weapon, coverBonus, defenderActionContext);

                if (isPlayerInvolved) {
                    const defenderDisplayPromise = window.animationManager.playAnimation('diceRoll', {
                        diceNotation: '1d20',
                        fixedNaturalRoll: defenseResult.naturalRoll,
                        fixedResult: defenseResult.roll,
                        rollingEntityName: `${defenderName} Defense`,
                        entity: defender,
                        modifiers: defenseResult.detailedModifiers,
                        duration: 1500 + ((defenseResult.detailedModifiers ? defenseResult.detailedModifiers.length : 0) * 500),
                        onComplete: (finalDisplayValue) => {
                            logToConsole(`DEFENSE: ${defenderName} (${defChoiceType} - ${defenseResult.defenseSkillName}). Final Roll: ${finalDisplayValue} (Natural: ${defenseResult.naturalRoll})`);
                            if (defChoiceType.toLowerCase().includes("block") && window.audioManager && (defender.mapPos || defender === this.gameState)) { /* ... play block sound ... */ }
                        }
                    });
                    animationPromises.push(defenderDisplayPromise);
                } else {
                    logToConsole(`DEFENSE: ${defenderName} (${defChoiceType} - ${defenseResult.defenseSkillName}). Final Roll: ${defenseResult.roll} (Natural: ${defenseResult.naturalRoll})`);
                    if (defChoiceType.toLowerCase().includes("block") && window.audioManager && (defender.mapPos || defender === this.gameState)) { /* ... play block sound ... */ }
                }
            } else { // Passive defense
                defenseResult = this.calculateDefenseRoll(defender, "None", weapon, coverBonus, defenderActionContext);
                logToConsole(`DEFENSE: ${defenderName} (None - Ranged). Effective defense from cover: ${defenseResult.roll}`, defender === this.gameState ? 'lightblue' : 'gold');
                // Optionally, animate passive defense value if desired, e.g., with a simpler ModifierPopupAnimation
                if (isPlayerInvolved && defenseResult.roll !== 0 && defenseResult.detailedModifiers.length > 0) {
                    animationPromises.push(window.animationManager.playAnimation('modifierPopup', {
                        text: `Passive Defense: ${defenseResult.roll}`,
                        position: { x: '60%', y: '40%' }, // Example position
                        entity: defender,
                        color: 'lightblue',
                        duration: 1500
                    }));
                }
            }
            await Promise.all(animationPromises);
            animationPromises.length = 0;

            // Determine Hit or Miss
            if (attackResult.isCriticalHit) hit = true;
            else if (attackResult.isCriticalMiss) hit = false;
            else if (defenseResult.isCriticalFailure && defChoiceType !== "None") hit = true;
            else if (defenseResult.isCriticalSuccess && defChoiceType !== "None" && !attackResult.isCriticalHit) hit = false;
            else hit = attackResult.roll > defenseResult.roll;

            if (isPlayerInvolved) {
                animationPromises.push(
                    window.animationManager.playAnimation('hitMissLabel', {
                        text: hit ? "Hit!" : "Miss!",
                        position: { x: '50%', y: '50%' }, // Centered
                        entity: defender // Show near defender
                    }).then(() => {
                        logToConsole(hit ? `RESULT: Hit! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.` : `RESULT: Miss! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.`, hit ? (attacker === this.gameState ? 'lightgreen' : 'orange') : (attacker === this.gameState ? 'orange' : 'lightgreen'));
                        if (window.audioManager && (attackerPos || defender?.mapPos)) { /* ... play crit sounds ... */ }
                    })
                );
            } else {
                logToConsole(hit ? `RESULT: Hit! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.` : `RESULT: Miss! Attack ${attackResult.roll} vs Defense ${defenseResult.roll}.`, hit ? (attacker === this.gameState ? 'lightgreen' : 'orange') : (attacker === this.gameState ? 'orange' : 'lightgreen'));
                if (window.audioManager && (attackerPos || defender?.mapPos)) { /* ... play crit sounds ... */ }
            }
            await Promise.all(animationPromises);
            animationPromises.length = 0;

        } else if (weapon?.type === "weapon_thrown_explosive" || (weapon?.type === "weapon_thrown_utility")) {
            hit = true; // For area effects, 'hit' means it lands as intended.
            animationPromises.push(
                window.animationManager.playAnimation('hitMissLabel', {
                    text: "Targeted!", // Or "Landed!"
                    position: { x: '50%', y: '50%' },
                    color: 'lightblue'
                }).then(() => {
                    logToConsole(`RESULT: ${weapon.name} lands at targeted tile.`, attacker === this.gameState ? 'lightgreen' : 'gold');
                })
            );
            await Promise.all(animationPromises);
            animationPromises.length = 0;
        }


        if (weapon?.specialEffect && (hit || weapon.type?.includes("utility"))) {
            this.applySpecialEffect(attacker, weapon, (defender && hit ? defender : null), this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos || attacker?.mapPos || this.gameState.playerPos);
        }

        // Unarmed Block Failure Logic
        if (hit && defender && ((defender === this.gameState ? this.gameState.playerDefenseChoice?.type : this.gameState.npcDefenseChoice) || "Dodge") === "BlockUnarmed") {
            if (defenseResult.naturalRoll <= 5) { // Failed by <= 5 margin logic, simplified to roll check as requested "On a failed unarmed block by <=5" usually implies margin, but natural roll is easier to track.
                // Actually, user said: "On a failed unarmed block by <=5, the blocking limb takes the hit, by >=6, the intended target is hit."
                // This usually means Margin of Failure. Failure Margin = Attack Roll - Defense Roll.
                // If I missed (Attack > Defense), then Margin = Attack - Defense.
                const margin = attackResult.roll - defenseResult.roll;
                if (margin <= 5) {
                    const blockingLimb = (defender === this.gameState ? this.gameState.playerDefenseChoice?.blockingLimb : null) || "leftArm"; // Default limb
                    intendedBodyPart = blockingLimb;
                    logToConsole(`Block partially failed (Margin ${margin}). Damage redirected to blocking limb (${blockingLimb}).`, 'orange');
                } else {
                    logToConsole(`Block failed significantly (Margin ${margin}). Hit connects to intended target (${intendedBodyPart}).`, 'red');
                }
            }
        }

        // Fire Source Logic (Ignition)
        if (weapon?.tags?.includes("fire_source")) {
            const targetTile = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos;
            if (targetTile && window.fireManager) {
                // Ignite center
                window.fireManager.igniteTile(targetTile.x, targetTile.y, targetTile.z);
                // Ignite neighbors (Area Effect on Impact)
                const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
                neighbors.forEach(n => {
                    window.fireManager.igniteTile(targetTile.x + n.dx, targetTile.y + n.dy, targetTile.z);
                });
            }
        }

        // Extinguish Logic
        if (weapon?.tags?.includes("extinguish_source")) {
            const targetTile = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || this.gameState.defenderMapPos;
            if (targetTile && window.fireManager) {
                window.fireManager.extinguishTile(targetTile.x, targetTile.y, targetTile.z);
            }
        }

        const isThrownExplosive = weapon?.type === "weapon_thrown_explosive";

        let weaponDef = null;
        if (weapon && weapon.id) {
            weaponDef = this.assetManager.getItem(weapon.id);
        }

        // Use properties from template if missing on instance (handling save migration/stale instances)
        const weaponExplodes = weapon?.explodesOnImpact || weaponDef?.explodesOnImpact;
        const weaponBurstRadius = weapon?.burstRadiusFt || weaponDef?.burstRadiusFt;

        const isImpactLauncher = weaponExplodes && !isThrownExplosive; // e.g. Rocket Launcher, Grenade Launcher
        // For thrown explosives, the explosiveProps come from the weapon itself (e.g. frag_grenade_thrown)
        // For launchers, explosiveProps come from the loaded ammo type (e.g. 40mm_grenade_frag for M79)
        let explosiveProps = null;
        if (isThrownExplosive) {
            explosiveProps = weapon;
        } else if (isImpactLauncher && weapon) {
            if (weapon.ammoType) {
                explosiveProps = this.assetManager.getItem(weapon.ammoType);
            }
            // Fallback: If ammo definition missing OR ammo lacks burst radius (generic ammo) but weapon has it
            if (!explosiveProps || (!explosiveProps.burstRadiusFt && weaponBurstRadius)) {
                // Determine which object to use for properties. We need one with the burst radius.
                if (weapon.burstRadiusFt) explosiveProps = weapon;
                else if (weaponDef && weaponDef.burstRadiusFt) explosiveProps = weaponDef;
                else explosiveProps = weapon; // Should not happen if weaponBurstRadius is true
            }
        }

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

                const explosionOptions = {
                    canDodge: isThrownExplosive,
                    attackRoll: attackResult.roll,
                    dodgeEligibilityCallback: (char) => {
                        return (char !== defender || (char === defender && !hit));
                    }
                };

                this.handleExplosion(
                    determinedImpactTile.x,
                    determinedImpactTile.y,
                    determinedImpactTile.z,
                    burstRadiusTiles,
                    explosiveProps.damage,
                    explosiveProps.damageType,
                    attacker,
                    weapon,
                    explosionOptions
                );
            }
        }
        // Consume Aiming Effect if used
        if (attacker.aimingEffect) {
            attacker.aimingEffect = false;
            logToConsole(`${attackerName} is no longer aiming.`, 'grey');
        }

        if (hit && !explosionProcessed && defender) {
            let actualTargetBodyPart = intendedBodyPart;
            let numHitsCalc = 1;
            if (attackType === "ranged" && weapon?.type.includes("firearm")) {
                if (actionContext.isBurst) numHitsCalc = rollDie(3);
                else if (actionContext.isAutomatic) numHitsCalc = Math.min(rollDie(6), rollDie(6));
                if (numHitsCalc > 1) logToConsole(`${fireMode} fire: ${numHitsCalc} shots connect.`, 'grey');
            }
            this.gameState.combatPhase = 'applyDamage';
            if (attackType === 'melee') {
                await this.calculateAndApplyMeleeDamage(attacker, defender, weapon, hit, attackResult.naturalRoll, defenseResult.naturalRoll, actualTargetBodyPart);
            } else if (attackType === 'ranged' && !isImpactLauncher) {
                // Damage roll animation for ranged
                if (weapon && weapon.damage) {
                    let damageRollResult = 0;
                    // Damage roll animation should appear near the defender
                    animationPromises.push(
                        window.animationManager.playAnimation('diceRoll', {
                            diceNotation: weapon.damage,
                            position: { x: '50%', y: '60%' }, // Fallback position
                            entity: defender, // Show near defender
                            onComplete: (result) => { damageRollResult = result; }
                        }).then(() => {
                            logToConsole(`Damage Roll (${weapon.damage}): ${damageRollResult}`, 'grey');
                            // Pass the rolled damage to calculateAndApplyRangedDamage, or modify it to use pre-rolled.
                            // For now, calculateAndApplyRangedDamage rolls its own. This animation is just visual.
                            // To make it use this roll, calculateAndApplyRangedDamage would need modification.
                        })
                    );
                    await Promise.all(animationPromises);
                    animationPromises.length = 0;
                }
                await this.calculateAndApplyRangedDamage(attacker, defender, weapon, actualTargetBodyPart, hit, attackResult, numHitsCalc);
            }
        }

        if (hit && defender && weapon?.id === 'molotov_cocktail_thrown') {
            const impactTileMolotov = defender.mapPos || this.gameState.defenderMapPos || this.gameState.pendingCombatAction?.targetTile;
            if (impactTileMolotov) {
                if (window.audioManager) {
                    window.audioManager.playSoundAtLocation('ui_error_01.wav', impactTileMolotov, {}, { volume: 0.8 }); // Placeholder for molotov_ignite_01.wav (when available)
                    // Persistent fire sound is handled by FireManager detecting the new fire.
                }
                if (window.animationManager) window.animationManager.playAnimation('explosion', { centerPos: impactTileMolotov, radius: 1, explosionSprites: ['~', '≈', '*', '#'], color: 'orange', duration: 1500, sourceWeapon: weapon, attacker }); // This is a generic explosion, could be a specific fire spread animation.
            }
        } else if (weapon?.id === 'thermite_grenade_thrown' && hit) { // Thermite
            const impactTileThermite = this.gameState.pendingCombatAction?.targetTile || defender?.mapPos || (attacker.mapPos || this.gameState.playerPos);
            if (window.audioManager && impactTileThermite) {
                // Play thermite loop with a set duration. AudioManager now handles the duration stop.
                // Placeholder: ui_error_01.wav is used until thermite_loop.wav is available.
                window.audioManager.playSoundAtLocation('ui_error_01.wav', impactTileThermite, {}, { volume: 0.7, loop: true, duration: 5000 });
            }
            if (window.fireManager && impactTileThermite) {
                const burstRadiusTiles = Math.ceil((weapon.burstRadiusFt || 5) / 5);
                logToConsole(`THERMITE: Igniting area at (${impactTileThermite.x},${impactTileThermite.y}) with radius ${burstRadiusTiles}.`, 'orangered');

                // Ignite center
                window.fireManager.igniteTile(impactTileThermite.x, impactTileThermite.y, impactTileThermite.z);

                // Ignite radius
                for (let dx = -burstRadiusTiles; dx <= burstRadiusTiles; dx++) {
                    for (let dy = -burstRadiusTiles; dy <= burstRadiusTiles; dy++) {
                        if (Math.sqrt(dx * dx + dy * dy) <= burstRadiusTiles) {
                            window.fireManager.igniteTile(impactTileThermite.x + dx, impactTileThermite.y + dy, impactTileThermite.z);
                        }
                    }
                }
            }
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
                            this.applyDamage(attacker, splashTarget, "torso", splashDamageAmount, "Acid", { name: "Acid Splash" });
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
                    this.gameState.inventory.handSlots[handIdx] = null;
                    if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
                    if (this.gameState.combatPhase === 'playerAttackDeclare') this.populateWeaponSelect();
                } else logToConsole(`WARN: Thrown item ${itemUsed?.name} not found in player hands to remove.`, 'orange');
            }
        }

        if (this.gameState.isInCombat) {
            // Clear ranged attack display data after processing the attack
            if (this.gameState.rangedAttackData) {
                this.gameState.rangedAttackData = null;
                // logToConsole("Ranged attack data cleared after attack processing.", 'grey');
            }

            const defenderHealth = (defender === this.gameState) ? this.gameState.player.health : defender.health;
            const isHeadDestroyed = defenderHealth?.head?.current <= 0 && (defenderHealth.head.isDestroyed || defenderHealth.head.crisisTimer === 0);
            const isTorsoDestroyed = defenderHealth?.torso?.current <= 0 && (defenderHealth.torso.isDestroyed || defenderHealth.torso.crisisTimer === 0);

            if (defender && defenderHealth && (isHeadDestroyed || isTorsoDestroyed)) {
                // Check if the entity is already marked as defeated or removed to avoid double processing
                const stillInInitiative = this.initiativeTracker.find(e => e.entity === defender);
                if (stillInInitiative) { // Only process if they haven't been removed by, say, an explosion already
                    logToConsole(`DEFEATED: ${defenderName} has fallen!`, 'red');
                    if (defender !== this.gameState) {
                        if (window.inventoryManager && typeof window.inventoryManager.createCorpse === 'function') {
                            window.inventoryManager.createCorpse(defender);
                        } else if (window.inventoryManager && typeof window.inventoryManager.dropInventory === 'function') {
                            window.inventoryManager.dropInventory(defender);
                        }
                    }

                    if (defender !== this.gameState && !defender.xpAwardedThisDamageEvent) {
                        if (defender.cr !== undefined && window.xpManager) {
                            logToConsole(`CombatManager: NPC ${defenderName} defeated. Awarding XP.`, 'lime');
                            window.xpManager.awardXp(window.xpManager.calculateXpForKill(defender.cr), this.gameState);
                        }
                        // Update Quests
                        if (window.proceduralQuestManager && typeof window.proceduralQuestManager.checkObjectiveCompletion === 'function') {
                            window.proceduralQuestManager.checkObjectiveCompletion({ type: "npc_killed", npcId: defender.id, npcTags: defender.tags || [], definitionId: defender.definitionId });
                        }
                        if (window.questManager && typeof window.questManager.updateObjective === 'function') {
                            window.questManager.updateObjective("kill", defender.id);
                            window.questManager.updateObjective("kill", defender.definitionId);
                            if (defender.tags) {
                                defender.tags.forEach(tag => window.questManager.updateObjective("kill", tag));
                            }
                        }
                    }

                    this.initiativeTracker = this.initiativeTracker.filter(entry => entry.entity !== defender);

                    const npcIndex = this.gameState.npcs.findIndex(n => n.id === defender.id);
                    if (npcIndex !== -1) {
                        this.gameState.npcs.splice(npcIndex, 1);
                    }

                    if (defender === this.gameState) { this.endCombat(); window.gameOver(this.gameState); return; }
                    window.mapRenderer.scheduleRender();
                }
            }
            // Check for victory condition: No hostile NPCs left who are alive OR in crisis (if we consider crisis as defeated, we might end combat, but if they can act/heal, we shouldn't)
            // If they are in crisis, they are still in initiativeTracker. So checking initiativeTracker length/contents is key.
            // If we want them to act (heal), they must count as "active".
            const activeHostiles = this.initiativeTracker.filter(e => !e.isPlayer && ((e.entity.health?.torso?.current > 0 || e.entity.health?.torso?.crisisTimer > 0) && (e.entity.health?.head?.current > 0 || e.entity.health?.head?.crisisTimer > 0)));
            const activePlayers = this.initiativeTracker.filter(e => e.isPlayer && ((e.entity.health?.torso?.current > 0 || e.entity.health?.torso?.crisisTimer > 0) && (e.entity.health?.head?.current > 0 || e.entity.health?.head?.crisisTimer > 0)));

            if (activeHostiles.length === 0 && activePlayers.length > 0) {
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

            // Set AP/MP to their expected next-turn values immediately for visual feedback
            const derivedStats = window.calculateDerivedStats ? window.calculateDerivedStats(this.gameState) : {};
            const maxAP = derivedStats["Action Points"] || this.gameState.player.defaultActionPoints || 1;
            const maxSpeedFeet = derivedStats["Movement Speed"] || 30;
            const maxMP = Math.floor(maxSpeedFeet / 5);
            const currentDebt = this.gameState.player.movementDebt || 0;
            const debtTiles = Math.floor(currentDebt / 5);

            this.gameState.actionPointsRemaining = maxAP;
            this.gameState.movementPointsRemaining = Math.max(0, maxMP - debtTiles);
            // Do NOT reset movementDebt here; it must persist until nextTurn actually processes it.

            window.turnManager.updateTurnUI();
            this.nextTurn(this.gameState);
        } else logToConsole("Cannot end player turn: Not in combat or not player's turn.", 'orange');
    }

    handleAimAction() {
        if (this.gameState.actionPointsRemaining <= 0) {
            logToConsole("Not enough Action Points to Aim.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        logToConsole("Player takes aim! (Advantage on next attack)", "lightgreen");
        if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav'); // Needs a specific sound potentially

        this.gameState.player.aimingEffect = true;
        this.gameState.actionPointsRemaining--;
        window.turnManager.updateTurnUI();

        // Aim consumes the action. If the player has MP left, they can move, or end turn.
        // We hide the attack UI to indicate the 'Attack' action is done (replaced by Aim).
        // The player is now in the 'playerPostAction' phase or similar.
        document.getElementById('attackDeclarationUI')?.classList.add('hidden');

        if (this.gameState.movementPointsRemaining > 0) {
            this.gameState.combatPhase = 'playerPostAction';
            logToConsole("Action spent. Move or End Turn (T).", "lightblue");
        } else {
            this.endPlayerTurn();
        }
    }

    handleReloadActionDeclaration() {
        // Crippled Arm Check for Reload
        const health = this.gameState.player.health;
        const isLeftCrippled = health && health.leftArm && health.leftArm.current <= 0;
        const isRightCrippled = health && health.rightArm && health.rightArm.current <= 0;
        if (isLeftCrippled || isRightCrippled) { // Reloading typically requires two hands
             logToConsole("Cannot reload with a crippled arm!", 'red');
             return;
        }

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

        // Crippled Arm Check for Grapple
        const health = this.gameState.player.health;
        const isLeftCrippled = health && health.leftArm && health.leftArm.current <= 0;
        const isRightCrippled = health && health.rightArm && health.rightArm.current <= 0;
        if (isLeftCrippled || isRightCrippled) { // Grapple requires arms
             logToConsole("Cannot grapple with a crippled arm!", 'red');
             this.promptPlayerAttackDeclaration();
             return;
        }

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
        const attackerRoll = rollDie(20) + getSkillModifier("Unarmed", attacker);
        const defenderRoll = rollDie(20) + getSkillModifier("Unarmed", defender);
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

    handleReleaseGrapple() {
        if (!this.gameState.statusEffects?.isGrappling || this.gameState.statusEffects.grappledBy !== 'player') {
            logToConsole("You are not grappling anyone to release.", "orange");
            return;
        }
        const targetId = this.gameState.statusEffects.grappledTargetId;
        const targetNpc = this.gameState.npcs.find(npc => npc.id === targetId);

        if (targetNpc && targetNpc.statusEffects) {
            targetNpc.statusEffects.isGrappled = false;
            targetNpc.statusEffects.grappledBy = null;
        }
        this.gameState.statusEffects.isGrappling = false;
        this.gameState.statusEffects.grappledBy = null;
        this.gameState.statusEffects.grappledTargetId = null;

        logToConsole(`You released ${targetNpc ? targetNpc.name : 'the target'}.`, 'lightgreen');
        if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav'); // Placeholder for grapple_release_01.wav

        // Refresh UI elements that might depend on grapple state
        this.populateWeaponSelect();
        this.updateCombatUI();
        // If releasing grapple costs an action or ends turn, handle that here
        // For now, assume it's a free action or part of another action's resolution.
        // If it costs AP:
        // this.gameState.actionPointsRemaining--;
        // window.turnManager.updateTurnUI();
        // if (this.gameState.actionPointsRemaining <= 0) this.nextTurn(this.gameState);
        // else this.promptPlayerAttackDeclaration();
    }

    getDefenderCoverBonus(attackerPosition, defender) { // attackerPosition is the actual {x,y,z} of the attacker
        if (!attackerPosition || !defender || !defender.mapPos) return 0;

        const losLine = getLine3D(attackerPosition.x, attackerPosition.y, attackerPosition.z,
            defender.mapPos.x, defender.mapPos.y, defender.mapPos.z);
        if (!losLine || losLine.length < 2) return 0;

        let maxCoverBonus = 0;
        // Add cover from defender's posture
        if (defender === this.gameState && this.gameState.playerPosture === 'crouching') {
            maxCoverBonus = Math.max(maxCoverBonus, 2); // Example: +2 for crouching
        } else if (defender === this.gameState && this.gameState.playerPosture === 'prone') {
            maxCoverBonus = Math.max(maxCoverBonus, 4); // Example: +4 for prone
        }
        // For NPCs, you'd need an npc.posture property
        else if (defender.posture === 'crouching') {
            maxCoverBonus = Math.max(maxCoverBonus, 2);
        } else if (defender.posture === 'prone') {
            maxCoverBonus = Math.max(maxCoverBonus, 4);
        }

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
            const attackerNameForLog = attackerPosition === this.gameState.playerPos ? "Player" : (attackerPosition.name || "Attacker"); // Assuming attackerPosition might be an entity or just pos
            logToConsole(`${defender.name || "Defender"} gets +${maxCoverBonus} 3D cover bonus against ${attackerNameForLog}.`, 'grey');
        }
        return maxCoverBonus;
    }

    distributeExplosionDamage(attacker, target, totalDamage, damageType, weapon) {
        if (!target.health) return;
        const bodyParts = ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];
        let damageRemaining = totalDamage;
        const damageDistributionLog = [];

        // First pass: Apply 1 point of damage to each part until damage runs out or all parts hit
        for (const partName of bodyParts) {
            if (damageRemaining <= 0) break;
            if (target.health[partName]) {
                this.applyDamage(attacker, target, partName, 1, damageType, weapon);
                damageDistributionLog.push(`1 to ${partName}`);
                damageRemaining--;
            }
        }

        // Second pass: Distribute remaining damage randomly
        while (damageRemaining > 0) {
            const randomPartName = bodyParts[Math.floor(Math.random() * bodyParts.length)];
            if (target.health[randomPartName]) {
                // Check if the part is already destroyed (currentHP is 0 and crisis timer is 0 after a fatal hit)
                if (target.health[randomPartName].current <= 0 && target.health[randomPartName].crisisTimer === 0 && target.health[randomPartName].isDestroyed) {
                    // If part is destroyed, try to pick another part or log that damage is "lost" on this part
                    // For simplicity, we'll just skip applying more damage to an already catastrophically destroyed part.
                    // A more complex system might check if *any* part can still take damage.
                    const canTakeMoreDamage = bodyParts.some(p => target.health[p] && (target.health[p].current > 0 || (target.health[p].current === 0 && target.health[p].crisisTimer > 0)));
                    if (!canTakeMoreDamage) {
                        logToConsole(`No body parts can take further damage on ${target.name || target.id}. ${damageRemaining} damage points unapplied.`, 'grey');
                        break;
                    }
                    continue; // Skip to next iteration to pick another part
                }

                this.applyDamage(attacker, target, randomPartName, 1, damageType, weapon);
                damageDistributionLog.push(`1 to ${randomPartName} (additional)`);
                damageRemaining--;
            }
        }
        logToConsole(`Explosion damage distribution for ${target.name || target.id}: ${damageDistributionLog.join(', ')}. Total: ${totalDamage}`, 'orange');
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
        // Ensure bodyPartName matches the camelCase keys used in initializeHealth (e.g., "leftArm")
        // The bodyPartName coming from UI or random distribution should already be in correct camelCase.
        // Convert to lowercase for reliable access, as health object keys are lowercase.
        let accessKey = bodyPartName;
        // logToConsole(`[applyDamage Debug] Received bodyPartName: "${bodyPartName}", Access Key: "${accessKey}" for ${entity.name || entity.id || 'Player'}`, 'purple'); // DIAGNOSTIC LOG

        const entityName = (entity === this.gameState || entity === this.gameState.player) ? "Player" : (entity.name || entity.id);
        const isPlayerVictim = (entity === this.gameState || entity === this.gameState.player);

        let part = null;
        if (isPlayerVictim && this.gameState.player.health && this.gameState.player.health[accessKey]) {
            part = this.gameState.player.health[accessKey];
        } else if (!isPlayerVictim && entity.health && entity.health[accessKey]) {
            part = entity.health[accessKey];
        }

        if (!part) {
            // Fallback for entities that don't have the targeted part (e.g. blobs with only Torso)
            const availableParts = isPlayerVictim ? Object.keys(this.gameState.player?.health || {}) : Object.keys(entity.health || {});
            let fallbackPart = null;
            if (availableParts.includes("torso")) fallbackPart = "torso";
            else if (availableParts.includes("body")) fallbackPart = "body";
            else if (availableParts.length > 0) fallbackPart = availableParts[0];

            if (fallbackPart) {
                logToConsole(`Target has no ${accessKey}. Redirecting damage to ${fallbackPart}.`, 'orange');
                accessKey = fallbackPart;
                part = isPlayerVictim ? this.gameState.player.health[accessKey] : entity.health[accessKey];
            } else {
                logToConsole(`Error: Invalid body part '${accessKey}' and no fallback found for ${entityName}. Available keys: ${JSON.stringify(availableParts)}`, 'red');
                return;
            }
        }

        const effectiveArmor = isPlayerVictim ? window.getArmorForBodyPart(accessKey, entity) : (entity.armor?.[accessKey] || 0);

        // Perk: Breaker (Str) - Melee attacks ignore 1 point of armor
        if (attacker === this.gameState && weapon?.type?.includes("melee") && window.perkManager && window.perkManager.hasPerk("Breaker")) {
            effectiveArmor = Math.max(0, effectiveArmor - 1);
        }

        // Perk: Thick-Skinned (Con) - Reduce incoming Fire, Explosive, and Acid damage by 1
        let damageReduction = 0;
        if (isPlayerVictim && window.perkManager && window.perkManager.hasPerk("Thick-Skinned") && ["Fire", "Explosive", "Acid"].includes(damageType)) {
            damageReduction = 1;
        }

        // Fire Vulnerability
        if (entity.tags?.includes("vulnerable_fire") && damageType === "Fire") {
            damageAmount *= 2;
            logToConsole(`${entityName} is vulnerable to fire! Double damage.`, 'orange');
        }

        // Physical Impact Vulnerability (e.g. Bio-Muncher)
        if (entity.tags?.includes("vulnerable_physical_rupture") && (damageType === "Bludgeoning" || damageType === "Physical") && damageAmount >= 5) {
            // Rupture effect: Prevent enzymes/incapacitate
            if (!entity.statusEffects) entity.statusEffects = {};
            if (!entity.statusEffects["ruptured"]) {
                entity.statusEffects["ruptured"] = { id: "ruptured", displayName: "Ruptured", duration: 3, description: "Ruptured. Enzymes disabled. Incapacitated." };
                // Stun logic is separate, but we can add "stunned" status too or just rely on Ruptured logic in AI
                entity.statusEffects["stunned"] = { id: "stunned", displayName: "Stunned (Ruptured)", duration: 2, description: "Incapacitated by rupture." };
                if (entity !== this.gameState) entity.currentActionPoints = 0;
                else this.gameState.actionPointsRemaining = 0;
                logToConsole(`${entityName} ruptures from heavy impact! Incapacitated.`, 'magenta');
            }
        }

        const reducedDamage = Math.max(0, damageAmount - effectiveArmor - damageReduction);
        const soundPosition = isPlayerVictim ? this.gameState.playerPos : entity.mapPos;

        if (reducedDamage > 0 && window.animationManager) {
            window.animationManager.playAnimation('bloodSplash', {
                entity: entity,
                duration: 600
            });
        }

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


        logToConsole(`DAMAGE${bulletNum > 0 ? ` (Bullet ${bulletNum}/${totalBullets})` : ''}: ${(attacker === this.gameState ? "Player" : (attacker ? attacker.name : "Environment"))}'s ${weapon ? weapon.name : "Unarmed"} deals ${reducedDamage} ${damageType} to ${entityName}'s ${bodyPartName} (Raw: ${damageAmount}, Armor: ${effectiveArmor}).`, (attacker === this.gameState && !isPlayerVictim) ? 'orange' : 'indianred');
        part.current = Math.max(0, part.current - reducedDamage);
        logToConsole(`INFO: ${entityName} ${accessKey} HP: ${part.current}/${part.max}.`, isPlayerVictim ? 'lightblue' : 'gold');
        this.shareAggroWithTeam(entity, attacker, damageAmount);

        // --- Bleeding Logic Check (Start) ---
        // If an arm or leg hits 0 HP, apply Bleeding 1.
        // If a crippled limb (HP 0) takes damage, increase Bleeding by 1.
        // Only if actual damage was taken (>0).
        if (["leftArm", "rightArm", "leftLeg", "rightLeg"].includes(accessKey) && reducedDamage > 0) {
            let shouldBleed = false;
            if (part.current === 0) {
                // If it just hit 0 (reducedDamage > 0 ensures it wasn't 0 before unless damage taken),
                // or was already 0 and took damage.
                shouldBleed = true;
            }

            if (shouldBleed) {
                if (!entity.statusEffects) entity.statusEffects = {};
                let bleedEffect = entity.statusEffects.bleeding;
                if (!bleedEffect) {
                    entity.statusEffects.bleeding = {
                        id: "bleeding",
                        displayName: "Bleeding",
                        value: 1, // Start at Bleeding 1
                        duration: 999, // Persists until treated
                        description: "Taking damage to Torso at end of turn. Treat to stop."
                    };
                    logToConsole(`${entityName} starts Bleeding (1).`, isPlayerVictim ? 'red' : 'orange');
                } else {
                    bleedEffect.value += 1;
                    logToConsole(`${entityName}'s Bleeding increased to ${bleedEffect.value}.`, isPlayerVictim ? 'red' : 'orange');
                }
            }
        }
        // --- Bleeding Logic Check (End) ---

        if (part.current === 0) {
            const fmtPartName = window.formatBodyPartName ? window.formatBodyPartName(accessKey) : accessKey.toUpperCase();
            // Check if already in crisis from a *previous* hit and now hit again
            if (part.crisisTimer > 0) {
                logToConsole(`FATAL HIT: ${entityName}'s already crippled ${fmtPartName} was struck again! Character has died.`, 'darkred');
                if (window.audioManager && soundPosition) {
                    const deathSound = isPlayerVictim ? 'ui_error_01.wav' : 'ui_error_01.wav'; // Placeholder
                    window.audioManager.playSoundAtLocation(deathSound, soundPosition, {}, { volume: isPlayerVictim ? 1.0 : 0.8 });
                }
                part.current = 0; // Ensure HP is 0
                part.crisisTimer = 0; // End crisis as it's now fatal
                part.isDestroyed = true; // Mark as destroyed due to fatal re-hit
                window.gameOver(entity);
                if (!isPlayerVictim && entity.cr !== undefined && window.xpManager) {
                    logToConsole(`CombatManager: NPC ${entityName} killed by re-hit during crisis. Awarding XP.`, 'lime');
                    window.xpManager.awardXp(window.xpManager.calculateXpForKill(entity.cr), this.gameState);
                    // Notify Quest System about NPC kill
                    if (window.proceduralQuestManager && typeof window.proceduralQuestManager.checkObjectiveCompletion === 'function') {
                        window.proceduralQuestManager.checkObjectiveCompletion({ type: "npc_killed", npcId: entity.id, npcTags: entity.tags || [], definitionId: entity.definitionId });
                    }
                    if (window.questManager && typeof window.questManager.updateObjective === 'function') {
                        window.questManager.updateObjective("kill", entity.id); // Check by ID
                        window.questManager.updateObjective("kill", entity.definitionId); // Check by definition
                        if (entity.tags) {
                            entity.tags.forEach(tag => window.questManager.updateObjective("kill", tag));
                        }
                    }
                }
            } else if (part.crisisTimer === 0 && !part.isDestroyed) { // Not in crisis yet, and part just reached 0 HP
                // Check if this hit to 0 HP is immediately fatal (e.g. head/torso destruction rules, or if game over handles it)
                if ((accessKey === "head" || accessKey === "torso")) {
                    // If a direct hit to 0 on head/torso is instantly fatal without crisis (game rule dependent)
                    // This part is a bit tricky as gameOver might be called later by health crisis system.
                    // For now, let's assume crisis starts unless explicitly stated otherwise for instant death.
                    // The health crisis system should handle the actual death trigger after 3 turns.
                    // However, if the game has a rule for instant death on head/torso destruction *before* crisis,
                    // that logic would be here or in gameOver.
                    // For now, starting crisis for all parts hitting 0 for the first time.
                }
                part.crisisTimer = 3;
                part.crisisDescription = this.generateCrisisDescription(damageType, fmtPartName);
                logToConsole(`CRISIS START: ${entityName}'s ${fmtPartName} critically injured! (${part.crisisDescription}). Timer: 3 turns.`, isPlayerVictim ? 'red' : 'orangered');
            }

            // Catastrophic damage from explosion (can override crisis start if it destroys part)
            if (weapon?.explodesOnImpact && !part.isDestroyed && part.current === 0) {
                part.isDestroyed = true;
                part.crisisTimer = 0;
                logToConsole(`CRITICAL DAMAGE: ${entityName}'s ${fmtPartName} is DESTROYED by explosion!`, 'darkred');
                if (accessKey === "head" || accessKey === "torso") {
                    logToConsole(`${entityName} died from catastrophic destruction of ${fmtPartName}.`, 'darkred');
                    window.gameOver(entity); // gameOver should handle removing from initiative, etc.
                    if (!isPlayerVictim && entity.cr !== undefined && window.xpManager) {
                        logToConsole(`CombatManager: NPC ${entityName} killed by explosion to vital part. Awarding XP.`, 'lime');
                        window.xpManager.awardXp(window.xpManager.calculateXpForKill(entity.cr), this.gameState);
                        // Notify Quest System about NPC kill
                        if (window.proceduralQuestManager && typeof window.proceduralQuestManager.checkObjectiveCompletion === 'function') {
                            window.proceduralQuestManager.checkObjectiveCompletion({ type: "npc_killed", npcId: entity.id, npcTags: entity.tags || [], definitionId: entity.definitionId });
                        }
                        if (window.questManager && typeof window.questManager.updateObjective === 'function') {
                            window.questManager.updateObjective("kill", entity.id);
                            window.questManager.updateObjective("kill", entity.definitionId);
                            if (entity.tags) {
                                entity.tags.forEach(tag => window.questManager.updateObjective("kill", tag));
                            }
                        }
                    }
                }
            }
            // General check for death if head or torso HP is 0 and crisis timer is also 0 (meaning it resolved to death or was instant)
            // This is a fallback if other conditions didn't call gameOver or handle XP.
            // The primary death handling and XP awarding should happen when gameOver is called, or when a crisis timer resolves to death.
            // This check here is to catch cases where a part is destroyed, leading to 0 HP on a vital part, and it wasn't an explosion.
            if (!isPlayerVictim &&
                ((entity.health.head && entity.health.head.current <= 0 && entity.health.head.crisisTimer === 0) ||
                    (entity.health.torso && entity.health.torso.current <= 0 && entity.health.torso.crisisTimer === 0) ||
                    (entity.health.body && entity.health.body.current <= 0 && entity.health.body.crisisTimer === 0)) &&
                !entity.xpAwardedThisDamageEvent && // Ensure XP not already given in this damage event
                !window.gameOverCalledForEntityThisTurn) { // Ensure gameOver hasn't already handled it this turn for this entity

                if (entity.cr !== undefined && window.xpManager) {
                    logToConsole(`CombatManager: NPC ${entityName} confirmed dead (vital part 0 HP, no crisis). Awarding XP.`, 'lime');
                    window.xpManager.awardXp(window.xpManager.calculateXpForKill(entity.cr), this.gameState);
                    entity.xpAwardedThisDamageEvent = true;
                    // Notify Quest System
                    if (window.proceduralQuestManager && typeof window.proceduralQuestManager.checkObjectiveCompletion === 'function') {
                        window.proceduralQuestManager.checkObjectiveCompletion({ type: "npc_killed", npcId: entity.id, npcTags: entity.tags || [], definitionId: entity.definitionId });
                    }
                    if (window.questManager && typeof window.questManager.updateObjective === 'function') {
                        window.questManager.updateObjective("kill", entity.id);
                        window.questManager.updateObjective("kill", entity.definitionId);
                        if (entity.tags) {
                            entity.tags.forEach(tag => window.questManager.updateObjective("kill", tag));
                        }
                    }
                    // It's important that after this, the NPC is properly removed from combat, lists, etc.
                    // This might be better handled by a central death processing function called by gameOver.
                    // For now, we'll assume this is one path to awarding XP before potential removal.
                }
            }
        }
        if (isPlayerVictim) {
            if (window.renderHealthTable) window.renderHealthTable(this.gameState.player);
            if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        }
        if (entity.xpAwardedThisDamageEvent) delete entity.xpAwardedThisDamageEvent; // Clean up temp flag
    }

    generateCrisisDescription(damageType, bodyPartName) {
        // Simple descriptions based on damage type and body part
        const adj = bodyPartName.replace(" ", " ").toLowerCase(); // e.g. "left arm"
        switch (damageType) {
            case "Ballistic": return `${bodyPartName} deeply lacerated`;
            case "Bludgeoning": return `${bodyPartName} severely bruised`;
            case "Slashing": return `${bodyPartName} bleeding profusely`;
            case "Piercing": return `${bodyPartName} punctured`;
            case "Fire": return `${bodyPartName} badly burned`;
            case "Explosive": return `${bodyPartName} mangled`;
            case "Chemical": return `${bodyPartName} corroded`;
            default: return `${bodyPartName} critically damaged`;
        }
    }

    handleRetargetButtonClick() {
        this.gameState.isRetargeting = true;
        this.gameState.retargetingJustHappened = false;
        this.gameState.combatCurrentDefender = null; this.gameState.defenderMapPos = null; this.gameState.selectedTargetEntity = null;
        // logToConsole("Retargeting: Click new target on map.", 'lightblue');
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // Placeholder for ui_target_mode_01.wav
        this.promptPlayerAttackDeclaration();
        this.updateCombatUI();
    }

    _getTileProperties(tileId) { return tileId && this.assetManager.tilesets ? this.assetManager.tilesets[tileId] : null; }

    async executeNpcCombatTurn(npc) {
        const npcName = npc.name || npc.id || "NPC";
        // Allow turn if in crisis (crisisTimer > 0)
        const isTorsoOk = npc.health?.torso?.current > 0 || npc.health?.torso?.crisisTimer > 0;
        const isHeadOk = npc.health?.head?.current > 0 || npc.health?.head?.crisisTimer > 0;

        if (!npc || !isTorsoOk || !isHeadOk) {
            logToConsole(`INFO: ${npcName} incapacitated (Dead/Destroyed). Skipping turn.`, 'orange');
            setTimeout(() => this.nextTurn(npc), 0);
            return;
        }
        if (!npc.memory) {
            npc.memory = { lastSeenTargetPos: null, lastSeenTargetTimestamp: 0, recentlyVisitedTiles: [], explorationTarget: null, lastKnownSafePos: { ...(npc.mapPos || { x: 0, y: 0, z: 0 }) } };
        }
        // Ensure aggroList is initialized
        if (!npc.aggroList) {
            npc.aggroList = [];
        }

        const attackInitiated = await window.handleNpcCombatTurn(npc, this.gameState, this, this.assetManager);

        if (attackInitiated) {
            // If an attack is initiated, the logic flows through processAttack, which will call nextTurn.
            this.gameState.combatPhase = 'defenderDeclare';
            this.handleDefenderActionPrompt();
        } else {
            // logToConsole(`CombatManager: NPC ${npcName} did not initiate an attack (or completed non-attack actions). Ending turn.`, 'grey');
            await this.nextTurn(npc);
        }
    }

    updateCombatUI() {
        console.log(`[Debug] updateCombatUI called. Attacker: ${this.gameState.combatCurrentAttacker?.name || 'None'}, Defender: ${this.gameState.combatCurrentDefender?.name || 'None'}`);
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

    handleExplosion(x, y, z, radius, damage, damageType, attacker = { name: "Console" }, weapon = { name: "Explosion" }, options = {}) {
        const impactTile = { x, y, z };
        const burstRadiusTiles = radius;

        if (weapon && weapon.name !== "Explosion") {
            logToConsole(`EXPLOSION: ${weapon.name} detonates at (${x},${y},${z}). Radius: ${burstRadiusTiles}t`, 'orangered');
        } else {
            logToConsole(`Creating an explosion at (${x},${y},${z}) with radius ${radius}, damage ${damage}, and type ${damageType}.`, 'orange');
        }

        if (window.audioManager) {
            let explosionSound = 'ui_error_01.wav';
            if (burstRadiusTiles <= 2) explosionSound = 'ui_error_01.wav'; // Small
            else explosionSound = 'ui_error_01.wav'; // Large
            window.audioManager.playSoundAtLocation(explosionSound, impactTile, {}, { volume: 1.0 });
            window.audioManager.playSoundAtLocation('ui_click_01.wav', impactTile, {}, { volume: 0.6, delay: 100 }); // Debris
        }

        if (window.animationManager) {
            window.animationManager.playAnimation('explosion', { centerPos: impactTile, radius: radius, duration: 1000, sourceWeapon: weapon });
        }

        // Explosion Light Flash
        if (this.gameState.lightSources) {
             const flashLight = {
                x: impactTile.x,
                y: impactTile.y,
                z: impactTile.z,
                radius: radius + 2,
                intensity: 3.0,
                color: "#FF8800", // Orange/Red explosion
                temporary: true,
                duration: 300
            };
            this.gameState.lightSources.push(flashLight);
            setTimeout(() => {
                const idx = this.gameState.lightSources.indexOf(flashLight);
                if (idx > -1) {
                    this.gameState.lightSources.splice(idx, 1);
                    if (window.mapRenderer) window.mapRenderer.scheduleRender();
                }
            }, 300);
            if (window.mapRenderer) window.mapRenderer.scheduleRender();
        }

        const characters = this.getCharactersInBlastRadius(impactTile, radius);
        characters.forEach(char => {
            let affectedByBlast = true;

            // Optional Dodge Logic (if passed in options)
            if (options.canDodge && options.attackRoll) {
                const charNameForLog = char === this.gameState ? "Player" : (char.name || char.id);
                // Check if char is eligible to dodge (e.g. not direct target or attack missed)
                let canDodge = true;
                if (options.dodgeEligibilityCallback) {
                    canDodge = options.dodgeEligibilityCallback(char);
                }

                if (canDodge) {
                    if ((rollDie(20) + getStatModifier("Dexterity", char)) >= options.attackRoll) {
                        affectedByBlast = false;
                        logToConsole(`${charNameForLog} dodged blast!`, 'lightgreen');
                    } else {
                        logToConsole(`${charNameForLog} failed to dodge blast.`, 'orange');
                    }
                }
            }

            if (affectedByBlast) {
                const totalDamage = rollDiceNotation(parseDiceNotation(damage));
                this.distributeExplosionDamage(attacker, char, totalDamage, damageType, weapon);
            }
        });
    }

    async processBackgroundRound() {
        if (!this.gameState.isInCombat || this.initiativeTracker.length === 0) return;
        this.isBackgroundSimulation = true; // Optimization: skip animations/sounds
        this.turnsToProcess = this.initiativeTracker.length;
        this.isProcessingTurn = false; // Ensure lock is released to start the batch

        return new Promise(resolve => {
            this.backgroundRoundResolve = () => {
                this.isBackgroundSimulation = false; // Reset on completion
                resolve();
            };
            this.nextTurn();
        });
    }
}
window.CombatManager = CombatManager;