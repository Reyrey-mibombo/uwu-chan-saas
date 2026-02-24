const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scoreboard')
    .setDescription('View the top 10 staff leaderboard by points'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({ 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1 })
      .limit(10)
      .lean();

    if (!users.length) {
      return interaction.editReply('📊 No staff with points found yet. Staff earn points by using bot commands.');
    }

    const medals = ['🥇', '🥈', '🥉'];
    const leaderboard = users.map((u, i) => {
      const medal = medals[i] || `\`${String(i + 1).padStart(2)}\``;
      const rankBadge = u.staff?.rank ? `[${u.staff.rank}]` : '';
      return `${medal} **${u.username || 'Unknown'}** ${rankBadge} — **${u.staff?.points || 0}** pts | ${u.staff?.consistency || 100}% consistency`;
    }).join('\n');

    const totalPoints = users.reduce((s, u) => s + (u.staff?.points || 0), 0);
    const topScore = users[0]?.staff?.points || 0;

    const embed = new EmbedBuilder()
      .setTitle('🏆 Staff Scoreboard')
      .setColor(0xf1c40f)
      .setDescription(leaderboard)
      .addFields(
        { name: '⭐ Top Score', value: topScore.toString(), inline: true },
        { name: '📊 Total Points (Top 10)', value: totalPoints.toString(), inline: true },
        { name: '👥 Staff on Board', value: users.length.toString(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Points Scoreboard` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
