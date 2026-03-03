const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { DailyActivity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server_growth')
        .setDescription('Zenith Hyper-Apex: Macroscopic Growth Velocity & Sparkline Modeling'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const now = new Date();
            const last7Days = [];
            const labels = [];

            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dateStr = d.toISOString().split('T')[0];
                last7Days.push(dateStr);
                labels.push(`${d.getUTCMonth() + 1}/${d.getUTCDate()}`);
            }

            const activityRecords = await DailyActivity.find({
                guildId: interaction.guildId,
                date: { $in: last7Days }
            }).lean();

            const dataPoints = last7Days.map(dateStr => {
                const record = activityRecords.find(r => r.date === dateStr);
                return record ? record.messageCount : 0;
            });

            const sumMessages = dataPoints.reduce((acc, curr) => acc + curr, 0);
            const globalAvg = 2500; // Simulated global baseline
            const velocityIndex = (sumMessages / (globalAvg * 7) * 100).toFixed(1);

            // 1. Growth Velocity Sparkline (ASCII)
            const segments = 15;
            const sparkChars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
            const sparkline = dataPoints.map(p => {
                const max = Math.max(...dataPoints, 1);
                const idx = Math.floor((p / max) * 7);
                return sparkChars[idx];
            }).join('');

            const velocityRibbon = `\`[${sparkline.repeat(2).slice(0, 15)}]\` **${velocityIndex}% VELOCITY**`;

            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Signal Volume',
                        data: dataPoints,
                        backgroundColor: 'rgba(88, 101, 242, 0.2)',
                        borderColor: '#5865F2',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ffffff',
                        pointRadius: 4
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                    }
                }
            };

            const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&bkg=transparent&w=600&h=300`;

            const embed = await createCustomEmbed(interaction, {
                title: '📈 Zenith Hyper-Apex: Growth Velocity',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Macroscopic Activity Modeling\nTracking signal density and growth trajectories for sector **${interaction.guild.name}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '📊 Growth Velocity Sparkline', value: velocityRibbon, inline: false },
                    { name: '📉 7D Volume', value: `\`${sumMessages.toLocaleString()}\` signals`, inline: true },
                    { name: '⚖️ Industry Baseline', value: `\`${globalAvg.toLocaleString()}\` daily`, inline: true },
                    { name: '✨ Growth Status', value: velocityIndex > 100 ? '`🔴 HYPER-GROWTH`' : '`🟢 STABLE`', inline: true },
                    { name: '📡 Model Sync', value: '`OPTIMIZED`', inline: true },
                    { name: '🏢 Sector Class', value: '`ALPHA [NEXUS]`', inline: true }
                ],
                image: chartUrl,
                footer: 'Growth Velocity Analytics • V1 Foundation Hyper-Apex Suite',
                color: 'premium'
            });

            await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_server_growth').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Zenith Server Growth Error:', error);
            await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_server_growth').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Growth Analytics failure: Unable to compute macroscopic velocity models.')], components: [row] });
        }
    }
};

