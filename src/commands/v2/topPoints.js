const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top_points')
    .setDescription('[Premium] Show the authentic top point earners inside this server'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Macroscopic Analytics
      const totalStaff = await User.countDocuments({ guildId: interaction.guildId, 'staff.points': { $gt: 0 } });
      const avgPointsData = await User.aggregate([
        { $match: { guildId: interaction.guildId, 'staff.points': { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$staff.points" } } }
      ]);
      const avgPoints = avgPointsData[0]?.avg || 0;

      // Initial Fetch (Page 1)
      const users = await User.find({ guildId: interaction.guildId, 'staff.points': { $gt: 0 } })
        .sort({ 'staff.points': -1 })
        .limit(10)
        .lean();

      if (!users || users.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No staff members have accumulated any points in this server yet.')] });
      }

      const list = await Promise.all(users.map(async (u, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        const position = medals[i] || `\`#${i + 1}\``;
        return `${position} **${u.username || 'Unknown'}** — \`${u.staff?.points?.toLocaleString() || 0}\` **PTS**`;
      }));

      const embed = await createCustomEmbed(interaction, {
        title: '🏆 Macroscopic Economy Leaderboard',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Sector Performance Ranking\nHigh-value personnel within the **${interaction.guild.name}** sector hierarchy.\n\n${list.join('\n')}`,
        fields: [
          { name: '👤 Staff Capacity', value: `\`${totalStaff.toLocaleString()}\` Members`, inline: true },
          { name: '📊 Average Yield', value: `\`${Math.round(avgPoints).toLocaleString()}\` PTS`, inline: true }
        ],
        footer: 'Paginated Interface • Use buttons below to navigate personnel registry.',
        color: 'premium'
      });

      // Add Pagination Buttons in V2 Expansion logic
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('top_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('top_next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(totalStaff <= 10)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Top Points Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while rendering the points leaderboard.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
