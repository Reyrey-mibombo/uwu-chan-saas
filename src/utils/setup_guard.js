const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed } = require('./embeds');
const { Guild } = require('../database/mongo');

/**
 * Checks if a guild is configured and returns a setup embed if not.
 */
async function ensureGuildConfig(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guildId }).lean();

    if (!guildData || !guildData.promo || !guildData.promo.points) {
        const embed = await createCustomEmbed(interaction, {
            title: '📡 System Initialization Required',
            description: `### 🛡️ Operational Standby\nThe **V2 Enterprise Suite** is present but has not been calibrated for the **${interaction.guild.name}** sector. Access to advanced telemetry is limited until initialization is completed.`,
            fields: [
                { name: '⚙️ Status', value: '🟢 `STANDBY` / `UNCONFIGURED`', inline: true },
                { name: '🛠️ Requirement', value: 'Complete the Strategic Calibration', inline: true }
            ],
            footer: 'Initialization ensures data isolation and algorithmic accuracy.',
            color: 'warning'
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Initialize System')
                .setStyle(ButtonStyle.Link)
                .setURL('https://example.com/setup') // Placeholder for real setup dashboard or command link
                .setEmoji('🛠️')
        );

        return { isConfigured: false, embed, components: [row] };
    }

    return { isConfigured: true, guildData };
}

module.exports = { ensureGuildConfig };
