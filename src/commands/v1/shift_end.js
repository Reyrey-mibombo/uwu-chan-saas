const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_end')
    .setDescription('End your work shift'),
  
  async execute(interaction) {
    const userId = interaction.user.id;
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    
    if (!guildData?.shifts) {
      return interaction.reply({ content: '❌ No shift found', ephemeral: true });
    }
    
    const activeShift = guildData.shifts.find(s => s.userId === userId && !s.endTime);
    if (!activeShift) {
      return interaction.reply({ content: '❌ You dont have an active shift!', ephemeral: true });
    }
    
    activeShift.endTime = new Date();
    const duration = Math.round((activeShift.endTime - activeShift.startTime) / 60000);
    await guildData.save();
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Shift Ended')
      .setDescription(`Your shift has ended!\nDuration: ${duration} minutes`)
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
