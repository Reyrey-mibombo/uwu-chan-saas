const { SlashCommandBuilder } = require('discord.js');
const QuickChart = require('quickchart-js');
const { Activity } = require('../../database/mongo'); // Use correct import for your model
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activity_chart')
        .setDescription('Displays a real-time, high-fidelity chart of server activity.'),

    async execute(interaction) {
        // Defer the reply to give time for DB query and image generation
        await interaction.deferReply();

        // 1. Generate the last 7 days of dates (YYYY-MM-DD) for our labels
        const labels = [];
        const dataPoints = [];

        let totalMessages = 0;
        let peakDay = { date: 'N/A', count: 0 };

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            labels.push(dateStr);

            // 2. Fetch the real message count from MongoDB for this specific day
            const record = await Activity.findOne({ guildId: interaction.guild.id, date: dateStr });
            const count = record ? record.messageCount : 0;

            dataPoints.push(count);
            totalMessages += count;

            if (count > peakDay.count) {
                peakDay = { date: dateStr, count: count };
            }
        }

        const avgMessages = Math.round(totalMessages / 7);

        // 3. Construct a "Cool" Chart Configuration
        const chart = new QuickChart();
        chart.setWidth(800).setHeight(400);
        chart.setBackgroundColor('#2b2d31'); // Matches Discord dark theme perfectly

        chart.setConfig({
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Messages',
                    data: dataPoints,
                    borderColor: '#5865F2',
                    backgroundColor: 'rgba(88, 101, 242, 0.4)',
                    borderWidth: 4,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#5865F2',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curved lines instead of sharp angles
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

        // 4. Get the Short URL (Prevents Discord API limits from crashing the embed)
        const chartUrl = await chart.getShortUrl();

        // 5. Build the Dynamic Embed UI using centralized utility
        const chartEmbed = createCoolEmbed({
            title: '📈 7-Day Server Engagement Dashboard',
            description: 'Here is the real-time textual engagement over the last 7 days based on actual logged gateway events.',
            color: '#5865F2',
            image: chartUrl,
            author: {
                name: `${interaction.guild.name} Analytics`,
                iconURL: interaction.guild.iconURL({ dynamic: true }) || null
            }
        }).addFields(
            { name: '📊 Total Messages (7d)', value: `**${totalMessages.toLocaleString()}**`, inline: true },
            { name: '⏱️ Daily Average', value: `**${avgMessages.toLocaleString()}**`, inline: true },
            { name: '🔥 Peak Activity Day', value: `**${peakDay.date}** (${peakDay.count} msgs)`, inline: true }
        );

        // 6. Deliver the Dashboard
        await interaction.editReply({ embeds: [chartEmbed] });
    }
};
