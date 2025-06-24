# JASCI TRPG Adventure - Game Features

This document outlines the features of the JASCI TRPG Adventure game, intended for game designers and developers.

## Core Mechanics

### 1. Character System
*   **Creation & Customization**:
    *   Players can name their character.
    *   Initial stats allocation (Strength, Intelligence, Dexterity, Constitution, Perception, Willpower, Charisma, Marksmanship).
    *   Initial skill point allocation across a variety of skills (e.g., Animal Handling, Electronics, Guns, Melee Weapons, Medicine, Stealth, Survival).
*   **Progression**:
    *   Characters have a level.
    *   Characters gain Experience Points (XP), presumably to level up (though leveling mechanics beyond display are not fully detailed in the current code).
*   **Health & Vitals**:
    *   **Body Part System**: Health is tracked for individual body parts: Head, Torso, Left Arm, Right Arm, Left Leg, Right Leg.
    *   **Hit Points (HP)**: Each body part has its own current and maximum HP.
    *   **Armor**: Armor values are associated with body parts, derived from equipped clothing.
    *   **Crisis Timers**: When a body part's HP reaches 0, a crisis timer starts. If not treated, it can lead to character death.
    *   **Death**: Character death occurs if a crisis timer expires.
*   **Needs**:
    *   **Hunger**: Tracked over time, decreases hourly. Reaching 0 hunger causes damage. Replenished by consuming food items.
    *   **Thirst**: Tracked over time, decreases hourly. Reaching 0 thirst causes damage. Replenished by consuming drink items.

### 2. Combat System
*   **Turn-Based**: Combat unfolds in turns, with characters acting based on initiative.
*   **Initiative**: Determined by a d20 roll plus Dexterity modifier at the start of combat. Characters act in descending order of initiative.
*   **Action Points (AP) & Movement Points (MP)**:
    *   Player characters have a set number of AP (typically 1) and MP (typically 6) per turn.
    *   Actions like attacking consume AP. Movement consumes MP.
    *   A "Dash" action is available, consuming AP to grant additional MP.
*   **Attack Mechanics**:
    *   **Melee Attacks**: Using equipped melee weapons or unarmed.
    *   **Ranged Attacks**: Using firearms, bows, crossbows, thrown weapons, and launchers.
    *   **Targeting**:
        *   Players can target specific body parts (Head, Torso, Arms, Legs), incurring accuracy modifiers.
        *   Targeting mode for ranged and melee attacks allows players to select targets on the map.
    *   **Attack Rolls**: Based on a d20 roll + relevant skill modifier (e.g., Guns, Melee Weapons, Unarmed) + situational modifiers (range, body part, movement, lighting, status effects).
    *   **Critical Hits/Misses**: Natural 20 on attack roll is a critical hit (if not disadvantaged); natural 1 is a critical miss.
*   **Defense Mechanics**:
    *   **Defense Rolls**: Based on a d20 roll + relevant skill/stat modifier.
    *   **Defense Types**:
        *   **Dodge**: Based on Dexterity and Unarmed skill.
        *   **Block (Unarmed)**: Based on Constitution and Unarmed skill. Can specify blocking limb.
        *   **Block (Armed)**: Based on Melee Weapons skill. Dual wielding melee weapons can provide a bonus.
        *   **Passive Defense (vs. Ranged)**: No active roll, but cover provides bonuses.
    *   **Critical Success/Failure**: Natural 20 on defense roll is a critical success; natural 1 is a critical failure.
*   **Damage & Armor**:
    *   Damage is rolled based on weapon stats.
    *   Damage is reduced by the target's armor value on the hit body part.
    *   Various damage types exist (e.g., Ballistic, Slashing, Bludgeoning, Piercing, Explosive, Fire, Chemical, Acid, Electricity).
*   **Weapon Properties**:
    *   **Fire Modes (Firearms)**: Single, Burst, Auto, each with different AP costs/effects and accuracy modifiers.
    *   **Ammunition**: Firearms and some ranged weapons require specific ammo types and have magazine capacities. Reloading is an action.
    *   **Thrown Weapons**: Have range increments and may have special effects (e.g., explosions, smoke).
    *   **Launchers**: Can fire explosive projectiles.
