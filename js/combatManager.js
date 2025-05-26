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
                weaponOption.value = item.id || item.name;
                weaponOption.textContent = item.name;
                weaponSelect.appendChild(weaponOption);
            }
        });
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
        const actionDescInput = document.getElementById('combatActionDescription');
        if (actionDescInput) actionDescInput.value = "";
        
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
        
        if(defenderPrompt) defenderPrompt.innerHTML = ''; 

        defenseTypeSelect.value = "Dodge"; 
        blockingLimbSelect.classList.add('hidden'); 
        document.getElementById('combatDefenseDescription').value = "";

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
        participants.forEach(participant => {
            const isPlayer = participant === this.gameState;
            const entityForStatLookup = isPlayer ? this.gameState : participant;
            const initiativeRoll = rollDie(20) + getStatModifier("Dexterity", entityForStatLookup);
            this.initiativeTracker.push({ entity: participant, initiative: initiativeRoll, isPlayer: isPlayer });
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
        if(defenderDisplay && this.gameState.combatCurrentDefender) {
            defenderDisplay.textContent = `Defender: ${this.gameState.combatCurrentDefender === this.gameState ? "Player" : this.gameState.combatCurrentDefender.name}`;
        }

        if (currentEntry.isPlayer) {
            this.gameState.actionPointsRemaining = 1;
            this.gameState.movementPointsRemaining = 6;
            updateTurnUI();
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
        const actionDescInput = document.getElementById('combatActionDescription');
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
        const actionDescription = actionDescInput.value || "attacks";
        
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
        const defenseTypeSelect = document.getElementById('combatDefenseTypeSelect');
        const blockingLimbSelect = document.getElementById('combatBlockingLimbSelect');
        const defenseDescriptionInput = document.getElementById('combatDefenseDescription');
        const defenseType = defenseTypeSelect.value;
        const blockingLimb = defenseType === 'BlockUnarmed' && !blockingLimbSelect.classList.contains('hidden') ? blockingLimbSelect.value : null;
        const description = defenseDescriptionInput.value;
        this.gameState.playerDefenseChoice = {
            type: defenseType,
            blockingLimb: blockingLimb,
            description: description
        };
        logToConsole(`Player chose to ${defenseType} ${blockingLimb ? `with ${blockingLimb}` : ''} (${description || 'no description'}).`);
        document.getElementById('defenseDeclarationUI').classList.add('hidden');
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

        if (!weapon || weapon === "unarmed" || !weapon.type) { 
            skillName = "Unarmed";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("melee")) {
            skillName = "Melee Weapons";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("firearm") || weapon.type.includes("bow") || weapon.type.includes("crossbow")) {
            skillName = "Guns";
            skillBasedModifier = getSkillModifier(skillName, attacker);
        } else if (weapon.type.includes("thrown")) {
            skillName = "Strength (for thrown)"; 
            skillBasedModifier = getStatModifier("Strength", attacker); 
        } else {
            skillName = "Unarmed"; 
            skillBasedModifier = getSkillModifier(skillName, attacker);
        }

        let baseRoll = rollDie(20);

        if (actionContext.isSecondAttack) {
            baseRoll = Math.min(rollDie(20), rollDie(20));
        }

        let bodyPartModifier = 0;
        const lowerCaseTargetBodyPart = targetBodyPart.toLowerCase().replace(/\s/g, '');
        
        if (lowerCaseTargetBodyPart === "head") bodyPartModifier = -4;
        else if (lowerCaseTargetBodyPart === "leftarm" || lowerCaseTargetBodyPart === "rightarm" || 
                 lowerCaseTargetBodyPart === "leftleg" || lowerCaseTargetBodyPart === "rightleg") bodyPartModifier = -1;
        
        const totalAttackRoll = baseRoll + skillBasedModifier + bodyPartModifier + (actionContext.rangeModifier || 0) + (actionContext.attackModifier || 0);
        const canCrit = !actionContext.isSecondAttack && !actionContext.isBurst && !actionContext.isAutomatic;

        return {
            roll: totalAttackRoll,
            naturalRoll: baseRoll,
            isCriticalHit: canCrit && baseRoll === 20,
            isCriticalMiss: canCrit && baseRoll === 1
        };
    }

    calculateDefenseRoll(defender, defenseType, attackerWeapon, coverBonus = 0, actionContext = {}) {
        if (defenseType === "None") {
            return { roll: coverBonus, naturalRoll: 0, isCriticalSuccess: false, isCriticalFailure: false, coverBonusApplied: coverBonus };
        }
        const baseRoll = rollDie(20);
        let baseDefenseValue = 0;
        let dualWieldBonus = 0;

        switch (defenseType) {
            case "Dodge":
                baseDefenseValue = getStatModifier("Dexterity", defender) + getSkillModifier("Unarmed", defender);
                break;
            case "BlockUnarmed":
                baseDefenseValue = getStatModifier("Constitution", defender) + getSkillModifier("Unarmed", defender);
                break;
            case "BlockArmed":
                baseDefenseValue = getSkillModifier("Melee Weapons", defender);
                if (defender === this.gameState &&
                    this.gameState.inventory.handSlots[0] && this.gameState.inventory.handSlots[0].type.includes("melee") &&
                    this.gameState.inventory.handSlots[1] && this.gameState.inventory.handSlots[1].type.includes("melee") &&
                    getSkillValue("Melee Weapons", defender) >= 5) { 
                    dualWieldBonus = 2;
                }
                break;
        }
        const totalDefenseRoll = baseRoll + baseDefenseValue + dualWieldBonus + coverBonus;
        return { roll: totalDefenseRoll, naturalRoll: baseRoll, isCriticalSuccess: baseRoll === 20, isCriticalFailure: baseRoll === 1, coverBonusApplied: coverBonus };
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
        
        if (weapon === null) { 
            damageType = "Bludgeoning";
            const unarmedSkillValue = getSkillValue("Unarmed", attacker); 
            if (unarmedSkillValue <= 0) { 
                damageAmount = Math.max(0, rollDie(2) - 1); 
                logToConsole(`${attackerName} attacks unarmed (skill ${unarmedSkillValue}), rolls 1d2-1, deals ${damageAmount} ${damageType} damage.`);
            } else { 
                damageAmount = rollDie(unarmedSkillValue); 
                logToConsole(`${attackerName} attacks unarmed (skill ${unarmedSkillValue}), rolls 1d${unarmedSkillValue}, deals ${damageAmount} ${damageType} damage.`);
            }
        } else { 
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
            logToConsole(`Bullet ${i+1} deals ${damageAmountThisBullet} ${damageType} damage to ${target.name}'s ${targetBodyPartForDamage}.`);
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
        const { weapon, attackType, bodyPart: intendedBodyPart, fireMode = "single", actionType = "attack" } = this.gameState.pendingCombatAction;

        if (actionType === "Reload") {
            logToConsole(`${attacker === this.gameState ? "Player" : attacker.name} reloads.`);
            if (attacker === this.gameState) {
                if (this.gameState.actionPointsRemaining <= 0) {
                     logToConsole("Not enough action points to reload."); this.promptPlayerAttackDeclaration(); return;
                }
                this.gameState.actionPointsRemaining--; updateTurnUI();
            }
            this.nextTurn(); 
            return;
        }

        if (attacker === this.gameState) { 
            if (this.gameState.actionPointsRemaining <= 0) {
                logToConsole("Not enough action points to complete the attack.");
                this.promptPlayerAttackDeclaration(); 
                return;
            }
            this.gameState.actionPointsRemaining--;
            updateTurnUI();
            logToConsole(`Action point spent. Remaining: ${this.gameState.actionPointsRemaining}`);
        }

        let attackResult, defenseResult;
        const attackerName = (attacker === this.gameState) ? "Player" : attacker.name;
        const defenderName = (defender === this.gameState) ? "Player" : defender.name;
        
        let actionContext = { 
            isGrappling: false, 
            rangeModifier: 0,
            attackModifier: 0, 
            isBurst: false,
            isAutomatic: false,
        }; 
        
        let numHits = 1;
        let coverBonus = 0;

        if (defender.mapPos && this.gameState.layers && this.assetManager && this.assetManager.getTileset()) {
            const defenderTileX = defender.mapPos.x;
            const defenderTileY = defender.mapPos.y;
            const buildingLayer = this.gameState.layers.building; 
            if (buildingLayer && buildingLayer[defenderTileY] && buildingLayer[defenderTileY][defenderTileX] !== undefined) {
                const tileId = buildingLayer[defenderTileY][defenderTileX];
                if (tileId && this.assetManager.getTileset()[tileId]) { 
                    const tileDef = this.assetManager.getTileset()[tileId]; 
                    if (tileDef && tileDef.coverBonus) {
                        coverBonus = parseInt(tileDef.coverBonus, 10);
                        if (isNaN(coverBonus)) coverBonus = 0; 
                        logToConsole(`${defenderName} is on a tile '${tileDef.name || tileId}' providing cover bonus: +${coverBonus}`);
                    }
                }
            }
        }


        if (attackType === 'ranged') {
            const dx = defender.mapPos.x - (attacker === this.gameState ? this.gameState.playerPos.x : attacker.mapPos.x);
            const dy = defender.mapPos.y - (attacker === this.gameState ? this.gameState.playerPos.y : attacker.mapPos.y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= 1) { 
                if (weapon && weapon.tags && weapon.tags.includes("requires_grapple_for_point_blank")) {
                    if (!actionContext.isGrappling) { 
                        logToConsole(`${weapon.name} requires grappling for point-blank shots. Bonus not applied.`);
                        actionContext.rangeModifier = 0; 
                    } else {
                        actionContext.rangeModifier = 15; 
                    }
                } else {
                    actionContext.rangeModifier = 15; 
                }
            } else if (distance <= 3) actionContext.rangeModifier = 5;    
            else if (distance <= 6) actionContext.rangeModifier = 0;    
            else if (distance <= 20) actionContext.rangeModifier = -5;   
            else if (distance <= 60) actionContext.rangeModifier = -10;  
            else actionContext.rangeModifier = -15; 
            
            if (distance > 6) { 
                if (weapon && weapon.type.includes("bow")) actionContext.rangeModifier -= 3;
                else if (weapon && weapon.type.includes("shotgun")) actionContext.rangeModifier -= 2;
                else if (weapon && weapon.type.includes("rifle") && !(weapon.tags && weapon.tags.includes("sniper"))) actionContext.rangeModifier += 2;
                else if (weapon && weapon.tags && weapon.tags.includes("sniper")) actionContext.rangeModifier += 5;
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
        logToConsole(`${attackerName} attacks ${defenderName}'s ${intendedBodyPart} with ${weapon ? weapon.name : 'Unarmed'} (Mode: ${fireMode}): rolled ${attackResult.roll} (Natural: ${attackResult.naturalRoll})`);
        
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
        if(defenderDefenseTypeToUse !== "None") {
            logToConsole(`${defenderName} defends with ${defenderDefenseTypeToUse}: Total Defense Roll ${defenseResult.roll} (Natural: ${defenseResult.naturalRoll}, Cover: +${defenseResult.coverBonusApplied})`);
        }
        if (document.getElementById('defenseRollResult')) document.getElementById('defenseRollResult').textContent = `Defense Roll (${defenderDefenseTypeToUse}): ${defenseResult.roll} (Natural: ${defenseResult.naturalRoll}, Cover: ${defenseResult.coverBonusApplied}, ${defenderName})`;

        let hit = false;
        let outcomeMessage = "";
        
        if (attackType === "ranged" && weapon && !weapon.type.includes("thrown")) {
            const baseTargetNumber = 10 + coverBonus; 
            if (attackResult.naturalRoll === 20) { 
                 hit = true; outcomeMessage = `${attackerName} CRITICAL HIT on ranged!`;
            } else if (attackResult.naturalRoll === 1) { 
                 hit = false; outcomeMessage = `${attackerName} CRITICAL MISS on ranged!`;
            } else {
                hit = attackResult.roll >= baseTargetNumber;
                outcomeMessage = hit ? `Ranged Hit (Target: ${baseTargetNumber})!` : `Ranged Miss (Target: ${baseTargetNumber})!`;
            }
        } else { 
            if (attackResult.naturalRoll === 20) {
                hit = true;
                outcomeMessage = attackResult.isCriticalHit ? `${attackerName} CRITICAL HIT!` : `${attackerName} Automatic Hit! (Nat 20)`;
            } else if (attackResult.isCriticalMiss) { 
                hit = false;
                outcomeMessage = `${attackerName} CRITICAL MISS!`;
            } else if (defenseResult.naturalRoll === 20 && attackResult.naturalRoll !== 20) { 
                hit = false;
                outcomeMessage = `Miss! ${defenderName} rolled a natural 20 on defense.`;
            } else if (defenseResult.isCriticalFailure) {
                hit = true;
                outcomeMessage = `Hit! ${defenderName} critically failed defense.`;
            } else if (attackResult.roll > defenseResult.roll) {
                hit = true;
                outcomeMessage = "Hit!";
            } else {
                hit = false;
                outcomeMessage = "Miss!";
            }
        }
        logToConsole(outcomeMessage);
        if (document.getElementById('attackRollResult')) document.getElementById('attackRollResult').textContent = `Attack Roll: ${attackResult.roll} (Natural: ${attackResult.naturalRoll}, ${attackerName})`;

        let actualTargetBodyPartForDamage = intendedBodyPart; 

        if (hit) {
            if (defender === this.gameState && defenderDefenseTypeToUse === "BlockUnarmed") {
                const blockingLimb = this.gameState.playerDefenseChoice.blockingLimb; 
                if (defenseResult.naturalRoll >= 11) { 
                    logToConsole(`${defenderName} failed unarmed block (rolled ${defenseResult.naturalRoll}). The blocking limb ${blockingLimb} takes damage!`);
                    actualTargetBodyPartForDamage = blockingLimb; 
                } else { 
                    logToConsole(`${defenderName} failed unarmed block badly (rolled ${defenseResult.naturalRoll}). Attack hits originally intended ${intendedBodyPart}!`);
                }
            }
        
            if (actualTargetBodyPartForDamage.toLowerCase().replace(/\s/g, '') === "head" && defenseResult.naturalRoll === 1 && attackResult.naturalRoll !== 20 ) {
                logToConsole(`${defenderName} rolled a natural 1 on defense against a headshot to ${actualTargetBodyPartForDamage}! Instant death!`);
                if (defender.health && defender.health.head) { defender.health.head.current = 0; }
                this.gameState.combatPhase = 'applyDamage'; 
                if (defender === this.gameState) { this.endCombat(); gameOver(); return; } 
                else { 
                    this.initiativeTracker = this.initiativeTracker.filter(e => e.entity !== defender);
                    this.gameState.npcs = this.gameState.npcs.filter(npc => npc !== defender);
                     if (!this.initiativeTracker.some(e => !e.isPlayer && e.entity.health.torso.current > 0 && e.entity.health.head.current > 0)) {
                        this.endCombat(); return;
                    }
                    scheduleRender();
                    this.nextTurn(); 
                    return; 
                }
            }
            
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
            this.nextTurn();
        } else { 
            this.updateCombatUI(); 
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
            logToConsole(`Bullet ${i+1} deals ${damageAmountThisBullet} ${damageType} damage to ${target.name}'s ${targetBodyPart}.`);
            this.applyDamage(target, targetBodyPart, damageAmountThisBullet, damageType);
        }
        if (document.getElementById('damageResult')) document.getElementById('damageResult').textContent = `Total Damage: ${totalDamageThisVolley} ${damageType} (${numHits} hits)`;
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
