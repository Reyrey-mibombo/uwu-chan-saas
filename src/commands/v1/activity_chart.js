import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Activity } from '../../database/mongo.js'; // Add .js if your imports require it
import QuickChart from 'quickchart-js';

export default {
  data: new SlashCommandBuilder()
    .setName('activity_chart')
    .setDescription('View interactive activity charts and stats'),

  async execute(interaction) {
    await interaction.deferReply(); // Prevent timeout
    await sendChart(interaction, 7);
  }
};

async function sendChart(interaction, days) {
  const now = new Date();
  const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate - days * 24 * 60 * 60 * 1000);

  // Fetch current and previous period data from MongoDB
  const [currentActivities, previousActivities] = await Promise.all([
    Activity.find({ guildId: interaction.guildId, createdAt: { $gte: startDate, $lte: now } }),
    Activity.find({ guildId: interaction.guildId, createdAt: { $gte: prevStartDate, $lt: startDate } })
  ]);

  // Aggregate by day of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDaily = new Array(7).fill(0);
  const previousDaily = new Array(7).fill(0);

  currentActivities.forEach(a => currentDaily[a.createdAt.getDay()]++);
  previousActivities.forEach(a => previousDaily[a.createdAt.getDay()]++);

  // Calculate statistics
  const totalCurrent = currentActivities.length;
  const totalPrevious = previousActivities.length;
  const avgCurrent = (totalCurrent / days).toFixed(1);
  const change = totalPrevious === 0 ? 100 : ((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1);
  const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';

  // Top 3 days
  const topDays = daysOfWeek
    .map((day, i) => ({ day, count: currentDaily[i] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Create a REAL chart image using QuickChart
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
      title: { display: true, text: `Activity Comparison (Last ${days} Days vs Previous)`, fontColor: '#ffffff' },
      legend: { labels: { fontColor: '#ffffff' } },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, fontColor: '#ffffff' } }],
        xAxes: [{ ticks: { fontColor: '#ffffff' } }]
      }
    }
  });
  chart.setBackgroundColor('transparent');
  chart.setWidth(800).setHeight(400);

  // Build the embed
  const embed = new EmbedBuilder()
    .setTitle(`📊 Activity Overview (Last ${days} Days)`)
    .setDescription(`**${totalCurrent}** total messages • **${avgCurrent}** per day avg`)
    .addFields(
      { name: '📈 Trend', value: `${trend} ${change}% vs previous period`, inline: true },
      { name: '🔥 Top Days', value: topDays.map(d => `${d.day}: ${d.count}`).join('\n'), inline: true },
      { name: '📅 Period', value: `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`, inline: true }
    )
    .setImage(chart.getUrl()) // <- This is a real PNG image URL
    .setColor('#2ecc71')
    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();

  // Interactive buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('chart_3').setLabel('3 Days').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('chart_7').setLabel('7 Days').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('chart_14').setLabel('14 Days').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('chart_30').setLabel('30 Days').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary)
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
      const currentDays = parseInt(i.message.embeds[0].title.match(/\d+/)[0]);
      await sendChart(i, currentDays);
    } else {
      await sendChart(i, parseInt(i.customId.split('_')[1]));
    }
  });

  collector.on('end', () => {
    response.edit({ components: [] }).catch(console.error);
  });
}