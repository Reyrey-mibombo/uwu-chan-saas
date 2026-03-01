const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
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
      const user = log.userId ? `<@${log.userId}>` : '`Unknown Node`';
      const mod = log.data?.moderatorId ? `<@${log.data.moderatorId}>` : '`SYSTEM`';
      const action = log.type || log.data?.action || 'unknown';
      const reason = log.data?.reason || 'No Reason Provided';
      const time = log.createdAt.toLocaleString();
      return `\`[${time}]\` **${action.toUpperCase()}** | User: ${user} | Auth: ${mod}\n> Reason: *${reason}*`;
    };

    const embed = await createCustomEmbed(interaction, {
      title: '📋 Guardian Security Ledger',
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      description: `### 🛡️ Operational Audit Node: ${interaction.guild.name}\nChronological trace of authenticated security interventions and system events. Filtering results for authorized personnel.`,
      fields: [
        { name: '📑 High-Fidelity Audit Output', value: logs.map(formatLog).join('\n\n') || '*No logged signals detected in the active registry.*', inline: false }
      ],
      footer: 'Authorized Security Audit Log • V4 Guardian Suite',
      color: 'premium'
    });

    await interaction.reply({ embeds: [embed] });
  }

