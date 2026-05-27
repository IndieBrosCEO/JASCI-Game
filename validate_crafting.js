const fs = require('fs');
const roadmap = fs.readFileSync('crafting_roadmaps.txt', 'utf8');
const unknownRegex = /\(UNKNOWN ENTITY\)/;
const circularRegex = /circular dependency detected/i;
let errors = [];
roadmap.split('\n').forEach((line, index) => {
    if (unknownRegex.test(line) || circularRegex.test(line)) errors.push(`Line ${index + 1}: ${line.trim()}`);
});
if (errors.length > 0) {
    console.error(`Found ${errors.length} validation errors:`);
    errors.slice(0, 50).forEach(e => console.error(e));
    process.exit(1);
} else {
    console.log("Validation passed!");
}
