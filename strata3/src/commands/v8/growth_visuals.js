const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_visuals')
    .setDescription('View growth visuals and trends')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to look back (default 30)').setMinValue(7).setMaxValue(90)),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 30;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const dailyCounts = {};
    activities.forEach(a => {
      const dateKey = a.createdAt.toISOString().split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    });

    const entries = Object.entries(dailyCounts).sort((a, b) => a[0].localeCompare(b[0]));
    const last7Days = entries.slice(-7);
    const prev7Days = entries.slice(-14, -7);

    const last7Total = last7Days.reduce((sum, [, count]) => sum + count, 0);
    const prev7Total = prev7Days.reduce((sum, [, count]) => sum + count, 0);
    const weeklyGrowth = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total * 100).toFixed(1) : 0;

    const maxCount = Math.max(...Object.values(dailyCounts), 1);
    const barLength = 20;
    const chart = entries.slice(-14).map(([date, count]) => {
      const bar = '█'.repeat(Math.ceil((count / maxCount) * barLength));
      const day = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${day}: ${bar} ${count}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 Growth Visuals')
      .setColor(0x3498db)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Activities', value: `${activities.length}`, inline: true },
        { name: 'Weekly Growth', value: `${weeklyGrowth}%`, inline: true },
        { name: 'Daily Average', value: `${(activities.length / days).toFixed(1)}`, inline: true }
      )
      .setDescription(`\`\`\`\n${chart}\n\`\`\``);

    await interaction.reply({ embeds: [embed] });
  }
};
