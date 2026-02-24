const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    try {
        // We expect the Discord client to be passed in through the express app settings
        const client = req.app.get('client');

        if (!client || !client.commands) {
            return res.status(500).json({ success: false, message: 'Discord client commands not initialized yet.' });
        }

        // Map the commands collection into a clean JSON array
        const commandsArray = [];

        client.commands.forEach((cmd) => {
            // Find what version/tier this command belongs to based on the folder logic
            // For Hacka, we map versions to tiers:
            // v4, v5 = Premium
            // v6, v7, v8 = Enterprise
            // The bot's command loader doesn't natively tag commands with tiers, so we'll 
            // add a small fallback tier or try to guess based on description if possible.
            // For now, we will just pass a default category since we don't have the path here.

            let tier = 'Standard';
            if (cmd.data.description.includes('[Premium]')) tier = 'Premium';
            if (cmd.data.description.includes('[Enterprise]')) tier = 'Enterprise';

            commandsArray.push({
                name: `/${cmd.data.name}`,
                desc: cmd.data.description,
                tier: tier
            });
        });

        res.json({
            success: true,
            data: commandsArray
        });
    } catch (error) {
        console.error('[COMMANDS API] Error fetching commands:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch slash commands.' });
    }
});

module.exports = router;
