const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_visual')
    .setDescription('Full visual leaderboard with progress bars'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(8).lean();
    if (!users.length) return interaction.editReply('📊 No staff data yet.');
    const maxPts = users[0]?.staff?.points || 1;
    const medals = ['🥇', '🥈', '🥉'];
    const chart = users.map((u, i) => {
      const pts = u.staff?.points || 0;
      const bar = '█'.repeat(Math.round((pts / maxPts) * 10)).padEnd(10, '░');
      const rank = medals[i] || `\`${i + 1}\``;
      return `${rank} ${u.username || '?'}: ${bar} ${pts}`;
    }).join('\n');
    const embed = new EmbedBuilder()
      .setTitle('🏆 Visual Leaderboard')
      .setColor(0xf1c40f)
      .setDescription(`\`\`\`${chart}\`\`\``)
      .setFooter({ text: `${interaction.guild.name} • Points Leaderboard` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
