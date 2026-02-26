const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Activity } = require('../../database/mongo');
const QuickChart = require('quickchart-js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_chart')
    .setDescription('View interactive activity charts and stats'),

  async execute(interaction) {
    await interaction.deferReply(); // Prevent timeout
    
    // Generate initial chart (default 7 days)
    await sendChart(interaction, 7);
  }
};

async function sendChart(interaction, days) {
  const now = new Date();
  const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate - days * 24 * 60 * 60 * 1000);
  
  // Fetch current period data
  const currentActivities = await Activity.find({
    guildId: interaction.guildId,
    createdAt: { $gte: startDate, $lte: now }
  });

  // Fetch previous period data for comparison
  const previousActivities = await Activity.find({
    guildId: interaction.guildId,
    createdAt: { $gte: prevStartDate, $lt: startDate }
  });

  // Prepare daily data for all 7 days of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDaily = new Array(7).fill(0);
  const previousDaily = new Array(7).fill(0);

  currentActivities.forEach(a => {
    const dayIndex = a.createdAt.getDay(); // 0-6
    currentDaily[dayIndex]++;
  });

  previousActivities.forEach(a => {
    const dayIndex = a.createdAt.getDay();
    previousDaily[dayIndex]++;
  });

  // Calculate totals and averages
  const totalCurrent = currentActivities.length;
  const totalPrevious = previousActivities.length;
  const avgCurrent = (totalCurrent / days).toFixed(1);
  const change = totalPrevious === 0 ? 100 : ((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1);
  const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';

  // Find top 3 days
  const dayActivity = daysOfWeek.map((day, i) => ({ day, count: currentDaily[i] }));
  const topDays = dayActivity.sort((a, b) => b.count - a.count).slice(0, 3);

  // Generate bar chart image using QuickChart
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
      title: {
        display: true,
        text: `Activity Comparison (Last ${days} Days vs Previous)`,
        fontColor: '#ffffff'
      },
      legend: { labels: { fontColor: '#ffffff' } },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, fontColor: '#ffffff' } }],
        xAxes: [{ ticks: { fontColor: '#ffffff' } }]
      },
      plugins: {
        datalabels: { display: false }
      }
    }
  });
  chart.setBackgroundColor('transparent'); // Use Discord's dark theme
  chart.setWidth(800).setHeight(400);

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`📊 Activity Overview (Last ${days} Days)`)
    .setDescription(`**${totalCurrent}** total messages • **${avgCurrent}** per day avg`)
    .addFields(
      { name: '📈 Trend', value: `${trend} ${change}% vs previous period`, inline: true },
      { name: '🔥 Top Days', value: topDays.map(d => `${d.day}: ${d.count}`).join('\n'), inline: true },
      { name: '📅 Period', value: `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`, inline: true }
    )
    .setImage(chart.getUrl()) // QuickChart image URL
    .setColor('#2ecc71')
    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();

  // Create interactive buttons
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('chart_3')
        .setLabel('3 Days')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('chart_7')
        .setLabel('7 Days')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('chart_14')
        .setLabel('14 Days')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('chart_30')
        .setLabel('30 Days')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('refresh')
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Secondary)
    );

  const response = await interaction.editReply({ embeds: [embed], components: [row] });

  // Button collector
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000 // 5 minutes
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'These buttons are not for you!', ephemeral: true });
    }

    await i.deferUpdate();
    
    if (i.customId === 'refresh') {
      // Just re-fetch with same days
      await sendChart(i, parseInt(i.message.embeds[0].title.match(/\d+/)[0]));
    } else {
      // Extract days from button customId
      const newDays = parseInt(i.customId.split('_')[1]);
      await sendChart(i, newDays);
    }
  });

  collector.on('end', () => {
    response.edit({ components: [] }).catch(console.error);
  });
}