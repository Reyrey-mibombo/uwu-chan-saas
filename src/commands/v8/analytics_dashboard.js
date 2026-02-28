const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Activity, Guild, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_dashboard')
    .setDescription('Full analytics dashboard with all key metrics'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    const [guild, weekActs, topUser] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      Activity.find({ guildId, createdAt: { $gte: oneWeekAgo } }).lean(),
      User.findOne({}).sort({ 'staff.points': -1 }).lean()
    ]);

    const activeUsers = [...new Set(weekActs.map(a => a.userId))].length;
    const engRate = Math.round((activeUsers / Math.max(interaction.guild.memberCount, 1)) * 100);
    const bar = '▓'.repeat(Math.round(engRate / 10)) + '░'.repeat(10 - Math.round(engRate / 10));
    const stats = guild?.stats || {};

    const embed = createEnterpriseEmbed()
      .setTitle('📊 Full Analytics Dashboard')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '👥 Members', value: interaction.guild.memberCount.toString(), inline: true },
        { name: '✅ Active (7d)', value: activeUsers.toString(), inline: true },
        { name: '📈 Engagement', value: `${engRate}%`, inline: true },
        { name: '⚡ Total Commands', value: (stats.commandsUsed || 0).toString(), inline: true },
        { name: '⚠️ Total Warnings', value: (stats.warnings || 0).toString(), inline: true },
        { name: '💬 Messages', value: (stats.messagesProcessed || 0).toString(), inline: true },
        { name: '🏆 Top Staff', value: topUser ? `**${topUser.username || 'Unknown'}** — ${topUser.staff?.points || 0} pts` : 'No data', inline: true },
        { name: '🎖️ Tier', value: (guild?.premium?.tier || 'free').toUpperCase(), inline: true },
        { name: '📊 Engagement Meter', value: `\`${bar}\` ${engRate}%` }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



