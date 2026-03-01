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

      // STRICT SCOPING: Only query users tracked inside THIS specific Discord server
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

        let username = u.username;
        if (!username) {
          const fetched = await interaction.client.users.fetch(u.userId).catch(() => null);
          username = fetched ? fetched.username : 'Unknown Personnel';
        }

        return `${position} **${username}** — \`${u.staff?.points?.toLocaleString() || 0}\` **PTS**`;
      }));

      const embed = await createCustomEmbed(interaction, {
        title: '🏆 Enterprise Economy Leaderboard',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `High-value personnel within the **${interaction.guild.name}** sector:\n\n${list.join('\n')}\n\n*Rankings are updated in real-time based on local server performance.*`,
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

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
