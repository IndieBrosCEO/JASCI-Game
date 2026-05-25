const fs = require('fs');

const content = fs.readFileSync('crafting_roadmaps.txt', 'utf8');

if (content.length > 0) {
    console.log("File is properly generated. Size:", content.length);
} else {
    console.log("File is empty.");
}