*   **Cover**: Tiles can provide cover bonuses to defense against ranged attacks.
*   **Status Effects**:
    *   Combatants can suffer from status effects (e.g., Blinded, Irritated by Tear Gas, In Smoke, Acid Burn) that can impact stats, accuracy, or cause damage over time.
    *   Effects can have durations and be applied by items or environmental conditions.
*   **Grappling**:
    *   Players can attempt to grapple opponents as a combat action.
    *   Success is determined by an opposed Unarmed skill check.
    *   Successful grapple applies a "grappled" status.
*   **Aggro System**: NPCs maintain an aggro list, prioritizing targets based on threat generated (e.g., from taking damage). Aggro can be shared among team members.

### 3. Inventory System
*   **Item Management**: Players can acquire, carry, and use a variety of items.
*   **Equipping**:
    *   **Weapons**: Can be equipped in hand slots (typically two).
    *   **Clothing/Armor**: Equipped to specific body layers (e.g., head_top, torso_bottom, backpack).
*   **Containers**:
    *   **Player Inventory**: Base carrying capacity determined by Strength stat.
    *   **Wearable Containers**: Items like backpacks and cargo pants provide additional inventory slots. Total capacity is cumulative.
    *   **World Containers**: Objects placed on the map (cabinets, chests, etc.) that can hold items and be looted.
*   **Item Properties**:
    *   **Weight**: Items have weight (not currently implemented as directly affecting encumbrance, but defined).
    *   **Size**: Items occupy a certain number of inventory slots.
    *   **Tags**: Used to categorize items (e.g., "weapon", "consumable", "clothing", "explosive").
*   **Dropping Items**: Player can drop items from their inventory onto the floor at their current location.

### 4. Map & Interaction System
*   **Grid-Based Movement**: Characters move on a 2D grid.
*   **Tile Interaction**:
    *   Players can interact with objects on the map within a certain range.
    *   Interactive objects include doors, windows, containers, and potentially other elements.
    *   Actions depend on the object (e.g., open/close door, loot container).
*   **Multi-Layered Maps**: Maps are composed of multiple layers:
    *   `landscape`: Base terrain.
    *   `building`: Walls, doors, structural elements.
    *   `item`: Objects, furniture, lootable items on the map.
    *   `roof`: Roof tiles, can be toggled for visibility.
*   **Fog of War (FOW)**:
    *   Tiles can be `hidden`, `visited`, or `visible`.
    *   Visibility is determined by line of sight from the player within a defined vision radius.
    *   Obstacles (walls, etc.) can block line of sight.
*   **Lighting System**:
    *   **Dynamic Lights**: Some items (e.g., flashlight, lantern, candle) and map tiles (e.g., lamps, fires) can emit light with a specific radius, intensity, and color.
    *   **Ambient Light**: The overall map brightness changes based on the in-game time (day/night cycle).
    *   **Visibility Penalties**: Darkness can impose penalties on actions like combat targeting.
    *   Light sources can be blocked by vision-blocking tiles.

### 5. NPC (Non-Player Character) System
*   **Variety**: Different types of NPCs are defined with unique:
    *   Names and visual sprites/colors.
    *   Base stats and skills.
    *   Health pools for body parts.
    *   Equipped weapons and default action/movement points.
    *   Tags defining behavior or type (e.g., "hostile", "dummy", "melee", "ranged").
*   **AI Behavior**:
    *   **Aggro System**: NPCs target enemies based on a threat list.
    *   **Team Affiliation**: NPCs belong to teams (e.g., teamId 1 for player, teamId 2 for scavengers), influencing combat allegiances.
    *   **Combat AI**: NPCs will move towards targets, attack, and potentially use equipped items or skills (though specific advanced tactics are not deeply detailed).
*   **Spawning**: NPCs are defined in map data and spawned when a map is loaded.

### 6. Time System
*   **In-Game Clock**: Tracks days, hours, and minutes.
    *   Time advances in discrete ticks (e.g., 2 minutes per game action or "wait" command).
