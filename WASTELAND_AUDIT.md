# Wasteland Campaign Audit

This document outlines the requirements to support the "Wasteland Campaign GM Setting Bible" and "Updated Faction Relationship Map". The audit is divided into architectural requirements (Engine/Tools) and specific content requirements.

---

## 1. Base Game Engine Audit

### A. Faction System
*   **Current Status:** Hardcoded in `js/factionManager.js` (`const Factions`, `defaultFactionRelationships`).
*   **Requirement:** **Dynamic Faction System** (Mechanic Update).
    *   Refactor `FactionManager` to load faction definitions and relationship matrices from JSON files (e.g., `assets/definitions/factions.json`).
    *   Support for the complex relationship types found in the text (Ally, Trade, Neutral, Tense, Enemy, Covert).
    *   Ensure NPCs defined in `npcs.json` can reference these dynamic faction IDs.

### B. Quest System
*   **Current Status:** `js/questManager.js` supports basic objectives (Kill, Collect, Visit, Talk) and rewards (XP, Items).
*   **Requirement:** **Faction Integration** (Mechanic Update).
    *   **New Reward Type:** `reputation`. Quests should be able to grant positive/negative reputation with specific factions.
    *   **New Requirement:** `min_reputation`. Quests should optionally require a certain reputation level with a faction to be available.
    *   **New Objective Type:** `change_reputation`? (Optional, maybe not needed if quests *cause* the change).
    *   **Clock/Timeline System:** The "Active Clocks" (Virus, Road Takeover, Water Theft) imply a global state tracking system that advances based on player actions or time.

### C. NPC & AI
*   **Current Status:** Basic behaviors (`idle`, `patrol`, `hunt`, `flee`) in `js/npcDecisions.js`.
*   **Requirement:** **Campaign Behaviors** (New Mechanics).
    *   **"Bio-Muncher" AI:** Swarm behavior, vulnerable to fire, specific "horror beats" logic.
    *   **"Orange Mist" Effect:** Needs a status effect system where continuous exposure transforms entities.
    *   **Infiltration Logic:** NPCs that appear friendly (e.g., "Fellowship" members) but trigger hostile events based on hidden "FOAK Infiltrator" tags.

### D. World & Persistence
*   **Current Status:** Map transitions supported. State persistence for Quests and Inventory exists.
*   **Requirement:** **World State Tracking** (Mechanic Update).
    *   **Territory Control:** Track which faction controls key points (e.g., "76 Road", "Water Points").
    *   **Global Flags:** Persist states like "Reactor Recovered", "Gate Closed", "Virus Progress %".

---

## 2. MapMaker Tool Audit

### A. Faction & Zone Tools
*   **Current Status:** Can place individual NPCs. No concept of "Zones".
*   **Requirement:** **Zone/Territory Tool** (New Mechanic).
    *   A new tool to paint "Zones" on the map.
    *   **Functionality:**
        *   **Faction Control:** Define which faction owns the zone for dynamic spawning (e.g., "FOAK Patrols" in "De Luz Rd").
        *   **Environmental Hazards:** Mark zones as "Radiation" or "Orange Mist" to trigger status effects on entry.
        *   **Event Triggers:** "Enter Zone" events for quests (e.g., "Investigate the Sunrise Project").

### B. Quest Editor
*   **Current Status:** `mapMaker/questEditor.js` allows editing Title, Description, Objectives, XP/Item rewards.
*   **Requirement:** **Faction Support** (Mechanic Update).
    *   Add UI fields to set "Reputation Rewards" (Faction ID + Amount).
    *   Add UI fields to set "Reputation Requirements" (Faction ID + Min Value).

---

## 3. Specific Content Requirements

### A. Factions (To be defined in `factions.json`)
*   **FPD** (Fallbrook Police Department) - *Order Anchor*
*   **FRN** (Fallbrook Resilience Network) - *Tech/Science*
*   **FOAK** (Proud Boys / Alt-Knights) - *Violent Opportunists*
*   **CM** (Calaveras de la Muerte) - *Cartel/Road Lords*
*   **Raiders** (Raiders of the Deadlands) - *Suburban Horror*
*   **Fellowship** (Christian Fellowship) - *Moral Battleground*
*   **Guard** (California National Guard) - *Sleeping Giant*
*   **Earth First** - *Invisible Antagonists*
*   **Pala** - *Border Authority*

### B. Key NPCs (To be defined in `npcs.json`)
*   **FPD:** Captain David Nisleit, Marna (Sgt), Memphis, Monte.
*   **FRN:** Dr. Isabella "Izzy" Reyes, Amelia "Wren" Prescott.
*   **FOAK:** Agustus Sol Invictus, Shauna (Infiltrator).
*   **CM:** Loi Khac Nguyen "Thai".
*   **Raiders:** Donovan "Danny" Calderone ("Trade Danny" & "Murder Danny" personas).
*   **Fellowship:** Shannon Smith.
*   **Guard:** Abe "Sandy" Adegoke.
*   **Earth First:** Bubo (AI/Leader), "Green" Mercenaries.
*   **Wildcards:** Beebe (Gun Shop), Bonner (Ex-Green), Zelma De Klerk (Scavenger), Chacol "Chase" Avila, Hero (Alien), Ryk (Refugee).

### C. New Items (To be defined in `items.json`)
*   **Weapons:** "Hamburger Helper" (Alien Blaster), 1911 Pistol, Camdon Defense firearms.
*   **Gear:** Gas Mask (Orange Mist protection), Air Filter.
*   **Quest Items:** Biomass Reactor, Virus Prototype, "Green" Letters/Orders.
*   **Resources:** Antibiotics, Batteries, Fuel.

### D. Plot Engines & Quests (To be defined in `quests.json`)
*   **Water War Spark:** FOAK attacks a water point; Player must defend or investigate.
*   **CM Protection:** Broker or break a "protection deal" between CM and FPD.
*   **Fellowship Crisis:** Sick children need FRN meds; Player mediates between the factions.
*   **Beebe Squeeze:** Protect Beebe from CM/FOAK extortion.
*   **Reactor Heist:** Recover the Biomass Reactor from the "Sunrise Project" dungeon (Time limit: Orange Mist).
*   **The Banishment:** Decide the fate of traitors Grayson and Shauna (affects FPD stability).
*   **Hero's Departure:** Escort Hero/Chase to the desert gate (Pala territory) before the ship leaves.

### E. Faction Relationship Matrix (Default State)
| Faction | FPD | FRN | FOAK | CM | Raiders | Fellowship | Guard | Earth First | Pala |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FPD** | - | Ally | Enemy | Tense | Tense | Neutral | Neutral | Unknown | Tense |
| **FRN** | Ally | - | Enemy | Tense | Neutral | Neutral | Neutral | Enemy | Tense |
| **FOAK** | Enemy | Enemy | - | Enemy | Tense | Infiltrating | Enemy | Pawn | Enemy |
| **CM** | Enemy | Tense | Enemy | - | Tense | Neutral | Tense | Unknown | Tense |
| **Raiders** | Tense | Neutral | Tense | Tense | - | Neutral | Enemy | Unknown | Neutral |
| **Fellowship**| Neutral | Neutral | Split | Fear | Fear | - | Neutral | Unknown | Neutral |
| **Guard** | Neutral | Neutral | Enemy | Tense | Enemy | Neutral | - | Enemy | Tense |
| **Earth First**| Enemy | Enemy | Pawn | Disruption| Disruption | Unknown | Enemy | - | Unknown |

*Note: "Split", "Infiltrating", and "Pawn" imply special game logic or scripted events rather than simple relationship values.*
