const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the staff points leaderboard'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const staffSystem = client.systems.staff;
      const redisClient = require('../../utils/cache');

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
          await redisClient.setEx(cacheKey, 300, JSON.stringify(leaderboard));
        } catch (err) {
          console.error('Redis cache error:', err);
        }
      }

      const totalPoints = leaderboard?.reduce((sum, e) => sum + (e.points || 0), 0) || 0;
      const sectorAvg = leaderboard?.length ? Math.round(totalPoints / leaderboard.length) : 0;

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No staff data available yet. Start a shift to earn points!')] });
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

          let medal = `#${(globalIndex + 1).toString().padStart(2, '0')}`;
          if (globalIndex === 0) medal = '🥇';
          else if (globalIndex === 1) medal = '🥈';
          else if (globalIndex === 2) medal = '🥉';

          const progress = Math.min(10, Math.max(1, Math.round((entry.points / 1000) * 10)));
          const ribbonString = '█'.repeat(progress) + '░'.repeat(10 - progress);

          return `${medal} **${user?.username || 'Unknown'}**\n> \`[${ribbonString}]\` **${(entry.points || 0).toLocaleString()}** pts`;
        }));

        return await createCustomEmbed(interaction, {
          title: '🏆 Staff Leaderboard',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: `**${interaction.guild.name}** - Top performers by points`,
          fields: [
            { name: '📊 Rankings', value: leaderboardText.join('\n') || 'No data', inline: false },
            { name: '📈 Stats', value: `Total Staff: \`${leaderboard.length}\`\nAverage Points: \`${sectorAvg.toLocaleString()}\``, inline: true }
          ],
          footer: `Page ${page}/${totalPages} • uwu-chan`,
          color: 'primary'
        });
      };

      const getButtons = (page) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Primary).setDisabled(page === 1),
          new ButtonBuilder().setCustomId('lb_my_rank').setLabel('👤 My Status').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('lb_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages)
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
        if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not your menu.', ephemeral: true });
        if (i.customId === 'lb_prev') currentPage--;
        if (i.customId === 'lb_next') currentPage++;
        const newEmbed = await generateEmbed(currentPage);
        await i.update({ embeds: [newEmbed], components: [getButtons(currentPage)] });
      });

      collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('lb_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        interaction.editReply({ components: [disabledRow] }).catch(() => { });
      });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ embeds: [createErrorEmbed('Failed to load leaderboard.')] });
    }
  },

  async handleLeaderboardButtons(interaction, client) {
    const { customId, guildId, user } = interaction;
    const staffSystem = client.systems.staff;

    if (customId === 'lb_my_rank') {
      await interaction.deferReply({ ephemeral: true });
      const leaderboard = await staffSystem.getLeaderboard(guildId, 1000); // Fetch all to find rank
      const rankIndex = leaderboard.findIndex(e => e.userId === user.id);

      if (rankIndex === -1) return interaction.editReply({ content: 'You are not yet ranked on the leaderboard. Start a shift to begin!' });

      const entry = leaderboard[rankIndex];
      const embed = await createCustomEmbed(interaction, {
        title: '👤 Personal Standings',
        description: `You are currently ranked **#${rankIndex + 1}** on the server leaderboard.`,
        fields: [
          { name: '✨ Total Points', value: `\`${entry.points.toLocaleString()}\``, inline: true },
          { name: '📊 Percentile', value: `\`${Math.round((1 - (rankIndex / leaderboard.length)) * 100)}%\``, inline: true }
        ],
        color: 'info'
      });
      await interaction.editReply({ embeds: [embed] });
    }
  }
};