*   **Day/Night Cycle**: The time of day affects ambient lighting levels on the map.
*   **Effects of Time**:
    *   Player needs (hunger, thirst) decrease over time (hourly).
    *   Environmental effects or game events could potentially be tied to the time of day (not explicitly detailed but system allows for it).
    *   The `wait` command allows players to pass a specified number of hours.

## Item & Equipment Features

### 1. Weapons
*   **General Properties**:
    *   `id`: Unique identifier.
    *   `name`: Display name.
    *   `description`: Flavor text.
    *   `type`: Broad category (e.g., `weapon_firearm`, `weapon_melee`, `weapon_thrown_explosive`, `weapon_ranged_other`).
    *   `canEquip`: Boolean, indicates if it can be held in hand slots.
    *   `size`: Inventory slots occupied.
    *   `weightLbs`: Weight in pounds (currently informational).
    *   `tags`: Descriptive tags (e.g., "pistol", "modern", "explosive", "silent", "less_lethal").
    *   `damage`: Damage roll (e.g., "1d6", "3d4").
    *   `damageType`: Type of damage inflicted (e.g., "Ballistic", "Slashing", "Fire", "Explosive", "Chemical").
*   **Melee Weapons**:
    *   Examples: Knives (Kukri, Straight Razor, Combat Knife), Clubs, Swords (Longsword, Katana, Rapier), Axes (Hatchet), Maces, Spears, Improvised (Ashtray, Bottle, Brick), Specialized (Nunchaku, Tonfa, Whip, Chainsaw, Sap, Metal Baton, Bayonet, Sword Cane).
    *   Properties: Standard weapon properties. Some may have "reach" tag.
*   **Firearms**:
    *   Sub-types: Pistols (Autoloaders, Revolvers, Machine Pistols), Submachine Guns (SMGs), Rifles (Assault Rifles, Battle Rifles, Hunting Rifles, Sniper Rifles), Shotguns (Pump-action, Semi-auto, Automatic), Machine Guns (Medium, Heavy).
    *   Examples: Desert Eagle, S&W M29, Colt Python, Beretta 92F, AKM/AK-47, M16A2, HK MP5, Mossberg Shotgun, Barrett Light Fifty.
    *   Properties:
        *   `rateOfFire`: Indication of firing capability (e.g., "S" for semi-auto, "A" for automatic).
        *   `fireModes`: Array of available modes (e.g., "single", "burst", "auto").
        *   `magazineSize`: Capacity and type (e.g., "15 box", "6 cyl.", "Linked").
        *   `ammoType`: Specific ammunition required (e.g., "9mm", ".50AE", "12gauge_buckshot").
        *   `projectileSprite`, `projectileColor`: For visual representation of bullets.
        *   `requires_grapple_for_point_blank` tag: Some handguns may require grappling for effective point-blank use.
*   **Launchers**:
    *   Examples: M72A3 LAW (rocket launcher), M79 (grenade launcher).
    *   Properties:
        *   Typically fire explosive projectiles.
        *   `burstRadiusFt`: Area of effect for explosions.
        *   `explodesOnImpact`: Boolean.
        *   Treated as rifles for some skill calculations (`launcher_treated_as_rifle` tag).
*   **Bows & Crossbows**:
    *   Examples: Compound Bow, Crossbow.
    *   Properties: Require specific ammo ("arrow", "crossbow_bolt"), typically silent.
*   **Thrown Weapons**:
    *   Sub-types: Standard (Javelin, Shuriken), Explosive (Frag Grenade, Thermite Grenade), Utility (Smoke Grenade, Tear Gas Grenade), Liquid (Acid, Molotov Cocktail).
    *   Properties:
        *   `rangeIncrementFt`: Base throwing range.
        *   `burstRadiusFt` (for explosives/utility): Area of effect.
        *   `specialEffect`: String describing non-damage effects (e.g., "Creates smoke screen", "Temporary Blindness").
        *   `splashDamage` (for liquids): Damage to adjacent targets.
*   **Other Ranged Weapons**:
    *   Examples: Flamethrower, Taser.
    *   Properties: Unique mechanics (e.g., stream of fire, electrified darts).
