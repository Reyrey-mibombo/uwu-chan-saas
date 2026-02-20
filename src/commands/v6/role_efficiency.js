const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_efficiency')
    .setDescription('Analyze role efficiency'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('👥 Role Efficiency')
      .setDescription('Efficiency by role:')
      .addFields(
        { name: 'Moderator', value: '92%', inline: true },
        { name: 'Helper', value: '88%', inline: true },
        { name: 'Admin', value: '95%', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
