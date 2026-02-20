const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild, Activity, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_summary')
    .setDescription('View monthly activity summary'),

  async execute(interaction) {
    const guild = interaction.guild;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [activities, shifts, warnings, guildData] = await Promise.all([
      Activity.find({ guildId: guild.id, createdAt: { $gte: thirtyDaysAgo } }),
      Shift.find({ guildId: guild.id, createdAt: { $gte: thirtyDaysAgo } }),
      Warning.find({ guildId: guild.id, createdAt: { $gte: thirtyDaysAgo } }),
      Guild.findOne({ guildId: guild.id })
    ]);
    
    const activeStaff = new Set(shifts.map(s => s.userId)).size;
    const totalShiftHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Monthly Summary')
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: '👥 Active Staff', value: `${activeStaff}`, inline: true },
        { name: '⏱️ Total Hours', value: `${Math.round(totalShiftHours)}h`, inline: true },
        { name: '⚠️ Warnings', value: `${warnings.length}`, inline: true },
        { name: '📝 Activities', value: `${activities.length}`, inline: true },
        { name: '👋 Members', value: `${guild.memberCount}`, inline: true }
      )
      .setColor('#9b59b6')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
