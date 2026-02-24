const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_visuals')
    .setDescription('Visual overview of recent server events'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const events = await Activity.find({ guildId, type: { $in: ['promotion', 'warning'] }, createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 }).limit(10).lean();

    const promotions = events.filter(e => e.type === 'promotion');
    const warnings = events.filter(e => e.type === 'warning');
    const typeEmojis = { promotion: '⬆️', warning: '⚠️' };

    const timeline = events.length
      ? events.map(e => {
        const ts = Math.floor(new Date(e.createdAt).getTime() / 1000);
        return `${typeEmojis[e.type]} <@${e.userId}> — <t:${ts}:R>`;
      }).join('\n')
      : '📭 No events this week.';

    const embed = new EmbedBuilder()
      .setTitle('🎭 Event Visuals — Last 7 Days')
      .setColor(0x9b59b6)
      .addFields(
        { name: '⬆️ Promotions', value: promotions.length.toString(), inline: true },
        { name: '⚠️ Warnings', value: warnings.length.toString(), inline: true },
        { name: '📋 Total Events', value: events.length.toString(), inline: true },
        { name: '📅 Event Timeline', value: timeline }
      )
      .setFooter({ text: `${interaction.guild.name} • Event Visual Log` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
