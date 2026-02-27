const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audit_logs')
    .setDescription('View audit logs')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter by user')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Filter by action type')
        .setRequired(false)
        .addChoices(
          { name: 'Warning', value: 'warning' },
          { name: 'Ban', value: 'ban' },
          { name: 'Kick', value: 'kick' },
          { name: 'Mute', value: 'mute' },
          { name: 'Command', value: 'command' }
        ))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of logs to show')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const limit = interaction.options.getInteger('limit') || 10;
    const guildId = interaction.guildId;

    const query = { guildId };
    if (user) query.userId = user.id;
    if (type) query.type = type;

    const logs = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    if (logs.length === 0) {
      return interaction.reply({ content: 'No audit logs found.', ephemeral: true });
    }

    const formatLog = (log) => {
      const user = log.userId ? `<@${log.userId}>` : 'Unknown';
      const mod = log.data?.moderatorId ? `<@${log.data.moderatorId}>` : 'System';
      const action = log.type || log.data?.action || 'unknown';
      const reason = log.data?.reason || 'No reason';
      const time = log.createdAt.toLocaleString();
      return `**${action.toUpperCase()}** | ${user} | ${mod} | ${reason} | ${time}`;
    };

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📋 Audit Logs')
      
      .setDescription(logs.map(formatLog).join('\n'))
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
