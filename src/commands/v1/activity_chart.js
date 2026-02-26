const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo.js');
const QuickChart = require('quickchart-js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_chart')
    .setDescription('View interactive activity charts and stats'),

  async execute(interaction) {
    await interaction.deferReply();
    await sendChart(interaction, 7);
  }
};

async function sendChart(interaction, days) {
  const now = new Date();
  const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate - days * 24 * 60 * 60 * 1000);

  try {
    // Fetch data
    const [currentActivities, previousActivities] = await Promise.all([
      Activity.find({ guildId: interaction.guildId, createdAt: { $gte: startDate, $lte: now } }),
      Activity.find({ guildId: interaction.guildId, createdAt: { $gte: prevStartDate, $lt: startDate } })
    ]);

    // Aggregate by day
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDaily = new Array(7).fill(0);
    const previousDaily = new Array(7).fill(0);

    currentActivities.forEach(a => currentDaily[a.createdAt.getDay()]++);
    previousActivities.forEach(a => previousDaily[a.createdAt.getDay()]++);

    // Stats
    const totalCurrent = currentActivities.length;
    const totalPrevious = previousActivities.length;
    const avgCurrent = (totalCurrent / days).toFixed(1);
    const change = totalPrevious === 0 ? 100 : ((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1);
    const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';

    const topDays = daysOfWeek
      .map((day, i) => ({ day, count: currentDaily[i] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Create chart
    const chart = new QuickChart();
    chart.setConfig({
      type: 'bar',
      data: {
        labels: daysOfWeek,
        datasets: [
          {
            label: `Last ${days} Days`,
            data: currentDaily,
            backgroundColor: 'rgba(46, 204, 113, 0.7)',
            borderColor: '#2ecc71',
            borderWidth: 1
          },
          {
            label: `Previous ${days} Days`,
            data: previousDaily,
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
            borderColor: '#3498db',
            borderWidth: 1
          }
        ]
      },
      options: {
        plugins: {
          title: { display: true, text: `Activity Comparison`, color: '#ffffff' },
          legend: { labels: { color: '#ffffff' } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#ffffff' } },
          x: { ticks: { color: '#ffffff' } }
        }
      }
    });
    chart.setBackgroundColor('transparent');
    chart.setWidth(800).setHeight(400);

    // Use short URL (more reliable than long URL)
    const chartUrl = await chart.getShortUrl();

    const embed = new EmbedBuilder()
      .setTitle(`📊 Activity Overview (Last ${days} Days)`)
      .setDescription(`**${totalCurrent}** total messages • **${avgCurrent}** per day avg`)
      .addFields(
        { name: '📈 Trend', value: `${trend} ${change}% vs previous period`, inline: true },
        { name: '🔥 Top Days', value: topDays.map(d => `${d.day}: ${d.count}`).join('\n'), inline: true },
        { name: '📅 Period', value: `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`, inline: true }
      )
      .setImage(chartUrl)
      .setColor('#2ecc71')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('chart_3').setLabel('3 Days').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('chart_7').setLabel('7 Days').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('chart_14').setLabel('14 Days').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('chart_30').setLabel('30 Days').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.editReply({ embeds: [embed], components: [row] });

    // Collector
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'These buttons are not for you!', ephemeral: true });
      }
      await i.deferUpdate();
      
      if (i.customId === 'refresh') {
        const currentDays = parseInt(i.message.embeds[0].title.match(/\d+/)[0]);
        collector.stop();
        await sendChart(i, currentDays);
      } else {
        collector.stop();
        await sendChart(i, parseInt(i.customId.split('_')[1]));
      }
    });

  } catch (error) {
    console.error('Activity chart error:', error);
    await interaction.editReply({ content: '❌ Error generating chart. Please try again later.' });
  }
}