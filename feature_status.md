# Project Feature Status Report

## Integrated Features

### Core Gameplay Mechanics
*   **Main Menu:** Functional "Character Creator" acts as New Game. "Load Game" available.
*   **Save/Load System:** Full serialization of `gameState` (player, inventory, map, turn) to `localStorage`.
*   **Game Loop:** `requestAnimationFrame` based loop with `TimeManager` integration.

### Combat System
*   **Turn-Based Combat:** Initiative tracking, AP/MP systems, and turn progression.
*   **Ammo Management:** Firearm usage decrements ammo; Reload action implemented.
*   **Cover System:** 3D cover calculation using raycasting (`getDefenderCoverBonus`) and tile properties. Logic for crouching/prone bonuses exists.
*   **Explosions:** Area of effect logic (`getCharactersInBlastRadius`), damage distribution, and `explodesOnImpact` mechanics. Visual animations for explosions and projectiles.
*   **Grappling:** Mechanics for attempting, maintaining, and releasing grapples. Status effects for `isGrappling` / `isGrappled`.
*   **Hit Locations:** Targeting specific body parts (Head, Torso, Limbs) with modifier penalties.
*   **Weapon Types:** Support for Melee, Ranged (Firearms, Bows), Thrown (Explosive, Utility), and Area of Effect (Cone/Burst).

### Health & Healing
*   **Health Crisis System:** "Crisis" state triggered at 0 HP with a 3-turn timer. Fatal if untreated or hit again.
*   **Medicine:** `applyTreatment` implements specific DC tiers (18/15/10) and bonuses.
*   **Resting:** Logic for Short and Long rests with HP restoration.
*   **Damage Types:** Specific handling for Ballistic, Fire, Explosive, Chemical, etc.

### Character Progression
*   **XP System:** Experience tracking and leveling curve.
*   **Rewards:** Automated granting of Skill Points (+16/level), Stat Points (+2/5 levels), and Perks (+1/3 levels).
*   **Stats & Skills:** Full implementation of S.P.E.C.I.A.L.-like stats and skill list.
*   **Perks:** `PerkManager` handles perk acquisition and effects (e.g., "Breaker", "Thick-Skinned").

### World & Interaction
*   **Map System:** Tile-based map rendering with Z-levels (`MapRenderer`).
*   **Time & Needs:** Clock system, Hunger/Thirst tracking (`applyHungerThirstDamage`).
*   **Traps:** `TrapManager` for detection and triggering. 'V' key active search.
*   **Weather:** `WeatherManager` handling dynamic conditions.
*   **Dialogue:** `DialogueManager` with branching choices and conditional checks (Skill/Stat).
*   **Factions:** `FactionManager` tracks reputation and relationships (Hostile/Neutral/Ally).
*   **NPCs:** `NpcManager` and `NpcDecisions` handle spawning. AI behavior includes "patrol", "guard_area", and basic combat logic (attack/flee).
*   **NPC AI:** Implemented with behaviors like "patrol" (random points), "guard_area", "scavenge", and "search_for_people".

### Crafting & Economy
*   **Crafting:** `CraftingManager` with recipe support, component requirements, and tool checks.
*   **Construction:** `ConstructionManager` for placing structures (walls, furniture) in the world.
*   **Vehicles:** `VehicleManager` and `VehicleModificationUI` for vehicle parts and assembly.
*   **Harvesting:** Resource gathering system.

### Audio & Visuals
*   **Audio:** `AudioManager` with support for music playlists, SFX, and 3D positional audio placeholders.
*   **Animations:** `AnimationManager` supports Dice Rolls, Melee Swings, Projectiles, Explosions, and Floating Text.
*   **ASCII Art:** Face generator and entity rendering.

### Other
*   **Minigames:** Fishing (`FishingManager`).
*   **Jumping:** Mechanics implemented (`jump.js`).
*   **Map Maker:** Directory structure and tool present.

---

## Partially Integrated / Needs Verification

*   **Fluid Dynamics:** Splash effects (`liquidSplash` animation, `acid_mild_thrown`) are implemented, but full "fluid dynamics" (flowing water simulation) is not present.
*   **Shade/Darkness:** `MapRenderer` handles roof obscuration, and `getTileLightingLevel` exists for light sources, but "shade" as a specific mechanic distinct from FOW/Lighting is implicit.
*   **Companion System:** `CompanionManager` exists, but depth of "Relationship & Loyalty" mechanics (e.g., betrayal events) needs verification.
*   **Quest System:** `ProceduralQuestManager` exists and handles quest generation and completion (including "timed_out" states), but "recurring" quest logic is not explicitly found in a quick scan.

---

## Not Integrated / Missing

*   **Multiplayer:** No server-side code (`server.js`) or network manager found in the current file structure.
*   **Memory Matching Minigame:** No implementation found.
*   **Specific Content Assets:**
    *   "Explosive Barrels" (as destructible environmental objects) not found in definitions.
    *   "Sidewalk" and "Concrete" tiles not explicitly found in definitions (though "Stone" exists).

---

## Status of Reported Bugs

1.  **"No explosion when shoot rocket launcher":** Code for `launcherProjectile` and `explodesOnImpact` exists in `CombatManager`. This suggests a bug in the trigger condition or asset definition (e.g., weapon missing the `explodesOnImpact` tag), rather than missing feature logic.
2.  **"Inventory container visibility":** `InventoryManager` has explicit logic in `renderInventoryMenu` to display both "Floor" items and "World Container" items side-by-side with inventory contents, supporting the feature request.
3.  **"Console logs":** `logToConsole` function exists. Need to verify if it filters debug messages for the player view.
4.  **"Falling animation render bug":** Falling logic (`handleFalling`) exists and calls `scheduleRender`. The reported bug is likely a timing issue with the animation promise resolution vs. map rendering.

## Pending New Feature Requests

*   **Settings Menu:** Volume/Speed controls (Partially in `index.html` as a modal).
*   **New Tiles:** Sidewalk, Concrete Walls, Interior Walls, Pillars.
*   **New Sounds:** General audio implementation exists, specific sound files may be missing.
