const { SlashCommandBuilder } = require('discord.js');
const QuickChart = require('quickchart-js');
const { Activity } = require('../../database/mongo');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activity_chart')
        .setDescription('Displays a real-time, high-fidelity chart of server activity.'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const labels = [];
            const dataPoints = [];

            let totalMessages = 0;
            let peakDay = { date: 'N/A', count: 0 };

            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];

                labels.push(dateStr);

                // Fetch the real activity count from MongoDB for this specific day
                const startOfDay = new Date(d);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(d);
                endOfDay.setHours(23, 59, 59, 999);

                const count = await Activity.countDocuments({
                    guildId: interaction.guild.id,
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                });

                dataPoints.push(count);
                totalMessages += count;

                if (count > peakDay.count) {
                    peakDay = { date: dateStr, count: count };
                }
            }

            const avgMessages = Math.round(totalMessages / 7);

            const chart = new QuickChart();
            chart.setWidth(800).setHeight(400);
            chart.setBackgroundColor('#2b2d31');

            chart.setConfig({
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Activity Events',
                        data: dataPoints,
                        borderColor: '#5865F2',
                        backgroundColor: 'rgba(88, 101, 242, 0.4)',
                        borderWidth: 4,
                        pointBackgroundColor: '#FFFFFF',
                        pointBorderColor: '#5865F2',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    layout: { padding: 20 },
                    plugins: {
                        legend: { labels: { color: "#FFFFFF", font: { family: "sans-serif", size: 14 } } }
                    },
                    scales: {
                        x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#B9BBBE" } },
                        y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#B9BBBE" }, beginAtZero: true }
                    }
                }
            });

            const chartUrl = await chart.getShortUrl();

            const chartEmbed = createCoolEmbed()
                .setTitle('📈 7-Day Server Engagement Dashboard')
                .setDescription('Here is the real-time textual engagement over the last 7 days based on actual logged gateway events.')
                .setImage(chartUrl)
                .setAuthor({
                    name: `${interaction.guild.name} Analytics`,
                    iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
                })
                .addFields(
                    { name: '📊 Total Activity (7d)', value: `**${totalMessages.toLocaleString()}**`, inline: true },
                    { name: '⏱️ Daily Average', value: `**${avgMessages.toLocaleString()}**`, inline: true },
                    { name: '🔥 Peak Activity Day', value: `**${peakDay.date}** (${peakDay.count} events)`, inline: true }
                )
                .setColor('#5865F2');

            await interaction.editReply({ embeds: [chartEmbed] });
        } catch (error) {
            console.error(error);
            const errEmbed = createErrorEmbed('An error occurred while generating the activity chart.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
