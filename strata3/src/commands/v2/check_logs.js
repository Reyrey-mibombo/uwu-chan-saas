const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_logs')
    .setDescription('Check activity logs')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Log type to filter')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Commands', value: 'command' },
          { name: 'Messages', value: 'message' },
          { name: 'Shifts', value: 'shift' },
          { name: 'Warnings', value: 'warning' },
          { name: 'Promotions', value: 'promotion' }
        ))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of logs to show')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const logType = interaction.options.getString('type') || 'all';
    const limit = Math.min(interaction.options.getInteger('limit') || 10, 50);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const query = {
      guildId,
      createdAt: { $gte: weekAgo }
    };

    if (logType !== 'all') {
      query.type = logType;
    }

    const logs = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    if (logs.length === 0) {
      return interaction.reply({ 
        content: 'No activity logs found for the past week.',
        ephemeral: true 
      });
    }

    const typeCounts = await Activity.aggregate([
      { $match: { guildId, createdAt: { $gte: weekAgo } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const embed = new EmbedBuilder()
      .setTitle('📋 Activity Logs')
      .setColor(0x3498db)
      .setDescription(`Showing ${logs.length} recent logs`);

    const countFields = typeCounts.map(t => ({
      name: t._id.charAt(0).toUpperCase() + t._id.slice(1),
      value: t.count.toString(),
      inline: true
    }));
    embed.addFields(countFields);

    const logList = logs.slice(0, 10).map(log => {
      const icon = log.type === 'command' ? '⚡' : 
                   log.type === 'message' ? '💬' : 
                   log.type === 'shift' ? '⏱️' : 
                   log.type === 'warning' ? '⚠️' : '🎉';
      const date = new Date(log.createdAt).toLocaleString();
      return `${icon} ${log.type} - <@${log.userId}> - ${date}`;
    });

    embed.addFields({ name: 'Recent Activity', value: logList.join('\n') });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
