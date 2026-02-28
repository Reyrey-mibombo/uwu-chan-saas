const { SlashCommandBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_list')
        .setDescription('📜 View all rank requirements and point thresholds for this server'),

    async execute(interaction) {
        await interaction.deferReply();
        const guild = await Guild.findOne({ guildId: interaction.guildId });
        if (!guild) return interaction.editReply('❌ Configuration not found.');

        const embed = createCoolEmbed({
            title: '📜 Server Promotion Requirements',
            description: 'These are the official qualifications needed to climb the ranks in this server.',
            color: 'primary'
        });

        const ranks = ['staff', 'senior', 'manager', 'admin'];
        const rankEmojis = { staff: '🛡️', senior: '🌟', manager: '💎', admin: '👑' };

        ranks.forEach(rank => {
            const req = guild.promotionRequirements?.[rank] || { points: '?', shifts: '?' };
            const details = [
                `⭐ **Points:** ${req.points || 0}`,
                `🔄 **Shifts:** ${req.shifts || 0}`,
                `📈 **Consistency:** ${req.consistency || 0}%`,
                req.maxWarnings !== undefined ? `⚠️ **Max Warnings:** ${req.maxWarnings}` : null,
                req.shiftHours > 0 ? `⏱️ **Min Hours:** ${req.shiftHours}h` : null
            ].filter(Boolean).join('\n');

            embed.addFields({
                name: `${rankEmojis[rank] || ''} ${rank.toUpperCase()}`,
                value: details || 'Requirements not set.',
                inline: true
            });
        });

        embed.setFooter({ text: 'Promotions are processed automatically upon meeting these targets!' });

        await interaction.editReply({ embeds: [embed] });
    }
};
