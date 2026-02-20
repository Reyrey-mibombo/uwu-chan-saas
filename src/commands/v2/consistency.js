const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('consistency')
    .setDescription('Check staff consistency score')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${user.username}'s Consistency`)
      .addFields(
        { name: 'Score', value: '85%', inline: true },
        { name: 'Trend', value: '↑ Improving', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
