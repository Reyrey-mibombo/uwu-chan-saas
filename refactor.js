const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, 'src', 'commands');

function getEmbedFactory(version) {
    if (['v1', 'v2', 'buying'].includes(version)) return 'createCoolEmbed';
    if (['v3', 'v4', 'v5'].includes(version)) return 'createPremiumEmbed';
    if (['v6', 'v7', 'v8'].includes(version)) return 'createEnterpriseEmbed';
    return 'createCoolEmbed';
}

function processDirectory(directory) {
    const items = fs.readdirSync(directory);

    for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (item.endsWith('.js')) {
            const parentFolder = path.basename(directory);
            refactorFile(fullPath, parentFolder);
        }
    }
}

function refactorFile(filePath, version) {
    let content = fs.readFileSync(filePath, 'utf8');

    const embedFactory = getEmbedFactory(version);

    // Calculate relative path to utils/embeds.js
    // Default is 2 levels up if it's in src/commands/v1
    // Wait, src/commands is 1, v1 is 2. So ../../utils/embeds
    let relativeLevels = '../../utils/embeds';
    if (filePath.includes('buying')) {
        relativeLevels = '../../utils/embeds';
    }

    // Find where to inject the require
    // Usually right after "async execute(interaction, client) {"
    const executeRegex = /(async\s+execute\s*\([^)]*\)\s*\{)/;

    const standardEmbedRegex = /const\s+embed\s*=\s*new\s+EmbedBuilder\(\)[\s\S]*?\.setTimestamp\(\)/;

    if (standardEmbedRegex.test(content)) {
        content = content.replace(standardEmbedRegex, `const embed = ${embedFactory}()`);

        // Inject the require statement manually into the execute block if not exists
        if (!content.includes(embedFactory)) {
            content = content.replace(executeRegex, `$1\n    const { ${embedFactory} } = require('${relativeLevels}');`);
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Refactored: ${filePath}`);
    }
}

processDirectory(commandsPath);
console.log('Bulk refactoring complete.');
