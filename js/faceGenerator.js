// js/faceGenerator.js

const PRESET_COLORS = {
    skin: ['#F5DEB3', '#FFDAB9', '#D2B48C', '#A0522D', '#8D5524', '#654321'], // Wheat, PeachPuff, Tan, Sienna, DarkBrown, VeryDarkBrown
    hair: ['#000000', '#2C1E12', '#593E2A', '#A87A58', '#B8860B', '#FF0000', '#C0C0C0', '#E6E6FA'], // Black, DarkBrown, Brown, LightBrown, Gold, Red, Silver, Lavender(fantasy)
    eyebrows: ['#000000', '#2C1E12', '#593E2A', '#A87A58', '#B8860B', '#FF0000', '#C0C0C0', '#E6E6FA'], // Black, DarkBrown, Brown, LightBrown, Gold, Red, Silver, Lavender(fantasy)
    eyes: ['#000000', '#0000FF', '#008000', '#A52A2A', '#606060', '#4682B4', '#FFC0CB'], // Black, Blue, Green, Brown, Grey, SteelBlue, Pink(fantasy)
    lips: ['#FFC0CB', '#E06377', '#D2691E', '#BF40BF', '#B07050', '#800000']  // Pink, Coral, Chocolate, Orchid, RosyBrown, Maroon
};

// Helper function to get a random integer within a range (inclusive)
function _getRandomValue(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get a random element from an array
function _getRandomElement(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}


const HIGHLIGHT_AMOUNT = 0.15; // General highlight for skin (e.g., 15% lighter)
const SHADOW_AMOUNT = 0.15;    // General shadow for skin (e.g., 15% darker)
const NOSE_HIGHLIGHT_AMOUNT = 0.30; // Stronger highlight for nose (e.g., 30% lighter)
const CONTACT_SHADOW_AMOUNT = 0.07; // Subtle shadow for under features (e.g., 7% darker) - made it more subtle

/**
 * Generates an ASCII representation of a face based on the provided parameters.
 * @param {object} faceParams - An object containing parameters like headWidth, eyeSize, etc.
 * @returns {string} An ASCII string representing the face.
 */
function generateAsciiFace(faceParams) {
    // console.log("Generating face with params:", JSON.parse(JSON.stringify(faceParams))); // For debugging

    // Initialize canvas with objects
    const baseWidth = Math.max(15, faceParams.headWidth + 6);
    const baseHeight = Math.max(20, faceParams.headHeight + 12);
    let canvas = Array(baseHeight).fill(null).map(() =>
        Array(baseWidth).fill(null).map(() => ({ char: ' ', type: 'empty', color: null }))
    );

    // Define characters based on parameters - these will be used by drawing functions
    // skinChar, eyeChar, hairChar will be set within specific drawing functions or passed to them
    // For example, a drawing function for skin will use faceParams.skinColor directly.
    // The character symbols themselves will also be decided more locally in drawing functions.
    // const skinChar = '#'; // No longer a single global char for skin, decided in drawing logic
    // let eyeChar = 'o'; // Will be determined in drawEyes
    // if (faceParams.eyeSize === 1) eyeChar = '.';
    // if (faceParams.eyeSize === 3) eyeChar = 'O';
    // const hairChar = faceParams.hairColor === '#000000' || faceParams.hairColor === '#000001' ? '@' : '"';


    // Center the head within the canvas
    const headActualWidth = faceParams.headWidth;
    const headActualHeight = faceParams.headHeight;

    const headStartX = Math.floor((baseWidth - headActualWidth) / 2);
    const headStartY = Math.floor((baseHeight - headActualHeight) / 2);
    const headEndX = headStartX + headActualWidth - 1;
    const headEndY = headStartY + headActualHeight - 1;

    // Calculate feature coordinates once
    const eyeY = headStartY + Math.floor(headActualHeight / 3.5);
    const eyeDist = Math.max(1, Math.floor(headActualWidth / 4));
    const leftEyeX = headStartX + eyeDist;
    const rightEyeX = headEndX - eyeDist;
    const noseStartY = eyeY + 1;
    const noseCenterX = headStartX + Math.floor(headActualWidth / 2);
    const mouthY = noseStartY + faceParams.noseHeight;
    const mouthCenterX = headStartX + Math.floor(headActualWidth / 2);
    const browY = eyeY - 1 - faceParams.browHeight;
    const chinStartY = mouthY + 1;

    const coords = {
        baseWidth, baseHeight,
        headStartX, headStartY, headEndX, headEndY, headActualWidth, headActualHeight,
        eyeY, leftEyeX, rightEyeX,
        noseStartY, noseCenterX,
        mouthY, mouthCenterX,
        browY, chinStartY
    };

    // Drawing order is important: background, then features, then hair, then overlays like glasses
    _drawHeadOutline(canvas, faceParams, coords);
    _drawEyes(canvas, faceParams, coords);
    _drawNose(canvas, faceParams, coords);
    _drawMouth(canvas, faceParams, coords);
    _drawBrows(canvas, faceParams, coords);
    _drawHairstyle(canvas, faceParams, coords); // Hair might go under or over facial hair depending on style
    _drawFacialHair(canvas, faceParams, coords);
    _drawGlasses(canvas, faceParams, coords); // Glasses go on top of most features

    // Convert canvas to HTML string with colored spans
    let htmlOutputLines = [];
    let firstLine = -1, lastLine = -1;

    // Determine which lines have content for trimming
    for (let i = 0; i < canvas.length; ++i) {
        if (canvas[i].some(cell => cell.type !== 'empty')) {
            if (firstLine === -1) firstLine = i;
            lastLine = i;
        }
    }

    if (firstLine === -1) return ""; // Empty canvas if no content found

    for (let y = firstLine; y <= lastLine; y++) {
        let lineHtml = ""; // Build each line string
        for (let x = 0; x < canvas[y].length; x++) {
            const cellData = canvas[y][x];

            if (cellData.type === 'empty' || cellData.char === ' ') {
                lineHtml += ' '; // Add a single space for empty cells
                continue;
            }

            const charToDisplay = cellData.char;
            const fgColor = cellData.color || faceParams.skinColor; // Fallback

            // The base color for the background highlight IS the character's actual foreground color
            // (which already includes any lighting/shading effects from drawing functions).
            const baseBgColor = fgColor;

            const bgColor = window.darkenColor(baseBgColor, 0.4) || '#000000'; // Darken this actual color by 40%

            lineHtml += `<span style="color:${fgColor}; background-color:${bgColor};">${charToDisplay}</span>`;
        }
        htmlOutputLines.push(lineHtml);
    }
    return htmlOutputLines.join('\n');
}


// --- Helper Drawing Functions ---

function _drawHeadOutline(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, headStartX, headStartY, headEndX, headEndY, headActualWidth, headActualHeight } = coords;
    const baseSkinColor = faceParams.skinColor;

    // Define thirds for shading regions (approximate)
    const VThird = headActualHeight / 3;
    const HThird = headActualWidth / 3;

    for (let y = headStartY; y <= headEndY; y++) {
        for (let x = headStartX; x <= headEndX; x++) {
            if (y >= 0 && y < baseHeight && x >= 0 && x < baseWidth) {
                let char = '#';
                let type = 'skin';
                let calculatedSkinColor = baseSkinColor;

                // Determine if cell is on border or fill
                const isBorder = (y === headStartY || y === headEndY || x === headStartX || x === headEndX);
                if (isBorder) {
                    type = 'skinBorder';
                    // Border characters
                    if ((y === headStartY && (x === headStartX || x === headEndX)) ||
                        (y === headEndY && (x === headStartX || x === headEndX))) char = '+';
                    else if (y === headStartY || y === headEndY) char = '-';
                    else if (x === headStartX || x === headEndX) char = '|';
                    if (headActualWidth > 2 && headActualHeight > 2) { // Rounded corners
                        if (y === headStartY && x === headStartX) char = '/';
                        else if (y === headStartY && x === headEndX) char = '\\';
                        else if (y === headEndY && x === headStartX) char = '\\';
                        else if (y === headEndY && x === headEndX) char = '/';
                    }
                }

                // Apply directional lighting (Top-Right light source)
                // Relative position within the head's bounding box
                const relY = y - headStartY;
                const relX = x - headStartX;

                let highlightFactor = 0;
                let shadowFactor = 0;

                // Top highlight
                if (relY < VThird) highlightFactor += HIGHLIGHT_AMOUNT;
                // Right highlight
                if (relX > headActualWidth - HThird - 1) highlightFactor += HIGHLIGHT_AMOUNT;

                // Bottom shadow
                if (relY > headActualHeight - VThird - 1) shadowFactor += SHADOW_AMOUNT;
                // Left shadow
                if (relX < HThird) shadowFactor += SHADOW_AMOUNT;

                // Apply combined effect, ensuring highlight and shadow don't cancel too much
                // Prioritize highlight if both apply (e.g. top-left, bottom-right)
                // Or, let them sum and clamp. For simplicity, sum and clamp.

                let effectiveAmount = highlightFactor - shadowFactor;

                if (effectiveAmount > 0) {
                    calculatedSkinColor = window.lightenColor(baseSkinColor, Math.min(effectiveAmount, HIGHLIGHT_AMOUNT * 1.5)); // Cap max highlight
                } else if (effectiveAmount < 0) {
                    calculatedSkinColor = window.darkenColor(baseSkinColor, Math.min(Math.abs(effectiveAmount), SHADOW_AMOUNT * 1.5)); // Cap max shadow
                }

                // Ensure border characters themselves are not overly lightened/darkened if we want a defined edge
                // For now, the border characters will also get this shading. Can be refined.
                // If it's a border and we want it to be base skin color:
                // if (isBorder) calculatedSkinColor = baseSkinColor;


                canvas[y][x] = { char, type, color: calculatedSkinColor };
            }
        }
    }
}

