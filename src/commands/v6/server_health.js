const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Guild, Warning, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_health')
    .setDescription('View overall server health and statistics'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const oneDayAgo = new Date(Date.now() - 86400000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [guild, todayActivity, weekActivity, activeShifts] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      Activity.countDocuments({ guildId, createdAt: { $gte: oneDayAgo } }),
      Activity.countDocuments({ guildId, createdAt: { $gte: sevenDaysAgo } }),
      Shift.countDocuments({ guildId, endTime: null })
    ]);

    const stats = guild?.stats || {};
    const memberCount = interaction.guild.memberCount;
    const tier = guild?.premium?.tier || 'free';

    const score = Math.min(100, Math.round(
      (Math.min(todayActivity, 50) / 50 * 40) +
      (Math.min(memberCount, 100) / 100 * 30) +
      (activeShifts > 0 ? 20 : 0) +
      (tier !== 'free' ? 10 : 0)
    ));

    const healthBar = '▓'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10));
    const healthEmoji = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🔴';

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = createEnterpriseEmbed()
      .setTitle(`${healthEmoji} Server Health Report`)
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '💊 Health Score', value: `\`${healthBar}\` ${score}/100`, inline: false },
        { name: '👥 Members', value: memberCount.toString(), inline: true },
        { name: '⚡ Activity Today', value: todayActivity.toString(), inline: true },
        { name: '📅 Activity (7d)', value: weekActivity.toString(), inline: true },
        { name: '🔄 Active Shifts', value: activeShifts.toString(), inline: true },
        { name: '🎖️ Premium Tier', value: tier.toUpperCase(), inline: true },
        { name: '🤖 Bot Uptime', value: `${hours}h ${minutes}m`, inline: true },
        { name: '📊 Total Commands Used', value: (stats.commandsUsed || 0).toString(), inline: true },
        { name: '⚠️ Total Warnings', value: (stats.warnings || 0).toString(), inline: true },
        { name: '📨 Messages Processed', value: (stats.messagesProcessed || 0).toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



