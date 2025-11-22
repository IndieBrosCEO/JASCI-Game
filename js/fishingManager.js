class FishingManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.isFishing = false;
        this.fishingTimer = null;
        this.biteTimer = null;
        this.timeStarted = 0;
        this.timeToCatch = 0;
        this.lastFishCaught = null;
    }

    startFishing(player) {
        if (this.isFishing) {
            logToConsole("You are already fishing.", "orange");
            return;
        }

        const pole = this.getEquippedFishingPole(player);
        if (!pole) {
            logToConsole("You need to equip a fishing pole to fish.", "orange");
            return;
        }

        if (!this.isAdjacentToWater(player.playerPos)) {
            logToConsole("You need to be next to a water tile to fish.", "orange");
            return;
        }

        this.isFishing = true;
        this.timeStarted = Date.now();
        this.timeToCatch = this.getRandomTimeToCatch();
        logToConsole("You cast your line into the water...", "event");

        this.fishingTimer = setTimeout(() => {
            this.fishBite(player);
        }, this.timeToCatch);

        this.showFishingUI();
    }

    fishBite(player) {
        logToConsole("A fish is biting!", "event-success");
        // Add visual indicator here, e.g., a flashing icon or a change in the UI
        const fishingUI = document.getElementById("fishingUI");
        if (fishingUI) {
            const biteIndicator = document.createElement("div");
            biteIndicator.textContent = "!";
            biteIndicator.style.color = "red";
            biteIndicator.style.fontSize = "24px";
            biteIndicator.style.position = "absolute";
            biteIndicator.style.top = "-30px";
            biteIndicator.style.left = "50%";
            biteIndicator.style.transform = "translateX(-50%)";
            fishingUI.appendChild(biteIndicator);

            setTimeout(() => {
                biteIndicator.remove();
            }, 1000);
        }

        // Set a short timer for the player to react
        this.biteTimer = setTimeout(() => {
            this.fishGotAway(player);
        }, 2000); // 2 seconds to react
    }

    fishGotAway(player) {
        logToConsole("The fish got away...", "event-failure");
        this.stopFishing();
    }

    stopFishing() {
        if (!this.isFishing) return;

        clearTimeout(this.fishingTimer);
        clearTimeout(this.biteTimer);
        this.isFishing = false;
        this.fishingTimer = null;
        this.biteTimer = null;
        this.hideFishingUI();
        logToConsole("You stop fishing.", "event");
    }

    catchFish(player) {
        clearTimeout(this.biteTimer);
        const fish = this.getRandomFish();
        this.lastFishCaught = fish;

        if (fish) {
            logToConsole(`You caught a ${fish.name}!`, "event-success");
            window.inventoryManager.addItemToInventoryById(fish.id, 1);
            if (window.xpManager) {
                window.xpManager.awardXp(10, player);
            }
            if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
        } else {
            logToConsole("The fish got away...", "event-failure");
        }

        this.stopFishing();
    }

    reelIn() {
        if (this.isFishing && this.biteTimer) {
            this.catchFish(window.gameState);
        }
    }

    getRandomFish() {
        const fishList = Object.values(window.assetManager.getFish());
        const totalWeight = fishList.reduce((sum, fish) => sum + (1 / fish.rarity), 0);
        let random = Math.random() * totalWeight;

        for (const fish of fishList) {
            random -= (1 / fish.rarity);
            if (random <= 0) {
                return fish;
            }
        }
        return null;
    }

    getRandomTimeToCatch() {
        return Math.random() * (15000 - 5000) + 5000; // 5-15 seconds
    }

    getEquippedFishingPole(player) {
        const equippedItems = window.inventoryManager.getEquippedItems(player);
        return equippedItems.find(item => item && item.tags && item.tags.includes("fishing_pole"));
    }

    isAdjacentToWater(pos) {
        const { x, y, z } = pos;
        const adjacentTiles = [
            { x: x - 1, y: y }, { x: x + 1, y: y },
            { x: x, y: y - 1 }, { x: x, y: y + 1 }
        ];

        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData) return false;

        for (const tilePos of adjacentTiles) {
            const tileId = mapData.levels[z.toString()]?.bottom[tilePos.y]?.[tilePos.x];
            if (tileId) {
                const tileDef = window.assetManager.getTileset(tileId);
                if (tileDef && tileDef.tags && tileDef.tags.includes("water")) {
                    return true;
                }
            }
        }
        return false;
    }

    showFishingUI() {
        let fishingUI = document.getElementById("fishingUI");
        if (!fishingUI) {
            fishingUI = document.createElement("div");
            fishingUI.id = "fishingUI";
            fishingUI.style.position = "fixed";
            fishingUI.style.bottom = "100px";
            fishingUI.style.left = "50%";
            fishingUI.style.transform = "translateX(-50%)";
            fishingUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            fishingUI.style.padding = "10px";
            fishingUI.style.border = "1px solid white";
            fishingUI.innerHTML = `
                <p>Fishing...</p>
                <div id="fishingProgressBarContainer" style="width: 200px; height: 20px; background-color: #555; border: 1px solid #ccc;">
                    <div id="fishingProgressBar" style="width: 0%; height: 100%; background-color: #4CAF50;"></div>
                </div>
                <button id="stopFishingButton">Stop Fishing</button>
            `;
            document.body.appendChild(fishingUI);

            document.getElementById("stopFishingButton").addEventListener("click", () => {
                this.stopFishing();
            });
        }
        fishingUI.classList.remove("hidden");
        this.updateFishingProgressBar();
    }

    hideFishingUI() {
        const fishingUI = document.getElementById("fishingUI");
        if (fishingUI) {
            fishingUI.classList.add("hidden");
        }
    }

    updateFishingProgressBar() {
        if (!this.isFishing) return;

        const elapsedTime = Date.now() - this.timeStarted;
        const progress = (elapsedTime / this.timeToCatch) * 100;
        const progressBar = document.getElementById("fishingProgressBar");

        if (progressBar) {
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }

        if (elapsedTime < this.timeToCatch) {
            requestAnimationFrame(() => this.updateFishingProgressBar());
        }
    }
}

window.FishingManager = FishingManager;
