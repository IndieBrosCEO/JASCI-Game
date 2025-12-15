// js/ui/xpBar.js

function updateXpBar() {
    const xpBar = document.getElementById('xpBar');
    if (!xpBar) {
        return;
    }

    const currentXp = window.gameState.totalXp;
    const levelCurve = window.assetManager.getLevelCurve();

    if (!levelCurve || levelCurve.length === 0) {
        return;
    }

    const currentLevelData = levelCurve.find(levelData => levelData.level === window.gameState.level);
    const nextLevelData = levelCurve.find(levelData => levelData.level === window.gameState.level + 1);

    if (!currentLevelData || !nextLevelData) {
        xpBar.value = currentXp;
        xpBar.max = currentXp;
        xpBar.title = `${currentXp} / ${currentXp}`;
        return;
    }

    const xpForNextLevel = nextLevelData.total - currentLevelData.total;
    const xpProgress = currentXp - currentLevelData.total;

    xpBar.value = xpProgress;
    xpBar.max = xpForNextLevel;
    xpBar.title = `${xpProgress} / ${xpForNextLevel}`;
}

if (window.EventManager) {
    window.EventManager.on('xp:awarded', () => {
        updateXpBar();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
        if (window.levelUpUI && window.levelUpUI.isVisible) window.levelUpUI.updateDisplay();
    });
    window.EventManager.on('level:up', () => {
        updateXpBar();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
        if (window.levelUpUI && window.levelUpUI.isVisible) window.levelUpUI.updateDisplay();
        if (window.audioManager) window.audioManager.playUiSound('level_up_01.wav', { volume: 0.8 });
    });
}
