const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification_log')
    .setDescription('View recent automated notification events')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries (default 10)').setRequired(false).setMinValue(1).setMaxValue(25)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const events = await Activity.find({ guildId, type: { $in: ['promotion', 'warning'] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (!events.length) {
      return interaction.editReply('📋 No automated notification events found yet.');
    }

    const typeEmoji = { promotion: '⬆️', warning: '⚠️' };
    const logLines = events.map(e => {
      const ts = Math.floor(new Date(e.createdAt).getTime() / 1000);
      return `${typeEmoji[e.type] || '📋'} <@${e.userId}> — **${e.type}** — <t:${ts}:R>`;
    }).join('\n');

    const promotions = events.filter(e => e.type === 'promotion').length;
    const warnings = events.filter(e => e.type === 'warning').length;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`📋 Notification Log — Last ${limit} Events`)
      
      .addFields(
        { name: '⬆️ Promotions', value: promotions.toString(), inline: true },
        { name: '⚠️ Warnings', value: warnings.toString(), inline: true },
        { name: '📋 Log', value: logLines }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
