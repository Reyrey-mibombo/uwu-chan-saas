const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_logs')
    .setDescription('Check staff activity logs')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days') || 7;
    
    const embed = new EmbedBuilder()
      .setTitle('📜 Activity Logs')
      .setDescription(user ? `Logs for ${user.username} (last ${days} days)` : `All staff logs (last ${days} days)`)
      .addFields(
        { name: 'Shifts', value: '12', inline: true },
        { name: 'Warnings', value: '0', inline: true },
        { name: 'Points Earned', value: '45', inline: true }
      )
      .setColor('#f39c12');
    
    await interaction.reply({ embeds: [embed] });
  }
};
