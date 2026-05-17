# Wasteland Campaign Audit

This document outlines the requirements to support the "Wasteland Campaign GM Setting Bible" and "Updated Faction Relationship Map". The audit is divided into architectural requirements (Engine/Tools) and specific content requirements.

**Note:** This audit incorporates "GM-dev sanity checks" to ensure a robust, data-driven architecture that separates relationships, reputation, and hidden dynamics.

---

## 1. Base Game Engine Audit

### A. Faction System (Architecture Update)
*   **Current Status:** Hardcoded in `js/factionManager.js` (`const Factions`, `defaultFactionRelationships`).
*   **Requirement:** **Layered Faction Architecture**.
    *   **Layer 1: Public Relationships (Enum).** A standard matrix defining baseline stances: `Ally`, `Trade`, `Neutral`, `Tense`, `Enemy`, `Unknown`.
        *   *Feature:* **Asymmetry Support** (Faction A can view B as `Tense` while B views A as `Enemy`).
    *   **Layer 2: Player Reputation (Numeric).** A specific tracking system for the player's standing with each faction (separate from inter-faction politics).
    *   **Layer 3: Hidden Dynamics (Tags/Flags).** A system for special logic that doesn't fit into the standard matrix.
        *   `covert_relation`: e.g., `CovertSupport`, `CovertDisrupt`.
        *   `ideological_lock`: e.g., `["no_alliance_possible"]` (FOAK vs CM).
    *   **NPC Linkage:**
        *   Standard `faction_id`.
        *   New `covert_faction_id` (e.g., An NPC appears as "Fellowship" but `covert_faction_id` is "FOAK").
        *   Reveal logic (Suspicion threshold, Event trigger).

### B. Quest & Event System (Architecture Update)
*   **Current Status:** Basic objectives and rewards.
*   **Requirement:** **Clock Manager & Trigger System**.
    *   **Clock Manager:** A first-class system to track named global clocks (e.g., "Virus Progress", "Road Takeover").
        *   Advanced by: Time passage, Quest outcomes, Territory changes.
        *   Stages & Thresholds (e.g., "At 50%: Checkpoints Harden").
    *   **Trigger System:** Hooks to drive logic beyond simple quest completion.
        *   `onAccept`, `onComplete`, `onFail`.
        *   `onEnterZone`, `onExitZone`.
        *   `onTimerTick`, `onClockThreshold`.
    *   **Rewards:** `reputation_change` (Faction + Amount), `advance_clock` (ClockID + Ticks).

### C. NPC & AI (Architecture Update)
*   **Current Status:** Basic behaviors.
*   **Requirement:** **Advanced Campaign Behaviors**.
    *   **Swarm AI (Bio-Munchers):**
        *   Flocking-lite movement (cohesion radius).
        *   Target selection priorities (nearest > injured > isolated).
    *   **Infiltration Logic:**
        *   Handling for `true_faction` vs `visible_faction`.
        *   Reveal conditions: Interrogation, Quest step, Proximity to handler.
    *   **Persona System:** Support for NPCs like "Danny" who have multiple persona states affecting dialogue and behavior (sharing one memory/inventory).

### D. World & Hazards (Architecture Update)
*   **Current Status:** Basic tiles.
*   **Requirement:** **Complex Hazard System**.
    *   **Orange Mist:**
        *   **Continuous Exposure:** Track `mist_exposure_seconds` status stack.
        *   **Transformation:** Trigger "Bio-Muncher" transformation at threshold (e.g., 6s continuous).
        *   **Mitigation:** Gas mask equipment reduces exposure gain to 0.
    *   **Radiation:** Dose per second, sickness thresholds.

---

## 2. MapMaker Tool Audit

### A. Zone/Territory Tool (New Feature)
*   **Current Status:** None.
*   **Requirement:** **Multi-Layer Zone Painting**.
    *   **Layer 1: Control.** Define Faction ownership, Security Level (Safe, Contested, Hostile), and Patrol Density.
    *   **Layer 2: Hazard.** Paint areas as "Radiation", "Orange Mist", "Fire Scar".
        *   Parameters: Dose/Rate, Linger Time.
    *   **Layer 3: Event/Trigger.** "Enter Zone" hooks for quests and lore.
    *   **Spawn Tables:** Define dynamic spawns per zone (e.g., "FOAK Patrol" on "De Luz Rd").

### B. Points of Interest (POIs) & Checkpoints
*   **Current Status:** None.
*   **Requirement:** **Checkpoint Objects**.
    *   First-class objects defining: Controlling Faction, Inspection Rules (Toll, Confiscation), Hostility Thresholds.

### C. Validation & Debugging
*   **Requirement:**
    *   **JSON Schema Validation:** Ensure bad IDs don't crash the game.
    *   **Debug Overlay:** Visualize Zone Owners, Hazard Boundaries, Clock States.

---

## 3. Specific Content Requirements

### A. Faction Relationship Matrix (Baseline Public Relations)
| Faction | FPD | FRN | FOAK | CM | Raiders | Fellowship | Guard | Earth First | Pala |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FPD** | - | Ally | Enemy | Tense | Tense | Neutral | Neutral | Unknown | Tense |
| **FRN** | Ally | - | Enemy | Tense | Neutral | Neutral | Neutral | Enemy | Tense |
| **FOAK** | Enemy | Enemy | - | Enemy | Tense | Neutral | Enemy | Unknown | Enemy |
| **CM** | Enemy | Tense | Enemy | - | Tense | Neutral | Tense | Unknown | Tense |
| **Raiders** | Tense | Neutral | Tense | Tense | - | Neutral | Enemy | Unknown | Neutral |
| **Fellowship**| Neutral | Neutral | Neutral | Fear | Fear | - | Neutral | Unknown | Neutral |
| **Guard** | Neutral | Neutral | Enemy | Tense | Enemy | Neutral | - | Enemy | Tense |
| **Earth First**| Enemy | Enemy | Neutral | Neutral | Neutral | Unknown | Enemy | - | Unknown |
| **Pala** | Tense | Tense | Enemy | Tense | Neutral | Neutral | Neutral | Unknown | - |

### B. Special Dynamics (Hidden/Covert Layers)
*   **Earth First:**
    *   `CovertCommand` -> "Green Mercenaries"
    *   `CovertDisrupt` -> FPD, CM, Raiders
    *   `CovertOpportunism` -> FOAK
*   **FOAK:**
    *   `CovertInfiltration` -> Fellowship (Defectors/Spies)
    *   `CovertSabotage` -> FPD (Shauna/Grayson)
    *   `IdeologicalLock` -> CM (Cannot Ally)
*   **CM:**
    *   `CovertControl` -> Beebe
    *   `ExpansionClock` -> Roads 15/76
*   **Earth First / Bubo:**
    *   `Unknown` to most until revealed.

### C. Key NPCs & Assets
*   **Danny Calderone:** Needs "Two Persona" logic (Trade Danny / Murder Danny).
*   **Bubo:** AI entity, potential multiple bodies/terminals.
*   **Items:** Gas Masks (Functional), Radiation Meds, Alien Blaster ("Hamburger Helper").
*   **Clocks:**
    *   "Virus Completion" (Main)
    *   "Road Takeover" (CM)
    *   "Water Theft" (FOAK)
    *   "Fellowship Fracture" (Social)
