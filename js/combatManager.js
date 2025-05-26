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
            if (item && item.type && (item.type.includes("melee") || item.type.includes("firearm") || item.type.includes("bow") || item.type.includes("crossbow") || item.type.includes("thrown"))) {
                const weaponOption = document.createElement('option');
                weaponOption.value = item.id || item.name; // Use item.id if available, else item.name
                weaponOption.textContent = item.name;
                // Store item data directly for easier access in the event listener
                weaponOption.dataset.itemData = JSON.stringify(item);
                weaponSelect.appendChild(weaponOption);
            }
        });

        // Event listener for weapon selection change
        weaponSelect.removeEventListener('change', this.handleWeaponSelectionChange.bind(this)); // Remove old listener if any
        weaponSelect.addEventListener('change', this.handleWeaponSelectionChange.bind(this));

        // Initial call to set fire mode visibility based on default selected weapon
        this.handleWeaponSelectionChange({ target: weaponSelect });
    }

    handleWeaponSelectionChange(event) {
        const weaponSelect = event.target;
        const fireModeSelect = document.getElementById('combatFireModeSelect');
        const grappleButton = document.getElementById('attemptGrappleButton');
        const confirmAttackButton = document.getElementById('confirmAttackButton');
        const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        const reloadWeaponButton = document.getElementById('reloadWeaponButton'); // Added for Reload

        if (!fireModeSelect || !grappleButton || !confirmAttackButton || !bodyPartSelect || !reloadWeaponButton) {
            console.error("One or more UI elements for attack declaration not found in handleWeaponSelectionChange");
            return;
        }

        const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
        let weaponObject = null;

        if (selectedOption.value === "unarmed") {
            weaponObject = null;
        } else if (selectedOption.dataset.itemData) {
            weaponObject = JSON.parse(selectedOption.dataset.itemData);
        } else { // Fallback if itemData is not on the option (e.g. from assetManager directly if needed)
            weaponObject = this.assetManager.getItem(selectedOption.value);
        }

        if (weaponObject && weaponObject.type && weaponObject.type.includes("firearm")) {
            fireModeSelect.classList.remove('hidden');
            grappleButton.classList.add('hidden');
            confirmAttackButton.classList.remove('hidden');
            bodyPartSelect.classList.remove('hidden');
        } else if (selectedOption.value === "unarmed") {
            fireModeSelect.classList.add('hidden');
            fireModeSelect.value = "single";
            grappleButton.classList.remove('hidden');
            confirmAttackButton.classList.remove('hidden'); // Unarmed strike is still possible
            bodyPartSelect.classList.remove('hidden'); // For unarmed strike
        } else { // Other weapons (melee, bows, etc.)
            fireModeSelect.classList.add('hidden');
            fireModeSelect.value = "single";
            grappleButton.classList.add('hidden');
            confirmAttackButton.classList.remove('hidden');
            bodyPartSelect.classList.remove('hidden');
            // Show reload for melee/bows/crossbows if they are reloadable (e.g. crossbows)
            if (weaponObject && (weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow"))) {
                reloadWeaponButton.classList.remove('hidden');
            } else {
                reloadWeaponButton.classList.add('hidden');
            }
        }

        // Visibility for firearms (already handled above for fireModeSelect)
        if (weaponObject && weaponObject.type && weaponObject.type.includes("firearm")) {
            reloadWeaponButton.classList.remove('hidden'); // Show for firearms
        } else if (selectedOption.value !== "unarmed" && !(weaponObject && (weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow")))) {
            // Hide for other non-firearm, non-bow/crossbow weapons unless it's unarmed
            reloadWeaponButton.classList.add('hidden');
        }
        // If unarmed, reload button should be hidden (handled by the firearm check not being true, and bow/crossbow not true)
        if (selectedOption.value === "unarmed") {
            reloadWeaponButton.classList.add('hidden');
        }
    }

    promptPlayerAttackDeclaration() {
        if (!this.gameState.combatCurrentDefender) {
            const availableNpcs = this.initiativeTracker.filter(entry =>
                !entry.isPlayer &&
                entry.entity.health &&
                entry.entity.health.torso && entry.entity.health.torso.current > 0 &&
                entry.entity.health.head && entry.entity.health.head.current > 0
            );
            if (availableNpcs.length > 0) {
                this.gameState.combatCurrentDefender = availableNpcs[0].entity;
                logToConsole(`Auto-targeting ${this.gameState.combatCurrentDefender.name}.`);
                const defenderDisplay = document.getElementById('currentDefender');
                if (defenderDisplay) defenderDisplay.textContent = `Defender: ${this.gameState.combatCurrentDefender.name}`;
            } else {
                logToConsole("No valid NPC targets available. Combat may need to end.");
                this.endCombat();
                return;
            }
        }
        this.populateWeaponSelect(); // This will also set up the event listener and initial fire mode state
        const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        if (bodyPartSelect) bodyPartSelect.value = "Torso";

        // Explicitly hide and reset fire mode select when the prompt is shown initially
        const fireModeSelect = document.getElementById('combatFireModeSelect');
        const attemptGrappleButton = document.getElementById('attemptGrappleButton');
        const breakGrappleButton = document.getElementById('breakGrappleButton'); // New button

        if (fireModeSelect) {
            // Check the initially selected weapon again, as populateWeaponSelect might select one
            const weaponSelect = document.getElementById('combatWeaponSelect');
            const selectedWeaponValue = weaponSelect.value;
            let weaponObject = null;
            if (selectedWeaponValue === "unarmed") {
                weaponObject = null;
            } else {
                const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
                if (selectedOption && selectedOption.dataset.itemData) {
                    weaponObject = JSON.parse(selectedOption.dataset.itemData);
                } else {
                    weaponObject = this.assetManager.getItem(selectedWeaponValue);
                }
            }

            if (weaponObject && weaponObject.type && weaponObject.type.includes("firearm")) {
                fireModeSelect.classList.remove('hidden');
                // Populate based on weaponObject.fireModes if available
                // For now, assuming static options are fine and just visibility is managed.
            } else {
                fireModeSelect.classList.add('hidden');
            }
            fireModeSelect.value = "single"; // Default to single
        }

        // Grapple and Break Grapple button visibility
        if (attemptGrappleButton && breakGrappleButton) {
            const playerIsGrappled = this.gameState.statusEffects && this.gameState.statusEffects.isGrappled === true;
            const defender = this.gameState.combatCurrentDefender;
            const playerIsGrapplingDefender = defender && defender.statusEffects && defender.statusEffects.isGrappled === true && defender.statusEffects.grappledBy === 'player';

            if (playerIsGrappled) {
                breakGrappleButton.classList.remove('hidden');
                attemptGrappleButton.classList.add('hidden'); // Can't attempt grapple if already grappled
            } else {
                breakGrappleButton.classList.add('hidden');
                if (playerIsGrapplingDefender) {
                    attemptGrappleButton.classList.add('hidden'); // Can't attempt new grapple if already grappling current defender
                } else {
                    // Show attempt grapple only if a weapon is not selected that hides it (e.g. firearm)
                    const weaponSelect = document.getElementById('combatWeaponSelect');
                    const selectedWeaponValue = weaponSelect.value;
                    let weaponObject = null;
                    if (selectedWeaponValue !== "unarmed") {
                        const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
                        if (selectedOption && selectedOption.dataset.itemData) {
                            weaponObject = JSON.parse(selectedOption.dataset.itemData);
                        } else {
                            weaponObject = this.assetManager.getItem(selectedWeaponValue);
                        }
                    }
                    if (weaponObject && weaponObject.type && weaponObject.type.includes("firearm")) {
                        attemptGrappleButton.classList.add('hidden');
                    } else {
                        attemptGrappleButton.classList.remove('hidden');
                    }
                }
            }
        }


        this.gameState.combatPhase = 'playerAttackDeclare';
        document.getElementById('attackDeclarationUI').classList.remove('hidden');
        const oldAttackerPrompt = document.getElementById('attackerPrompt');
        if (oldAttackerPrompt) oldAttackerPrompt.innerHTML = '';
        logToConsole("Declare your attack using the UI.");
    }

    promptPlayerDefenseDeclaration(attackData) {
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
        // document.getElementById('combatDefenseDescription').value = ""; // Removed

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
                blockingLimbSelect.value = "LeftArm"; // Ensure a default is set when shown
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
        // console.log("[DEBUG] promptPlayerDefenseDeclaration: UI shown, phase set to 'playerDefenseDeclare'. Attack Data:", attackData); // DEBUG REMOVED
    }

    startCombat(participants) {
        this.initiativeTracker = [];
        this.gameState.playerMovedThisTurn = false;
        participants.forEach(participant => {
            const isPlayer = participant === this.gameState;
            const entityForStatLookup = isPlayer ? this.gameState : participant;
            const initiativeRoll = rollDie(20) + getStatModifier("Dexterity", entityForStatLookup);

            let participantEntry = { entity: participant, initiative: initiativeRoll, isPlayer: isPlayer };
            if (!isPlayer) {
                participantEntry.entity.movedThisTurn = false;
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
            const entityName = entry.isPlayer ? "Player" : entry.entity.name;
            p.textContent = `${entityName}: ${entry.initiative}`;
            if (index === this.currentTurnIndex) {
                p.style.fontWeight = 'bold';
                p.style.color = 'green';
            }
            initiativeDisplay.appendChild(p);
        });
    }

    nextTurn() {
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
        const attackerName = currentEntry.isPlayer ? "Player" : this.gameState.combatCurrentAttacker.name;
        logToConsole(`It's now ${attackerName}'s turn.`);

        if (currentEntry.isPlayer) {
            const availableNpcs = this.initiativeTracker.filter(entry =>
                !entry.isPlayer && entry.entity &&
                entry.entity.health &&
                entry.entity.health.torso.current > 0 &&
                entry.entity.health.head.current > 0
            );
            if (availableNpcs.length > 0) {
                this.gameState.combatCurrentDefender = availableNpcs[0].entity;
                logToConsole(`Player is targeting ${this.gameState.combatCurrentDefender.name}.`);
            } else {
                logToConsole("No valid NPC targets for player. Combat ends.");
                this.endCombat();
                return;
            }
        } else {
            this.gameState.combatCurrentDefender = this.gameState;
            logToConsole(`${attackerName} is targeting Player.`);
        }
        const defenderDisplay = document.getElementById('currentDefender');
        if (defenderDisplay && this.gameState.combatCurrentDefender) {
            defenderDisplay.textContent = `Defender: ${this.gameState.combatCurrentDefender === this.gameState ? "Player" : this.gameState.combatCurrentDefender.name}`;
        }

        if (currentEntry.isPlayer) {
            this.gameState.playerMovedThisTurn = false; // Reset player movement flag at start of their turn
            this.gameState.actionPointsRemaining = 1;
            this.gameState.movementPointsRemaining = 6; // Standard MP, will be updated if Dash is used
            updateTurnUI();
            this.promptPlayerAttackDeclaration();
        } else {
            currentEntry.entity.movedThisTurn = false; // Reset NPC movement flag at start of their turn
            this.gameState.combatPhase = 'attackerDeclare';
            this.executeNpcCombatTurn(this.gameState.combatCurrentAttacker);
        }
        this.updateInitiativeDisplay();
    }

    endCombat() {
        this.gameState.isInCombat = false;
        this.gameState.combatPhase = null;

        // Clear grapple status from all entities
        this.initiativeTracker.forEach(entry => {
            if (entry.entity && entry.entity.statusEffects) {
                entry.entity.statusEffects.isGrappled = false;
                entry.entity.statusEffects.grappledBy = null;
            }
        });
        if (this.gameState.statusEffects) { // Clear for player too
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
    }

    handleConfirmedAttackDeclaration() {
        const weaponSelect = document.getElementById('combatWeaponSelect');
        const bodyPartSelect = document.getElementById('combatBodyPartSelect');
        // const actionDescInput = document.getElementById('combatActionDescription'); // Removed
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
                else if (weaponObject.type.includes("firearm") || weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow")) attackType = "ranged";
                else if (weaponObject.type.includes("thrown")) attackType = "ranged";
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
        const bodyPart = bodyPartSelect.value;
        const actionDescription = weaponObject ? `attacks with ${weaponObject.name}` : "attacks unarmed"; // Changed

        const fireModeSelect = document.getElementById('combatFireModeSelect');
        const fireMode = fireModeSelect ? fireModeSelect.value : "single";

        this.gameState.pendingCombatAction = {
            target: this.gameState.combatCurrentDefender,
            weapon: weaponObject,
            attackType: attackType,
            bodyPart: bodyPart,
            actionDescription: actionDescription,
            fireMode: fireMode,
            actionType: "attack",
            entity: this.gameState
        };
        logToConsole(`Player declares ${attackType} attack on ${this.gameState.combatCurrentDefender.name}'s ${bodyPart} with ${weaponObject ? weaponObject.name : 'Unarmed'} (${actionDescription}, Mode: ${fireMode}).`);
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'defenderDeclare';
        this.handleDefenderActionPrompt();
    }

    handleConfirmedDefenseDeclaration() {
        // console.log("[DEBUG] handleConfirmedDefenseDeclaration: Function called."); // DEBUG REMOVED
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
        // console.log("[DEBUG] handleConfirmedDefenseDeclaration: Player choice: ", this.gameState.playerDefenseChoice); // DEBUG REMOVED

        logToConsole(`Player chose to ${defenseType} ${blockingLimb ? `with ${blockingLimb}` : ''} (${description}).`);

        const defenseUI = document.getElementById('defenseDeclarationUI');
        if (defenseUI) {
            defenseUI.classList.add('hidden');
            // console.log("[DEBUG] handleConfirmedDefenseDeclaration: Defense UI hidden."); // DEBUG REMOVED
        } else {
            console.error("handleConfirmedDefenseDeclaration: defenseDeclarationUI element not found to hide!");
        }

        this.gameState.combatPhase = 'resolveRolls';
        // console.log("[DEBUG] handleConfirmedDefenseDeclaration: Combat phase set to 'resolveRolls'."); // DEBUG REMOVED

        this.processAttack();
        // console.log("[DEBUG] handleConfirmedDefenseDeclaration: processAttack called."); // DEBUG REMOVED
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
        logToConsole(`${defenderNpc.name} decides to ${chosenDefense}.`);
    }

    handleDefenderActionPrompt() {
        const defender = this.gameState.combatCurrentDefender;
        const attacker = this.gameState.combatCurrentAttacker;
        if (!defender) {
            logToConsole("Error in handleDefenderActionPrompt: Defender not set. Attacker was " + (attacker === this.gameState ? "Player" : attacker.name));
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration();
            else this.nextTurn();
            return;
        }
        if (defender === this.gameState) {
            if (!this.gameState.pendingCombatAction || Object.keys(this.gameState.pendingCombatAction).length === 0) {
                logToConsole("Error: No pending attack action data for player defense. Defaulting defense.");
                this.gameState.playerDefenseChoice = { type: "Dodge", blockingLimb: null, description: "Error - No attack data" };
                this.gameState.combatPhase = 'resolveRolls';
                this.processAttack();
                return;
            }
            if (this.gameState.pendingCombatAction.attackType === "ranged" &&
                this.gameState.pendingCombatAction.weapon &&
                !this.gameState.pendingCombatAction.weapon.type.includes("thrown")) {
                logToConsole("Player cannot actively defend (dodge/block) against non-thrown ranged attacks. Proceeding to resolve.");
                this.gameState.playerDefenseChoice = { type: "None", blockingLimb: null, description: "No active defense vs ranged" };
                this.gameState.combatPhase = 'resolveRolls';
                this.processAttack();
            } else {
                this.promptPlayerDefenseDeclaration(this.gameState.pendingCombatAction);
            }
        } else {
            this.decideNpcDefense();
            this.gameState.combatPhase = 'resolveRolls';
            this.processAttack();
        }
    }

    calculateAttackRoll(attacker, weapon, targetBodyPartArg, actionContext = {}) {
        const targetBodyPart = targetBodyPartArg;
        let skillName;
        let skillBasedModifier;
        let attackerMovementPenalty = 0;

        // Modifiers from actionContext, defaulting to 0 if not provided
        const rangeModifier = actionContext.rangeModifier || 0;
        const attackModifierForFireMode = actionContext.attackModifier || 0;

        // Check for attacker movement penalty - This logging is now done in processAttack
        if (attacker === this.gameState && this.gameState.playerMovedThisTurn) {
            attackerMovementPenalty = -2;
            // logToConsole("Player (attacker) moved this turn: -2 to attack roll."); // Logging moved
        } else if (attacker !== this.gameState && attacker.movedThisTurn) {
            attackerMovementPenalty = -2;
            // logToConsole(`${attacker.name || 'NPC Attacker'} moved this turn: -2 to attack roll.`); // Logging moved
        }

        // Determine skill and base modifier
        if (!weapon || weapon === "unarmed" || !weapon.type) {
            skillName = "Unarmed";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("melee")) {
            skillName = "Melee Weapons";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("firearm") || weapon.type.includes("bow") || weapon.type.includes("crossbow")) {
            skillName = "Guns"; // Skill for firearms, bows, crossbows
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("thrown")) {
            skillName = "Strength (for thrown)"; // Skill for thrown weapons is Strength stat
            skillBasedModifier = getStatModifier("Strength", attacker);
        } else {
            skillName = "Unarmed"; // Default for any other unknown weapon type
            skillBasedModifier = getSkillModifier(skillName, attacker);
        }

        // Ensure statusEffects objects exist
        if (!attacker.statusEffects) {
            attacker.statusEffects = {};
        }
        // Defender is not directly available here, it's gameState.combatCurrentDefender
        // However, the grapple state of the defender *by the attacker* is passed via actionContext.isGrappling
        // We need to check the defender's general grappled state for the attacker's advantage
        const defender = this.gameState.combatCurrentDefender; // Get the defender object
        if (!defender.statusEffects) {
            defender.statusEffects = {};
        }

        let baseRoll;
        const isSecondAttack = actionContext.isSecondAttack;

        const attackerIsGrappled = attacker.statusEffects.isGrappled === true;
        const attackerId = (attacker === this.gameState) ? "player" : (attacker.id || "npc");
        const defenderIsGrappledByAttacker = defender.statusEffects.isGrappled === true && defender.statusEffects.grappledBy === attackerId;

        let advantage = false;
        let disadvantage = false;

        if (attackerIsGrappled) {
            disadvantage = true;
            logToConsole("Attacker is grappled.");
        }
        if (defenderIsGrappledByAttacker) {
            advantage = true;
            logToConsole("Attacker is grappling the defender.");
        }
        if (isSecondAttack) {
            disadvantage = true;
            logToConsole("Second attack this turn.");
        }

        if (advantage && !disadvantage) {
            baseRoll = Math.max(rollDie(20), rollDie(20));
            logToConsole("Attacking with advantage.");
        } else if (disadvantage && !advantage) {
            baseRoll = Math.min(rollDie(20), rollDie(20));
            logToConsole("Attacking with disadvantage.");
        } else {
            baseRoll = rollDie(20);
            if (advantage && disadvantage) {
                logToConsole("Advantage and disadvantage cancel out. Normal roll.");
            } else {
                logToConsole("Normal roll.");
            }
        }

        // Body part difficulty modifiers
        let bodyPartModifier = 0;
        const lowerCaseTargetBodyPart = targetBodyPart.toLowerCase().replace(/\s/g, '');
        if (lowerCaseTargetBodyPart === "head") bodyPartModifier = -4;
        else if (["leftarm", "rightarm", "leftleg", "rightleg"].includes(lowerCaseTargetBodyPart)) bodyPartModifier = -1;

        const totalAttackRoll = baseRoll + skillBasedModifier + bodyPartModifier + rangeModifier + attackModifierForFireMode + attackerMovementPenalty;

        // Determine if a critical hit/miss is possible
        // Crits are not possible if there was advantage or disadvantage from grappling/second attack,
        // or if it's a burst/automatic fire.
        const hadAdvantageOrDisadvantage = (advantage && !disadvantage) || (disadvantage && !advantage);
        const canCrit = !(hadAdvantageOrDisadvantage || actionContext.isBurst || actionContext.isAutomatic);

        return {
            roll: totalAttackRoll,
            naturalRoll: baseRoll,
            isCriticalHit: canCrit && baseRoll === 20,
            isCriticalMiss: canCrit && baseRoll === 1
        };
    }

    calculateDefenseRoll(defender, defenseType, attackerWeapon, coverBonus = 0, actionContext = {}) {
        if (defenseType === "None") {
            // Even with "None" defense, movement bonus still applies against the attack roll if defender moved.
            // However, the spirit of "None" defense usually means no active defense roll.
            // The coverBonus is the primary "defense" here.
            // If defender movement should apply even here, it would modify the effective target number for the attacker.
            // For now, let's assume movement bonus applies to active defenses.
            return { roll: coverBonus, naturalRoll: 0, isCriticalSuccess: false, isCriticalFailure: false, coverBonusApplied: coverBonus, movementBonusApplied: 0 }; // Ensure movementBonusApplied is returned
        }
        const baseRoll = rollDie(20);
        let baseDefenseValue = 0;
        let defenderMovementBonus = 0;

        // Check for defender movement bonus - This logging is now done in processAttack
        if (defender === this.gameState && this.gameState.playerMovedThisTurn) {
            defenderMovementBonus = 2;
            // logToConsole("Player (defender) moved this turn: +2 to defense roll."); // Logging moved
        } else if (defender !== this.gameState && defender.movedThisTurn) {
            defenderMovementBonus = 2;
            // logToConsole(`${defender.name || 'NPC Defender'} moved this turn: +2 to defense roll.`); // Logging moved
        }


        switch (defenseType) {
            case "Dodge":
                baseDefenseValue = getStatModifier("Dexterity", defender) + getSkillModifier("Unarmed", defender);
                break;
            case "BlockUnarmed":
                baseDefenseValue = getStatModifier("Constitution", defender) + getSkillModifier("Unarmed", defender);
                break;
            case "BlockArmed":
                baseDefenseValue = getSkillModifier("Melee Weapons", defender);
                break;
        }
        const totalDefenseRoll = baseRoll + baseDefenseValue + coverBonus + defenderMovementBonus;
        return { roll: totalDefenseRoll, naturalRoll: baseRoll, isCriticalSuccess: baseRoll === 20, isCriticalFailure: baseRoll === 1, coverBonusApplied: coverBonus, movementBonusApplied: defenderMovementBonus };
    }

    calculateAndApplyMeleeDamage(attacker, target, weapon, hitSuccess, attackNaturalRoll, defenseNaturalRoll, targetBodyPartForDamage) {
        if (!hitSuccess) {
            logToConsole("No damage as the attack missed.");
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
            return;
        }
        let damageAmount = 0;
        let damageType = "";
        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;

        if (weapon === null) { // Unarmed attack
            damageType = "Bludgeoning";
            const unarmedModifierValue = getSkillModifier("Unarmed", attacker);
            if (unarmedModifierValue <= 0) {
                damageAmount = Math.max(0, rollDie(2) - 1); // 1d2-1, min 0
                logToConsole(`${attackerName} attacks unarmed (modifier ${unarmedModifierValue}), rolls 1d2-1, deals ${damageAmount} ${damageType} damage.`);
            } else {
                // If unarmedModifierValue is 1, rollDie(1) will correctly return 1.
                damageAmount = rollDie(unarmedModifierValue);
                logToConsole(`${attackerName} attacks unarmed (modifier ${unarmedModifierValue}), rolls 1d${unarmedModifierValue}, deals ${damageAmount} ${damageType} damage.`);
            }
        } else { // Armed melee attack
            damageType = weapon.damageType || "Physical";
            const damageNotation = parseDiceNotation(weapon.damage);
            damageAmount = rollDiceNotation(damageNotation);
            logToConsole(`${attackerName}'s ${weapon.name} dealt ${damageAmount} ${damageType} damage.`);
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Damage: ${damageAmount} ${damageType}`;
        this.applyDamage(target, targetBodyPartForDamage, damageAmount, damageType);
    }

    calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPartForDamage, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess) {
            logToConsole("No damage as the attack missed (ranged).");
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
            return;
        }
        const damageType = weapon.damageType || "Ballistic";
        let totalDamageThisVolley = 0;
        logToConsole(`${attacker === this.gameState ? "Player" : attacker.name}'s ${weapon.name} hits ${numHits} time(s)!`);

        for (let i = 0; i < numHits; i++) {
            const damageNotation = parseDiceNotation(weapon.damage);
            const damageAmountThisBullet = rollDiceNotation(damageNotation);
            totalDamageThisVolley += damageAmountThisBullet;
            logToConsole(`Bullet ${i + 1} deals ${damageAmountThisBullet} ${damageType} damage to ${target.name}'s ${targetBodyPartForDamage}.`);
            this.applyDamage(target, targetBodyPartForDamage, damageAmountThisBullet, damageType);
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Total Damage: ${totalDamageThisVolley} ${damageType} (${numHits} hits)`;
    }


    processAttack() {
        if (this.gameState.combatPhase !== 'resolveRolls') {
            console.error("processAttack called at incorrect combat phase:", this.gameState.combatPhase);
            return;
        }
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;
        const { weapon, attackType, bodyPart: intendedBodyPart, fireMode = "single", actionType = "attack" } = this.gameState.pendingCombatAction || {};

        // Ensure pendingCombatAction and actionType are defined before proceeding
        if (!this.gameState.pendingCombatAction || !this.gameState.pendingCombatAction.actionType) {
            console.error("processAttack called without a valid pendingCombatAction or actionType.");
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration();
            else this.nextTurn();
            return;
        }

        // Handle Reload action first as it doesn't involve rolls or defender
        if (this.gameState.pendingCombatAction.actionType === "Reload") {
            const weaponToReload = this.gameState.pendingCombatAction.weapon;
            logToConsole(`${attacker === this.gameState ? "Player" : attacker.name} reloads ${weaponToReload ? weaponToReload.name : 'their weapon'}.`);
            // Actual ammo tracking / clip capacity is a future enhancement. For now, it just consumes AP.
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) {
                    logToConsole("Not enough action points to reload.");
                    this.promptPlayerAttackDeclaration(); // Allow player to choose another action
                    return;
                }
                this.gameState.actionPointsRemaining--;
                updateTurnUI();
                logToConsole(`Action point spent for reload. Remaining: ${this.gameState.actionPointsRemaining}`);
            }

            // After reloading, determine next step for player
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) {
                    this.promptPlayerAttackDeclaration();
                } else if (this.gameState.movementPointsRemaining > 0) {
                    logToConsole("Reload complete. You have movement points remaining or can end your turn.");
                    this.gameState.combatPhase = 'playerPostAction';
                } else {
                    this.nextTurn();
                }
            } else { // NPC reloaded
                this.nextTurn();
            }
            return; // Reload action is complete
        }

        // Initialize actionContext for this attack
        let actionContext = {
            isGrappling: false,
            rangeModifier: 0,
            attackModifier: 0, // This will store burst/auto penalty
            isBurst: false,
            isAutomatic: false,
            isSecondAttack: false // Placeholder for future multiple attack logic
        };

        // Proceed with standard attack or other future action types
        if (this.gameState.pendingCombatAction.actionType === "attack") {
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) {
                    logToConsole("Not enough action points to complete the attack.");
                    this.promptPlayerAttackDeclaration();
                    return;
                }
                this.gameState.actionPointsRemaining--;
                updateTurnUI();
                logToConsole(`Action point spent for attack. Remaining: ${this.gameState.actionPointsRemaining}`);
            }
        } else if (this.gameState.pendingCombatAction.actionType === "grapple") {
            console.error("processAttack called with actionType 'grapple'. This should be handled by processGrapple.");
            this.nextTurn();
            return;
        }

        let attackResult, defenseResult;
        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const defenderName = (defender === this.gameState) ? "Player" : defender.name;

        let numHits = 1; // Default to 1 hit, will be modified by burst/auto
        let coverBonus = 0;

        // Set actionContext.isGrappling
        if (defender.statusEffects && defender.statusEffects.isGrappled) {
            const grappledById = (attacker === this.gameState) ? 'player' : (attacker.id || null);
            if (grappledById && defender.statusEffects.grappledBy === grappledById) {
                actionContext.isGrappling = true;
                logToConsole(`${attackerName} is grappling ${defenderName}. Grapple context for point-blank set.`);
            }
        }

        // Calculate Cover Bonus from defender's tile
        if (defender && defender.mapPos && this.gameState.layers && this.assetManager && this.assetManager.getTileset()) {
            const defenderTileX = defender.mapPos.x;
            const defenderTileY = defender.mapPos.y;
            // Check 'building' and 'object' layers for cover. Add 'landscape' if trees etc. are there.
            // For this implementation, assuming 'object' layer might contain trees/barricades defined in tileset.
            // And 'landscape' might contain boulders/large rocks.
            const layersToCheck = ['building', 'object', 'landscape'];

            for (const layerName of layersToCheck) {
                const layer = this.gameState.layers[layerName];
                if (layer && layer[defenderTileY] && layer[defenderTileY][defenderTileX] !== undefined) {
                    const currentTileId = layer[defenderTileY][defenderTileX];
                    // Ensure currentTileId is not empty or 0 before trying to access tileset
                    if (currentTileId && currentTileId !== "" && currentTileId !== 0 && this.assetManager.getTileset()[currentTileId]) {
                        const tileDef = this.assetManager.getTileset()[currentTileId];
                        if (tileDef && tileDef.coverBonus) {
                            let currentTileCover = parseInt(tileDef.coverBonus, 10);
                            if (isNaN(currentTileCover)) currentTileCover = 0;
                            coverBonus = Math.max(coverBonus, currentTileCover); // Take the best cover from any layer
                        }
                    }
                }
            }
            if (coverBonus > 0) {
                logToConsole(`${defenderName} is on a tile providing cover bonus: +${coverBonus}`);
            }
        }


        // Ranged attack calculations for rangeModifier and potentially fireMode attackModifier
        if (attackType === 'ranged') {
            const attackerMapPos = (attacker === this.gameState) ? this.gameState.playerPos : attacker.mapPos;
            const defenderMapPos = defender.mapPos; // Assuming defender always has mapPos

            if (attackerMapPos && defenderMapPos) {
                const dx = defenderMapPos.x - attackerMapPos.x;
                const dy = defenderMapPos.y - attackerMapPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // General Range Modifiers
                if (distance <= 1) { // Point-blank
                    if (weapon && weapon.tags && weapon.tags.includes("requires_grapple_for_point_blank")) {
                        actionContext.rangeModifier = actionContext.isGrappling ? 15 : 0;
                        if (!actionContext.isGrappling) logToConsole(`${weapon.name} requires grapple for point-blank; no bonus/penalty, effectively 0 from this rule.`);
                    } else {
                        actionContext.rangeModifier = 15;
                    }
                } else if (distance <= 3) { // Close
                    actionContext.rangeModifier = 5;
                } else if (distance <= 6) { // Medium
                    actionContext.rangeModifier = 0;
                } else if (distance <= 20) { // Long
                    actionContext.rangeModifier = -5;
                } else if (distance <= 60) { // Very Long
                    actionContext.rangeModifier = -10;
                } else { // Extremely Long
                    actionContext.rangeModifier = -15;
                }
                logToConsole(`Distance: ${distance.toFixed(2)}, Base Range Modifier: ${actionContext.rangeModifier}`);


                // Weapon-Specific Range Modifiers (only if distance > 6)
                if (distance > 6) {
                    let weaponSpecificMod = 0;
                    if (weapon && weapon.type.includes("bow")) weaponSpecificMod = -3;
                    else if (weapon && weapon.type.includes("shotgun")) weaponSpecificMod = -2; // Shotguns are poor at long range
                    else if (weapon && weapon.type.includes("rifle") && !(weapon.tags && weapon.tags.includes("sniper"))) weaponSpecificMod = 2;
                    else if (weapon && weapon.tags && weapon.tags.includes("sniper")) weaponSpecificMod = 5;
                    actionContext.rangeModifier += weaponSpecificMod;
                    if (weaponSpecificMod !== 0) logToConsole(`Weapon-specific modifier for ${weapon ? weapon.name : 'unknown weapon'} at distance > 6: ${weaponSpecificMod}. New RangeMod: ${actionContext.rangeModifier}`);
                }
            } else {
                logToConsole("Warning: Attacker or defender map position is undefined for ranged attack calculation.");
            }

            // Fire Mode Attack Modifier
            if (weapon && weapon.type.includes("firearm")) {
                if (fireMode === "burst") {
                    actionContext.attackModifier = -5; // This is now correctly passed to calculateAttackRoll
                    actionContext.isBurst = true;
                } else if (fireMode === "auto") {
                    actionContext.attackModifier = -8; // This is now correctly passed to calculateAttackRoll
                    actionContext.isAutomatic = true;
                }
            }
        }

        // Pass the fully populated actionContext to calculateAttackRoll
        attackResult = this.calculateAttackRoll(attacker, weapon, intendedBodyPart, actionContext);
        // Log movement penalty for attacker if applicable
        if (attacker === this.gameState && this.gameState.playerMovedThisTurn) {
            logToConsole("Player (attacker) moved this turn: -2 to attack roll.");
        } else if (attacker !== this.gameState && attacker.movedThisTurn) {
            logToConsole(`Attacker (${attacker.name}) moved this turn: -2 to attack roll.`);
        }
        logToConsole(`${attackerName} attacks ${defenderName}'s ${intendedBodyPart} with ${weapon ? weapon.name : 'Unarmed'} (Mode: ${fireMode}): rolled ${attackResult.roll} (Natural: ${attackResult.naturalRoll}, RangeMod: ${actionContext.rangeModifier}, AttackMod: ${actionContext.attackModifier})`);

        let defenderDefenseTypeToUse = "None";
        if (attackType === "melee" || (weapon && weapon.type.includes("thrown"))) {
            if (defender === this.gameState) {
                defenderDefenseTypeToUse = (this.gameState.playerDefenseChoice && this.gameState.playerDefenseChoice.type) ? this.gameState.playerDefenseChoice.type : "Dodge";
            } else {
                defenderDefenseTypeToUse = this.gameState.npcDefenseChoice || "Dodge";
            }
        }
        logToConsole(`${defenderName} is using defense: ${defenderDefenseTypeToUse}. Base Cover: +${coverBonus}`);

        let defenseActionContext = {};
        if (defender === this.gameState && defenderDefenseTypeToUse === "BlockUnarmed" && this.gameState.playerDefenseChoice && this.gameState.playerDefenseChoice.blockingLimb) {
            defenseActionContext.blockingLimb = this.gameState.playerDefenseChoice.blockingLimb;
        }

        defenseResult = this.calculateDefenseRoll(defender, defenderDefenseTypeToUse, weapon, coverBonus, defenseActionContext);
        // Log movement bonus for defender if applicable
        if (defender === this.gameState && this.gameState.playerMovedThisTurn) {
            logToConsole("Player (defender) moved this turn: +2 to defense roll.");
        } else if (defender !== this.gameState && defender.movedThisTurn) {
            logToConsole(`Defender (${defender.name}) moved this turn: +2 to defense roll.`);
        }
        if (defenderDefenseTypeToUse !== "None") {
            logToConsole(`${defenderName} defends with ${defenderDefenseTypeToUse}: Total Defense Roll ${defenseResult.roll} (Natural: ${defenseResult.naturalRoll}, Cover: +${defenseResult.coverBonusApplied}, Moved: +${defenseResult.movementBonusApplied || 0})`);
        }
        if (document.getElementById('defenseRollResult')) document.getElementById('defenseRollResult').textContent = `Defense Roll (${defenderDefenseTypeToUse}): ${defenseResult.roll} (Natural: ${defenseResult.naturalRoll}, Cover: ${defenseResult.coverBonusApplied}, Moved: +${defenseResult.movementBonusApplied || 0}, ${defenderName})`;

        let hit = false;
        let outcomeMessage = "";

        // New Hit Determination Logic
        if (attackType === 'ranged' && weapon && !weapon.type.includes("thrown")) {
            // Ranged attacks (not thrown) - Defender's active roll doesn't apply beyond cover.
            // Defense is effectively against their cover + positioning.
            // calculateDefenseRoll for "None" type (which is set for non-thrown ranged) returns coverBonus as the roll.
            if (attackResult.naturalRoll === 20) {
                hit = true;
                outcomeMessage = `${attackerName} landed a Natural 20! Automatic Hit against ${defenderName}! (Ranged)`;
            } else if (attackResult.naturalRoll === 1) {
                hit = false;
                outcomeMessage = `${attackerName} rolled a Natural 1. Critical Miss against ${defenderName}! (Ranged)`;
            } else {
                // Standard roll comparison against effective defense (cover)
                if (attackResult.roll > defenseResult.roll) {
                    hit = true;
                    outcomeMessage = `${attackerName} hits ${defenderName}! (Attack: ${attackResult.roll} vs Defense: ${defenseResult.roll}) (Ranged)`;
                } else {
                    hit = false;
                    outcomeMessage = `${attackerName} misses ${defenderName}! (Attack: ${attackResult.roll} vs Defense: ${defenseResult.roll}) (Ranged)`;
                }
            }
        } else { // Melee and Thrown attacks
            if (attackResult.naturalRoll === 20) {
                hit = true;
                // Attacker's Nat 20 overrides defender's Nat 20 as per spec.
                outcomeMessage = `${attackerName} landed a Natural 20! Automatic Hit against ${defenderName}!`;
            } else if (attackResult.naturalRoll === 1) {
                hit = false;
                outcomeMessage = `${attackerName} rolled a Natural 1. Critical Miss against ${defenderName}!`;
            } else if (defenseResult.naturalRoll === 1 && defenderDefenseTypeToUse !== "None") { // Defender Nat 1 (only for active defenses)
                hit = true;
                outcomeMessage = `${defenderName} critically failed defense (Natural 1)! ${attackerName} hits!`;
            } else if (defenseResult.naturalRoll === 20 && defenderDefenseTypeToUse !== "None") { // Defender Nat 20 (only for active defenses)
                hit = false;
                outcomeMessage = `${defenderName} rolled a Natural 20 on defense! ${attackerName} misses!`;
            } else {
                // Standard roll comparison
                if (attackResult.roll > defenseResult.roll) {
                    hit = true;
                    outcomeMessage = `${attackerName} hits ${defenderName}! (Attack: ${attackResult.roll} vs Defense: ${defenseResult.roll})`;
                } else {
                    hit = false;
                    outcomeMessage = `${attackerName} misses ${defenderName}! (Attack: ${attackResult.roll} vs Defense: ${defenseResult.roll})`;
                }
            }
        }

        logToConsole(outcomeMessage);
        if (document.getElementById('attackRollResult')) document.getElementById('attackRollResult').textContent = `Attack Roll: ${attackResult.roll} (Natural: ${attackResult.naturalRoll}, ${attackerName})`;

        let actualTargetBodyPartForDamage = intendedBodyPart;

        if (hit) {
            // 1. Check for "Headshot + Natural 1 Defense = Instant Death"
            // This rule applies if the defense was an active one (Dodge, BlockUnarmed, BlockArmed).
            // For "None" defense (like against most ranged), defenseResult.naturalRoll is 0.
            // The condition attackResult.naturalRoll !== 20 was removed as Attacker Nat 20 is an auto-hit anyway,
            // but this specific instant death rule implies the defender *tried* to defend and failed critically on a headshot.
            // If Attacker Nat 20 and Defender Nat 1 on headshot, instant death still applies.
            if (intendedBodyPart.toLowerCase().replace(/\s/g, '') === "head" &&
                defenseResult.naturalRoll === 1 &&
                defenderDefenseTypeToUse !== "None") {
                logToConsole(`${defenderName} critically failed defense (Natural 1) against a headshot to ${intendedBodyPart}! Instant death!`);
                if (defender.health && defender.health.head) { defender.health.head.current = 0; }
                // this.gameState.combatPhase = 'applyDamage'; // Not strictly needed before ending
                if (defender === this.gameState) { this.endCombat(); gameOver(); return; }
                else {
                    this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== defender);
                    this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                    if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health.torso.current > 0 && e.entity.health.head.current > 0)) {
                        logToConsole("All NPCs defeated after instant death headshot.");
                        this.endCombat(); return;
                    }
                    scheduleRender(); // Update map if NPC is removed
                    this.nextTurn();
                    return; // Important to stop further processing for this attack
                }
            }

            // 2. Determine actualTargetBodyPartForDamage based on Failed Unarmed Block rules
            if (defenderDefenseTypeToUse === "BlockUnarmed") {
                const blockRollNatural = defenseResult.naturalRoll;
                let blockingLimb = null;
                if (defender === this.gameState && this.gameState.playerDefenseChoice) {
                    blockingLimb = this.gameState.playerDefenseChoice.blockingLimb;
                }
                // NPCs currently don't choose a specific blocking limb for unarmed block.
                // If an NPC 'BlockUnarmed' fails, damage goes to intendedBodyPart.

                if (blockRollNatural >= 11) { // Block "succeeded" enough to redirect to limb
                    if (blockingLimb) { // Player's chosen limb
                        actualTargetBodyPartForDamage = blockingLimb;
                        logToConsole(`${defenderName} successfully blocked with ${blockingLimb} (Nat ${blockRollNatural}), so ${blockingLimb} takes damage.`);
                    } else if (defender !== this.gameState) { // NPC
                        logToConsole(`${defenderName} attempted to block unarmed (Nat ${blockRollNatural}), but NPC limb targeting for blocks isn't specified; damage to original target.`);
                        actualTargetBodyPartForDamage = intendedBodyPart; // Stays as intended for NPC
                    }
                } else { // Block failed badly (Nat 1-10)
                    actualTargetBodyPartForDamage = intendedBodyPart; // Attack hits intended part
                    logToConsole(`${defenderName} failed unarmed block badly (Nat ${blockRollNatural}). Attack hits originally intended ${intendedBodyPart}.`);
                }
            }
            // For other defense types (Dodge, BlockArmed, None), actualTargetBodyPartForDamage remains intendedBodyPart.

            // 3. Call appropriate damage calculation
            if (attackType === "ranged" && weapon && weapon.type.includes("firearm")) {
                if (actionContext.isBurst) numHits = rollDie(3);
                else if (actionContext.isAutomatic) numHits = Math.min(rollDie(6), rollDie(6));
            }

            this.gameState.combatPhase = 'applyDamage';
            if (attackType === 'melee') {
                this.calculateAndApplyMeleeDamage(attacker, defender, weapon, hit, attackResult.naturalRoll, defenseResult.naturalRoll, actualTargetBodyPartForDamage);
            } else if (attackType === 'ranged') {
                this.calculateAndApplyRangedDamage(attacker, defender, weapon, actualTargetBodyPartForDamage, hit, attackResult, numHits);
            }

            const finalTargetPartKey = actualTargetBodyPartForDamage.toLowerCase().replace(/\s/g, '');
            if (defender.health && defender.health[finalTargetPartKey] && defender.health[finalTargetPartKey].current <= 0) {
                logToConsole(`${defenderName}'s ${finalTargetPartKey} destroyed!`);
                if (finalTargetPartKey === "head" || finalTargetPartKey === "torso") {
                    logToConsole(`${defenderName} has been defeated!`);
                    if (defender === this.gameState) { this.endCombat(); gameOver(); return; }
                    else {
                        this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== defender);
                        this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                        if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health.torso.current > 0 && e.entity.health.head.current > 0)) {
                            this.endCombat(); return;
                        }
                    }
                    scheduleRender();
                }
            }
        } else {
            logToConsole("Attack missed. No damage dealt.");
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
        }

        if (this.gameState.isInCombat) {
            const defenderIsPlayer = defender === this.gameState;
            let defenderActuallyDefeated = false;
            if (defenderIsPlayer) {
                if (this.gameState.health.head.current <= 0 || this.gameState.health.torso.current <= 0) defenderActuallyDefeated = true;
            } else {
                if (defender.health && defender.health.head && defender.health.torso &&
                    (defender.health.head.current <= 0 || defender.health.torso.current <= 0)) {
                    defenderActuallyDefeated = true;
                }
            }
            if (defenderActuallyDefeated) {
                logToConsole(`${defenderIsPlayer ? "Player" : defender.name} has been defeated (checked post-attack).`);
                this.initiativeTracker = this.initiativeTracker.filter(entry => entry.entity !== defender);
                if (defenderIsPlayer) { this.endCombat(); gameOver(); return; }
            }

            const liveNpcs = this.initiativeTracker.filter(entry =>
                !entry.isPlayer &&
                entry.entity.health && entry.entity.health.torso && entry.entity.health.head &&
                entry.entity.health.torso.current > 0 && entry.entity.health.head.current > 0
            );
            const playerInCombatAndAlive = this.initiativeTracker.some(entry =>
                entry.isPlayer && entry.entity.health.torso.current > 0 && entry.entity.health.head.current > 0
            );

            if (!playerInCombatAndAlive || (playerInCombatAndAlive && liveNpcs.length === 0)) {
                this.endCombat(); return;
            }
            if (this.initiativeTracker.length <= 1 && playerInCombatAndAlive) {
                this.endCombat(); return;
            }

            this.gameState.playerDefenseChoice = null;
            this.gameState.npcDefenseChoice = null;

            // Player turn flow adjustment
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) {
                    logToConsole("Player has action points remaining. Prompting for next action.");
                    this.promptPlayerAttackDeclaration(); // Or a new function like continuePlayerTurnUI()
                } else if (this.gameState.movementPointsRemaining > 0) {
                    logToConsole("Player has movement points remaining. Can move or end turn.");
                    // UI should reflect this - for now, player needs to press 't' or move via map click
                    // Potentially call a function here that updates UI to show "Move or End Turn"
                    updateTurnUI(); // Ensure UI is up-to-date
                } else {
                    logToConsole("Player has no action or movement points remaining. Ending turn.");
                    this.nextTurn();
                }
            } else {
                this.nextTurn(); // NPC turn or other cases
            }
        } else {
            this.updateCombatUI();
        }
    }

    endPlayerTurn() {
        if (this.gameState.isInCombat && this.gameState.combatCurrentAttacker === this.gameState) {
            logToConsole("Player manually ends their turn.");
            this.gameState.actionPointsRemaining = 0;
            this.gameState.movementPointsRemaining = 0;
            updateTurnUI(); // Update UI to show 0 AP/MP
            this.nextTurn();
        } else {
            logToConsole("Cannot end player turn: not in combat or not player's turn.");
        }
    }

    calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPart, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess) {
            logToConsole("No damage as the attack missed (ranged).");
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
            return;
        }
        const damageType = weapon.damageType || "Ballistic";
        let totalDamageThisVolley = 0;
        logToConsole(`${attacker === this.gameState ? "Player" : attacker.name}'s ${weapon.name} hits ${numHits} time(s)!`);

        for (let i = 0; i < numHits; i++) {
            const damageNotation = parseDiceNotation(weapon.damage);
            const damageAmountThisBullet = rollDiceNotation(damageNotation);
            totalDamageThisVolley += damageAmountThisBullet;
            logToConsole(`Bullet ${i + 1} deals ${damageAmountThisBullet} ${damageType} damage to ${target.name}'s ${targetBodyPart}.`);
            this.applyDamage(target, targetBodyPart, damageAmountThisBullet, damageType);
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Total Damage: ${totalDamageThisVolley} ${damageType} (${numHits} hits)`;
    }

    handleReloadActionDeclaration() {
        const weaponSelect = document.getElementById('combatWeaponSelect');
        const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
        let weaponObject = null;

        if (selectedOption.value === "unarmed") {
            logToConsole("Cannot reload Unarmed.");
            return; // Or handle error appropriately
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
            target: null, // No target for reload
            entity: this.gameState, // Player is the entity
            actionDescription: `reloads ${weaponObject.name}`
        };

        logToConsole(`Player ${this.gameState.pendingCombatAction.actionDescription}.`);
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        // Set phase to trigger processAttack, which will handle the "Reload" actionType
        this.gameState.combatPhase = 'resolveRolls'; // Or a more specific phase if desired, but resolveRolls works
        this.processAttack(); // processAttack will see actionType "Reload"
    }

    handleGrappleAttemptDeclaration() {
        if (this.gameState.actionPointsRemaining <= 0) {
            logToConsole("No action points remaining to attempt grapple.");
            return;
        }

        this.gameState.pendingCombatAction = {
            actionType: "grapple",
            target: this.gameState.combatCurrentDefender,
            entity: this.gameState, // Player is the entity initiating
            weapon: null,
            attackType: "melee", // Grapple is a form of melee confrontation
            bodyPart: null, // Not relevant for grapple attempt itself
            actionDescription: `attempts to grapple ${this.gameState.combatCurrentDefender.name}`
        };

        logToConsole(`Player ${this.gameState.pendingCombatAction.actionDescription}.`);
        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'resolveGrapple'; // Custom phase for grapple resolution
        this.processGrapple();
    }

    processGrapple() {
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;

        if (!attacker || !defender) {
            logToConsole("Error: Attacker or Defender not defined for grapple.");
            this.nextTurn(); // Or some other error recovery
            return;
        }

        // Consume action point for the attempt
        if (attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining <= 0) {
                logToConsole("No action points to complete grapple (should have been checked earlier).");
                this.promptPlayerAttackDeclaration(); // Go back to attack prompt
                return;
            }
            this.gameState.actionPointsRemaining--;
            updateTurnUI();
            logToConsole(`Action point spent for grapple attempt. Remaining: ${this.gameState.actionPointsRemaining}`);
        }


        // Opposed Unarmed skill rolls
        // Using getSkillModifier for grapple rolls
        const attackerRoll = rollDie(20) + getSkillModifier("Unarmed", attacker);
        const defenderRoll = rollDie(20) + getSkillModifier("Unarmed", defender);

        logToConsole(`${attacker === this.gameState ? "Player" : attacker.name} grapple roll: ${attackerRoll} (d20 + ${getSkillModifier("Unarmed", attacker)} Unarmed Mod)`);
        logToConsole(`${defender === this.gameState ? "Player" : defender.name} grapple defense roll: ${defenderRoll} (d20 + ${getSkillModifier("Unarmed", defender)} Unarmed Mod)`);

        if (attackerRoll > defenderRoll) {
            // Ensure statusEffects object exists
            if (!defender.statusEffects) {
                defender.statusEffects = {};
            }
            defender.statusEffects.isGrappled = true;
            defender.statusEffects.grappledBy = (attacker === this.gameState) ? "player" : (attacker.id || "npc"); // Store who is grappling

            logToConsole(`Grapple succeeded! ${defender.name || "Defender"} is now grappled by ${attacker.name || "Attacker"}.`);
            // TODO: Implement effects of being grappled (e.g., movement restrictions, attack penalties)
            // TODO: Implement ways to escape grapple (e.g., opposed Strength or Unarmed check as an action)
        } else {
            logToConsole("Grapple failed!");
        }

        // Determine next step for the player
        if (attacker === this.gameState) {
            if (this.gameState.actionPointsRemaining > 0) {
                logToConsole("You have action points remaining.");
                this.promptPlayerAttackDeclaration();
            } else if (this.gameState.movementPointsRemaining > 0) {
                logToConsole("Grapple attempt resolved. You have movement points remaining or can end your turn.");
                this.gameState.combatPhase = 'playerPostAction'; // A phase to signify player can move or end turn
            } else {
                logToConsole("Grapple attempt resolved. No action or movement points remaining.");
                this.nextTurn();
            }
        } else {
            // If an NPC somehow initiated a grapple (not implemented yet)
            this.nextTurn();
        }
    }

    handleBreakGrappleAttempt() {
        if (this.gameState.actionPointsRemaining <= 0) {
            logToConsole("No action points remaining to attempt to break grapple.");
            return;
        }
        this.gameState.actionPointsRemaining--;
        updateTurnUI();
        logToConsole(`Action point spent for break grapple attempt. Remaining: ${this.gameState.actionPointsRemaining}`);

        if (!this.gameState.statusEffects || !this.gameState.statusEffects.isGrappled || !this.gameState.statusEffects.grappledBy) {
            logToConsole("Error: Player is not grappled or grappler ID is missing. Cannot break grapple.");
            // This state should ideally not be reachable if button visibility is correct.
            // Restore AP if it was an invalid action state
            // this.gameState.actionPointsRemaining++; updateTurnUI(); // Decided against restoring AP for now.
            this.promptPlayerAttackDeclaration(); // Go back to action choice
            return;
        }

        const grapplerId = this.gameState.statusEffects.grappledBy;
        if (grapplerId === "player") {
            logToConsole("Error: Player cannot be grappled by themselves. Resetting grapple status.");
            this.gameState.statusEffects.isGrappled = false;
            this.gameState.statusEffects.grappledBy = null;
            this.promptPlayerAttackDeclaration();
            return;
        }

        const grapplerEntry = this.initiativeTracker.find(entry => !entry.isPlayer && entry.entity.id === grapplerId);

        if (!grapplerEntry || !grapplerEntry.entity) {
            logToConsole(`Grappler (ID: ${grapplerId}) not found in combat or defeated. Grapple broken by default.`);
            this.gameState.statusEffects.isGrappled = false;
            this.gameState.statusEffects.grappledBy = null;
            // Proceed with player's turn
            if (this.gameState.actionPointsRemaining > 0) {
                this.promptPlayerAttackDeclaration();
            } else if (this.gameState.movementPointsRemaining > 0) {
                this.gameState.combatPhase = 'playerPostAction';
                logToConsole("Grapple broken (grappler gone). You have movement points remaining or can end your turn.");
            } else {
                this.nextTurn();
            }
            return;
        }

        const grapplerEntity = grapplerEntry.entity;
        const playerRoll = rollDie(20) + getSkillModifier("Unarmed", this.gameState);
        const grapplerRoll = rollDie(20) + getSkillModifier("Unarmed", grapplerEntity);

        logToConsole(`Player break grapple roll: ${playerRoll} (d20 + ${getSkillModifier("Unarmed", this.gameState)} Unarmed Mod)`);
        logToConsole(`${grapplerEntity.name} resist grapple break roll: ${grapplerRoll} (d20 + ${getSkillModifier("Unarmed", grapplerEntity)} Unarmed Mod)`);

        if (playerRoll > grapplerRoll) {
            this.gameState.statusEffects.isGrappled = false;
            this.gameState.statusEffects.grappledBy = null;
            // Also clear the grappler's state that they are grappling the player
            if (grapplerEntity.statusEffects) {
                grapplerEntity.statusEffects.isGrapplingTarget = false; // Assuming such a flag might exist
                // Or more generally, if an NPC is grappling, their target might be stored
                // This part depends on how NPC grappling state is managed.
                // For now, the player breaking free is the primary concern.
            }
            logToConsole("Successfully broke the grapple!");
        } else {
            logToConsole("Failed to break the grapple.");
        }

        // Determine next step for the player
        if (this.gameState.actionPointsRemaining > 0) {
            logToConsole("You have action points remaining.");
            this.promptPlayerAttackDeclaration();
        } else if (this.gameState.movementPointsRemaining > 0) {
            logToConsole("Break grapple attempt resolved. You have movement points remaining or can end your turn.");
            this.gameState.combatPhase = 'playerPostAction';
        } else {
            logToConsole("Break grapple attempt resolved. No action or movement points remaining.");
            this.nextTurn();
        }
    }

    applyDamage(entity, bodyPartName, damageAmount, damageType) {
        const normalizedBodyPartName = bodyPartName.toLowerCase().replace(/\s/g, '');
        let part;
        let entityName;
        let isPlayer = (entity === this.gameState);

        if (isPlayer) {
            if (!this.gameState.health || !this.gameState.health[normalizedBodyPartName]) {
                logToConsole(`Error: Player has no health data or no such body part: ${normalizedBodyPartName}`);
                return;
            }
            part = this.gameState.health[normalizedBodyPartName];
            entityName = "Player";
            const effectiveArmor = getArmorForBodyPart(normalizedBodyPartName);
            const reducedDamage = Math.max(0, damageAmount - effectiveArmor);
            logToConsole(`Original damage to Player's ${bodyPartName}: ${damageAmount}, Armor: ${effectiveArmor}, Reduced damage: ${reducedDamage}`);
            part.current = Math.max(part.current - reducedDamage, 0);
            logToConsole(`Player's ${normalizedBodyPartName} HP: ${part.current}/${part.max} after taking ${reducedDamage} ${damageType} damage.`);
            if (part.current === 0 && part.crisisTimer === 0) {
                part.crisisTimer = 3;
                logToConsole(`Player's ${normalizedBodyPartName} is in crisis! Treat within 3 turns or die.`);
            }
            renderHealthTable();
        } else { // NPC
            if (!entity.health || !entity.health[normalizedBodyPartName]) {
                logToConsole(`Error: ${entity.name} has no health data or no such body part: ${normalizedBodyPartName} (original input: ${bodyPartName})`);
                return;
            }
            part = entity.health[normalizedBodyPartName];
            entityName = entity.name;
            const effectiveArmor = 0;
            const reducedDamage = Math.max(0, damageAmount - effectiveArmor);
            logToConsole(`Original damage to ${entityName}'s ${bodyPartName}: ${damageAmount}, Armor: ${effectiveArmor}, Reduced damage: ${reducedDamage}`);
            part.current = Math.max(part.current - reducedDamage, 0);
            logToConsole(`${entityName}'s ${normalizedBodyPartName} HP: ${part.current}/${part.max} after taking ${reducedDamage} ${damageType} damage.`);
            if (part.current === 0) {
                logToConsole(`${entityName}'s ${normalizedBodyPartName} has been destroyed!`);
            }
        }
    }

    executeNpcCombatTurn(npc) {
        if (!npc || (npc.health && npc.health.torso && npc.health.torso.current <= 0) || (npc.health && npc.health.head && npc.health.head.current <= 0)) {
            logToConsole(`${npc ? npc.name : 'NPC'} is incapacitated and cannot attack. Advancing turn.`);
            this.nextTurn();
            return;
        }
        const playerTarget = this.gameState;
        const playerEntry = this.initiativeTracker.find(entry => entry.isPlayer);
        if (!playerEntry || (playerTarget.health.head.current <= 0 || playerTarget.health.torso.current <= 0)) {
            logToConsole(`${npc.name} has no valid player target or player is defeated. Ending NPC turn.`);
            this.nextTurn();
            return;
        }

        // Ensure statusEffects exists on NPC
        if (!npc.statusEffects) {
            npc.statusEffects = {}; // Initialize if it doesn't exist
        }

        // Check if NPC is grappled by the player
        if (npc.statusEffects.isGrappled === true && npc.statusEffects.grappledBy === 'player') {
            logToConsole(`${npc.name} is grappled by Player and will attempt to break free.`);

            const npcRoll = rollDie(20) + getSkillModifier("Unarmed", npc);
            const playerRoll = rollDie(20) + getSkillModifier("Unarmed", this.gameState);

            logToConsole(`${npc.name} break grapple roll: ${npcRoll} (d20 + ${getSkillModifier("Unarmed", npc)} Unarmed Mod)`);
            logToConsole(`Player resist grapple break roll: ${playerRoll} (d20 + ${getSkillModifier("Unarmed", this.gameState)} Unarmed Mod)`);

            if (npcRoll > playerRoll) {
                npc.statusEffects.isGrappled = false;
                npc.statusEffects.grappledBy = null;
                // Also clear the player's status of grappling this NPC
                if (this.gameState.statusEffects && this.gameState.statusEffects.grapplingTarget === npc.id) {
                    this.gameState.statusEffects.grapplingTarget = null; // Or some other way to indicate player is no longer grappling
                }
                logToConsole(`${npc.name} broke free from the grapple!`);
            } else {
                logToConsole(`${npc.name} failed to break free from the grapple.`);
            }
            this.nextTurn(); // NPC's action is consumed by the break attempt
            return;
        }

        let weaponToUse = null;
        let attackType = 'unarmed';
        let fireMode = 'single';

        if (npc.equippedWeaponId) {
            const equippedWeapon = this.assetManager.getItem(npc.equippedWeaponId);
            if (equippedWeapon) {
                weaponToUse = equippedWeapon;
                if (equippedWeapon.type && equippedWeapon.type.includes("melee")) { attackType = 'melee'; }
                else if (equippedWeapon.type && (equippedWeapon.type.includes("firearm") || equippedWeapon.type.includes("bow") || equippedWeapon.type.includes("crossbow"))) {
                    attackType = 'ranged';
                    if (equippedWeapon.fireModes && equippedWeapon.fireModes.includes("burst")) fireMode = "burst";
                }
                else if (equippedWeapon.type && equippedWeapon.type.includes("thrown")) { attackType = 'ranged'; }
            }
        }
        if (attackType === 'unarmed' && !weaponToUse) {
            attackType = 'melee'; weaponToUse = null;
        }
        const targetBodyPart = "Torso";
        this.gameState.pendingCombatAction = {
            target: playerTarget,
            weapon: weaponToUse,
            attackType: attackType,
            bodyPart: targetBodyPart,
            fireMode: fireMode,
            actionType: "attack",
            actionDescription: `${attackType} attack by ${npc.name}`,
            entity: npc
        };
        logToConsole(`${npc.name} attacks Player's ${targetBodyPart} with ${weaponToUse ? weaponToUse.name : 'Unarmed'} (Mode: ${fireMode}).`);
        this.gameState.combatPhase = 'defenderDeclare';
        this.handleDefenderActionPrompt();
    }

    updateCombatUI() {
        const currentAttackerEl = document.getElementById('currentAttacker');
        const currentDefenderEl = document.getElementById('currentDefender');
        const attackerPromptEl = document.getElementById('attackerPrompt');
        const defenderPromptEl = document.getElementById('defenderPrompt');
        const attackRollResultEl = document.getElementById('attackRollResult');
        const defenseRollResultEl = document.getElementById('defenseRollResult');
        const damageResultEl = document.getElementById('damageResult');

        if (currentAttackerEl) currentAttackerEl.textContent = `Attacker: ${this.gameState.combatCurrentAttacker ? (this.gameState.combatCurrentAttacker === this.gameState ? 'Player' : this.gameState.combatCurrentAttacker.name) : '-'}`;
        if (currentDefenderEl) currentDefenderEl.textContent = `Defender: ${this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender === this.gameState ? 'Player' : this.gameState.combatCurrentDefender.name) : '-'}`;

        if (attackerPromptEl && (this.gameState.combatPhase !== 'playerAttackDeclare' || document.getElementById('attackDeclarationUI').classList.contains('hidden'))) {
            attackerPromptEl.innerHTML = '';
        }
        if (defenderPromptEl && (this.gameState.combatPhase !== 'playerDefenseDeclare' || document.getElementById('defenseDeclarationUI').classList.contains('hidden'))) {
            defenderPromptEl.innerHTML = '';
        }

        if (!this.gameState.isInCombat) {
            if (currentAttackerEl) currentAttackerEl.textContent = 'Attacker: -';
            if (currentDefenderEl) currentDefenderEl.textContent = 'Defender: -';
            if (attackerPromptEl) attackerPromptEl.innerHTML = '';
            if (defenderPromptEl) defenderPromptEl.innerHTML = '';
            if (attackRollResultEl) attackRollResultEl.textContent = 'Attack Roll: -';
            if (defenseRollResultEl) defenseRollResultEl.textContent = 'Defense Roll: -';
            if (damageResultEl) damageResultEl.textContent = 'Damage: -';
        }
    }
}
