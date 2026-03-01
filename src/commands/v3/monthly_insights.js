const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_insights')
    .setDescription('Algorithmic monthly analytics breakdown of server metrics and growth targets.'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;

      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const activities = await Activity.find({
        guildId,
        createdAt: { $gte: firstOfMonth }
      }).lean();

      const shifts = await Shift.find({
        guildId,
        startTime: { $gte: firstOfMonth }
      }).lean();

      const commandCount = activities.filter(a => a.type === 'command').length;
      const messageCount = activities.filter(a => a.type === 'message').length;
      const warningCount = activities.filter(a => a.type === 'warning').length;
      const promotionCount = activities.filter(a => a.type === 'promotion').length;

      const activeStaff = [...new Set(shifts.map(s => s.userId))];
      const totalShiftHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;

      const users = await User.find({
        guildId, // Secure isolation parameter mapped strictly internally
        staff: { $exists: true }
      }).lean();

      const totalStaff = users.length;
      const activeThisMonth = users.filter(u => activities.find(a => a.userId === u.userId));

      const lastMonthActivities = await Activity.find({
        guildId,
        createdAt: { $gte: lastMonth, $lt: firstOfMonth }
      }).lean();

      // Differential algorithm tracking decay vectors securely
      const prevCommands = lastMonthActivities.filter(a => a.type === 'command').length;
      const commandChange = lastMonthActivities.length > 0 && prevCommands > 0
        ? (((commandCount - prevCommands) / prevCommands) * 100).toFixed(1)
        : 0;

      const embed = await createCustomEmbed(interaction, {
        title: `📊 30-Day Trailing Network Insights`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `A snapshot of authenticated ledger events and growth tracking during **${now.toLocaleString('default', { month: 'long', year: 'numeric' })}**.`,
        fields: [
          { name: '✅ Command Output', value: `\`${commandCount}\` Logs`, inline: true },
          { name: '💬 Total Processed', value: `\`${messageCount}\` Msgs`, inline: true },
          { name: '⚠️ Disciplinary Action', value: `\`${warningCount}\` Issued`, inline: true },
          { name: '🎖️ Hierarchy Promos', value: `\`${promotionCount}\` Ops`, inline: true },
          { name: '⏱️ Total Shift Volume', value: `\`${totalShiftHours.toFixed(1)}h\``, inline: true },
          { name: '👥 Network Retention', value: `\`${activeThisMonth.length} / ${totalStaff}\` Deployed`, inline: true }
        ],
        footer: 'Data strictly mapped to current server operational footprint'
      });

      // Mapping trajectory icons contextually instead of hardcoded ternary blocks 
      const trajectorySign = commandChange > 0 ? '📈 Growth Trajectory' : (commandChange < 0 ? '📉 Decay Trajectory' : '➖ Stagnant Baseline');
      embed.addFields({ name: trajectorySign, value: `Command infrastructure output adjusted by \`${commandChange}%\` compared against last month.` });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Monthly Insights Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred tracking trailing 30-day footprints.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
