const { SlashCommandBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_list')
        .setDescription('📜 View all authentic rank requirements and point thresholds for this server'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guild = await Guild.findOne({ guildId: interaction.guildId }).lean();

            if (!guild || !guild.promotionRequirements) {
                return interaction.editReply({ embeds: [createErrorEmbed('This server has not configured any promotion requirements.')] });
            }

            const ranks = Object.keys(guild.promotionRequirements);
            if (ranks.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed('No ranks are currently established in the database.')] });
            }

            const rankEmojis = ['🛡️', '🌟', '💎', '👑', '🔥', '🚀'];

            const embed = await createCustomEmbed(interaction, {
                title: '📜 Server Promotion Requirements',
                description: `These are the official qualifications needed to climb the ranks in **${interaction.guild.name}**.`,
                thumbnail: interaction.guild.iconURL({ dynamic: true })
            });

            ranks.forEach((rank, i) => {
                const req = guild.promotionRequirements[rank];
                const emoji = rankEmojis[i % rankEmojis.length];

                const details = [
                    `⭐ **Points:** \`${req.points || 0}\``,
                    `🔄 **Shifts:** \`${req.shifts || 0}\``,
                    `📈 **Consistency:** \`${req.consistency || 0}%\``,
                    req.maxWarnings !== undefined ? `⚠️ **Max Warnings:** \`${req.maxWarnings}\`` : null,
                    req.shiftHours > 0 ? `⏱️ **Min Hours:** \`${req.shiftHours}h\`` : null
                ].filter(Boolean).join('\n');

                embed.addFields({
                    name: `${emoji} ${rank.toUpperCase()}`,
                    value: details,
                    inline: true
                });
            });

            embed.setFooter({ text: 'Promotions are processed automatically upon meeting these targets!' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Promo List Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while fetching the promotion requirements list.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
