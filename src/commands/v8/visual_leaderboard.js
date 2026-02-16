const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_leaderboard')
    .setDescription('View the visual leaderboard')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show').setMinValue(5).setMaxValue(25)),
  async execute(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;

    const leaderboard = await User.find()
      .sort({ 'staff.points': -1 })
      .limit(limit);

    if (!leaderboard.length) {
      return interaction.reply({ content: 'No users found.', ephemeral: true });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏆 Leaderboard')
      .setDescription(leaderboard.map((u, i) => {
        const pts = u.staff?.points || 0;
        const rank = u.staff?.rank || 'member';
        return `${medals[i] || (i + 1)} **${u.username || 'Unknown'}** - ${pts} pts (${rank})`;
      }).join('\n'));

    await interaction.reply({ embeds: [embed] });
  }
};
