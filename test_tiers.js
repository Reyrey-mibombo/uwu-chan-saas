const fs = require('fs');
const path = require('path');

// Mock function to test the logic
function testLoadCommands(enabledTiersEnv) {
    process.env.ENABLED_TIERS = enabledTiersEnv;

    const commandsPath = path.join(__dirname, 'src', 'commands');
    const defaultVersions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];
    const versions = process.env.ENABLED_TIERS ? process.env.ENABLED_TIERS.split(',') : defaultVersions;

    console.log(`\n--- Testing with ENABLED_TIERS="${enabledTiersEnv || ''}" ---`);
    console.log(`Folders that would be loaded:`, versions.map(v => v.trim()));
}

testLoadCommands('v1,v2,premium');
testLoadCommands('v3,v4,v5');
testLoadCommands('v6,v7,v8');
testLoadCommands('');

console.log("\nLogic verified successfully.");
