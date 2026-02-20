const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_summary')
    .setDescription('Full visual summary of server activity'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const oneDayAgo = new Date(Date.now() - 86400000);
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    const [todayActs, weekActs, guild] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: oneDayAgo } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: oneWeekAgo } }).lean(),
      Guild.findOne({ guildId }).lean()
    ]);

    const membersActive = [...new Set(weekActs.map(a => a.userId))].length;
    const engRate = Math.min(100, Math.round((membersActive / Math.max(interaction.guild.memberCount, 1)) * 100));
    const engBar = '▓'.repeat(Math.round(engRate / 10)) + '░'.repeat(10 - Math.round(engRate / 10));

    const embed = new EmbedBuilder()
      .setTitle('📋 Activity Summary Dashboard')
      .setColor(0x1abc9c)
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '⚡ Today\'s Activity', value: todayActs.length.toString(), inline: true },
        { name: '📅 This Week', value: weekActs.length.toString(), inline: true },
        { name: '👥 Active Users (7d)', value: membersActive.toString(), inline: true },
        { name: '📊 Engagement Rate', value: `\`${engBar}\` **${engRate}%**` },
        { name: '🏅 Commands (all time)', value: (guild?.stats?.commandsUsed || 0).toString(), inline: true },
        { name: '⚠️ Warnings (all time)', value: (guild?.stats?.warnings || 0).toString(), inline: true },
        { name: '👥 Total Members', value: interaction.guild.memberCount.toString(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Live Activity Summary` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
