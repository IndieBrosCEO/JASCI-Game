// Render the tables for stats and skills on the character creator
// Assumes 'character' has 'stats', 'skills', 'MIN_STAT_VALUE', 'MAX_STAT_VALUE'
function renderTables(character) {
    console.log("renderTables called. Character:", character);
    try {
        const statsBody = document.getElementById('statsBody');
        const skillsBody = document.getElementById('skillsBody');
        if (!statsBody || !skillsBody) {
            console.error("renderTables: statsBody or skillsBody not found in DOM.");
            return;
        }

        const statDescriptions = {
            "Strength": "Physical power.",
            "Intelligence": "Reasoning, memory, and knowledge.",
            "Dexterity": "Agility, speed, and nimbleness.",
            "Constitution": "Toughness and health.",
            "Perception": "Awareness and ability to spot hidden things.",
            "Willpower": "Resistance to mental effects.",
            "Charisma": "Force of personality, persuasiveness, and social influence"
        };

        const skillDescriptions = {
            "Animal Handling": "Governs the ability to interact with and control animals.",
            "Electronics": "The ability to use, repair, and modify electronic devices.",
            "Explosives": "Skill in handling, identifying, and disarming explosive devices.",
            "Guns": "Proficiency with all types of firearms.",
            "Intimidation": "The ability to influence others through fear and threats.",
            "Investigation": "The skill of uncovering clues and solving mysteries.",
            "Lockpick": "The ability to open locks without a key.",
            "Medicine": "The skill of healing wounds and treating illnesses.",
            "Melee Weapons": "Proficiency with all types of melee weapons.",
            "Persuasion": "The ability to influence others through diplomacy and reason.",
            "Repair": "The skill of fixing broken items and machinery.",
            "Sleight of Hand": "The ability to perform feats of manual dexterity, such as picking pockets.",
            "Stealth": "The skill of moving quietly and avoiding detection.",
            "Survival": "The ability to survive in the wilderness.",
            "Unarmed": "Proficiency in hand-to-hand combat."
        };

        character.MIN_STAT_VALUE = character.MIN_STAT_VALUE || 1;
        character.MAX_STAT_VALUE = 10; // Strict limit 10

        const maxStatPoints = 35;
        const maxSkillPoints = character.MAX_SKILL_POINTS || 30;

        if (!character.stats || !Array.isArray(character.stats)) {
            console.error("renderTables: character.stats is invalid.", character.stats);
            return;
        }
        if (!character.skills || !Array.isArray(character.skills)) {
            console.error("renderTables: character.skills is invalid.", character.skills);
            return;
        }

        console.log("renderTables: Calculating totals...");
        const currentStatTotal = character.stats.reduce((sum, s) => sum + (parseInt(s.points) || 0), 0);
        const currentSkillTotal = character.skills.reduce((sum, s) => sum + (parseInt(s.points) || 0), 0);
        console.log(`renderTables: Stat Total: ${currentStatTotal}, Skill Total: ${currentSkillTotal}`);

        // Inject Remaining Points Headers if they don't exist or update them
        let statHeader = document.getElementById('statPointsHeader');
        if (!statHeader) {
            console.log("renderTables: Creating statPointsHeader");
            statHeader = document.createElement('div');
            statHeader.id = 'statPointsHeader';
            statHeader.style.marginBottom = '10px';
            statHeader.style.fontWeight = 'bold';
            if (statsBody.parentNode) {
                statsBody.parentNode.insertBefore(statHeader, statsBody); // Insert before the stats body container
            } else {
                console.error("renderTables: statsBody has no parentNode.");
            }
        }
        if (statHeader) {
            statHeader.innerHTML = `Stat Points Remaining: <span id="statPointsRemainingDisplay">${maxStatPoints - currentStatTotal}</span>`;
        }

        let skillHeader = document.getElementById('skillPointsHeader');
        if (!skillHeader) {
            console.log("renderTables: Creating skillPointsHeader");
            skillHeader = document.createElement('div');
            skillHeader.id = 'skillPointsHeader';
            skillHeader.style.marginBottom = '10px';
            skillHeader.style.fontWeight = 'bold';
            if (skillsBody.parentNode) {
                skillsBody.parentNode.insertBefore(skillHeader, skillsBody);
            } else {
                console.error("renderTables: skillsBody has no parentNode.");
            }
        }
        if (skillHeader) {
            skillHeader.innerHTML = `Skill Points Remaining: <span id="skillPointsRemainingDisplay">${maxSkillPoints - currentSkillTotal}</span>`;
        }


        const statsHtml = character.stats.map(stat => `
            <div class="stat" style="background-color: ${stat.bgColor}; color: ${stat.textColor};" title="${statDescriptions[stat.name] || ''}">
                <span>${stat.name}:</span>
                <input type="number" value="${stat.points}" min="${character.MIN_STAT_VALUE}"
                    max="${character.MAX_STAT_VALUE}"
                    onchange="handleUpdateStat('${stat.name}', this.value)">
            </div>`).join('');

        const skillsHtml = character.skills.map(skill => `
            <div class="skill" style="background-color: ${skill.bgColor}; color: ${skill.textColor};" title="${skillDescriptions[skill.name] || ''}">
                <span>${skill.name}:</span>
                <input type="number" value="${skill.points}" min="0" max="100"
                    onchange="handleUpdateSkill('${skill.name}', this.value)">
            </div>`).join('');

        console.log("renderTables: Updating innerHTML");
        statsBody.innerHTML = statsHtml;
        skillsBody.innerHTML = skillsHtml;
        console.log("renderTables: Complete.");
    } catch (e) {
        console.error("renderTables: An error occurred.", e);
    }
}
