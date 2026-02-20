const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_activity')
    .setDescription('Check staff member activity status')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const userId = user.id;
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    
    let status = '🟢 Inactive';
    let lastActive = null;
    
    if (guildData?.shifts) {
      const activeShift = guildData.shifts.find(s => s.userId === userId && !s.endTime);
      if (activeShift) {
        status = '🟡 On Duty';
      }
      
      const userShifts = guildData.shifts.filter(s => s.userId === userId && s.endTime);
      if (userShifts.length > 0) {
        const sorted = userShifts.sort((a, b) => b.endTime - a.endTime);
        lastActive = sorted[0]?.endTime;
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`👁️ ${user.username}'s Activity`)
      .addFields(
        { name: '📊 Status', value: status, inline: true },
        { name: '🕐 Last Active', value: lastActive ? `<t:${Math.floor(lastActive / 1000)}:R>` : 'Never', inline: true }
      )
      .setColor(status === '🟡 On Duty' ? '#feca57' : '#2ecc71')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
