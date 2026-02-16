const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View staff leaderboard')
    .addIntegerOption(option => 
      option.setName('limit')
        .setDescription('Number of top staff to show')
        .setMinValue(3)
        .setMaxValue(20)
        .setRequired(false)),

  async execute(interaction, client) {
    const limit = interaction.options.getInteger('limit') || 10;
    const staffSystem = client.systems.staffSystem;
    const leaderboard = await staffSystem.getLeaderboard(interaction.guildId, limit);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Staff Leaderboard')
      .setColor(0xf1c40f)
      .setDescription(
        leaderboard.map((entry, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
          return `${medal} **${index + 1}.** <@${entry.userId}> - ${entry.points} points`;
        }).join('\n')
      )
      .setFooter({ text: '💎 Premium users get detailed analytics and historical data!' });

    await interaction.reply({ embeds: [embed] });
  }
};
