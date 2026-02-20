const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_summary')
    .setDescription('View bonus summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💰 Bonus Summary')
      .addFields(
        { name: 'Daily Bonuses', value: '350 pts', inline: true },
        { name: 'Weekly Bonuses', value: '500 pts', inline: true },
        { name: 'Event Bonuses', value: '200 pts', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
