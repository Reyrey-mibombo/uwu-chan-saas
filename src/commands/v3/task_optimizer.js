const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_optimizer')
    .setDescription('Algorithmic analysis parsing operational workloads over tracking vectors. ')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Algorithmic trailing window limiting the footprint')
        .setRequired(false)
        .addChoices(
          { name: '7 Day Aggregator', value: '7' },
          { name: '14 Day Standard', value: '14' },
          { name: '30 Day Global Bounds', value: '30' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const period = parseInt(interaction.options.getString('period') || '14');

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - period);

      const activities = await Activity.find({
        guildId,
        type: { $in: ['command', 'message', 'warning'] },
        createdAt: { $gte: daysAgo }
      }).lean();

      // Secure mapping
      const users = await User.find({
        guildId,
        staff: { $exists: true }
      }).lean();

      if (users.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff hierarchy deployed globally across this server to optimize tasks against.`)] });
      }

      const userActivityCounts = {};
      activities.forEach(a => {
        if (!userActivityCounts[a.userId]) userActivityCounts[a.userId] = { commands: 0, messages: 0, warnings: 0, total: 0 };
        if (a.type === 'command') userActivityCounts[a.userId].commands++;
        if (a.type === 'message') userActivityCounts[a.userId].messages++;
        if (a.type === 'warning') userActivityCounts[a.userId].warnings++;
        // Weighted total bounds
        userActivityCounts[a.userId].total++;
      });

      const userStats = users.map(u => {
        const activity = userActivityCounts[u.userId] || { commands: 0, messages: 0, warnings: 0, total: 0 };
        return {
          userId: u.userId,
          username: u.username,
          rank: u.staff?.rank || 'member',
          points: u.staff?.points || 0,
          ...activity
        };
      });

      const sortedByActivity = [...userStats].sort((a, b) => b.total - a.total);
      const sortedByEfficiency = userStats
        .map(u => ({
          ...u,
          efficiency: u.warnings > 0 ? (u.commands / u.warnings) : u.commands || 0
        }))
        .sort((a, b) => b.efficiency - a.efficiency);

      const embedPayload = {
        title: `🎯 Algorithmic Processing Engine`,
        description: `Aggregating hierarchical execution statistics logged within the trailing **${period} Day** vector.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '✅ Executed Commands', value: `\`${activities.filter(a => a.type === 'command').length}\` Invocations`, inline: true },
          { name: '💬 Total Processed', value: `\`${activities.filter(a => a.type === 'message').length}\` Chat Events`, inline: true },
          { name: '⚠️ Mitigated Warnings', value: `\`${activities.filter(a => a.type === 'warning').length}\` Global Flags`, inline: true }
        ]
      };

      if (sortedByActivity.length > 0 && sortedByActivity[0].total > 0) {
        const topActive = sortedByActivity.slice(0, 5).map(u => `<@${u.userId}> ➔ \`${u.total}\` Ops`);
        embedPayload.fields.push({ name: '⭐ High-Volume Executors', value: topActive.join('\n'), inline: false });
      }

      if (sortedByEfficiency.length > 0 && sortedByEfficiency[0].efficiency > 0) {
        const topEfficient = sortedByEfficiency.slice(0, 5).map(u => `<@${u.userId}> ➔ \`${u.efficiency.toFixed(1)}\` Ratio Output`);
        embedPayload.fields.push({ name: '📈 Clean Vector Matrix', value: topEfficient.join('\n'), inline: false });
      }

      const suggestions = generateTaskSuggestions(userStats, period);
      embedPayload.fields.push({ name: '🔧 Backend Automation Review', value: suggestions, inline: false });

      const embed = await createCustomEmbed(interaction, embedPayload);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Task Optimizer Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error occurred generating hierarchical yield optimization states.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

function generateTaskSuggestions(userStats, period) {
  const suggestions = [];

  const inactive = userStats.filter(u => u.total === 0);
  if (inactive.length > 0) {
    suggestions.push(`> 🔴 **Dead Nodes:** ${inactive.length} staff currently map to ZERO execution traces over this queried vector.`);
  }

  const highWarning = userStats.filter(u => u.warnings > 5);
  if (highWarning.length > 0) {
    suggestions.push(`> ⚠️ **Severely Flagged Targets:** ${highWarning.slice(0, 3).map(u => `<@${u.userId}>`).join(', ')}`);
  }

  const lowActivity = userStats.filter(u => u.total > 0 && u.total < period / 3);
  if (lowActivity.length > 0) {
    suggestions.push(`> 📉 **Decay Matrix Approaching:** ${lowActivity.slice(0, 3).map(u => `<@${u.userId}>`).join(', ')} outputs below the median line.`);
  }

  return suggestions.length > 0 ? suggestions.join('\n\n') : '*All tracking arrays resolving optimally internally.*';
}
