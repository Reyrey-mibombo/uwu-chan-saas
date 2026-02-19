const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_summary')
    .setDescription('View interactive summary of activity')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)'))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to look back (default 7)').setMinValue(1).setMaxValue(30)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days') || 7;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = { guildId, createdAt: { $gte: startDate } };
    if (targetUser) query.userId = targetUser.id;

    const activities = await Activity.find(query).sort({ createdAt: -1 });

    const typeCounts = {};
    const hourlyCounts = Array(24).fill(0);
    activities.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      hourlyCounts[a.createdAt.getHours()]++;
    });

    const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));
    const peakCount = Math.max(...hourlyCounts);
    const totalActivities = activities.length;

    const embed = new EmbedBuilder()
      .setTitle('📋 Interactive Summary')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Activities', value: `${totalActivities}`, inline: true },
        { name: 'Peak Hour', value: `${peakHour}:00 (${peakCount})`, inline: true },
        { name: 'Avg/Day', value: `${(totalActivities / days).toFixed(1)}`, inline: true }
      );

    if (Object.keys(typeCounts).length > 0) {
      const typeList = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `${type}: ${count}`)
        .join('\n');
      embed.addFields({ name: 'By Type', value: typeList, inline: false });
    }

    const hourlyBars = hourlyCounts.map((c, h) => {
      const bar = c > 0 ? '█'.repeat(Math.ceil((c / peakCount) * 10)) : '░';
      return `${h.toString().padStart(2, '0')}: ${bar}`;
    }).join('\n');
    embed.addFields({ name: 'Hourly Distribution', value: `\`\`\`\n${hourlyBars}\n\`\`\``, inline: false });

    if (targetUser) {
      embed.setDescription(`User: ${targetUser.username}`);
      embed.setThumbnail(targetUser.displayAvatarURL());
    }

    await interaction.reply({ embeds: [embed] });
  }
};
