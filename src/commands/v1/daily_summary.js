const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_summary')
    .setDescription('Get daily activity summary report'),
  
  async execute(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let activeStaff = 0;
    let totalMinutes = 0;
    let warningsToday = 0;
    
    if (guildData?.shifts) {
      const todayShifts = guildData.shifts.filter(s => s.startTime >= today);
      const activeUserIds = new Set(todayShifts.map(s => s.userId));
      activeStaff = activeUserIds.size;
      totalMinutes = todayShifts.reduce((acc, s) => {
        const end = s.endTime || new Date();
        return acc + (end - s.startTime) / 60000;
      }, 0);
    }
    
    if (guildData?.warnings) {
      warningsToday = guildData.warnings.filter(w => w.timestamp >= today).length;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📊 Daily Summary')
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '👥 Active Staff', value: `${activeStaff}`, inline: true },
        { name: '⏱️ Total Hours', value: `${Math.round(totalMinutes / 60)}h`, inline: true },
        { name: '⚠️ Warnings Today', value: `${warningsToday}`, inline: true }
      )
      
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};