*   **Improvised Weapons**:
    *   Examples: Ashtray, Rock/Mug, Bottle/Drill, Brick/Stool, Garbage Can/Guitar, Ladder/Mailbox, Desk/Dumpster, Junked Vehicle Part.
    *   Generally lower damage, representing makeshift combat options.
*   **Utility Sprays**:
    *   Example: Pepper Spray.
    *   Properties: Non-lethal, apply status effects, may have burst radius or cone effect.

### 2. Ammunition
*   **Types**: Various calibers and types matching weapon requirements.
    *   Firearm Ammo: .50AE, .44mag, .357mag, 9mm, 10mm, .45acp, .38spl, .22lr, .32acp, 5.56mm, 7.62mm (NATO), 7.62mmR (AK), .444, .50BMG.
    *   Shotgun Shells: 10-gauge, 12-gauge (buckshot).
    *   Other: Arrows, Crossbow Bolts, 40mm Grenades (Frag).
*   **Properties**:
    *   `ammoType`: Matches weapon's requirement.
    *   `quantity`: Number of rounds/shells per item instance (e.g., per box).
    *   Some ammo types (like 40mm grenades) can have inherent damage and burst radius properties if they are the direct source of explosion.

### 3. Armor & Clothing
*   **General Properties**:
    *   `type`: "clothing".
    *   `isClothing`: Boolean (true).
    *   `size`: Inventory slots occupied when unequipped.
    *   `weightLbs`: Weight.
    *   `tags`: Categorization (e.g., "head_top", "torso_bottom", "container").
    *   `layer`: Specific body layer occupied (e.g., `ClothingLayers.TORSO_TOP`).
    *   `coverage`: Array of body parts this item covers/protects.
    *   `insulation`: Value representing warmth/environmental protection (not fully implemented).
    *   `armorValue`: Numerical value reducing incoming damage to covered body parts.
    *   `capacity`: For clothing that also acts as a container (e.g., backpacks, cargo pants), provides additional inventory slots.
*   **Examples**:
    *   Shirts, Pants (e.g., Durable Pants, Cargo Pants).
    *   Headwear (e.g., Baseball Cap, Wide-Brim Hat, Headlamp).
    *   Vests (e.g., Basic Vest).
    *   Backpacks (e.g., Small Backpack, Large Backpack).

### 4. Consumables
*   **Food & Drink**:
    *   Examples: Canned Beans, Energy Bar, MRE, Bottled Water, Canteen (Full).
    *   Properties:
        *   `isConsumable`: Boolean (true).
        *   `effects`: Object detailing effects on needs (e.g., `hunger: -40`, `thirst: -50`). Some might have secondary effects (e.g., stamina).
*   **Medical Supplies**:
    *   Examples: Bandage, First-Aid Kit.
    *   Properties:
        *   `effects`: Object detailing healing effects (e.g., `health: 10`, `stopBleeding: true`).
*   **Utility Consumables**:
    *   Example: Water Purification Tablets.
    *   Properties: `effects` for specific utility actions (e.g., `purifyWater: 1`).
*   **Explosives (Consumable Type)**:
    *   Examples: C4/Semtex, Det Cord, Dynamite.
    *   Properties: `damage`, `damageType`, `burstRadiusFt`. These are used when the explosive is detonated, not "consumed" in the typical sense.

### 5. Tools & Crafting Materials
*   **Tools**:
    *   Example: Flashlight, Portable Table Lantern, Portable Candle, Headlamp.
    *   Properties: May have `light_properties` (color, radius, intensity, cone_angle), may require power cells (tag: `requires_power_cell`), can be `hand_held` or worn.
*   **Crafting Materials**:
    *   Examples: Scrap Metal, Wood Planks, Cloth Scraps, Duct Tape, Nails.
    *   Properties: Categorized by `type: "crafting_material"` and tags like "metal", "wood", "cloth".
*   **Seeds**:
    *   Examples: Tomato Seeds, Corn Seeds, Carrot Seeds.
    *   Properties: `plantable: true`, `effects: { "growsInto": "plant_id" }`.

