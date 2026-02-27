const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Activity } = require('../../database/mongo.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_chart')
    .setDescription('📊 View server activity analytics and charts')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Chart type to display')
        .setRequired(false)
        .addChoices(
          { name: '📈 Weekly Overview', value: 'weekly' },
          { name: '👥 Member Growth', value: 'members' },
          { name: '💬 Channel Activity', value: 'channels' },
          { name: '⏰ Hourly Heatmap', value: 'heatmap' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const chartType = interaction.options.getString('type') || 'weekly';
    
    try {
      switch(chartType) {
        case 'weekly':
          await sendWeeklyChart(interaction, 7);
          break;
        case 'members':
          await sendMemberGrowth(interaction);
          break;
        case 'channels':
          await sendChannelActivity(interaction);
          break;
        case 'heatmap':
          await sendHourlyHeatmap(interaction);
          break;
      }
    } catch (error) {
      console.error('Activity Chart Error:', error);
      await interaction.editReply({
        content: '❌ Failed to generate chart. Please try again later.',
        components: []
      });
    }
  }
};

// Helper function to generate QuickChart URL without the package
function generateChartUrl(config) {
  const baseUrl = 'https://quickchart.io/chart';
  const chartConfig = encodeURIComponent(JSON.stringify(config));
  return `${baseUrl}?w=800&h=400&bkg=%232c3e50&c=${chartConfig}`;
}

async function sendWeeklyChart(interaction, days) {
  const now = new Date();
  const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate - days * 24 * 60 * 60 * 1000);

  // Fetch data
  const [currentActivities, previousActivities] = await Promise.all([
    Activity.find({ 
      guildId: interaction.guildId, 
      createdAt: { $gte: startDate, $lte: now },
      type: 'message' 
    }).lean(),
    Activity.find({ 
      guildId: interaction.guildId, 
      createdAt: { $gte: prevStartDate, $lt: startDate },
      type: 'message' 
    }).lean()
  ]);

  // Aggregate by day
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDaily = new Array(7).fill(0);
  const previousDaily = new Array(7).fill(0);

  currentActivities.forEach(a => {
    const day = new Date(a.createdAt).getDay();
    currentDaily[day]++;
  });
  
  previousActivities.forEach(a => {
    const day = new Date(a.createdAt).getDay();
    previousDaily[day]++;
  });

  // Calculate stats
  const totalCurrent = currentActivities.length;
  const totalPrevious = previousActivities.length;
  const avgCurrent = (totalCurrent / days).toFixed(1);
  const change = totalPrevious === 0 ? 100 : ((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1);
  const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
  const trendColor = change > 0 ? '#2ecc71' : change < 0 ? '#e74c3c' : '#95a5a6';

  // Top active users
  const userCounts = {};
  currentActivities.forEach(a => {
    if (a.userId) userCounts[a.userId] = (userCounts[a.userId] || 0) + 1;
  });
  
  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([userId, count], index) => {
      const medals = ['🥇', '🥈', '🥉'];
      return `${medals[index]} <@${userId}>: **${count}** msgs`;
    }).join('\n') || 'No data available';

  // Top days
  const avgPerDay = (totalCurrent / 7).toFixed(0);
  const bestDay = daysOfWeek[currentDaily.indexOf(Math.max(...currentDaily))];
  const worstDay = daysOfWeek[currentDaily.indexOf(Math.min(...currentDaily))];

  // Create chart config
  const chartConfig = {
    type: 'bar',
    data: {
      labels: daysOfWeek,
      datasets: [
        {
          label: `Last ${days} Days`,
          data: currentDaily,
          backgroundColor: 'rgba(46, 204, 113, 0.8)',
          borderColor: '#2ecc71',
          borderWidth: 2,
          borderRadius: 4
        },
        {
          label: `Previous ${days} Days`,
          data: previousDaily,
          backgroundColor: 'rgba(149, 165, 166, 0.4)',
          borderColor: '#95a5a6',
          borderWidth: 2,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { 
          labels: { color: '#ffffff', font: { size: 12 } } 
        },
        title: { 
          display: true, 
          text: `Message Activity - ${interaction.guild.name}`,
          color: '#ffffff',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          ticks: { color: '#bdc3c7' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: { 
          ticks: { color: '#bdc3c7' },
          grid: { display: false }
        }
      }
    }
  };

  const chartUrl = generateChartUrl(chartConfig);

  // Build embed
  const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
    .setTitle(`📊 Activity Overview - Last ${days} Days`)
    .setDescription([
      `**${totalCurrent.toLocaleString()}** total messages • **${avgCurrent}** avg/day`,
      `${trend} **${Math.abs(change)}%** ${change > 0 ? 'increase' : 'decrease'} vs previous period`
    ].join('\n'))
    .addFields(
      { 
        name: '📈 Statistics', 
        value: [
          `• Best Day: **${bestDay}**`,
          `• Slowest Day: **${worstDay}**`,
          `• Daily Average: **${avgPerDay}** msgs`
        ].join('\n'), 
        inline: true 
      },
      { 
        name: '👑 Top Contributors', 
        value: topUsers, 
        inline: true 
      },
      { 
        name: '📅 Period', 
        value: `${startDate.toLocaleDateString()} → ${now.toLocaleDateString()}`, 
        inline: false 
      }
    )
    .setImage(chartUrl)
    
    
     
    });

  // Interactive buttons
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('chart_3')
      .setLabel('3 Days')
      .setStyle(days === 3 ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('📅'),
    new ButtonBuilder()
      .setCustomId('chart_7')
      .setLabel('7 Days')
      .setStyle(days === 7 ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('📆'),
    new ButtonBuilder()
      .setCustomId('chart_14')
      .setLabel('14 Days')
      .setStyle(days === 14 ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('🗓️'),
    new ButtonBuilder()
      .setCustomId('chart_30')
      .setLabel('30 Days')
      .setStyle(days === 30 ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('📊')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('refresh_chart')
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('view_channels')
      .setLabel('Channel View')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💬'),
    new ButtonBuilder()
      .setCustomId('view_heatmap')
      .setLabel('Hourly View')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏰')
  );

  const message = await interaction.editReply({ 
    embeds: [embed], 
    components: [row1, row2] 
  });

  // Collector
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: '❌ These buttons are not for you!', ephemeral: true });
    }

    await i.deferUpdate();

    if (i.customId.startsWith('chart_')) {
      const newDays = parseInt(i.customId.split('_')[1]);
      collector.stop();
      await sendWeeklyChart(i, newDays);
    } else if (i.customId === 'refresh_chart') {
      collector.stop();
      await sendWeeklyChart(i, days);
    } else if (i.customId === 'view_channels') {
      collector.stop();
      await sendChannelActivity(i);
    } else if (i.customId === 'view_heatmap') {
      collector.stop();
      await sendHourlyHeatmap(i);
    }
  });

  collector.on('end', () => {
    const disabledRow1 = ActionRowBuilder.from(row1);
    const disabledRow2 = ActionRowBuilder.from(row2);
    
    disabledRow1.components.forEach(btn => btn.setDisabled(true));
    disabledRow2.components.forEach(btn => btn.setDisabled(true));
    
    interaction.editReply({ components: [disabledRow1, disabledRow2] }).catch(() => {});
  });
}

