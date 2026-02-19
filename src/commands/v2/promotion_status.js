const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_status')
    .setDescription('Check current promotion status and requirements')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const userId = user.id;
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    let points = 0;
    let shifts = 0;
    let warnings = 0;
    
    if (guildData?.points) points = guildData.points[userId] || 0;
    if (guildData?.shifts) {
      shifts = guildData.shifts.filter(s => s.userId === userId && s.endTime).length;
    }
    if (guildData?.warnings) {
      warnings = guildData.warnings.filter(w => w.userId === userId).length;
    }
    
    const promotionPoints = 1000;
    const progress = Math.min((points / promotionPoints) * 100, 100);
    
    const embed = new EmbedBuilder()
      .setTitle(`📈 ${user.username}'s Promotion Status`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '💰 Points', value: `${points} / ${promotionPoints}`, inline: true },
        { name: '📅 Shifts Completed', value: `${shifts}`, inline: true },
        { name: '⚠️ Warnings', value: `${warnings}`, inline: true },
        { name: '📊 Progress', value: `${Math.round(progress)}%`, inline: false }
      )
      .setColor(progress >= 100 ? '#2ecc71' : '#3498db')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
