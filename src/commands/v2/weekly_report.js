const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_report')
    .setDescription('View weekly staff report'),

  async execute(interaction) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [shifts, activities, users] = await Promise.all([
      Shift.find({ guildId: interaction.guildId, createdAt: { $gte: sevenDaysAgo } }),
      Activity.find({ guildId: interaction.guildId, createdAt: { $gte: sevenDaysAgo } }),
      User.find({ 'guilds.guildId': interaction.guildId, 'staff.points': { $gt: 0 } })
    ]);
    
    const activeStaff = new Set(shifts.map(s => s.userId)).size;
    const totalHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;
    const avgHours = activeStaff > 0 ? (totalHours / activeStaff).toFixed(1) : 0;
    
    const embed = createCoolEmbed()
      .setTitle('📊 Weekly Report')
      .addFields(
        { name: 'Total Shifts', value: `${shifts.length}`, inline: true },
        { name: 'Active Staff', value: `${activeStaff}`, inline: true },
        { name: 'Avg. Hours', value: `${avgHours}h`, inline: true },
        { name: 'Total Activities', value: `${activities.length}`, inline: true },
        { name: 'Staff Members', value: `${users.length}`, inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



