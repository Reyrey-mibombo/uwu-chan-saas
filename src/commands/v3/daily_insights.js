const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_insights')
    .setDescription('Algorithmic breakdown of server metrics compiled within the last 24 hours.'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activities = await Activity.find({
        guildId,
        createdAt: { $gte: today, $lt: tomorrow }
      }).lean();

      const shifts = await Shift.find({
        guildId,
        startTime: { $gte: today, $lt: tomorrow }
      }).lean();

      const commandCount = activities.filter(a => a.type === 'command').length;
      const messageCount = activities.filter(a => a.type === 'message').length;
      const warningCount = activities.filter(a => a.type === 'warning').length;

      const activeStaff = [...new Set(shifts.map(s => s.userId))];
      const totalShiftHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;

      const users = await User.find({
        guildId, // MUST ISOLATE DB OR ACTIVITY LEAKS GLOBALLY
        staff: { $exists: true }
      }).lean();

      const staffWithActivity = users.filter(u => {
        return activities.find(a => a.userId === u.userId);
      });

      const activePercentage = users.length > 0 ? ((activeStaff.length / users.length) * 100).toFixed(0) : 0;

      const embed = await createCustomEmbed(interaction, {
        title: `📊 24-Hour Network Insights`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `A snapshot of authenticated ledger events and patrol durations recorded since Midnight.`,
        fields: [
          { name: '✅ Command Usage', value: `\`${commandCount}\` Invocations`, inline: true },
          { name: '💬 Total Processed', value: `\`${messageCount}\` Messages`, inline: true },
          { name: '⚠️ Server Warnings', value: `\`${warningCount}\` Issued`, inline: true },
          { name: '🛡️ Active Patrollers', value: `\`${activeStaff.length}\` Personnel`, inline: true },
          { name: '⏱️ Total Shift Hours', value: `\`${totalShiftHours.toFixed(1)}h\``, inline: true },
          { name: '📈 Activity Yield', value: `\`${staffWithActivity.length}\` Logs Tracked`, inline: true }
        ],
        footer: `${activePercentage}% of the registered hierarchy deployed today.`
      });

      if (activeStaff.length > 0) {
        const staffList = activeStaff.slice(0, 10).map(userId => `<@${userId}>`).join(', ');
        embed.addFields({ name: '👥 Primary Responders', value: staffList || '*None available.*', inline: false });
      } else {
        embed.addFields({ name: '👥 Primary Responders', value: '*No staff members have clocked in today.*', inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Daily Insights Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred tracking 24-hour log footprints.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
