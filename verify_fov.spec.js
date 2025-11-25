
const { test, expect } = require('@playwright/test');

test('verify FOV correctness', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text())); // Capture logs

    await page.goto('http://localhost:8000/index.html');
    await page.waitForFunction(() => window.gameState && window.gameState.player && window.assetManager);

    await page.evaluate(async () => {
        console.log("Shadowcaster exists?", !!window.Shadowcaster);

        const W = 20, H = 20;
        const mapData = {
            id: 'test_fov',
            name: 'Test FOV',
            dimensions: { width: W, height: H },
            startPos: { x: 5, y: 5, z: 0 },
            levels: {
                '0': {
                    middle: Array(H).fill(null).map(() => Array(W).fill(null)),
                    bottom: Array(H).fill(null).map(() => Array(W).fill({ tileId: 'floor_wood' }))
                }
            }
        };

        window.assetManager.tilesets['wall_brick'] = { tags: ['impassable', 'blocks_vision'], sprite: '#', color: '#FFF' };
        window.assetManager.tilesets['floor_wood'] = { tags: ['floor'], sprite: '.', color: '#333' };

        mapData.levels['0'].middle[5][6] = { tileId: 'wall_brick' };

        window.mapRenderer.initializeCurrentMap(mapData);
        window.gameState.playerPos = { x: 5, y: 5, z: 0 };
        window.gameState.currentViewZ = 0;

        // Debug isBlocking for the wall
        const isWallBlocking = window.mapRenderer.isTileBlockingVision(6, 5, 0, 0);
        console.log("Is (6,5) blocking vision?", isWallBlocking);

        window.mapRenderer.updateFOW(5, 5, 0, 10);
    });

    const visibility = await page.evaluate(() => {
        const fow = window.gameState.fowData['0'];
        return {
            player: fow[5][5],
            wall: fow[5][6],
            behindWall: fow[5][7],
            openArea: fow[6][5],
            diagonal: fow[6][6]
        };
    });

    console.log('Visibility:', visibility);

    expect(visibility.player).toBe('visible');
    expect(visibility.wall).toBe('visible');
    expect(visibility.behindWall).toBe('hidden');
    expect(visibility.openArea).toBe('visible');
    expect(visibility.diagonal).toBe('visible');
});