function _drawEyes(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, headStartX, headEndX, eyeY, leftEyeX, rightEyeX } = coords;
    const eyeColor = faceParams.eyeColor;
    let eyeCharSymbol = 'o';
    if (faceParams.eyeSize === 1) eyeCharSymbol = '.';
    if (faceParams.eyeSize === 3) eyeCharSymbol = 'O';

    if (eyeY >= 0 && eyeY < baseHeight) {
        if (leftEyeX > headStartX && leftEyeX < headEndX && leftEyeX < baseWidth && canvas[eyeY]) { // Ensure eyes are within inner head bounds
            canvas[eyeY][leftEyeX] = { char: eyeCharSymbol, type: 'eye', color: eyeColor };
        }
        if (rightEyeX > headStartX && rightEyeX < headEndX && rightEyeX < baseWidth && canvas[eyeY] && leftEyeX !== rightEyeX) {
            canvas[eyeY][rightEyeX] = { char: eyeCharSymbol, type: 'eye', color: eyeColor };
        }
    }
}

function _drawBrows(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, headStartX, headEndX, headEndY, browY, leftEyeX, rightEyeX } = coords;
    const browColor = faceParams.eyebrowColor;
    const browWidth = faceParams.browWidth;
    const baseSkinColor = faceParams.skinColor; // For contact shadow

    if (browY > 0 && browY < headEndY && browY < baseHeight && canvas[browY]) {
        let baseChar = '-';
        if (faceParams.browAngle === -1) baseChar = '\\';
        if (faceParams.browAngle === 1) baseChar = '/';

        // Draw left brow and its shadow
        for (let i = 0; i < browWidth; i++) {
            const currentX = leftEyeX - Math.floor(browWidth / 2) + i;
            if (currentX > headStartX && currentX < baseWidth && currentX < leftEyeX + Math.ceil(browWidth / 2)) {
                let charToUse = baseChar;
                if (faceParams.browAngle === 0) charToUse = '-';
                else if (faceParams.browAngle === -1) charToUse = (i === 0 && browWidth > 0) ? '\\' : '-'; // Simplified angle
                else if (faceParams.browAngle === 1) charToUse = (i === 0 && browWidth > 0) ? '/' : '-';

                canvas[browY][currentX] = { char: charToUse, type: 'brow', color: browColor };

                // Add contact shadow below this brow character
                const shadowY = browY + 1;
                if (shadowY < headEndY && shadowY < baseHeight && canvas[shadowY] && canvas[shadowY][currentX] &&
                    (canvas[shadowY][currentX].type === 'skin' || canvas[shadowY][currentX].type === 'skinBorder')) {
                    canvas[shadowY][currentX].color = window.darkenColor(baseSkinColor, CONTACT_SHADOW_AMOUNT);
                    canvas[shadowY][currentX].type = 'skinShadowed'; // Mark as shadowed
                }
            }
        }

        // Draw right brow and its shadow
        if (leftEyeX !== rightEyeX) {
            for (let i = 0; i < browWidth; i++) {
                const currentX = rightEyeX - Math.floor(browWidth / 2) + i;
                if (currentX > headStartX && currentX < headEndX && currentX < baseWidth && currentX < rightEyeX + Math.ceil(browWidth / 2)) {
                    let charToUse = baseChar;
                    if (faceParams.browAngle === 0) charToUse = '-';
                    else if (faceParams.browAngle === -1) charToUse = (i === browWidth - 1 && browWidth > 0) ? '/' : '-'; // Simplified angle
                    else if (faceParams.browAngle === 1) charToUse = (i === browWidth - 1 && browWidth > 0) ? '\\' : '-';

                    canvas[browY][currentX] = { char: charToUse, type: 'brow', color: browColor };

                    // Add contact shadow below this brow character
                    const shadowY = browY + 1;
                    if (shadowY < headEndY && shadowY < baseHeight && canvas[shadowY] && canvas[shadowY][currentX] &&
                        (canvas[shadowY][currentX].type === 'skin' || canvas[shadowY][currentX].type === 'skinBorder')) {
                        canvas[shadowY][currentX].color = window.darkenColor(baseSkinColor, CONTACT_SHADOW_AMOUNT);
                        canvas[shadowY][currentX].type = 'skinShadowed'; // Mark as shadowed
                    }
                }
            }
        }
    }
}

function _drawNose(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, headStartX, headEndX, headEndY, noseStartY, noseCenterX } = coords;
    const baseSkinColor = faceParams.skinColor;

    for (let i = 0; i < faceParams.noseHeight; i++) { // i is row within nose, 0 is top
        const currentNoseY = noseStartY + i;
        if (currentNoseY >= headEndY || currentNoseY >= baseHeight || !canvas[currentNoseY]) continue;

        for (let j = 0; j < faceParams.noseWidth; j++) { // j is col within nose, 0 is left
            const currentNoseX = noseCenterX - Math.floor(faceParams.noseWidth / 2) + j;
            if (currentNoseX > headStartX && currentNoseX < headEndX && currentNoseX < baseWidth && currentNoseX >= 0) {

                let noseChar = 'J'; // Default body
                let noseType = 'nose';
                let calculatedNoseColor = baseSkinColor;

                // Determine character and base type
                if (faceParams.noseWidth === 1 && faceParams.noseHeight === 1) {
                    noseChar = ','; noseType = 'nostril';
                } else if (i === 0 && faceParams.noseHeight > 1) { // Top bridge
                    noseChar = '.'; noseType = 'noseBridge';
                } else if (j === 0 && faceParams.noseWidth > 1) { // Left side
                    noseChar = '('; noseType = 'nostril';
                } else if (j === faceParams.noseWidth - 1 && faceParams.noseWidth > 1) { // Right side
                    noseChar = ')'; noseType = 'nostril';
                }

                // Apply lighting based on position within the nose structure
                if (noseType === 'nostril') {
                    calculatedNoseColor = window.darkenColor(baseSkinColor, CONTACT_SHADOW_AMOUNT); // Nostrils slightly darker
                    if (j === faceParams.noseWidth - 1 && faceParams.noseWidth > 1) { // Right nostril (catches some light)
                        calculatedNoseColor = window.lightenColor(baseSkinColor, HIGHLIGHT_AMOUNT * 0.5);
                    }
                } else if (noseType === 'noseBridge') { // Top of the nose
                    calculatedNoseColor = window.lightenColor(baseSkinColor, NOSE_HIGHLIGHT_AMOUNT);
                } else { // Main body of the nose ('J')
                    // Right side of nose body gets more highlight
                    if (j >= Math.floor(faceParams.noseWidth / 2)) {
                        calculatedNoseColor = window.lightenColor(baseSkinColor, NOSE_HIGHLIGHT_AMOUNT * 0.75);
                    } else { // Left side of nose body
                        calculatedNoseColor = window.lightenColor(baseSkinColor, HIGHLIGHT_AMOUNT * 0.5); // Less highlight
                    }
                    // Underside of nose body gets shadow
                    if (i === faceParams.noseHeight - 1 && faceParams.noseHeight > 1) {
                        calculatedNoseColor = window.darkenColor(baseSkinColor, SHADOW_AMOUNT * 0.5);
                    }
                }
                // Special case for single central nose character if width is 1 but height > 1
                if (faceParams.noseWidth === 1 && faceParams.noseHeight > 1 && noseType === 'nose') {
                    if (i < Math.floor(faceParams.noseHeight / 2)) { // Upper part
                        calculatedNoseColor = window.lightenColor(baseSkinColor, NOSE_HIGHLIGHT_AMOUNT);
                    } else { // Lower part
                        calculatedNoseColor = window.lightenColor(baseSkinColor, HIGHLIGHT_AMOUNT * 0.5);
                    }
                }


                canvas[currentNoseY][currentNoseX] = { char: noseChar, type: noseType, color: calculatedNoseColor };
            }
        }
    }
}

function _drawMouth(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, headStartX, headEndX, headEndY, mouthY, mouthCenterX } = coords;
    const lipColor = faceParams.lipColor;

    let mouthCharSymbol = '-';
    if (faceParams.mouthFullness === 2) mouthCharSymbol = '=';
    if (faceParams.mouthFullness === 3) mouthCharSymbol = 'w';

    if (mouthY < headEndY && mouthY < baseHeight && canvas[mouthY]) {
        for (let i = 0; i < faceParams.mouthWidth; i++) {
            const currentMouthX = mouthCenterX - Math.floor(faceParams.mouthWidth / 2) + i;
            if (currentMouthX > headStartX && currentMouthX < headEndX && currentMouthX >= 0 && currentMouthX < baseWidth) { // Ensure X is within canvas bounds
                canvas[mouthY][currentMouthX] = { char: mouthCharSymbol, type: 'lip', color: lipColor };
            }
        }
        if (faceParams.mouthWidth > 2) {
            const leftLipX = mouthCenterX - Math.floor(faceParams.mouthWidth / 2);
            const rightLipX = mouthCenterX + Math.floor((faceParams.mouthWidth - 1) / 2);
            if (leftLipX - 1 > headStartX && leftLipX - 1 >= 0 && canvas[mouthY]) {
                canvas[mouthY][leftLipX - 1] = { char: '.', type: 'lipCorner', color: lipColor };
            }
            if (rightLipX + 1 < headEndX && rightLipX + 1 < baseWidth && canvas[mouthY]) {
                canvas[mouthY][rightLipX + 1] = { char: '.', type: 'lipCorner', color: lipColor };
            }
        }
    }
}

