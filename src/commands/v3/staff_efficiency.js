const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_efficiency')
    .setDescription('Poll global efficiency matrices mapped strictly inside this server context.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check efficiency for')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (targetUser) {
        const user = await User.findOne({ userId: targetUser.id, guildId }).lean();
        if (!user || !user.staff) {
          return interaction.editReply({ embeds: [createErrorEmbed(`No performance logs retrieved. <@${targetUser.id}> isn't mapped inside this server.`)] });
        }

        const activities = await Activity.find({
          guildId,
          userId: targetUser.id,
          createdAt: { $gte: thirtyDaysAgo }
        }).lean();

        const shifts = await Shift.find({
          guildId,
          userId: targetUser.id,
          startTime: { $gte: thirtyDaysAgo }
        }).lean();

        const commands = activities.filter(a => a.type === 'command').length;
        const warnings = activities.filter(a => a.type === 'warning').length;
        const completedShifts = shifts.filter(s => s.endTime).length;

        const staff = user.staff || {};
        const efficiency = calculateEfficiency(commands, warnings, completedShifts, staff.consistency || 100);

        const filledScore = Math.min(10, Math.floor(efficiency / 10));
        const progressBar = `\`${'█'.repeat(filledScore)}${'░'.repeat(10 - filledScore)}\``;

        const embed = await createCustomEmbed(interaction, {
          title: `📊 Tactical Efficiency: ${targetUser.username}`,
          description: `Reviewing 30-day authenticated activity tracked inside **${interaction.guild.name}**.`,
          thumbnail: targetUser.displayAvatarURL(),
          fields: [
            { name: '💯 Global Trajectory', value: `${progressBar} **${efficiency}%**`, inline: false },
            { name: '📈 Internal Consistency', value: `\`${staff.consistency || 100}%\``, inline: true },
            { name: '✅ Network Commands', value: `\`${commands}\``, inline: true },
            { name: '⚠️ Moderation Disputes', value: `\`${warnings}\``, inline: true },
            { name: '🔄 Retention Target', value: `\`${completedShifts}\` Pings`, inline: true }
          ]
        });

        await interaction.editReply({ embeds: [embed] });

      } else {
        // Calculate Global Tier List limited by Guild bounds inherently filtering Cross-Server queries
        const users = await User.find({
          guildId,              // MUST ISOLATE OR GLOBAL RANKING LEAKS ACROSS GUILDS
          staff: { $exists: true }
        }).lean();

        if (!users.length) {
          return interaction.editReply({ embeds: [createErrorEmbed('No staff database queries detected mapped securely to this operational bounds.')] });
        }

        const userEfficiencies = await Promise.all(users.map(async user => {
          const activities = await Activity.find({
            guildId,
            userId: user.userId,
            createdAt: { $gte: thirtyDaysAgo }
          }).lean();

          const shifts = await Shift.find({
            guildId,
            userId: user.userId,
            startTime: { $gte: thirtyDaysAgo }
          }).lean();

          const commands = activities.filter(a => a.type === 'command').length;
          const warnings = activities.filter(a => a.type === 'warning').length;
          const completedShifts = shifts.filter(s => s.endTime).length;

          const efficiency = calculateEfficiency(commands, warnings, completedShifts, user.staff?.consistency || 100);

          return {
            userId: user.userId,
            username: user.username,
            efficiency,
            consistency: user.staff?.consistency || 100,
            commands,
            completedShifts
          };
        }));

        const sortedByEfficiency = userEfficiencies.sort((a, b) => b.efficiency - a.efficiency).slice(0, 10);

        let rankStrings = sortedByEfficiency.map((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
          return `${medal} <@${u.userId}> ➔ **${u.efficiency}%** \`(${u.commands} cmd, ${u.completedShifts} Pld)\``;
        });

        const avgEfficiency = userEfficiencies.length > 0
          ? Math.round(userEfficiencies.reduce((acc, u) => acc + u.efficiency, 0) / userEfficiencies.length)
          : 0;

        const embed = await createCustomEmbed(interaction, {
          title: `📊 Operational Server Toplist`,
          description: 'Filtering the top 10 most technically efficient tracked responders in this instance.',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          fields: [
            { name: '🏆 Top Executioners', value: rankStrings.join('\n') || '*No entries resolved.*', inline: false },
            { name: '🌐 Server Core Baseline', value: `**${avgEfficiency}%** Relative Threshold`, inline: false }
          ]
        });

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Staff Efficiency Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred plotting performance comparisons chart matrices.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

function calculateEfficiency(commands, warnings, completedShifts, consistency) {
  const commandWeight = 2;
  const shiftWeight = 3;
  const warningPenalty = 5;
  const consistencyWeight = 0.3;

  const positiveScore = (commands * commandWeight) + (completedShifts * shiftWeight);
  const penalty = warnings * warningPenalty;
  const consistencyBonus = consistency * consistencyWeight;

  const score = positiveScore - penalty + consistencyBonus;
  return Math.min(100, Math.max(0, Math.round(score / 2)));
}