### 6. Miscellaneous Items
*   **Debris**:
    *   Examples: Sharp Glass, Splintered Wood.
    *   Likely for environmental flavor or minor hazards, not typically picked up or used.
*   **Container Items (Map-Placed)**:
    *   These are definitions for items that become part of a map tile which acts as a container (e.g., "Cabinet" item linked to a "CB" tile).
    *   Examples: Cabinet, Drawer, Gun Case, Trash Can, Safe, Refrigerator, Stove/Oven, Microwave, Bookshelf, Nightstand, Dresser, Desk.
    *   Properties: `capacity`. The tile itself in `tileset.json` will link to these items and handle loot.

## World & Environment Features

### 1. Map Tiles & Structure
*   **Variety**: Tiles define the visual and physical properties of the game world.
    *   **Landscape Tiles**: Dirt, Grass, Mud, Tall Grass, Marsh, Bog, Sand, Gravel, Shallow Water, Deep Water, Asphalt Road, Dirt Road.
    *   **Vegetation**: Tree Trunks, Bushes.
    *   **Natural Obstacles**: Boulders.
    *   **Hazards**: Spikes.
    *   **Man-made Ground Features**: Manholes.
*   **Building Components**:
    *   **Flooring**: Tile Flooring, Wood Flooring, Carpet.
    *   **Walls**: Wood Walls, Metal Walls (various orientations: horizontal, vertical, corners, T-junctions, cross-junctions). Walls typically block movement and vision, and provide cover.
    *   **Doors**: Wood Doors, Metal Doors (horizontal, vertical). Can be `closed` (impassable), `open` (passable, allows vision), or `broken`. Doors are interactive and breakable.
    *   **Windows**: Glass Windows (horizontal, vertical). Can be `closed` (impassable but allows vision/transparent), `open` (passable, allows vision), or `broken`. Windows are interactive and breakable.
    *   **Roofs**: Wood Roof, Metal Roof, Tree Leaves (as roof). Roofs can be toggled for visibility and block line of sight/light when shown.
*   **Furniture & Fixtures (as Tiles)**:
    *   Counters, Sinks, Sofas, Armchairs, Coffee Tables, Televisions, Beds, Toilets, Showers, Bathtubs, Floor Lamps, Potted Plants, Computers, Printers, Washers, Dryers, Fireplaces.
    *   Many of these are interactive or act as containers (see below).
    *   Some furniture may be impassable or provide cover.
*   **Special Tiles**:
    *   `Map Boundary`: Impassable tile defining map edges.
    *   `Tilled Soil`: Plantable tile for farming/gardening.
    *   `Wooden Barricade`: Impassable cover, breakable.
    *   `Light Emitters (as tiles)`: Torches, Floor Lamps, Standing Lanterns, Placed Candles, Streetlamps, Floodlights, Neon Signs. These have `emitsLight`, `lightColor`, `lightRadius`, `lightIntensity` properties. Some are `emits_at_night` or have `flashing_effect`.

### 2. Environmental Interactions
*   **Doors & Windows**:
    *   Can be opened or closed by the player (costs AP if in combat).
    *   Can be broken down.
*   **Containers (Map-Based)**:
    *   Certain tiles act as containers (e.g., Cabinets, Drawers, Gun Cases, Trash Cans, Safes, Refrigerators, Stoves, Microwaves, Bookshelves, Nightstands, Dressers, Desks).
    *   These tiles link to an `itemLink` in `items.json` which defines their base properties like capacity.
    *   The tile definition in `tileset.json` can specify `contents` (though often populated dynamically), `capacity` (can override itemLink), `isLocked`, and `lockDifficulty`.
    *   Players can loot items from these containers when nearby (interaction appears in inventory menu).
*   **Planting**:
    *   Seeds can be planted on `Tilled Soil` tiles (mechanics for growth/harvesting not fully detailed but hinted by `growsInto` property on seeds).

### 3. Portals & Map Transitions
*   Maps can define portal locations (`portals.json` or embedded in map data).
*   Stepping on a portal tile triggers a confirmation prompt.
*   If confirmed, the player is transported to a target map ID at specified target coordinates (X, Y).
*   Combat typically ends upon map transition.

