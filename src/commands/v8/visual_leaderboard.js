const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_leaderboard')
    .setDescription('Full visual leaderboard with all stats'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(10).lean();
    if (!users.length) return interaction.editReply('📊 No staff data yet.');
    const maxPts = users[0]?.staff?.points || 1;
    const medals = ['🥇', '🥈', '🥉'];
    const rows = users.map((u, i) => {
      const pts = u.staff?.points || 0;
      const bar = '█'.repeat(Math.round(pts / maxPts * 10)).padEnd(10, '░');
      const medal = medals[i] || `\`${String(i + 1).padStart(2)}\``;
      return `${medal} **${u.username || '?'}** [${u.staff?.rank || '?'}] \`${bar}\` **${pts}**`;
    }).join('\n');
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🏆 Visual Leaderboard')
      
      .setDescription(rows)
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
