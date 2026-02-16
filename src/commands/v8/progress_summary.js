const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_summary')
    .setDescription('View progress summary')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)'))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze (default 30)').setMinValue(1).setMaxValue(90)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days') || 30;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = { guildId, createdAt: { $gte: startDate } };
    if (targetUser) query.userId = targetUser.id;

    const activities = await Activity.find(query).sort({ createdAt: -1 });

    const typeCounts = { command: 0, message: 0, shift: 0, warning: 0, promotion: 0 };
    activities.forEach(a => {
      if (typeCounts[a.type] !== undefined) typeCounts[a.type]++;
    });

    const userQuery = targetUser ? { userId: targetUser.id } : {};
    const userActivities = await Activity.find({ ...userQuery, guildId }).sort({ createdAt -1 });
    const lastActivity = userActivities[0];

    const dailyAvg = (activities.length / days).toFixed(1);
    const total = activities.length;

    const embed = new EmbedBuilder()
      .setTitle('📋 Progress Summary')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Activities', value: `${total}`, inline: true },
        { name: 'Daily Average', value: dailyAvg, inline: true }
      );

    const typeList = Object.entries(typeCounts)
      .filter(([, v]) => v > 0)
      .map(([type, count]) => `${type}: ${count}`)
      .join('\n');
    if (typeList) {
      embed.addFields({ name: 'By Type', value: typeList, inline: false });
    }

    if (lastActivity) {
      embed.addFields({ name: 'Last Activity', value: new Date(lastActivity.createdAt).toLocaleString(), inline: true });
    }

    if (targetUser) {
      embed.setDescription(`Progress for: **${targetUser.username}**`);
    }

    await interaction.reply({ embeds: [embed] });
  }
};
