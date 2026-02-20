const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_prediction')
    .setDescription('Predict reward earnings'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔮 Reward Prediction')
      .setDescription('Expected rewards this week:')
      .addFields(
        { name: 'Points', value: '~350', inline: true },
        { name: 'Badges', value: '1-2', inline: true },
        { name: 'Bonuses', value: '2', inline: true }
      )
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
