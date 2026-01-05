# Damage Types and Messages

This document lists all the damage types used in the game and the corresponding messages displayed when a body part is damaged or destroyed.

## Damage Types

The following damage types are defined in the game:

*   **Ballistic**: Damage from firearms and projectiles.
*   **Bludgeoning**: Damage from blunt weapons, fists, and impacts.
*   **Slashing**: Damage from edged weapons like swords and knives.
*   **Piercing**: Damage from pointed weapons like spears and daggers.
*   **Fire**: Damage from flames, flamethrowers, and incendiaries.
*   **Explosive**: Damage from explosions (grenades, rockets, etc.).
*   **Chemical**: Damage from chemical agents (e.g., tear gas, pepper spray).
*   **Acid**: Damage from corrosive substances.
*   **Physical**: Generic physical damage (often used as a fallback).
*   **Concussion**: Impact damage (e.g., from heavy projectiles like soda cans).

## Damage Messages

### Crisis Descriptions
When a body part reaches 0 HP and enters a "Health Crisis", a specific description is generated based on the damage type:

| Damage Type | Message |
| :--- | :--- |
| **Ballistic** | `${bodyPartName} deeply lacerated` |
| **Bludgeoning** | `${bodyPartName} severely bruised` |
| **Slashing** | `${bodyPartName} bleeding profusely` |
| **Piercing** | `${bodyPartName} punctured` |
| **Fire** | `${bodyPartName} badly burned` |
| **Explosive** | `${bodyPartName} mangled` |
| **Chemical** | `${bodyPartName} corroded` |
| **Default** | `${bodyPartName} critically damaged` |

*Note: The system logs this as `CRISIS START: ${entityName}'s ${fmtPartName} critically injured! (${description}). Timer: 3 turns.`*

### Destruction and Death Messages
Messages displayed when a body part is destroyed or the character dies.

*   **Generic Re-hit (Fatal)**:
    > "FATAL HIT: ${entityName}'s already crippled ${fmtPartName} was struck again! Character has died."

*   **Explosion Destruction**:
    > "CRITICAL DAMAGE: ${entityName}'s ${fmtPartName} is DESTROYED by explosion!"

*   **Explosion Death (Vital Part)**:
    > "${entityName} died from catastrophic destruction of ${fmtPartName}."

*   **Generic Defeat**:
    > "DEFEATED: ${entityName} has fallen!"

*   **Status Effect Death**:
    > "DEFEATED: ${entityName} by ${effect.displayName}!"

*   **Tear Gas Death**:
    > "DEFEATED: ${entityName} succumbed to tear gas at end of turn!"

*   **Untreated Crisis Death**:
    > "${characterName} has died due to untreated health crisis (${part.name})."
