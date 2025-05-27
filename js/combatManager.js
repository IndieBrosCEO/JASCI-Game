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
                // Hide if only single, unless it's a launcher that should show it
                if (weaponObject.tags && weaponObject.tags.includes("launcher_treated_as_rifle")) {
                    fireModeSelect.classList.remove('hidden'); // Show for launchers even if only single
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
            if (weaponObject && (weaponObject.type.includes("bow") || weaponObject.type.includes("crossbow") || weaponObject.type === "weapon_thrown_explosive")) { // Show reload for specific other types
                reloadWeaponButton.classList.remove('hidden'); // Might be 'Throw Again' for grenades
            } else {
                reloadWeaponButton.classList.add('hidden');
            }
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
                blockingLimbSelect.value = "LeftArm";
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
        const attacker = this.gameState.combatCurrentAttacker;
        const attackerName = currentEntry.isPlayer ? "Player" : attacker.name;

        this.gameState.attackerMapPos = currentEntry.isPlayer ? { ...this.gameState.playerPos } : (attacker.mapPos ? { ...attacker.mapPos } : null);

        logToConsole(`--- ${attackerName}'s Turn ---`);

        if (currentEntry.isPlayer) {
            this.gameState.playerMovedThisTurn = false;
            this.gameState.actionPointsRemaining = 1;
            this.gameState.movementPointsRemaining = 6;
            updateTurnUI();
        } else {
            attacker.movedThisTurn = false;
            attacker.currentActionPoints = attacker.defaultActionPoints || 1;
            attacker.currentMovementPoints = attacker.defaultMovementPoints || 0;
        }

        if (currentEntry.isPlayer) {
            const availableNpcs = this.initiativeTracker.filter(entry =>
                !entry.isPlayer && entry.entity &&
                entry.entity.health &&
                entry.entity.health.torso.current > 0 &&
                entry.entity.health.head.current > 0
            );
            if (availableNpcs.length > 0) {
                this.gameState.combatCurrentDefender = availableNpcs[0].entity;
                this.gameState.defenderMapPos = this.gameState.combatCurrentDefender.mapPos ? { ...this.gameState.combatCurrentDefender.mapPos } : null;
                logToConsole(`Targeting: Player -> ${this.gameState.combatCurrentDefender.name}.`);
            } else {
                logToConsole("No valid NPC targets. Combat ends.");
                this.endCombat();
                return;
            }
        } else {
            this.gameState.combatCurrentDefender = this.gameState;
            this.gameState.defenderMapPos = { ...this.gameState.playerPos };
            logToConsole(`Targeting: ${attackerName} -> Player.`);
        }

        const defenderDisplay = document.getElementById('currentDefender');
        if (defenderDisplay && this.gameState.combatCurrentDefender) {
            const defenderName = this.gameState.combatCurrentDefender === this.gameState ? "Player" : this.gameState.combatCurrentDefender.name;
            defenderDisplay.textContent = `Defender: ${defenderName}`;
        }

        scheduleRender();

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
        scheduleRender(); // To clear highlights
    }

    handleConfirmedAttackDeclaration() {
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
        const actionDescription = weaponObject ? `attacks with ${weaponObject.name}` : "attacks unarmed";

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
            entity: this.gameState,
            skillToUse: null
        };

        if (weaponObject && weaponObject.type === "weapon_thrown_explosive") {
            this.gameState.pendingCombatAction.skillToUse = "Explosives";
            const targetEntity = this.gameState.combatCurrentDefender;
            const targetTile = targetEntity && targetEntity.mapPos ? { x: targetEntity.mapPos.x, y: targetEntity.mapPos.y } : this.gameState.playerPos;
            this.gameState.pendingCombatAction.targetTile = targetTile;
            logToConsole(`Player declares: Throwing ${weaponObject.name} at tile (${targetTile.x},${targetTile.y}) (using Explosives skill).`);
        } else {
            const primaryHandItem = this.gameState.inventory.handSlots[0];
            const offHandItem = this.gameState.inventory.handSlots[1];
            if (primaryHandItem && primaryHandItem.type.includes("firearm") &&
                offHandItem && offHandItem.type.includes("firearm") &&
                weaponObject && weaponObject.id === primaryHandItem.id) {
                this.gameState.dualWieldPending = true;
                logToConsole(`Player declares: Dual Wield attack starting with ${primaryHandItem.name} on ${this.gameState.combatCurrentDefender.name}'s ${bodyPart} (Mode: ${fireMode}). Off-hand attack with ${offHandItem.name} will follow.`);
            } else {
                this.gameState.dualWieldPending = false;
                logToConsole(`Player declares: ${attackType} attack on ${this.gameState.combatCurrentDefender.name}'s ${bodyPart} with ${weaponObject ? weaponObject.name : 'Unarmed'} (Mode: ${fireMode}).`);
            }
        }

        document.getElementById('attackDeclarationUI').classList.add('hidden');
        this.gameState.combatPhase = 'defenderDeclare';
        this.handleDefenderActionPrompt();
    }

    handleConfirmedDefenseDeclaration() {
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

        if (!defender) {
            logToConsole(`Error in handleDefenderActionPrompt: Defender not set. Attacker was ${attackerName}.`);
            if (attacker === this.gameState) this.promptPlayerAttackDeclaration();
            else this.nextTurn();
            return;
        }
        if (defender === this.gameState) {
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
                !(this.gameState.pendingCombatAction.weapon.tags && this.gameState.pendingCombatAction.weapon.tags.includes("launcher_treated_as_rifle") && this.gameState.pendingCombatAction.weapon.explodesOnImpact)) { // Non-explosive, non-thrown ranged
                logToConsole("Defense: Player cannot actively defend (dodge/block) against non-thrown, non-explosive ranged attacks. Only cover applies.");
                this.gameState.playerDefenseChoice = { type: "None", blockingLimb: null, description: "No active defense vs non-thrown/non-explosive ranged" };
                this.gameState.combatPhase = 'resolveRolls';
                this.processAttack();
            } else { // Melee, thrown, or explosive launcher attacks allow active defense attempt
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

        actionContext.bodyPartModifier = 0;
        const lowerCaseTargetBodyPart = targetBodyPart ? targetBodyPart.toLowerCase().replace(/\s/g, '') : "torso"; // Default to torso if null/undefined
        if (lowerCaseTargetBodyPart === "head") actionContext.bodyPartModifier = -4;
        else if (["leftarm", "rightarm", "leftleg", "rightleg"].includes(lowerCaseTargetBodyPart)) actionContext.bodyPartModifier = -1;

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
        if (defenseType === "None") {
            const baseRoll = rollDie(20);
            let defenderMovementBonus = 0;

            // Check if defender moved (consistent with existing logic for active defenses)
            if (defender === this.gameState && this.gameState.playerMovedThisTurn) {
                defenderMovementBonus = 2;
            } else if (defender !== this.gameState && defender.movedThisTurn) {
                // Ensure NPC 'movedThisTurn' property is checked; assume it exists on NPC objects if they can move.
                // If 'defender.movedThisTurn' might be undefined, add a check:
                // if (defender !== this.gameState && defender.movedThisTurn === true) {
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
                defenseSkillValue: 0, // No skill involved for "None" type defense
                defenseSkillName: "Passive" // Or any other suitable descriptor
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
        if (!hitSuccess) {
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
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
        if (!hitSuccess) {
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
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
            return;
        }
        const attacker = this.gameState.combatCurrentAttacker;
        const defender = this.gameState.combatCurrentDefender;
        const { weapon, attackType, bodyPart: intendedBodyPart, fireMode = "single", actionType = "attack" } = this.gameState.pendingCombatAction || {};

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
                updateTurnUI();
                logToConsole(`Action point spent for reload. Remaining: ${this.gameState.actionPointsRemaining}`);
            }

            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) {
                    this.promptPlayerAttackDeclaration();
                } else if (this.gameState.movementPointsRemaining > 0) {
                    logToConsole("Reload complete. You have movement points remaining or can end your turn.");
                    this.gameState.combatPhase = 'playerPostAction';
                } else {
                    this.nextTurn();
                }
            } else {
                this.nextTurn();
            }
            return;
        }

        let actionContext = {
            isGrappling: false,
            rangeModifier: 0,
            attackModifier: 0,
            isBurst: false,
            isAutomatic: false,
            isSecondAttack: false,
            skillToUse: this.gameState.pendingCombatAction.skillToUse // Carry over skill from declaration
        };

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

        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const defenderName = (defender === this.gameState) ? "Player" : defender.name;
        let attackResult, defenseResult;

        if (attackType === 'ranged' && weapon) {
            let bulletsToConsume = 1;
            if (fireMode === "burst") bulletsToConsume = 3;
            else if (fireMode === "auto") bulletsToConsume = 6;
            logToConsole(`COMBAT: ${weapon.name} fires ${bulletsToConsume} bullet(s) in ${fireMode} mode.`);
        }


        if (attackType === 'melee') {
            const attackerMapPos = (attacker === this.gameState) ? this.gameState.playerPos : attacker.mapPos;
            const defenderMapPos = (defender === this.gameState) ? this.gameState.playerPos : defender.mapPos;

            if (attackerMapPos && defenderMapPos) {
                const dx = Math.abs(attackerMapPos.x - defenderMapPos.x);
                const dy = Math.abs(attackerMapPos.y - defenderMapPos.y);
                const manhattanDistance = dx + dy;

                if (manhattanDistance > 1) {
                    logToConsole(`MELEE FAIL: ${attackerName}'s melee attack on ${defenderName} fails. Target out of range (Distance: ${manhattanDistance}).`);
                    if (attacker === this.gameState) {
                        if (this.gameState.actionPointsRemaining > 0) {
                            this.promptPlayerAttackDeclaration();
                        } else if (this.gameState.movementPointsRemaining > 0) {
                            logToConsole("Melee attack failed (out of range). You have movement points remaining or can end your turn.");
                            this.gameState.combatPhase = 'playerPostAction';
                            updateTurnUI();
                        } else {
                            this.nextTurn();
                        }
                    } else {
                        this.nextTurn();
                    }
                    return;
                }
            } else {
                logToConsole(`Warning: Attacker or defender map position undefined for melee range check. Attacker: ${attackerName}, Defender: ${defenderName}. Attack proceeds.`);
            }
        }

        let numHits = 1;
        let coverBonus = 0;

        if (defender.statusEffects && defender.statusEffects.isGrappled) {
            const grappledById = (attacker === this.gameState) ? 'player' : (attacker.id || null);
            if (grappledById && defender.statusEffects.grappledBy === grappledById) {
                actionContext.isGrappling = true;
                logToConsole(`${attackerName} is grappling ${defenderName}. Grapple context for point-blank set.`);
            }
        }

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
            if (coverBonus > 0) {
                logToConsole(`${defenderName} is on a tile providing cover bonus: +${coverBonus}`);
            }
        }


        if (attackType === 'ranged') {
            const attackerMapPos = (attacker === this.gameState) ? this.gameState.playerPos : attacker.mapPos;
            const defenderMapPos = defender.mapPos;

            if (attackerMapPos && defenderMapPos) {
                const dx = defenderMapPos.x - attackerMapPos.x;
                const dy = defenderMapPos.y - attackerMapPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= 1) {
                    if (weapon && weapon.tags && weapon.tags.includes("requires_grapple_for_point_blank")) {
                        if (actionContext.isGrappling) {
                            actionContext.rangeModifier = 15;
                            logToConsole(`Point-Blank: ${weapon.name} bonus +15 applied (target grappled).`);
                        } else {
                            actionContext.rangeModifier = 0;
                            logToConsole(`Point-Blank: ${weapon.name} bonus denied (requires grapple, target not grappled by attacker). Modifier becomes 0 for this rule.`);
                        }
                    } else {
                        actionContext.rangeModifier = 15;
                        logToConsole(`Point-Blank: Standard bonus +15 applied.`);
                    }
                } else if (distance <= 3) {
                    actionContext.rangeModifier = 5;
                } else if (distance <= 6) {
                    actionContext.rangeModifier = 0;
                } else if (distance <= 20) {
                    actionContext.rangeModifier = -5;
                } else if (distance <= 60) {
                    actionContext.rangeModifier = -10;
                } else {
                    actionContext.rangeModifier = -15;
                }
                logToConsole(`Distance: ${distance.toFixed(2)}, Base Range Modifier: ${actionContext.rangeModifier}`);


                if (distance > 6) {
                    let weaponSpecificMod = 0;
                    if (weapon && weapon.type.includes("bow")) weaponSpecificMod = -3;
                    else if (weapon && weapon.type.includes("shotgun")) weaponSpecificMod = -2;
                    else if (weapon && weapon.type.includes("rifle") && !(weapon.tags && weapon.tags.includes("sniper"))) weaponSpecificMod = 2;
                    else if (weapon && weapon.tags && weapon.tags.includes("sniper")) weaponSpecificMod = 5;
                    actionContext.rangeModifier += weaponSpecificMod;
                    if (weaponSpecificMod !== 0) logToConsole(`Weapon-specific modifier for ${weapon ? weapon.name : 'unknown weapon'} at distance > 6: ${weaponSpecificMod}. New RangeMod: ${actionContext.rangeModifier}`);
                }
            } else {
                logToConsole("Warning: Attacker or defender map position is undefined for ranged attack calculation.");
            }

            if (weapon && weapon.type.includes("firearm")) {
                if (fireMode === "burst") {
                    actionContext.attackModifier = -5;
                    actionContext.isBurst = true;
                } else if (fireMode === "auto") {
                    actionContext.attackModifier = -8;
                    actionContext.isAutomatic = true;
                }
            }
        }

        attackResult = this.calculateAttackRoll(attacker, weapon, intendedBodyPart, actionContext);

        let logMsg = `ATTACK: ${attackerName} targets ${defenderName}'s ${intendedBodyPart} with ${weapon ? weapon.name : 'Unarmed'} (Mode: ${fireMode}). ` +
            `Roll: ${attackResult.roll} (Nat: ${attackResult.naturalRoll}, Skill (${actionContext.skillName}): ${actionContext.skillBasedModifier}, ` +
            `BodyPart: ${actionContext.bodyPartModifier}, Range: ${actionContext.rangeModifier}, Mode: ${actionContext.attackModifier}, Move: ${actionContext.attackerMovementPenalty})`;
        logToConsole(logMsg);
        if (actionContext.attackerMovementPenalty !== 0) {
            logToConsole(`Movement: ${attackerName} ${actionContext.attackerMovementPenalty} to attack roll.`);
        }


        let defenderDefenseTypeToUse = "None";
        if (attackType === "melee" || (weapon && weapon.type.includes("thrown")) || (weapon && weapon.explodesOnImpact && weapon.type === "weapon_thrown_explosive")) {
            if (defender === this.gameState) {
                defenderDefenseTypeToUse = (this.gameState.playerDefenseChoice && this.gameState.playerDefenseChoice.type) ? this.gameState.playerDefenseChoice.type : "Dodge";
            } else {
                defenderDefenseTypeToUse = this.gameState.npcDefenseChoice || "Dodge";
            }
        }

        if (coverBonus > 0) {
            logToConsole(`Cover: ${defenderName} +${coverBonus} to defense.`);
        }

        let defenseActionContext = {};
        if (defender === this.gameState && defenderDefenseTypeToUse === "BlockUnarmed" && this.gameState.playerDefenseChoice && this.gameState.playerDefenseChoice.blockingLimb) {
            defenseActionContext.blockingLimb = this.gameState.playerDefenseChoice.blockingLimb;
        }

        defenseResult = this.calculateDefenseRoll(defender, defenderDefenseTypeToUse, weapon, coverBonus, defenseActionContext);

        if (defenderDefenseTypeToUse !== "None") {
            let defenseLogMsg = `DEFENSE: ${defenderName} (${defenderDefenseTypeToUse} - ${defenseResult.defenseSkillName}). ` +
                `Roll: ${defenseResult.roll} (Nat: ${defenseResult.naturalRoll}, Skill: ${defenseResult.defenseSkillValue}, Cover: +${defenseResult.coverBonusApplied}, Move: +${defenseResult.movementBonusApplied || 0})`;
            logToConsole(defenseLogMsg);
            if (defenseResult.movementBonusApplied !== 0) {
                logToConsole(`Movement: ${defenderName} +${defenseResult.movementBonusApplied} to defense roll.`);
            }
        } else {
            logToConsole(`DEFENSE: ${defenderName} (None - Ranged). Effective defense from cover: ${defenseResult.roll}`);
        }

        if (document.getElementById('defenseRollResult')) document.getElementById('defenseRollResult').textContent = `Defense Roll (${defenderDefenseTypeToUse}): ${defenseResult.roll} (Natural: ${defenseResult.naturalRoll}, Cover: ${defenseResult.coverBonusApplied}, Moved: +${defenseResult.movementBonusApplied || 0}, ${defenderName})`;

        let hit = false;
        let outcomeMessage = "";

        if (attackResult.isCriticalHit) {
            hit = true;
            outcomeMessage = `RESULT: Critical Hit! ${attackerName} strikes ${defenderName}.`;
        } else if (attackResult.isCriticalMiss) {
            hit = false;
            outcomeMessage = `RESULT: Critical Miss! ${attackerName} fumbles.`;
        } else if (defenseResult.isCriticalFailure && defenderDefenseTypeToUse !== "None") {
            hit = true;
            outcomeMessage = `RESULT: Hit! ${defenderName} critically failed defense (Natural 1) against ${attackerName}.`;
        } else if (defenseResult.isCriticalSuccess && defenderDefenseTypeToUse !== "None" && !attackResult.isCriticalHit) {
            hit = false;
            outcomeMessage = `RESULT: Critical Defense! ${defenderName} expertly evades ${attackerName}.`;
        } else {
            if (attackResult.roll > defenseResult.roll) {
                hit = true;
                outcomeMessage = `RESULT: Hit! ${attackerName} strikes ${defenderName} (Attack ${attackResult.roll} vs Defense ${defenseResult.roll}).`;
            } else {
                hit = false;
                outcomeMessage = `RESULT: Miss! ${attackerName} fails to strike ${defenderName} (Attack ${attackResult.roll} vs Defense ${defenseResult.roll}).`;
            }
        }

        logToConsole(outcomeMessage);
        if (document.getElementById('attackRollResult')) document.getElementById('attackRollResult').textContent = `Attack Roll: ${attackResult.roll} (Natural: ${attackResult.naturalRoll}, ${attackerName})`;

        let actualTargetBodyPartForDamage = intendedBodyPart;

        if (hit) {
            if (hit && intendedBodyPart.toLowerCase().replace(/\s/g, '') === "head" &&
                defenseResult.naturalRoll === 1 &&
                defenderDefenseTypeToUse !== "None") {
                logToConsole(`INSTANT KILL: ${defenderName} critically failed defense (Nat 1) against ${attackerName}'s headshot!`);
                if (defender.health && defender.health.head) {
                    defender.health.head.current = 0;
                    part = defender.health.head;
                    if (weapon && weapon.explodesOnImpact) {
                        part.isDestroyed = true;
                        logToConsole(`CRITICAL DAMAGE: ${defenderName}'s Head is DESTROYED by the explosion (following critical defense failure)!`);
                    } else if (part.isDestroyed === undefined) {
                        part.isDestroyed = false;
                    }
                }
                if (defender === this.gameState) { this.endCombat(); gameOver(); return; }
                else {
                    this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== defender);
                    this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                    if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health.torso.current > 0 && e.entity.health.head.current > 0)) {
                        logToConsole("All NPCs defeated after instant death headshot.");
                        this.endCombat(); return;
                    }
                    scheduleRender();
                    this.nextTurn();
                    return;
                }
            }

            if (defenderDefenseTypeToUse === "BlockUnarmed") {
                const blockRollNatural = defenseResult.naturalRoll;
                let blockingLimb = null;
                if (defender === this.gameState && this.gameState.playerDefenseChoice) {
                    blockingLimb = this.gameState.playerDefenseChoice.blockingLimb;
                }

                if (blockRollNatural >= 11) {
                    if (blockingLimb) {
                        actualTargetBodyPartForDamage = blockingLimb;
                        logToConsole(`Block Redirect: ${defenderName}'s Unarmed Block (Nat ${blockRollNatural}) redirects damage to ${blockingLimb}.`);
                    } else if (defender !== this.gameState) {
                        logToConsole(`Block Redirect: ${defenderName}'s Unarmed Block (Nat ${blockRollNatural}) - damage to original target as NPC limb choice not specified.`);
                        actualTargetBodyPartForDamage = intendedBodyPart;
                    }
                } else {
                    actualTargetBodyPartForDamage = intendedBodyPart;
                    logToConsole(`Block Failed: ${defenderName}'s Unarmed Block (Nat ${blockRollNatural}) fails. Damage to ${intendedBodyPart}.`);
                }
            }

            // 3. Handle Explosions or standard damage
            const explosiveProperties = (weapon && (weapon.explodesOnImpact || weapon.type === "weapon_thrown_explosive")) ?
                ((weapon.ammoType && this.assetManager.getItem(weapon.ammoType)) ? this.assetManager.getItem(weapon.ammoType) : weapon)
                : null;

            if (hit && explosiveProperties && explosiveProperties.burstRadiusFt > 0) {
                const impactTile = (weapon.type === "weapon_thrown_explosive") ?
                    (this.gameState.pendingCombatAction.targetTile || defender.mapPos) : // Use targetTile if available, else defender pos
                    defender.mapPos; // For direct hit launchers, center is the defender

                const burstRadiusTiles = Math.ceil(explosiveProperties.burstRadiusFt / 5);
                logToConsole(`EXPLOSION: ${explosiveProperties.name} detonates at (${impactTile.x},${impactTile.y}) with radius ${burstRadiusTiles} tiles.`);
                const affectedCharacters = this.getCharactersInBlastRadius(impactTile, burstRadiusTiles);

                affectedCharacters.forEach(char => {
                    const charName = char === this.gameState ? "Player" : char.name;
                    let affectedByBlast = true;
                    // For thrown explosives, allow a dodge roll if they are not the primary target that was directly hit
                    if (weapon.type === "weapon_thrown_explosive" && char !== defender) { // 'defender' is the primary target of the throw
                        const attackerThrowRoll = attackResult.roll;
                        const charDodgeRoll = rollDie(20) + getStatModifier("Dexterity", char);
                        logToConsole(`EXPLOSION DODGE: ${charName} attempts to dodge ${explosiveProperties.name}. Roll: ${charDodgeRoll} vs Throw: ${attackerThrowRoll}`);
                        if (charDodgeRoll > attackerThrowRoll) {
                            affectedByBlast = false;
                            logToConsole(`RESULT: ${charName} dodged the thrown explosive!`);
                        } else {
                            logToConsole(`RESULT: ${charName} failed to dodge the thrown explosive.`);
                        }
                    } else if (weapon.type === "weapon_thrown_explosive" && char === defender && !hit) {
                        // If the throw missed the primary target tile, but the primary target is still in blast radius
                        // they also get a dodge. If the throw hit the primary target's tile, they don't get this dodge.
                        // This logic is complex. For now: if main throw roll was a "hit" (on tile), primary target in blast is hit by blast.
                        // If main throw roll "missed" (not implemented for tile targeting yet), then this logic would apply.
                        // Simplified: For this iteration, primary target of a successful throw hit does not get a separate dodge from the blast.
                    }


                    if (affectedByBlast) {
                        const explosionDamageRolled = rollDiceNotation(parseDiceNotation(explosiveProperties.damage));
                        logToConsole(`EXPLOSION DAMAGE: ${explosiveProperties.name} deals ${explosionDamageRolled} ${explosiveProperties.damageType} to ${charName}'s Torso.`);
                        this.applyDamage(attacker, char, "Torso", explosionDamageRolled, explosiveProperties.damageType, explosiveProperties);
                    }
                });

            } else if (hit) { // Standard non-explosive damage
                if (attackType === "ranged" && weapon && weapon.type.includes("firearm")) {
                    if (actionContext.isBurst) {
                        numHits = rollDie(3);
                        logToConsole(`Burst Fire: ${numHits} shots connect.`);
                    } else if (actionContext.isAutomatic) {
                        numHits = Math.min(rollDie(6), rollDie(6));
                        logToConsole(`Automatic Fire: ${numHits} shots connect (rolled d6 disadvantage).`);
                    }
                }
                this.gameState.combatPhase = 'applyDamage';
                if (attackType === 'melee') {
                    this.calculateAndApplyMeleeDamage(attacker, defender, weapon, hit, attackResult.naturalRoll, defenseResult.naturalRoll, actualTargetBodyPartForDamage);
                } else if (attackType === 'ranged') {
                    this.calculateAndApplyRangedDamage(attacker, defender, weapon, actualTargetBodyPartForDamage, hit, attackResult, numHits);
                }
            }

            const finalTargetPartKey = actualTargetBodyPartForDamage.toLowerCase().replace(/\s/g, '');
            if (defender.health && defender.health[finalTargetPartKey] && defender.health[finalTargetPartKey].current <= 0) {
                logToConsole(`CRITICAL DAMAGE: ${defenderName}'s ${finalTargetPartKey} destroyed!`);
                if (finalTargetPartKey === "head" || finalTargetPartKey === "torso") {
                    logToConsole(`DEFEATED: ${defenderName} has fallen!`);
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
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
        }

        // ADD LOGIC FOR THROWN WEAPON REMOVAL HERE
        if (hit && attackType === 'ranged' && weapon && weapon.type && weapon.type.includes("thrown")) {
            // Check which handSlot holds the thrown item
            let thrownItemHandIndex = -1;
            if (this.gameState.inventory.handSlots[0] && this.gameState.inventory.handSlots[0].id === weapon.id) {
                thrownItemHandIndex = 0;
            } else if (this.gameState.inventory.handSlots[1] && this.gameState.inventory.handSlots[1].id === weapon.id) {
                thrownItemHandIndex = 1;
            }

            if (thrownItemHandIndex !== -1) {
                const thrownItemName = this.gameState.inventory.handSlots[thrownItemHandIndex].name;
                this.gameState.inventory.handSlots[thrownItemHandIndex] = null;
                logToConsole(`ACTION: ${attackerName} threw ${thrownItemName}. Item removed from hand slot ${thrownItemHandIndex + 1}.`);
                // No direct call to updateInventoryUI() here as it's in script.js
                // The change to handSlots will be reflected next time inventory UI is updated.
            } else {
                logToConsole(`ERROR: Could not find thrown weapon ${weapon.name} in hand slots to remove.`);
            }
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
                const defeatedName = defenderIsPlayer ? "Player" : defender.name;
                if (!this.initiativeTracker.find(e => e.entity === defender)) {
                } else {
                    logToConsole(`DEFEATED: ${defeatedName} succumbed to wounds.`);
                    this.initiativeTracker = this.initiativeTracker.filter(entry => entry.entity !== defender);
                    this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                    if (defenderIsPlayer) { this.endCombat(); gameOver(); return; }
                    scheduleRender();
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
                        isSecondAttack: true,
                        isBurst: false,
                        isAutomatic: false,
                        rangeModifier: 0,
                        attackModifier: 0,
                        attackerMovementPenalty: actionContext.attackerMovementPenalty
                    };

                    const attackerMapPos = attacker.mapPos || this.gameState.playerPos;
                    const defenderMapPos = defender.mapPos || (defender === this.gameState ? this.gameState.playerPos : null);

                    if (attackerMapPos && defenderMapPos) {
                        const dx = defenderMapPos.x - attackerMapPos.x;
                        const dy = defenderMapPos.y - attackerMapPos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= 1) {
                            offHandActionContext.rangeModifier = 15;
                        } else if (distance <= 3) { offHandActionContext.rangeModifier = 5; }
                        else if (distance <= 6) { offHandActionContext.rangeModifier = 0; }
                        else if (distance <= 20) { offHandActionContext.rangeModifier = -5; }
                        else if (distance <= 60) { offHandActionContext.rangeModifier = -10; }
                        else { offHandActionContext.rangeModifier = -15; }

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
                            if (defender === this.gameState) { this.endCombat(); gameOver(); return; }
                            if (!this.initiativeTracker.some(e => !e.isPlayer)) { this.endCombat(); return; }
                            scheduleRender();
                        }
                    } else {
                        logToConsole(`RESULT: DUAL WIELD Miss! ${attackerName}'s off-hand ${offHandWeapon.name} fails to strike ${defenderName}.`);
                    }
                } else {
                    logToConsole("DUAL WIELD: Off-hand item not a firearm or missing. Skipping off-hand attack.");
                }
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

            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining > 0) {
                    logToConsole("Player has action points remaining. Prompting for next action.");
                    this.promptPlayerAttackDeclaration();
                } else if (this.gameState.movementPointsRemaining > 0) {
                    logToConsole("Player has movement points remaining. Can move or end turn.");
                    updateTurnUI();
                } else {
                    logToConsole("Player has no action or movement points remaining. Ending turn.");
                    this.nextTurn();
                }
            } else {
                this.nextTurn();
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
            updateTurnUI();
            this.nextTurn();
        } else {
            logToConsole("Cannot end player turn: not in combat or not player's turn.");
        }
    }

    calculateAndApplyRangedDamage(attacker, target, weapon, targetBodyPart, hitSuccess, attackResult, numHits = 1) {
        if (!hitSuccess) {
            if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = 'Damage: 0 (Miss)';
            return;
        }
        // Note: The rule "If multiple body parts were damaged with a single hit, then split the damage up equally between the parts"
        // is not implemented for standard ranged attacks, as these target a single declared body part.
        // This rule would apply to area effect weapons (e.g., explosives) or special weapon properties not yet implemented.
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

        const primaryWeapon = this.gameState.inventory.handSlots[0];
        const offHandWeapon = this.gameState.inventory.handSlots[1];
        if (primaryWeapon && primaryWeapon.type.includes("firearm") && offHandWeapon && offHandWeapon.type.includes("firearm")) {
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
            updateTurnUI();
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

        // Check player
        if (this.gameState && this.gameState.playerPos) {
            const player = this.gameState; // Player is the gameState object itself
            const { x: playerX, y: playerY } = player.playerPos;
            // Using Manhattan distance for grid-based radius
            const distanceToPlayer = Math.abs(playerX - impactX) + Math.abs(playerY - impactY);
            if (distanceToPlayer <= burstRadiusTiles) {
                // Ensure player is alive before adding
                if (player.health && player.health.torso && player.health.torso.current > 0 && player.health.head && player.health.head.current > 0) {
                    affectedCharacters.push(player);
                }
            }
        }

        // Check NPCs
        if (this.gameState && this.gameState.npcs) {
            this.gameState.npcs.forEach(npc => {
                if (npc && npc.mapPos) {
                    const { x: npcX, y: npcY } = npc.mapPos;
                    const distanceToNpc = Math.abs(npcX - impactX) + Math.abs(npcY - impactY);
                    if (distanceToNpc <= burstRadiusTiles) {
                        // Ensure NPC is alive before adding
                        if (npc.health && npc.health.torso && npc.health.torso.current > 0 && npc.health.head && npc.health.head.current > 0) {
                            affectedCharacters.push(npc);
                        }
                    }
                }
            });
        }
        // Log details for debugging
        // console.log(`Impact at (${impactX}, ${impactY}), radius ${burstRadiusTiles}. Affected:`, affectedCharacters.map(c => c === this.gameState ? 'Player' : c.name));
        return affectedCharacters;
    }

    applyDamage(attacker, entity, bodyPartName, damageAmount, damageType, weapon, bulletNum = 0, totalBullets = 0) {
        const normalizedBodyPartName = bodyPartName.toLowerCase().replace(/\s/g, '');
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
            if (!this.gameState.health || !this.gameState.health[normalizedBodyPartName]) {
                logToConsole(`Error: Player health data missing for body part: ${normalizedBodyPartName}`);
                return;
            }
            part = this.gameState.health[normalizedBodyPartName];
            const effectiveArmor = getArmorForBodyPart(normalizedBodyPartName);
            const reducedDamage = Math.max(0, damageAmount - effectiveArmor);

            logToConsole(`DAMAGE${bulletPrefix}: ${attackerName}'s ${weaponName} deals ${reducedDamage} ${damageType} to Player's ${normalizedBodyPartName} (Raw: ${damageAmount}, Armor: ${effectiveArmor}).`);
            part.current = Math.max(0, part.current - reducedDamage);
            logToConsole(`INFO: Player ${normalizedBodyPartName} HP: ${part.current}/${part.max}.`);

            if (part.current === 0) {
                const sourceExplosive = weapon;
                if (sourceExplosive && sourceExplosive.explodesOnImpact) {
                    part.isDestroyed = true;
                    logToConsole(`CRITICAL DAMAGE: Player's ${normalizedBodyPartName} is DESTROYED by the explosion!`);
                } else if (part.crisisTimer === 0 && !part.isDestroyed) {
                    part.crisisTimer = 3;
                    logToConsole(`CRISIS: Player's ${normalizedBodyPartName} is critically injured! Treat within 3 turns.`);
                }
            }
            renderHealthTable();
        } else { // NPC victim
            if (!entity.health || !entity.health[normalizedBodyPartName]) {
                logToConsole(`Error: ${entityName} health data missing for body part: ${normalizedBodyPartName}`);
                return;
            }
            part = entity.health[normalizedBodyPartName];
            const effectiveArmor = entity.armor ? (entity.armor[normalizedBodyPartName] || 0) : 0;
            const reducedDamage = Math.max(0, damageAmount - effectiveArmor);

            logToConsole(`DAMAGE${bulletPrefix}: ${attackerName}'s ${weaponName} deals ${reducedDamage} ${damageType} to ${entityName}'s ${normalizedBodyPartName} (Raw: ${damageAmount}, Armor: ${effectiveArmor}).`);
            part.current = Math.max(0, part.current - reducedDamage);
            logToConsole(`INFO: ${entityName} ${normalizedBodyPartName} HP: ${part.current}/${part.max}.`);

            if (part.current === 0) {
                const sourceExplosive = weapon;
                if (sourceExplosive && sourceExplosive.explodesOnImpact) {
                    part.isDestroyed = true;
                    logToConsole(`CRITICAL DAMAGE: ${entityName}'s ${normalizedBodyPartName} is DESTROYED by the explosion!`);
                }
            }
        }
    }

    _getTileProperties(tileId) {
        if (!tileId || !this.assetManager.tilesets) return null;
        return this.assetManager.tilesets[tileId];
    }

    // Helper to check if a tile at (x,y) is passable, considering map layers
    _isTilePassable(x, y) {
        if (!this.gameState.layers || x < 0 || y < 0) return false;
        // Check boundaries (assuming map dimensions are available, e.g., via a known layer like landscape)
        if (this.gameState.layers.landscape && (y >= this.gameState.layers.landscape.length || x >= this.gameState.layers.landscape[0].length)) {
            return false; // Out of bounds
        }

        const layersToCheck = ['building', 'item']; // Add other layers if they can block movement
        for (const layerName of layersToCheck) {
            const layer = this.gameState.layers[layerName];
            if (layer && layer[y] && layer[y][x]) {
                const tileId = layer[y][x];
                if (tileId) {
                    const props = this._getTileProperties(tileId);
                    if (props && props.tags && props.tags.includes("impassable")) {
                        return false; // Found an impassable tile
                    }
                }
            }
        }
        return true; // No impassable tiles found on relevant layers
    }

    // Helper to check if a tile is occupied by another NPC
    _isTileOccupiedByOtherNpc(x, y, currentNpcId) {
        for (const otherNpc of this.gameState.npcs) {
            if (otherNpc.id !== currentNpcId && otherNpc.mapPos && otherNpc.mapPos.x === x && otherNpc.mapPos.y === y) {
                // Check if this other NPC is alive, if health is available
                if (otherNpc.health && otherNpc.health.torso && otherNpc.health.torso.current > 0) {
                    return true; // Occupied by another living NPC
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

        // Try moving along the axis with the larger absolute difference first
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx !== 0) { // Try X first
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
            npc.movedThisTurn = true;
            logToConsole(`ACTION: ${npc.name} moves to (${npc.mapPos.x}, ${npc.mapPos.y}). MP Left: ${npc.currentMovementPoints}`);
            this.gameState.attackerMapPos = { ...npc.mapPos }; // Update attacker position for rendering
            scheduleRender();
        }
        return moved;
    }


    executeNpcCombatTurn(npc) {
        const npcName = npc.name || "NPC";
        if (!npc || (npc.health && npc.health.torso && npc.health.torso.current <= 0) || (npc.health && npc.health.head && npc.health.head.current <= 0)) {
            logToConsole(`INFO: ${npcName} is incapacitated. Advancing turn.`);
            this.nextTurn();
            return;
        }
        const playerTarget = this.gameState;
        if (!playerTarget || (playerTarget.health.head.current <= 0 || playerTarget.health.torso.current <= 0)) {
            logToConsole(`INFO: ${npcName} has no valid (alive) player target. Ending NPC turn.`);
            this.nextTurn();
            return;
        }

        if (npc.id === "training_dummy") {
            const playerPos = this.gameState.playerPos;
            const npcPos = npc.mapPos;
            const distance = Math.abs(npcPos.x - playerPos.x) + Math.abs(npcPos.y - playerPos.y);

            if (distance <= 1 && npc.currentActionPoints > 0) {
                const weaponToUse = npc.equippedWeaponId ? this.assetManager.getItem(npc.equippedWeaponId) : null;
                const attackType = (weaponToUse && weaponToUse.type.includes("melee")) ? 'melee' : 'unarmed';
                const targetBodyPart = "Torso";

                this.gameState.pendingCombatAction = {
                    target: playerTarget, weapon: weaponToUse, attackType: attackType, bodyPart: targetBodyPart,
                    fireMode: 'single', actionType: "attack", entity: npc,
                    actionDescription: `${attackType} attack by ${npcName}`
                };
                logToConsole(`NPC ACTION: ${npcName} (dummy) attacks Player's ${targetBodyPart} with ${weaponToUse ? weaponToUse.name : 'Unarmed'}.`);
                npc.currentActionPoints--;
                this.gameState.combatPhase = 'defenderDeclare';
                this.handleDefenderActionPrompt();
                return;
            }
            else if (distance > 1 && npc.currentMovementPoints > 0) {
                logToConsole(`INFO: ${npcName} (dummy) is ${distance} units away. Attempting to move.`);
                const moved = this.moveNpcTowardsTarget(npc, playerPos);
                if (moved) {
                    const newDistance = Math.abs(npc.mapPos.x - playerPos.x) + Math.abs(npc.mapPos.y - playerPos.y);
                    if (newDistance <= 1 && npc.currentActionPoints > 0) {
                        logToConsole(`INFO: ${npcName} (dummy) moved and is now adjacent. Attempting attack.`);
                        const weaponToUse = npc.equippedWeaponId ? this.assetManager.getItem(npc.equippedWeaponId) : null;
                        const attackType = (weaponToUse && weaponToUse.type.includes("melee")) ? 'melee' : 'unarmed';
                        this.gameState.pendingCombatAction = {
                            target: playerTarget, weapon: weaponToUse, attackType: attackType, bodyPart: "Torso",
                            fireMode: 'single', actionType: "attack", entity: npc,
                            actionDescription: `${attackType} attack by ${npcName}`
                        };
                        npc.currentActionPoints--;
                        this.gameState.combatPhase = 'defenderDeclare';
                        this.handleDefenderActionPrompt();
                        return;
                    }
                }
                if (npc.currentMovementPoints > 0 && !moved) {
                    logToConsole(`INFO: ${npcName} (dummy) could not move closer or chose not to.`);
                }
            } else {
                logToConsole(`INFO: ${npcName} (dummy) - No further actions or cannot act (No AP/MP, or too far and cannot move).`);
            }
            this.nextTurn();

        } else {
            let weaponToUse = null;
            let attackType = 'unarmed';
            let fireMode = 'single';

            if (npc.equippedWeaponId) {
                const equippedWeapon = this.assetManager.getItem(npc.equippedWeaponId);
                if (equippedWeapon) {
                    weaponToUse = equippedWeapon;
                    if (equippedWeapon.type.includes("melee")) { attackType = 'melee'; }
                    else if (equippedWeapon.type.includes("firearm") || equippedWeapon.type.includes("bow") || equippedWeapon.type.includes("crossbow")) {
                        attackType = 'ranged';
                        if (equippedWeapon.fireModes && equippedWeapon.fireModes.includes("burst")) fireMode = "burst";
                    }
                    else if (equippedWeapon.type.includes("thrown")) { attackType = 'ranged'; }
                }
            }
            if (attackType === 'unarmed' && !weaponToUse) {
                attackType = 'melee'; weaponToUse = null;
            }
            const targetBodyPart = "Torso";
            this.gameState.pendingCombatAction = {
                target: playerTarget, weapon: weaponToUse, attackType: attackType, bodyPart: targetBodyPart,
                fireMode: fireMode, actionType: "attack",
                actionDescription: `${attackType} attack by ${npcName}`,
                entity: npc
            };
            logToConsole(`NPC ACTION: ${npcName} attacks Player's ${targetBodyPart} with ${weaponToUse ? weaponToUse.name : 'Unarmed'} (Mode: ${fireMode}).`);
            this.gameState.combatPhase = 'defenderDeclare';
            this.handleDefenderActionPrompt();
        }
    }

    updateCombatUI() {
        const currentAttackerEl = document.getElementById('currentAttacker');
        const currentDefenderEl = document.getElementById('currentDefender');
        const attackerPromptEl = document.getElementById('attackerPrompt');
        const defenderPromptEl = document.getElementById('defenderPrompt');
        const attackRollResultEl = document.getElementById('attackRollResult');
        const defenseRollResultEl = document.getElementById('defenseRollResult');
        const damageResultEl = document.getElementById('damageResult');

        const attackerName = this.gameState.combatCurrentAttacker ? (this.gameState.combatCurrentAttacker === this.gameState ? 'Player' : this.gameState.combatCurrentAttacker.name) : '-';
        const defenderName = this.gameState.combatCurrentDefender ? (this.gameState.combatCurrentDefender === this.gameState ? 'Player' : this.gameState.combatCurrentDefender.name) : '-';

        if (currentAttackerEl) currentAttackerEl.textContent = `Attacker: ${attackerName}`;
        if (currentDefenderEl) currentDefenderEl.textContent = `Defender: ${defenderName}`;

        // Clear prompts if UI is hidden or not in the correct phase
        if (attackerPromptEl && (this.gameState.combatPhase !== 'playerAttackDeclare' || document.getElementById('attackDeclarationUI').classList.contains('hidden'))) {
            attackerPromptEl.innerHTML = '';
        }
        if (defenderPromptEl && (this.gameState.combatPhase !== 'playerDefenseDeclare' || document.getElementById('defenseDeclarationUI').classList.contains('hidden'))) {
            defenderPromptEl.innerHTML = '';
        }

        // Clear results if not in combat
        if (!this.gameState.isInCombat) {
            if (attackRollResultEl) attackRollResultEl.textContent = 'Attack Roll: -';
            if (defenseRollResultEl) defenseRollResultEl.textContent = 'Defense Roll: -';
            if (damageResultEl) damageResultEl.textContent = 'Damage: -';
            this.gameState.attackerMapPos = null; // Clear attacker position on combat end
            this.gameState.defenderMapPos = null; // Clear defender position on combat end
            scheduleRender(); // Re-render to remove highlights
        }
    }
}
