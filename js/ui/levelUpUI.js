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
        container.style.width = '95%';
        container.style.maxWidth = '1400px';
        container.style.height = '90%';
        container.style.backgroundColor = '#1a1a1a';
        container.style.border = '2px solid #444';
        container.style.zIndex = '1000';
        container.style.padding = '20px';
        container.style.overflowY = 'auto';
        container.style.color = '#ddd';
        container.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 10px;">
                <h2 style="margin: 0; color: #fff;">Level Up & Perks</h2>
                <button id="closeLevelUpUI" style="background: #333; color: white; border: 1px solid #666; padding: 5px 15px; cursor: pointer;">Close (Esc)</button>
            </div>
            <div id="levelUpStatus" style="margin-bottom: 20px; padding: 15px; background: #222; border: 1px solid #333; border-radius: 4px;">
                <!-- XP, Level, Unspent Points -->
            </div>
            <div id="statIncreaseSection" style="margin-bottom: 20px; display: none; background: #252525; padding: 15px; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #ffff88;">Stat Increase Available!</h3>
                <p>Select a stat to increase (Cost: 1 Stat Point)</p>
                <div id="statIncreaseButtons" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
            </div>
            <div id="perksContainer" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 15px;">
                <!-- Perks Grid -->
            </div>
        `;

        document.body.appendChild(container);
        this.uiElement = container;

        document.getElementById('closeLevelUpUI').addEventListener('click', () => this.hide());

        // Allow Esc to close
        document.addEventListener('keydown', (e) => {
             if (this.isVisible && e.key === 'Escape') {
                 this.hide();
             }
        });
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
        this.updateSkillSection();
        this.renderPerks();
    }

    updateStatus() {
        const statusDiv = document.getElementById('levelUpStatus');
        const nextLevelXp = this.getNextLevelXp();

        statusDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 1.2em; margin-bottom: 10px;">
                <div><strong>Level:</strong> <span style="color: white;">${this.gameState.level}</span></div>
                <div><strong>XP:</strong> <span style="color: #aaa;">${this.gameState.totalXp} / ${nextLevelXp}</span></div>
            </div>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="background: #2a3a2a; padding: 5px 10px; border-radius: 3px; border-left: 3px solid #88ff88;">
                    <span style="color: #88ff88; font-weight: bold;">Unspent Skill Points: ${this.gameState.unspentSkillPoints}</span>
                </div>
                <div style="background: #3a3a2a; padding: 5px 10px; border-radius: 3px; border-left: 3px solid #ffff88;">
                    <span style="color: #ffff88; font-weight: bold;">Unspent Stat Points: ${this.gameState.unspentStatPoints}</span>
                </div>
                <div style="background: #3a2a3a; padding: 5px 10px; border-radius: 3px; border-left: 3px solid #ff88ff;">
                    <span style="color: #ff88ff; font-weight: bold;">Unspent Perk Picks: ${this.gameState.unspentPerkPicks}</span>
                </div>
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
                btn.style.padding = '8px 12px';
                btn.style.cursor = 'pointer';
                btn.style.fontWeight = 'bold';
                btn.style.border = 'none';
                btn.style.borderRadius = '3px';

                // Apply Colors
                btn.style.backgroundColor = stat.bgColor || '#555';
                btn.style.color = stat.textColor || '#fff';

                // Hover effect simulation
                btn.onmouseover = () => { btn.style.filter = 'brightness(1.2)'; };
                btn.onmouseout = () => { btn.style.filter = 'brightness(1.0)'; };

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

        const stat = this.gameState.stats.find(s => s.name === statName);
        if (stat) {
            if (stat.points >= 20) {
                alert("Stat is already at maximum (20).");
                return;
            }

            updateStat(statName, stat.points + 1, this.gameState);
            this.gameState.unspentStatPoints -= 1;

            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav');

            this.updateDisplay();
            if (window.renderCharacterInfo) window.renderCharacterInfo();
        }
    }

    updateSkillSection() {
        let skillsSection = document.getElementById('skillIncreaseSection');
        if (!skillsSection) {
            skillsSection = document.createElement('div');
            skillsSection.id = 'skillIncreaseSection';
            skillsSection.style.marginBottom = '20px';
            skillsSection.style.background = '#252525';
            skillsSection.style.padding = '15px';
            skillsSection.style.borderRadius = '4px';

            const perksContainer = document.getElementById('perksContainer');
            perksContainer.parentNode.insertBefore(skillsSection, perksContainer);
        }

        if (this.gameState.unspentSkillPoints > 0) {
            skillsSection.style.display = 'block';
            skillsSection.innerHTML = '<h3 style="margin-top: 0; color: #88ff88;">Increase Skills (Cost: 1 Skill Point)</h3>';
            const skillsContainer = document.createElement('div');
            skillsContainer.style.display = 'grid';
            skillsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
            skillsContainer.style.gap = '10px';

            this.gameState.skills.forEach(skill => {
                const skillDiv = document.createElement('div');
                skillDiv.style.display = 'flex';
                skillDiv.style.justifyContent = 'space-between';
                skillDiv.style.alignItems = 'center';
                skillDiv.style.background = '#333';
                skillDiv.style.padding = '8px';
                skillDiv.style.borderRadius = '3px';
                skillDiv.style.borderLeft = `4px solid ${skill.bgColor || '#777'}`;

                const label = document.createElement('span');
                label.textContent = `${skill.name}: ${skill.points}`;
                label.style.color = '#ddd';

                const btn = document.createElement('button');
                btn.textContent = '+';
                btn.style.padding = '2px 8px';
                btn.style.cursor = 'pointer';
                btn.style.backgroundColor = '#555';
                btn.style.color = 'white';
                btn.style.border = 'none';
                btn.style.borderRadius = '2px';
                btn.disabled = skill.points >= 100;

                if (!btn.disabled) {
                    btn.style.backgroundColor = skill.bgColor || '#555';
                    btn.style.color = skill.textColor || 'white';
                } else {
                     btn.style.opacity = '0.5';
                }

                btn.onclick = () => {
                    this.increaseSkill(skill.name);
                };

                skillDiv.appendChild(label);
                skillDiv.appendChild(btn);
                skillsContainer.appendChild(skillDiv);
            });
            skillsSection.appendChild(skillsContainer);
        } else {
            skillsSection.style.display = 'none';
        }
    }

    increaseSkill(skillName) {
        if (this.gameState.unspentSkillPoints <= 0) return;

        const skill = this.gameState.skills.find(s => s.name === skillName);
        if (skill) {
            if (skill.points >= 100) return;

            updateSkill(skillName, skill.points + 1, this.gameState);
            this.gameState.unspentSkillPoints -= 1;

            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav');

            this.updateDisplay();
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

            // Get stat info for color
            const statInfo = this.gameState.stats.find(s => s.name === statName) || { bgColor: '#555', textColor: '#fff' };

            const header = document.createElement('div');
            header.textContent = statName;
            header.style.textAlign = 'center';
            header.style.fontWeight = 'bold';
            header.style.padding = '8px';
            header.style.borderRadius = '3px';
            header.style.backgroundColor = statInfo.bgColor;
            header.style.color = statInfo.textColor;
            col.appendChild(header);

            const statPerks = perks[statName] || [];
            statPerks.forEach(perk => {
                const perkCard = document.createElement('div');
                const isOwned = this.perkManager.hasPerk(perk.name);
                const canAfford = this.perkManager.canAffordPerk();

                perkCard.className = 'perk-card';
                perkCard.style.border = isOwned ? '2px solid gold' : `1px solid ${statInfo.bgColor}`;
                perkCard.style.background = isOwned ? '#332b00' : '#222';
                perkCard.style.padding = '10px';
                perkCard.style.borderRadius = '3px';
                perkCard.style.cursor = (canAfford && !isOwned) ? 'pointer' : 'default';
                perkCard.style.opacity = isOwned ? '1' : (canAfford ? '1' : '0.6');
                perkCard.style.transition = 'transform 0.1s, background 0.1s';
                perkCard.title = perk.description;

                perkCard.innerHTML = `
                    <div style="font-weight: bold; font-size: 0.95em; color: ${statInfo.bgColor}; filter: brightness(1.3);">${perk.name}</div>
                    <div style="font-size: 0.8em; color: #ccc; margin-top: 5px;">${perk.description}</div>
                `;

                if (!isOwned && canAfford) {
                    perkCard.onclick = () => {
                        if (this.perkManager.unlockPerk(perk.name)) {
                            if (window.audioManager) window.audioManager.playUiSound('ui_upgrade_01.wav');
                            this.updateDisplay();
                        }
                    };
                    perkCard.onmouseover = () => {
                        perkCard.style.background = '#333';
                        perkCard.style.transform = 'scale(1.02)';
                    };
                    perkCard.onmouseout = () => {
                        perkCard.style.background = '#222';
                        perkCard.style.transform = 'scale(1)';
                    };
                }

                col.appendChild(perkCard);
            });

            perksContainer.appendChild(col);
        });
    }
}

window.LevelUpUI = LevelUpUI;
