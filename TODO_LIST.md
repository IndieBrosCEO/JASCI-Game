# TODO List & Placeholders

This document lists all known "TODO" and "placeholder" comments found within the project's codebase.

## General
-   `index.html:387`: `<input type="text" id="consoleInput" placeholder="Enter command...">`
-   Update key bind list display/content
-   `script.js:65`: `window.proceduralQuestManager = new ProceduralQuestManager(window.gameState, window.assetManager, window.factionManager, window.questManager, window.npcManager, {} /* mapUtils placeholder */);`
-   `script.js:200`: `// TODO: Play ui_map_select_01.wav or a general ui_select_01.wav`
-   `script.js:286`: `// TODO: Add similar copying for other overridable properties like stats, specific health values if needed.`
-   `script.js:339`: `// TODO: This is a very simplified version. A real version would:`
-   `script.js:595`: `// TODO: Add click handler to open companion interaction/order menu`
-   `script.js:709`: `// TODO: Play ui_scroll_01.wav`
-   `script.js:724`: `// TODO: Play ui_scroll_01.wav`
-   `script.js:733`: `// TODO: Play a soft click or specific tab sound if implemented`
-   `script.js:739`: `// TODO: Play ui_type_01.wav on keydown/keypress for typing in console`
-   `script.js:775`: `// TODO: Ideally, a ui_menu_open_01.wav when the prompt appears, but native prompt is hard to hook.`
-   `script.js:781`: `// TODO: Play ui_menu_close_01.wav or a general cancel sound`
-   `script.js:795`: `// TODO: Also play move_wait_01.wav here when available, if distinct from general confirm.`
-   `script.js:1140`: `// TODO: Add specific sound for posture change move_posture_prone_01.wav / move_posture_stand_01.wav`
-   `script.js:1187`: `// TODO: Add specific sound for posture change move_posture_crouch_01.wav / move_posture_stand_01.wav`
-   `script.js:1450`: `// TODO: Play a sound indicating portal activation or prompt appearance (e.g., ui_menu_open_01.wav or a mystical sound)`
-   `script.js:1778`: `// mapUtils is a placeholder for now.`
-   `script.js:1779`: `window.proceduralQuestManager = new ProceduralQuestManager(window.gameState, window.assetManager, window.factionManager, window.questManager, window.npcManager, { /* mapUtils placeholder */ });`
-   `script.js:2315`: `const PLAYER_VISION_RADIUS_CONST = 10; // TODO: Centralize this constant`

## js/AudioManager.js
-   `js/AudioManager.js:66`: `// TODO: Update listener orientation if player rotation is a factor.`
-   `js/AudioManager.js:87`: `// TODO: Add a timeout or error handling for sounds that never load`
-   `js/AudioManager.js:106`: `this.soundBuffers.delete(soundName); // Remove placeholder if loading failed`
-   `js/AudioManager.js:219`: `// TODO: Play move_jump_01.wav when available`
-   `js/AudioManager.js:224`: `// TODO: Play move_land_soft_01.wav when available`
-   `js/AudioManager.js:229`: `// TODO: Play move_climb_01.wav when available`
-   `js/AudioManager.js:236`: `// TODO: Play move_swim_loop.wav when available`
-   `js/AudioManager.js:237`: `console.warn("playSwimLoop called, playing placeholder. Implement proper loop management to stop it.");`
-   `js/AudioManager.js:313`: `console.warn("Global volume control is not fully implemented yet. This is a placeholder.");`

## js/character.js
-   `js/character.js:424`: `// Game over logic placeholder, now accepts a character`
-   `js/character.js:431`: `// TODO: Play player_death_01.wav`
-   `js/character.js:773`: `// TODO: Consider adding a specific "fall damage taken" sound: move_fall_damage_01.wav`

