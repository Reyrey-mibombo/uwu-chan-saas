const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_showcase')
    .setDescription('Showcase top staff members'),
  async execute(interaction) {
    const staff = await User.find({ 'staff.rank': { $ne: 'member' } })
      .sort({ 'staff.points': -1 })
      .limit(10);

    if (!staff.length) {
      return interaction.reply({ content: 'No staff members found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x9370DB)
      .setTitle('Staff Showcase')
      .setDescription(staff.map((u, i) => {
        const rank = u.staff?.rank || 'member';
        const points = u.staff?.points || 0;
        return `${i + 1}. **${u.username || 'Unknown'}** - ${rank} (${points} pts)`;
      }).join('\n'));

    await interaction.reply({ embeds: [embed] });
  }
};
