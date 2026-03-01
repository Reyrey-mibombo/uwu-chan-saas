const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_report')
    .setDescription('View an authentic rolling 7-day progress report')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Fetch Real Data over the last 7 days
      const [userData, recentShifts, recentActivities] = await Promise.all([
        User.findOne({ userId: targetUser.id, guildId: guildId }).lean(),
        Shift.find({ userId: targetUser.id, guildId: guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        Activity.find({ userId: targetUser.id, guildId: guildId, createdAt: { $gte: sevenDaysAgo } }).lean()
      ]);

      if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No data profile found for <@${targetUser.id}> in this server.`)] });
      }

      // Calculation for trend
      const momentum = ptsGainedLast7Days > 500 ? '🚀 High Velocity' : ptsGainedLast7Days > 100 ? '📈 Stable' : '📉 Limited engagement';

      const embed = await createCustomEmbed(interaction, {
        title: `📈 Operational Yield: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ 7-Day Performance Analytic\nComprehensive yield report for <@${targetUser.id}> within the **${interaction.guild.name}** sector. Aggregating real-time telemetry from all active service nodes.`,
        fields: [
          { name: '✅ Command Throughput', value: `\`${commandTasks.toLocaleString()}\` Verified Tasks`, inline: true },
          { name: '🔄 Service Engagement', value: `\`${recentShifts.length.toLocaleString()}\` Active Shifts`, inline: true },
          { name: '⭐ Strategic Yield', value: `\`+${ptsGainedLast7Days.toLocaleString()}\` PTS Yielded`, inline: true },
          { name: '📡 Operational Momentum', value: `\`${momentum}\``, inline: false }
        ],
        footer: 'Reports are generated using real-time aggregated database telemetry.',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Progress Report Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while querying the performance report.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
