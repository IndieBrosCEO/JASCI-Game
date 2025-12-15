class QuestLogUIManager {
    constructor(questManager, proceduralQuestManager, gameState) {
        this.questManager = questManager;
        this.proceduralQuestManager = proceduralQuestManager;
        this.gameState = gameState;
        this.uiPanel = null;
        this.isVisible = false;

        // Ensure the Quest Log UI exists in the DOM
        this.createUI();
    }

    createUI() {
        // Check if it already exists
        if (document.getElementById('questLogUI')) return;

        // Create the container
        this.uiPanel = document.createElement('div');
        this.uiPanel.id = 'questLogUI';
        this.uiPanel.className = 'hidden';
        this.uiPanel.innerHTML = `
            <h2>Quest Log</h2>
            <div id="questTabs">
                <button id="activeQuestsTab" class="tab-button active">Active</button>
                <button id="completedQuestsTab" class="tab-button">Completed</button>
            </div>
            <div id="questListContainer">
                <ul id="questList"></ul>
            </div>
            <div id="questDetailPanel" class="hidden">
                <h3 id="questDetailTitle"></h3>
                <p id="questDetailDescription"></p>
                <h4>Objectives:</h4>
                <ul id="questDetailObjectives"></ul>
                <div id="questRewardsSection" class="hidden">
                    <h4>Rewards:</h4>
                    <ul id="questDetailRewards"></ul>
                </div>
                <button id="closeQuestDetailButton">Back to List</button>
            </div>
            <button id="closeQuestLogButton">Close</button>
        `;

        // Append to the left panel (or wherever appropriate, maybe create a new panel or modal)
        // Given existing UIs are in left-panel, let's put it there or make it a centered modal.
        // Let's make it a centered modal like settings for better visibility, or part of the left panel.
        // The user asked to "Update Quest Log UI", implying a persistent log.
        // Let's add it to the left panel for now, consistent with Crafting/Construction.
        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) {
            leftPanel.appendChild(this.uiPanel);
        } else {
            document.body.appendChild(this.uiPanel); // Fallback
            this.uiPanel.style.position = 'fixed';
            this.uiPanel.style.top = '10%';
            this.uiPanel.style.left = '10%';
            this.uiPanel.style.backgroundColor = 'black';
            this.uiPanel.style.border = '1px solid white';
            this.uiPanel.style.padding = '10px';
        }

        // Event Listeners
        document.getElementById('closeQuestLogButton').addEventListener('click', () => this.toggle());
        document.getElementById('closeQuestDetailButton').addEventListener('click', () => {
            document.getElementById('questDetailPanel').classList.add('hidden');
            document.getElementById('questListContainer').classList.remove('hidden');
        });

        document.getElementById('activeQuestsTab').addEventListener('click', () => this.switchTab('active'));
        document.getElementById('completedQuestsTab').addEventListener('click', () => this.switchTab('completed'));

        this.currentTab = 'active';
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.uiPanel.classList.remove('hidden');
            this.refreshQuestLog();
        } else {
            this.uiPanel.classList.add('hidden');
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        document.getElementById('activeQuestsTab').classList.toggle('active', tabName === 'active');
        document.getElementById('completedQuestsTab').classList.toggle('active', tabName === 'completed');
        this.refreshQuestLog();
    }

    refreshQuestLog() {
        if (!this.isVisible) return;

        const questList = document.getElementById('questList');
        questList.innerHTML = '';

        const quests = this.currentTab === 'active'
            ? (this.gameState.activeQuests || [])
            : (this.gameState.completedQuests || []);

        if (quests.length === 0) {
            questList.innerHTML = '<li>No quests in this category.</li>';
            return;
        }

        quests.forEach(quest => {
            const li = document.createElement('li');
            li.className = 'quest-item';
            li.textContent = quest.displayName || quest.title || quest.id;
            li.onclick = () => this.showQuestDetails(quest);
            questList.appendChild(li);
        });
    }

    showQuestDetails(quest) {
        document.getElementById('questListContainer').classList.add('hidden');
        const detailPanel = document.getElementById('questDetailPanel');
        detailPanel.classList.remove('hidden');

        document.getElementById('questDetailTitle').textContent = quest.displayName || quest.title;
        document.getElementById('questDetailDescription').textContent = quest.description || "No description available.";

        const objectivesList = document.getElementById('questDetailObjectives');
        objectivesList.innerHTML = '';

        // Handle Procedural Quest Objectives
        if (quest.objectives && Array.isArray(quest.objectives)) {
            quest.objectives.forEach(obj => {
                const li = document.createElement('li');
                let text = obj.text || obj.description;
                if (obj.currentCount !== undefined && obj.targetCount !== undefined) {
                    text += ` (${obj.currentCount}/${obj.targetCount})`;
                }
                if (obj.completed) {
                    text = `[COMPLETED] ${text}`;
                    li.style.color = 'lime';
                } else if (obj.status === 'failed') { // If implemented
                     text = `[FAILED] ${text}`;
                     li.style.color = 'red';
                }
                li.textContent = text;
                objectivesList.appendChild(li);
            });
        } else {
            objectivesList.innerHTML = '<li>No specific objectives listed.</li>';
        }

        // Rewards (if any)
        const rewardsSection = document.getElementById('questRewardsSection');
        const rewardsList = document.getElementById('questDetailRewards');
        rewardsList.innerHTML = '';

        if (quest.reward) { // Procedural
             rewardsSection.classList.remove('hidden');
             if (quest.reward.xp) this.addRewardItem(rewardsList, `${quest.reward.xp} XP`);
             if (quest.reward.gold) this.addRewardItem(rewardsList, `${quest.reward.gold} Gold`);
             // Add other procedural rewards
        } else if (quest.rewards) { // Static (QuestManager format)
             rewardsSection.classList.remove('hidden');
             if (quest.rewards.xp) this.addRewardItem(rewardsList, `${quest.rewards.xp} XP`);
             if (quest.rewards.gold) this.addRewardItem(rewardsList, `${quest.rewards.gold} Gold`);
             if (quest.rewards.items) this.addRewardItem(rewardsList, `Items: ${quest.rewards.items.join(', ')}`);
        } else {
             rewardsSection.classList.add('hidden');
        }
    }

    addRewardItem(list, text) {
        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);
    }
}

// Global Assignment
if (typeof window !== 'undefined') {
    window.QuestLogUIManager = QuestLogUIManager;
}
