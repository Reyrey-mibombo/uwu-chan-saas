const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('low_performance')
    .setDescription('View low performance staff')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const users = await User.find({
      'guilds.guildId': guildId,
      'staff.points': { $exists: true, $gt: 0 }
    })
      .sort({ 'staff.points': 1 })
      .limit(limit)
      .lean();

    if (users.length === 0) {
      await interaction.reply({ content: 'No staff data found.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📉 Low Performance Staff')
      .setColor(0xe74c3c)
      .setDescription(
        users.map((u, i) => {
          const guildData = u.guilds?.find(g => g.guildId === guildId);
          const name = guildData?.nickname || u.username || `User ${u.userId}`;
          return `${i + 1}. ${name} - ${u.staff?.points || 0} points`;
        }).join('\n')
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
