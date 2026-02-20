const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_permissions')
    .setDescription('Check your permissions in this server'),
  
  async execute(interaction) {
    const member = interaction.member;
    const perms = member.permissions.toArray();
    
    const embed = new EmbedBuilder()
      .setTitle('🔐 Your Permissions')
      .setDescription(perms.join(', '))
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
