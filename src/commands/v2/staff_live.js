const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_live')
        .setDescription('📡 View a real-time operations board of active staff personnel'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guildId = interaction.guildId;

            // Find all active shifts in this guild
            const activeShifts = await Shift.find({ guildId, endTime: null, status: 'active' }).lean();

            if (activeShifts.length === 0) {
                return interaction.editReply({
                    embeds: [createCustomEmbed(interaction, {
                        title: '📡 Operations Board: STANDBY',
                        description: '### 🛡️ No Active Duty Detected\nCurrently, no personnel are engaged in active sector patrols. Monitoring standby.',
                        color: 'info'
                    })]
                });
            }

            const boardLines = await Promise.all(activeShifts.map(async (s) => {
                const user = await interaction.client.users.fetch(s.userId).catch(() => null);
                const name = user ? user.username : 'Unknown';
                const start = new Date(s.startTime);
                const duration = Math.floor((Date.now() - start) / 60000); // Minutes

                return `🟢 **${name}** — \`${duration}m Active\`\n> Current Objective: *Monitoring Sector...*`;
            }));

            const embed = await createCustomEmbed(interaction, {
                title: '📡 Real-Time Operations Board',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🛡️ Sector Activity Matrix: ${interaction.guild.name}\nAuthorized visualization of active duty personnel currently engaged in operational patrols.`,
                fields: [
                    { name: '🟢 On Duty Personnel', value: boardLines.join('\n\n') || '*Loading telemetry...*', inline: false }
                ],
                footer: `Real-time data • ${activeShifts.length} Active Personnel Logged`,
                color: 'success'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Staff Live Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to query the real-time operations matrix.')] });
        }
    }
};
