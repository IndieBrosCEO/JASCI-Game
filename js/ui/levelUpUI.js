// js/ui/levelUpUI.js

class LevelUpUI {
    constructor(gameState, xpManager, perkManager) {
        this.gameState = gameState;
        this.xpManager = xpManager;
        this.perkManager = perkManager;
        this.uiElement = null;
        this.isVisible = false;
        this.createUI();
    }

    createUI() {
        if (this.uiElement) return;

        const container = document.createElement('div');
        container.id = 'levelUpUI';
        container.className = 'ui-panel hidden'; // Start hidden
        // Basic styles inline for now, or move to CSS
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.width = '90%';
        container.style.maxWidth = '1200px';
        container.style.height = '80%';
        container.style.backgroundColor = '#1a1a1a';
        container.style.border = '2px solid #444';
        container.style.zIndex = '1000';
        container.style.padding = '20px';
        container.style.overflowY = 'auto';
        container.style.color = '#ddd';
        container.style.fontFamily = 'monospace';

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Level Up & Perks</h2>
                <button id="closeLevelUpUI" style="background: #333; color: white; border: 1px solid #666; padding: 5px 10px;">Close</button>
            </div>
            <div id="levelUpStatus" style="margin-bottom: 20px; padding: 10px; background: #222; border: 1px solid #333;">
                <!-- XP, Level, Unspent Points -->
            </div>
            <div id="statIncreaseSection" style="margin-bottom: 20px; display: none;">
                <h3>Stat Increase Available!</h3>
                <p>Select a stat to increase (Cost: 1 Stat Point)</p>
                <div id="statIncreaseButtons" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
            </div>
            <div id="perksContainer" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
                <!-- Perks Grid -->
            </div>
        `;

        document.body.appendChild(container);
        this.uiElement = container;

        document.getElementById('closeLevelUpUI').addEventListener('click', () => this.hide());
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    show() {
        this.uiElement.classList.remove('hidden');
        this.isVisible = true;
        this.updateDisplay();
    }

    hide() {
        this.uiElement.classList.add('hidden');
        this.isVisible = false;
    }

    updateDisplay() {
        this.updateStatus();
        this.updateStatSection();
        this.renderPerks();
    }

    updateStatus() {
        const statusDiv = document.getElementById('levelUpStatus');
        const nextLevelXp = this.getNextLevelXp();

        statusDiv.innerHTML = `
            <div><strong>Level:</strong> ${this.gameState.level}</div>
            <div><strong>XP:</strong> ${this.gameState.totalXp} / ${nextLevelXp}</div>
            <div style="margin-top: 10px; display: flex; gap: 20px;">
                <span style="color: #88ff88;">Unspent Skill Points: ${this.gameState.unspentSkillPoints}</span>
                <span style="color: #ffff88;">Unspent Stat Points: ${this.gameState.unspentStatPoints}</span>
                <span style="color: #ff88ff;">Unspent Perk Picks: ${this.gameState.unspentPerkPicks}</span>
            </div>
        `;
    }

    getNextLevelXp() {
        if (!this.xpManager.levelCurve) return 'Max';
        const nextLevel = this.xpManager.levelCurve.find(l => l.level > this.gameState.level);
        return nextLevel ? nextLevel.total : 'Max';
    }

    updateStatSection() {
        const section = document.getElementById('statIncreaseSection');
        const buttonsContainer = document.getElementById('statIncreaseButtons');

        if (this.gameState.unspentStatPoints > 0) {
            section.style.display = 'block';
            buttonsContainer.innerHTML = '';

            this.gameState.stats.forEach(stat => {
                const btn = document.createElement('button');
                btn.textContent = `${stat.name} (${stat.points}) +`;
                btn.style.padding = '5px 10px';
                btn.style.cursor = 'pointer';
                btn.onclick = () => {
                    this.increaseStat(stat.name);
                };
                buttonsContainer.appendChild(btn);
            });
        } else {
            section.style.display = 'none';
        }
    }

    increaseStat(statName) {
        if (this.gameState.unspentStatPoints <= 0) return;

        updateStat(statName, 1, this.gameState); // Increases by 1, logic in character.js usually sets absolute value
        // Wait, updateStat in character.js sets the absolute value.
        // We need to get current, add 1, and call updateStat.
        const stat = this.gameState.stats.find(s => s.name === statName);
        if (stat) {
            // updateStat checks point buy limits usually. For leveling, we might bypass or respect caps.
            // Let's assume 20 is hard cap.
            if (stat.points >= 20) {
                alert("Stat is already at maximum (20).");
                return;
            }

            // Manually decrement point and increment stat, or modify updateStat to handle "add" mode?
            // updateStat logic: `character.stats[index].points = newValue;`
            // It does check `maxTotalPoints` (35). This cap applies to initial creation.
            // Leveling stats should likely bypass the 35 point total cap but respect individual max (20).

            // Direct manipulation here might be safer to avoid creation logic, but let's try to reuse if possible.
            // Actually, updateStat alerts if total > 35. We need to bypass that for leveling.
            // So let's do it manually here and update UI.

            stat.points += 1;
            this.gameState.unspentStatPoints -= 1;

            // Play sound
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav');

            this.updateDisplay();
            // Update main character sheet too
            if (window.renderCharacterInfo) window.renderCharacterInfo();
        }
    }

    renderPerks() {
        const perksContainer = document.getElementById('perksContainer');
        perksContainer.innerHTML = ''; // Clear

        const perks = this.perkManager.getAvailablePerks();
        const statOrder = ['Strength', 'Intelligence', 'Dexterity', 'Constitution', 'Perception', 'Willpower', 'Charisma'];

        statOrder.forEach(statName => {
            const col = document.createElement('div');
            col.style.display = 'flex';
            col.style.flexDirection = 'column';
            col.style.gap = '10px';

            const header = document.createElement('div');
            header.textContent = statName;
            header.style.textAlign = 'center';
            header.style.fontWeight = 'bold';
            header.style.borderBottom = '1px solid #555';
            header.style.paddingBottom = '5px';
            col.appendChild(header);

            const statPerks = perks[statName] || [];
            statPerks.forEach(perk => {
                const perkCard = document.createElement('div');
                const isOwned = this.perkManager.hasPerk(perk.name);
                const canAfford = this.perkManager.canAffordPerk();

                perkCard.className = 'perk-card';
                perkCard.style.border = isOwned ? '1px solid gold' : '1px solid #444';
                perkCard.style.background = isOwned ? '#332b00' : '#2a2a2a';
                perkCard.style.padding = '10px';
                perkCard.style.cursor = (canAfford && !isOwned) ? 'pointer' : 'default';
                perkCard.style.opacity = isOwned ? '1' : (canAfford ? '1' : '0.7');
                perkCard.title = perk.description;

                perkCard.innerHTML = `
                    <div style="font-weight: bold; font-size: 0.9em;">${perk.name}</div>
                    <div style="font-size: 0.8em; color: #aaa;">${perk.description}</div>
                `;

                if (!isOwned && canAfford) {
                    perkCard.onclick = () => {
                        if (this.perkManager.unlockPerk(perk.name)) {
                            if (window.audioManager) window.audioManager.playUiSound('ui_upgrade_01.wav'); // Placeholder
                            this.updateDisplay();
                        }
                    };
                    perkCard.onmouseover = () => {
                        perkCard.style.background = '#3a3a3a';
                    };
                    perkCard.onmouseout = () => {
                        perkCard.style.background = '#2a2a2a';
                    };
                }

                col.appendChild(perkCard);
            });

            perksContainer.appendChild(col);
        });
    }
}

window.LevelUpUI = LevelUpUI;
