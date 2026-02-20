const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_settings')
    .setDescription('Configure automation settings'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Automation Settings')
      .setDescription('Current automations:')
      .addFields(
        { name: 'Auto Rewards', value: '✅ On', inline: true },
        { name: 'Auto Rank Up', value: '✅ On', inline: true },
        { name: 'Smart Alerts', value: '✅ On', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
