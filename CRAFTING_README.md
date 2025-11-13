# Crafting System Documentation

This document outlines the consolidated component families and the component-based recipe system used in crafting and construction. The goal is to improve reusability and maintainability by reducing redundant components and providing a flexible recipe definition system.

## Component-Based Recipes

The crafting system uses a component-based approach. Instead of requiring a specific, single-purpose `itemId`, recipes can specify a "family" of items and a set of constraints that the items must meet.

### Families and Properties

A **family** is a group of items that are functionally similar. For example, the `primer` family includes all different types of primers.

Individual variations within a family are defined by **properties**. For example, a primer might have a `size` property that is `small` or `large`.

### Recipe Constraints

A recipe can specify the following constraints for each component, allowing it to select the correct items from a family:

*   `require`: The item must have the specified properties.
*   `exclude`: The item must not have the specified properties.
*   `min`: The item's numeric properties must be greater than or equal to the specified values.
*   `max`: The item's numeric properties must be less than or equal to the specified values.

### Example Recipe

Here is an example of a recipe that uses the component-based system to reload rifle cartridges. It requires a casing from the `casing` family with a `small_rifle` caliber, a primer with a `small` size, and so on.

```json
"recipe": {
    "description": "Reload 5.56mm rifle cartridges.",
    "components": [
        {
            "family": "casing",
            "quantity": 10,
            "require": {
                "caliber": "small_rifle"
            }
        },
        {
            "family": "primer",
            "quantity": 10,
            "require": {
                "size": "small"
            }
        },
        {
            "family": "powder_propellant",
            "quantity": 3
        },
        {
            "family": "projectile",
            "quantity": 10,
            "require": {
                "caliber": "small_rifle"
            }
        }
    ],
    "skills_required": [ { "skill": "Guns", "level": 3 } ],
    "station_required": "reloading_bench",
    "time_to_craft": 20,
    "batch_size": 10
}
```

## Component Family Reference

The following is a non-exhaustive list of the most common component families. Please refer to the JSON definition files in `assets/definitions/` for more details.

### Ammunition Components

- **Primers:** `primer` (properties: `size`, `type`)
- **Casings:** `casing` (properties: `caliber`)
- **Projectiles:** `projectile` (properties: `caliber`, `type`)
- **Shared:** `gunpowder`, `wad_shotgun`, `shotshell_hull`

### Fabrics and Leathers

- **Fabric:** `fabric_sheet`
  - Use `properties` to specify material, e.g., `"properties": { "material": "cotton" }`.
- **Leather:** `leather_hide`
  - Use `properties` to specify tanning and thickness, e.g., `"properties": { "tanning": "medium", "thickness": "medium" }`.

### Device Components

- **Casings:** `device_casing`
  - Use `properties` to specify material and size, e.g., `"properties": { "material": "plastic", "size": "small" }`.

### General Materials

- **Fasteners:** `nails`, `bolts`, `rivet`
- **Metals:** `scrap_metal`, `metal_ingot`, `metal_rod`, `metal_sheet`
- **Wood:** `wood_plank`, `wood_stick`, `wood_log`
- **Stone:** `stone_block`
- **Plastics:** `plastic_scrap`
