const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification_log')
    .setDescription('View notification activity log')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of logs (max 25)'))
    .addUserOption(opt => opt.setName('user').setDescription('Filter by user')),
  async execute(interaction, client) {
    const limit = Math.min(interaction.options.getInteger('limit') || 10, 25);
    const targetUser = interaction.options.getUser('user');

    const query = {
      guildId: interaction.guild.id,
      type: { $in: ['notification', 'alert', 'reminder'] }
    };
    if (targetUser) query.userId = targetUser.id;

    const logs = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const embed = new EmbedBuilder()
      .setTitle('🔔 Notification Log')
      .setColor(0x95a5a6);

    if (logs.length === 0) {
      embed.setDescription('No notifications found.');
    } else {
      embed.setDescription(logs.map(l => 
        `• ${l.type}: ${l.data?.message || 'N/A'} - ${new Date(l.createdAt).toLocaleString()}`
      ).join('\n'));
      embed.addFields({ name: 'Total', value: `${logs.length} notifications`, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
