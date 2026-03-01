const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_list')
    .setDescription('List all staff members and their ranks with interactive pages'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const users = await User.find({
        'staff.rank': { $ne: null, $exists: true }
      }).lean();

      if (!users || !users.length) {
        return interaction.editReply({ embeds: [createErrorEmbed('No staff members found in the database.')] });
      }

      const perPage = 10;
      const totalPages = Math.ceil(users.length / perPage);
      let currentPage = 1;

      const rankOrder = { owner: 1, admin: 2, manager: 3, senior: 4, staff: 5, trial: 6, member: 7 };

      const sorted = users
        .filter(u => u.staff?.rank)
        .sort((a, b) => {
          const rankA = rankOrder[a.staff.rank] || 99;
          const rankB = rankOrder[b.staff.rank] || 99;
          if (rankA !== rankB) return rankA - rankB;
          return (b.staff.points || 0) - (a.staff.points || 0);
        });

      const generateEmbed = (page) => {
        const start = (page - 1) * perPage;
        const staffPage = sorted.slice(start, start + perPage);

        const list = staffPage.map((u, i) => {
          const rank = u.staff?.rank || 'trial';
          const points = u.staff?.points || 0;
          return `\`${String(start + i + 1).padStart(2)}.\` **${u.username || 'Unknown'}** — \`${rank.toUpperCase()}\` • ${points} pts`;
        }).join('\n');

        return createCoolEmbed()
          .setTitle(`👥 Global Staff List (${users.length} Total)`)
          .setDescription(list || 'No staff found on this page.')
          .setFooter({ text: `Page ${page} of ${totalPages}` })
          .setColor('enterprise');
      };

      const getButtons = (page) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages)
        );
      };

      const message = await interaction.editReply({
        embeds: [generateEmbed(currentPage)],
        components: totalPages > 1 ? [getButtons(currentPage)] : []
      });

      if (totalPages <= 1) return;

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000 // 2 minutes interaction time
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ You cannot use these buttons.', ephemeral: true });
        }

        if (i.customId === 'prev_page') currentPage--;
        if (i.customId === 'next_page') currentPage++;

        await i.update({
          embeds: [generateEmbed(currentPage)],
          components: [getButtons(currentPage)]
        });
      });

      collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev_page').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('next_page').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        interaction.editReply({ components: [disabledRow] }).catch(() => { });
      });

    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the staff list.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
