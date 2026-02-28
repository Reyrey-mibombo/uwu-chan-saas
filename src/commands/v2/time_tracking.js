const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time_tracking')
    .setDescription('Track time worked')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = createCoolEmbed()
      .setTitle(`⏱️ ${user.username}'s Time Tracking`)
      .addFields(
        { name: 'Today', value: '2h 30m', inline: true },
        { name: 'This Week', value: '18h 45m', inline: true },
        { name: 'This Month', value: '72h 15m', inline: true }
      )
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};



