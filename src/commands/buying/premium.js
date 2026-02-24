const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('View Premium tier benefits and upgrade'),

    async execute(interaction, client) {
        const { Guild } = require('../../database/mongo');
        const guildId = interaction.guildId;
        const guild = await Guild.findOne({ guildId }).lean();
        const currentTier = guild?.premium?.tier || 'free';
        const isActive = currentTier === 'premium' || currentTier === 'enterprise';
        const premiumUrl = process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;

        const embed = new EmbedBuilder()
            .setTitle('💎 Premium Tier')
            .setColor(isActive ? 0x2ecc71 : 0x5865f2)
            .addFields(
                { name: '📊 Status', value: isActive ? '✅ **Active on this server**' : '❌ Not active', inline: true },
                { name: '💰 Tier', value: currentTier.toUpperCase(), inline: true },
                {
                    name: '✨ What Premium Unlocks',
                    value: [
                        '🤖 **Strata2 Bot** access (add it separately)',
                        '⭐ v3 — Premium Staff commands (25)',
                        '🛡️ v4 — Premium Moderation commands (25)',
                        '📊 v5 — Premium Analytics commands (25)',
                        '**Total: 75 additional commands**'
                    ].join('\n')
                },
                {
                    name: '💳 Upgrade',
                    value: isActive
                        ? 'Your server already has Premium or higher!'
                        : premiumUrl
                            ? `[**Click here to upgrade →**](${premiumUrl})`
                            : 'Contact the server owner to upgrade.'
                }
            )
            .setFooter({ text: 'Premium is per-server. Use /buy to see all options.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
