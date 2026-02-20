const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_summary')
    .setDescription('View server engagement summary'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [guild, weekActivity] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean()
    ]);

    const memberCount = interaction.guild.memberCount;
    const activeUsers = [...new Set(weekActivity.map(a => a.userId))].length;
    const engagementRate = memberCount > 0 ? ((activeUsers / memberCount) * 100).toFixed(1) : '0';

    const stats = guild?.stats || {};
    const cmdToday = weekActivity.filter(a => {
      const d = new Date(a.createdAt);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return d >= today && a.type === 'command';
    }).length;

    const bar = '▓'.repeat(Math.round(parseFloat(engagementRate) / 10)) + '░'.repeat(10 - Math.round(parseFloat(engagementRate) / 10));

    const embed = new EmbedBuilder()
      .setTitle('💬 Engagement Summary')
      .setColor(0x1abc9c)
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '👥 Total Members', value: memberCount.toString(), inline: true },
        { name: '✅ Active This Week', value: activeUsers.toString(), inline: true },
        { name: '📊 Engagement Rate', value: `${engagementRate}%`, inline: true },
        { name: '⚡ Commands Today', value: cmdToday.toString(), inline: true },
        { name: '💬 Messages Processed', value: (stats.messagesProcessed || 0).toString(), inline: true },
        { name: '🏅 Total Commands Used', value: (stats.commandsUsed || 0).toString(), inline: true },
        { name: '📈 Engagement Bar', value: `\`${bar}\` ${engagementRate}%` }
      )
      .setFooter({ text: `${interaction.guild.name} • Engagement Summary` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
