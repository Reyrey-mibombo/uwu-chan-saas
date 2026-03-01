const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboards')
    .setDescription('View algorithmic server leaderboards ranking operational staff.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Parameter to index')
        .setRequired(false)
        .addChoices(
          { name: 'Cumulative Points', value: 'points' },
          { name: 'Output Consistency', value: 'consistency' },
          { name: 'Staff Reputation', value: 'reputation' }
        ))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of operators to rank')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(25)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const type = interaction.options.getString('type') || 'points';
      const limit = interaction.options.getInteger('limit') || 10;

      // Force explicit Data Sandboxing logic
      const users = await User.find({
        guildId,
        staff: { $exists: true }
      }).lean();

      if (!users.length) {
        return interaction.editReply({ embeds: [createErrorEmbed('No valid staff targets have been registered in this server to generate a leaderboard against.')] });
      }

      let sortedUsers = users
        .filter(u => u.staff)
        .sort((a, b) => {
          if (type === 'points') return (b.staff?.points || 0) - (a.staff?.points || 0);
          if (type === 'consistency') return (b.staff?.consistency || 0) - (a.staff?.consistency || 0);
          if (type === 'reputation') return (b.staff?.reputation || 0) - (a.staff?.reputation || 0);
          return 0;
        })
        .slice(0, limit);

      if (sortedUsers.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff targets mapped against the \`${type}\` tracking metric.`)] });
      }

      const leaderboardEntries = [];
      const medals = ['🥇', '🥈', '🥉'];

      for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        let value = '0';

        if (type === 'points') value = `**${user.staff?.points || 0}** Pts`;
        else if (type === 'consistency') value = `**${user.staff?.consistency || 0}%** Logged`;
        else if (type === 'reputation') value = `**${user.staff?.reputation || 0}** Nodes`;

        const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
        leaderboardEntries.push(`${medal} <@${user.userId}> ➔ ${value}`);
      }

      const embed = await createCustomEmbed(interaction, {
        title: `🏆 Server Index: ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: `Computing the top ${sortedUsers.length} ranking hierarchies currently deployed.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '📊 Operational Outputs', value: leaderboardEntries.join('\n'), inline: false }
        ]
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Leaderboards Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred parsing the global indexed hierarchy lists.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
