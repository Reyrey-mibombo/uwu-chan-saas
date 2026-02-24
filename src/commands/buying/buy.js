const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('View pricing and upgrade your server to Premium or Enterprise'),

    async execute(interaction, client) {
        const { Guild } = require('../../database/mongo');
        const guildId = interaction.guildId;
        const guild = await Guild.findOne({ guildId }).lean();
        const currentTier = guild?.premium?.tier || 'free';

        const premiumUrl = process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;
        const enterpriseUrl = process.env.ENTERPRISE_CHECKOUT_URL || premiumUrl || null;

        const embed = new EmbedBuilder()
            .setTitle('🛒 Upgrade Your Server')
            .setColor(0x5865f2)
            .setThumbnail(interaction.guild.iconURL())
            .addFields(
                {
                    name: `💎 Premium Tier ${currentTier === 'premium' || currentTier === 'enterprise' ? '✅ (Active)' : ''}`,
                    value: [
                        '**Unlocks:** v3, v4, v5 commands (75 commands)',
                        '• Advanced moderation tools',
                        '• Staff performance analytics',
                        '• Premium reports & tracking',
                        premiumUrl ? `\n[**→ Buy Premium**](${premiumUrl})` : '• Contact server owner to upgrade'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: `🌟 Enterprise Tier ${currentTier === 'enterprise' ? '✅ (Active)' : ''}`,
                    value: [
                        '**Unlocks:** v6, v7, v8 commands (175 commands total)',
                        '• AI-powered insights & forecasting',
                        '• Full automation ecosystem',
                        '• Visual dashboards & heatmaps',
                        '• Elite badges & season rewards',
                        enterpriseUrl ? `\n[**→ Buy Enterprise**](${enterpriseUrl})` : '• Contact server owner to upgrade'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 Your Current Tier',
                    value: `**${currentTier.toUpperCase()}**`,
                    inline: true
                }
            )
            .setFooter({ text: 'Upgrades apply instantly across all Strata bots' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
