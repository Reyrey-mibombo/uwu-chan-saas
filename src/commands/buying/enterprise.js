const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enterprise')
        .setDescription('View Enterprise tier benefits and upgrade'),

    async execute(interaction, client) {
        const { Guild } = require('../../database/mongo');
        const guildId = interaction.guildId;
        const guild = await Guild.findOne({ guildId }).lean();
        const currentTier = guild?.premium?.tier || 'free';
        const isEnterprise = currentTier === 'enterprise';
        const enterpriseUrl = process.env.ENTERPRISE_CHECKOUT_URL || process.env.STRIPE_CHECKOUT_URL || process.env.PAYPAL_CHECKOUT_URL || null;

        const embed = createCoolEmbed()
            .setTitle('🌟 Enterprise Tier')
            
            .addFields(
                { name: '📊 Status', value: isEnterprise ? '✅ **Active on this server**' : '❌ Not active', inline: true },
                { name: '💰 Tier', value: currentTier.toUpperCase(), inline: true },
                {
                    name: '✨ What Enterprise Unlocks',
                    value: [
                        '🤖 **Strata3 Bot** access (add it separately)',
                        '📈 v6 — Advanced Insights (25 commands)',
                        '⚙️ v7 — Automation Ecosystem (25 commands)',
                        '👑 v8 — Ultimate Visual Experience (50 commands)',
                        '**Total: 100 enterprise commands**',
                        '',
                        '🔥 AI forecasting, visual dashboards, heatmaps,',
                        'elite badges, season rewards, auto-promotion flows & more'
                    ].join('\n')
                },
                {
                    name: '💳 Upgrade',
                    value: isEnterprise
                        ? 'Your server already has Enterprise!'
                        : enterpriseUrl
                            ? `[**Click here to upgrade to Enterprise →**](${enterpriseUrl})`
                            : 'Contact the server owner to upgrade.'
                }
            )
            
            ;

        await interaction.reply({ embeds: [embed] });
    }
};



