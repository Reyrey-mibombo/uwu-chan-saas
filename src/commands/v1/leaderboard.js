const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Staff activity leaderboard rankings')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show').setRequired(false)),

  async execute(interaction, client) {
    const limit = interaction.options.getInteger('limit') || 10;
    const staffSystem = client.systems.staff;
    const redisClient = require('../../utils/cache');
    const cacheKey = `leaderboard:${interaction.guildId}:${limit}`;

    let leaderboard;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) leaderboard = JSON.parse(cached);
    } catch (err) {
      console.error('Redis cache error:', err);
    }

    if (!leaderboard) {
      leaderboard = await staffSystem.getLeaderboard(interaction.guildId, limit);
      try {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(leaderboard)); // 5 minute cache
      } catch (err) {
        console.error('Redis cache error:', err);
      }
    }

    if (leaderboard.length === 0) {
      return interaction.reply({ content: 'No staff data available yet. Start earning points!', ephemeral: true });
    }

    const leaderboardText = await Promise.all(leaderboard.map(async (entry, index) => {
      const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
      return `${medal} **${user?.username || 'Unknown'}** - \`${entry.points} pts\``;
    }));

    const embed = createCoolEmbed({
      title: '🏆 Staff Leaderboard',
      description: leaderboardText.join('\n\n'),
      color: 'enterprise'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