## js/combatManager.js
-   `js/combatManager.js:1035`: `let hitSoundName = 'melee_unarmed_hit_01.wav'; // Default placeholder`
-   `js/combatManager.js:1113`: `let reloadSound = 'ui_click_01.wav'; // Generic placeholder`
-   `js/combatManager.js:1199`: `let fireSoundName = 'ui_click_01.wav'; // Default placeholder for weapon_empty_click_01.wav if ammo is out (needs ammo check)`
-   `js/combatManager.js:1221`: `let launchSound = 'ui_error_01.wav'; // Generic loud placeholder`
-   `js/combatManager.js:1230`: `// TODO: Manage flame_loop.wav (start/stop based on duration or continuous fire).`
-   `js/combatManager.js:1231`: `// TODO: Play flame_end_01.wav when stopping.`
-   `js/combatManager.js:1563`: `let explosionSound = 'ui_error_01.wav'; // Default loud placeholder`
-   `js/combatManager.js:1564`: `// TODO: Differentiate small vs large explosion based on explosiveProps or weapon tags`
-   `js/combatManager.js:1633`: `// TODO: Consider playing fire_loop_med.wav if it creates a lasting fire effect. Requires loop management.`
-   `js/combatManager.js:1641`: `window.audioManager.playSoundAtLocation('ui_error_01.wav', impactTileThermite, {}, { volume: 0.7, loop: true, duration: 5000 }); // Long loop placeholder`
-   `js/combatManager.js:1643`: `// TODO: Add visual effect for thermite burning`

## js/companionManager.js
-   `js/companionManager.js:128`: `// For now, this is a placeholder.`
-   `js/companionManager.js:132`: `// TODO: Award XP? e.g., window.xpManager.awardXp('recruit_companion');`
-   `js/companionManager.js:152`: `// TODO: Revert NPC behavior to their default (e.g., patrol, idle, original faction behavior)`
-   `js/companionManager.js:175`: `// TODO: Play confirmation sound`
-   `js/companionManager.js:201`: `// TODO: Implement loyalty effects (e.g., leaving if too low, bonuses if high)`

## js/constructionManager.js
-   `js/constructionManager.js:163`: `// TODO: Implement adjacency checks (e.g., for walls, doors) based on definition.buildRequiresAdjacent`
-   `js/constructionManager.js:225`: `// TODO: Rollback consumed components`

## js/craftingManager.js
-   `js/craftingManager.js:186`: `// Award XP (placeholder for now)`
-   `js/craftingManager.js:203`: `// TODO: Find all mod items in player inventory that are compatible with weaponInstance.modSlots and weaponInstance.type/tags`
-   `js/craftingManager.js:208`: `// TODO:`
-   `js/craftingManager.js:220`: `// TODO:`

## js/dialogueManager.js
-   `js/dialogueManager.js:161`: `// TODO: Add level up check here: if (window.characterManager.checkForLevelUp) window.characterManager.checkForLevelUp();`
-   `js/dialogueManager.js:305`: `// This is a bit of a hack; ideally, dialogue nodes would have placeholders for dynamic content.`
-   `js/dialogueManager.js:318`: `// A better system would use placeholders in node.npcText and choice.text that get filled.`
-   `js/dialogueManager.js:332`: `// This is a placeholder for a more direct hostility trigger.`

## js/dynamicEventManager.js
-   `js/dynamicEventManager.js:58`: `// TODO: Implement proper weighted random chance based on frequency ("common", "uncommon", "rare")`
-   `js/dynamicEventManager.js:78`: `// TODO: Check other global conditions if defined in template (e.g., specific quest completed, world state flag)`
-   `js/dynamicEventManager.js:142`: `// TODO: Show this to player via a more prominent UI notification`

