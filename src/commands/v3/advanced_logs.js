const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advanced_logs')
    .setDescription('View advanced moderation logs')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of logs to show')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 20;

    const logs = await Activity.find({ 
      guildId,
      type: { $in: ['command', 'warning', 'message'] }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    if (logs.length === 0) {
      return interaction.reply({ content: 'No logs found for this server.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Advanced Moderation Logs')
      .setColor(0x3498db)
      .setDescription(`Showing ${logs.length} recent logs`);

    const logTypes = {
      command: '🔧 Command',
      warning: '⚠️ Warning',
      message: '💬 Message',
      shift: '⏰ Shift',
      promotion: '⬆️ Promotion'
    };

    const logEntries = logs.map(log => {
      const type = logTypes[log.type] || log.type;
      const date = new Date(log.createdAt).toLocaleString();
      const dataStr = log.data ? JSON.stringify(log.data).substring(0, 50) : '';
      return `**${type}** - ${date}\n${dataStr}`;
    });

    embed.addFields({ name: 'Recent Activity', value: logEntries.join('\n\n') || 'No activity', inline: false });

    const commandCount = await Activity.countDocuments({ guildId, type: 'command' });
    const warningCount = await Activity.countDocuments({ guildId, type: 'warning' });
    
    embed.addFields(
      { name: 'Total Commands', value: commandCount.toString(), inline: true },
      { name: 'Total Warnings', value: warningCount.toString(), inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  }
};
