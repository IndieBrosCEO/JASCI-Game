# Farming System Analysis

## 1. System Overview: From Seed to Stomach
The farming system is designed to provide a gameplay loop where the player can grow their own food. Here is how the process is intended to work end-to-end:

### Gathering Seeds
Seeds can be obtained by finding them in the world or by harvesting wild plants. For example, harvesting generic plants (the `harvest:plant` loot table) has a small chance to drop `tomato_seeds` and `carrot_seeds`. Fully grown crops are also supposed to drop their respective seeds when harvested.

### Soil Preparation (Tilling)
To prepare land for farming, the player must have a "hoe" item equipped in one of their hand slots. By interacting with `Dirt` (DI), `Grass` (GR, TGR), or `Mud` (MU, MF) map tiles, they can select the "Till Soil" action. This updates the underlying map tile to Tilled Soil (`TSL`).

### Planting
When the player has a seed item in their hand slot and interacts with a Tilled Soil (`TSL`) tile, they are presented with a "Plant" action. Planting consumes the seed from the inventory, places a Stage 1 seedling tile on the map's middle layer, and registers the plant into the `FarmingManager`'s active plots to track its growth and watering state.

### Tending and Growth (Watering & Irrigation)
Plants require water to grow. The player can manually water plants via the "Water Plant" action, or they can grow automatically if they are "irrigated" (located within a 4-tile radius of a static water tile like `WS` or `WD`, or dynamic water managed by the `WaterManager`).
Every turn a crop is watered or irrigated, its `growthProgress` increases by 10.
- At 50 progress (5 turns of water), the plant advances from Stage 1 (Seedling) to Stage 2 (Growing).
- At 100 progress (10 total turns), it advances to Stage 3 (Ripe).
Upon advancing, the map visual updates to reflect the new growth stage.

### Harvesting
Once a crop reaches Stage 3, its map tile changes to a harvestable entity (e.g., the `PL_C3` ripe corn tile). The player interacts with this tile to harvest it, which references a loot table to drop food produce (like corn cobs) and fresh seeds.

### Consumption (Eating)
Produce is stored in the player's inventory as a consumable item. Players can eat these items, which triggers `inventoryManager.consumeItem()`. This function evaluates the item's effects and adjusts the player's biological needs, specifically `gameState.playerHunger`.

---

## 2. Plot Holes and Pitfalls (Current System Bugs)

While the framework exists, the farming system is currently fundamentally broken at nearly every step of the process. Below are the critical pitfalls:

### A. Seeds Cannot Be Planted (Missing Property)
- **The Issue:** `FarmingManager.plant()` expects the seed item to define what it grows into using a `cropTileId` property. However, in `assets/definitions/items/crafting_materials.json`, seed items (like `corn_seeds`) define their growth target under `effects.growsInto` instead.
- **The Result:** The planting action always fails, throwing the console message *"These seeds don't seem to grow into anything known."* The seed is not planted, preventing the entire farming loop from even starting.

### B. Incomplete Growth Logic
- **The Issue:** The `FarmingManager.processTurn()` function hardcodes the mapping of crop names to map tile prefixes. It explicitly checks for "Corn" (`PL_C`) and "Carrot" (`PL_R`), but lacks any logic for "Tomato" crops.
- **The Result:** Even if a player somehow planted Tomato seeds, the plant would never visually or mechanically progress past Stage 1.

### C. Irrigation Requires the Player's Presence
- **The Issue:** `FarmingManager.checkIrrigation()` relies on checking the `mapRenderer`'s current map data. If the player travels to a different map, `checkIrrigation()` instantly returns `false` because the map data isn't loaded.
- **The Result:** Crops only benefit from passive water sources if the player stays on the same map. If the player leaves, their crops stop growing unless manually watered just prior.

### D. Crops Cannot Be Harvested (Missing Interactions)
- **The Issue:** Ripe crop tiles use specific interaction tags (e.g., `harvest:corn`, `harvest:carrot`). However, `js/interaction.js` strictly filters for generic tags like `harvest:plant` and completely ignores crop-specific tags.
- **The Result:** Ripe crops are un-interactable. The player will never receive a "Harvest" prompt for their grown food.
- **Compounding Issue:** Even if the interaction were added, `js/harvestManager.js` also lacks mapping for `harvest:corn` and `harvest:carrot`, meaning it wouldn't know which loot table to roll.

### E. Harvesting Yields Non-Existent Items
- **The Issue:** The loot table for `harvest:corn` is defined to drop `seeds_corn` and `corn_cob`. However:
  - The actual seed item ID in the database is `corn_seeds`, not `seeds_corn`.
  - The item `corn_cob` does not exist in any JSON definition file.
- **The Result:** If harvesting were possible, the game would attempt to drop null items, leading to inventory errors or invisible loot.

### F. Eating Food Starves the Player (Hunger Logic Inversion)
- **The Issue:** There is a severe disconnect between the Time Manager and the Inventory Manager regarding how hunger is tracked.
  - `js/timeManager.js` treats `playerHunger` as a **Satiety meter** (24 = Full, 0 = Starving, drops by 1 every hour).
  - However, `js/inventoryManager.js` simply adds the item's hunger effect value to the `playerHunger` variable (`playerHunger + item.effects.hunger`).
  - Most food items in `consumables.json` (such as nutrient paste) define their `hunger` effect as a *negative* number (e.g., `-24`), interpreting hunger as a deficit to be reduced.
- **The Result:** Eating food adds a negative value to the player's Satiety meter. Consequently, eating food instantly depletes satiety, accelerating starvation and causing the player to take immediate health damage.