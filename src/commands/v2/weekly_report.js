const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_report')
    .setDescription('View an authentic algorithmic weekly staff report'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [shifts, activities, users] = await Promise.all([
        Shift.find({ guildId: interaction.guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        Activity.find({ guildId: interaction.guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        User.find({ guildId: interaction.guildId, 'staff.points': { $gt: 0 } }).lean()
      ]);

      if (shifts.length === 0 && activities.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No recorded activity found over the last 7 days within this server.')] });
      }

      const activeStaff = new Set(shifts.map(s => s.userId)).size;
      const totalHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;
      const avgHours = activeStaff > 0 ? (totalHours / activeStaff).toFixed(1) : 0;

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Macroscopic Operational Intelligence',
        description: `### 🛡️ 7-Day Staff Economy Breakdown\nStrategic performance analysis and resource allocation metrics for the **${interaction.guild.name}** sector. Aggregating multi-node telemetry.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '👤 Workforce Capacity', value: `\`${activeStaff.toLocaleString()}\` Active Personnel`, inline: true },
          { name: '🔄 Operational Throughput', value: `\`${shifts.length.toLocaleString()}\` Patrols Cast`, inline: true },
          { name: '⏱️ Average Time Yield', value: `\`${avgHours}h\` / Personnel`, inline: true },
          { name: '📋 Sector Transactions', value: `\`${activities.length.toLocaleString()}\` Logged Events`, inline: true },
          { name: '💰 Registered Data Profiles', value: `\`${users.length.toLocaleString()}\` Staff Entities`, inline: true }
        ],
        footer: 'Intelligence is sandboxed to the current localized guild environment.',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Weekly Report Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while attempting to assemble the weekly report.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
