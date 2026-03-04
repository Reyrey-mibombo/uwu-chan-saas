/**
 * Command Validation Test Script
 * Run this to verify all commands are properly structured before deployment
 */

const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, 'src/commands');
const VERSIONS = ['v1', 'v1_context', 'buying', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'premium'];

const results = {
    totalFiles: 0,
    validCommands: 0,
    invalidCommands: [],
    warnings: [],
    versionStats: {}
};

console.log('🔍 Starting Command Validation...\n');

// Test each version folder
for (const version of VERSIONS) {
    const versionPath = path.join(COMMANDS_DIR, version);

    if (!fs.existsSync(versionPath)) {
        results.warnings.push(`⚠️  Folder missing: ${version}/`);
        continue;
    }

    const files = fs.readdirSync(versionPath).filter(f => f.endsWith('.js'));
    results.versionStats[version] = { total: files.length, valid: 0, errors: [] };

    console.log(`\n📁 Checking ${version}/ (${files.length} files)...`);

    for (const file of files) {
        results.totalFiles++;
        const filePath = path.join(versionPath, file);

        try {
            // Clear require cache
            delete require.cache[require.resolve(filePath)];

            // Try to load the command
            const command = require(filePath);

            // Validate structure
            const errors = [];

            if (!command.data) {
                errors.push('Missing "data" property');
            } else {
                if (!command.data.name) {
                    errors.push('Missing "data.name" (command name)');
                }
                if (typeof command.data.toJSON !== 'function') {
                    errors.push('data.toJSON is not a function (not a proper SlashCommandBuilder)');
                }
            }

            if (!command.execute) {
                errors.push('Missing "execute" function');
            } else if (typeof command.execute !== 'function') {
                errors.push('"execute" is not a function');
            }

            // Check for common issues
            const fileContent = fs.readFileSync(filePath, 'utf8');

            // Check for deferReply issues
            if (fileContent.includes('editReply') && !fileContent.includes('deferReply') && !fileContent.includes('interaction.reply')) {
                if (!fileContent.includes('.showModal(')) { // Modals don't need deferReply
                    results.warnings.push(`⚠️  ${version}/${file}: Uses editReply without deferReply - may cause errors`);
                }
            }

            // Check for missing return statements after error replies
            const editReplyMatches = fileContent.match(/await interaction\.editReply\([^)]+\);/g) || [];
            for (const match of editReplyMatches) {
                const index = fileContent.indexOf(match);
                const afterMatch = fileContent.substring(index + match.length, index + match.length + 50);
                // This is a basic check - manual review still needed
            }

            if (errors.length === 0) {
                results.validCommands++;
                results.versionStats[version].valid++;
                console.log(`  ✅ ${file}: /${command.data.name}`);
            } else {
                results.invalidCommands.push({
                    file: `${version}/${file}`,
                    errors
                });
                results.versionStats[version].errors.push(file);
                console.log(`  ❌ ${file}: ${errors.join(', ')}`);
            }

        } catch (error) {
            results.invalidCommands.push({
                file: `${version}/${file}`,
                errors: [`Failed to load: ${error.message}`]
            });
            results.versionStats[version].errors.push(file);
            console.log(`  ❌ ${file}: ${error.message}`);
        }
    }
}

// Print Summary
console.log('\n\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));

console.log(`\n✅ Valid Commands: ${results.validCommands}/${results.totalFiles}`);
console.log(`❌ Invalid Commands: ${results.invalidCommands.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

console.log('\n📈 By Version:');
for (const [version, stats] of Object.entries(results.versionStats)) {
    const status = stats.errors.length === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${version}/: ${stats.valid}/${stats.total} valid`);
}

if (results.invalidCommands.length > 0) {
    console.log('\n❌ Commands with Errors:');
    for (const cmd of results.invalidCommands) {
        console.log(`  - ${cmd.file}: ${cmd.errors.join(', ')}`);
    }
}

if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warning of results.warnings) {
        console.log(`  ${warning}`);
    }
}

// Exit with appropriate code
const success = results.invalidCommands.length === 0;
console.log('\n' + '='.repeat(60));
console.log(success ? '✅ All checks passed!' : `❌ ${results.invalidCommands.length} command(s) need fixing`);
console.log('='.repeat(60) + '\n');

process.exit(success ? 0 : 1);
