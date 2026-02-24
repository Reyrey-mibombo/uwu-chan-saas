const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top_points')
    .setDescription('[Premium] Show top point earners'),

  async execute(interaction, client) {
    const users = await User.find({ 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1 })
      .limit(10)
      .lean();

    if (!users.length) {
      return interaction.reply({ content: '❌ No staff with points found.', ephemeral: true });
    }

    const list = users.map((u, i) => {
      const medals = ['🥇', '🥈', '🥉'];
      const medal = medals[i] || `\`${i + 1}.\``;
      return `${medal} **${u.username || 'Unknown'}** - ${u.staff?.points || 0} pts`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🏆 Top Point Earners')
      .setDescription(list)
      .setColor(0xf1c40f)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