## js/interaction.js
-   `js/interaction.js:83`: `// TODO: Add actions for defensive structures (Activate, Reload, Repair)`
-   `js/interaction.js:112`: `// TODO: Determine if we need to check 'bottom' as well, or if 'middle' is always the target for state changes.`
-   `js/interaction.js:156`: `// TODO: Add sound effect for entering vehicle`
-   `js/interaction.js:168`: `// TODO: Add sound effect for exiting vehicle`
-   `js/interaction.js:174`: `// TODO: Open vehicle cargo UI, similar to inventory container UI.`
-   `js/interaction.js:183`: `// TODO: Prompt for fuel item from player inventory, then call:`
-   `js/interaction.js:187`: `// TODO: Open vehicle repair UI (calls vehicleManager.repairVehiclePart)`
-   `js/interaction.js:193`: `// TODO: Open vehicle modification UI (add/remove parts)`

## js/inventoryManager.js
-   `js/inventoryManager.js:362`: `// TODO: Add a sound effect for equipping an item`
-   `js/inventoryManager.js:385`: `// TODO: Add a sound effect for unequipping an item`
-   `js/inventoryManager.js:414`: `// TODO: Add a sound effect for dropping an item`
-   `js/inventoryManager.js:443`: `// TODO: Add a sound effect for picking up an item`
-   `js/inventoryManager.js:471`: `// TODO: Add a sound effect for using an item (e.g., consuming food, applying bandage)`
-   `js/inventoryManager.js:501`: `// TODO: Add a sound effect for moving an item in inventory`

## js/mapRenderer.js
-   `js/mapRenderer.js:229`: `// TODO: Consider if roof display should be different if player is ON a roof tile vs under it.`
-   `js/mapRenderer.js:239`: `// TODO: Ensure this works correctly if player is on a z_transition tile that is also a roof (e.g. external stairs)`
-   `js/mapRenderer.js:302`: `// TODO: Implement a 'glimpse' effect for transparent floors/ceilings to see parts of adjacent Z-levels.`
-   `js/mapRenderer.js:598`: `// TODO: If player is on z_transition, it might change base Z for lighting.`
-   `js/mapRenderer.js:644`: `// TODO: Add support for cone lights (e.g., flashlights) and directional lights.`
-   `js/mapRenderer.js:645`: `// TODO: Consider performance implications of many dynamic lights.`
-   `js/mapRenderer.js:652`: `// TODO: Optimize: Cache light calculations unless lights or map state changes.`
-   `js/mapRenderer.js:800`: `// Placeholder for animated water or other tile effects`
-   `js/mapRenderer.js:1009`: `// TODO: Consider adding a specific sound for this action: move_toggle_roof_01.wav`

## js/movementUtils.js
-   `js/movementUtils.js:12`: `// TODO: Consider Z-level differences for adjacency if needed by other systems`
-   `js/movementUtils.js:30`: `// TODO: This simple version doesn't account for diagonal movement costs or difficult terrain.`
-   `js/movementUtils.js:31`: `// TODO: Integrate with character's MP and AP costs.`
-   `js/movementUtils.js:100`: `// TODO: Add sound for successful Z-transition (e.g., move_stairs_01.wav)`
-   `js/movementUtils.js:128`: `// TODO: Add sound for successful Z-transition (e.g., move_stairs_01.wav)`
-   `js/movementUtils.js:157`: `// TODO: Add sound for successful Z-transition (e.g., move_stairs_01.wav)`
-   `js/movementUtils.js:210`: `// TODO: Add sound for standard horizontal movement (covered by playStepSound in character.js)`
-   `js/movementUtils.js:255`: `// TODO: Add sound for initiating a fall (e.g., move_fall_start_01.wav)`

## js/npcDecisions.js
-   `js/npcDecisions.js:88`: `// TODO: Add more sophisticated target prioritization (e.g., wounded, high threat, squishy)`
-   `js/npcDecisions.js:139`: `// TODO: If no primary target, consider secondary objectives (e.g., guard point, assist ally, use item)`
-   `js/npcDecisions.js:186`: `// TODO: Consider if NPC should use special abilities or items if available`
-   `js/npcDecisions.js:201`: `// TODO: Implement fleeing behavior if low health or morale`
-   `js/npcDecisions.js:209`: `// TODO: Implement 'alert ally' behavior`
-   `js/npcDecisions.js:216`: `// TODO: More nuanced "can't reach" logic (e.g., try to find alternative paths, switch targets)`
-   `js/npcDecisions.js:250`: `// TODO: Consider reloading or other utility actions if no good attack is available.`
-   `js/npcDecisions.js:291`: `// TODO: If NPC is out of ammo, they should try to switch to melee or flee.`
-   `js/npcDecisions.js:340`: `// TODO: Implement more sophisticated defensive choices (e.g., seek cover, use defensive items)`

