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
    // mapLevels will store the tile data for all Z-levels of the current map.
    // It's a dictionary where keys are Z-indices (e.g., "0", "1", "-1")
    // and values are objects containing layer types (landscape, building, etc.).
    // This replaces the old 'layers' object.
    mapLevels: {}, // Example: { "0": { landscape: [[]], building: [[]] }, "1": { ... } }

    // fowData is now a dictionary keyed by Z-level.
    // e.g., fowData["0"] = Array(H).fill(null).map(() => Array(W).fill('hidden'))
    fowData: {}, // Fog of War data, per Z-level

    // lightSources will now contain objects with x, y, z coordinates.
    lightSources: [], // Added for lighting system

    // Player positioning and game status
    playerPos: { x: 2, y: 2, z: 0 }, // Player position with Z-coordinate
    currentViewZ: 0, // The Z-level the player is currently viewing
    viewFollowsPlayerZ: true, // Flag to indicate if currentViewZ should automatically follow playerPos.z

    gameStarted: false,
    currentMapId: null, // Will be set when a map is loaded for portal tracking
    awaitingPortalConfirmation: false, // True if player is on a portal and confirm prompt is active
    portalPromptActive: false, // True if the portal confirmation prompt is physically visible

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
    targetingCoords: { x: 0, y: 0, z: 0 }, // Initialized to a default, will be updated when entering targeting mode
    targetingType: null, // Can be 'ranged' or 'melee'
    targetConfirmed: false,
    selectedTargetEntity: null,

    // Animation System State (NEW)
    activeAnimations: [],
    isAnimationPlaying: false,

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

window.gameState = gameState;