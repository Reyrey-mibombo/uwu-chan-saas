const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time_tracking')
    .setDescription('Track time worked')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`⏱️ ${user.username}'s Time Tracking`)
      .addFields(
        { name: 'Today', value: '2h 30m', inline: true },
        { name: 'This Week', value: '18h 45m', inline: true },
        { name: 'This Month', value: '72h 15m', inline: true }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
