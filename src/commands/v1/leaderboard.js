const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Staff activity leaderboard rankings')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show').setRequired(false)),

  async execute(interaction, client) {
    const limit = interaction.options.getInteger('limit') || 10;
    const staffSystem = client.systems.staff;
    
    const leaderboard = await staffSystem.getLeaderboard(interaction.guildId, limit);
    
    if (leaderboard.length === 0) {
      return interaction.reply({ content: 'No staff data available yet. Start earning points!', ephemeral: true });
    }
    
    const leaderboardText = await Promise.all(leaderboard.map(async (entry, index) => {
      const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      return `${medal} **${user?.username || 'Unknown'}** - ${entry.points} pts`;
    }));
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🏆 Staff Leaderboard')
      .setDescription(leaderboardText.join('\n'))
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
