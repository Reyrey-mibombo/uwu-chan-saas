const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('v2_heatmap')
        .setDescription('📈 View a high-fidelity operational traffic heatmap (V2)'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const activities = await Activity.find({
                guildId: interaction.guildId,
                createdAt: { $gte: sevenDaysAgo }
            }).lean();

            if (activities.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed('No spectral data detected within the last 7-day window.')] });
            }

            // Group by Day (0-6)
            const dayMap = [0, 0, 0, 0, 0, 0, 0];
            activities.forEach(a => {
                const day = new Date(a.createdAt).getDay();
                dayMap[day]++;
            });

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const max = Math.max(...dayMap) || 1;

            const chartLines = dayMap.map((val, idx) => {
                const barLen = Math.floor((val / max) * 15);
                const bar = '█'.repeat(barLen) + '░'.repeat(15 - barLen);
                return `\`${days[idx]}\` ${bar} \`[${val.toLocaleString()}]\``;
            });

            const embed = await createCustomEmbed(interaction, {
                title: '📈 Operational Traffic Heatmap',
                description: `### 🛡️ 7-Day Spectral Density\nMacroscopic traffic analysis for the **${interaction.guild.name}** sector. Visualization of engagement throughput.`,
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                fields: [
                    { name: '📊 Distribution Graph', value: chartLines.join('\n'), inline: false },
                    { name: '🔄 Total Telemetry', value: `\`${activities.length.toLocaleString()}\` Events Logged`, inline: true },
                    { name: '📡 Peak Engagement', value: `\`${max.toLocaleString()}\` Ops/Day`, inline: true }
                ],
                footer: 'Heatmap generated using real-time database spectral logs.',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Heatmap error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to generate the spectral density heatmap.')] });
        }
    }
};
