const { createCustomEmbed } = require('./embeds');
const { Guild } = require('../database/mongo');

/**
 * High-fidelity Milestone Broadcasting Engine
 * Automatically transmits high-impact alerts for rank-ups and achievements.
 */
async function broadcastMilestone(interaction, type, data) {
    try {
        const guildData = await Guild.findOne({ guildId: interaction.guildId }).lean();
        if (!guildData || !guildData.settings?.alerts?.channelId) return;

        const channel = interaction.guild.channels.cache.get(guildData.settings.alerts.channelId);
        if (!channel) return;

        let embedData = {};

        if (type === 'ACHIEVEMENT') {
            embedData = {
                title: '🏆 Strategic Merit Broadcast',
                description: `### 🛡️ High-Value Achievement Unlocked\nThe high-command has officially recognized <@${data.userId}> for exemplary service.`,
                fields: [
                    { name: '🏅 Achievement', value: `\`${data.achievement}\``, inline: true },
                    { name: '👤 Personnel', value: `<@${data.userId}>`, inline: true },
                    { name: '🎖️ Authorized By', value: `<@${interaction.user.id}>`, inline: true }
                ],
                color: 'success',
                thumbnail: 'https://i.imgur.com/8QpX8qQ.png' // Placeholder for medal icon
            };
        }

        if (type === 'RANK_UP') {
            embedData = {
                title: '📈 Personnel Advancement Alert',
                description: `### 🛡️ Rank Classification Uplift\nA tactical advancement has been confirmed for <@${data.userId}> following a successful service evaluation.`,
                fields: [
                    { name: '📂 New Classification', value: `\`${data.newRank.toUpperCase()}\``, inline: true },
                    { name: '👤 Personnel', value: `<@${data.userId}>`, inline: true },
                    { name: '⭐ Strategic Impact', value: 'High', inline: true }
                ],
                color: 'premium',
                thumbnail: 'https://i.imgur.com/w9O6RNo.png' // Placeholder for rank icon
            };
        }

        const embed = await createCustomEmbed(interaction, {
            ...embedData,
            footer: 'Automated Milestone Broadcast • V2 Enterprise Intelligence'
        });

        await channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Milestone Broadcast Error:', error);
    }
}

module.exports = { broadcastMilestone };
