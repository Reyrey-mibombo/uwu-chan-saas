const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_summary')
    .setDescription('View monthly activity summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Monthly Summary')
      .setDescription('Staff activity for this month:\n• Total messages: 0\n• New members: 0\n• Commands used: 0')
      .setColor('#9b59b6')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
