try {
    require('./src/commands/v1/ticketSetup.js');
    console.log("No syntax errors in ticketSetup.js!");
} catch (e) {
    console.error("Syntax Error Details:");
    console.error(e);
}
