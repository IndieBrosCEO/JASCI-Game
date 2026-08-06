# Sound Report

This document outlines the current state of the game's audio, including existing sounds, missing sound files, and actions that need sound effects.

## Existing Sound Files

### SFX

- extinguish.wav
- fire_loop.wav
- foot_grass_01.wav
- foot_grass_02.wav
- level_up_01.wav
- melee_armed_swing_01.wav
- melee_unarmed_hit_01.wav
- melee_unarmed_hit_02.wav
- melee_unarmed_swing_01.wav
- move_land_hard_01.wav
- move_land_hard_02.wav
- move_land_hard_03.wav
- move_land_hard_04.wav
- ui_click_01.wav
- ui_confirm_01.wav
- ui_console_toggle_01.wav
- ui_craft_success_01.wav
- ui_error_01.wav
- ui_menu_open_01.wav
- ui_start_game_01.wav
- ui_start_game_02.wav
- ui_type_01.wav
- ui_type_02.wav
- ui_type_03.wav
- ui_type_04.wav
- ui_type_05.wav

### Music

- Cruising.mp3
- Electronics.mp3
- Explosives.mp3
- Investigation.mp3
- Low_Key.mp3
- Mudlark.mp3
- Repair.mp3
- Survival.mp3
- numb.mp3

## Missing Sound Files

The following sound files are referenced in the code but are missing from the `assets/sounds` directory.

### General Movement
- `move_jump_01.wav`
- `move_land_soft_01.wav`
- `move_climb_01.wav`
- `move_swim_loop.wav`

### Combat
- `gas_hiss_01.wav`
- `acid_sizzle_01.wav`
- `taser_hit_01.wav`
- `throw_item_01.wav`
- `grenade_pin_01.wav`
- `flame_start_01.wav`
- `taser_fire_01.wav`
- `pepper_spray_01.wav`
- `grenade_bounce_01.wav`
- `explosion_debris_01.wav`
- `molotov_ignite_01.wav`
- `thermite_loop.wav`
- `melee_grapple_attempt_01.wav`
- `melee_grapple_success_01.wav`
- `melee_grapple_fail_01.wav`
- `player_hurt_heavy_01.wav`
- `player_hurt_light_01.wav`
- `npc_hurt_heavy_01.wav`
- `npc_hurt_light_01.wav`
- `weapon_empty_click_01.wav`
- `reload_pistol_01.wav`
- `reload_rifle_01.wav`
- `reload_shotgun_01.wav`
- `reload_bow_01.wav`
- `arrow_nock_01.wav`
- `reload_crossbow_01.wav`
- `melee_blade_hit_01.wav`
- `melee_blunt_hit_01.wav`
- `chainsaw_hit_flesh_01.wav`
- `whip_hit_01.wav`
- `flesh_impact_light_01.wav`
- `fire_pistol_01.wav`
- `fire_smg_01.wav`
- `fire_rifle_01.wav`
- `fire_ar_loop.wav`
- `fire_shotgun_01.wav`
- `fire_mg_loop.wav`
- `fire_bow_01.wav`
- `fire_crossbow_01.wav`
- `bullet_whiz_01.wav`
- `fire_rocket_01.wav`
- `fire_launcher_01.wav`
- `flame_loop.wav`
- `flame_end_01.wav`
- `explosion_small_01.wav`
- `explosion_large_01.wav`
- `grapple_release_01.wav`
- `chainsaw_attack_01.wav`
- `whip_crack_01.wav`

### Traps
- `trap_disarm_success_01.wav`
- `trap_disarm_fail_trigger_01.wav`
- `trap_disarm_fail_safe_01.wav`
- `ui_alarm_01.wav`
- `trap_place_fail_01.wav`
- `trap_place_success_01.wav`

### Vehicles
- `vehicle_repair_01.wav`
- `vehicle_part_install_01.wav`
- `vehicle_part_remove_01.wav`

### UI
- `ui_target_mode_01.wav`

*Note: `js/jump.js` contains a call to a non-existent function `playSoundEffect('jump_01.wav')`. This should be `playSound('jump_01.wav')`, and the sound file `jump_01.wav` is also missing.*

## Actions Without Sounds

The following actions and events in the game currently lack any sound effects.

### Combat
- **Aiming:** There is no sound for the "Aim" action.
- **Critical Hits/Misses:** There are no distinct sounds for critical hits or misses.
- **Blocking:** No sound for successful blocks (armed or unarmed).
- **Status Effects:** Applying status effects like blind, stun, or poison does not have a sound cue.
- **Death:** The `applyDamage` function has placeholders for player and NPC death sounds, but they are currently using `ui_error_01.wav`.

### Inventory and Items
- **Equip/Unequip:** There is no sound for equipping or unequipping items.
- **Consume:** Using consumable items (food, drinks, medical supplies) is silent.
- **Open/Close Containers:** There are no sounds for interacting with containers.

### User Interface
- **Stat/Skill Changes:** Increasing or decreasing stats and skills in the character creator is silent.
- **Level Up:** While there is a `level_up_01.wav` file, the UI for leveling up (spending points) does not have sounds for button clicks or point allocation.
- **Dialogue:** There are no sounds for advancing dialogue or selecting choices.
- **Quest Notifications:** No sounds for new quests, quest updates, or quest completion.

### World Interaction
- **Doors:** Opening and closing doors is silent.
- **Switches/Levers:** Interacting with switches or levers has no sound.
- **Crafting:** While there is a success sound, there is no sound for a failed crafting attempt.
