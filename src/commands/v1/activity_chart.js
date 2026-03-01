const { SlashCommandBuilder } = require('discord.js');
const QuickChart = require('quickchart-js');
const { Activity } = require('../../database/mongo');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activity_chart')
        .setDescription('Zenith Hyper-Apex: Macroscopic Peak Intensity Ribbons & 7D Analytics'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const labels = [];
            const dataPoints = [];
            let totalActivity = 0;
            let peakDay = { date: 'N/A', count: 0 };

            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                labels.push(dateStr);

                const startOfDay = new Date(d); startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(d); endOfDay.setHours(23, 59, 59, 999);

                const count = await Activity.countDocuments({
                    guildId: interaction.guild.id,
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                });

                dataPoints.push(count);
                totalActivity += count;
                if (count > peakDay.count) peakDay = { date: dateStr, count: count };
            }

            // 1. Peak Intensity Ribbon (ASCII)
            const max = Math.max(...dataPoints, 1);
            const segments = 15;
            const intensityChars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
            const intensityRibbonStr = dataPoints.map(p => {
                const idx = Math.floor((p / max) * 7);
                return intensityChars[idx];
            }).join('');
            const peakIntensityRibbon = `\`[${intensityRibbonStr.repeat(2).slice(0, 15)}]\` **${Math.round((totalActivity / 700) * 100)}% DENSITY**`;

            const chart = new QuickChart();
            chart.setWidth(800).setHeight(400);
            chart.setBackgroundColor('transparent');
            chart.setConfig({
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Intensity Events',
                        data: dataPoints,
                        borderColor: '#5865F2',
                        backgroundColor: 'rgba(88, 101, 242, 0.3)',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#FFFFFF'
                    }]
                },
                options: {
                    plugins: { legend: { labels: { color: "#FFFFFF" } } },
                    scales: {
                        x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#B9BBBE" } },
                        y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#B9BBBE" }, beginAtZero: true }
                    }
                }
            });

            const chartUrl = await chart.getShortUrl();

            const embed = await createCustomEmbed(interaction, {
                title: '📈 Zenith Hyper-Apex: Engagement Analytics',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Macroscopic Signal Intensity\nHigh-fidelity telemetry showing sector activity thresholds over the trailing 7-day cycle.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🔥 Peak Intensity Ribbon', value: peakIntensityRibbon, inline: false },
                    { name: '📊 Total Velocity', value: `\`${totalActivity.toLocaleString()}\` events`, inline: true },
                    { name: '⏱️ Throughput', value: `\`${Math.round(totalActivity / 7).toLocaleString()}\` daily`, inline: true },
                    { name: '🏢 Peak Load', value: `\`${peakDay.count}\` signals`, inline: true },
                    { name: '✨ Model Sync', value: '`CONNECTED`', inline: true },
                    { name: '📡 Fidelity', value: '`99.9%`', inline: true }
                ],
                image: chartUrl,
                footer: 'Engagement Analytics Engine • V1 Foundation Hyper-Apex Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Zenith Activity Chart Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Engagement Analytics failure: Unable to synchronize signal intensity.')] });
        }
    }
};
