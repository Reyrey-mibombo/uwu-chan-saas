const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_summary')
    .setDescription('View activity summary')
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
    activities.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });

    const typeList = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type}: ${count}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 Activity Summary')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Activities', value: `${activities.length}`, inline: true }
      );

    if (typeList) {
      embed.addFields({ name: 'By Type', value: typeList, inline: false });
    }

    if (targetUser) {
      embed.setDescription(`User: ${targetUser.username}`);
    }

    await interaction.reply({ embeds: [embed] });
  }
};
