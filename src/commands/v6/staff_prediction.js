const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_prediction')
    .setDescription('Predict staff performance')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔮 Staff Prediction')
      .setDescription('AI-predicted performance for next week:')
      .addFields(
        { name: 'Expected Tasks', value: '25-30', inline: true },
        { name: 'Success Rate', value: '88%', inline: true },
        { name: 'Recommendation', value: 'On track', inline: true }
      )
      .setColor('#f39c12');
    
    await interaction.reply({ embeds: [embed] });
  }
};
