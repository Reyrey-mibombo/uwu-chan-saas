const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Staff activity leaderboard rankings with interactive pages'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const staffSystem = client.systems.staff;
      const redisClient = require('../../utils/cache');

      // Fetch top 50 for pagination cache
      const fetchLimit = 50;
      const cacheKey = `leaderboard:${interaction.guildId}:${fetchLimit}`;

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
        leaderboard = await staffSystem.getLeaderboard(interaction.guildId, fetchLimit);
        try {
          await redisClient.setEx(cacheKey, 300, JSON.stringify(leaderboard)); // 5 min cache
        } catch (err) {
          console.error('Redis cache error:', err);
        }
      }

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No staff data available yet. Start earning points!')] });
      }

      const perPage = 10;
      const totalPages = Math.ceil(leaderboard.length / perPage);
      let currentPage = 1;

      const generateEmbed = async (page) => {
        const start = (page - 1) * perPage;
        const pageData = leaderboard.slice(start, start + perPage);

        const leaderboardText = await Promise.all(pageData.map(async (entry, index) => {
          const globalIndex = start + index;
          const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
          let medal = `**${globalIndex + 1}.**`;
          if (globalIndex === 0) medal = '🥇';
          else if (globalIndex === 1) medal = '🥈';
          else if (globalIndex === 2) medal = '🥉';

          return `${medal} **${user?.username || 'Unknown'}** • \`${entry.points} pts\``;
        }));

        return await createCustomEmbed(interaction, {
          title: '🏆 Elite Staff Leaderboard',
          description: leaderboardText.join('\n\n') || 'No activity detected within this sector.',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          footer: `Page ${page} / ${totalPages} • Real-time performance ranking`,
          color: 'enterprise'
        });
      };

      const getButtons = (page) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lb_prev')
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId('lb_next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages)
        );
      };

      const initialEmbed = await generateEmbed(currentPage);
      const message = await interaction.editReply({
        embeds: [initialEmbed],
        components: totalPages > 1 ? [getButtons(currentPage)] : []
      });

      if (totalPages <= 1) return;

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ You cannot use these buttons.', ephemeral: true });
        }

        if (i.customId === 'lb_prev') currentPage--;
        if (i.customId === 'lb_next') currentPage++;

        const newEmbed = await generateEmbed(currentPage);
        await i.update({
          embeds: [newEmbed],
          components: [getButtons(currentPage)]
        });
      });

      collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('lb_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        interaction.editReply({ components: [disabledRow] }).catch(() => { });
      });

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
