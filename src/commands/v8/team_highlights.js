const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team_highlights')
    .setDescription('View team highlights'),
  async execute(interaction) {
    const teamMembers = await User.find({ 
      'staff.rank': { $in: ['moderator', 'senior', 'admin', 'owner'] } 
    }).sort({ 'staff.points': -1 }).limit(10);

    if (!teamMembers.length) {
      return interaction.reply({ content: 'No team members found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x1E90FF)
      .setTitle('Team Highlights')
      .setDescription(teamMembers.map((u, i) => {
        const rank = u.staff?.rank || 'member';
        const shiftTime = u.staff?.shiftTime || 0;
        const consistency = u.staff?.consistency || 100;
        return `${i + 1}. **${u.username || 'Unknown'}** - ${rank}\n   ⏱ ${shiftTime}h | ✅ ${consistency}%`;
      }).join('\n'));

    await interaction.reply({ embeds: [embed] });
  }
};
