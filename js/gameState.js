const ClothingLayers = {
    HEAD_BOTTOM: "head_bottom",
    HEAD_TOP: "head_top",
    TORSO_BOTTOM: "torso_bottom",
    TORSO_TOP: "torso_top",
    LEFT_ARM_BOTTOM: "left_arm_bottom",
    LEFT_ARM_TOP: "left_arm_top",
    RIGHT_ARM_BOTTOM: "right_arm_bottom",
    RIGHT_ARM_TOP: "right_arm_top",
    LEGS_BOTTOM: "legs_bottom",
    LEGS_TOP: "legs_top",
    FEET_BOTTOM: "feet_bottom",
    FEET_TOP: "feet_top",
    BACKPACK: "backpack",
    WAIST: "waist"
};

const InventorySizes = {
    XS: 3, S: 6, M: 12, L: 18, XL: 24, XXL: 36
};

const gameState = {
    // Instead of a single 'map', we now have separate layers.
    // These will be populated from currentMapData.layers when a map is loaded.
    layers: {
        landscape: [],
        building: [],
        item: [],
        roof: []
    },
    fowData: [], // Added for Fog of War
    lightSources: [], // Added for lighting system
    // Player positioning and game status
    playerPos: { x: 2, y: 2 }, // Will be updated when a map is loaded
    gameStarted: false,

    // Time, Hunger, and Thirst
    currentTime: { hours: 0, minutes: 0 },
    playerHunger: 24,
    playerThirst: 24,

    // Turn-based properties
    currentTurn: 1,
    movementPointsRemaining: 6,
    actionPointsRemaining: 1,
    hasDashed: false,

    // Stats and Skills
    stats: [
        { name: "Strength", points: 3, bgColor: "green", textColor: "black" },
        { name: "Intelligence", points: 3, bgColor: "yellow", textColor: "black" },
        { name: "Dexterity", points: 3, bgColor: "orange", textColor: "black" },
        { name: "Constitution", points: 3, bgColor: "red", textColor: "black" },
        { name: "Perception", points: 3, bgColor: "cyan", textColor: "black" },
        { name: "Willpower", points: 3, bgColor: "blue", textColor: "white" },
        { name: "Charisma", points: 3, bgColor: "darkred", textColor: "white" },
        { name: "Marksmanship", points: 3, bgColor: "magenta", textColor: "black" }
    ],
    skills: [
        { name: "Animal Handling", points: 0, bgColor: "darkred", textColor: "white" },
        { name: "Electronics", points: 0, bgColor: "yellow", textColor: "black" },
        { name: "Explosives", points: 0, bgColor: "magenta", textColor: "black" },
        { name: "Guns", points: 0, bgColor: "magenta", textColor: "black" },
        { name: "Intimidation", points: 0, bgColor: "darkred", textColor: "white" },
        { name: "Investigation", points: 0, bgColor: "cyan", textColor: "black" },
        { name: "Lockpick", points: 0, bgColor: "orange", textColor: "black" },
        { name: "Medicine", points: 0, bgColor: "yellow", textColor: "black" },
        { name: "Melee Weapons", points: 0, bgColor: "green", textColor: "black" },
        { name: "Persuasion", points: 0, bgColor: "darkred", textColor: "white" },
        { name: "Repair", points: 0, bgColor: "yellow", textColor: "black" },
        { name: "Sleight of Hand", points: 0, bgColor: "orange", textColor: "black" },
        { name: "Stealth", points: 0, bgColor: "orange", textColor: "black" },
        { name: "Survival", points: 0, bgColor: "red", textColor: "black" },
        { name: "Unarmed", points: 0, bgColor: "green", textColor: "black" }
    ],

    // Interactable items and selections
    interactableItems: [],
    selectedItemIndex: -1,
    selectedActionIndex: -1,
    isActionMenuActive: false,

    // Default: hide roof
    showRoof: false,

    // Stat/skill limits
    MAX_SKILL_POINTS: 30,
    MAX_STAT_VALUE: 10,
    MIN_STAT_VALUE: 1,

    //Inventory
    inventory: { // Modified as per subtask instructions
        container: null, // Will be initialized in script.js
        handSlots: [null, null],
        open: false,
        cursor: 0,
        currentlyDisplayedItems: [] // For the inventory menu
    },

    // Tile cache for rendering optimization
    tileCache: null,
    brElementsCache: null,
    renderScheduled: false,

    // NPCs
    npcs: [],

    // Combat Submenu and Pending Action
    activeSubMenu: null, // e.g., 'selectBodyPart'
    pendingCombatAction: {}, // Stores details of the action being built

    // Combat State
    isInCombat: false,
    combatCurrentAttacker: null,
    combatCurrentDefender: null,
    combatPhase: null, // e.g., 'attackerDeclare', 'defenderDeclare', 'resolveRolls', 'applyDamage'
    playerDefenseChoice: null, // e.g., 'dodge', 'block_unarmed', 'block_armed'
    npcDefenseChoice: null,

    // Targeting System State
    isTargetingMode: false,
    targetingCoords: { x: 0, y: 0 }, // Initialized to a default, will be updated when entering targeting mode
    targetingType: null, // Can be 'ranged' or 'melee'
    targetConfirmed: false,
    selectedTargetEntity: null,

    // UI State
    showKeybinds: false,
    retargetingJustHappened: false,
    isWaitingForPlayerCombatInput: false,
    floorItems: [],
    worldContainers: [],
};

