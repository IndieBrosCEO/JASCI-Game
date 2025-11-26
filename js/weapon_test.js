// js/weapon_test.js

function testAllWeapons() {
    console.log("--- Starting Weapon Integration Test ---");

    const weapons = Object.values(window.assetManager.itemsById).filter(item => item.tags && item.tags.includes('weapon'));

    if (weapons.length === 0) {
        console.error("No weapons found to test.");
        return;
    }

    let successCount = 0;
    let failureCount = 0;

    weapons.forEach(weaponDef => {
        const weaponName = weaponDef.name;
        let testPassed = true;

        console.log(`Testing: ${weaponName}`);

        try {
            // 1. Add to inventory
            const itemInstance = new Item(weaponDef);
            if (!window.inventoryManager.addItem(itemInstance)) {
                console.error(`Failed to add ${weaponName} to inventory.`);
                testPassed = false;
            }

            // 2. Equip to hand slot 0
            if (testPassed) {
                window.inventoryManager.equipItem(weaponName, 0);
                if (!window.gameState.inventory.handSlots[0] || window.gameState.inventory.handSlots[0].name !== weaponName) {
                    console.error(`Failed to equip ${weaponName} to hand slot 0.`);
                    testPassed = false;
                }
            }

            // 3. Unequip from hand slot 0
            if (testPassed) {
                window.inventoryManager.unequipItem(0);
                if (window.gameState.inventory.handSlots[0]) {
                    console.error(`Failed to unequip ${weaponName} from hand slot 0.`);
                    testPassed = false;
                }
            }

            // 4. Equip to hand slot 1
            if (testPassed) {
                window.inventoryManager.equipItem(weaponName, 1);
                if (!window.gameState.inventory.handSlots[1] || window.gameState.inventory.handSlots[1].name !== weaponName) {
                    console.error(`Failed to equip ${weaponName} to hand slot 1.`);
                    testPassed = false;
                }
            }

            // 5. Unequip from hand slot 1
            if (testPassed) {
                window.inventoryManager.unequipItem(1);
                if (window.gameState.inventory.handSlots[1]) {
                    console.error(`Failed to unequip ${weaponName} from hand slot 1.`);
                    testPassed = false;
                }
            }
        } catch (error) {
            console.error(`An unexpected error occurred while testing ${weaponName}:`, error);
            testPassed = false;
        } finally {
            // 6. Cleanup
            window.inventoryManager.removeItem(weaponName);

            if (testPassed) {
                console.log(`${weaponName} passed.`);
                successCount++;
            } else {
                failureCount++;
            }
        }
    });

    console.log(`--- Weapon Integration Test Complete ---`);
    console.log(`Success: ${successCount}, Failure: ${failureCount}`);
}
