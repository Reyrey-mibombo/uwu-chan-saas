const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shift_leaderboard')
        .setDescription('Rankings based strictly on active Shift hours.')
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('Filter by weekly or monthly tracked hours.')
                .setRequired(false)
                .addChoices(
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' },
                    { name: 'All-Time', value: 'all_time' }
                )
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const timeframe = interaction.options.getString('timeframe') || 'weekly';

            let dateFilter = {};
            const now = new Date();

            if (timeframe === 'weekly') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                dateFilter = { startTime: { $gte: weekAgo } };
            } else if (timeframe === 'monthly') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                dateFilter = { startTime: { $gte: monthAgo } };
            }

            const shifts = await Shift.find({ guildId: interaction.guildId, ...dateFilter }).lean();

            if (!shifts.length) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No shift data available for the **${timeframe}** timeframe.`)] });
            }

            // Aggregate shift hours per user
            const userHoursMap = new Map();
            shifts.forEach(shift => {
                if (!shift.duration) return;
                const currentMs = userHoursMap.get(shift.userId) || 0;
                userHoursMap.set(shift.userId, currentMs + shift.duration);
            });

            const sortedRanking = Array.from(userHoursMap.entries())
                .sort((a, b) => b[1] - a[1]);

            if (!sortedRanking.length) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No shift data available for the **${timeframe}** timeframe.`)] });
            }

            const perPage = 10;
            const totalPages = Math.ceil(sortedRanking.length / perPage);
            let currentPage = 1;

            const generateEmbed = async (page) => {
                const start = (page - 1) * perPage;
                const pageData = sortedRanking.slice(start, start + perPage);

                const leaderboardText = await Promise.all(pageData.map(async ([userId, durationSecs], index) => {
                    const globalIndex = start + index;
                    const user = await interaction.client.users.fetch(userId).catch(() => null);
                    let medal = `**${globalIndex + 1}.**`;
                    if (globalIndex === 0) medal = '🥇';
                    else if (globalIndex === 1) medal = '🥈';
                    else if (globalIndex === 2) medal = '🥉';

                    const hours = Math.floor(durationSecs / 3600);
                    const minutes = Math.floor((durationSecs % 3600) / 60);

                    return `${medal} **${user?.username || 'Unknown'}** • \`${hours}h ${minutes}m\``;
                }));

                const timeframeDisplay = timeframe.charAt(0).toUpperCase() + timeframe.slice(1).replace('_', '-');

                return await createCustomEmbed(interaction, {
                    title: `⏱️ ${timeframeDisplay} Shift Performance Leaderboard`,
                    description: leaderboardText.join('\n\n') || 'No telemetry recorded for this cycle.',
                    thumbnail: interaction.guild.iconURL({ dynamic: true }),
                    footer: `Page ${page} / ${totalPages} • Verified Duty Hours`,
                    color: 'info'
                });
            };

            const getButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('slb_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId('slb_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages)
                );
            };

            const initialEmbed = await generateEmbed(currentPage);
            const message = await interaction.editReply({
                embeds: [initialEmbed],
                components: totalPages > 1 ? [getButtons(currentPage)] : []
            });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ You cannot use these buttons.', ephemeral: true });
                }

                if (i.customId === 'slb_prev') currentPage--;
                if (i.customId === 'slb_next') currentPage++;

                const newEmbed = await generateEmbed(currentPage);
                await i.update({
                    embeds: [newEmbed],
                    components: [getButtons(currentPage)]
                });
            });

            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('slb_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('slb_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                interaction.editReply({ components: [disabledRow] }).catch(() => { });
            });

        } catch (error) {
            console.error('Shift Leaderboard Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while fetching the shift leaderboard.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
