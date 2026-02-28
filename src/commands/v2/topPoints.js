const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
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

    const embed = createCoolEmbed()
      .setTitle('🏆 Top Point Earners')
      .setDescription(list)
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



