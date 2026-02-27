const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild, Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_dashboard')
    .setDescription('Full interactive server dashboard with all key stats'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 86400000);

    const [guild, weekActs, topStaff] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
      User.findOne({}).sort({ 'staff.points': -1 }).lean()
    ]);

    const memberCount = interaction.guild.memberCount;
    const activeUsers = [...new Set(weekActs.map(a => a.userId))].length;
    const engRate = Math.round((activeUsers / Math.max(memberCount, 1)) * 100);
    const uptime = process.uptime();
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
    const stats = guild?.stats || {};
    const engBar = '▓'.repeat(Math.round(engRate / 10)) + '░'.repeat(10 - Math.round(engRate / 10));

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🖥️ Interactive Dashboard')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '👥 Members', value: memberCount.toString(), inline: true },
        { name: '✅ Active (7d)', value: activeUsers.toString(), inline: true },
        { name: '📊 Engagement', value: `\`${engBar}\` ${engRate}%`, inline: false },
        { name: '⚡ Commands Used', value: (stats.commandsUsed || 0).toString(), inline: true },
        { name: '⚠️ Warnings', value: (stats.warnings || 0).toString(), inline: true },
        { name: '🤖 Bot Uptime', value: uptimeStr, inline: true },
        { name: '🏆 Top Staff', value: topStaff ? `**${topStaff.username || '?'}** — ${topStaff.staff?.points || 0} pts` : 'No data', inline: true },
        { name: '🎖️ Premium', value: (guild?.premium?.tier || 'free').toUpperCase(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
