const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification_effect')
    .setDescription('View recent notification effects and actions taken'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const events = await Activity.find({ guildId, type: { $in: ['promotion', 'warning'] }, createdAt: { $gte: sevenDaysAgo } }).lean();

    const promotions = events.filter(e => e.type === 'promotion').length;
    const warnings = events.filter(e => e.type === 'warning').length;
    const latest = events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const latestText = latest.length
      ? latest.map(e => `${e.type === 'promotion' ? '⬆️' : '⚠️'} <@${e.userId}> — <t:${Math.floor(new Date(e.createdAt).getTime() / 1000)}:R>`).join('\n')
      : 'No notifications this week.';

    const embed = new EmbedBuilder()
      .setTitle('🔔 Notification Effects')
      .setColor(0x9b59b6)
      .addFields(
        { name: '⬆️ Promotions (7d)', value: promotions.toString(), inline: true },
        { name: '⚠️ Warnings (7d)', value: warnings.toString(), inline: true },
        { name: '📋 Recent Notifications', value: latestText }
      )
      .setFooter({ text: `${interaction.guild.name} • Notification Log` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
