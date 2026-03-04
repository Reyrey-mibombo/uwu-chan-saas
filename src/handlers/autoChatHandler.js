const { Guild } = require('../database/mongo');
const { createCustomEmbed } = require('../utils/enhancedEmbeds');

async function initAutoChat(client) {
    console.log('🤖 Auto-Chat System initialized.');

    // Check every minute
    setInterval(async () => {
        try {
            const guilds = await Guild.find({ 'autoChatConfig.enabled': true });

            for (const guildData of guilds) {
                const config = guildData.autoChatConfig;
                if (!config.enabled || !config.channelId || !config.messages.length) continue;

                const now = new Date();
                const nextSent = config.nextSent || new Date(0);

                if (now >= nextSent) {
                    const channel = await client.channels.fetch(config.channelId).catch(() => null);
                    if (!channel) continue;

                    // Pick a random message
                    const message = config.messages[Math.floor(Math.random() * config.messages.length)];

                    const embed = await createCustomEmbed({ guild: { name: guildData.name } }, {
                        title: '📢 Community Broadcast',
                        description: message,
                        color: 'primary',
                        footer: '💡 Automated Message'
                    });

                    await channel.send({ embeds: [embed] }).catch(console.error);

                    // Update lastSent and nextSent
                    const intervalMs = (config.interval || 60) * 60 * 1000;
                    guildData.autoChatConfig.lastSent = now;
                    guildData.autoChatConfig.nextSent = new Date(now.getTime() + intervalMs);
                    await guildData.save();
                }
            }
        } catch (error) {
            console.error('Auto-Chat Error:', error);
        }
    }, 60000); // Check every 60 seconds
}

module.exports = { initAutoChat };
