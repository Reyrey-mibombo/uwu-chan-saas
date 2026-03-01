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
        title: '📊 Server Weekly Report',
        description: `A 7-Day macroscopic breakdown of the staff economy within **${interaction.guild.name}**.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '👤 Active Participating Staff', value: `\`${activeStaff}\` Members`, inline: true },
          { name: '🔄 Total Patrols Cast', value: `\`${shifts.length}\` Shifts`, inline: true },
          { name: '⏱️ Average Time Yield', value: `\`${avgHours}h\`/Staff Member`, inline: true },
          { name: '📋 Total Server Events', value: `\`${activities.length}\` Transmitted`, inline: true },
          { name: '💰 Paid Staff Pool', value: `\`${users.length}\` Profiles Registered`, inline: true }
        ],
        footer: 'Data strictly sandboxed to current guild.'
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
