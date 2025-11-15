import json

def convert_crafting_materials(data):
    for item in data:
        if item["id"] == "scrap_metal":
            item["family"] = "metal"
            item["properties"] = { "type": "scrap", "grade": 1 }
        elif item["id"] == "wood_planks":
            item["family"] = "wood"
            item["properties"] = { "type": "plank", "grade": 1 }
        elif item["id"] == "cloth_scrap":
            item["family"] = "fabric"
            item["properties"] = { "type": "scrap", "material": "cotton" }
        elif item["id"] == "duct_tape":
            item["family"] = "adhesive"
            item["properties"] = { "type": "tape", "grade": 2 }
        elif item["id"] == "nails":
            item["family"] = "fastener"
            item["properties"] = { "type": "nail", "material": "metal" }
        elif item["id"] == "sharp_glass":
            item["family"] = "blade"
            item["properties"] = { "type": "shard", "material": "glass" }
        elif item["id"] == "splintered_wood":
            item["family"] = "wood"
            item["properties"] = { "type": "splinter", "grade": 0 }
        elif item["id"] == "metal_ingot":
            item["family"] = "metal"
            item["properties"] = { "type": "ingot", "material": "generic", "grade": 2 }
        elif item["id"] == "leather_strips":
            item["family"] = "leather"
            item["properties"] = { "type": "strip", "grade": 1 }
        elif item["id"] == "glass_bottle_empty":
            item["family"] = "container"
            item["properties"] = { "type": "bottle", "material": "glass", "size": "small" }
        elif item["id"] == "gasoline_canister_partial":
            item["family"] = "fuel"
            item["properties"] = { "type": "gasoline", "grade": 1 }
        elif item["id"] == "armor_plate_makeshift":
            item["family"] = "armor_plate"
            item["properties"] = { "material": "metal", "grade": 1 }
        elif item["id"] == "tomato_seeds":
            item["family"] = "seed"
            item["properties"] = { "plant": "tomato" }
        elif item["id"] == "corn_seeds":
            item["family"] = "seed"
            item["properties"] = { "plant": "corn" }
        elif item["id"] == "carrot_seeds":
            item["family"] = "seed"
            item["properties"] = { "plant": "carrot" }
        elif item["id"] == "iron_ingot":
            item["family"] = "metal"
            item["properties"] = { "type": "ingot", "material": "iron", "grade": 2 }
        elif item["id"] == "steel_ingot":
            item["family"] = "metal"
            item["properties"] = { "type": "ingot", "material": "steel", "grade": 3 }
        elif item["id"] == "rawhide_leather":
            item["family"] = "leather"
            item["properties"] = { "type": "rawhide", "grade": 1 }
        elif item["id"] == "tanned_leather_roll":
            item["family"] = "leather"
            item["properties"] = { "type": "tanned", "grade": 2 }
        elif item["id"] == "bolt_of_cloth_cotton":
            item["family"] = "fabric"
            item["properties"] = { "type": "bolt", "material": "cotton", "grade": 2 }
        elif item["id"] == "bolt_of_cloth_wool":
            item["family"] = "fabric"
            item["properties"] = { "type": "bolt", "material": "wool", "grade": 2 }
        elif item["id"] == "beeswax_chunk":
            item["family"] = "wax"
            item["properties"] = { "type": "beeswax" }
        elif item["id"] == "lye_powder":
            item["family"] = "chemical"
            item["properties"] = { "type": "lye" }
        elif item["id"] == "animal_fat_rendered":
            item["family"] = "organic"
            item["properties"] = { "type": "fat" }
        elif item["id"] == "gemstone_uncut_small":
            item["family"] = "gemstone"
            item["properties"] = { "type": "uncut", "size": "small" }
        elif item["id"] == "gold_dust_pouch":
            item["family"] = "metal"
            item["properties"] = { "type": "dust", "material": "gold" }
        elif item["id"] == "silver_nugget":
            item["family"] = "metal"
            item["properties"] = { "type": "nugget", "material": "silver" }
        elif item["id"] == "copper_wire_spool":
            item["family"] = "wire"
            item["properties"] = { "material": "copper", "insulated": True }
        elif item["id"] == "rubber_hose_section":
            item["family"] = "component"
            item["properties"] = { "type": "hose", "material": "rubber" }
        elif item["id"] == "gears_assorted":
            item["family"] = "component"
            item["properties"] = { "type": "gears", "material": "metal" }
        elif item["id"] == "circuit_board_blank":
            item["family"] = "component"
            item["properties"] = { "type": "circuit_board", "populated": False }
        elif item["id"] == "concrete_mix_bag":
            item["family"] = "construction_material"
            item["properties"] = { "type": "concrete_mix" }
        elif item["id"] == "rivets_box":
            item["family"] = "fastener"
            item["properties"] = { "type": "rivet", "material": "metal" }
        elif item["id"] == "fiberglass_resin_can":
            item["family"] = "chemical"
            item["properties"] = { "type": "resin", "material": "fiberglass" }
        elif item["id"] == "fiberglass_cloth_roll":
            item["family"] = "fabric"
            item["properties"] = { "type": "roll", "material": "fiberglass" }
        elif item["id"] == "wood_stick":
            item["family"] = "wood"
            item["properties"] = { "type": "stick", "grade": 1 }
        elif item["id"] == "wood_log":
            item["family"] = "wood"
            item["properties"] = { "type": "log", "grade": 1 }
        elif item["id"] == "plant_fibers_strong":
            item["family"] = "organic"
            item["properties"] = { "type": "plant_fiber" }
        elif item["id"] == "stone_sharp_fragment":
            item["family"] = "blade"
            item["properties"] = { "type": "shard", "material": "stone" }
        elif item["id"] == "animal_hide_raw_small":
            item["family"] = "leather"
            item["properties"] = { "type": "raw", "size": "small" }
        elif item["id"] == "sinew_animal":
            item["family"] = "organic"
            item["properties"] = { "type": "sinew" }
        elif item["id"] == "feather":
            item["family"] = "organic"
            item["properties"] = { "type": "feather" }
        elif item["id"] == "clay_lump":
            item["family"] = "ceramic"
            item["properties"] = { "type": "clay" }
        elif item["id"] == "sand_pile":
            item["family"] = "construction_material"
            item["properties"] = { "type": "sand" }
        elif item["id"] == "charcoal_bits":
            item["family"] = "fuel"
            item["properties"] = { "type": "charcoal" }
        elif item["id"] == "gunpowder_basic":
            item["family"] = "explosive"
            item["properties"] = { "type": "gunpowder", "grade": 1 }
        elif item["id"] == "metal_bits_small":
            item["family"] = "metal"
            item["properties"] = { "type": "bits", "grade": 1 }
        elif item["id"] == "casing_brass_pistol_small":
            item["family"] = "casing"
            item["properties"] = { "type": "pistol", "size": "small", "material": "brass" }
        elif item["id"] == "casing_brass_pistol_large":
            item["family"] = "casing"
            item["properties"] = { "type": "pistol", "size": "large", "material": "brass" }
        elif item["id"] == "casing_brass_rifle_small":
            item["family"] = "casing"
            item["properties"] = { "type": "rifle", "size": "small", "material": "brass" }
        elif item["id"] == "casing_brass_rifle_medium":
            item["family"] = "casing"
            item["properties"] = { "type": "rifle", "size": "medium", "material": "brass" }
        elif item["id"] == "casing_brass_rifle_large":
            item["family"] = "casing"
            item["properties"] = { "type": "rifle", "size": "large", "material": "brass" }
        elif item["id"] == "shotshell_hull_12ga":
            item["family"] = "shotshell_hull"
            item["properties"] = { "gauge": 12 }
        elif item["id"] == "shotshell_hull_10ga":
            item["family"] = "shotshell_hull"
            item["properties"] = { "gauge": 10 }
        elif item["id"] == "primer_pistol_small":
            item["family"] = "primer"
            item["properties"] = { "size": "small", "type": "pistol" }
        elif item["id"] == "primer_pistol_large":
            item["family"] = "primer"
            item["properties"] = { "size": "large", "type": "pistol" }
        elif item["id"] == "primer_rifle_small":
            item["family"] = "primer"
            item["properties"] = { "size": "small", "type": "rifle" }
        elif item["id"] == "primer_rifle_large":
            item["family"] = "primer"
            item["properties"] = { "size": "large", "type": "rifle" }
        elif item["id"] == "primer_shotgun":
            item["family"] = "primer"
            item["properties"] = { "type": "shotgun" }
        elif item["id"] == "bullet_projectile_9mm":
            item["family"] = "projectile"
            item["properties"] = { "caliber": "9mm", "type": "bullet" }
        elif item["id"] == "bullet_projectile_10mm":
            item["family"] = "projectile"
            item["properties"] = { "caliber": "10mm", "type": "bullet" }
        elif item["id"] == "bullet_projectile_45cal":
            item["family"] = "projectile"
            item["properties"] = { "caliber": ".45", "type": "bullet" }
        elif item["id"] == "bullet_projectile_50cal_pistol":
            item["family"] = "projectile"
            item["properties"] = { "caliber": ".50", "type": "pistol_bullet" }
        elif item["id"] == "bullet_projectile_22cal":
            item["family"] = "projectile"
            item["properties"] = { "caliber": ".22", "type": "bullet" }
        elif item["id"] == "bullet_projectile_5_56mm":
            item["family"] = "projectile"
            item["properties"] = { "caliber": "5.56mm", "type": "bullet" }
        elif item["id"] == "bullet_projectile_7_62mm":
            item["family"] = "projectile"
            item["properties"] = { "caliber": "7.62mm", "type": "bullet" }
        elif item["id"] == "bullet_projectile_50bmg":
            item["family"] = "projectile"
            item["properties"] = { "caliber": ".50bmg", "type": "bullet" }
        elif item["id"] == "shot_lead_pellets_buckshot":
            item["family"] = "projectile"
            item["properties"] = { "type": "buckshot" }
        elif item["id"] == "wad_shotgun":
            item["family"] = "component"
            item["properties"] = { "type": "wad", "for": "shotgun" }
        elif item["id"] == "arrow_shaft_wood":
            item["family"] = "arrow_shaft"
            item["properties"] = { "material": "wood", "type": "arrow" }
        elif item["id"] == "arrow_shaft_sturdy_wood":
            item["family"] = "arrow_shaft"
            item["properties"] = { "material": "wood", "type": "bolt" }
        elif item["id"] == "arrowhead_stone_crude":
            item["family"] = "arrowhead"
            item["properties"] = { "material": "stone", "grade": 1 }
        elif item["id"] == "arrowhead_metal_basic":
            item["family"] = "arrowhead"
            item["properties"] = { "material": "metal", "grade": 2 }
        elif item["id"] == "bolthead_metal_basic":
            item["family"] = "bolthead"
            item["properties"] = { "material": "metal", "grade": 2 }
        elif item["id"] == "explosive_compound_generic_b":
            item["family"] = "explosive"
            item["properties"] = { "type": "generic_b", "grade": 2 }
        elif item["id"] == "casing_grenade_40mm_metal":
            item["family"] = "casing"
            item["properties"] = { "type": "grenade", "size": "40mm", "material": "metal" }
        elif item["id"] == "fuze_timed_impact_grenade":
            item["family"] = "fuze"
            item["properties"] = { "type": "grenade", "trigger": ["timed", "impact"] }
        elif item["id"] == "thread_simple_plant_fiber":
            item["family"] = "thread"
            item["properties"] = { "material": "plant_fiber", "grade": 1 }
        elif item["id"] == "cordage_basic_plant_fiber":
            item["family"] = "cordage"
            item["properties"] = { "material": "plant_fiber", "grade": 1 }
        elif item["id"] == "cloth_sheet_rough_fiber":
            item["family"] = "fabric"
            item["properties"] = { "type": "sheet", "material": "plant_fiber", "grade": 1 }
        elif item["id"] == "leather_cured_small":
            item["family"] = "leather"
            item["properties"] = { "type": "cured", "size": "small" }
        elif item["id"] == "metal_rod_thin":
            item["family"] = "metal"
            item["properties"] = { "type": "rod", "size": "thin" }
        elif item["id"] == "metal_sheet_thin":
            item["family"] = "metal_sheet"
            item["properties"] = { "thickness": "thin" }
        elif item["id"] == "metal_wire_stiff":
            item["family"] = "wire"
            item["properties"] = { "material": "metal", "stiffness": "stiff" }
        elif item["id"] == "plastic_scrap_processed":
            item["family"] = "plastic"
            item["properties"] = { "type": "scrap", "processed": True }
        elif item["id"] == "led_basic":
            item["family"] = "component"
            item["properties"] = { "type": "led" }
        elif item["id"] == "wire_insulated_thin":
            item["family"] = "wire"
            item["properties"] = { "material": "copper", "insulated": True, "size": "thin" }
        elif item["id"] == "battery_cell_small":
            item["family"] = "power_source"
            item["properties"] = { "type": "battery", "size": "small" }
        elif item["id"] == "spring_small_metal":
            item["family"] = "component"
            item["properties"] = { "type": "spring", "size": "small", "material": "metal" }
        elif item["id"] == "rivet_small_metal":
            item["family"] = "fastener"
            item["properties"] = { "type": "rivet", "size": "small", "material": "metal" }
        elif item["id"] == "buckle_small_metal_plastic":
            item["family"] = "fastener"
            item["properties"] = { "type": "buckle", "size": "small" }
        elif item["id"] == "lens_crude_glass":
            item["family"] = "lens"
            item["properties"] = { "material": "glass", "grade": 1 }
        elif item["id"] == "chemical_reagent_sulfur":
            item["family"] = "chemical"
            item["properties"] = { "type": "sulfur" }
        elif item["id"] == "chemical_reagent_saltpeter":
            item["family"] = "chemical"
            item["properties"] = { "type": "saltpeter" }
        elif item["id"] == "tannin_simple_bark":
            item["family"] = "tannin"
            item["properties"] = { "source": "bark", "grade": 1 }
        elif item["id"] == "wick_basic_cloth_or_fiber":
            item["family"] = "component"
            item["properties"] = { "type": "wick" }
        elif item["id"] == "antiseptic_herbal_pulp":
            item["family"] = "medicinal"
            item["properties"] = { "type": "antiseptic_pulp", "source": "herbal" }
        elif item["id"] == "adhesive_paste_basic":
            item["family"] = "adhesive"
            item["properties"] = { "type": "paste", "grade": 1 }
        elif item["id"] == "mechanical_parts_simple":
            item["family"] = "component"
            item["properties"] = { "type": "mechanical_parts", "grade": 1 }
        elif item["id"] == "rubber_strips_or_chunks":
            item["family"] = "rubber"
            item["properties"] = { "form": "strips_chunks" }
        elif item["id"] == "old_tire":
            item["family"] = "salvage"
            item["properties"] = { "type": "tire" }
        elif item["id"] == "steel_ingot_small_tool_grade":
            item["family"] = "metal"
            item["properties"] = { "type": "ingot", "material": "steel", "grade": "tool" }
        elif item["id"] == "wood_handle_simple_tool":
            item["family"] = "handle"
            item["properties"] = { "material": "wood", "grade": 1 }
        elif item["id"] == "fabric_sheet_cotton_fine":
            item["family"] = "fabric"
            item["properties"] = { "type": "sheet", "material": "cotton", "grade": "fine" }
        elif item["id"] == "fabric_sheet_wool_fine":
            item["family"] = "fabric"
            item["properties"] = { "type": "sheet", "material": "wool", "grade": "fine" }
        elif item["id"] == "fabric_sheet_canvas_sturdy":
            item["family"] = "fabric"
            item["properties"] = { "type": "sheet", "material": "canvas", "grade": "sturdy" }
        elif item["id"] == "fabric_sheet_nylon_tough":
            item["family"] = "fabric"
            item["properties"] = { "type": "sheet", "material": "nylon", "grade": "tough" }
        elif item["id"] == "fabric_sheet_kevlar_ballistic":
            item["family"] = "fabric"
            item["properties"] = { "type": "sheet", "material": "kevlar", "grade": "ballistic" }
        elif item["id"] == "fabric_sheet_burlap_rough":
            item["family"] = "fabric"
            item["properties"] = { "type": "sheet", "material": "burlap", "grade": "rough" }
        elif item["id"] == "leather_hide_thick_cured":
            item["family"] = "leather"
            item["properties"] = { "type": "cured_hide", "thickness": "thick" }
        elif item["id"] == "leather_hide_medium_tanned":
            item["family"] = "leather"
            item["properties"] = { "type": "tanned_hide", "thickness": "medium" }
        elif item["id"] == "padding_foam_sheet":
            item["family"] = "padding"
            item["properties"] = { "material": "foam" }
        elif item["id"] == "plastic_casing_small_device":
            item["family"] = "casing"
            item["properties"] = { "material": "plastic", "size": "small" }
        elif item["id"] == "plastic_casing_medium_device":
            item["family"] = "casing"
            item["properties"] = { "material": "plastic", "size": "medium" }
        elif item["id"] == "metal_casing_small_device":
            item["family"] = "casing"
            item["properties"] = { "material": "metal", "size": "small" }
        elif item["id"] == "metal_casing_medium_device":
            item["family"] = "casing"
            item["properties"] = { "material": "metal", "size": "medium" }
        elif item["id"] == "electronics_board_populated_simple":
            item["family"] = "component"
            item["properties"] = { "type": "circuit_board", "populated": True, "grade": 1 }
        elif item["id"] == "heating_element_nichrome_wire":
            item["family"] = "component"
            item["properties"] = { "type": "heating_element", "material": "nichrome" }
        elif item["id"] == "motor_small_electric":
            item["family"] = "motor"
            item["properties"] = { "type": "electric", "size": "small" }
        elif item["id"] == "antenna_basic_radio":
            item["family"] = "component"
            item["properties"] = { "type": "antenna", "for": "radio" }
        elif item["id"] == "fuze_mechanism_advanced":
            item["family"] = "fuze"
            item["properties"] = { "type": "advanced" }
        elif item["id"] == "steel_plate_vehicle_grade":
            item["family"] = "armor_plate"
            item["properties"] = { "material": "steel", "grade": "vehicle" }
        elif item["id"] == "engine_block_small_cast":
            item["family"] = "engine_component"
            item["properties"] = { "type": "block", "size": "small" }
        elif item["id"] == "piston_set_small_engine":
            item["family"] = "engine_component"
            item["properties"] = { "type": "piston_set", "size": "small" }
        elif item["id"] == "crankshaft_small_engine":
            item["family"] = "engine_component"
            item["properties"] = { "type": "crankshaft", "size": "small" }
        elif item["id"] == "rubber_sheet_tire_tread":
            item["family"] = "rubber"
            item["properties"] = { "form": "sheet", "source": "tire" }
        elif item["id"] == "glass_lens_optical_grade_small":
            item["family"] = "lens"
            item["properties"] = { "material": "glass", "grade": "optical" }
        elif item["id"] == "memory_chip_basic":
            item["family"] = "component"
            item["properties"] = { "type": "memory_chip", "grade": 1 }
        elif item["id"] == "sensor_module_basic":
            item["family"] = "component"
            item["properties"] = { "type": "sensor", "grade": 1 }
        elif item["id"] == "plastic_junk_item":
            item["family"] = "salvage"
            item["properties"] = { "type": "plastic_junk" }
        elif item["id"] == "needle_steel":
            item["family"] = "needle"
            item["properties"] = { "material": "steel", "size": "standard" }
        elif item["id"] == "needle_steel_heavy":
            item["family"] = "needle"
            item["properties"] = { "material": "steel", "size": "heavy" }
        elif item["id"] == "thread_strong_synthetic":
            item["family"] = "thread"
            item["properties"] = { "material": "synthetic", "grade": 2 }
        elif item["id"] == "plant_leaves_green_pigment":
            item["family"] = "pigment"
            item["properties"] = { "color": "green", "source": "plant" }
        elif item["id"] == "tree_bark_brown_pigment":
            item["family"] = "pigment"
            item["properties"] = { "color": "brown", "source": "bark" }
        elif item["id"] == "dye_green_natural":
            item["family"] = "dye"
            item["properties"] = { "color": "green", "source": "natural" }
        elif item["id"] == "dye_brown_natural":
            item["family"] = "dye"
            item["properties"] = { "color": "brown", "source": "natural" }
        elif item["id"] == "netting_strong":
            item["family"] = "netting"
            item["properties"] = { "strength": "strong" }
        elif item["id"] == "water_clean_item":
            item["family"] = "liquid"
            item["properties"] = { "type": "water", "quality": "clean" }
        elif item["id"] == "rock_large_suitable":
            item["family"] = "stone"
            item["properties"] = { "type": "rock", "size": "large" }
        elif item["id"] == "stone_block_hewn":
            item["family"] = "construction_material"
            item["properties"] = { "type": "stone_block" }
        elif item["id"] == "metal_sheet_sturdy":
            item["family"] = "metal_sheet"
            item["properties"] = { "thickness": "sturdy" }
        elif item["id"] == "bolts_and_nuts_set":
            item["family"] = "fastener"
            item["properties"] = { "type": "bolts_and_nuts" }
        elif item["id"] == "tarp_basic":
            item["family"] = "shelter"
            item["properties"] = { "type": "tarp", "grade": 1 }
        elif item["id"] == "splint_wood_simple":
            item["family"] = "medical"
            item["properties"] = { "type": "splint", "material": "wood" }
        elif item["id"] == "iodine_crystals":
            item["family"] = "chemical"
            item["properties"] = { "type": "iodine" }
        elif item["id"] == "medicinal_herb_comfrey":
            item["family"] = "medicinal"
            item["properties"] = { "type": "herb", "name": "comfrey" }
        elif item["id"] == "animal_hide_fine":
            item["family"] = "leather"
            item["properties"] = { "type": "raw", "size": "fine" }
        elif item["id"] == "lime_solution_basic":
            item["family"] = "chemical"
            item["properties"] = { "type": "lime_solution" }
        elif item["id"] == "hook_metal_small":
            item["family"] = "hook"
            item["properties"] = { "material": "metal", "size": "small" }
        elif item["id"] == "plexiglass_sheet_thick":
            item["family"] = "plastic"
            item["properties"] = { "type": "sheet", "material": "plexiglass", "thickness": "thick" }
        elif item["id"] == "mechanical_parts_vehicle_grade":
            item["family"] = "component"
            item["properties"] = { "type": "mechanical_parts", "grade": "vehicle" }
        elif item["id"] == "engine_parts_kit_v4":
            item["family"] = "engine_kit"
            item["properties"] = { "type": "v4" }
        elif item["id"] == "long_wooden_shaft":
            item["family"] = "pole"
            item["properties"] = { "material": "wood", "length": "long" }
        elif item["id"] == "metal_casing_grenade_hand":
            item["family"] = "casing"
            item["properties"] = { "type": "grenade", "size": "hand", "material": "metal" }
        elif item["id"] == "safety_pin_pull_ring":
            item["family"] = "component"
            item["properties"] = { "type": "safety_pin_assembly" }
        elif item["id"] == "metal_blade_blank_small":
            item["family"] = "blade_blank"
            item["properties"] = { "material": "metal", "size": "small" }
        elif item["id"] == "wood_handle_scales_pair":
            item["family"] = "handle"
            item["properties"] = { "material": "wood", "type": "scales" }
        elif item["id"] == "motor_large_electric":
            item["family"] = "motor"
            item["properties"] = { "type": "electric", "size": "large" }
        elif item["id"] == "metal_blade_blank_large":
            item["family"] = "blade_blank"
            item["properties"] = { "material": "metal", "size": "large" }

        if "recipe" in item:
            new_components = []
            for component in item["recipe"]["components"]:
                new_component = {"quantity": component["quantity"]}
                if component["itemId"] == "wood_log":
                    new_component["family"] = "wood"
                    new_component["require"] = {"type": "log"}
                elif component["itemId"] == "scrap_metal":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "scrap"}
                elif component["itemId"] == "wood_stick":
                    new_component["family"] = "wood"
                    new_component["require"] = {"type": "stick"}
                elif component["itemId"] == "charcoal_bits":
                    new_component["family"] = "fuel"
                    new_component["require"] = {"type": "charcoal"}
                elif component["itemId"] == "chemical_reagent_sulfur":
                    new_component["family"] = "chemical"
                    new_component["require"] = {"type": "sulfur"}
                elif component["itemId"] == "chemical_reagent_saltpeter":
                    new_component["family"] = "chemical"
                    new_component["require"] = {"type": "saltpeter"}
                elif component["itemId"] == "plant_fibers_strong":
                    new_component["family"] = "organic"
                    new_component["require"] = {"type": "plant_fiber"}
                elif component["itemId"] == "thread_simple_plant_fiber":
                    new_component["family"] = "thread"
                    new_component["require"] = {"material": "plant_fiber"}
                elif component["itemId"] == "animal_hide_raw_small":
                    new_component["family"] = "leather"
                    new_component["require"] = {"type": "raw", "size": "small"}
                elif component["itemId"] == "tannin_simple_bark":
                    new_component["family"] = "tannin"
                    new_component["require"] = {"source": "bark"}
                elif component["itemId"] == "plastic_junk_item":
                    new_component["family"] = "salvage"
                    new_component["require"] = {"type": "plastic_junk"}
                elif component["itemId"] == "metal_bits_small":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "bits"}
                elif component["itemId"] == "old_tire":
                    new_component["family"] = "salvage"
                    new_component["require"] = {"type": "tire"}
                elif component["itemId"] == "fabric_sheet_canvas_sturdy":
                    new_component["family"] = "fabric"
                    new_component["require"] = {"material": "canvas", "grade": "sturdy"}
                elif component["itemId"] == "beeswax_chunk":
                    new_component["family"] = "wax"
                    new_component["require"] = {"type": "beeswax"}
                elif component["itemId"] == "cloth_scrap":
                    new_component["family"] = "fabric"
                    new_component["require"] = {"type": "scrap"}
                elif component["itemId"] == "lye_powder":
                    new_component["family"] = "chemical"
                    new_component["require"] = {"type": "lye"}
                elif component["itemId"] == "water_clean_item":
                    new_component["family"] = "liquid"
                    new_component["require"] = {"type": "water", "quality": "clean"}
                elif component["itemId"] == "metal_wire_stiff":
                    new_component["family"] = "wire"
                    new_component["require"] = {"material": "metal", "stiffness": "stiff"}
                elif component["itemId"] == "plant_leaves_green_pigment":
                    new_component["family"] = "pigment"
                    new_component["require"] = {"color": "green"}
                elif component["itemId"] == "tree_bark_brown_pigment":
                    new_component["family"] = "pigment"
                    new_component["require"] = {"color": "brown"}
                elif component["itemId"] == "cordage_basic_plant_fiber":
                    new_component["family"] = "cordage"
                    new_component["require"] = {"material": "plant_fiber"}
                elif component["itemId"] == "rock_large_suitable":
                    new_component["family"] = "stone"
                    new_component["require"] = {"type": "rock", "size": "large"}
                elif component["itemId"] == "metal_ingot":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "ingot", "material": "generic"}
                elif component["itemId"] == "metal_rod_thin":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "rod", "size": "thin"}
                elif component["itemId"] == "plastic_scrap_processed":
                    new_component["family"] = "plastic"
                    new_component["require"] = {"type": "scrap", "processed": True}
                elif component["itemId"] == "steel_ingot":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "ingot", "material": "steel"}
                elif component["itemId"] == "gears_assorted":
                    new_component["family"] = "component"
                    new_component["require"] = {"type": "gears"}
                elif component["itemId"] == "bolts_and_nuts_set":
                    new_component["family"] = "fastener"
                    new_component["require"] = {"type": "bolts_and_nuts"}
                elif component["itemId"] == "engine_block_small_cast":
                    new_component["family"] = "engine_component"
                    new_component["require"] = {"type": "block"}
                elif component["itemId"] == "piston_set_small_engine":
                    new_component["family"] = "engine_component"
                    new_component["require"] = {"type": "piston_set"}
                elif component["itemId"] == "crankshaft_small_engine":
                    new_component["family"] = "engine_component"
                    new_component["require"] = {"type": "crankshaft"}
                elif component["itemId"] == "mechanical_parts_vehicle_grade":
                    new_component["family"] = "component"
                    new_component["require"] = {"type": "mechanical_parts", "grade": "vehicle"}
                elif component["itemId"] == "metal_sheet_thin":
                    new_component["family"] = "metal_sheet"
                    new_component["require"] = {"thickness": "thin"}
                elif component["itemId"] == "steel_ingot_small_tool_grade":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "ingot", "grade": "tool"}
                elif component["itemId"] == "wood_planks":
                    new_component["family"] = "wood"
                    new_component["require"] = {"type": "plank"}
                elif component["itemId"] == "copper_wire_spool":
                    new_component["family"] = "wire"
                    new_component["require"] = {"material": "copper"}
                else:
                    # Keep the old format if no mapping is found
                    new_component["itemId"] = component["itemId"]
                new_components.append(new_component)
            item["recipe"]["components"] = new_components
    return data

if __name__ == "__main__":
    with open("assets/definitions/crafting_materials.json", "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    converted_data = convert_crafting_materials(data)

    with open("assets/definitions/crafting_materials.json", "w") as f:
        json.dump(converted_data, f, indent=2)
