const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('active_shifts')
        .setDescription('View a live dashboard of all staff currently on duty.'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Find all shifts in this guild that haven't ended
            const activeShifts = await Shift.find({
                guildId: interaction.guildId,
                endTime: null
            }).sort({ startTime: 1 }).lean();

            if (!activeShifts || activeShifts.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed('There are currently no staff members on duty.')] });
            }

            const shiftLines = await Promise.all(activeShifts.map(async (shift) => {
                const user = await interaction.client.users.fetch(shift.userId).catch(() => null);
                const username = user ? user.username : 'Unknown Staff';

                const isPaused = shift.status === 'paused';
                const statusEmoji = isPaused ? '⏸️' : '▶️';
                const statusText = isPaused ? '**(PAUSED)**' : '';

                // Calculate UNIX timestamp for Discord's relative formatting
                const startUnix = Math.floor(new Date(shift.startTime).getTime() / 1000);

                return `${statusEmoji} **${username}** ${statusText}\n└ Started: <t:${startUnix}:R> (<t:${startUnix}:T>)`;
            }));

            const embed = await createCustomEmbed(interaction, {
                title: '📡 Live Operational Status',
                description: `Current broadcasting personnel on active duty within **${interaction.guild.name}**.\n\n${shiftLines.join('\n\n')}`,
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                footer: `Status: ${activeShifts.length} node(s) currently transmitting`
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Active Shifts Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while fetching the active shifts dashboard.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