## js/proceduralQuestManager.js
-   `js/proceduralQuestManager.js:11`: `// TODO: Expand with more quest types (escort, defend, explore, use item on target)`
-   `js/proceduralQuestManager.js:12`: `// TODO: Integrate with dialogue system for quest giving/briefing/turn-in`
-   `js/proceduralQuestManager.js:13`: `// TODO: Better reward generation (specific items, XP amounts based on difficulty)`
-   `js/proceduralQuestManager.js:14`: `// TODO: Quest tracking UI for the player`
-   `js/proceduralQuestManager.js:15`: `// TODO: Persistence of active/completed quests`
-   `js/proceduralQuestManager.js:90`: `// TODO: Ensure target NPC is not essential or already involved in a critical quest`
-   `js/proceduralQuestManager.js:110`: `// TODO: Ensure item is appropriate for a fetch quest (not a key plot item etc.)`
-   `js/proceduralQuestManager.js:132`: `// TODO: Better placement logic - e.g. in a container, on a specific map, guarded?`
-   `js/proceduralQuestManager.js:154`: `// TODO: Ensure target location is reachable and appropriate for objective`
-   `js/proceduralQuestManager.js:196`: `// TODO: Check if character already has this quest or a similar one.`
-   `js/proceduralQuestManager.js:220`: `// TODO: Notify player through a more robust UI element (e.g., quest log update)`
-   `js/proceduralQuestManager.js:247`: `// TODO: More complex reward logic (e.g., item choice, faction standing changes)`
-   `js/proceduralQuestManager.js:250`: `// TODO: Play quest completion sound/ fanfare`

## js/trapManager.js
-   `js/trapManager.js:35`: `// TODO: Implement trap disarming mechanics (skill checks, tools)`
-   `js/trapManager.js:54`: `// TODO: Play trap activation sound`
-   `js/trapManager.js:55`: `// TODO: Visual effect for trap activation`
-   `js/trapManager.js:73`: `// TODO: Traps could have different effects: damage, status effects, alerts`
-   `js/trapManager.js:80`: `// TODO: Player should be able to place traps from inventory`

## js/ui/constructionUI.js
-   `js/ui/constructionUI.js:50`: `// TODO: Play UI open sound`
-   `js/ui/constructionUI.js:61`: `// TODO: Play UI close sound`
-   `js/ui/constructionUI.js:134`: `// TODO: Play sound on successful construction`
-   `js/ui/constructionUI.js:137`: `// TODO: Play sound on failed construction (e.g. missing materials, invalid location)`

## js/ui/craftingUI.js
-   `js/ui/craftingUI.js:56`: `// TODO: Play UI open sound`
-   `js/ui/craftingUI.js:67`: `// TODO: Play UI close sound`
-   `js/ui/craftingUI.js:173`: `// TODO: Play craft success sound`
-   `js/ui/craftingUI.js:177`: `// TODO: Play craft fail sound (e.g. missing components, skill too low)`
-   `js/ui/craftingUI.js:248`: `// TODO: If weapon supports multiple mod types, filter compatible mods.`
-   `js/ui/craftingUI.js:300`: `// TODO: Play sound for attaching mod`
-   `js/ui/craftingUI.js:314`: `// TODO: Play sound for removing mod`

