const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_summary')
    .setDescription('Quick leaderboard summary of top staff'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(5).lean();
    if (!users.length) return interaction.editReply('📊 No staff data yet.');
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const list = users.map((u, i) => `${medals[i]} **${u.username || '?'}** — ${u.staff?.points || 0} pts`).join('\n');
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🏆 Leaderboard Summary')
      
      .setDescription(list)
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
