import json

def convert_constructions(data):
    for item in data:
        # Add family and properties to the main item
        if item["id"] == "wall_wood_simple":
            item["family"] = "wall"
            item["properties"] = {"material": "wood", "grade": 1}
        elif item["id"] == "door_wood_simple_built":
            item["family"] = "door"
            item["properties"] = {"material": "wood", "grade": 1}
        elif item["id"] == "trap_spike_pit_built":
            item["family"] = "trap_construction"
            item["properties"] = {"type": "spike_pit"}
        elif item["id"] == "workbench_basic_built":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "workbench", "grade": 1}
        elif item["id"] == "forge_simple_built":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "forge", "grade": 1}
        elif item["id"] == "chemistry_set_built":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "chemistry_set", "grade": 1}
        elif item["id"] == "barricade_metal_built":
            item["family"] = "barricade"
            item["properties"] = {"material": "metal", "grade": 1}
        elif item["id"] == "rain_collector_small_built":
            item["family"] = "utility"
            item["properties"] = {"type": "rain_collector", "size": "small"}
        elif item["id"] == "storage_locker_small_built":
            item["family"] = "storage"
            item["properties"] = {"type": "locker", "size": "small"}
        elif item["id"] == "reloading_bench":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "reloading_bench", "grade": 1}
        elif item["id"] == "munitions_bench":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "munitions_bench", "grade": 2}
        elif item["id"] == "armor_crafting_jig":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "armor_jig", "grade": 2}
        elif item["id"] == "machine_shop_lathe":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "lathe", "grade": "industrial"}
        elif item["id"] == "vehicle_assembly_station":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "vehicle_bay", "grade": "industrial"}
        elif item["id"] == "engine_assembly_jig":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "engine_jig", "grade": 2}
        elif item["id"] == "loom_simple":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "loom", "grade": 1}
        elif item["id"] == "tanning_rack_simple":
            item["family"] = "crafting_station"
            item["properties"] = {"type": "tanning_rack", "grade": 1}

        # Convert recipes
        if "recipe" in item:
            new_components = []
            world_prerequisites = []
            for component in item["recipe"]["components"]:
                new_component = {"quantity": component["quantity"]}

                # Check for world prerequisites first
                if component["itemId"] == "reloading_bench_tile":
                    world_prerequisites.append({"tileId": "reloading_bench_tile", "quantity": 1})
                    continue
                if component["itemId"] == "workbench_basic_tile":
                    world_prerequisites.append({"tileId": "workbench_basic_tile", "quantity": 1})
                    continue

                # Standard component conversion
                if component["itemId"] == "wood_planks":
                    new_component["family"] = "wood"
                    new_component["require"] = {"type": "plank"}
                elif component["itemId"] == "nails":
                    new_component["family"] = "fastener"
                    new_component["require"] = {"type": "nail"}
                elif component["itemId"] == "scrap_metal":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "scrap"}
                elif component["itemId"] == "stone_block_hewn":
                    new_component["family"] = "construction_material"
                    new_component["require"] = {"type": "stone_block"}
                elif component["itemId"] == "wood_log":
                    new_component["family"] = "wood"
                    new_component["require"] = {"type": "log"}
                elif component["itemId"] == "sharp_glass":
                    new_component["family"] = "blade"
                    new_component["require"] = {"type": "shard", "material": "glass"}
                elif component["itemId"] == "plastic_scrap_processed":
                    new_component["family"] = "plastic"
                    new_component["require"] = {"type": "scrap", "processed": True}
                elif component["itemId"] == "metal_sheet_sturdy":
                    new_component["family"] = "metal_sheet"
                    new_component["require"] = {"thickness": "sturdy"}
                elif component["itemId"] == "bolts_and_nuts_set":
                    new_component["family"] = "fastener"
                    new_component["require"] = {"type": "bolts_and_nuts"}
                elif component["itemId"] == "tarp_basic":
                    new_component["family"] = "shelter"
                    new_component["require"] = {"type": "tarp"}
                elif component["itemId"] == "steel_ingot":
                    new_component["family"] = "metal"
                    new_component["require"] = {"type": "ingot", "material": "steel"}
                elif component["itemId"] == "mechanical_parts_simple":
                    new_component["family"] = "component"
                    new_component["require"] = {"type": "mechanical_parts", "grade": 1}
                elif component["itemId"] == "plexiglass_sheet_thick":
                    new_component["family"] = "plastic"
                    new_component["require"] = {"type": "sheet", "material": "plexiglass", "thickness": "thick"}
                elif component["itemId"] == "mechanical_parts_vehicle_grade":
                    new_component["family"] = "component"
                    new_component["require"] = {"type": "mechanical_parts", "grade": "vehicle"}
                elif component["itemId"] == "motor_large_electric":
                    new_component["family"] = "motor"
                    new_component["require"] = {"type": "electric", "size": "large"}
                elif component["itemId"] == "copper_wire_spool":
                    new_component["family"] = "wire"
                    new_component["require"] = {"material": "copper"}
                elif component["itemId"] == "concrete_mix_bag":
                    new_component["family"] = "construction_material"
                    new_component["require"] = {"type": "concrete_mix"}
                elif component["itemId"] == "wood_stick":
                    new_component["family"] = "wood"
                    new_component["require"] = {"type": "stick"}
                elif component["itemId"] == "cordage_basic_plant_fiber":
                    new_component["family"] = "cordage"
                    new_component["require"] = {"material": "plant_fiber"}
                # Kit deployments are a special case, they are concrete items
                elif component["itemId"] == "pressure_plate_dart_trap_kit":
                    new_component["family"] = "trap_kit"
                    new_component["require"] = {"id": "pressure_plate_dart_trap_kit"}
                elif component["itemId"] == "tripwire_alarm_kit":
                    new_component["family"] = "trap_kit"
                    new_component["require"] = {"id": "tripwire_alarm_kit"}
                else:
                    # Fallback for any unmapped items to avoid breaking recipes
                    new_component["itemId"] = component["itemId"]
                new_components.append(new_component)

            item["recipe"]["components"] = new_components
            if world_prerequisites:
                item["recipe"]["world_prerequisites"] = world_prerequisites
                # Remove the original components list if it was a world prerequisite
                item["recipe"]["components"] = [c for c in item["recipe"]["components"] if "itemId" not in c or not c["itemId"].endswith("_tile")]


    return data

if __name__ == "__main__":
    with open("assets/definitions/constructions.json", "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    converted_data = convert_constructions(data)

    with open("assets/definitions/constructions.json", "w") as f:
        json.dump(converted_data, f, indent=2)