## js/ui/vehicleModificationUI.js
-   `js/ui/vehicleModificationUI.js:82`: `// TODO: Play UI open sound`
-   `js/ui/vehicleModificationUI.js:93`: `// TODO: Play UI close sound`
-   `js/ui/vehicleModificationUI.js:244`: `// TODO: Dynamically list materials based on partDef.repairMaterials or similar`
-   `js/ui/vehicleModificationUI.js:267`: `// TODO: Play error sound`
-   `js/ui/vehicleModificationUI.js:271`: `// TODO: Actual material consumption check and list`
-   `js/ui/vehicleModificationUI.js:285`: `// TODO: Play repair sound`
-   `js/ui/vehicleModificationUI.js:288`: `// TODO: Play failure sound if applicable (e.g. no materials)`
-   `js/ui/vehicleModificationUI.js:318`: `// TODO: Check AP`
-   `js/ui/vehicleModificationUI.js:322`: `// TODO: Consume item from player inventory (partDefinitionIdFromInventory)`
-   `js/ui/vehicleModificationUI.js:363`: `// TODO: Check AP`
-   `js/ui/vehicleModificationUI.js:371`: `// TODO: Add removedPartDef back to player inventory`

## js/vehicleManager.js
-   `js/vehicleManager.js:169`: `// This is a placeholder for more complex calculation.`
-   `js/vehicleManager.js:242`: `// TODO: Check skill requirements (e.g., Mechanics from gameState.player)`
-   `js/vehicleManager.js:247`: `// TODO: Consume part from player inventory`
-   `js/vehicleManager.js:256`: `// TODO: Play sound effect for adding part`
-   `js/vehicleManager.js:274`: `// TODO: Add part back to player inventory (if space) or drop it on the ground.`
-   `js/vehicleManager.js:284`: `// TODO: Play sound effect for removing part`
-   `js/vehicleManager.js:309`: `// TODO: Skill Check (Mechanics)`
-   `js/vehicleManager.js:314`: `// TODO: Consume materials from player inventory`
-   `js/vehicleManager.js:324`: `// TODO: Play sound effect for repair`
-   `js/vehicleManager.js:339`: `// TODO: Consume fuel item (fuelItemId) from player inventory.`
-   `js/vehicleManager.js:345`: `// TODO: Play sound effect for refueling`
-   `js/vehicleManager.js:379`: `// TODO: Consider armor of the part or vehicle section.`
-   `js/vehicleManager.js:388`: `// TODO: Handle part destruction effects (e.g., engine destroyed -> vehicle stops, wheel destroyed -> speed penalty/immobile)`
-   `js/vehicleManager.js:393`: `// TODO: Play sound effect for damage`

## js/xpManager.js
-   `js/xpManager.js:41`: `// This is just a placeholder for the actual leveling logic from character.js`

## mapMaker/
-   `mapMaker/eventHandlers.js:151`: `showStatusMessage: (message, type) => { /* TODO: Implement showStatusMessage if desired */ console.log(\`Status (\${type}): \${message}\`); }`
-   `mapMaker/mapMaker.html:92`: `<input type="text" id="paletteSearchInput" placeholder="Name or ID..." style="width: 150px; margin-right: 5px;">`
-   `mapMaker/mapMaker.html:161`: `<input type="text" id="portalTargetMapId" placeholder="e.g., another_map_id" />`
-   `mapMaker/mapMaker.html:171`: `<input type="text" id="portalNameInput" placeholder="Optional name for this portal" style="width: 200px; margin-top: 5px;" />`
-   `mapMaker/mapMaker.html:196`: `<input type="text" id="npcInstanceNameInput" placeholder="Optional specific name" style="width: 200px; margin-bottom: 5px;" />`
-   `mapMaker/mapMaker.html:348`: `<input type="text" id="tileInstanceName" style="width: 95%;" placeholder="Optional custom name for this tile" />`
-   `mapMaker/mapMaker.html:353`: `<input type="text" id="tileInstanceTags" style="width: 95%;" placeholder="e.g., quest_item, fragile" />`
