// mapMaker/dialogueEditor.js
"use strict";

import { logToConsole } from './config.js';

export class DialogueEditor {
    constructor(containerId, questEditorInstance) {
        this.containerId = containerId;
        this.questEditor = questEditorInstance; // Link to quest editor for quest selection
        this.dialogueData = {};
        this.activeNodeKey = "start";

        // Default empty state
        this.dialogueData = {
            "start": {
                "text": "Hello, traveler.",
                "choices": []
            }
        };

        this.initUI();
    }

    initUI() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`DialogueEditor: Container '${this.containerId}' not found.`);
            return;
        }

        container.innerHTML = `
            <div class="editor-layout">
                <div class="editor-sidebar">
                    <h3>Dialogue Nodes</h3>
                    <div id="dialogue-node-list"></div>
                    <button id="add-dialogue-node" class="btn btn-sm" style="margin-top:10px;">+ New Node</button>
                    <div class="io-section">
                        <button id="new-dialogue-file" class="btn btn-sm btn-secondary" style="width:100%; margin-bottom:5px;">New File</button>
                        <button id="export-dialogue" class="btn btn-sm" style="width:100%; margin-bottom:5px;">Export JSON</button>
                        <input type="file" id="import-dialogue-file" accept=".json" style="display: none;">
                        <button id="import-dialogue-btn" class="btn btn-sm" style="width:100%;">Import JSON</button>
                    </div>
                </div>
                <div class="editor-main">
                    <h2>Dialogue Editor</h2>
                    <div class="form-group">
                        <label>Node Key (ID):</label>
                        <input type="text" id="node-key-input" class="form-control" placeholder="e.g. start">
                    </div>
                    <div class="form-group">
                        <label>NPC Text (Supports {playerName}, {npcName}):</label>
                        <textarea id="npc-text-input" class="form-control"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Actions (One per line):</label>
                        <textarea id="node-actions-input" class="form-control" placeholder="e.g. giveItem:potion,1\nstartQuest:quest_id"></textarea>
                        <div style="margin-top: 5px;">
                            <select id="action-helper-select" style="padding: 4px;">
                                <option value="">-- Add Action Helper --</option>
                                <option value="startQuest">Start Quest</option>
                                <option value="advanceQuest">Advance Quest</option>
                                <option value="completeQuest">Complete Quest</option>
                                <option value="giveItem">Give Item</option>
                                <option value="startCombat">Start Combat</option>
                                <option value="heal">Heal Player</option>
                            </select>
                            <button id="add-action-btn" class="btn btn-sm">Insert</button>
                        </div>
                    </div>

                    <h3>Choices</h3>
                    <div id="dialogue-choices-container"></div>
                    <button id="add-choice-btn" class="btn btn-sm" style="margin-top:10px;">+ Add Choice</button>
                </div>
            </div>
        `;

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const el = (id) => document.getElementById(id);

        el('add-dialogue-node').onclick = () => this.addNewNode();
        el('new-dialogue-file').onclick = () => this.newFile();
        el('export-dialogue').onclick = () => this.exportJSON();
        el('import-dialogue-btn').onclick = () => el('import-dialogue-file').click();
        el('import-dialogue-file').onchange = (e) => this.importJSON(e);

        el('node-key-input').onchange = (e) => this.updateNodeKey(e.target.value);
        el('npc-text-input').onchange = (e) => this.updateNodeText(e.target.value);
        el('node-actions-input').onchange = (e) => this.updateNodeActions(e.target.value);

        el('add-choice-btn').onclick = () => this.addChoice();

        el('add-action-btn').onclick = () => this.insertActionHelper();

        // Delegate events for choices
        el('dialogue-choices-container').addEventListener('change', (e) => this.handleChoiceChange(e));
        el('dialogue-choices-container').addEventListener('click', (e) => this.handleChoiceClick(e));
    }

    render() {
        this.renderNodeList();
        this.renderEditor();
    }

    renderNodeList() {
        const container = document.getElementById('dialogue-node-list');
        container.innerHTML = '';
        Object.keys(this.dialogueData).forEach(key => {
            const div = document.createElement('div');
            div.className = `list-item ${key === this.activeNodeKey ? 'active' : ''}`;
            div.textContent = key;
            div.onclick = () => {
                this.activeNodeKey = key;
                this.render();
            };
            container.appendChild(div);
        });
    }

    renderEditor() {
        const node = this.dialogueData[this.activeNodeKey];
        if (!node) return;

        document.getElementById('node-key-input').value = this.activeNodeKey;
        document.getElementById('npc-text-input').value = node.text || '';
        document.getElementById('node-actions-input').value = (node.actions || []).join('\n');

        const choicesContainer = document.getElementById('dialogue-choices-container');
        choicesContainer.innerHTML = '';

        (node.choices || []).forEach((choice, index) => {
            const div = document.createElement('div');
            div.className = 'choice-item';
            div.innerHTML = `
                <div class="form-group">
                    <label>Choice Text:</label>
                    <input type="text" class="form-control choice-text" value="${choice.text || ''}" data-index="${index}">
                </div>
                <div class="form-group">
                    <label>Go To Node:</label>
                    <input type="text" class="form-control choice-goto" value="${choice.goTo || ''}" data-index="${index}" placeholder="Next Node Key">
                </div>
                <div class="form-group">
                    <label>Condition (Optional):</label>
                    <input type="text" class="form-control choice-condition" value="${choice.condition?.expression || ''}" data-index="${index}" placeholder="e.g. skill:Persuasion>5">
                </div>
                <button class="btn btn-danger btn-sm remove-choice-btn" data-index="${index}">Remove Choice</button>
            `;
            choicesContainer.appendChild(div);
        });
    }

    addNewNode() {
        const newKey = prompt("Enter new node key:", "node_" + Date.now());
        if (newKey && !this.dialogueData[newKey]) {
            this.dialogueData[newKey] = { text: "", choices: [] };
            this.activeNodeKey = newKey;
            this.render();
        } else if (this.dialogueData[newKey]) {
            alert("Node key already exists.");
        }
    }

    updateNodeKey(newKey) {
        if (!newKey || newKey === this.activeNodeKey) return;
        if (this.dialogueData[newKey]) {
            alert("Node key already exists.");
            document.getElementById('node-key-input').value = this.activeNodeKey;
            return;
        }

        // Rename logic
        this.dialogueData[newKey] = this.dialogueData[this.activeNodeKey];
        delete this.dialogueData[this.activeNodeKey];

        // Update references in choices
        Object.values(this.dialogueData).forEach(node => {
            if (node.choices) {
                node.choices.forEach(c => {
                    if (c.goTo === this.activeNodeKey) c.goTo = newKey;
                });
            }
        });

        this.activeNodeKey = newKey;
        this.renderNodeList();
    }

    updateNodeText(text) {
        if (this.dialogueData[this.activeNodeKey]) {
            this.dialogueData[this.activeNodeKey].text = text;
        }
    }

    updateNodeActions(text) {
        const actions = text.split('\n').map(a => a.trim()).filter(a => a);
        if (this.dialogueData[this.activeNodeKey]) {
            this.dialogueData[this.activeNodeKey].actions = actions.length > 0 ? actions : undefined;
        }
    }

    addChoice() {
        if (this.dialogueData[this.activeNodeKey]) {
            if (!this.dialogueData[this.activeNodeKey].choices) {
                this.dialogueData[this.activeNodeKey].choices = [];
            }
            this.dialogueData[this.activeNodeKey].choices.push({ text: "New option", goTo: "" });
            this.renderEditor();
        }
    }

    handleChoiceChange(e) {
        const index = e.target.dataset.index;
        const node = this.dialogueData[this.activeNodeKey];
        if (!node || !node.choices[index]) return;

        if (e.target.classList.contains('choice-text')) {
            node.choices[index].text = e.target.value;
        } else if (e.target.classList.contains('choice-goto')) {
            node.choices[index].goTo = e.target.value;
        } else if (e.target.classList.contains('choice-condition')) {
            const val = e.target.value;
            if (val) {
                node.choices[index].condition = { type: "skillCheck", expression: val }; // Defaulting type to skillCheck/statCheck which uses expression
            } else {
                delete node.choices[index].condition;
            }
        }
    }

    handleChoiceClick(e) {
        if (e.target.classList.contains('remove-choice-btn')) {
            const index = e.target.dataset.index;
            const node = this.dialogueData[this.activeNodeKey];
            if (node) {
                node.choices.splice(index, 1);
                this.renderEditor();
            }
        }
    }

    insertActionHelper() {
        const select = document.getElementById('action-helper-select');
        const actionType = select.value;
        const textarea = document.getElementById('node-actions-input');

        let textToInsert = "";

        if (actionType === 'startQuest' || actionType === 'advanceQuest' || actionType === 'completeQuest') {
            // Try to get quest ID from quest editor
            let questId = "quest_id";
            if (this.questEditor && this.questEditor.activeQuestId) {
                questId = this.questEditor.activeQuestId;
            } else {
                // Prompt or list
                const quests = this.questEditor ? this.questEditor.quests : [];
                if (quests.length > 0) questId = quests[0].id;
            }
            textToInsert = `${actionType}:${questId}`;
        } else if (actionType === 'giveItem') {
            textToInsert = `giveItem:item_id,1`;
        } else if (actionType === 'startCombat') {
            textToInsert = `startCombat`;
        } else if (actionType === 'heal') {
            textToInsert = `heal:10`;
        }

        if (textToInsert) {
            textarea.value = textarea.value + (textarea.value ? '\n' : '') + textToInsert;
            this.updateNodeActions(textarea.value);
        }
    }

    newFile() {
        if (confirm("Clear current dialogue tree? Unsaved changes will be lost.")) {
            this.dialogueData = {
                "start": { "text": "New dialogue.", "choices": [] }
            };
            this.activeNodeKey = "start";
            this.render();
        }
    }

    exportJSON() {
        const dataStr = JSON.stringify(this.dialogueData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "dialogue.json";
        a.click();
    }

    importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.dialogueData = JSON.parse(event.target.result);
                this.activeNodeKey = Object.keys(this.dialogueData)[0] || "start";
                this.render();
                logToConsole("Dialogue imported successfully.");
            } catch (err) {
                alert("Error parsing JSON");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // Public method to load specific dialogue (e.g. from NPC editor link)
    loadDialogue(data) {
        this.dialogueData = data;
        this.activeNodeKey = Object.keys(data)[0] || "start";
        this.render();
    }

    // Create new for a specific NPC (called from MapMaker)
    createNewForNPC(npcId) {
        this.dialogueData = {
            "start": {
                "text": `Hello, I am ${npcId}.`,
                "choices": [
                    { "text": "Goodbye", "goTo": "end" }
                ]
            },
            "end": { "text": "Farewell.", "choices": [] }
        };
        this.activeNodeKey = "start";
        this.render();
    }
}
