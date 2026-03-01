const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Zenith Hyper-Apex: Macroscopic Sector Activity Rankings'),

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
        return interaction.editReply({ embeds: [createErrorEmbed('No staff data available yet. Start engaging to record signals.')] });
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

          let medal = `\`[${(globalIndex + 1).toString().padStart(2, '0')}]\``;
          if (globalIndex === 0) medal = '🥇';
          else if (globalIndex === 1) medal = '🥈';
          else if (globalIndex === 2) medal = '🥉';

          const progress = Math.min(15, Math.max(1, Math.round((entry.points / 1000) * 15)));
          const ribbonString = '█'.repeat(progress) + '░'.repeat(15 - progress);

          return `${medal} **${user?.username || 'Unknown'}**\n> \`[${ribbonString}]\` **${(entry.points || 0).toLocaleString()} pts**`;
        }));

        return await createCustomEmbed(interaction, {
          title: '🏆 Zenith Hyper-Apex: Elite Sector Rankings',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: `### 🛡️ Macroscopic Merit Registry\nReal-time performance rankings for the **${interaction.guild.name}** sector. Current Sector Average: \`${sectorAvg.toLocaleString()}\` merit.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
          fields: [
            { name: '📜 Performance Feed', value: leaderboardText.join('\n') || 'No activity detected.', inline: false }
          ],
          footer: `Page ${page} / ${totalPages} • Universal Merit Leaderboard • V1 Foundation Hyper-Apex`,
          color: 'premium'
        });
      };

      const getButtons = (page) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 1),
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
        if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Access Denied.', ephemeral: true });
        if (i.customId === 'lb_prev') currentPage--;
        if (i.customId === 'lb_next') currentPage++;
        const newEmbed = await generateEmbed(currentPage);
        await i.update({ embeds: [newEmbed], components: [getButtons(currentPage)] });
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
      await interaction.editReply({ embeds: [createErrorEmbed('Leaderboard failure: Unable to synchronize sector merit rankings.')] });
    }
  }
};
