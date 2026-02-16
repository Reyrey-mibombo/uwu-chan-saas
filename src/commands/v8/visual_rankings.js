const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_rankings')
    .setDescription('View user rankings')
    .addStringOption(opt => opt.setName('sort').setDescription('Sort by')
      .addChoices({ name: 'Points', value: 'points' }, { name: 'Reputation', value: 'reputation' }, { name: 'Shift Time', value: 'shiftTime' })),
  async execute(interaction) {
    const sortBy = interaction.options.getString('sort') || 'points';
    const sortField = `staff.${sortBy}`;

    const rankings = await User.find()
      .sort({ [sortField]: -1 })
      .limit(15);

    if (!rankings.length) {
      return interaction.reply({ content: 'No users found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x8B4513)
      .setTitle(`Rankings by ${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`)
      .setDescription(rankings.map((u, i) => {
        const val = u.staff?.[sortBy] || 0;
        return `${i + 1}. **${u.username || 'Unknown'}** - ${val}`;
      }).join('\n'));

    await interaction.reply({ embeds: [embed] });
  }
};