### 4. Lighting & Visibility
*   **Dynamic Light Sources**:
    *   Player-held items (Flashlight, Lantern, Candle) or equipped items (Headlamp).
    *   Placed items/tiles on the map (Torches, Lamps, Streetlights).
    *   Light sources have properties: color, radius, intensity, and sometimes cone angle (for directional lights).
*   **Ambient Lighting**:
    *   The overall brightness and color tint of the map changes based on the in-game time (day/night cycle).
    *   Specific colors define dawn, daytime, dusk, and night.
*   **Fog of War (FOW)**:
    *   Controls tile visibility: `hidden`, `visited` (previously seen), `visible` (currently in line of sight).
    *   Player has a vision radius.
    *   Line of sight calculations determine visibility, blocked by opaque tiles (walls, closed doors without windows, etc.).
*   **Effects on Gameplay**:
    *   Darkness (low ambient light and no dynamic light sources) can impose penalties on actions, such as combat targeting.
    *   Light sources are crucial for navigating and operating effectively in dark areas.
    *   Smoke and Tear Gas also affect visibility and targeting.

## UI & General Features

### 1. Character Creator UI
*   **Input Fields**: Text input for character name.
*   **Stat Allocation**: Numerical inputs for each stat (Strength, Intelligence, etc.) with min/max values.
*   **Skill Allocation**: Numerical inputs for each skill, with a total skill points budget. Remaining skill points are displayed.
*   **Display**: Shows character level (starts at 1) and XP (starts at 0).
*   **"Start Game" Button**: Finalizes character creation and begins the game.

### 2. Main Game UI
*   **Layout**: Typically a multi-panel layout (Left, Middle, Right, Console).
*   **Left Panel**:
    *   `Character Info Panel`: Displays character name, level, XP, current stats, current skills, and worn clothing (after game start).
    *   `Error Message Display`: Shows game-related error messages.
*   **Middle Panel**:
    *   `Map Container`: Renders the game map, player, NPCs, and environmental effects.
    *   `Combat UI Div`:
        *   `Initiative Display`: Shows the turn order in combat.
        *   `Current Attacker/Defender`: Displays the names of the current combatants.
        *   `Attacker Prompt/Attack Declaration UI`: Allows player to select weapon, target body part, fire mode, and confirm attack, or attempt grapple/reload. Includes a "Retarget" button.
        *   `Defense Declaration UI`: Allows player to choose defense type (Dodge, Block Unarmed/Armed) and blocking limb if applicable.
        *   `Attack/Defense Roll Results`: Displays the outcomes of combat rolls.
        *   `Damage Result`: Shows the raw and applied damage.
        *   `Combat Log`: Text log of combat events.
*   **Console Panel (Right Side of Middle or Separate)**:
    *   `Console Output`: Displays game log messages, debug info, and command output.
*   **Right Panel (Game Controls & Status)**:
    *   `Toggle Roof` Button: Shows/hides the roof layer of the map.
    *   `Map Selector`: Dropdown to load different game maps.
    *   `Turn Status`:
        *   `Movement Points UI`: Displays remaining MP for the current turn.
        *   `Action Points UI`: Displays remaining AP.
    *   `Time & Needs Status`:
        *   `Clock Display`: Shows current in-game day, time (HH:MM). Color changes based on time of day.
        *   `Hunger/Thirst Display`: Shows current hunger/thirst levels as bars and numerical values.
    *   `Health Status Table`:
        *   Displays HP (current/max), Armor, and Crisis Timer for each body part of the player.
    *   `Interactable Items List`: Shows nearby items the player can interact with (numbered list).
    *   `Action List`: Shows available actions when an item is selected (numbered list).
    *   `Equipped Hand Items`: Displays items currently in the player's hands.
    *   `Equipped Containers`: Lists clothing items that provide inventory capacity (e.g., backpacks, cargo pants) and their contribution.
    *   `Inventory List`:
        *   Displays items in the player's main inventory container and equipped items (hand slots, clothing).
        *   Shows items on the floor in a 3x3 grid around the player.
        *   Shows items in nearby world containers.
        *   Indicates total inventory capacity (used/max slots).
        *   Allows item selection via cursor (up/down keys) for interaction (equip, unequip, use, drop).
        *   Toggled by 'I' key.
