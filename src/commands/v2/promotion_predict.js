const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predict')
    .setDescription('Predict promotion timeline')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`🔮 ${user.username}'s Promotion Prediction`)
      .setDescription('Estimated time to next promotion: **2 weeks**')
      .addFields(
        { name: 'Current Points', value: '75/100', inline: true },
        { name: 'Shifts Needed', value: '15/50', inline: true }
      )
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