function _drawHairstyle(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, headStartX, headStartY, headEndX, headEndY, headActualWidth, headActualHeight } = coords; // Added headActualHeight
    const hairColor = faceParams.hairColor;
    const hairCharSymbol = faceParams.hairColor === '#000000' || faceParams.hairColor === '#000001' ? '@' : '"';

    switch (faceParams.hairstyle) {
        case "bald": {
            break;
        }
        case "short": {
            for (let x = headStartX; x <= headEndX; x++) {
                if (headStartY - 1 >= 0 && x >= 0 && x < baseWidth && canvas[headStartY - 1]) {
                    canvas[headStartY - 1][x] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                }
            }
            for (let y = headStartY; y <= headEndY; y++) {
                if (y >= 0 && y < baseHeight) {
                    if (headStartX - 1 >= 0 && canvas[y]) {
                        canvas[y][headStartX - 1] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                    }
                    if (headEndX + 1 < baseWidth && canvas[y]) {
                        canvas[y][headEndX + 1] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                    }
                }
            }
            if (headStartY - 1 >= 0) {
                if (headStartX - 1 >= 0 && canvas[headStartY - 1]) {
                    canvas[headStartY - 1][headStartX - 1] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                }
                if (headEndX + 1 < baseWidth && canvas[headStartY - 1]) {
                    canvas[headStartY - 1][headEndX + 1] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                }
            }
            break;
        }
        case "medium": {
            for (let i = 1; i <= 2; i++) {
                for (let x = headStartX - (i - 1); x <= headEndX + (i - 1); x++) {
                    if (headStartY - i >= 0 && x >= 0 && x < baseWidth && canvas[headStartY - i]) {
                        canvas[headStartY - i][x] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                    }
                }
            }
            for (let y = headStartY - 1; y <= headEndY; y++) {
                if (y >= 0 && y < baseHeight) {
                    for (let i = 1; i <= 2; i++) {
                        if (headStartX - i >= 0 && canvas[y]) {
                            canvas[y][headStartX - i] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                        }
                        if (headEndX + i < baseWidth && canvas[y]) {
                            canvas[y][headEndX + i] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "long": {
            for (let i = 1; i <= 2; i++) {
                for (let x = headStartX - 1; x <= headEndX + 1; x++) {
                    if (headStartY - i >= 0 && x >= 0 && x < baseWidth && canvas[headStartY - i]) {
                        canvas[headStartY - i][x] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                    }
                }
            }
            for (let y = headStartY - 1; y <= headEndY + 1; y++) {
                if (y >= 0 && y < baseHeight) {
                    for (let i = 1; i <= 2; i++) {
                        if (headStartX - i >= 0 && canvas[y]) {
                            canvas[y][headStartX - i] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                        }
                        if (headEndX + i < baseWidth && canvas[y]) {
                            canvas[y][headEndX + i] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            if (headEndY + 2 < baseHeight && canvas[headEndY + 2]) {
                const chars = [headStartX, headEndX, headStartX + 1, headEndX - 1];
                for (const x of chars) {
                    if (x >= 0 && x < baseWidth) canvas[headEndY + 2][x] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                }
            }
            break;
        }
        case "mohawk": {
            const mohawkWidth = Math.max(1, Math.floor(headActualWidth / 3));
            const mohawkActualStartX = headStartX + Math.floor((headActualWidth - mohawkWidth) / 2);
            for (let y = headStartY - 2; y < headStartY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = mohawkActualStartX; x < mohawkActualStartX + mohawkWidth; x++) {
                        if (x >= 0 && x < baseWidth) {
                            canvas[y][x] = { char: '^', type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "tonsure": {
            const baldRadius = Math.floor(headActualWidth / 4);
            const topHairY = headStartY - 1;
            if (topHairY >= 0 && topHairY < baseHeight && canvas[topHairY]) {
                for (let x = headStartX; x <= headEndX; x++) {
                    const distCenter = Math.abs(x - (headStartX + Math.floor(headActualWidth / 2)));
                    if (distCenter > baldRadius && x >= 0 && x < baseWidth) {
                        canvas[topHairY][x] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                    } else if (distCenter <= baldRadius && x >= 0 && x < baseWidth) {
                        canvas[topHairY][x] = { char: ' ', type: 'empty', color: null }; // Bald spot
                    }
                }
            }
            for (let y = headStartY; y <= headEndY; y++) {
                if (y >= 0 && y < baseHeight) {
                    if (headStartX - 1 >= 0 && canvas[y]) canvas[y][headStartX - 1] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                    if (headEndX + 1 < baseWidth && canvas[y]) canvas[y][headEndX + 1] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                }
            }
            break;
        }
        case "buzz-cut": {
            // Very short, close-cropped, follows head outline closely
            // Use a sparse character like '.' or '`'
            const buzzChar = '`';
            // Top layer
            for (let x = headStartX; x <= headEndX; x++) {
                if (headStartY - 1 >= 0 && x >= 0 && x < baseWidth && canvas[headStartY - 1]) {
                    canvas[headStartY - 1][x] = { char: buzzChar, type: 'hair', color: hairColor };
                }
            }
            // Sides, very close to head
            for (let y = headStartY; y <= headEndY; y++) {
                if (y >= 0 && y < baseHeight) {
                    if (headStartX - 1 >= 0 && canvas[y] && (y < headStartY + headActualHeight / 2)) { // Only upper sides
                        canvas[y][headStartX - 1] = { char: buzzChar, type: 'hair', color: hairColor };
                    }
                    if (headEndX + 1 < baseWidth && canvas[y] && (y < headStartY + headActualHeight / 2)) {
                        canvas[y][headEndX + 1] = { char: buzzChar, type: 'hair', color: hairColor };
                    }
                }
            }
            // Cover corners that might have been skin/border
            if (headStartY >= 0 && headStartX >= 0 && canvas[headStartY] && canvas[headStartY][headStartX] && canvas[headStartY][headStartX].type !== 'eye') canvas[headStartY][headStartX] = { char: buzzChar, type: 'hair', color: hairColor };
            if (headStartY >= 0 && headEndX < baseWidth && canvas[headStartY] && canvas[headStartY][headEndX] && canvas[headStartY][headEndX].type !== 'eye') canvas[headStartY][headEndX] = { char: buzzChar, type: 'hair', color: hairColor };

            break;
        }
        case "pixie-cut": {
            // Short on sides, slightly longer/textured on top.
            const pixieTopChar = '"';
            const pixieSideChar = '\'';
            // Top - potentially 2 layers for texture
            for (let yOffset = 1; yOffset <= 2; yOffset++) {
                for (let x = headStartX; x <= headEndX; x++) {
                    if (headStartY - yOffset >= 0 && x >= 0 && x < baseWidth && canvas[headStartY - yOffset]) {
                        if (yOffset === 1 || (yOffset === 2 && (x % 2 === 0))) // Thinner second layer
                            canvas[headStartY - yOffset][x] = { char: pixieTopChar, type: 'hair', color: hairColor };
                    }
                }
            }
            // Sides - short
            for (let y = headStartY; y < headEndY - Math.floor(headActualHeight / 4); y++) { // Not too far down
                if (y >= 0 && y < baseHeight) {
                    if (headStartX - 1 >= 0 && canvas[y]) {
                        canvas[y][headStartX - 1] = { char: pixieSideChar, type: 'hair', color: hairColor };
                    }
                    if (headEndX + 1 < baseWidth && canvas[y]) {
                        canvas[y][headEndX + 1] = { char: pixieSideChar, type: 'hair', color: hairColor };
                    }
                }
            }
            // Blend top corners
            if (headStartY - 1 >= 0 && headStartX - 1 >= 0 && canvas[headStartY - 1]) canvas[headStartY - 1][headStartX - 1] = { char: pixieSideChar, type: 'hair', color: hairColor };
            if (headStartY - 1 >= 0 && headEndX + 1 < baseWidth && canvas[headStartY - 1]) canvas[headStartY - 1][headEndX + 1] = { char: pixieSideChar, type: 'hair', color: hairColor };
            break;
        }
        case "bowl-cut": {
            const bowlChar = hairCharSymbol;
            const bowlTopY = headStartY - 1; // Allow hair slightly above head outline
            // Bowl height should not go too far down, relative to where eyes are.
            // eyeY is typically headStartY + headActualHeight / 3.5
            // Fringe should end above or at eyeY.
            const fringeBottomY = Math.min(coords.eyeY - 1, headStartY + Math.floor(headActualHeight / 3));
            const bowlSideBottomY = fringeBottomY + 1; // Sides can go a bit lower

            // Draw the "bowl" shape
            for (let y = bowlTopY; y <= bowlSideBottomY; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX - 1; x <= headEndX + 1; x++) {
                    if (x < 0 || x >= baseWidth) continue;

                    // Don't draw hair in the absolute corners above the head for a rounder top
                    if (y < headStartY && (x < headStartX || x > headEndX)) continue;

                    // For the fringe area (over the forehead)
                    if (y <= fringeBottomY) {
                        // If it's on the sides (outside main head width) or above eyes, draw hair
                        if (x < headStartX || x > headEndX || y < coords.eyeY - 1) { // Allow fringe to touch just above eyes
                            canvas[y][x] = { char: bowlChar, type: 'hair', color: hairColor };
                        } else { // Central part of fringe, ensure it doesn't cover eyes/nose area
                            if (canvas[y][x].type === 'empty') { // Only draw if cell is empty
                                canvas[y][x] = { char: bowlChar, type: 'hair', color: hairColor };
                            }
                        }
                    } else if (y <= bowlSideBottomY && (x < headStartX + 1 || x > headEndX - 1)) { // Sides of the bowl below fringe line
                        canvas[y][x] = { char: bowlChar, type: 'hair', color: hairColor };
                    }
                }
            }
            break;
        }
        case "jawline-bob": {
            const bobChar = hairCharSymbol;
            const bobBottomY = headEndY; // Hair ends around jawline

            // Top coverage (above the head outline)
            if (headStartY - 1 >= 0 && canvas[headStartY - 1]) {
                for (let x = headStartX; x <= headEndX; x++) {
                    if (x >= 0 && x < baseWidth) {
                        canvas[headStartY - 1][x] = { char: bobChar, type: 'hair', color: hairColor };
                    }
                }
            }

            // Sides of the bob
            for (let y = headStartY; y <= bobBottomY; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;

                // Hair on the left side
                const leftHairX = headStartX - 1;
                if (leftHairX >= 0) {
                    canvas[y][leftHairX] = { char: bobChar, type: 'hair', color: hairColor };
                    // Potentially add a second layer for thickness if head is wide enough
                    if (headActualWidth > 5 && leftHairX - 1 >= 0) canvas[y][leftHairX - 1] = { char: bobChar, type: 'hair', color: hairColor };
                }

                // Hair on the right side
                const rightHairX = headEndX + 1;
                if (rightHairX < baseWidth) {
                    canvas[y][rightHairX] = { char: bobChar, type: 'hair', color: hairColor };
                    if (headActualWidth > 5 && rightHairX + 1 < baseWidth) canvas[y][rightHairX + 1] = { char: bobChar, type: 'hair', color: hairColor };
                }

                // Fill the very top corners just above the head if not already covered
                if (y === headStartY) {
                    if (leftHairX >= 0) canvas[y][leftHairX] = { char: bobChar, type: 'hair', color: hairColor };
                    if (rightHairX < baseWidth) canvas[y][rightHairX] = { char: bobChar, type: 'hair', color: hairColor };
                }
            }

            // Fill any exposed original head outline corners with hair too (if they were skinBorder)
            // This ensures hair covers the structural outline properly
            if (canvas[headStartY][headStartX].type === 'skinBorder') canvas[headStartY][headStartX] = { char: bobChar, type: 'hair', color: hairColor };
            if (canvas[headStartY][headEndX].type === 'skinBorder') canvas[headStartY][headEndX] = { char: bobChar, type: 'hair', color: hairColor };


            // Refined inward curve at the bottom: only affect the outermost layer of hair
            if (bobBottomY > headStartY && bobBottomY < baseHeight && canvas[bobBottomY]) {
                const leftOuterHairX = headStartX - (headActualWidth > 5 ? 2 : 1);
                const rightOuterHairX = headEndX + (headActualWidth > 5 ? 2 : 1);

                if (leftOuterHairX >= 0 && canvas[bobBottomY][leftOuterHairX] && canvas[bobBottomY][leftOuterHairX].type === 'hair') {
                    canvas[bobBottomY][leftOuterHairX].char = '/';
                }
                if (rightOuterHairX < baseWidth && canvas[bobBottomY][rightOuterHairX] && canvas[bobBottomY][rightOuterHairX].type === 'hair') {
                    canvas[bobBottomY][rightOuterHairX].char = '\\';
                }
            }
            break;
        }
        case "combover": { // Renamed from fairy-cut
            const comboverChar = hairCharSymbol; // Use standard hair char, could be '-' or similar
            const partSide = _getRandomValue(0, 1) === 0 ? 'left' : 'right'; // Randomize part side for variety
            let partX;

            // Define part location (e.g., 1/4 from the side)
            if (partSide === 'left') {
                partX = headStartX + Math.floor(headActualWidth / 4);
            } else { // right part
                partX = headEndX - Math.floor(headActualWidth / 4);
            }
            if (partX < headStartX) partX = headStartX; // Ensure part isn't outside head
            if (partX > headEndX) partX = headEndX;

            // Draw hair
            for (let y = headStartY - 1; y < headStartY + Math.floor(headActualHeight / 1.5); y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;

                if (partSide === 'left') {
                    // Thinner side (parting side)
                    for (let x = headStartX - 1; x < partX; x++) {
                        if (x >= 0 && x < baseWidth && (canvas[y][x].type === 'empty' || y < headStartY)) {
                            if ((x + y) % 2 === 0) // Sparse fill for thinner side
                                canvas[y][x] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                        }
                    }
                    // Combed over side (thicker)
                    for (let x = partX; x <= headEndX + 1; x++) {
                        if (x >= 0 && x < baseWidth && (canvas[y][x].type === 'empty' || y < headStartY)) {
                            canvas[y][x] = { char: comboverChar, type: 'hair', color: hairColor };
                        }
                    }
                } else { // Right part
                    // Thinner side (parting side)
                    for (let x = partX + 1; x <= headEndX + 1; x++) {
                        if (x >= 0 && x < baseWidth && (canvas[y][x].type === 'empty' || y < headStartY)) {
                            if ((x + y) % 2 === 0) // Sparse fill
                                canvas[y][x] = { char: hairCharSymbol, type: 'hair', color: hairColor };
                        }
                    }
                    // Combed over side (thicker)
                    for (let x = headStartX - 1; x <= partX; x++) {
                        if (x >= 0 && x < baseWidth && (canvas[y][x].type === 'empty' || y < headStartY)) {
                            canvas[y][x] = { char: comboverChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            // Attempt to clear the part line slightly for definition
            if (partX >= headStartX && partX <= headEndX) {
                if (headStartY - 1 >= 0 && canvas[headStartY - 1] && canvas[headStartY - 1][partX]) canvas[headStartY - 1][partX] = { char: ' ', type: 'empty', color: null };
                if (headStartY >= 0 && canvas[headStartY] && canvas[headStartY][partX]) canvas[headStartY][partX] = { char: ' ', type: 'empty', color: null };
            }
            break;
        }
        case "french-crop-curls": {
            const curlChar = '&'; // Or '@', 'o'
            const cropSideChar = '`';
            // Top curly part, with a bit of a fringe
            const fringeLength = Math.floor(headActualHeight / 4);
            for (let y = headStartY - 1; y < headStartY + fringeLength; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX; x <= headEndX; x++) {
                    if (x < 0 || x >= baseWidth) continue;
                    // Make it a bit uneven/textured for curls
                    if ((x + y) % 2 === 0 || y < headStartY) { // Density for curls
                        canvas[y][x] = { char: curlChar, type: 'hair', color: hairColor };
                    } else if (canvas[y][x].type === 'empty') { // Fill gaps lightly
                        canvas[y][x] = { char: '.', type: 'hair', color: hairColor };
                    }
                }
            }
            // Short sides (fade can be implied by less density or stopping higher)
            for (let y = headStartY; y < headEndY - Math.floor(headActualHeight / 3); y++) {
                if (y >= 0 && y < baseHeight) {
                    if (headStartX - 1 >= 0 && canvas[y]) {
                        canvas[y][headStartX - 1] = { char: cropSideChar, type: 'hair', color: hairColor };
                    }
                    if (headStartX - 2 >= 0 && y < headStartY + Math.floor(headActualHeight / 3) && canvas[y]) { // Fade higher up
                        canvas[y][headStartX - 2] = { char: cropSideChar, type: 'hair', color: hairColor };
                    }
                    if (headEndX + 1 < baseWidth && canvas[y]) {
                        canvas[y][headEndX + 1] = { char: cropSideChar, type: 'hair', color: hairColor };
                    }
                    if (headEndX + 2 < baseWidth && y < headStartY + Math.floor(headActualHeight / 3) && canvas[y]) { // Fade higher up
                        canvas[y][headEndX + 2] = { char: cropSideChar, type: 'hair', color: hairColor };
                    }
                }
            }
            break;
        }
        // Removed "undercut" case
        case "mullet": {
            const mulletTopChar = hairCharSymbol;
            const mulletBackChar = hairCharSymbol === '@' ? 'M' : ';';

            // Top/front part: Keep it above eyes and neat
            const mulletFrontTopEndY = Math.min(coords.eyeY - 1, headStartY + Math.floor(headActualHeight / 3));
            for (let y = headStartY - 1; y <= mulletFrontTopEndY; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX; x <= headEndX; x++) { // Main top section
                    if (x >= 0 && x < baseWidth && (canvas[y][x].type === 'empty' || y < headStartY)) {
                        canvas[y][x] = { char: mulletTopChar, type: 'hair', color: hairColor };
                    }
                }
            }
            // Sides for top part - very minimal, just at temple height or above, only on empty or skinBorder
            for (let y = headStartY; y < coords.eyeY; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                if (headStartX - 1 >= 0 && (canvas[y][headStartX - 1].type === 'empty' || canvas[y][headStartX - 1].type === 'skinBorder')) {
                    canvas[y][headStartX - 1] = { char: mulletTopChar, type: 'hair', color: hairColor };
                }
                if (headEndX + 1 < baseWidth && (canvas[y][headEndX + 1].type === 'empty' || canvas[y][headEndX + 1].type === 'skinBorder')) {
                    canvas[y][headEndX + 1] = { char: mulletTopChar, type: 'hair', color: hairColor };
                }
            }

            // Longer back part - Stricter placement
            const mulletBackMinY = headStartY + Math.floor(headActualHeight * 0.35); // Start a bit lower on the crown
            const mulletBackMaxY = headEndY + Math.floor(headActualHeight * 0.6);   // Extends well below

            for (let y = mulletBackMinY; y <= mulletBackMaxY; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;

                let currentSegmentWidth;
                // For the part of the mullet level with the head, keep it very narrow and truly at the back
                if (y <= headEndY) {
                    // This part of mullet is level with head, should only be at the very sides/back
                    // Draw on the head outline columns and one column outside them.
                    const LColOuter = headStartX - 1;
                    const LColInner = headStartX;
                    const RColInner = headEndX;
                    const RColOuter = headEndX + 1;

                    // Left side back
                    if (LColOuter >= 0 && LColOuter < baseWidth && canvas[y][LColOuter].type === 'empty') {
                        if (!(y >= coords.mouthY - 1 && y <= coords.mouthY + 1 && LColOuter >= coords.mouthCenterX - 2 && LColOuter <= coords.mouthCenterX + 2)) // Avoid mouth zone
                            canvas[y][LColOuter] = { char: mulletBackChar, type: 'hair', color: hairColor };
                    }
                    if (LColInner >= 0 && LColInner < baseWidth && (canvas[y][LColInner].type === 'empty' || canvas[y][LColInner].type === 'skinBorder' || canvas[y][LColInner].type === 'skin')) {
                        if (!(y >= coords.mouthY - 1 && y <= coords.mouthY + 1 && LColInner >= coords.mouthCenterX - 2 && LColInner <= coords.mouthCenterX + 2))
                            canvas[y][LColInner] = { char: mulletBackChar, type: 'hair', color: hairColor };
                    }
                    // Right side back
                    if (RColInner >= 0 && RColInner < baseWidth && (canvas[y][RColInner].type === 'empty' || canvas[y][RColInner].type === 'skinBorder' || canvas[y][RColInner].type === 'skin')) {
                        if (!(y >= coords.mouthY - 1 && y <= coords.mouthY + 1 && RColInner >= coords.mouthCenterX - 2 && RColInner <= coords.mouthCenterX + 2))
                            canvas[y][RColInner] = { char: mulletBackChar, type: 'hair', color: hairColor };
                    }
                    if (RColOuter >= 0 && RColOuter < baseWidth && canvas[y][RColOuter].type === 'empty') {
                        if (!(y >= coords.mouthY - 1 && y <= coords.mouthY + 1 && RColOuter >= coords.mouthCenterX - 2 && RColOuter <= coords.mouthCenterX + 2))
                            canvas[y][RColOuter] = { char: mulletBackChar, type: 'hair', color: hairColor };
                    }

                } else {
                    // Part of mullet below the head - can be wider and centered, tapering
                    currentSegmentWidth = Math.max(1, (headActualWidth - 2) - Math.floor((y - headEndY) / 1.2));
                    const startX_MulletBack = headStartX + Math.floor((headActualWidth - currentSegmentWidth) / 2);
                    const endX_MulletBack = startX_MulletBack + currentSegmentWidth - 1;
                    for (let x = startX_MulletBack; x <= endX_MulletBack; x++) {
                        if (x >= 0 && x < baseWidth && canvas[y][x].type === 'empty') {
                            canvas[y][x] = { char: mulletBackChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "shag": {
            const shagChars = ['"', '\'', '/', '\\'];
            // Layered, textured, fuller around crown, frames face.
            const shagBaseChar = hairCharSymbol;
            const shagTextureChars = ['\'', '"', '`']; // For wispiness/texture

            // Crown and top layers (fuller)
            for (let y = headStartY - 2; y < headStartY + Math.floor(headActualHeight * 0.5); y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX - 1; x <= headEndX + 1; x++) {
                    if (x < 0 || x >= baseWidth) continue;
                    if (y < headStartY && (x < headStartX || x > headEndX)) continue; // Avoid disconnected top corners

                    if (canvas[y][x].type === 'empty' || y < headStartY) {
                        canvas[y][x] = { char: ((x + y) % 3 === 0 ? _getRandomElement(shagTextureChars) : shagBaseChar), type: 'hair', color: hairColor };
                    }
                }
            }

            // Sides and lower layers (framing the face, potentially wispier)
            // Avoids covering eyes/nose/mouth directly unless it's a very light fringe character
            const fringeLimitY = coords.eyeY; // Allow some wispiness down to eye level

            for (let y = headStartY + Math.floor(headActualHeight * 0.25); y <= headEndY + 1; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;

                // Left side
                for (let x = headStartX - 2; x < headStartX + Math.floor(headActualWidth * 0.3); x++) {
                    if (x < 0 || x >= baseWidth) continue;
                    if (y > fringeLimitY && x >= headStartX && x <= headEndX) continue; // Avoid covering central face below eyes
                    if (canvas[y][x].type === 'empty' || canvas[y][x].type.includes('Border')) {
                        if (Math.random() < 0.6) // Density for shag sides
                            canvas[y][x] = { char: _getRandomElement(shagTextureChars), type: 'hair', color: hairColor };
                    }
                }
                // Right side
                for (let x = headEndX + 2; x > headEndX - Math.floor(headActualWidth * 0.3); x--) {
                    if (x < 0 || x >= baseWidth) continue;
                    if (y > fringeLimitY && x >= headStartX && x <= headEndX) continue; // Avoid covering central face below eyes
                    if (canvas[y][x].type === 'empty' || canvas[y][x].type.includes('Border')) {
                        if (Math.random() < 0.6) // Density for shag sides
                            canvas[y][x] = { char: _getRandomElement(shagTextureChars), type: 'hair', color: hairColor };
                    }
                }
            }

            // Add a very light, wispy fringe over the forehead if not too low
            for (let y = headStartY; y < fringeLimitY; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX + 1; x < headEndX; x++) { // Only central forehead
                    if (x < 0 || x >= baseWidth) continue;
                    if (canvas[y][x].type === 'empty' && Math.random() < 0.25) { // Very sparse
                        canvas[y][x] = { char: '\'', type: 'hairFringe', color: hairColor };
                    }
                }
            }
            break;
        }
        case "asymmetrical-bob": {
            const asymBobChar = hairCharSymbol;
            // One side longer than the other. Randomly pick which side.
            const longSide = _getRandomValue(0, 1) === 0 ? 'left' : 'right';
            const shortSideEndY = headStartY + Math.floor(headActualHeight * 0.6); // Shorter side ends mid-cheek
            const longSideEndY = headEndY + 1; // Longer side can go past jaw

            // Top coverage
            for (let y = headStartY - 1; y < headStartY + Math.floor(headActualHeight / 3); y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX - 1; x <= headEndX + 1; x++) {
                    if (x >= 0 && x < baseWidth && (canvas[y][x].type === 'empty' || y < headStartY)) {
                        canvas[y][x] = { char: asymBobChar, type: 'hair', color: hairColor };
                    }
                }
            }

            // Sides
            for (let y = headStartY; y <= longSideEndY; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;

                // Left Side
                const currentLeftEndY = (longSide === 'left' ? longSideEndY : shortSideEndY);
                if (y <= currentLeftEndY) {
                    if (headStartX - 1 >= 0) canvas[y][headStartX - 1] = { char: asymBobChar, type: 'hair', color: hairColor };
                    if (headStartX - 2 >= 0 && headActualWidth > 4) canvas[y][headStartX - 2] = { char: asymBobChar, type: 'hair', color: hairColor };
                }

                // Right Side
                const currentRightEndY = (longSide === 'right' ? longSideEndY : shortSideEndY);
                if (y <= currentRightEndY) {
                    if (headEndX + 1 < baseWidth) canvas[y][headEndX + 1] = { char: asymBobChar, type: 'hair', color: hairColor };
                    if (headEndX + 2 < baseWidth && headActualWidth > 4) canvas[y][headEndX + 2] = { char: asymBobChar, type: 'hair', color: hairColor };
                }
            }
            break;
        }
        // Removed "long-side-part" case
        case "afro": {
            const curlChar = '&'; // Or '@', 'o'
            const cropSideChar = '`';
            // Top curly part, with a bit of a fringe
            const fringeLength = Math.floor(headActualHeight / 2);
            for (let y = headStartY - 2; y < headStartY + fringeLength; y++) {
                if (y < 0 || y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX - 1; x <= headEndX + 1; x++) {
                    if (x < 0 || x >= baseWidth) continue;
                    // Make it a bit uneven/textured for curls
                    if ((x + y) % 2 === 0 || y < headStartY) { // Density for curls
                        if (canvas[y][x].type === 'empty') {
                            canvas[y][x] = { char: curlChar, type: 'hair', color: hairColor };
                        }
                    } else if (canvas[y][x].type === 'empty') { // Fill gaps lightly
                        if (canvas[y][x].type === 'empty') {
                            canvas[y][x] = { char: '.', type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            // Short sides (fade can be implied by less density or stopping higher)
            for (let y = headStartY; y < headEndY - Math.floor(headActualHeight / 3); y++) {
                if (y >= 0 && y < baseHeight) {
                    if (headStartX - 1 >= 0 && canvas[y]) {
                        if (canvas[y][headStartX - 1].type === 'empty') {
                            canvas[y][headStartX - 1] = { char: cropSideChar, type: 'hair', color: hairColor };
                        }
                    }
                    if (headStartX - 2 >= 0 && y < headStartY + Math.floor(headActualHeight / 3) && canvas[y]) { // Fade higher up
                        if (canvas[y][headStartX - 2].type === 'empty') {
                            canvas[y][headStartX - 2] = { char: cropSideChar, type: 'hair', color: hairColor };
                        }
                    }
                    if (headEndX + 1 < baseWidth && canvas[y]) {
                        if (canvas[y][headEndX + 1].type === 'empty') {
                            canvas[y][headEndX + 1] = { char: cropSideChar, type: 'hair', color: hairColor };
                        }
                    }
                    if (headEndX + 2 < baseWidth && y < headStartY + Math.floor(headActualHeight / 3) && canvas[y]) { // Fade higher up
                        if (canvas[y][headEndX + 2].type === 'empty') {
                            canvas[y][headEndX + 2] = { char: cropSideChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "liberty-spikes": {
            const spikeChar = '^';
            for (let i = 0; i < 5; i++) {
                const spikeX = headStartX + Math.floor(headActualWidth / 5 * i) + 1;
                for (let y = headStartY - 3; y < headStartY; y++) {
                    if (y >= 0 && y < baseHeight && canvas[y] && spikeX >= 0 && spikeX < baseWidth) {
                        canvas[y][spikeX] = { char: spikeChar, type: 'hair', color: hairColor };
                    }
                }
            }
            break;
        }
        case "ponytail": {
            _drawHairstyle(canvas, { ...faceParams, hairstyle: "short" }, coords);
            const ponytailChar = '|';
            for (let y = headEndY + 1; y <= headEndY + 3; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    const ponytailX = headStartX + Math.floor(headActualWidth / 2);
                    if (ponytailX >= 0 && ponytailX < baseWidth) {
                        canvas[y][ponytailX] = { char: ponytailChar, type: 'hair', color: hairColor };
                    }
                }
            }
            break;
        }
        case "pigtails": {
            _drawHairstyle(canvas, { ...faceParams, hairstyle: "short" }, coords);
            const pigtailChar = '||';
            for (let y = headStartY + 1; y <= headStartY + 4; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    if (headStartX - 2 >= 0) {
                        canvas[y][headStartX - 2] = { char: pigtailChar, type: 'hair', color: hairColor };
                    }
                    if (headEndX + 2 < baseWidth) {
                        canvas[y][headEndX + 2] = { char: pigtailChar, type: 'hair', color: hairColor };
                    }
                }
            }
            break;
        }
        case "dreads": {
            const dreadChar = 'M';
            for (let y = headStartY - 1; y <= headEndY + 2; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = headStartX - 1; x <= headEndX + 1; x++) {
                        if (x >= 0 && x < baseWidth && (x + y) % 2 === 0) {
                            if (canvas[y][x].type === 'empty') {
                                canvas[y][x] = { char: dreadChar, type: 'hair', color: hairColor };
                            }
                        }
                    }
                }
            }
            break;
        }
        case "cornrows": {
            const dreadChar = 'M';
            // Top layer
            for (let x = headStartX; x <= headEndX; x++) {
                if (headStartY - 1 >= 0 && x >= 0 && x < baseWidth && canvas[headStartY - 1]) {
                    if ((x + headStartY - 1) % 2 === 0) {
                        if (canvas[headStartY - 1][x].type === 'empty') {
                            canvas[headStartY - 1][x] = { char: dreadChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            // Sides, very close to head
            for (let y = headStartY; y <= headEndY; y++) {
                if (y >= 0 && y < baseHeight) {
                    if (headStartX - 1 >= 0 && canvas[y] && (y < headStartY + headActualHeight / 2)) { // Only upper sides
                        if ((headStartX - 1 + y) % 2 === 0) {
                            if (canvas[y][headStartX - 1].type === 'empty') {
                                canvas[y][headStartX - 1] = { char: dreadChar, type: 'hair', color: hairColor };
                            }
                        }
                    }
                    if (headEndX + 1 < baseWidth && canvas[y] && (y < headStartY + headActualHeight / 2)) {
                        if ((headEndX + 1 + y) % 2 === 0) {
                            if (canvas[y][headEndX + 1].type === 'empty') {
                                canvas[y][headEndX + 1] = { char: dreadChar, type: 'hair', color: hairColor };
                            }
                        }
                    }
                }
            }
            // Cover corners that might have been skin/border
            if (headStartY >= 0 && headStartX >= 0 && canvas[headStartY] && canvas[headStartY][headStartX] && canvas[headStartY][headStartX].type !== 'eye') {
                if ((headStartX + headStartY) % 2 === 0) {
                    if (canvas[headStartY][headStartX].type === 'empty') {
                        canvas[headStartY][headStartX] = { char: dreadChar, type: 'hair', color: hairColor };
                    }
                }
            }
            if (headStartY >= 0 && headEndX < baseWidth && canvas[headStartY] && canvas[headStartY][headEndX] && canvas[headStartY][headEndX].type !== 'eye') {
                if ((headEndX + headStartY) % 2 === 0) {
                    if (canvas[headStartY][headEndX].type === 'empty') {
                        canvas[headStartY][headEndX] = { char: dreadChar, type: 'hair', color: hairColor };
                    }
                }
            }
            break;
        }
        case "top-knot": {
            _drawHairstyle(canvas, { ...faceParams, hairstyle: "short" }, coords);
            const knotChar = 'O';
            if (headStartY - 2 >= 0 && canvas[headStartY - 2]) {
                const knotX = headStartX + Math.floor(headActualWidth / 2);
                if (knotX >= 0 && knotX < baseWidth) {
                    canvas[headStartY - 2][knotX] = { char: knotChar, type: 'hair', color: hairColor };
                }
            }
            break;
        }
        case "reverse-mohawk": {
            const mohawkWidth = Math.max(1, Math.floor(headActualWidth / 3));
            const mohawkActualStartX = headStartX + Math.floor((headActualWidth - mohawkWidth) / 2);
            for (let y = headStartY - 2; y < headStartY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = headStartX; x <= headEndX; x++) {
                        if (x < mohawkActualStartX || x >= mohawkActualStartX + mohawkWidth) {
                            if (x >= 0 && x < baseWidth) {
                                canvas[y][x] = { char: '^', type: 'hair', color: hairColor };
                            }
                        }
                    }
                }
            }
            break;
        }
        case "flat-top": {
            const flatTopChar = '-';
            for (let y = headStartY - 2; y < headStartY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = headStartX; x <= headEndX; x++) {
                        if (x >= 0 && x < baseWidth) {
                            canvas[y][x] = { char: flatTopChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "high-top": {
            const highTopChar = '|';
            for (let y = headStartY - 3; y < headStartY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = headStartX; x <= headEndX; x++) {
                        if (x >= 0 && x < baseWidth) {
                            canvas[y][x] = { char: highTopChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "pompadour": {
            const pompChar = 'O';
            for (let y = headStartY - 2; y < headStartY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = headStartX; x <= headEndX; x++) {
                        if (x >= 0 && x < baseWidth) {
                            if (x > headStartX + 1 && x < headEndX - 1) {
                                canvas[y - 1][x] = { char: pompChar, type: 'hair', color: hairColor };
                            }
                            canvas[y][x] = { char: pompChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "beehive": {
            _drawHairstyle(canvas, { ...faceParams, hairstyle: "short" }, coords);
            const beehiveChar = '&';
            for (let y = headStartY - 5; y < headStartY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = headStartX + 1; x < headEndX; x++) {
                        if (x >= 0 && x < baseWidth) {
                            canvas[y][x] = { char: beehiveChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
        case "double-buns": {
            _drawHairstyle(canvas, { ...faceParams, hairstyle: "short" }, coords);
            const bunChar = 'OO';
            if (headStartY + 1 < baseHeight && canvas[headStartY + 1]) {
                if (headStartX - 2 >= 0) {
                    canvas[headStartY + 1][headStartX - 2] = { char: bunChar, type: 'hair', color: hairColor };
                }
                if (headEndX + 2 < baseWidth) {
                    canvas[headStartY + 1][headEndX + 2] = { char: bunChar, type: 'hair', color: hairColor };
                }
            }
            break;
        }
        case "devilock": {
            _drawHairstyle(canvas, { ...faceParams, hairstyle: "buzz-cut" }, coords);
            const devilockChar = '/';
            for (let y = headStartY; y < headEndY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    const x = headStartX + Math.floor(headActualWidth / 2);
                    if (x >= 0 && x < baseWidth) {
                        canvas[y][x] = { char: devilockChar, type: 'hair', color: hairColor };
                    }
                }
            }
            break;
        }
        case "really-high-top": {
            const highTopChar = '|';
            for (let y = headStartY - 12; y < headStartY; y++) {
                if (y >= 0 && y < baseHeight && canvas[y]) {
                    for (let x = headStartX; x <= headEndX; x++) {
                        if (x >= 0 && x < baseWidth) {
                            canvas[y][x] = { char: highTopChar, type: 'hair', color: hairColor };
                        }
                    }
                }
            }
            break;
        }
    } // This closes the switch (faceParams.hairstyle) statement
} // This closes the _drawHairstyle function

function _drawFacialHair(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, headStartX, headEndX, headEndY, eyeY, mouthY, mouthCenterX, chinStartY } = coords;
    const facialHairColor = faceParams.hairColor; // Facial hair usually matches hair color
    const facialHairCharSymbol = faceParams.hairColor === '#000000' || faceParams.hairColor === '#000001' ? '@' : '"';

    const upperLipY = mouthY - 1;

    switch (faceParams.facialHair) {
        case "none":
            break;
        case "stubble":
            if (upperLipY > eyeY && upperLipY < headEndY && upperLipY < baseHeight && canvas[upperLipY]) {
                for (let x = mouthCenterX - Math.floor(faceParams.mouthWidth / 2) - 1; x <= mouthCenterX + Math.floor((faceParams.mouthWidth - 1) / 2) + 1; x++) {
                    if (x > headStartX && x < headEndX && x >= 0 && x < baseWidth && Math.random() < 0.4) {
                        canvas[upperLipY][x] = { char: ',', type: 'facialHairStubble', color: facialHairColor };
                    }
                }
            }
            for (let y = chinStartY; y < headEndY; y++) {
                if (y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX + 1; x < headEndX; x++) {
                    if (x >= 0 && x < baseWidth && Math.random() < 0.3) {
                        canvas[y][x] = { char: '.', type: 'facialHairStubble', color: facialHairColor };
                    }
                }
            }
            break;
        case "mustache":
            if (upperLipY > eyeY && upperLipY < headEndY && upperLipY < baseHeight && canvas[upperLipY]) {
                for (let x = mouthCenterX - Math.floor(faceParams.mouthWidth / 2); x <= mouthCenterX + Math.floor((faceParams.mouthWidth - 1) / 2); x++) {
                    if (x > headStartX && x < headEndX && x >= 0 && x < baseWidth) {
                        canvas[upperLipY][x] = { char: '~', type: 'facialHair', color: facialHairColor };
                    }
                }
            }
            break;
        case "goatee":
            if (upperLipY > eyeY && upperLipY < headEndY && upperLipY < baseHeight && canvas[upperLipY]) {
                for (let x = mouthCenterX - Math.floor(faceParams.mouthWidth / 2); x <= mouthCenterX + Math.floor((faceParams.mouthWidth - 1) / 2); x++) {
                    if (x > headStartX && x < headEndX && x >= 0 && x < baseWidth) {
                        canvas[upperLipY][x] = { char: '~', type: 'facialHair', color: facialHairColor };
                    }
                }
            }
            for (let y = chinStartY; y < Math.min(headEndY, chinStartY + 2); y++) {
                if (y >= baseHeight || !canvas[y]) continue;
                for (let x = mouthCenterX - 1; x <= mouthCenterX + 1; x++) {
                    if (x > headStartX && x < headEndX && x >= 0 && x < baseWidth) {
                        canvas[y][x] = { char: facialHairCharSymbol, type: 'facialHair', color: facialHairColor };
                    }
                }
            }
            break;
        case "beard":
            if (upperLipY > eyeY && upperLipY < headEndY && upperLipY < baseHeight && canvas[upperLipY]) {
                for (let x = mouthCenterX - Math.floor(faceParams.mouthWidth / 2) - 1; x <= mouthCenterX + Math.floor((faceParams.mouthWidth - 1) / 2) + 1; x++) {
                    if (x > headStartX && x < headEndX && x >= 0 && x < baseWidth) {
                        canvas[upperLipY][x] = { char: facialHairCharSymbol, type: 'facialHair', color: facialHairColor };
                    }
                }
            }
            for (let y = chinStartY; y <= headEndY; y++) {
                if (y >= baseHeight || !canvas[y]) continue;
                for (let x = headStartX + 1; x < headEndX; x++) {
                    if (x >= 0 && x < baseWidth) {
                        canvas[y][x] = { char: facialHairCharSymbol, type: 'facialHair', color: facialHairColor };
                    }
                }
            }
            if (faceParams.hairstyle !== "bald") {
                for (let y = eyeY + 1; y <= headEndY; y++) {
                    if (y >= baseHeight || !canvas[y]) continue;
                    if (headStartX + 1 < baseWidth && headStartX + 1 >= 0) {
                        canvas[y][headStartX + 1] = { char: facialHairCharSymbol, type: 'facialHair', color: facialHairColor };
                    }
                    if (headEndX - 1 >= 0 && headEndX - 1 < baseWidth) {
                        canvas[y][headEndX - 1] = { char: facialHairCharSymbol, type: 'facialHair', color: facialHairColor };
                    }
                }
            }
            break;
    }
}

function _drawGlasses(canvas, faceParams, coords) {
    const { baseWidth, baseHeight, eyeY, leftEyeX, rightEyeX } = coords;
    const glassesFrameColor = faceParams.glassesColor || '#707070'; // A distinct grey for frames
    // const glassesLensColor = faceParams.eyeColor; // Lens could be transparent or slightly tinted based on eye color

    switch (faceParams.glasses) {
        case "none":
            break;
        case "round":
            const rLensL = leftEyeX;
            const rLensR = rightEyeX;
            if (eyeY >= 0 && eyeY < baseHeight && canvas[eyeY]) {
                if (rLensL - 1 >= 0 && rLensL - 1 < baseWidth) canvas[eyeY][rLensL - 1] = { char: '(', type: 'glassesFrame', color: glassesFrameColor };
                // Keep existing eye char, or use a specific lens char
                // canvas[eyeY][rLensL] = {char: ' ', type: 'glassesLens', color: glassesLensColor}; 
                if (rLensL + 1 < baseWidth) canvas[eyeY][rLensL + 1] = { char: ')', type: 'glassesFrame', color: glassesFrameColor };

                if (leftEyeX !== rightEyeX) {
                    if (rLensR - 1 >= 0 && rLensR - 1 < baseWidth) canvas[eyeY][rLensR - 1] = { char: '(', type: 'glassesFrame', color: glassesFrameColor };
                    // canvas[eyeY][rLensR] = {char: ' ', type: 'glassesLens', color: glassesLensColor};
                    if (rLensR + 1 < baseWidth) canvas[eyeY][rLensR + 1] = { char: ')', type: 'glassesFrame', color: glassesFrameColor };
                    // Bridge
                    for (let x = rLensL + 2; x < rLensR - 1; x++) {
                        if (x >= 0 && x < baseWidth) canvas[eyeY][x] = { char: '-', type: 'glassesBridge', color: glassesFrameColor };
                    }
                }
            }
            break;
        case "square":
            const sLensL = leftEyeX;
            const sLensR = rightEyeX;
            if (eyeY - 1 >= 0 && eyeY - 1 < baseHeight && canvas[eyeY - 1]) {
                for (let x = sLensL - 1; x <= sLensL + 1; ++x) if (x >= 0 && x < baseWidth) canvas[eyeY - 1][x] = { char: '-', type: 'glassesFrame', color: glassesFrameColor };
                if (sLensL !== sLensR) for (let x = sLensR - 1; x <= sLensR + 1; ++x) if (x >= 0 && x < baseWidth) canvas[eyeY - 1][x] = { char: '-', type: 'glassesFrame', color: glassesFrameColor };
            }
            if (eyeY >= 0 && eyeY < baseHeight && canvas[eyeY]) {
                if (sLensL - 1 >= 0 && sLensL - 1 < baseWidth) canvas[eyeY][sLensL - 1] = { char: '|', type: 'glassesFrame', color: glassesFrameColor };
                // canvas[eyeY][sLensL] = {char: ' ', type: 'glassesLens', color: glassesLensColor};
                if (sLensL + 1 < baseWidth) canvas[eyeY][sLensL + 1] = { char: '|', type: 'glassesFrame', color: glassesFrameColor };
                if (sLensL !== sLensR) {
                    if (sLensR - 1 >= 0 && sLensR - 1 < baseWidth) canvas[eyeY][sLensR - 1] = { char: '|', type: 'glassesFrame', color: glassesFrameColor };
                    // canvas[eyeY][sLensR] = {char: ' ', type: 'glassesLens', color: glassesLensColor};
                    if (sLensR + 1 < baseWidth) canvas[eyeY][sLensR + 1] = { char: '|', type: 'glassesFrame', color: glassesFrameColor };
                    for (let x = sLensL + 2; x < sLensR - 1; x++) {
                        if (x >= 0 && x < baseWidth) canvas[eyeY][x] = { char: '-', type: 'glassesBridge', color: glassesFrameColor };
                    }
                }
            }
            if (eyeY + 1 >= 0 && eyeY + 1 < baseHeight && canvas[eyeY + 1]) {
                for (let x = sLensL - 1; x <= sLensL + 1; ++x) if (x >= 0 && x < baseWidth) canvas[eyeY + 1][x] = { char: '-', type: 'glassesFrame', color: glassesFrameColor };
                if (sLensL !== sLensR) for (let x = sLensR - 1; x <= sLensR + 1; ++x) if (x >= 0 && x < baseWidth) canvas[eyeY + 1][x] = { char: '-', type: 'glassesFrame', color: glassesFrameColor };
            }
            break;
        case "monocle":
            const monoX = rightEyeX; // Default to right eye
            if (eyeY >= 0 && eyeY < baseHeight && canvas[eyeY]) {
                if (monoX - 1 >= 0 && monoX - 1 < baseWidth) canvas[eyeY][monoX - 1] = { char: '(', type: 'glassesFrame', color: glassesFrameColor };
                // canvas[eyeY][monoX] = {char: ' ', type: 'glassesLens', color: glassesLensColor};
                if (monoX + 1 < baseWidth) canvas[eyeY][monoX + 1] = { char: ')', type: 'glassesFrame', color: glassesFrameColor };
            }
            if (eyeY - 1 >= 0 && eyeY - 1 < baseHeight && canvas[eyeY - 1] && monoX >= 0 && monoX < baseWidth) canvas[eyeY - 1][monoX] = { char: '-', type: 'glassesFrame', color: glassesFrameColor };
            if (eyeY + 1 >= 0 && eyeY + 1 < baseHeight && canvas[eyeY + 1] && monoX >= 0 && monoX < baseWidth) canvas[eyeY + 1][monoX] = { char: '-', type: 'glassesFrame', color: glassesFrameColor };
            // Chain
            if (eyeY + 1 < baseHeight && monoX + 1 < baseWidth && canvas[eyeY + 1]) canvas[eyeY + 1][monoX + 1] = { char: ',', type: 'glassesChain', color: glassesFrameColor };
            if (eyeY + 2 < baseHeight && monoX + 2 < baseWidth && canvas[eyeY + 2]) canvas[eyeY + 2][monoX + 2] = { char: '\'', type: 'glassesChain', color: glassesFrameColor };
            break;
    }
}


/**
 * Reads face parameters from UI, updates gameState, and refreshes the ASCII face preview.
 */
function updateFacePreview() {
    if (!window.gameState || !window.gameState.player || !window.gameState.player.face) {
        console.error("Face generator: gameState.player.face is not initialized!");
        return;
    }

    const faceParams = window.gameState.player.face;

    // Read values from UI elements and update faceParams
    faceParams.headWidth = parseInt(document.getElementById('headWidthRange').value);
    document.getElementById('headWidthValue').textContent = faceParams.headWidth;

    faceParams.headHeight = parseInt(document.getElementById('headHeightRange').value);
    document.getElementById('headHeightValue').textContent = faceParams.headHeight;

    faceParams.eyeSize = parseInt(document.getElementById('eyeSizeRange').value);
    document.getElementById('eyeSizeValue').textContent = faceParams.eyeSize;

    faceParams.browHeight = parseInt(document.getElementById('browHeightRange').value);
    document.getElementById('browHeightValue').textContent = faceParams.browHeight;

    faceParams.browAngle = parseInt(document.getElementById('browAngleRange').value);
    document.getElementById('browAngleValue').textContent = faceParams.browAngle;

    faceParams.browWidth = parseInt(document.getElementById('browWidthRange').value); // New
    document.getElementById('browWidthValue').textContent = faceParams.browWidth; // New

    faceParams.noseWidth = parseInt(document.getElementById('noseWidthRange').value);
    document.getElementById('noseWidthValue').textContent = faceParams.noseWidth;

    faceParams.noseHeight = parseInt(document.getElementById('noseHeightRange').value);
    document.getElementById('noseHeightValue').textContent = faceParams.noseHeight;

    faceParams.mouthWidth = parseInt(document.getElementById('mouthWidthRange').value);
    document.getElementById('mouthWidthValue').textContent = faceParams.mouthWidth;

    faceParams.mouthFullness = parseInt(document.getElementById('mouthFullnessRange').value);
    document.getElementById('mouthFullnessValue').textContent = faceParams.mouthFullness;

    faceParams.hairstyle = document.getElementById('hairstyleSelect').value;
    faceParams.facialHair = document.getElementById('facialHairSelect').value;
    faceParams.glasses = document.getElementById('glassesSelect').value;
    faceParams.glassesColor = document.getElementById('glassesColorPicker').value;

    faceParams.eyeColor = document.getElementById('eyeColorPicker').value;
    faceParams.hairColor = document.getElementById('hairColorPicker').value;
    faceParams.eyebrowColor = document.getElementById('eyebrowColorPicker').value;
    faceParams.lipColor = document.getElementById('lipColorPicker').value;
    faceParams.skinColor = document.getElementById('skinColorPicker').value;

    // Generate ASCII face
    const asciiFace = generateAsciiFace(faceParams);
    faceParams.asciiFace = asciiFace; // Store it in gameState as well

    // Update preview
    const previewElement = document.getElementById('asciiFacePreview');
    if (previewElement) {
        previewElement.textContent = asciiFace;
    }
}

/**
 * Initializes the face creator by setting up event listeners.
 */
function initFaceCreator() {
    const controls = [
        'headWidthRange', 'headHeightRange', 'eyeSizeRange', 'browHeightRange',
        'browAngleRange', 'browWidthRange', 'noseWidthRange', 'noseHeightRange', // Added browWidthRange
        'mouthWidthRange', 'mouthFullnessRange', 'hairstyleSelect',
        'facialHairSelect', 'glassesSelect', 'glassesColorPicker', 'eyeColorPicker',
        'hairColorPicker', 'eyebrowColorPicker', 'lipColorPicker', 'skinColorPicker'
    ];

    controls.forEach(controlId => {
        const element = document.getElementById(controlId);
        if (element) {
            element.addEventListener('input', updateFacePreview); // 'input' for ranges/colors, 'change' for select
            if (element.type === 'select-one') { // For select elements, 'change' is more standard
                element.removeEventListener('input', updateFacePreview);
                element.addEventListener('change', updateFacePreview);
            }
        } else {
            console.warn(`Face creator control not found: ${controlId}`);
        }
    });

    // Initial population of the preview - MOVED to be after initial randomization
    // updateFacePreview(); 

    // --- Setup Preset Color Swatches ---
    const colorPickerToPresetMap = {
        'skinColorPicker': PRESET_COLORS.skin,
        'hairColorPicker': PRESET_COLORS.hair,
        'eyebrowColorPicker': PRESET_COLORS.eyebrows,
        'eyeColorPicker': PRESET_COLORS.eyes,
        'lipColorPicker': PRESET_COLORS.lips
    };

    for (const pickerId in colorPickerToPresetMap) {
        const presetColors = colorPickerToPresetMap[pickerId];
        const containerId = pickerId.replace('Picker', 'PresetContainer');
        const containerElement = document.getElementById(containerId);
        const mainColorPickerElement = document.getElementById(pickerId);

        if (containerElement && mainColorPickerElement) {
            presetColors.forEach(hexColor => {
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.classList.add('preset-swatch');
                swatch.style.backgroundColor = hexColor;
                swatch.dataset.color = hexColor; // Store color in data attribute
                swatch.addEventListener('click', function () {
                    mainColorPickerElement.value = this.dataset.color;
                    // Manually trigger input event on the color picker to ensure updateFacePreview runs
                    mainColorPickerElement.dispatchEvent(new Event('input', { bubbles: true }));
                });
                containerElement.appendChild(swatch);
            });
        }
    }

    // --- Randomize Button Listener ---
    const randomizeButton = document.getElementById('randomizeFaceButton');
    if (randomizeButton) {
        randomizeButton.addEventListener('click', applyRandomFaceParams);
    } else {
        console.warn("Randomize Face button not found.");
    }

    // --- Initial Randomization and Preview ---
    applyRandomFaceParams(); // Randomize parameters first
    // updateFacePreview() is called at the end of applyRandomFaceParams, so UI and preview are set.
}

// Expose functions to global scope if necessary, or handle through module system later
window.initFaceCreator = initFaceCreator;
window.generateAsciiFace = generateAsciiFace; // For potential direct calls or debugging
window.updateFacePreview = updateFacePreview; // For potential direct calls or debugging


// --- Randomization Logic ---

/**
 * Updates all UI input elements to match the values in gameState.player.face.
 * Also updates value display <span>s for sliders.
 */
function _updateUIAfterRandomOrPreset() {
    if (!window.gameState || !window.gameState.player || !window.gameState.player.face) return;
    const faceParams = window.gameState.player.face;

    const sliderMap = {
        headWidth: 'headWidthRange', headHeight: 'headHeightRange', eyeSize: 'eyeSizeRange',
        browHeight: 'browHeightRange', browAngle: 'browAngleRange', browWidth: 'browWidthRange',
        noseWidth: 'noseWidthRange', noseHeight: 'noseHeightRange',
        mouthWidth: 'mouthWidthRange', mouthFullness: 'mouthFullnessRange'
    };

    for (const param in sliderMap) {
        const sliderId = sliderMap[param];
        const sliderElement = document.getElementById(sliderId);
        const valueDisplayElement = document.getElementById(sliderId.replace('Range', 'Value'));
        if (sliderElement) sliderElement.value = faceParams[param];
        if (valueDisplayElement) valueDisplayElement.textContent = faceParams[param];
    }

    const selectMap = {
        hairstyle: 'hairstyleSelect', facialHair: 'facialHairSelect', glasses: 'glassesSelect'
    };
    for (const param in selectMap) {
        const selectId = selectMap[param];
        const selectElement = document.getElementById(selectId);
        if (selectElement) selectElement.value = faceParams[param];
    }

    const colorPickerMap = {
        eyeColor: 'eyeColorPicker', hairColor: 'hairColorPicker', eyebrowColor: 'eyebrowColorPicker',
        lipColor: 'lipColorPicker', skinColor: 'skinColorPicker'
    };
    for (const param in colorPickerMap) {
        const pickerId = colorPickerMap[param];
        const pickerElement = document.getElementById(pickerId);
        if (pickerElement) pickerElement.value = faceParams[param];
    }
}

/**
 * Sets random values for all face parameters in gameState, updates UI, and refreshes preview.
 */
function applyRandomFaceParams() {
    if (!window.gameState || !window.gameState.player || !window.gameState.player.face) return;
    const face = window.gameState.player.face;

    // Sliders
    const sliders = [
        { id: 'headWidthRange', param: 'headWidth' }, { id: 'headHeightRange', param: 'headHeight' },
        { id: 'eyeSizeRange', param: 'eyeSize' }, { id: 'browHeightRange', param: 'browHeight' },
        { id: 'browAngleRange', param: 'browAngle' }, { id: 'browWidthRange', param: 'browWidth' },
        { id: 'noseWidthRange', param: 'noseWidth' }, { id: 'noseHeightRange', param: 'noseHeight' },
        { id: 'mouthWidthRange', param: 'mouthWidth' }, { id: 'mouthFullnessRange', param: 'mouthFullness' }
    ];
    sliders.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) face[s.param] = _getRandomValue(parseInt(el.min), parseInt(el.max));
    });

    // Selects
    const selects = [
        { id: 'hairstyleSelect', param: 'hairstyle' }, { id: 'facialHairSelect', param: 'facialHair' },
        { id: 'glassesSelect', param: 'glasses' }
    ];
    selects.forEach(s => {
        const el = document.getElementById(s.id);
        if (el && el.options.length > 0) {
            const options = Array.from(el.options).map(opt => opt.value);
            face[s.param] = _getRandomElement(options);
        }
    });

    // Colors
    face.glassesColor = '#707070';
    face.skinColor = _getRandomElement(PRESET_COLORS.skin);
    face.hairColor = _getRandomElement(PRESET_COLORS.hair);
    face.eyebrowColor = _getRandomElement(PRESET_COLORS.eyebrows);
    face.eyeColor = _getRandomElement(PRESET_COLORS.eyes);
    face.lipColor = _getRandomElement(PRESET_COLORS.lips);

    _updateUIAfterRandomOrPreset(); // Sync UI elements with new gameState values
    updateFacePreview(); // Generate and show the new face
}
// Make applyRandomFaceParams globally accessible if randomize button is outside this script's direct init scope
window.applyRandomFaceParams = applyRandomFaceParams;

/**
 * Generates a set of random face parameters and populates the given faceParamsObject.
 * This version does NOT rely on DOM elements for ranges/options.
 * @param {object} faceParamsObject - The object to populate with random face parameters.
 * @returns {object} The populated faceParamsObject.
 */
function generateRandomFaceParams(faceParamsObject) {
    if (!faceParamsObject) {
        faceParamsObject = {};
    }

    // Define ranges and options directly, as per user feedback
    const paramDefinitions = {
        headWidth: { min: 5, max: 12 },
        headHeight: { min: 6, max: 12 },
        eyeSize: { min: 1, max: 3 },
        browHeight: { min: 0, max: 1 },
        browAngle: { min: -1, max: 1 },
        browWidth: { min: 1, max: 3 },
        noseWidth: { min: 1, max: 5 },
        noseHeight: { min: 1, max: 2 },
        mouthWidth: { min: 1, max: 6 },
        mouthFullness: { min: 1, max: 2 },
        hairstyles: ["bald", "short", "medium", "long", "mohawk", "tonsure", "buzz-cut", "pixie-cut", "bowl-cut", "jawline-bob", "combover", "french-crop-curls", "mullet", "shag", "asymmetrical-bob"],
        facialHairs: ["none", "stubble", "mustache", "goatee", "beard"],
        glassesTypes: ["none", "round", "square", "monocle"]
    };

    faceParamsObject.headWidth = _getRandomValue(paramDefinitions.headWidth.min, paramDefinitions.headWidth.max);
    faceParamsObject.headHeight = _getRandomValue(paramDefinitions.headHeight.min, paramDefinitions.headHeight.max);
    faceParamsObject.eyeSize = _getRandomValue(paramDefinitions.eyeSize.min, paramDefinitions.eyeSize.max);
    faceParamsObject.browHeight = _getRandomValue(paramDefinitions.browHeight.min, paramDefinitions.browHeight.max);
    faceParamsObject.browAngle = _getRandomValue(paramDefinitions.browAngle.min, paramDefinitions.browAngle.max);
    faceParamsObject.browWidth = _getRandomValue(paramDefinitions.browWidth.min, paramDefinitions.browWidth.max);
    faceParamsObject.noseWidth = _getRandomValue(paramDefinitions.noseWidth.min, paramDefinitions.noseWidth.max);
    faceParamsObject.noseHeight = _getRandomValue(paramDefinitions.noseHeight.min, paramDefinitions.noseHeight.max);
    faceParamsObject.mouthWidth = _getRandomValue(paramDefinitions.mouthWidth.min, paramDefinitions.mouthWidth.max);
    faceParamsObject.mouthFullness = _getRandomValue(paramDefinitions.mouthFullness.min, paramDefinitions.mouthFullness.max);

    faceParamsObject.hairstyle = _getRandomElement(paramDefinitions.hairstyles);
    faceParamsObject.facialHair = _getRandomElement(paramDefinitions.facialHairs);
    faceParamsObject.glasses = _getRandomElement(paramDefinitions.glassesTypes);
    faceParamsObject.glassesColor = '#707070';

    faceParamsObject.skinColor = _getRandomElement(PRESET_COLORS.skin);
    faceParamsObject.hairColor = _getRandomElement(PRESET_COLORS.hair);
    faceParamsObject.eyebrowColor = _getRandomElement(PRESET_COLORS.eyebrows);
    faceParamsObject.eyeColor = _getRandomElement(PRESET_COLORS.eyes);
    faceParamsObject.lipColor = _getRandomElement(PRESET_COLORS.lips);

    faceParamsObject.asciiFace = ""; // Initialize, will be generated by generateAsciiFace

    return faceParamsObject;
}
window.generateRandomFaceParams = generateRandomFaceParams; // Expose if needed elsewhere
