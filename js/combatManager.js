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
            if (item && item.type && (item.type.includes("melee") || item.type.includes("firearm") || item.type.includes("bow") || item.type.includes("crossbow") || item.type.includes("thrown") || item.type.includes("weapon_ranged_other"))) { // Added weapon_ranged_other for launchers
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

        if (selectedOption.value === "unarmed") {
            weaponObject = null;
        } else if (selectedOption.dataset.itemData) {
            weaponObject = JSON.parse(selectedOption.dataset.itemData);
        } else {
            weaponObject = this.assetManager.getItem(selectedOption.value);
        }

        const primaryHandItem = this.gameState.inventory.handSlots[0];
        const offHandItem = this.gameState.inventory.handSlots[1];
        const isDualWieldingFirearms = primaryHandItem && primaryHandItem.type.includes("firearm") &&
            offHandItem && offHandItem.type.includes("firearm");

        if (selectedOption.value === "unarmed" && !isDualWieldingFirearms) {
            grappleButton.classList.remove('hidden');
        } else {
            grappleButton.classList.add('hidden');
        }

        if (weaponObject && (weaponObject.type.includes("firearm") || (weaponObject.tags && weaponObject.tags.includes("launcher_treated_as_rifle")))) {
            if (weaponObject.fireModes && weaponObject.fireModes.length > 0) {
                weaponObject.fireModes.forEach(mode => {
                    const option = document.createElement('option');
                    option.value = mode;
                    option.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
                    fireModeSelect.appendChild(option);
                });
                if (weaponObject.fireModes.includes("single")) {
                    fireModeSelect.value = "single";
                } else {
                    fireModeSelect.value = weaponObject.fireModes[0];
                }
                fireModeSelect.classList.remove('hidden');
            } else {
                const singleOption = document.createElement('option');
                singleOption.value = "single";
                singleOption.textContent = "Single";
                fireModeSelect.appendChild(singleOption);
                fireModeSelect.value = "single";
                if (weaponObject.tags && weaponObject.tags.includes("launcher_treated_as_rifle")) {
                    fireModeSelect.classList.remove('hidden');
                } else {
                    fireModeSelect.classList.add('hidden');
                }
            }
            confirmAttackButton.classList.remove('hidden');
            bodyPartSelect.classList.remove('hidden');
            reloadWeaponButton.classList.remove('hidden');
        } else if (selectedOption.value === "unarmed") {
            const singleOption = document.createElement('option');
            singleOption.value = "single";
            singleOption.textContent = "Single";
            fireModeSelect.appendChild(singleOption);
            fireModeSelect.value = "single";
            fireModeSelect.classList.add('hidden');
            confirmAttackButton.classList.remove('hidden');
            bodyPartSelect.classList.remove('hidden');
            reloadWeaponButton.classList.add('hidden');
        } else {
            const singleOption = document.createElement('option');
            singleOption.value = "single";
            singleOption.textContent = "Single";
            fireModeSelect.appendChild(singleOption);
            fireModeSelect.value = "single";
            fireModeSelect.classList.add('hidden');
            confirmAttackButton.classList.remove('hidden');
            bodyPartSelect.classList.remove('hidden');
            if (weaponObject && (weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow") || weaponObject.type === "weapon_thrown_explosive")) {
                reloadWeaponButton.classList.remove('hidden');
            } else {
                reloadWeaponButton.classList.add('hidden');
            }
        }
    }

    shareAggroWithTeam(damagedEntity, attacker, threatAmount) {
        if (!damagedEntity || !attacker || threatAmount <= 0) {
            return;
        }

        let teamId;
        const isDamagedEntityPlayer = damagedEntity === this.gameState;

        if (isDamagedEntityPlayer) {
            teamId = this.gameState.player.teamId;
        } else {
            teamId = damagedEntity.teamId;
        }

        if (typeof teamId === 'undefined') {
            logToConsole(`WARN: shareAggroWithTeam - damagedEntity ${isDamagedEntityPlayer ? 'Player' : damagedEntity.id} has no teamId.`);
            return;
        }

        // Share with NPCs on the same team
        this.gameState.npcs.forEach(npc => {
            if (npc.teamId === teamId && npc !== attacker && npc !== damagedEntity) {
                if (!Array.isArray(npc.aggroList)) {
                    npc.aggroList = [];
                }
                let existingEntry = npc.aggroList.find(entry => entry.entityRef === attacker);
                if (existingEntry) {
                    existingEntry.threat += threatAmount;
                    logToConsole(`INFO: ${npc.name} existing threat vs ${attacker === this.gameState ? 'Player' : attacker.name} increased to ${existingEntry.threat}`);
                } else {
                    npc.aggroList.push({ entityRef: attacker, threat: threatAmount });
                    logToConsole(`INFO: ${npc.name} new threat vs ${attacker === this.gameState ? 'Player' : attacker.name}: ${threatAmount}`);
                }
                // Sort aggroList by threat descending
                npc.aggroList.sort((a, b) => b.threat - a.threat);
            }
        });

        // Share with Player if on the same team
        if (this.gameState.player.teamId === teamId && attacker !== this.gameState && damagedEntity !== this.gameState) {
            if (!Array.isArray(this.gameState.player.aggroList)) {
                this.gameState.player.aggroList = [];
            }
            let existingEntry = this.gameState.player.aggroList.find(entry => entry.entityRef === attacker);
            if (existingEntry) {
                existingEntry.threat += threatAmount;
                logToConsole(`INFO: Player existing threat vs ${attacker.name} increased to ${existingEntry.threat}`);
            } else {
                this.gameState.player.aggroList.push({ entityRef: attacker, threat: threatAmount });
                logToConsole(`INFO: Player new threat vs ${attacker.name}: ${threatAmount}`);
            }
            // Sort aggroList by threat descending
            this.gameState.player.aggroList.sort((a, b) => b.threat - a.threat);
        }
    }

    promptPlayerAttackDeclaration() {
        this.gameState.isWaitingForPlayerCombatInput = true;
        const defenderDisplay = document.getElementById('currentDefender');
        const attackDeclUI = document.getElementById('attackDeclarationUI');

        if (this.gameState.retargetingJustHappened) {
            // Target already updated by map click handler
            logToConsole(`Retargeting complete. New target: ${this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id) : 'None'}.`);
            // Crucially, reset retargetingJustHappened AFTER it's handled.
            this.gameState.retargetingJustHappened = false;
            // Proceed to show attack UI
            if (attackDeclUI) attackDeclUI.classList.remove('hidden');
            this.populateWeaponSelect();
            const bodyPartSelect = document.getElementById('combatBodyPartSelect');
            if (bodyPartSelect) bodyPartSelect.value = "Torso";
            this.gameState.combatPhase = 'playerAttackDeclare';
            logToConsole("Declare your attack using the UI.");

        } else if (this.gameState.isRetargeting) {
            logToConsole("Player is selecting a new target. Click on the map.");
            if (defenderDisplay) defenderDisplay.textContent = "Retargeting: Select new target on map";
            if (attackDeclUI) attackDeclUI.classList.add('hidden'); // Hide attack options until target selected
            // Do not auto-select or proceed to full attack declaration yet
            return; // Wait for map click

        } else if (this.gameState.targetConfirmed) {
            // This block executes if a map click has occurred for initial targeting (targetConfirmed is true)
            // this.gameState.retargetingJustHappened = false; // Already false or handled above
            if (this.gameState.selectedTargetEntity) {
                this.gameState.combatCurrentDefender = this.gameState.selectedTargetEntity;
                if (this.gameState.selectedTargetEntity.mapPos) {
                    this.gameState.defenderMapPos = { ...this.gameState.selectedTargetEntity.mapPos };
                } else {
                    this.gameState.defenderMapPos = null;
                }
                logToConsole(`Target acquired via targeting system: ${this.gameState.selectedTargetEntity.name || this.gameState.selectedTargetEntity.id}`);
            } else { // A tile was targeted, not an entity
                const newDefenderMapPos = { ...this.gameState.targetingCoords };
                logToConsole(`Targeting system selected tile at X:${newDefenderMapPos.x}, Y:${newDefenderMapPos.y}.`);
                this.gameState.defenderMapPos = newDefenderMapPos;
                if (this.gameState.combatCurrentDefender) {
                    logToConsole(`INFO: Tile selected, but current entity target '${this.gameState.combatCurrentDefender.name}' is kept. Grenades/AOE will use tile, direct attacks will use entity unless retargeted.`);
                }
            }
            this.gameState.targetConfirmed = false; // Reset for next targeting action
            // selectedTargetEntity is reset by the targeting system directly or if a new target is chosen.
            // Proceed to show attack UI
            if (attackDeclUI) attackDeclUI.classList.remove('hidden');
            this.populateWeaponSelect();
            const bodyPartSelect = document.getElementById('combatBodyPartSelect');
            if (bodyPartSelect) bodyPartSelect.value = "Torso";
            this.gameState.combatPhase = 'playerAttackDeclare';
            logToConsole("Declare your attack using the UI.");

        } else if (!this.gameState.combatCurrentDefender && this.gameState.isInCombat) {
            // Auto-target only if no defender, in combat, AND not in any retargeting mode
            const availableNpcs = this.initiativeTracker.filter(entry =>
                !entry.isPlayer &&
                entry.entity.health &&
                entry.entity.health.torso && entry.entity.health.torso.current > 0 &&
                entry.entity.health.head && entry.entity.health.head.current > 0
            );
            if (availableNpcs.length > 0) {
                this.gameState.combatCurrentDefender = availableNpcs[0].entity;
                if (this.gameState.combatCurrentDefender.mapPos) {
                    this.gameState.defenderMapPos = { ...this.gameState.combatCurrentDefender.mapPos };
                }
                logToConsole(`Auto-targeting ${this.gameState.combatCurrentDefender.name}.`);
            } else {
                logToConsole("No valid NPC targets available. Combat may need to end.");
                this.endCombat();
                return;
            }
        }

        // const defenderDisplay = document.getElementById('currentDefender'); // This is the redundant declaration
        if (defenderDisplay) { // This 'defenderDisplay' refers to the one declared at the top of the function
            if (this.gameState.combatCurrentDefender) {
                defenderDisplay.textContent = `Defender: ${this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id}`;
            } else if (this.gameState.defenderMapPos) {
                defenderDisplay.textContent = `Defender: Tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}`;
            } else {
                defenderDisplay.textContent = "Defender: None (Click on map to target)";
            }
        }

        this.populateWeaponSelect();
        const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        if (bodyPartSelect) bodyPartSelect.value = "Torso";

        this.gameState.combatPhase = 'playerAttackDeclare';
        document.getElementById('attackDeclarationUI').classList.remove('hidden');
        const oldAttackerPrompt = document.getElementById('attackerPrompt');
        if (oldAttackerPrompt) oldAttackerPrompt.innerHTML = '';
        logToConsole("Declare your attack using the UI.");
    }

    promptPlayerDefenseDeclaration(attackData) {
        this.gameState.isWaitingForPlayerCombatInput = true;
        const defenseTypeSelect = document.getElementById('combatDefenseTypeSelect');
        const blockingLimbSelect = document.getElementById('combatBlockingLimbSelect');
        const defenseUI = document.getElementById('defenseDeclarationUI');
        const defenderPrompt = document.getElementById('defenderPrompt');

        if (!defenseTypeSelect || !blockingLimbSelect || !defenseUI) {
            console.error("Defense UI elements not found! Defaulting to Dodge.");
            this.gameState.playerDefenseChoice = { type: "Dodge", blockingLimb: null, description: "UI Error - Defaulted" };
            this.gameState.combatPhase = 'resolveRolls';
            this.processAttack();
            return;
        }

        if (defenderPrompt) defenderPrompt.innerHTML = '';

        defenseTypeSelect.value = "Dodge";
        blockingLimbSelect.classList.add('hidden');

        const primaryWeapon = this.gameState.inventory.handSlots[0];
        const secondaryWeapon = this.gameState.inventory.handSlots[1];
        const canBlockArmed = (primaryWeapon && primaryWeapon.type && primaryWeapon.type.includes("melee")) ||
            (secondaryWeapon && secondaryWeapon.type && secondaryWeapon.type.includes("melee"));

        const blockArmedOption = defenseTypeSelect.querySelector('option[value="BlockArmed"]');
        if (blockArmedOption) blockArmedOption.disabled = !canBlockArmed;

        if (!canBlockArmed && defenseTypeSelect.value === "BlockArmed") {
            defenseTypeSelect.value = "Dodge";
        }

        if (this.defenseTypeChangeListener) {
            defenseTypeSelect.removeEventListener('change', this.defenseTypeChangeListener);
        }
        this.defenseTypeChangeListener = (event) => {
            if (event.target.value === 'BlockUnarmed') {
                blockingLimbSelect.classList.remove('hidden');
                blockingLimbSelect.value = "leftArm";
            } else {
                blockingLimbSelect.classList.add('hidden');
            }
        };
        defenseTypeSelect.addEventListener('change', this.defenseTypeChangeListener);

        const attackerName = (this.gameState.combatCurrentAttacker === this.gameState || !this.gameState.combatCurrentAttacker) ? "Opponent" : this.gameState.combatCurrentAttacker.name;
        const weaponName = (attackData && attackData.weapon) ? attackData.weapon.name : "Unarmed";
        const targetBodyPart = (attackData && attackData.bodyPart) ? attackData.bodyPart : "your body";
        logToConsole(`${attackerName} is attacking ${targetBodyPart} with ${weaponName}! Choose your defense.`);

        defenseUI.classList.remove('hidden');
        this.gameState.combatPhase = 'playerDefenseDeclare';
    }

    startCombat(participants) {
        this.initiativeTracker = [];
        this.gameState.playerMovedThisTurn = false;
        participants.forEach(participant => {
            if (!participant) return;
            const isPlayer = participant === this.gameState;
            const entityForStatLookup = isPlayer ? this.gameState : participant;
            const initiativeRoll = rollDie(20) + getStatModifier("Dexterity", entityForStatLookup);

            let participantEntry = { entity: participant, initiative: initiativeRoll, isPlayer: isPlayer };
            if (!isPlayer) {
                participantEntry.entity.movedThisTurn = false;
            }

            // Diagnostic logging for participant identification
            if (isPlayer && participant !== this.gameState) {
                console.warn(`CRITICAL WARNING STCOMBAT: A participant was identified as Player but is NOT the gameState object! Entity ID: ${participant ? participant.id : 'undefined'}`);
            }
            if (!isPlayer && participant === this.gameState) {
                console.warn(`CRITICAL WARNING STCOMBAT: The gameState object was identified as an NPC!`);
            }

            if (!isPlayer) {
                if (!participant) {
                    console.warn("CRITICAL WARNING STCOMBAT: Undefined non-player participant detected.");
                } else if (!participant.name && !participant.id) {
                    logToConsole(`DEBUG STCOMBAT: Adding NPC to initiative: Name=UNDEFINED_NAME, ID=UNDEFINED_ID, isPlayer=${isPlayer}`);
                    console.warn(`WARNING STCOMBAT: NPC entity (isPlayer=false) is missing both .name and .id. Entity:`, participant);
                } else if (!participant.name) {
                    logToConsole(`DEBUG STCOMBAT: Adding NPC to initiative: Name=(missing, using ID) ${participant.id}, ID='${participant.id}', isPlayer=${isPlayer}`);
                    console.warn(`WARNING STCOMBAT: NPC entity (ID: ${participant.id}) is missing .name property.`);
                } else {
                    logToConsole(`DEBUG STCOMBAT: Adding NPC to initiative: Name='${participant.name}', ID='${participant.id}', isPlayer=${isPlayer}`);
                }
            } else {
                logToConsole(`DEBUG STCOMBAT: Adding Player to initiative: Name='Player', isPlayer=${isPlayer}`);
            }
            this.initiativeTracker.push(participantEntry);
        });
        this.initiativeTracker.sort((a, b) => {
            if (b.initiative === a.initiative) {
                if (a.isPlayer) return -1;
                if (b.isPlayer) return 1;
                return 0;
            }
            return b.initiative - a.initiative;
        });
        this.currentTurnIndex = -1;
        this.gameState.isInCombat = true;
        this.updateInitiativeDisplay();
        this.nextTurn();
    }

    updateInitiativeDisplay() {
        const initiativeDisplay = document.getElementById('initiativeDisplay');
        if (!initiativeDisplay) return;
        const heading = initiativeDisplay.querySelector('h4');
        initiativeDisplay.innerHTML = '';
        if (heading) initiativeDisplay.appendChild(heading);
        this.initiativeTracker.forEach((entry, index) => {
            const p = document.createElement('p');
            // const entityName = entry.isPlayer ? "Player" : entry.entity.name;
            let entityName;
            if (entry.isPlayer) {
                entityName = (document.getElementById('charName')?.value || "Player");
            } else {
                if (entry.entity && entry.entity.name) {
                    entityName = entry.entity.name;
                } else if (entry.entity && entry.entity.id) {
                    entityName = `NPC (ID: ${entry.entity.id})`; // Fallback to ID
                    console.warn(`Initiative Display: NPC (ID: ${entry.entity.id}) is missing a .name property. Displaying ID.`);
                } else {
                    entityName = "Unknown NPC"; // Ultimate fallback
                    console.warn("Initiative Display: NPC entity is missing both .name and .id properties.");
                }
            }
            p.textContent = `${entityName}: ${entry.initiative}`;
            if (index === this.currentTurnIndex) {
                p.style.fontWeight = 'bold';
                p.style.color = 'green';
            }
            initiativeDisplay.appendChild(p);
        });
    }

    nextTurn(previousAttackerEntity = null) {
        if (this.gameState.isWaitingForPlayerCombatInput) {
            logToConsole("INFO: nextTurn() deferred as game is waiting for player combat input.");
            return;
        }
        const prevAttackerName = previousAttackerEntity ? (previousAttackerEntity.name || (previousAttackerEntity === this.gameState ? "Player" : previousAttackerEntity.id)) : (this.gameState.combatCurrentAttacker ? (this.gameState.combatCurrentAttacker.name || this.gameState.combatCurrentAttacker.id) : 'N/A');
        logToConsole(`CombatManager.nextTurn() called. Turn ended for: ${prevAttackerName}. Current GS attacker (if any, before update): ${this.gameState.combatCurrentAttacker ? (this.gameState.combatCurrentAttacker.name || this.gameState.combatCurrentAttacker.id) : 'N/A'}. Initiative index before adv: ${this.currentTurnIndex}`);
        if (!this.gameState.isInCombat || this.initiativeTracker.length === 0) {
            this.endCombat();
            return;
        }
        this.currentTurnIndex++;
        if (this.currentTurnIndex >= this.initiativeTracker.length) {
            this.currentTurnIndex = 0;
            logToConsole("New combat round started.");
        }
        const currentEntry = this.initiativeTracker[this.currentTurnIndex];
        if (!currentEntry || !currentEntry.entity) {
            logToConsole("Error: Current turn entry or entity is undefined. Ending combat.");
            this.endCombat();
            return;
        }
        this.gameState.combatCurrentAttacker = currentEntry.entity;
        const attacker = this.gameState.combatCurrentAttacker;
        const attackerName = currentEntry.isPlayer ? (document.getElementById('charName')?.value || "Player") : attacker.name;

        this.gameState.attackerMapPos = currentEntry.isPlayer ? { ...this.gameState.playerPos } : (attacker.mapPos ? { ...attacker.mapPos } : null);

        logToConsole(`--- ${attackerName}'s Turn ---`);

        if (currentEntry.isPlayer) {
            this.gameState.playerMovedThisTurn = false;
            this.gameState.actionPointsRemaining = 1;
            this.gameState.movementPointsRemaining = 6;
            window.turnManager.updateTurnUI();

            if (this.gameState.combatCurrentDefender && typeof this.gameState.combatCurrentDefender === 'object') {
                const defenderDisplayInfo = {
                    id: this.gameState.combatCurrentDefender.id,
                    name: this.gameState.combatCurrentDefender.name,
                    isPlayerEntity: this.gameState.combatCurrentDefender === this.gameState // Important check
                };
                // Only attempt to stringify the simplified 'defenderDisplayInfo' object
                // logToConsole('DEBUG_LOG POINT_A VAL: GS.combatCurrentDefender (object): ' + JSON.stringify(defenderDisplayInfo));
            } else {
                // If it's not an object, or is null/undefined, stringify directly (safe for primitives)
                // logToConsole('DEBUG_LOG POINT_A VAL: GS.combatCurrentDefender (primitive or null): ' + String(this.gameState.combatCurrentDefender));
            }
            // logToConsole('DEBUG_LOG POINT_A TYPE: typeof GS.combatCurrentDefender: ' + typeof this.gameState.combatCurrentDefender);
            // logToConsole('DEBUG_LOG POINT_A CHECK_NULL: GS.combatCurrentDefender === null: ' + (this.gameState.combatCurrentDefender === null));
            // logToConsole('DEBUG_LOG POINT_A CHECK_UNDEFINED: GS.combatCurrentDefender === undefined: ' + (this.gameState.combatCurrentDefender === undefined));
            // logToConsole('DEBUG_LOG POINT_A CHECK_BOOLEAN: Boolean(GS.combatCurrentDefender): ' + Boolean(this.gameState.combatCurrentDefender));

            // New Player Targeting Logic
            if (this.gameState.retargetingJustHappened) {
                logToConsole("Player is manually retargeting. Skipping auto-target selection.");
                // combatCurrentDefender should be null from handleRetarget()
            } else {
                this.gameState.combatCurrentDefender = null; // Clear previous defender before new auto-selection
                this.gameState.defenderMapPos = null;

                // 1. Check Aggro List
                if (this.gameState.player && this.gameState.player.aggroList && this.gameState.player.aggroList.length > 0) {
                    for (const aggroEntry of this.gameState.player.aggroList) {
                        const potentialTarget = aggroEntry.entityRef;
                        if (!potentialTarget) continue;

                        const targetInInitiative = this.initiativeTracker.find(e => e.entity === potentialTarget);
                        if (!targetInInitiative) continue;

                        // Player is gameState, so potentialTarget cannot be gameState
                        // And player's teamId is gameState.player.teamId (e.g. 1)
                        if (potentialTarget !== this.gameState &&
                            potentialTarget.health && potentialTarget.health.torso.current > 0 && potentialTarget.health.head.current > 0 &&
                            potentialTarget.teamId !== this.gameState.player.teamId) {

                            this.gameState.combatCurrentDefender = potentialTarget;
                            this.gameState.defenderMapPos = { ...potentialTarget.mapPos };
                            logToConsole(`Player automatically targets ${potentialTarget.name} from aggro list (Threat: ${aggroEntry.threat}). Pos: X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}`);
                            break;
                        }
                    }
                }

                // 2. Fallback to Closest Enemy (if no valid aggro target)
                if (!this.gameState.combatCurrentDefender) {
                    logToConsole("Player has no valid aggro targets or aggro list is empty. Searching for nearest enemy.");
                    let closestEnemy = null;
                    let minDistance = Infinity;

                    for (const initiativeEntry of this.initiativeTracker) {
                        const candidateEntity = initiativeEntry.entity;
                        if (candidateEntity === this.gameState) continue; // Skip player

                        if (candidateEntity.health && candidateEntity.health.torso.current > 0 && candidateEntity.health.head.current > 0 &&
                            candidateEntity.teamId !== this.gameState.player.teamId && candidateEntity.mapPos && this.gameState.playerPos) {

                            const distance = Math.abs(this.gameState.playerPos.x - candidateEntity.mapPos.x) + Math.abs(this.gameState.playerPos.y - candidateEntity.mapPos.y);
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestEnemy = candidateEntity;
                            }
                        }
                    }

                    if (closestEnemy) {
                        this.gameState.combatCurrentDefender = closestEnemy;
                        this.gameState.defenderMapPos = { ...closestEnemy.mapPos };
                        logToConsole(`Player automatically targets nearest enemy: ${closestEnemy.name}. Pos: X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}`);
                    } else {
                        logToConsole("Player found no valid enemies on the map.");
                        // combatCurrentDefender remains null, promptPlayerAttackDeclaration will show "Defender: None"
                    }
                }
            }
            // End of New Player Targeting Logic
            logToConsole(`DEBUG NEXTTURN: Player turn setup complete. Final combatCurrentDefender: ${(this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id) : 'null')}, Final defenderMapPos: ${JSON.stringify(this.gameState.defenderMapPos)}`);
            this.gameState.isRetargeting = false; // Reset isRetargeting at the start of a new player turn

        } else { // NPC's turn
            const npcAttacker = currentEntry.entity;
            npcAttacker.movedThisTurn = false;
            npcAttacker.currentActionPoints = npcAttacker.defaultActionPoints || 1;
            npcAttacker.currentMovementPoints = npcAttacker.defaultMovementPoints || 0;

            this.gameState.combatCurrentDefender = this.gameState;
            if (this.gameState.playerPos) {
                this.gameState.defenderMapPos = { ...this.gameState.playerPos };
                // logToConsole(`NPC ${attackerName}'s turn: Targeting Player at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}.`);
            } else {
                this.gameState.defenderMapPos = null;
                logToConsole(`NPC ${attackerName}'s turn: Targeting Player, but Player has no mapPos.`);
            }
        }


        const defenderDisplay = document.getElementById('currentDefender');
        if (defenderDisplay) {
            if (this.gameState.combatCurrentDefender) {
                defenderDisplay.textContent = `Defender: ${this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id}`;
            } else if (this.gameState.defenderMapPos) { // Tile target
                defenderDisplay.textContent = `Defender: Tile at X:${this.gameState.defenderMapPos.x}, Y:${this.gameState.defenderMapPos.y}`;
            } else {
                defenderDisplay.textContent = `Defender: None`;
            }
        }


        window.mapRenderer.scheduleRender();

        if (currentEntry.isPlayer) {
            this.promptPlayerAttackDeclaration();
        } else {
            this.gameState.combatPhase = 'attackerDeclare';
            this.executeNpcCombatTurn(this.gameState.combatCurrentAttacker);
        }
        this.updateInitiativeDisplay();
    }

    endCombat() {
        this.gameState.isInCombat = false;
        this.gameState.combatPhase = null;
        this.gameState.attackerMapPos = null;
        this.gameState.defenderMapPos = null;
        this.gameState.combatCurrentDefender = null;

        this.initiativeTracker.forEach(entry => {
            if (entry.entity && entry.entity.statusEffects) {
                entry.entity.statusEffects.isGrappled = false;
                entry.entity.statusEffects.grappledBy = null;
            }
        });
        if (this.gameState.statusEffects) {
            this.gameState.statusEffects.isGrappled = false;
            this.gameState.statusEffects.grappledBy = null;
        }

        this.initiativeTracker = [];
        this.currentTurnIndex = 0;
        const initiativeDisplay = document.getElementById('initiativeDisplay');
        if (initiativeDisplay) {
            const heading = initiativeDisplay.querySelector('h4');
            initiativeDisplay.innerHTML = '';
            if (heading) initiativeDisplay.appendChild(heading);
        }
        const attackDeclUI = document.getElementById('attackDeclarationUI');
        if (attackDeclUI) attackDeclUI.classList.add('hidden');
        const defenseDeclUI = document.getElementById('defenseDeclarationUI');
        if (defenseDeclUI) defenseDeclUI.classList.add('hidden');
        this.updateCombatUI();
        logToConsole("Combat Ended.");
        const defenseTypeSelect = document.getElementById('combatDefenseTypeSelect');
        if (defenseTypeSelect && this.defenseTypeChangeListener) {
            defenseTypeSelect.removeEventListener('change', this.defenseTypeChangeListener);
            this.defenseTypeChangeListener = null;
        }
        window.mapRenderer.scheduleRender();
    }

    handleConfirmedAttackDeclaration() {
        this.gameState.isWaitingForPlayerCombatInput = false;
        this.gameState.retargetingJustHappened = false; // Attack confirmed, so retargeting sequence is over.
        const weaponSelect = document.getElementById('combatWeaponSelect');
        const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        const selectedWeaponValue = weaponSelect.value;
        let weaponObject = null;
        let attackType = "unarmed";

        if (selectedWeaponValue === "unarmed") {
            weaponObject = null;
            attackType = "melee";
        } else {
            weaponObject = this.gameState.inventory.handSlots.find(item => item && (item.id === selectedWeaponValue || item.name === selectedWeaponValue));
            if (!weaponObject) {
                weaponObject = this.assetManager.getItem(selectedWeaponValue);
            }

            if (weaponObject) {
                if (weaponObject.type.includes("melee")) attackType = "melee";
                else if (weaponObject.type.includes("firearm") || weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow") || weaponObject.type.includes("weapon_ranged_other")) attackType = "ranged";
                else if (weaponObject.type.includes("thrown")) attackType = "ranged"; // Covers both explosive and non-explosive thrown
                else {
                    logToConsole(`ERROR: Unknown weapon type for '${selectedWeaponValue}'. Defaulting to unarmed.`);
                    weaponObject = null; attackType = "melee";
                }
            } else {
                logToConsole(`ERROR: Selected weapon '${selectedWeaponValue}' not found. Defaulting to unarmed.`);
                weaponObject = null;
                attackType = "melee";
            }
        }

        // All combat actions confirmed here require an entity target, including grenades.
        const requiresEntityTarget = true;

        if (requiresEntityTarget && !this.gameState.combatCurrentDefender) {
            logToConsole(`ERROR: Action requires an entity target, but none is selected. Weapon: ${(weaponObject ? weaponObject.name : 'Unarmed')}. Please select an entity.`);
            this.promptPlayerAttackDeclaration();
            return;
        }

        const fireMode = document.getElementById('combatFireModeSelect') ? document.getElementById('combatFireModeSelect').value : "single";
        const bodyPart = bodyPartSelect.value; // Still relevant for aiming, even if AoE follows.

        this.gameState.pendingCombatAction = {
            target: this.gameState.combatCurrentDefender,
            weapon: weaponObject,
            attackType: attackType,
            bodyPart: bodyPart,
            actionDescription: `${(weaponObject ? weaponObject.name : "Unarmed")} attack on ${this.gameState.combatCurrentDefender.name}'s ${bodyPart}`,
            fireMode: fireMode,
            actionType: "attack",
            entity: this.gameState,
            skillToUse: null,
            targetTile: null
        };

        if (weaponObject && weaponObject.type === "weapon_thrown_explosive") {
            this.gameState.pendingCombatAction.skillToUse = "Explosives";
            // Target entity for grenade is combatCurrentDefender. Explosion centers on its tile.
            if (this.gameState.combatCurrentDefender.mapPos) { // mapPos should exist if defender is valid
                this.gameState.pendingCombatAction.targetTile = { ...this.gameState.combatCurrentDefender.mapPos };
                logToConsole(`Player declares: Throwing ${weaponObject.name} at ${this.gameState.combatCurrentDefender.name}'s tile (X:${this.gameState.pendingCombatAction.targetTile.x},Y:${this.gameState.pendingCombatAction.targetTile.y}).`);
            } else {
                logToConsole(`ERROR: Grenade target ${this.gameState.combatCurrentDefender.name} has no valid mapPos. Aborting throw.`);
                this.promptPlayerAttackDeclaration();
                return;
            }
        } else {
            // Standard attack declaration log for non-explosives
            // Dual wield logging can also be integrated here as before.
            const currentDefenderName = this.gameState.combatCurrentDefender.name || this.gameState.combatCurrentDefender.id;
            logToConsole(`Player declares: ${attackType} attack on ${currentDefenderName}'s ${bodyPart} with ${(weaponObject ? weaponObject.name : 'Unarmed')} (Mode: ${fireMode}).`);

            const primaryHandItem = this.gameState.inventory.handSlots[0];
            const offHandItem = this.gameState.inventory.handSlots[1];
            if (primaryHandItem && primaryHandItem.type.includes("firearm") &&
                offHandItem && offHandItem.type.includes("firearm") &&
                weaponObject && weaponObject.id === primaryHandItem.id) {
                this.gameState.dualWieldPending = true;
                logToConsole(`Dual Wield: Main hand attack with ${primaryHandItem.name}. Off-hand ${offHandItem.name} to follow.`);
            } else {
                this.gameState.dualWieldPending = false;
            }
        }

        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'defenderDeclare';
        this.handleDefenderActionPrompt();
    }

    handleConfirmedDefenseDeclaration() {
        this.gameState.isWaitingForPlayerCombatInput = false;
        const defenseTypeSelect = document.getElementById('combatDefenseTypeSelect');
        const blockingLimbSelect = document.getElementById('combatBlockingLimbSelect');

        if (!defenseTypeSelect || !blockingLimbSelect) {
            console.error("handleConfirmedDefenseDeclaration: Defense UI elements not found!");
            return;
        }

        const defenseType = defenseTypeSelect.value;
        const blockingLimb = defenseType === 'BlockUnarmed' && !blockingLimbSelect.classList.contains('hidden') ? blockingLimbSelect.value : null;
        const description = defenseType + (blockingLimb ? ` with ${blockingLimb}` : "");

        this.gameState.playerDefenseChoice = {
            type: defenseType,
            blockingLimb: blockingLimb,
            description: description
        };
        logToConsole(`Player defends: ${description}.`);

        const defenseUI = document.getElementById('defenseDeclarationUI');
        if (defenseUI) {
            defenseUI.classList.add('hidden');
        } else {
            console.error("handleConfirmedDefenseDeclaration: defenseDeclarationUI element not found to hide!");
        }

        this.gameState.combatPhase = 'resolveRolls';
        this.processAttack();
    }

    decideNpcDefense() {
        const defenderNpc = this.gameState.combatCurrentDefender;
        const attackData = this.gameState.pendingCombatAction;
        let chosenDefense = "Dodge";

        if (attackData.attackType === "ranged" && attackData.weapon && !attackData.weapon.type.includes("thrown")) {
            chosenDefense = "None";
        } else if (attackData.attackType === "melee" || (attackData.weapon && attackData.weapon.type.includes("thrown"))) {
            let npcWeapon = null;
            if (defenderNpc.equippedWeaponId) {
                npcWeapon = this.assetManager.getItem(defenderNpc.equippedWeaponId);
            }
            if (npcWeapon && npcWeapon.type && npcWeapon.type.includes("melee")) {
                chosenDefense = "BlockArmed";
            } else {
                const unarmedModifier = getSkillModifier("Unarmed", defenderNpc);
                const dexterityModifier = getStatModifier("Dexterity", defenderNpc);
                if (getSkillValue("Unarmed", defenderNpc) > 0 && unarmedModifier >= dexterityModifier - 2) {
                    chosenDefense = "BlockUnarmed";
                } else {
                    chosenDefense = "Dodge";
                }
            }
        }
        this.gameState.npcDefenseChoice = chosenDefense;
        logToConsole(`${defenderNpc.name} defends: ${chosenDefense}.`);
    }

    handleDefenderActionPrompt() {
        const defender = this.gameState.combatCurrentDefender;
        const attacker = this.gameState.combatCurrentAttacker;
        const attackerName = attacker === this.gameState ? "Player" : attacker.name;

        if (!defender && !(this.gameState.pendingCombatAction && this.gameState.pendingCombatAction.targetTile && this.gameState.pendingCombatAction.weapon && this.gameState.pendingCombatAction.weapon.type === "weapon_thrown_explosive")) {
            logToConsole(`Error in handleDefenderActionPrompt: Defender not set and not a thrown explosive at tile. Attacker was ${attackerName}.`);
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration();
            else this.nextTurn();
            return;
        }

        if (defender && defender === this.gameState) { // Player is defending
            if (!this.gameState.pendingCombatAction || Object.keys(this.gameState.pendingCombatAction).length === 0) {
                logToConsole("Error: No pending attack data for player defense. Defaulting defense.");
                this.gameState.playerDefenseChoice = { type: "Dodge", blockingLimb: null, description: "Error - No attack data" };
                this.gameState.combatPhase = 'resolveRolls';
                this.processAttack();
                return;
            }
            if (this.gameState.pendingCombatAction.attackType === "ranged" &&
                this.gameState.pendingCombatAction.weapon &&
                !this.gameState.pendingCombatAction.weapon.type.includes("thrown") &&
                !(this.gameState.pendingCombatAction.weapon.tags && this.gameState.pendingCombatAction.weapon.tags.includes("launcher_treated_as_rifle") && this.gameState.pendingCombatAction.weapon.explodesOnImpact)) {
                logToConsole("Defense: Player cannot actively defend (dodge/block) against non-thrown, non-explosive ranged attacks. Only cover applies.");
                this.gameState.playerDefenseChoice = { type: "None", blockingLimb: null, description: "No active defense vs non-thrown/non-explosive ranged" };
                this.gameState.combatPhase = 'resolveRolls';
                this.processAttack();
            } else {
                this.promptPlayerDefenseDeclaration(this.gameState.pendingCombatAction);
            }
        } else if (defender) { // NPC is defending
            this.decideNpcDefense();
            this.gameState.combatPhase = 'resolveRolls';
            this.processAttack();
        } else { // No specific defender (e.g. thrown explosive at empty tile)
            logToConsole("Attacking an empty tile with a thrown explosive. No specific defender action.");
            this.gameState.combatPhase = 'resolveRolls';
            this.processAttack();
        }
    }

    calculateAttackRoll(attacker, weapon, targetBodyPartArg, actionContext = {}) {
        const targetBodyPart = targetBodyPartArg;
        let skillName;
        let skillBasedModifier;
        actionContext.attackerMovementPenalty = 0;

        const rangeModifier = actionContext.rangeModifier || 0;
        const attackModifierForFireMode = actionContext.attackModifier || 0;

        if (attacker === this.gameState && this.gameState.playerMovedThisTurn) {
            actionContext.attackerMovementPenalty = -2;
        } else if (attacker !== this.gameState && attacker.movedThisTurn) {
            actionContext.attackerMovementPenalty = -2;
        }

        if (actionContext.skillToUse === "Explosives") {
            skillName = "Explosives";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (!weapon || weapon === "unarmed" || !weapon.type) {
            skillName = "Unarmed";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("melee")) {
            skillName = "Melee Weapons";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("firearm") ||
            weapon.type.includes("bow") ||
            weapon.type.includes("crossbow") ||
            (weapon.tags && weapon.tags.includes("launcher_treated_as_rifle"))) {
            skillName = "Guns";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("thrown")) {
            skillName = "Strength";
            skillBasedModifier = getStatModifier("Strength", attacker);
        } else {
            skillName = "Unarmed";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        }
        actionContext.skillName = skillName;
        actionContext.skillBasedModifier = skillBasedModifier;


        let baseRoll = rollDie(20);

        if (actionContext.isSecondAttack) {
            baseRoll = Math.min(rollDie(20), rollDie(20));
        }

        actionContext.bodyPartModifier = 0; // Ensure it's initialized
        if (this.gameState.combatCurrentDefender && targetBodyPart) { // targetBodyPart comes from pendingCombatAction
            const partToCheck = targetBodyPart; // e.g., "leftArm", "Head", "Torso"

            if (partToCheck.toLowerCase() === "head") { // Keep head check flexible (lowercase)
                actionContext.bodyPartModifier = -4;
            } else if (["leftArm", "rightArm", "leftLeg", "rightLeg"].includes(partToCheck)) { // Use camelCase for limbs
                actionContext.bodyPartModifier = -1;
            }
            // If partToCheck is "Torso", or any other value not "head" or a listed limb, modifier remains 0.
        }

        const totalAttackRoll = baseRoll + skillBasedModifier + actionContext.bodyPartModifier + rangeModifier + attackModifierForFireMode + actionContext.attackerMovementPenalty;

        const canCrit = !(actionContext.isSecondAttack || actionContext.isBurst || actionContext.isAutomatic);

        return {
            roll: totalAttackRoll,
            naturalRoll: baseRoll,
            isCriticalHit: canCrit && baseRoll === 20,
            isCriticalMiss: canCrit && baseRoll === 1
        };
    }

    calculateDefenseRoll(defender, defenseType, attackerWeapon, coverBonus = 0, actionContext = {}) {
        if (!defender) {
            return { roll: 0, naturalRoll: 0, isCriticalSuccess: false, isCriticalFailure: false, coverBonusApplied: 0, movementBonusApplied: 0, defenseSkillValue: 0, defenseSkillName: "N/A" };
        }

        if (defenseType === "None") {
            const baseRoll = rollDie(20);
            let defenderMovementBonus = 0;

            if (defender === this.gameState && this.gameState.playerMovedThisTurn) {
                defenderMovementBonus = 2;
            } else if (defender !== this.gameState && defender.movedThisTurn) {
                defenderMovementBonus = 2;
            }

            const totalDefenseRoll = baseRoll + coverBonus + defenderMovementBonus;

            return {
                roll: totalDefenseRoll,
                naturalRoll: baseRoll,
                isCriticalSuccess: baseRoll === 20,
                isCriticalFailure: baseRoll === 1,
                coverBonusApplied: coverBonus,
                movementBonusApplied: defenderMovementBonus,
                defenseSkillValue: 0,
                defenseSkillName: "Passive"
            };
        }
        const baseRoll = rollDie(20);
        let baseDefenseValue = 0;
        let defenseSkillName = "";
        let defenderMovementBonus = 0;

        if (defender === this.gameState && this.gameState.playerMovedThisTurn) {
            defenderMovementBonus = 2;
        } else if (defender !== this.gameState && defender.movedThisTurn) {
            defenderMovementBonus = 2;
        }

        switch (defenseType) {
            case "Dodge":
                defenseSkillName = "Unarmed + Dexterity";
                baseDefenseValue = getStatModifier("Dexterity", defender) + getSkillModifier("Unarmed", defender);
                break;
            case "BlockUnarmed":
                defenseSkillName = "Unarmed + Constitution";
                baseDefenseValue = getStatModifier("Constitution", defender) + getSkillModifier("Unarmed", defender);
                break;
            case "BlockArmed":
                defenseSkillName = "Melee Weapons";
                baseDefenseValue = getSkillModifier("Melee Weapons", defender);
                break;
        }
        const totalDefenseRoll = baseRoll + baseDefenseValue + coverBonus + defenderMovementBonus;
        return {
            roll: totalDefenseRoll,
            naturalRoll: baseRoll,
            isCriticalSuccess: baseRoll === 20,
            isCriticalFailure: baseRoll === 1,
            coverBonusApplied: coverBonus,
            movementBonusApplied: defenderMovementBonus,
            defenseSkillValue: baseDefenseValue,
            defenseSkillName: defenseSkillName
        };
    }

    calculateAndApplyMeleeDamage(attacker, target, weapon, hitSuccess, attackNaturalRoll, defenseNaturalRoll, targetBodyPartForDamage) {
        if (!hitSuccess || !target) {
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)';
            return;
        }
        let damageAmount = 0;
        let damageType = "";
        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        let damageLogSuffix = "";

        if (weapon === null) {
            damageType = "Bludgeoning";
            const unarmedModifierValue = getSkillModifier("Unarmed", attacker);
            if (unarmedModifierValue <= 0) {
                damageAmount = Math.max(0, rollDie(2) - 1);
                damageLogSuffix = `(1d2-1, Mod: ${unarmedModifierValue})`;
            } else {
                damageAmount = rollDie(unarmedModifierValue);
                damageLogSuffix = `(1d${unarmedModifierValue}, Mod: ${unarmedModifierValue})`;
            }
        } else {
            damageType = weapon.damageType || "Physical";
            const damageNotation = parseDiceNotation(weapon.damage);
            damageAmount = rollDiceNotation(damageNotation);
            damageLogSuffix = `(${weapon.damage})`;
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Raw Damage: ${damageAmount} ${damageType} ${damageLogSuffix}`;
        this.applyDamage(attacker, target, targetBodyPartForDamage, damageAmount, damageType, weapon);
    }

    calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPartForDamage, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess || !target) {
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)';
            return;
        }
        const damageType = weapon.damageType || "Ballistic";
        let totalDamageThisVolley = 0;
        logToConsole(`HITS: ${attacker === this.gameState ? "Player" : attacker.name}'s ${weapon.name} strikes ${numHits} time(s)! (Base Damage: ${weapon.damage})`);

        for (let i = 0; i < numHits; i++) {
            const damageNotation = parseDiceNotation(weapon.damage);
            const damageAmountThisBullet = rollDiceNotation(damageNotation);
            totalDamageThisVolley += damageAmountThisBullet;
            this.applyDamage(attacker, target, targetBodyPartForDamage, damageAmountThisBullet, damageType, weapon, i + 1, numHits);
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Total Raw Damage: ${totalDamageThisVolley} ${damageType} (${numHits} hits)`;
    }


    processAttack() {
        if (this.gameState.combatPhase !== 'resolveRolls') {
            console.error("processAttack called at incorrect combat phase:", this.gameState.combatPhase);
            this.nextTurn();
            return;
        }
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;
        const { weapon, attackType, bodyPart: intendedBodyPart, fireMode = "single", actionType = "attack" } = this.gameState.pendingCombatAction || {};
        let logMsg = "";
        let outcomeMessage = ""; // Declare outcomeMessage here

        if (!this.gameState.pendingCombatAction || !this.gameState.pendingCombatAction.actionType) {
            console.error("processAttack called without a valid pendingCombatAction or actionType.");
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration();
            else this.nextTurn();
            return;
        }

        if (this.gameState.pendingCombatAction.actionType === "Reload") {
            const weaponToReload = this.gameState.pendingCombatAction.weapon;
            logToConsole(`${attacker === this.gameState ? "Player" : attacker.name} reloads ${weaponToReload ? weaponToReload.name : 'their weapon'}.`);
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) {
                    logToConsole("Not enough action points to reload.");
                    this.promptPlayerAttackDeclaration();
                    return;
                }
                this.gameState.actionPointsRemaining--;
                window.turnManager.updateTurnUI();
                logToConsole(`Action point spent for reload. Remaining: ${this.gameState.actionPointsRemaining}`);
            }

            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                else if (this.gameState.movementPointsRemaining > 0) {
                    logToConsole("Reload complete. You have movement points remaining or can end your turn.");
                    this.gameState.combatPhase = 'playerPostAction';
                } else this.nextTurn();
            } else this.nextTurn();
            return;
        }

        let actionContext = {
            isGrappling: false, rangeModifier: 0, attackModifier: 0,
            isBurst: false, isAutomatic: false, isSecondAttack: false,
            skillToUse: this.gameState.pendingCombatAction.skillToUse
        };

        if (this.gameState.pendingCombatAction.actionType === "attack") {
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) {
                    logToConsole("Not enough action points to complete the attack.");
                    this.promptPlayerAttackDeclaration(); return;
                }
                this.gameState.actionPointsRemaining--;
                window.turnManager.updateTurnUI();
                logToConsole(`Action point spent for attack. Remaining: ${this.gameState.actionPointsRemaining}`);
            }
        } else if (this.gameState.pendingCombatAction.actionType === "grapple") {
            console.error("processAttack called with actionType 'grapple'. This should be handled by processGrapple.");
            this.nextTurn(); return;
        }

        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const defenderName = (defender === this.gameState) ? "Player" : (defender ? defender.name : "Tile");
        let attackResult, defenseResult;

        if (attackType === 'ranged' && weapon) {
            let bulletsToConsume = 1;
            if (fireMode === "burst") bulletsToConsume = 3;
            else if (fireMode === "auto") bulletsToConsume = 6;
            logToConsole(`COMBAT: ${weapon.name} fires ${bulletsToConsume} bullet(s) in ${fireMode} mode.`);
        }

        if (attackType === 'melee' && defender) {
            const attackerMapPos = (attacker === this.gameState) ? this.gameState.playerPos : attacker.mapPos;
            const defenderMapPos = defender.mapPos;
            if (attackerMapPos && defenderMapPos) {
                const manhattanDistance = Math.abs(attackerMapPos.x - defenderMapPos.x) + Math.abs(attackerMapPos.y - defenderMapPos.y);
                if (manhattanDistance > 1) {
                    logToConsole(`MELEE FAIL: ${attackerName}'s melee attack on ${defenderName} fails. Target out of range (Distance: ${manhattanDistance}).`);
                    if (attacker === this.gameState) {
                        if (this.gameState.actionPointsRemaining > 0) this.promptPlayerAttackDeclaration();
                        else if (this.gameState.movementPointsRemaining > 0) {
                            logToConsole("Melee attack failed (out of range). You have movement points remaining or can end your turn.");
                            this.gameState.combatPhase = 'playerPostAction'; window.turnManager.updateTurnUI();
                        } else this.nextTurn();
                    } else this.nextTurn();
                    return;
                }
            } else console.warn(`Warning: Attacker or defender map position undefined for melee range check. Attacker: ${attackerName}, Defender: ${defenderName}. Attack proceeds.`);
        }

        let numHits = 1;
        let coverBonus = 0;
        if (defender && defender.statusEffects && defender.statusEffects.isGrappled) {
            const grappledById = (attacker === this.gameState) ? 'player' : (attacker.id || null);
            if (grappledById && defender.statusEffects.grappledBy === grappledById) {
                actionContext.isGrappling = true;
                logToConsole(`${attackerName} is grappling ${defenderName}. Grapple context for point-blank set.`);
            }
        }
        if (defender && defender.mapPos) coverBonus = this.getDefenderCoverBonus(defender);

        if (attackType === 'ranged' && weapon) {
            const attackerMapPos = (attacker === this.gameState) ? this.gameState.playerPos : attacker.mapPos;
            const targetMapPos = this.gameState.pendingCombatAction.targetTile || (defender ? defender.mapPos : null);
            if (attackerMapPos && targetMapPos) {
                const distance = Math.sqrt(Math.pow(targetMapPos.x - attackerMapPos.x, 2) + Math.pow(targetMapPos.y - attackerMapPos.y, 2));
                if (distance <= 1) {
                    if (weapon.tags && weapon.tags.includes("requires_grapple_for_point_blank") && defender) {
                        if (actionContext.isGrappling) actionContext.rangeModifier = 15;
                        else actionContext.rangeModifier = 0;
                    } else actionContext.rangeModifier = 15;
                } else if (distance <= 3) actionContext.rangeModifier = 5;
                else if (distance <= 6) actionContext.rangeModifier = 0;
                else if (distance <= 20) actionContext.rangeModifier = -5;
                else if (distance <= 60) actionContext.rangeModifier = -10;
                else actionContext.rangeModifier = -15;
                logToConsole(`Distance: ${distance.toFixed(2)}, Base Range Modifier: ${actionContext.rangeModifier}`);
                if (distance > 6) {
                    let weaponSpecificMod = 0;
                    if (weapon.type.includes("bow")) weaponSpecificMod = -3;
                    else if (weapon.type.includes("shotgun")) weaponSpecificMod = -2;
                    else if (weapon.type.includes("rifle") && !(weapon.tags && weapon.tags.includes("sniper"))) weaponSpecificMod = 2;
                    else if (weapon.tags && weapon.tags.includes("sniper")) weaponSpecificMod = 5;
                    actionContext.rangeModifier += weaponSpecificMod;
                    if (weaponSpecificMod !== 0) logToConsole(`Weapon-specific modifier for ${weapon.name} at distance > 6: ${weaponSpecificMod}. New RangeMod: ${actionContext.rangeModifier}`);
                }
            } else console.warn("Warning: Attacker or target map position is undefined for ranged attack calculation.");
            if (weapon.type.includes("firearm")) {
                if (fireMode === "burst") { actionContext.attackModifier = -5; actionContext.isBurst = true; }
                else if (fireMode === "auto") { actionContext.attackModifier = -8; actionContext.isAutomatic = true; }
            }
        }

        attackResult = this.calculateAttackRoll(attacker, weapon, defender ? intendedBodyPart : null, actionContext);
        defenseResult = this.calculateDefenseRoll(defender, defender ? (defender === this.gameState ? (this.gameState.playerDefenseChoice ? this.gameState.playerDefenseChoice.type : "Dodge") : (this.gameState.npcDefenseChoice || "Dodge")) : "None", weapon, coverBonus, {});

        let targetDescriptionForLog;
        if (defender) {
            targetDescriptionForLog = `${defenderName}'s ${intendedBodyPart}`;
        } else if (this.gameState.pendingCombatAction && this.gameState.pendingCombatAction.targetTile) {
            targetDescriptionForLog = `tile at X:${this.gameState.pendingCombatAction.targetTile.x}, Y:${this.gameState.pendingCombatAction.targetTile.y}`;
        } else {
            targetDescriptionForLog = "an unknown target"; // Fallback, should not happen
        }
        // logMsg is already declared at the beginning of the function
        logMsg = `ATTACK: ${attackerName} targets ${targetDescriptionForLog} with ${weapon ? weapon.name : 'Unarmed'} (Mode: ${fireMode}). ` +
            `Roll: ${attackResult.roll} (Nat: ${attackResult.naturalRoll}, Skill (${actionContext.skillName}): ${actionContext.skillBasedModifier}, ` +
            `BodyPart: ${actionContext.bodyPartModifier}, Range: ${actionContext.rangeModifier}, Mode: ${actionContext.attackModifier}, Move: ${actionContext.attackerMovementPenalty})`;
        logToConsole(logMsg);
        if (actionContext.attackerMovementPenalty !== 0) logToConsole(`Movement: ${attackerName} ${actionContext.attackerMovementPenalty} to attack roll.`);

        if (defender) {
            let defenderDefenseTypeToUse = defender === this.gameState ? (this.gameState.playerDefenseChoice ? this.gameState.playerDefenseChoice.type : "Dodge") : (this.gameState.npcDefenseChoice || "Dodge");
            if (defenderDefenseTypeToUse !== "None") {
                let defenseLogMsg = `DEFENSE: ${defenderName} (${defenderDefenseTypeToUse} - ${defenseResult.defenseSkillName}). ` +
                    `Roll: ${defenseResult.roll} (Nat: ${defenseResult.naturalRoll}, Skill: ${defenseResult.defenseSkillValue}, Cover: +${defenseResult.coverBonusApplied}, Move: +${defenseResult.movementBonusApplied || 0})`;
                logToConsole(defenseLogMsg);
                if (defenseResult.movementBonusApplied !== 0) logToConsole(`Movement: ${defenderName} +${defenseResult.movementBonusApplied} to defense roll.`);
            } else logToConsole(`DEFENSE: ${defenderName} (None - Ranged). Effective defense from cover: ${defenseResult.roll}`);
            if (document.getElementById('defenseRollResult')) document.getElementById('defenseRollResult').textContent = `Defense Roll (${defenderDefenseTypeToUse}): ${defenseResult.roll} (Natural: ${defenseResult.naturalRoll}, Cover: ${defenseResult.coverBonusApplied}, Moved: +${defenseResult.movementBonusApplied || 0}, ${defenderName})`;
        }

        let hit = false;
        if (defender) {
            if (attackResult.isCriticalHit) hit = true;
            else if (attackResult.isCriticalMiss) hit = false;
            else if (defenseResult.isCriticalFailure && (defender === this.gameState ? (this.gameState.playerDefenseChoice ? this.gameState.playerDefenseChoice.type : "Dodge") : (this.gameState.npcDefenseChoice || "Dodge")) !== "None") hit = true;
            else if (defenseResult.isCriticalSuccess && (defender === this.gameState ? (this.gameState.playerDefenseChoice ? this.gameState.playerDefenseChoice.type : "Dodge") : (this.gameState.npcDefenseChoice || "Dodge")) !== "None" && !attackResult.isCriticalHit) hit = false;
            else hit = attackResult.roll > defenseResult.roll;
            outcomeMessage = hit ? `RESULT: Hit! ${attackerName} strikes ${defenderName}` : `RESULT: Miss! ${attackerName} fails to strike ${defenderName}`;
            outcomeMessage += ` (Attack ${attackResult.roll} vs Defense ${defenseResult.roll}).`;
        } else if (weapon && weapon.type === "weapon_thrown_explosive") {
            hit = true;
            outcomeMessage = `RESULT: ${weapon.name} lands at targeted tile ${this.gameState.pendingCombatAction.targetTile.x},${this.gameState.pendingCombatAction.targetTile.y}.`;
        } else {
            hit = false;
            outcomeMessage = `RESULT: Attack on empty tile with non-explosive weapon. No effect.`;
        }

        logToConsole(outcomeMessage);
        if (document.getElementById('attackRollResult')) document.getElementById('attackRollResult').textContent = `Attack Roll: ${attackResult.roll} (Natural: ${attackResult.naturalRoll}, ${attackerName})`;

        let actualTargetBodyPartForDamage = intendedBodyPart;

        const isThrownExplosive = weapon && weapon.type === "weapon_thrown_explosive";
        const isImpactLauncher = weapon && weapon.explodesOnImpact && !isThrownExplosive;
        const explosiveProperties = (isThrownExplosive || isImpactLauncher) ?
            ((weapon.ammoType && this.assetManager.getItem(weapon.ammoType)) ? this.assetManager.getItem(weapon.ammoType) : weapon)
            : null;

        let explosionProcessed = false;
        let determinedImpactTile = null;

        if (explosiveProperties && explosiveProperties.burstRadiusFt > 0) {
            let explosionReason = "";
            if (isThrownExplosive) {
                determinedImpactTile = this.gameState.pendingCombatAction.targetTile ||
                    (defender && defender.mapPos) ||
                    (attacker === this.gameState ? this.gameState.playerPos : (attacker.mapPos || this.gameState.playerPos));
                explosionReason = `${explosiveProperties.name} thrown to tile (${determinedImpactTile.x},${determinedImpactTile.y})`;
                logToConsole(`INFO: Thrown explosive ${explosiveProperties.name} detonates at X:${determinedImpactTile.x}, Y:${determinedImpactTile.y}.`);
                if (!hit && defender) {
                    logToConsole(`INFO: Initial throw of ${explosiveProperties.name} missed direct hit on ${defenderName}. Explosion occurs at target tile.`);
                }
                explosionProcessed = true;
            } else if (isImpactLauncher && hit && defender && defender.mapPos) {
                determinedImpactTile = defender.mapPos;
                explosionReason = `${explosiveProperties.name} impacts ${defenderName}`;
                explosionProcessed = true;
            }

            if (determinedImpactTile && explosionProcessed) {
                logToConsole(`EXPLOSION TRIGGERED: ${explosionReason}. Radius: ${explosiveProperties.burstRadiusFt}ft.`);
                const burstRadiusTiles = Math.ceil(explosiveProperties.burstRadiusFt / 5);
                const affectedCharacters = this.getCharactersInBlastRadius(determinedImpactTile, burstRadiusTiles);

                affectedCharacters.forEach(char => {
                    const charName = char === this.gameState ? "Player" : (char.name || char.id);
                    let affectedByBlast = true;

                    if (isThrownExplosive) {
                        if (char !== defender || (char === defender && !hit)) {
                            const attackerThrowRoll = attackResult.roll;
                            const charDodgeRoll = rollDie(20) + getStatModifier("Dexterity", char);
                            logToConsole(`EXPLOSION DODGE: ${charName} attempts to dodge ${explosiveProperties.name} blast. Roll: ${charDodgeRoll} vs Throw Hit Quality: ${attackerThrowRoll}`);
                            if (charDodgeRoll >= attackerThrowRoll) {
                                affectedByBlast = false;
                                logToConsole(`RESULT: ${charName} dodged the blast from the thrown explosive!`);
                            } else {
                                logToConsole(`RESULT: ${charName} failed to dodge the blast.`);
                            }
                        } else if (char === defender && hit) {
                            logToConsole(`INFO: ${charName} (primary target) was directly hit by the thrown explosive object; no separate dodge roll against the immediate blast.`);
                        }
                    } else if (isImpactLauncher && char !== defender) {
                        logToConsole(`INFO: ${charName} is in blast radius of impact launcher, affected by blast (no specific dodge).`);
                    } else if (isImpactLauncher && char === defender && hit) {
                        logToConsole(`INFO: ${charName} (primary target) was directly hit by impact launcher; no separate dodge roll against the immediate blast.`);
                    }

                    if (affectedByBlast) {
                        const healthObject = (char === this.gameState) ? this.gameState.health : char.health;
                        let targetBodyPartForExplosion = "Torso";
                        if (healthObject) {
                            const availableParts = Object.keys(healthObject).filter(partName =>
                                healthObject[partName].current > 0 &&
                                (!healthObject[partName].isDestroyed)
                            );
                            if (availableParts.length > 0) {
                                targetBodyPartForExplosion = availableParts[Math.floor(Math.random() * availableParts.length)];
                            } else {
                                logToConsole(`EXPLOSION: No viable parts left for ${charName} to target. Defaulting to Torso.`);
                            }
                        } else {
                            logToConsole(`EXPLOSION WARNING: Could not find health object for ${charName}. Defaulting to Torso.`);
                        }

                        const explosionDamageRolled = rollDiceNotation(parseDiceNotation(explosiveProperties.damage));
                        const formattedTargetPart = window.formatBodyPartName ? window.formatBodyPartName(targetBodyPartForExplosion) : targetBodyPartForExplosion;
                        logToConsole(`EXPLOSION DAMAGE: ${explosiveProperties.name} deals ${explosionDamageRolled} ${explosiveProperties.damageType} to ${charName}'s ${formattedTargetPart} (randomly selected).`);
                        this.applyDamage(attacker, char, targetBodyPartForExplosion, explosionDamageRolled, explosiveProperties.damageType, explosiveProperties);
                    }
                });
            }
        }

        if (hit && !explosionProcessed && defender) {
            let defenderDefenseTypeToUse = defender === this.gameState ? (this.gameState.playerDefenseChoice ? this.gameState.playerDefenseChoice.type : "Dodge") : (this.gameState.npcDefenseChoice || "Dodge");
            if (defenderDefenseTypeToUse === "BlockUnarmed") {
                const blockRollNatural = defenseResult.naturalRoll;
                let blockingLimb = null;
                if (defender === this.gameState && this.gameState.playerDefenseChoice) blockingLimb = this.gameState.playerDefenseChoice.blockingLimb;
                if (blockRollNatural >= 11) {
                    if (blockingLimb) {
                        actualTargetBodyPartForDamage = blockingLimb;
                        logToConsole(`Block Redirect: ${defenderName}'s Unarmed Block (Nat ${blockRollNatural}) redirects damage to ${blockingLimb}.`);
                    }
                } else {
                    logToConsole(`Block Failed: ${defenderName}'s Unarmed Block (Nat ${blockRollNatural}) fails. Damage to ${intendedBodyPart}.`);
                }
            }
            if (attackType === "ranged" && weapon && weapon.type.includes("firearm")) {
                if (actionContext.isBurst) numHits = rollDie(3);
                else if (actionContext.isAutomatic) numHits = Math.min(rollDie(6), rollDie(6));
                if (numHits > 1) logToConsole(`${fireMode} Fire: ${numHits} shots connect.`);
            }
            this.gameState.combatPhase = 'applyDamage';
            if (attackType === 'melee') this.calculateAndApplyMeleeDamage(attacker, defender, weapon, hit, attackResult.naturalRoll, defenseResult.naturalRoll, actualTargetBodyPartForDamage);
            else if (attackType === 'ranged' && !isImpactLauncher) {
                this.calculateAndApplyRangedDamage(attacker, defender, weapon, actualTargetBodyPartForDamage, hit, attackResult, numHits);
            }
        }
        else if (!hit && !isThrownExplosive && !explosionProcessed) {
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
        }

        if (hit && defender && defender.health && !explosionProcessed) {
            const finalTargetPartKey = actualTargetBodyPartForDamage.toLowerCase().replace(/\s/g, '');
            if (defender.health[finalTargetPartKey] && defender.health[finalTargetPartKey].current <= 0) {
                logToConsole(`CRITICAL DAMAGE (Post-Direct Attack): ${defenderName}'s ${finalTargetPartKey} is destroyed!`);
                if (finalTargetPartKey === "head" || finalTargetPartKey === "torso") {
                    logToConsole(`DEFEATED (Post-Direct Attack): ${defenderName} has fallen!`);
                    if (defender === this.gameState) { this.endCombat(); window.gameOver(this.gameState); return; }
                    else {
                        this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== defender);
                        this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                        if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health.torso.current > 0 && e.entity.health.head.current > 0)) {
                            this.endCombat(); return;
                        }
                    }
                    window.mapRenderer.scheduleRender();
                }
            }
        }
        else if (!isThrownExplosive && !explosionProcessed && !hit) {
        }

        if (weapon && weapon.type && weapon.type.includes("thrown")) {
            const isRegularThrownItem = !weapon.type.includes("explosive");
            const isExplosiveThrownItemAndProcessed = weapon.type.includes("explosive") && explosionProcessed;

            // Condition for removal:
            // 1. It's a regular (non-explosive) thrown item (always remove after throw attempt).
            // 2. It's an explosive thrown item AND it was processed (e.g., detonated).
            if (isRegularThrownItem || isExplosiveThrownItemAndProcessed) {
                if (attacker === this.gameState) { // Check if the attacker is the player
                    let thrownItemHandIndex = -1;
                    // Use the weapon object from the pendingCombatAction for matching,
                    // as it's the source of truth for the item used in the action.
                    const itemUsedInAction = this.gameState.pendingCombatAction ? this.gameState.pendingCombatAction.weapon : null;

                    if (itemUsedInAction) {
                        // Check hand slot 0
                        if (this.gameState.inventory.handSlots[0] && this.gameState.inventory.handSlots[0].id === itemUsedInAction.id) {
                            thrownItemHandIndex = 0;
                            // Check hand slot 1
                        } else if (this.gameState.inventory.handSlots[1] && this.gameState.inventory.handSlots[1].id === itemUsedInAction.id) {
                            thrownItemHandIndex = 1;
                        }
                    } else {
                        logToConsole("ERROR: pendingCombatAction.weapon was null when trying to identify thrown item to remove from hand.");
                    }

                    if (thrownItemHandIndex !== -1) {
                        const thrownItemName = this.gameState.inventory.handSlots[thrownItemHandIndex].name;
                        this.gameState.inventory.handSlots[thrownItemHandIndex] = null; // Remove item from hand
                        logToConsole(`ACTION: Player threw ${thrownItemName}. Item removed from hand slot ${thrownItemHandIndex + 1}.`);
                        window.updateInventoryUI(); // Update inventory display

                        // If player is still in attack declaration phase (e.g., has more AP), refresh weapon select
                        if (this.gameState.isInCombat && this.gameState.combatPhase === 'playerAttackDeclare') {
                            this.populateWeaponSelect();
                        }
                    } else {
                        // Enhanced logging if the item wasn't found in either hand slot
                        let hand0Name = this.gameState.inventory.handSlots[0] ? this.gameState.inventory.handSlots[0].name : "Empty";
                        let hand0Id = this.gameState.inventory.handSlots[0] ? this.gameState.inventory.handSlots[0].id : "N/A";
                        let hand1Name = this.gameState.inventory.handSlots[1] ? this.gameState.inventory.handSlots[1].name : "Empty";
                        let hand1Id = this.gameState.inventory.handSlots[1] ? this.gameState.inventory.handSlots[1].id : "N/A";
                        const actionItemName = itemUsedInAction ? itemUsedInAction.name : "Unknown item from action";
                        const actionItemId = itemUsedInAction ? itemUsedInAction.id : "Unknown ID from action";
                        logToConsole(`ERROR: Could not find thrown weapon ${actionItemName} (ID: ${actionItemId}) in player's hand slots to remove. Hand0: ${hand0Name} (ID: ${hand0Id}), Hand1: ${hand1Name} (ID: ${hand1Id})`);
                    }
                }
            }
        }

        if (this.gameState.isInCombat) {
            const defenderIsPlayer = defender === this.gameState;
            let defenderActuallyDefeated = false;
            if (defender) {
                if (defenderIsPlayer) {
                    if (this.gameState.health.head.current <= 0 || this.gameState.health.torso.current <= 0) defenderActuallyDefeated = true;
                } else {
                    if (defender.health && defender.health.head && defender.health.torso &&
                        (defender.health.head.current <= 0 || defender.health.torso.current <= 0)) {
                        defenderActuallyDefeated = true;
                    }
                }
                if (defenderActuallyDefeated) {
                    const defeatedName = defenderIsPlayer ? "Player" : defender.name;
                    if (this.initiativeTracker.find(e => e.entity === defender)) {
                        logToConsole(`DEFEATED: ${defeatedName} succumbed to wounds.`);
                        this.initiativeTracker = this.initiativeTracker.filter(entry => entry.entity !== defender);
                        this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                        if (defenderIsPlayer) { this.endCombat(); window.gameOver(this.gameState); return; }
                        window.mapRenderer.scheduleRender();
                    }
                }
            }


            if (!this.gameState.isInCombat) return;

            if (this.gameState.dualWieldPending && attacker === this.gameState && this.gameState.isInCombat) {
                this.gameState.dualWieldPending = false;
                const offHandWeapon = this.gameState.inventory.handSlots[1];

                if (offHandWeapon && offHandWeapon.type.includes("firearm")) {
                    logToConsole(`DUAL WIELD: Executing off-hand attack with ${offHandWeapon.name}.`);
                    let bulletsToConsume = 1;
                    logToConsole(`COMBAT: ${offHandWeapon.name} fires ${bulletsToConsume} bullet(s) in single mode (off-hand).`);

                    const originalPendingAction = { ...this.gameState.pendingCombatAction };
                    let offHandActionContext = {
                        isSecondAttack: true, isBurst: false, isAutomatic: false,
                        rangeModifier: 0, attackModifier: 0,
                        attackerMovementPenalty: actionContext.attackerMovementPenalty
                    };

                    const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
                    const defenderMapPosForOffhand = defender ? defender.mapPos : null;

                    if (attackerMapPos && defenderMapPosForOffhand) {
                        const dx = defenderMapPosForOffhand.x - attackerMapPos.x;
                        const dy = defenderMapPosForOffhand.y - attackerMapPos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= 1) offHandActionContext.rangeModifier = 15;
                        else if (distance <= 3) offHandActionContext.rangeModifier = 5;
                        else if (distance <= 6) offHandActionContext.rangeModifier = 0;
                        else if (distance <= 20) offHandActionContext.rangeModifier = -5;
                        else if (distance <= 60) offHandActionContext.rangeModifier = -10;
                        else offHandActionContext.rangeModifier = -15;

                        if (distance > 6) {
                            let weaponSpecificMod = 0;
                            if (offHandWeapon.type.includes("bow")) weaponSpecificMod = -3;
                            else if (offHandWeapon.type.includes("shotgun")) weaponSpecificMod = -2;
                            else if (offHandWeapon.type.includes("rifle") && !(offHandWeapon.tags && offHandWeapon.tags.includes("sniper"))) weaponSpecificMod = 2;
                            else if (offHandWeapon.tags && offHandWeapon.tags.includes("sniper")) weaponSpecificMod = 5;
                            offHandActionContext.rangeModifier += weaponSpecificMod;
                        }
                        logToConsole(`DUAL WIELD: Off-hand range modifier: ${offHandActionContext.rangeModifier} (Distance: ${distance.toFixed(2)})`);
                    }

                    const offHandAttackResult = this.calculateAttackRoll(attacker, offHandWeapon, originalPendingAction.bodyPart, offHandActionContext);
                    logToConsole(`DUAL WIELD ATTACK: ${attackerName} (off-hand) targets ${defenderName}'s ${originalPendingAction.bodyPart} with ${offHandWeapon.name}. ` +
                        `Roll: ${offHandAttackResult.roll} (Nat: ${offHandAttackResult.naturalRoll}, Skill (${offHandActionContext.skillName}): ${offHandActionContext.skillBasedModifier}, ` +
                        `BodyPart: ${offHandActionContext.bodyPartModifier}, Range: ${offHandActionContext.rangeModifier}, Move: ${offHandActionContext.attackerMovementPenalty})`);

                    if (defender) {
                        const defenderCoverBonus = this.getDefenderCoverBonus(defender);
                        const offHandDefenseResult = this.calculateDefenseRoll(defender, "None", offHandWeapon, defenderCoverBonus, {});
                        logToConsole(`DUAL WIELD DEFENSE: ${defenderName} (Passive/Cover). Effective Defense: ${offHandDefenseResult.roll}`);
                        const offHandHit = offHandAttackResult.roll > offHandDefenseResult.roll && !offHandAttackResult.isCriticalMiss;

                        if (offHandHit) {
                            logToConsole(`RESULT: DUAL WIELD Hit! ${attackerName}'s off-hand ${offHandWeapon.name} strikes ${defenderName}.`);
                            this.calculateAndApplyRangedDamage(attacker, defender, offHandWeapon, originalPendingAction.bodyPart, true, offHandAttackResult, 1);
                            if (defender.health && (defender.health.head.current <= 0 || defender.health.torso.current <= 0)) {
                                logToConsole(`DEFEATED: ${defenderName} has fallen after off-hand attack!`);
                                this.initiativeTracker = this.initiativeTracker.filter(entry => entry.entity !== defender);
                                this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                                if (defender === this.gameState) { this.endCombat(); window.gameOver(this.gameState); return; }
                                if (!this.initiativeTracker.some(e => !e.isPlayer)) { this.endCombat(); return; }
                                window.mapRenderer.scheduleRender();
                            }
                        } else {
                            logToConsole(`RESULT: DUAL WIELD Miss! ${attackerName}'s off-hand ${offHandWeapon.name} fails to strike ${defenderName}.`);
                        }
                    } else {
                        logToConsole(`DUAL WIELD: Off-hand attack on tile target. No defense roll.`);
                    }
                } else {
                    logToConsole("DUAL WIELD: Off-hand item not a firearm or missing. Skipping off-hand attack.");
                }
            }


            const liveNpcs = this.initiativeTracker.filter(entry =>
                !entry.isPlayer && entry.entity &&
                entry.entity.health && entry.entity.health.torso && entry.entity.health.head &&
                entry.entity.health.torso.current > 0 && entry.entity.health.head.current > 0
            );
            const playerInCombatAndAlive = this.initiativeTracker.some(entry =>
                entry.isPlayer && entry.entity.health.torso.current > 0 && entry.entity.health.head.current > 0
            );

            if (!playerInCombatAndAlive || (playerInCombatAndAlive && liveNpcs.length === 0)) {
                this.endCombat(); return;
            }
            if (this.initiativeTracker.length <= 1 && playerInCombatAndAlive && liveNpcs.length === 0) {
                this.endCombat(); return;
            }

            this.gameState.playerDefenseChoice = null;
            this.gameState.npcDefenseChoice = null;

            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) {
                    logToConsole("Player has action points remaining. Prompting for next action.");
                    this.promptPlayerAttackDeclaration();
                } else if (this.gameState.movementPointsRemaining > 0) {
                    logToConsole("Player has 0 AP but >0 MP. Player can move or press 'T' to end turn. Attack/Defense UI should be hidden.");
                    const attackDeclUI = document.getElementById('attackDeclarationUI');
                    if (attackDeclUI && !attackDeclUI.classList.contains('hidden')) {
                        attackDeclUI.classList.add('hidden');
                        logToConsole("INFO: Explicitly hid attackDeclarationUI for player (0 AP, >0 MP state).");
                    }
                    const defenseDeclUI = document.getElementById('defenseDeclarationUI');
                    if (defenseDeclUI && !defenseDeclUI.classList.contains('hidden')) {
                        defenseDeclUI.classList.add('hidden');
                        logToConsole("INFO: Explicitly hid defenseDeclarationUI for player (0 AP, >0 MP state).");
                    }
                    window.turnManager.updateTurnUI(); // Update AP/MP display on main UI
                } else {
                    logToConsole("Player has no action or movement points remaining. Proceeding to next turn.");
                    const playerEntity = this.gameState; // Player is gameState
                    this.nextTurn(playerEntity);
                }
            } else { // NPC was the attacker
                logToConsole(`NPC ${attacker.name || attacker.id} finished an attack sequence against ${defenderName}. AP: ${attacker.currentActionPoints}, MP: ${attacker.currentMovementPoints}.`);
                if (this.gameState.isInCombat) {
                    this.nextTurn(attacker); // 'attacker' is the NPC whose action just resolved.
                }
            }
        } else {
            // This else corresponds to if (!this.gameState.isInCombat)
            this.updateCombatUI();
        }
    }

    endPlayerTurn() {
        if (this.gameState.isInCombat && this.gameState.combatCurrentAttacker === this.gameState) {
            logToConsole("Player manually ends their turn.");
            this.gameState.actionPointsRemaining = 0;
            this.gameState.movementPointsRemaining = 0;
            window.turnManager.updateTurnUI();
            this.nextTurn();
        } else {
            logToConsole("Cannot end player turn: not in combat or not player's turn.");
        }
    }

    calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPart, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess || !target) {
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss/No Target)';
            return;
        }

        const damageType = weapon.damageType || "Ballistic";
        let totalDamageThisVolley = 0;
        logToConsole(`HITS: ${attacker === this.gameState ? "Player" : attacker.name}'s ${weapon.name} strikes ${numHits} time(s)! (Base Damage: ${weapon.damage})`);

        for (let i = 0; i < numHits; i++) {
            const damageNotation = parseDiceNotation(weapon.damage);
            const damageAmountThisBullet = rollDiceNotation(damageNotation);
            totalDamageThisVolley += damageAmountThisBullet;
            this.applyDamage(attacker, target, targetBodyPart, damageAmountThisBullet, damageType, weapon, i + 1, numHits);
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Total Raw Damage: ${totalDamageThisVolley} ${damageType} (${numHits} hits)`;
    }

    handleReloadActionDeclaration() {
        const weaponSelect = document.getElementById('combatWeaponSelect');
        const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
        let weaponObject = null;

        if (selectedOption.value === "unarmed") {
            logToConsole("Cannot reload Unarmed.");
            return;
        } else if (selectedOption.dataset.itemData) {
            weaponObject = JSON.parse(selectedOption.dataset.itemData);
        } else {
            weaponObject = this.assetManager.getItem(selectedOption.value);
        }

        if (!weaponObject) {
            logToConsole("No weapon selected or found for reloading.");
            return;
        }
        if (!(weaponObject.type.includes("firearm") || weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow"))) {
            logToConsole(`Cannot reload ${weaponObject.name}, it's not a firearm, bow, or crossbow.`);
            return;
        }


        if (this.gameState.actionPointsRemaining <= 0) {
            logToConsole("No action points remaining to reload.");
            return;
        }

        this.gameState.pendingCombatAction = {
            actionType: "Reload",
            weapon: weaponObject,
            target: null,
            entity: this.gameState,
            actionDescription: `reloads ${weaponObject.name}`
        };

        logToConsole(`Player action: Reloads ${weaponObject.name}.`);
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'resolveRolls';
        this.processAttack();
    }

    handleGrappleAttemptDeclaration() {
        if (this.gameState.actionPointsRemaining <= 0) {
            logToConsole("No action points remaining to attempt grapple.");
            return;
        }

        this.gameState.pendingCombatAction = {
            actionType: "grapple",
            target: this.gameState.combatCurrentDefender,
            entity: this.gameState,
            weapon: null,
            attackType: "melee",
            bodyPart: null,
            actionDescription: `attempts to grapple ${this.gameState.combatCurrentDefender.name}`
        };

        const primaryHandItem = this.gameState.inventory.handSlots[0];
        const offHandItem = this.gameState.inventory.handSlots[1];
        if (primaryHandItem && primaryHandItem.type.includes("firearm") && offHandItem && offHandItem.type.includes("firearm")) {
            logToConsole("Cannot attempt grapple while dual-wielding firearms.");
            document.getElementById('attackDeclarationUI').classList.remove('hidden');
            this.promptPlayerAttackDeclaration();
            return;
        }

        logToConsole(`Player action: Attempts to grapple ${this.gameState.combatCurrentDefender.name}.`);
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'resolveGrapple';
        this.processGrapple();
    }

    processGrapple() {
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;

        if (!attacker || !defender) {
            logToConsole("Error: Attacker or Defender not defined for grapple.");
            this.nextTurn();
            return;
        }

        if (attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining <= 0) {
                logToConsole("No action points to complete grapple (should have been checked earlier).");
                this.promptPlayerAttackDeclaration();
                return;
            }
            this.gameState.actionPointsRemaining--;
            window.turnManager.updateTurnUI();
            logToConsole(`Action point spent for grapple attempt. Remaining: ${this.gameState.actionPointsRemaining}`);
        }


        const attackerUnarmedSkill = getSkillValue("Unarmed", attacker);
        const defenderUnarmedSkill = getSkillValue("Unarmed", defender);
        const attackerRollNatural = rollDie(20);
        const defenderRollNatural = rollDie(20);
        const attackerRoll = attackerRollNatural + attackerUnarmedSkill;
        const defenderRoll = defenderRollNatural + defenderUnarmedSkill;
        const attackerDisplayName = attacker === this.gameState ? "Player" : attacker.name;
        const defenderDisplayName = defender === this.gameState ? "Player" : defender.name;


        logToConsole(`GRAPPLE: ${attackerDisplayName} attempts grapple. Roll: ${attackerRoll} (Nat: ${attackerRollNatural}, Unarmed Skill: ${attackerUnarmedSkill})`);
        logToConsole(`GRAPPLE DEFENSE: ${defenderDisplayName} resists. Roll: ${defenderRoll} (Nat: ${defenderRollNatural}, Unarmed Skill: ${defenderUnarmedSkill})`);

        if (attackerRoll > defenderRoll) {
            if (!defender.statusEffects) {
                defender.statusEffects = {};
            }
            defender.statusEffects.isGrappled = true;
            defender.statusEffects.grappledBy = (attacker === this.gameState) ? "player" : (attacker.id || "npc");

            logToConsole(`RESULT: Grapple Succeeded! ${defenderDisplayName} is grappled by ${attackerDisplayName}.`);
        } else {
            logToConsole("RESULT: Grapple Failed!");
        }

        if (attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining > 0) {
                logToConsole("You have action points remaining.");
                this.promptPlayerAttackDeclaration();
            } else if (this.gameState.movementPointsRemaining > 0) {
                logToConsole("Grapple attempt resolved. You have movement points remaining or can end your turn.");
                this.gameState.combatPhase = 'playerPostAction';
            } else {
                logToConsole("Grapple attempt resolved. No action or movement points remaining.");
                this.nextTurn();
            }
        } else {
            this.nextTurn();
        }
    }

    getDefenderCoverBonus(defender) {
        let coverBonus = 0;
        if (defender && defender.mapPos && this.gameState.layers && this.assetManager && this.assetManager.getTileset()) {
            const defenderTileX = defender.mapPos.x;
            const defenderTileY = defender.mapPos.y;
            const layersToCheck = ['building', 'object', 'landscape'];
            for (const layerName of layersToCheck) {
                const layer = this.gameState.layers[layerName];
                if (layer && layer[defenderTileY] && layer[defenderTileY][defenderTileX] !== undefined) {
                    const currentTileId = layer[defenderTileY][defenderTileX];
                    if (currentTileId && currentTileId !== "" && currentTileId !== 0 && this.assetManager.getTileset()[currentTileId]) {
                        const tileDef = this.assetManager.getTileset()[currentTileId];
                        if (tileDef && tileDef.coverBonus) {
                            let currentTileCover = parseInt(tileDef.coverBonus, 10);
                            if (isNaN(currentTileCover)) currentTileCover = 0;
                            coverBonus = Math.max(coverBonus, currentTileCover);
                        }
                    }
                }
            }
        }
        return coverBonus;
    }

    getCharactersInBlastRadius(impactTile, burstRadiusTiles) {
        const affectedCharacters = [];
        const { x: impactX, y: impactY } = impactTile;

        if (this.gameState && this.gameState.playerPos) {
            const player = this.gameState;
            const { x: playerX, y: playerY } = player.playerPos;
            const distanceToPlayer = Math.abs(playerX - impactX) + Math.abs(playerY - impactY);
            if (distanceToPlayer <= burstRadiusTiles) {
                if (player.health && player.health.torso && player.health.torso.current > 0 && player.health.head && player.health.head.current > 0) {
                    affectedCharacters.push(player);
                }
            }
        }

        if (this.gameState && this.gameState.npcs) {
            this.gameState.npcs.forEach(npc => {
                if (npc && npc.mapPos) {
                    const { x: npcX, y: npcY } = npc.mapPos;
                    const distanceToNpc = Math.abs(npcX - impactX) + Math.abs(npcY - impactY);
                    if (distanceToNpc <= burstRadiusTiles) {
                        if (npc.health && npc.health.torso && npc.health.torso.current > 0 && npc.health.head && npc.health.head.current > 0) {
                            affectedCharacters.push(npc);
                        }
                    }
                }
            });
        }
        return affectedCharacters;
    }

    applyDamage(attacker, entity, bodyPartName, damageAmount, damageType, weapon, bulletNum = 0, totalBullets = 0) {
        let accessKey;
        const lowerBodyPartName = bodyPartName.toLowerCase();

        if (lowerBodyPartName === "head") {
            accessKey = "head";
        } else if (lowerBodyPartName === "torso") {
            accessKey = "torso";
        } else {
            // For limbs, assume bodyPartName is already in the correct camelCase
            // (e.g., "leftArm", "rightArm") as passed from the UI.
            accessKey = bodyPartName;
        }

        let part;
        const entityName = (entity === this.gameState) ? "Player" : entity.name;
        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const isPlayerVictim = (entity === this.gameState);
        let weaponName = weapon ? weapon.name : "Unarmed";
        let bulletPrefix = "";
        if (bulletNum > 0) {
            bulletPrefix = ` (Bullet ${bulletNum}/${totalBullets})`;
        }

        if (isPlayerVictim) {
            if (!this.gameState.health || !this.gameState.health[accessKey]) {
                logToConsole(`Error: Player health data missing for body part: ${accessKey} (original: ${bodyPartName})`);
                return;
            }
            part = this.gameState.health[accessKey];
            const effectiveArmor = window.getArmorForBodyPart(accessKey, entity);
            const reducedDamage = Math.max(0, damageAmount - effectiveArmor);

            logToConsole(`DAMAGE${bulletPrefix}: ${attackerName}'s ${weaponName} deals ${reducedDamage} ${damageType} to Player's ${bodyPartName} (health key: ${accessKey}) (Raw: ${damageAmount}, Armor: ${effectiveArmor}).`);
            part.current = Math.max(0, part.current - reducedDamage);
            logToConsole(`INFO: Player ${accessKey} HP: ${part.current}/${part.max}.`);

            // Add aggro before crisis/death checks
            this.shareAggroWithTeam(entity, attacker, damageAmount); // Use raw damageAmount for threat

            if (part.current === 0) {
                const formattedPartName = window.formatBodyPartName ? window.formatBodyPartName(accessKey) : accessKey.toUpperCase();
                if (part.inCrisis) {
                    logToConsole(`FATAL HIT: ${entityName}'s already crippled ${formattedPartName} was struck again! Character has died.`);
                    window.gameOver(entity);
                } else {
                    part.inCrisis = true;
                    part.crisisTimer = 3;
                    part.crisisDamageType = damageType;
                    let crisisMessage = "";
                    switch (damageType.toLowerCase()) {
                        case "ballistic": crisisMessage = `${formattedPartName} deeply lacerated!`; break;
                        case "bludgeoning": crisisMessage = `${formattedPartName} severely bruised and broken!`; break;
                        case "slashing": crisisMessage = `${formattedPartName} bleeding profusely from deep cuts!`; break;
                        case "piercing": crisisMessage = `${formattedPartName} punctured!`; break;
                        case "fire": crisisMessage = `${formattedPartName} badly burned!`; break;
                        default: crisisMessage = `${formattedPartName} critically injured!`;
                    }
                    logToConsole(`CRISIS START: ${entityName}'s ${crisisMessage} (Timer: ${part.crisisTimer} turns).`);
                }
                const sourceExplosive = weapon;
                if (sourceExplosive && sourceExplosive.explodesOnImpact) {
                    part.isDestroyed = true;
                    logToConsole(`CRITICAL DAMAGE: ${entityName}'s ${formattedPartName} is DESTROYED by the explosion!`);
                }
            }
            window.renderHealthTable(entity);
        } else {
            if (!entity.health || !entity.health[accessKey]) {
                logToConsole(`Error: ${entityName} health data missing for body part: ${accessKey} (original: ${bodyPartName})`);
                return;
            }
            part = entity.health[accessKey];
            const effectiveArmor = entity.armor ? (entity.armor[accessKey] || 0) : 0;
            const reducedDamage = Math.max(0, damageAmount - effectiveArmor);

            logToConsole(`DAMAGE${bulletPrefix}: ${attackerName}'s ${weaponName} deals ${reducedDamage} ${damageType} to ${entityName}'s ${bodyPartName} (health key: ${accessKey}) (Raw: ${damageAmount}, Armor: ${effectiveArmor}).`);
            part.current = Math.max(0, part.current - reducedDamage);
            logToConsole(`INFO: ${entityName} ${accessKey} HP: ${part.current}/${part.max}.`);

            // Add aggro before crisis/death checks
            this.shareAggroWithTeam(entity, attacker, damageAmount); // Use raw damageAmount for threat

            if (part.current === 0) {
                const formattedPartName = window.formatBodyPartName ? window.formatBodyPartName(accessKey) : accessKey.toUpperCase();
                if (part.inCrisis) {
                    logToConsole(`FATAL HIT: ${entityName}'s already crippled ${formattedPartName} was struck again! Character has died.`);
                    window.gameOver(entity);
                } else {
                    part.inCrisis = true;
                    part.crisisTimer = 3;
                    part.crisisDamageType = damageType;
                    let crisisMessage = "";
                    switch (damageType.toLowerCase()) {
                        case "ballistic": crisisMessage = `${formattedPartName} deeply lacerated!`; break;
                        case "bludgeoning": crisisMessage = `${formattedPartName} severely bruised and broken!`; break;
                        case "slashing": crisisMessage = `${formattedPartName} bleeding profusely from deep cuts!`; break;
                        case "piercing": crisisMessage = `${formattedPartName} punctured!`; break;
                        case "fire": crisisMessage = `${formattedPartName} badly burned!`; break;
                        default: crisisMessage = `${formattedPartName} critically injured!`;
                    }
                    logToConsole(`CRISIS START: ${entityName}'s ${crisisMessage} (Timer: ${part.crisisTimer} turns).`);
                }
                const sourceExplosive = weapon;
                if (sourceExplosive && sourceExplosive.explodesOnImpact) {
                    part.isDestroyed = true;
                    logToConsole(`CRITICAL DAMAGE: ${entityName}'s ${formattedPartName} is DESTROYED by the explosion!`);
                }
            }
        }
    }

    handleRetargetButtonClick() {
        this.gameState.isRetargeting = true;
        this.gameState.retargetingJustHappened = false; // Clear any previous state
        this.gameState.combatCurrentDefender = null;    // Clear current defender
        this.gameState.defenderMapPos = null;           // Clear defender position
        this.gameState.selectedTargetEntity = null;     // Clear selected entity from map click
        logToConsole("Retarget button clicked. Player should now click on a new target on the map.");
        // Call promptPlayerAttackDeclaration to update UI (hide attack options, change defender display)
        this.promptPlayerAttackDeclaration();
        // Ensure combat UI reflects the change, especially the defender display
        this.updateCombatUI();
    }

    _getTileProperties(tileId) {
        if (!tileId || !this.assetManager.tilesets) return null;
        return this.assetManager.tilesets[tileId];
    }

    _isTilePassable(x, y) {
        if (!this.gameState.layers || x < 0 || y < 0) return false;
        if (this.gameState.layers.landscape && (y >= this.gameState.layers.landscape.length || x >= this.gameState.layers.landscape[0].length)) {
            return false;
        }

        const layersToCheck = ['building', 'item'];
        for (const layerName of layersToCheck) {
            const layer = this.gameState.layers[layerName];
            if (layer && layer[y] && layer[y][x]) {
                const tileId = layer[y][x];
                if (tileId) {
                    const props = this._getTileProperties(tileId);
                    if (props && props.tags && props.tags.includes("impassable")) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    _isTileOccupiedByOtherNpc(x, y, currentNpcId) {
        for (const otherNpc of this.gameState.npcs) {
            if (otherNpc.id !== currentNpcId && otherNpc.mapPos && otherNpc.mapPos.x === x && otherNpc.mapPos.y === y) {
                if (otherNpc.health && otherNpc.health.torso && otherNpc.health.torso.current > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    _isTilePassableAndUnoccupiedForNpc(x, y, npcId) {
        return this._isTilePassable(x, y) && !this._isTileOccupiedByOtherNpc(x, y, npcId);
    }


    moveNpcTowardsTarget(npc, targetPos) {
        if (!npc.mapPos || npc.currentMovementPoints <= 0) return false;

        const dx = targetPos.x - npc.mapPos.x;
        const dy = targetPos.y - npc.mapPos.y;
        let moved = false;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx !== 0) {
                const nextX = npc.mapPos.x + Math.sign(dx);
                if (this._isTilePassableAndUnoccupiedForNpc(nextX, npc.mapPos.y, npc.id)) {
                    npc.mapPos.x = nextX;
                    moved = true;
                }
            }
            if (!moved && dy !== 0) {
                const nextY = npc.mapPos.y + Math.sign(dy);
                if (this._isTilePassableAndUnoccupiedForNpc(npc.mapPos.x, nextY, npc.id)) {
                    npc.mapPos.y = nextY;
                    moved = true;
                }
            }
        } else {
            if (dy !== 0) {
                const nextY = npc.mapPos.y + Math.sign(dy);
                if (this._isTilePassableAndUnoccupiedForNpc(npc.mapPos.x, nextY, npc.id)) {
                    npc.mapPos.y = nextY;
                    moved = true;
                }
            }
            if (!moved && dx !== 0) {
                const nextX = npc.mapPos.x + Math.sign(dx);
                if (this._isTilePassableAndUnoccupiedForNpc(nextX, npc.mapPos.y, npc.id)) {
                    npc.mapPos.x = nextX;
                    moved = true;
                }
            }
        }

        if (moved) {
            npc.currentMovementPoints--;
            npc.movedThisTurn = true; // Note: movedThisTurn is for the entire game turn, not loop iteration.
            logToConsole(`ACTION: ${npc.name} moves to (${npc.mapPos.x}, ${npc.mapPos.y}). MP Left: ${npc.currentMovementPoints}`);
            this.gameState.attackerMapPos = { ...npc.mapPos };
            window.mapRenderer.scheduleRender();
        }
        return moved;
    }

    _npcSelectTarget(npc) {
        const npcName = npc.name || npc.id || "NPC (Unknown ID)";
        this.gameState.combatCurrentDefender = null;
        this.gameState.defenderMapPos = null;

        if (npc.aggroList && npc.aggroList.length > 0) {
            // logToConsole(`NPC TARGETING (Re-eval): ${npcName} (Team: ${npc.teamId}) checking aggro list.`);
            for (const aggroEntry of npc.aggroList) {
                const potentialTarget = aggroEntry.entityRef;
                if (!potentialTarget) continue;
                const targetInInitiative = this.initiativeTracker.find(e => e.entity === potentialTarget);
                if (!targetInInitiative) continue;

                const isTargetPlayer = potentialTarget === this.gameState;
                const targetHealth = isTargetPlayer ? this.gameState.health : potentialTarget.health;
                const targetTeamId = isTargetPlayer ? this.gameState.player.teamId : potentialTarget.teamId;
                const targetMapPos = isTargetPlayer ? this.gameState.playerPos : potentialTarget.mapPos;
                const targetName = isTargetPlayer ? "Player" : (potentialTarget.name || potentialTarget.id);

                if (targetHealth && targetHealth.torso.current > 0 && targetHealth.head.current > 0 && npc.teamId !== targetTeamId && targetMapPos) {
                    this.gameState.combatCurrentDefender = potentialTarget;
                    this.gameState.defenderMapPos = { ...targetMapPos };
                    logToConsole(`NPC TARGETING: ${npcName} (Team: ${npc.teamId}) selected ${targetName} (Team: ${targetTeamId}) from aggro list (Threat: ${aggroEntry.threat}).`);
                    return true; // Target found
                }
            }
        }

        // logToConsole(`NPC TARGETING (Re-eval): ${npcName} (Team: ${npc.teamId}) no valid aggro target. Searching nearest.`);
        let closestTarget = null;
        let minDistance = Infinity;
        for (const initiativeEntry of this.initiativeTracker) {
            const candidateEntity = initiativeEntry.entity;
            if (candidateEntity === npc) continue; // Ensure NPC doesn't target itself

            const isCandidatePlayer = candidateEntity === this.gameState;
            const candidateHealth = isCandidatePlayer ? this.gameState.health : candidateEntity.health;
            const candidateTeamId = isCandidatePlayer ? this.gameState.player.teamId : candidateEntity.teamId;
            const candidateMapPos = isCandidatePlayer ? this.gameState.playerPos : candidateEntity.mapPos;
            const candidateName = isCandidatePlayer ? "Player" : (candidateEntity.name || candidateEntity.id);

            if (candidateHealth && candidateHealth.torso.current > 0 && candidateHealth.head.current > 0 && npc.teamId !== candidateTeamId && npc.mapPos && candidateMapPos) {
                const distance = Math.abs(npc.mapPos.x - candidateMapPos.x) + Math.abs(npc.mapPos.y - candidateMapPos.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTarget = candidateEntity;
                }
            }
        }

        if (closestTarget) {
            this.gameState.combatCurrentDefender = closestTarget;
            const isClosestTargetPlayer = closestTarget === this.gameState;
            const closestTargetName = isClosestTargetPlayer ? "Player" : (closestTarget.name || closestTarget.id);
            const closestTargetTeamId = isClosestTargetPlayer ? this.gameState.player.teamId : closestTarget.teamId;
            this.gameState.defenderMapPos = isClosestTargetPlayer ? { ...this.gameState.playerPos } : { ...closestTarget.mapPos };
            logToConsole(`NPC TARGETING: ${npcName} (Team: ${npc.teamId}) selected nearest enemy: ${closestTargetName} (Team: ${closestTargetTeamId}). Distance: ${minDistance}.`);
            return true; // Target found
        }

        logToConsole(`NPC TARGETING: ${npcName} (Team: ${npc.teamId}) found no valid targets after full selection process.`);
        // Explicitly nullify if no target found, ensuring clean state
        this.gameState.combatCurrentDefender = null;
        this.gameState.defenderMapPos = null;
        return false; // No target found
    }


    executeNpcCombatTurn(npc) {
        const npcName = npc.name || npc.id || "NPC (Unknown ID)";
        if (!npc || (npc.health && npc.health.torso && npc.health.torso.current <= 0) || (npc.health && npc.health.head && npc.health.head.current <= 0)) {
            logToConsole(`INFO: ${npcName} is incapacitated at start of turn. Advancing turn.`);
            this.nextTurn(npc); // Pass current NPC for logging
            return;
        }

        if (!Array.isArray(npc.aggroList)) npc.aggroList = [];

        logToConsole(`NPC TURN START: ${npcName} (AP: ${npc.currentActionPoints}, MP: ${npc.currentMovementPoints}, Team: ${npc.teamId})`);

        // Initial target selection for the turn
        if (!this._npcSelectTarget(npc)) {
            logToConsole(`NPC ACTION: ${npcName} found no valid targets at turn start. Ending turn.`);
        }
        // If _npcSelectTarget found a target, this.gameState.combatCurrentDefender will be set.
        // If not, it remains null from the helper.

        let turnEnded = false;
        if (!this.gameState.combatCurrentDefender) { // If still no target after initial selection
            turnEnded = true;
        }

        let iterationSafetyNet = 0; // Safety break for loop

        while (!turnEnded && (npc.currentActionPoints > 0 || npc.currentMovementPoints > 0) && iterationSafetyNet < 10) {
            iterationSafetyNet++;
            if (iterationSafetyNet >= 10) {
                logToConsole(`WARN: ${npcName} turn loop hit safety net. Ending turn.`);
                break;
            }

            let currentTarget = this.gameState.combatCurrentDefender;
            let currentTargetPos = this.gameState.defenderMapPos;

            // Re-evaluate target if current one is invalid/defeated
            if (!currentTarget || !currentTarget.health || currentTarget.health.torso.current <= 0 || currentTarget.health.head.current <= 0) {
                logToConsole(`${npcName} current target ${currentTarget ? (currentTarget.name || currentTarget.id) : 'None'} is invalid/defeated. Attempting to find new target.`);
                if (!this._npcSelectTarget(npc)) { // This now also nulls defender state if no target found
                    logToConsole(`${npcName} could not find a new valid target. Ending turn.`);
                    turnEnded = true;
                    break; // Break from while loop
                }
                currentTarget = this.gameState.combatCurrentDefender; // Update currentTarget
                currentTargetPos = this.gameState.defenderMapPos; // Update currentTargetPos
                if (!currentTarget) {
                    logToConsole(`${npcName} still no target after re-evaluation (should have been nulled by _npcSelectTarget). Ending turn.`);
                    turnEnded = true;
                    break; // Break from while loop
                }
            }

            const targetName = currentTarget === this.gameState ? "Player" : (currentTarget.name || currentTarget.id);
            let actionTakenThisLoopIteration = false;

            let weaponToUse = npc.equippedWeaponId ? this.assetManager.getItem(npc.equippedWeaponId) : null;
            let attackType = 'unarmed';
            let fireMode = 'single'; // Default fire mode

            if (weaponToUse) {
                if (weaponToUse.type.includes("melee")) attackType = 'melee';
                else if (weaponToUse.type.includes("firearm") || weaponToUse.type.includes("bow") || weaponToUse.type.includes("crossbow") || weaponToUse.type.includes("weapon_ranged_other")) {
                    attackType = 'ranged';
                    if (weaponToUse.fireModes && weaponToUse.fireModes.length > 0) {
                        fireMode = weaponToUse.fireModes.includes("burst") ? "burst" : weaponToUse.fireModes[0];
                    }
                } else if (weaponToUse.type.includes("thrown")) {
                    attackType = 'ranged';
                }
            }
            if (attackType === 'unarmed' && !weaponToUse) attackType = 'melee';

            const distanceToTarget = npc.mapPos && currentTargetPos ?
                (Math.abs(npc.mapPos.x - currentTargetPos.x) + Math.abs(npc.mapPos.y - currentTargetPos.y)) : Infinity;

            const canAttack = (attackType === 'melee' && distanceToTarget <= 1) || (attackType === 'ranged');

            if (canAttack && npc.currentActionPoints > 0) {
                logToConsole(`${npcName} (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints}) decides to ATTACK ${targetName} with ${weaponToUse ? weaponToUse.name : 'Unarmed'} (Mode: ${fireMode}). Dist: ${distanceToTarget}`);
                this.gameState.pendingCombatAction = {
                    target: currentTarget, weapon: weaponToUse, attackType: attackType,
                    bodyPart: "Torso", fireMode: fireMode, actionType: "attack", entity: npc,
                    actionDescription: `${attackType} attack by ${npcName}`
                };
                npc.currentActionPoints--;
                actionTakenThisLoopIteration = true;
                this.gameState.combatPhase = 'defenderDeclare';
                this.handleDefenderActionPrompt();

                if (this.gameState.combatPhase === 'playerDefenseDeclare') {
                    logToConsole(`INFO: ${npcName} turn paused, awaiting player defense declaration.`);
                    return;
                }
            } else if (distanceToTarget > 1 && attackType === 'melee' && npc.currentMovementPoints > 0) {
                logToConsole(`${npcName} (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints}) decides to MOVE towards ${targetName} (melee). Dist: ${distanceToTarget}`);
                if (this.moveNpcTowardsTarget(npc, currentTargetPos)) {
                    actionTakenThisLoopIteration = true;
                } else {
                    logToConsole(`${npcName} could not move closer to ${targetName}.`);
                }
            } else if (attackType === 'ranged' && distanceToTarget > (weaponToUse?.effectiveRange || 20) && npc.currentMovementPoints > 0) {
                logToConsole(`${npcName} (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints}) decides to MOVE towards ${targetName} (ranged). Dist: ${distanceToTarget}`);
                if (this.moveNpcTowardsTarget(npc, currentTargetPos)) {
                    actionTakenThisLoopIteration = true;
                } else {
                    logToConsole(`${npcName} could not move closer to ${targetName} (ranged).`);
                }
            }

            if (!actionTakenThisLoopIteration) {
                logToConsole(`NPC ${npcName} took no specific action this iteration (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints}, Target: ${targetName}, Dist: ${distanceToTarget}). Considering end of turn.`);
                turnEnded = true;
            }
            if (npc.currentActionPoints === 0 && npc.currentMovementPoints === 0) {
                logToConsole(`${npcName} has no AP or MP left. Ending turn.`);
                turnEnded = true;
            }
        } // End of while loop

        const aboutToEndTurnNpc = npc; // Capture the current NPC
        logToConsole(`${npcName} turn processing finished. AP Left: ${npc.currentActionPoints}, MP Left: ${npc.currentMovementPoints}. Proceeding to nextTurn().`);
        this.nextTurn(aboutToEndTurnNpc);
    }

    updateCombatUI() {
        const currentAttackerEl = document.getElementById('currentAttacker');
        const currentDefenderEl = document.getElementById('currentDefender');
        const attackerPromptEl = document.getElementById('attackerPrompt');
        const defenderPromptEl = document.getElementById('defenderPrompt');
        const attackRollResultEl = document.getElementById('attackRollResult');
        const defenseRollResultEl = document.getElementById('defenseRollResult');
        const damageResultEl = document.getElementById('damageResult');

        const attackerName = this.gameState.combatCurrentAttacker ? (this.gameState.combatCurrentAttacker === this.gameState ? (document.getElementById('charName')?.value || "Player") : this.gameState.combatCurrentAttacker.name) : '-';
        const defenderName = this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender === this.gameState ? (document.getElementById('charName')?.value || "Player") : this.gameState.combatCurrentDefender.name) : '-';

        if (currentAttackerEl) currentAttackerEl.textContent = `Attacker: ${attackerName}`;
        if (currentDefenderEl) currentDefenderEl.textContent = `Defender: ${defenderName}`;

        if (attackerPromptEl && (this.gameState.combatPhase !== 'playerAttackDeclare' || document.getElementById('attackDeclarationUI').classList.contains('hidden'))) {
            attackerPromptEl.innerHTML = '';
        }
        if (defenderPromptEl && (this.gameState.combatPhase !== 'playerDefenseDeclare' || document.getElementById('defenseDeclarationUI').classList.contains('hidden'))) {
            defenderPromptEl.innerHTML = '';
        }

        if (!this.gameState.isInCombat) {
            if (attackRollResultEl) attackRollResultEl.textContent = 'Attack Roll: -';
            if (defenseRollResultEl) defenseRollResultEl.textContent = 'Defense Roll: -';
            if (damageResultEl) damageResultEl.textContent = 'Damage: -';
            this.gameState.attackerMapPos = null;
            this.gameState.defenderMapPos = null;
            // Ensure player name is updated in UI even when combat ends if player was last attacker/defender
            const charNameVal = document.getElementById('charName')?.value || "Player";
            if (currentAttackerEl && currentAttackerEl.textContent.includes("Player")) currentAttackerEl.textContent = `Attacker: ${charNameVal}`;
            if (currentDefenderEl && currentDefenderEl.textContent.includes("Player")) currentDefenderEl.textContent = `Defender: ${charNameVal}`;
            window.mapRenderer.scheduleRender();
        }
    }
}
window.CombatManager = CombatManager;