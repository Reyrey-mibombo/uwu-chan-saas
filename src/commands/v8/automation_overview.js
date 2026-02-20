const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_overview')
    .setDescription('View automation overview'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Automation Overview')
      .addFields(
        { name: 'Auto Rewards', value: '✅ Active', inline: true },
        { name: 'Auto Rank', value: '✅ Active', inline: true },
        { name: 'Smart Alerts', value: '✅ Active', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
