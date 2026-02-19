const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation_logs')
    .setDescription('View moderation logs')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of logs to show')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const logs = await Activity.find({ 
      guildId, 
      type: 'warning' 
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    if (logs.length === 0) {
      return interaction.reply({ content: 'No moderation logs found.', ephemeral: true });
    }

    const formatLog = (log) => {
      const user = `<@${log.userId}>`;
      const mod = `<@${log.data?.moderatorId || 'Unknown'}>`;
      const action = log.data?.action || 'warning';
      const reason = log.data?.reason || 'No reason';
      const time = log.createdAt.toLocaleString();
      return `**${action.toUpperCase()}** | ${user} | ${mod} | ${reason} | ${time}`;
    };

    const embed = new EmbedBuilder()
      .setTitle('📋 Moderation Logs')
      .setColor(0xe74c3c)
      .setDescription(logs.map(formatLog).join('\n'))
      .setFooter({ text: `Showing ${logs.length} entries` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
