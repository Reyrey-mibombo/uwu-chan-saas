const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Staff activity leaderboard rankings')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show (max 25)').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const limit = Math.min(interaction.options.getInteger('limit') || 10, 25);
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
        if (!staffSystem) {
          return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
        }
        leaderboard = await staffSystem.getLeaderboard(interaction.guildId, limit);
        try {
          await redisClient.setEx(cacheKey, 300, JSON.stringify(leaderboard)); // 5 minute cache
        } catch (err) {
          console.error('Redis cache error:', err);
        }
      }

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No staff data available yet. Start earning points!')] });
      }

      const leaderboardText = await Promise.all(leaderboard.map(async (entry, index) => {
        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
        let medal = `**${index + 1}.**`;
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';

        return `${medal} **${user?.username || 'Unknown'}** • \`${entry.points} pts\``;
      }));

      const embed = createCoolEmbed()
        .setTitle('🏆 Top Staff Leaderboard')
        .setDescription(leaderboardText.join('\n\n'))
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setColor('enterprise');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the leaderboard.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
