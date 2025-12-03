# Quest System Documentation

The **Quest System** allows developers to create static, multi-stage quests with various objective types and rewards. It is integrated into the game's core systems (Combat, Inventory, Map) to automatically track progress.

## Overview

*   **Quest Manager (`js/questManager.js`)**: The central class that handles quest state, objective updates, and completion.
*   **Quest Definitions (`assets/definitions/quests.json`)**: A JSON file where all static quests are defined.
*   **Quest Editor (`quest_editor.html`)**: A web-based tool for creating and editing quest definitions without writing raw JSON.

## Creating a Quest

### Using the Editor

1.  Open `quest_editor.html` in your browser (via the local server).
2.  Click **Add New Quest**.
3.  Fill in the ID (unique), Title, and Description.
4.  Add **Objectives**:
    *   **Type**: `kill`, `collect`, `visit`, or `talk`.
    *   **Target**: The ID of the entity, item, map, or NPC.
    *   **Count**: Required amount.
    *   **Description**: Text displayed to the player.
5.  Add **Rewards**: XP, Items.
6.  Click **Export JSON** and save the file to `assets/definitions/quests.json`.

### Manual JSON Definition

```json
{
  "id": "quest_id_unique",
  "title": "Quest Title",
  "description": "Flavor text for the quest.",
  "objectives": [
    {
      "type": "kill",
      "target": "rat",
      "count": 5,
      "current": 0,
      "description": "Exterminate 5 Rats"
    },
    {
      "type": "collect",
      "target": "scrap_metal",
      "count": 10,
      "current": 0,
      "description": "Gather Scrap Metal"
    }
  ],
  "rewards": {
    "xp": 100,
    "items": ["health_potion"]
  }
}
```

## Objective Types & Triggers

The system automatically tracks the following objectives:

| Type | Target ID Example | Triggered By | Notes |
| :--- | :--- | :--- | :--- |
| **kill** | `rat`, `zombie`, `training_dummy` | `CombatManager` (on death) | Tracks entity definition IDs and Tags. |
| **collect** | `scrap_metal`, `key_card` | `InventoryManager` (on add) | Tracks item IDs and Tags. |
| **visit** | `town_hall`, `testMap` | Map Transition | Tracks Map IDs, Area IDs, and Map Names. |
| **talk** | `npc_guide` | `DialogueManager` | Requires explicit `advanceQuest` action in dialogue JSON. |

## Dialogue Integration

To interact with quests via NPC dialogue, use the following actions in your dialogue JSON files:

*   **`startQuest:quest_id`**: specific quest.
*   **`completeQuest:quest_id`**: Force complete a quest (usually checks are done automatically, but this can be used for "turn in" dialogue).
*   **`advanceQuest:quest_id:type:target:amount`**: Manually progress an objective. Useful for "talk" objectives.
    *   Example: `advanceQuest:intro_quest:talk:guide_npc:1`

## API Reference

The `QuestManager` is exposed globally as `window.questManager`.

*   `startQuest(questId)`: Starts the quest if not already active/completed.
*   `updateObjective(type, target, amount)`: Increments progress for *any* active quest with a matching objective.
*   `completeQuest(questId)`: Finishes the quest and grants rewards.

## Complex Quest Example

A "Grand Tour" quest might involve:
1.  **Talk** to an NPC to start.
2.  **Visit** a dangerous location.
3.  **Kill** the boss there.
4.  **Collect** the artifact they drop.
5.  **Talk** to the quest giver to finish.

This requires no custom code, just a properly configured JSON entry.
