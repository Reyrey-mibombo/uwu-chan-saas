const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_chart')
    .setDescription('View engagement chart')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 30)').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });

    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = { messages: 0, commands: 0, total: 0 };
    }

    activities.forEach(a => {
      const key = a.createdAt.toISOString().split('T')[0];
      if (dailyData[key]) {
        if (a.type === 'message') dailyData[key].messages++;
        if (a.type === 'command') dailyData[key].commands++;
        dailyData[key].total++;
      }
    });

    const sorted = Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]));
    const chartData = sorted.slice(-14);

    const maxVal = Math.max(...chartData.map(([, d]) => d.total), 1);
    const chart = chartData.map(([date, d]) => {
      const barLen = Math.min(10, Math.floor((d.total / maxVal) * 10));
      const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
      return `${date.slice(5)}: ${bar} (${d.total})`;
    }).join('\n');

    const totalMessages = activities.filter(a => a.type === 'message').length;
    const totalCommands = activities.filter(a => a.type === 'command').length;

    const embed = new EmbedBuilder()
      .setTitle('📈 Engagement Chart')
      .setColor(0x1abc9c)
      .setDescription(chart)
      .addFields(
        { name: 'Total Messages', value: totalMessages.toString(), inline: true },
        { name: 'Total Commands', value: totalCommands.toString(), inline: true },
        { name: 'Period', value: `${days} days`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
