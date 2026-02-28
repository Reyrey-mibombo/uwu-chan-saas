const fs = require('fs');
const files = ['src/commands/v1/ticketLogs.js', 'src/commands/v1/ticketSetup.js'];

files.forEach(f => {
    try {
        require('./' + f);
        console.log(f + " loaded successfully!");
    } catch (e) {
        console.log(f + " THREW AN ERROR:");
        console.log(e);
    }
});
