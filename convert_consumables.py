import json

def convert_consumables(data):
    # Consolidate duplicate items first by creating a dict with IDs as keys
    item_map = {}
    for item in data:
        # Prioritize keeping the more detailed definition if duplicates are found
        if item["id"] not in item_map or len(item.keys()) > len(item_map[item["id"]].keys()):
            item_map[item["id"]] = item

    # This list will hold the final, de-duplicated and converted items
    processed_data = []

    for item_id, item in item_map.items():
        # Assign family and properties based on item ID
        if item_id in ["c4_semtex_explosive"]:
            item["family"] = "explosive"
            item["properties"] = {"type": "plastic", "grade": 3}
        elif item_id == "det_cord_explosive":
            item["family"] = "explosive"
            item["properties"] = {"type": "det_cord"}
        elif item_id == "dynamite_explosive":
            item["family"] = "explosive"
            item["properties"] = {"type": "dynamite"}
        elif item_id == "bandage":
            item["family"] = "medical"
            item["properties"] = {"type": "bandage", "grade": 2}
        elif item_id == "bandage_simple":
            item["family"] = "medical"
            item["properties"] = {"type": "bandage", "grade": 1}
        elif item_id == "first_aid_kit":
            item["family"] = "medical"
            item["properties"] = {"type": "kit", "grade": 1}
        elif item_id in ["canned_beans", "canned_beans_food"]:
            item["family"] = "food"
            item["properties"] = {"type": "canned", "content": "beans"}
        elif item_id == "energy_bar":
            item["family"] = "food"
            item["properties"] = {"type": "bar", "effect": "energy"}
        elif item_id == "mre":
            item["family"] = "food"
            item["properties"] = {"type": "mre"}
        elif item_id in ["bottled_water", "bottled_water_drink"]:
            item["family"] = "drink"
            item["properties"] = {"type": "water", "container": "bottle"}
        elif item_id == "canteen_water":
            item["family"] = "drink"
            item["properties"] = {"type": "water", "container": "canteen"}
        elif item_id == "water_purification_tablets":
            item["family"] = "medical"
            item["properties"] = {"type": "purification_tablets"}
        elif item_id == "antibiotics_course":
            item["family"] = "medical"
            item["properties"] = {"type": "pharmaceutical", "effect": "antibiotic"}
        elif item_id == "painkillers_strong":
            item["family"] = "medical"
            item["properties"] = {"type": "pharmaceutical", "effect": "painkiller", "strength": "strong"}
        elif item_id == "stimulant_combat":
            item["family"] = "medical"
            item["properties"] = {"type": "stimulant", "grade": "combat"}
        elif item_id == "antidote_universal_basic":
            item["family"] = "medical"
            item["properties"] = {"type": "antidote", "grade": "basic"}
        elif item_id == "herbal_salve_healing":
            item["family"] = "medical"
            item["properties"] = {"type": "salve", "source": "herbal", "effect": "healing"}
        elif item_id == "chemical_reagent_generic":
            item["family"] = "chemical"
            item["properties"] = {"type": "reagent", "grade": "generic"}
        elif item_id == "nutrient_paste_tube":
            item["family"] = "food"
            item["properties"] = {"type": "paste", "container": "tube"}
        elif item_id == "ink_pot_black":
            item["family"] = "ink"
            item["properties"] = {"color": "black"}
        elif item_id == "parchment_roll_blank":
            item["family"] = "writing_surface"
            item["properties"] = {"type": "parchment"}
        elif item_id == "incense_sticks_sandalwood":
            item["family"] = "ritual"
            item["properties"] = {"type": "incense", "scent": "sandalwood"}
        elif item_id == "sacred_herbs_bundle":
            item["family"] = "ritual"
            item["properties"] = {"type": "herbs", "grade": "sacred"}

        # Convert recipe components
        if "recipe" in item:
            new_components = []
            for component in item["recipe"]["components"]:
                new_comp = {"quantity": component["quantity"]}
                comp_id = component["itemId"]

                if comp_id == "explosive_compound_generic_b":
                    new_comp["family"] = "explosive"
                    new_comp["require"] = {"type": "generic_b"}
                elif comp_id == "plastic_scrap_processed":
                    new_comp["family"] = "plastic"
                    new_comp["require"] = {"type": "scrap", "processed": True}
                elif comp_id == "wire_insulated_thin":
                    new_comp["family"] = "wire"
                    new_comp["require"] = {"insulated": True, "size": "thin"}
                elif comp_id == "gunpowder_basic":
                    new_comp["family"] = "explosive"
                    new_comp["require"] = {"type": "gunpowder", "grade": 1}
                elif comp_id == "chemical_reagent_saltpeter":
                    new_comp["family"] = "chemical"
                    new_comp["require"] = {"type": "saltpeter"}
                elif comp_id == "cloth_sheet_rough_fiber":
                    new_comp["family"] = "fabric"
                    new_comp["require"] = {"material": "plant_fiber", "grade": 1}
                elif comp_id == "thread_simple_plant_fiber":
                    new_comp["family"] = "thread"
                    new_comp["require"] = {"material": "plant_fiber"}
                elif comp_id == "cloth_scrap":
                    new_comp["family"] = "fabric"
                    new_comp["require"] = {"type": "scrap"}
                elif comp_id == "antiseptic_herbal_pulp":
                    new_comp["family"] = "medicinal"
                    new_comp["require"] = {"type": "antiseptic_pulp"}
                elif comp_id == "bandage": # This is a specific item ID
                    new_comp["family"] = "medical"
                    new_comp["require"] = {"type": "bandage", "grade": 2}
                elif comp_id == "splint_wood_simple":
                    new_comp["family"] = "medical"
                    new_comp["require"] = {"type": "splint"}
                elif comp_id == "iodine_crystals":
                    new_comp["family"] = "chemical"
                    new_comp["require"] = {"type": "iodine"}
                elif comp_id == "charcoal_bits":
                    new_comp["family"] = "fuel"
                    new_comp["require"] = {"type": "charcoal"}
                elif comp_id == "medicinal_herb_comfrey":
                    new_comp["family"] = "medicinal"
                    new_comp["require"] = {"name": "comfrey"}
                elif comp_id == "animal_fat_rendered":
                    new_comp["family"] = "organic"
                    new_comp["require"] = {"type": "fat"}
                elif comp_id == "water_clean_item":
                    new_comp["family"] = "liquid"
                    new_comp["require"] = {"type": "water", "quality": "clean"}
                elif comp_id == "adhesive_paste_basic":
                    new_comp["family"] = "adhesive"
                    new_comp["require"] = {"type": "paste", "grade": 1}
                elif comp_id == "animal_hide_fine":
                    new_comp["family"] = "leather"
                    new_comp["require"] = {"type": "raw", "size": "fine"}
                elif comp_id == "lime_solution_basic":
                    new_comp["family"] = "chemical"
                    new_comp["require"] = {"type": "lime_solution"}
                else: # Fallback for unmapped
                    new_comp["itemId"] = comp_id

                new_components.append(new_comp)
            item["recipe"]["components"] = new_components

        processed_data.append(item)

    return processed_data

if __name__ == "__main__":
    with open("assets/definitions/consumables.json", "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    converted_data = convert_consumables(data)

    with open("assets/definitions/consumables.json", "w") as f:
        json.dump(converted_data, f, indent=2)
