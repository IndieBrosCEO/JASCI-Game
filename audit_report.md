# Crafting Chain Audit & Refactor Report

## Executive Summary
A comprehensive audit of the item economy was conducted to ensure every item has a complete crafting chain from raw resources and to eliminate "dead end" single-use materials.

**Status:**
- **Dead Ends (Unobtainable Items):** Resolved for all base materials and core components.
  - Added recipes for previously uncraftable items (e.g., Concrete, Lye, Resin).
  - Added loot sources for missing raw materials (e.g., Lead, Copper Scrap, Sulfur).
  - Note: Some specific rare firearms remain loot-only (as intended for high-tier rewards) but are now explicitly added to `container:gun_safe` loot tables to ensure they are obtainable.
- **Single-Use Materials:** significantly reduced.
  - Consolidated usage where appropriate.
  - Added recipes to utilize "junk" items (e.g., recycling Electronic Scrap, butchering for Rawhide).
  - Remaining single-use items are generally specialized high-tier components (e.g., specific engine parts, ammo casings) which is acceptable for depth.

## Key Changes

### 1. New Raw Materials & Sources
To bridge gaps in the economy, the following raw materials were defined and added to loot/harvest tables:

*   **Lead Scrap:** Found in `scavenge:junk` and `scavenge:machinery`. Smelted into bullet projectiles.
*   **Scrap Brass:** Found in `scavenge:junk` and `scavenge:machinery`. Reformed into ammo casings.
*   **Copper Scrap:** Found in `scavenge:electronics` and `scavenge:junk`. Smelted into Copper Ingots.
*   **Sulfur & Saltpeter:** Rare drops added to `harvest:stone`. Essential for Gunpowder.
*   **Beeswax:** Rare drop added to `harvest:plant`. Used for waterproofing/candles.
*   **Feather:** Added to `harvest:wood` (bird nests). Used for arrows.
*   **Old Tire:** Added to `scavenge:junk`. Source of rubber.

### 2. New Intermediate Materials
*   **Copper Ingot:** Smelted from Copper Ore or Copper Scrap.
*   **Rawhide Leather:** Processed from Raw Animal Hides.
*   **Engine Parts (Block, Pistons, Crankshaft):** Now craftable from steel/scrap via machining, enabling engine construction.
*   **Metal Tube:** Craftable from Metal Sheets.

### 3. Recipe Fixes & Additions
*   **Ammunition:** Fixed property mismatches in all `casing` and `projectile` items so they correctly match ammo recipes. Added molding/casting recipes for all projectiles and casings.
*   **Chemistry:** Added recipes for **Lye Powder** (Wood Ash), **Concrete Mix** (Sand+Stone), **Fiberglass Resin** (Distilled from Bark), and **Adhesive Paste** (Bone/Hide).
*   **Vehicles:** Fixed chassis recipes to accept `Metal Sheet` correctly. Added missing recipes for V4/V6/Small engine kits.
*   **Food:** Added cooking recipe for **Raw Meat** -> **Cooked Meat**.

### 4. Loot Table Updates
*   Added `container:gun_safe` to provide a legitimate source for common firearms (`Glock 17`, `Remington 700`, etc.) and ammunition.
*   Standardized `scavenge` tables to include the new scrap types.

## Guardrails
A verification script `tests/economy_guardrails.js` has been added. It performs a graph traversal of the crafting system to:
1.  Identify items that are neither found in loot/harvest tables nor have a valid recipe path to such items (Dead Ends).
2.  Identify crafting materials used in fewer than 2 recipes (Single-Use warnings).

Run with: `node tests/economy_guardrails.js`
