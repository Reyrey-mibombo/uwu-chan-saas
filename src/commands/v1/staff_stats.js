const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('View detailed statistics for staff members')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const userId = user.id;
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    
    let totalShifts = 0;
    let totalMinutes = 0;
    let warnings = 0;
    
    if (guildData?.shifts) {
      const userShifts = guildData.shifts.filter(s => s.userId === userId);
      totalShifts = userShifts.filter(s => s.endTime).length;
      totalMinutes = userShifts.reduce((acc, s) => s.endTime ? acc + (s.endTime - s.startTime) / 60000 : acc, 0);
    }
    
    if (guildData?.warnings) {
      warnings = guildData.warnings.filter(w => w.userId === userId).length;
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${user.username}'s Stats`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '⏱️ Total Time', value: `${Math.round(totalMinutes)} minutes`, inline: true },
        { name: '📅 Total Shifts', value: `${totalShifts}`, inline: true },
        { name: '⚠️ Warnings', value: `${warnings}`, inline: true }
      )
      .setColor('#3498db')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