*   **Keybinds Display**:
    *   A toggleable overlay (default key 'H') showing a list of common game controls.

### 3. Game Console
*   **Interface**: An input field for typing commands and an output area for responses.
*   **Access**: Toggled by the backquote/tilde key (`).
*   **Functionality**:
    *   Allows execution of text-based commands (e.g., `help` for a list of commands, potential debug commands like god mode, no clip, item spawning - as seen in test functions).
    *   Command history navigation (up/down arrow keys).
    *   Provides feedback and logs game events.

### 4. Animations
*   The game features a system for visual animations for actions like:
    *   Movement of player and NPCs.
    *   Melee attacks (e.g., swing, chainsaw, whip).
    *   Ranged attacks (e.g., bullet trails, throwing animations).
    *   Explosions.
    *   Special weapon effects (e.g., flamethrower, taser, gas clouds, liquid splashes).
    *   Grappling.
*   Animations are managed by an `AnimationManager` and play out over a set duration, potentially blocking subsequent actions until complete.

### 5. Saving/Loading (Potential Feature)
*   While not explicitly detailed in the core gameplay loop files, the presence of `campaignWasLoaded` event and map indexes suggests a system for loading predefined game scenarios or campaigns.
*   A full save/load system for player progress is a common TRPG feature but its implementation status is not fully clear from the reviewed code. (Will mark as potential/to-be-confirmed).

## Map Maker Features

A separate map maker tool (`mapMaker.html`, `mapMaker.js`) is available for creating and editing game maps.

### 1. User Interface & Canvas
*   **Web-Based Tool**: Accessed via an HTML page.
*   **Grid-Based Canvas**: Visual representation of the map where tiles are placed.
*   **Dimension Controls**:
    *   Input fields for setting map `width` and `height`.
    *   `Resize Map` button to apply new dimensions (re-initializes map).
*   **Layer Management**:
    *   Dropdown to select the active editing layer: `Landscape`, `Building`, `Item`, `Roof`.
    *   Checkboxes to toggle visibility of each layer on the canvas.
*   **Tool Palette**:
    *   Buttons for selecting drawing tools: `Brush`, `Fill`, `Line`, `Rect` (Rectangle), `Stamp`, `Select/Inspect`.
*   **Tile Palette**:
    *   Displays available tiles (sprite and color) from the loaded `tileset.json`.
    *   Dynamically filtered based on the currently selected editing layer (e.g., only "landscape" tagged tiles for the landscape layer).
    *   Includes an "Eraser" tool (represented as '✖') to clear tiles.
*   **File Operations**:
    *   `Export Map JSON` button: Saves the current map data (including all layers, dimensions, NPC spawns, portals, and tile instance properties) as a JSON file. User is prompted for a filename/ID.
    *   `Load Map` button with file input: Loads map data from a selected JSON file.

### 2. Core Editing Functionality
*   **Tile Placement**: Clicking on the grid with a selected tile and tool places/modifies tiles on the current active layer.
*   **Drawing Tools**:
    *   `Brush`: Paints individual tiles with the selected `currentTileId`.
    *   `Fill`: Flood fills an area of contiguous tiles of the same type with the selected `currentTileId`.
    *   `Line`: Draws a line of tiles between two points using the selected `currentTileId`.
    *   `Rect`: Draws a filled rectangle of tiles between two points using the selected `currentTileId`.
    *   `Stamp`:
        *   First click-drag-release defines a rectangular area to copy as a stamp.
        *   Subsequent clicks paste the copied stamp data onto the map.
        *   A preview of the stamp is shown under the mouse cursor.
*   **Auto-Tiling**:
    *   Implemented for wall types (e.g., Wood Wall Horizontal `WWH`, Metal Wall Horizontal `MWH`).
    *   Automatically selects the correct wall variant (corner, T-junction, straight piece, etc.) based on adjacent wall tiles of the same family.
*   **Undo/Redo**:
    *   Supports undo (`Ctrl+Z`) and redo (`Ctrl+Y`) for map modifications.
    *   Maintains a stack of previous map states.
*   **Select/Inspect Tool**:
    *   Allows clicking on a tile to select it for property editing (NPCs, Portals, Containers, generic tile instances).
    *   Clears any active "add" modes (like adding NPCs or portals).

### 3. Special Object & Property Editing
*   **NPC Placement & Management**:
    *   (Assumed from `npc_spawns` in export and references to NPC add mode buttons in mapMaker.js comments, though the direct UI for NPC type selection and placement isn't fully detailed in the provided `mapMaker.html` snippet itself).
    *   Likely allows selecting an NPC type and placing it on the map.
    *   Placed NPCs are stored with their ID and map coordinates in the `npc_spawns` array of the map data.
    *   Selected NPCs on the map can likely be removed or have their properties edited.
*   **Portal Placement & Configuration**:
    *   `Add Portal` mode: Allows clicking on the map to place a new portal.
    *   `Portal Configuration UI`:
        *   Displays ID and coordinates of the selected portal.
        *   Input fields for `Target Map ID` (filename of the destination map, without .json).
        *   Input fields for `Target X` and `Target Y` coordinates on the destination map.
        *   `Save Portal` button to apply changes.
    *   `Remove Selected Portal` button.
    *   Portals are visually marked on the map editor canvas.
*   **Container Inventory & Lock Management**:
    *   When a tile tagged as `container`, `door`, or `window` is selected with the `Select/Inspect` tool:
        *   **Container Name & Position**: Displays the name and coordinates of the selected container tile.
        *   **Lock Properties (for containers, doors, windows)**:
            *   `Is Locked` checkbox.
            *   `Lock DC` (Difficulty Class) numerical input (enabled when "Is Locked" is checked).
        *   **Item List (for containers only)**: Displays items currently inside the selected container tile.
            *   Allows removing items from the container.
        *   **Add Item Form (for containers only)**:
            *   Dropdown to select an item ID from the loaded `items.json`.
            *   Input for item `quantity`.
            *   `Add Item` button to add the selected item/quantity to the container.
    *   Container data (inventory, lock status) is stored as an object on the tile data if customized, otherwise the tile is just its string ID.
*   **Tile Instance Property Editor**:
    *   When any tile is selected with the `Select/Inspect` tool (and it's not an NPC or Portal being primarily edited):
        *   Displays `Base Tile ID`, `Base Name`, and `Base Tags` (from `tileset.json`).
        *   `Instance Name` input: Optional custom name for this specific tile instance.
        *   `Instance Tags` input: Comma-separated list of custom tags to apply to this specific tile instance (e.g., "quest_item", "fragile").
        *   `Save Tile Properties` button.
        *   `Clear Custom Properties` button: Removes instance-specific name and tags, reverting to base tile behavior (may convert tile data back to string ID if no other special properties like container/lock info exist).
    *   This allows individual tiles on the map to have unique characteristics beyond their base definition.

### 4. Data Structure
*   **Map JSON Format**:
    *   `id`: Unique map identifier (string).
    *   `name`: Friendly display name for the map (string).
    *   `width`: Map width in tiles (number).
    *   `height`: Map height in tiles (number).
    *   `layers`: An object containing 2D arrays for each layer:
        *   `landscape`: Array of tile IDs/objects.
        *   `building`: Array of tile IDs/objects.
        *   `item`: Array of tile IDs/objects.
        *   `roof`: Array of tile IDs/objects.
        *   (Tile data within layers can be a string ID or an object if it has instance-specific properties like custom name/tags, container inventory, or lock status).
    *   `npc_spawns`: Array of objects, each specifying an NPC `id` and its `mapPos` (`{x, y}`).
    *   `portals`: Array of portal objects, each with `id`, `x`, `y`, `targetMapId`, `targetX`, `targetY`.
*   **Asset Dependency**: Relies on `tileset.json` for tile definitions (sprites, colors, tags) and `items.json` for item definitions used in containers.
