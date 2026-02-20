const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('productivity_analysis')
    .setDescription('Analyze staff productivity')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const embed = new EmbedBuilder()
      .setTitle('📊 Productivity Analysis')
      .setDescription(user ? `Analysis for ${user.username}` : 'Team productivity analysis')
      .addFields(
        { name: 'Output Score', value: '85/100', inline: true },
        { name: 'Efficiency', value: '90%', inline: true },
        { name: 'Trend', value: '↑ Improving', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
