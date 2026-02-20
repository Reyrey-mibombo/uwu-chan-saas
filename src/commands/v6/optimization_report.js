const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optimization_report')
    .setDescription('Identify underperforming staff and optimization opportunities'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [users, recentWarnings] = await Promise.all([
      User.find({ 'staff.points': { $gte: 0 } }).lean(),
      Warning.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean()
    ]);

    if (!users.length) {
      return interaction.editReply('📊 No staff data found yet.');
    }

    const warnMap = {};
    recentWarnings.forEach(w => { warnMap[w.userId] = (warnMap[w.userId] || 0) + 1; });

    const lowPerformers = users
      .filter(u => (u.staff?.points || 0) < 10 || (warnMap[u.userId] || 0) > 2)
      .sort((a, b) => (a.staff?.points || 0) - (b.staff?.points || 0))
      .slice(0, 5);

    const topPerformers = users
      .sort((a, b) => (b.staff?.points || 0) - (a.staff?.points || 0))
      .slice(0, 3);

    const avgPoints = users.length > 0
      ? (users.reduce((s, u) => s + (u.staff?.points || 0), 0) / users.length).toFixed(1)
      : '0';

    const lowText = lowPerformers.length
      ? lowPerformers.map(u => `• **${u.username || 'Unknown'}** — ${u.staff?.points || 0} pts, ${warnMap[u.userId] || 0} warns`).join('\n')
      : '✅ No underperforming staff found!';

    const topText = topPerformers.map(u => `• **${u.username || 'Unknown'}** — ${u.staff?.points || 0} pts`).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🔧 Optimization Report')
      .setColor(0xe67e22)
      .addFields(
        { name: '👥 Staff Tracked', value: users.length.toString(), inline: true },
        { name: '📊 Average Points', value: avgPoints, inline: true },
        { name: '⚠️ Warnings (30d)', value: recentWarnings.length.toString(), inline: true },
        { name: '⬇️ Needs Attention', value: lowText },
        { name: '🏆 Top Performers', value: topText }
      )
      .setFooter({ text: `${interaction.guild.name} • Optimization Report` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
