const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history_lookup')
    .setDescription('Lookup user moderation history')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to lookup')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of records')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;
    const guildId = interaction.guildId;

    const history = await Activity.find({
      guildId,
      userId: target.id,
      type: { $in: ['warning', 'command'] }
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    if (history.length === 0) {
      return interaction.reply({ content: `No moderation history found for ${target.tag}.`, ephemeral: true });
    }

    const formatEntry = (entry) => {
      const action = entry.data?.action || entry.type || 'unknown';
      const reason = entry.data?.reason || 'No reason';
      const mod = entry.data?.moderatorId ? `<@${entry.data.moderatorId}>` : 'System';
      const time = entry.createdAt.toLocaleString();
      return `**${action.toUpperCase()}** | ${mod} | ${reason} | ${time}`;
    };

    const embed = new EmbedBuilder()
      .setTitle(`📜 History: ${target.username}`)
      .setColor(0x3498db)
      .setDescription(history.map(formatEntry).join('\n'))
      .setFooter({ text: `Showing ${history.length} entries` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