// Initialize player object and wornClothing if they don't exist
if (!gameState.player) {
    gameState.player = {};
}

gameState.player.teamId = 1;
gameState.player.aggroList = [];
gameState.player.isGodMode = false;
gameState.player.noClipEnabled = false;
gameState.player.wornClothing = {
    [ClothingLayers.HEAD_BOTTOM]: null,
    [ClothingLayers.HEAD_TOP]: null,
    [ClothingLayers.TORSO_BOTTOM]: null,
    [ClothingLayers.TORSO_TOP]: null,
    [ClothingLayers.LEFT_ARM_BOTTOM]: null,
    [ClothingLayers.LEFT_ARM_TOP]: null,
    [ClothingLayers.RIGHT_ARM_BOTTOM]: null,
    [ClothingLayers.RIGHT_ARM_TOP]: null,
    [ClothingLayers.LEGS_BOTTOM]: null,
    [ClothingLayers.LEGS_TOP]: null,
    [ClothingLayers.FEET_BOTTOM]: null,
    [ClothingLayers.FEET_TOP]: null,
    [ClothingLayers.BACKPACK]: null,
    [ClothingLayers.WAIST]: null
};

window.gameState = gameState; // <-- ADD THIS LINE

// 4) Attach to gameState - This was originally in script.js, moving it here as it directly modifies gameState
// and uses InventoryContainer which might be defined elsewhere or needs to be defined here too.
// For now, assuming InventoryContainer constructor will be available globally or defined in another file.
// If InventoryContainer is defined in utils.js or another new file, this part might need adjustment
// or InventoryContainer needs to be explicitly imported if using modules.
// Based on the task, InventoryContainer is part of the Inventory System Functions, which are NOT being moved in this step.
// THEREFORE, this specific block that initializes gameState.inventory SHOULD REMAIN in script.js for now,
// as it depends on InventoryContainer which is not yet moved.
// I will OMIT the following block from gameState.js for now:
/*
// This structure was previously here, it's now part of the main gameState object above.
gameState.inventory = {
    container: new InventoryContainer("Backpack", "M"), // InventoryContainer is not defined here
    handSlots: [null, null],
    open: false,
    cursor: 0
};
*/
// The subtask asks to move `gameState` object literal. The `gameState.inventory` initialization
// happens *after* the main object literal and depends on `InventoryContainer`.
// The `InventorySizes` constant *is* moved, which is used by `InventoryContainer`.

// Health initialization also directly modifies gameState.health.
// This also seems like it should remain in script.js or be part of a dedicated health module later.
// For now, I will OMIT the health initialization part as well.
/*
function initializeHealth() { // This function definition should not be here.
    gameState.health = {
        head: { max: 5, current: 5, armor: 0, crisisTimer: 0 },
        torso: { max: 8, current: 8, armor: 0, crisisTimer: 0 },
        leftArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        rightArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        leftLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        rightLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 }
    };
    // renderHealthTable(); // renderHealthTable is not defined here
}
// initializeHealth(); // Calling it here is also not right for this file's purpose.
*/

// Exporting for potential ES6 module usage later, though current structure is global.
// export { gameState, ClothingLayers, InventorySizes };
