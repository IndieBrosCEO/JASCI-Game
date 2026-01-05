// mapMaker/questEditor.js
"use strict";

import { logToConsole } from './config.js';

export class QuestEditor {
    constructor(containerId) {
        this.containerId = containerId;
        this.quests = [];
        this.activeQuestId = null;

        // Default sample
        this.quests = [
            {
                "id": "sample_quest",
                "title": "New Quest",
                "description": "Quest description here.",
                "objectives": [],
                "rewards": { "xp": 100, "gold": 0 }
            }
        ];
        this.activeQuestId = "sample_quest";

        this.initUI();
    }

    initUI() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`QuestEditor: Container '${this.containerId}' not found.`);
            return;
        }

        container.innerHTML = `
            <div class="editor-layout">
                <div class="editor-sidebar">
                    <h3>Quests</h3>
                    <div id="quest-list"></div>
                    <button id="add-quest-btn" class="btn btn-sm" style="margin-top:10px;">+ New Quest</button>
                    <div class="io-section">
                        <button id="export-quests" class="btn btn-sm" style="width:100%; margin-bottom:5px;">Export JSON</button>
                        <input type="file" id="import-quests-file" accept=".json" style="display: none;">
                        <button id="import-quests-btn" class="btn btn-sm" style="width:100%;">Import JSON</button>
                    </div>
                </div>
                <div class="editor-main">
                    <h2>Quest Editor</h2>
                    <div id="quest-editor-content">
                        <div class="form-group">
                            <label>Quest ID:</label>
                            <input type="text" id="quest-id-input" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Title:</label>
                            <input type="text" id="quest-title-input" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Description:</label>
                            <textarea id="quest-desc-input" class="form-control"></textarea>
                        </div>

                        <h3>Objectives</h3>
                        <div id="quest-objectives-container"></div>
                        <button id="add-objective-btn" class="btn btn-sm" style="margin-top:5px;">+ Add Objective</button>

                        <h3>Rewards</h3>
                        <div class="form-group">
                            <label>XP:</label>
                            <input type="number" id="quest-xp-input" class="form-control" style="width: 100px;">
                        </div>
                         <!-- Gold removed per memory instructions, but kept in data structure if needed for legacy compatibility or converted to items -->
                         <!-- Assuming purely item rewards now? Or just XP? Memory says 'Quest System exclusively supports xp and items'. -->

                        <button id="delete-quest-btn" class="btn btn-danger btn-sm" style="margin-top:20px;">Delete Quest</button>
                    </div>
                    <div id="quest-no-selection" style="display:none;">Select a quest to edit.</div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const el = (id) => document.getElementById(id);

        el('add-quest-btn').onclick = () => this.addNewQuest();
        el('delete-quest-btn').onclick = () => this.deleteActiveQuest();
        el('export-quests').onclick = () => this.exportJSON();
        el('import-quests-btn').onclick = () => el('import-quests-file').click();
        el('import-quests-file').onchange = (e) => this.importJSON(e);

        el('quest-id-input').onchange = (e) => this.updateQuestId(e.target.value);
        el('quest-title-input').onchange = (e) => this.updateField('title', e.target.value);
        el('quest-desc-input').onchange = (e) => this.updateField('description', e.target.value);
        el('quest-xp-input').onchange = (e) => this.updateReward('xp', parseInt(e.target.value));

        el('add-objective-btn').onclick = () => this.addObjective();

        // Delegate objectives
        el('quest-objectives-container').addEventListener('change', (e) => this.handleObjectiveChange(e));
        el('quest-objectives-container').addEventListener('click', (e) => this.handleObjectiveClick(e));
    }

    render() {
        this.renderList();
        this.renderEditor();
    }

    renderList() {
        const container = document.getElementById('quest-list');
        container.innerHTML = '';
        this.quests.forEach(q => {
            const div = document.createElement('div');
            div.className = `list-item ${q.id === this.activeQuestId ? 'active' : ''}`;
            div.textContent = q.title || q.id;
            div.onclick = () => {
                this.activeQuestId = q.id;
                this.render();
            };
            container.appendChild(div);
        });
    }

    renderEditor() {
        const quest = this.quests.find(q => q.id === this.activeQuestId);
        const content = document.getElementById('quest-editor-content');
        const noSel = document.getElementById('quest-no-selection');

        if (!quest) {
            content.style.display = 'none';
            noSel.style.display = 'block';
            return;
        }

        content.style.display = 'block';
        noSel.style.display = 'none';

        document.getElementById('quest-id-input').value = quest.id;
        document.getElementById('quest-title-input').value = quest.title || '';
        document.getElementById('quest-desc-input').value = quest.description || '';
        document.getElementById('quest-xp-input').value = quest.rewards?.xp || 0;

        const objContainer = document.getElementById('quest-objectives-container');
        objContainer.innerHTML = '';

        (quest.objectives || []).forEach((obj, index) => {
            const div = document.createElement('div');
            div.className = 'objective-item';
            div.innerHTML = `
                <div style="display:flex; gap:10px; margin-bottom:5px;">
                    <select class="form-control obj-type" data-index="${index}" style="width:100px;">
                        <option value="kill" ${obj.type === 'kill' ? 'selected' : ''}>Kill</option>
                        <option value="collect" ${obj.type === 'collect' ? 'selected' : ''}>Collect</option>
                        <option value="visit" ${obj.type === 'visit' ? 'selected' : ''}>Visit</option>
                        <option value="talk" ${obj.type === 'talk' ? 'selected' : ''}>Talk</option>
                    </select>
                    <input type="text" class="form-control obj-target" placeholder="Target ID" value="${obj.target || ''}" data-index="${index}">
                    <input type="number" class="form-control obj-count" placeholder="Qty" value="${obj.count || 1}" style="width:60px;" data-index="${index}">
                </div>
                <input type="text" class="form-control obj-desc" placeholder="Description (e.g. Kill 5 Rats)" value="${obj.description || ''}" data-index="${index}">
                <div style="text-align:right; margin-top:5px;">
                    <button class="btn btn-danger btn-sm remove-obj-btn" data-index="${index}">Remove</button>
                </div>
            `;
            objContainer.appendChild(div);
        });
    }

    addNewQuest() {
        const newId = "quest_" + Date.now();
        this.quests.push({
            id: newId,
            title: "New Quest",
            description: "",
            objectives: [],
            rewards: { xp: 0 }
        });
        this.activeQuestId = newId;
        this.render();
    }

    deleteActiveQuest() {
        if (confirm("Delete this quest?")) {
            this.quests = this.quests.filter(q => q.id !== this.activeQuestId);
            this.activeQuestId = this.quests.length > 0 ? this.quests[0].id : null;
            this.render();
        }
    }

    updateQuestId(newId) {
        if (!newId || newId === this.activeQuestId) return;
        const existing = this.quests.find(q => q.id === newId);
        if (existing) {
            alert("Quest ID already exists.");
            document.getElementById('quest-id-input').value = this.activeQuestId;
            return;
        }
        const quest = this.quests.find(q => q.id === this.activeQuestId);
        if (quest) {
            quest.id = newId;
            this.activeQuestId = newId;
            this.renderList();
        }
    }

    updateField(field, value) {
        const quest = this.quests.find(q => q.id === this.activeQuestId);
        if (quest) quest[field] = value;
        if (field === 'title') this.renderList();
    }

    updateReward(type, value) {
        const quest = this.quests.find(q => q.id === this.activeQuestId);
        if (quest) {
            if (!quest.rewards) quest.rewards = {};
            quest.rewards[type] = value;
        }
    }

    addObjective() {
        const quest = this.quests.find(q => q.id === this.activeQuestId);
        if (quest) {
            if (!quest.objectives) quest.objectives = [];
            quest.objectives.push({ type: 'kill', target: '', count: 1, description: '' });
            this.renderEditor();
        }
    }

    handleObjectiveChange(e) {
        const index = e.target.dataset.index;
        const quest = this.quests.find(q => q.id === this.activeQuestId);
        if (!quest || !quest.objectives[index]) return;

        if (e.target.classList.contains('obj-type')) {
            quest.objectives[index].type = e.target.value;
        } else if (e.target.classList.contains('obj-target')) {
            quest.objectives[index].target = e.target.value;
        } else if (e.target.classList.contains('obj-count')) {
            quest.objectives[index].count = parseInt(e.target.value);
        } else if (e.target.classList.contains('obj-desc')) {
            quest.objectives[index].description = e.target.value;
        }
    }

    handleObjectiveClick(e) {
        if (e.target.classList.contains('remove-obj-btn')) {
            const index = e.target.dataset.index;
            const quest = this.quests.find(q => q.id === this.activeQuestId);
            if (quest) {
                quest.objectives.splice(index, 1);
                this.renderEditor();
            }
        }
    }

    exportJSON() {
        const dataStr = JSON.stringify(this.quests, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "quests.json";
        a.click();
    }

    importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.quests = JSON.parse(event.target.result);
                this.activeQuestId = this.quests.length > 0 ? this.quests[0].id : null;
                this.render();
                logToConsole("Quests imported successfully.");
            } catch (err) {
                alert("Error parsing JSON");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
}
