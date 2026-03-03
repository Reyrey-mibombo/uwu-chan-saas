const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_live')
        .setDescription('View currently active staff on duty'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guildId = interaction.guildId;

            const activeShifts = await Shift.find({ guildId, endTime: null, status: 'active' }).lean();

            if (activeShifts.length === 0) {
                return interaction.editReply({
                    embeds: [createCustomEmbed(interaction, {
                        title: '📡 No Staff On Duty',
                        description: 'Currently no staff members are on duty.',
                        color: 'info'
                    })]
                });
            }

            const boardLines = await Promise.all(activeShifts.map(async (s) => {
                const user = await interaction.client.users.fetch(s.userId).catch(() => null);
                const name = user ? user.username : 'Unknown';
                const start = new Date(s.startTime);
                const duration = Math.floor((Date.now() - start) / 60000);

                return `🟢 **${name}** — \`${duration}m active\``;
            }));

            const embed = await createCustomEmbed(interaction, {
                title: '📡 Staff On Duty',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `Active staff in **${interaction.guild.name}**`,
                fields: [
                    { name: '🟢 On Duty', value: boardLines.join('\n') || 'None', inline: false }
                ],
                footer: `${activeShifts.length} staff on duty`,
                color: 'success'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_live').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Staff Live Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_live').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to load staff on duty.')], components: [row] });
        }
    }
};