async function sendMemberGrowth(interaction) {
  const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
    .setTitle('👥 Member Growth')
    .setDescription('Member analytics feature coming soon!')
    ;
    
  await interaction.editReply({ embeds: [embed] });
}

async function sendChannelActivity(interaction) {
  const days = 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const activities = await Activity.find({ 
    guildId: interaction.guildId, 
    createdAt: { $gte: startDate },
    type: 'message',
    channelId: { $exists: true }
  }).lean();

  const channelCounts = {};
  activities.forEach(a => {
    if (a.channelId) channelCounts[a.channelId] = (channelCounts[a.channelId] || 0) + 1;
  });

  const sortedChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = [];
  const data = [];
  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e91e63', '#ff5722', '#607d8b'];

  for (let i = 0; i < sortedChannels.length; i++) {
    const [channelId, count] = sortedChannels[i];
    const channel = interaction.guild.channels.cache.get(channelId);
    labels.push(channel ? `#${channel.name}` : 'Unknown');
    data.push(count);
  }

  if (data.length === 0) {
    return interaction.editReply({ content: '❌ No channel activity data found for this period.' });
  }

  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#2c3e50',
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: { 
          position: 'right',
          labels: { color: '#ffffff', font: { size: 11 } } 
        },
        title: {
          display: true,
          text: 'Top Active Channels (7 Days)',
          color: '#ffffff',
          font: { size: 16 }
        }
      }
    }
  };

  const chartUrl = generateChartUrl(chartConfig);

  const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
    .setTitle('💬 Channel Activity')
    .setDescription('Top 10 most active channels this week')
    .setImage(chartUrl)
    
    .addFields(
      sortedChannels.slice(0, 5).map(([channelId, count], i) => {
        const channel = interaction.guild.channels.cache.get(channelId);
        return {
          name: `${i + 1}. ${channel ? channel.name : 'Unknown'}`,
          value: `**${count}** messages`,
          inline: true
        };
      })
    )
    ;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('back_weekly')
      .setLabel('Back to Weekly')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⬅️')
  );

  const msg = await interaction.editReply({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) return;
    await i.deferUpdate();
    collector.stop();
    await sendWeeklyChart(i, 7);
  });
}

async function sendHourlyHeatmap(interaction) {
  const days = 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const activities = await Activity.find({ 
    guildId: interaction.guildId, 
    createdAt: { $gte: startDate },
    type: 'message'
  }).lean();

  const hourlyData = new Array(24).fill(0);
  activities.forEach(a => {
    const hour = new Date(a.createdAt).getHours();
    hourlyData[hour]++;
  });

  const maxActivity = Math.max(...hourlyData);
  const avgActivity = (hourlyData.reduce((a, b) => a + b, 0) / 24).toFixed(0);
  
  const peakHour = hourlyData.indexOf(maxActivity);
  const peakTime = `${peakHour}:00 - ${peakHour + 1}:00`;

  const chartConfig = {
    type: 'bar',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Messages',
        data: hourlyData,
        backgroundColor: hourlyData.map(count => {
          const intensity = count / maxActivity;
          return `rgba(46, 204, 113, ${0.3 + intensity * 0.7})`;
        }),
        borderColor: '#2ecc71',
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Activity by Hour (Last 7 Days)',
          color: '#ffffff',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#bdc3c7' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: {
          ticks: { 
            color: '#bdc3c7',
            maxTicksLimit: 12
          },
          grid: { display: false }
        }
      }
    }
  };

  const chartUrl = generateChartUrl(chartConfig);

  const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
    .setTitle('⏰ Activity Heatmap')
    .setDescription(`Peak activity: **${peakTime}** with **${maxActivity}** messages\nAverage: **${avgActivity}** messages/hour`)
    .setImage(chartUrl)
    
    ;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('back_weekly_heat')
      .setLabel('Back to Weekly')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⬅️')
  );

  const msg = await interaction.editReply({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) return;
    await i.deferUpdate();
    collector.stop();
    await sendWeeklyChart(i, 7);
  });
}