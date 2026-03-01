const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { createLineChart } = require('../../utils/charts'); // Adjusted from pie chart to line chart utility capability

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server_growth')
        .setDescription('View the authentic highly-accurate server activity velocity graph for the past 7 days.'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const DailyActivity = require('../../database/mongo').DailyActivity; // Requires the DailyActivity tracking model

            const now = new Date();
            const last7Days = [];
            const labels = [];

            // Generate the last 7 day strings (YYYY-MM-DD)
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dateStr = d.toISOString().split('T')[0];
                last7Days.push(dateStr);
                // Short label for chart (MM/DD)
                labels.push(`${d.getUTCMonth() + 1}/${d.getUTCDate()}`);
            }

            // Query database for all these dates
            const activityRecords = await DailyActivity.find({
                guildId: interaction.guildId,
                date: { $in: last7Days }
            }).lean();

            // Map DB responses to dates
            const dataPoints = last7Days.map(dateStr => {
                const record = activityRecords.find(r => r.date === dateStr);
                return record ? record.messageCount : 0;
            });

            const sumMessages = dataPoints.reduce((acc, curr) => acc + curr, 0);

            // We use the open QuickChart API to render a custom Line graph
            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Messages Sent',
                        data: dataPoints,
                        backgroundColor: 'rgba(114, 137, 218, 0.2)', // Blurple fill
                        borderColor: 'rgba(114, 137, 218, 1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4, // Smooth Spline curve
                        pointBackgroundColor: '#ffffff',
                        pointRadius: 4
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                        x: { grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                    }
                }
            };

            const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&bkg=transparent&w=600&h=300`;

            const embed = await createCustomEmbed(interaction, {
                title: '📈 Server Activity Growth Tracker',
                description: `Verified tracking of message activity over the trailing 7 days.\n**Total Trailing 7D Activity:** \`${sumMessages}\` Messages`,
                image: chartUrl,
                branding: { footer: 'Source: uwu-chan-saas MongoDB Tracking Engine' }
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Server Growth Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while generating the server growth chart.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
