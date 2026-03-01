const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed } = require('./embeds');
const { Guild } = require('../database/mongo');

/**
 * Enforces Premium/Enterprise license checks for high-tier commands.
 * Returns { allowed: boolean, embed: Embed, components: ActionRow[] }
 */
async function validatePremiumLicense(interaction) {
    const guildId = interaction.guildId;
    const guildData = await Guild.findOne({ guildId }).lean();

    const isPremium = guildData?.premium?.isActive || false;
    const tier = guildData?.premium?.tier || 'free';

    if (!isPremium || tier === 'free') {
        const embed = await createCustomEmbed(interaction, {
            title: '🚫 Access Denied: Premium Subscription Required',
            thumbnail: interaction.guild.iconURL({ dynamic: true }),
            description: `### 🔐 Restricted High-Tier Analytics\nThe **Zenith Executive Suite (V3-V5)** is an exclusive operational deck reserved for authorized buyers and premium server instances.\n\nYour current sector is operating on a **Free Tier** license. Macroscopic intelligence and advanced threat neutralization require a valid upgrade.`,
            fields: [
                { name: '⚖️ License Status', value: '`🔴 UNAUTHORIZED`', inline: true },
                { name: '💎 Required Tier', value: '`Premium` or `Enterprise`', inline: true },
                { name: '🛠️ Resolution', value: 'Upgrade your sector license via the dashboard.', inline: false }
            ],
            footer: 'Zenith Premium Enforcement • V5 Infrastructure',
            color: 'premium'
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Upgrade License')
                .setStyle(ButtonStyle.Link)
                .setURL('https://example.com/premium') // Placeholder for real buy link
                .setEmoji('💎'),
            new ButtonBuilder()
                .setLabel('View Features')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('view_premium_features')
                .setEmoji('📊')
        );

        return { allowed: false, embed, components: [row] };
    }

    return { allowed: true, guildData };
}

module.exports = { validatePremiumLicense };
