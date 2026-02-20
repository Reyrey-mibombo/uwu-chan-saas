const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_rules')
    .setDescription('View server rules'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Server Rules')
      .setDescription('1. Be respectful\n2. No spam\n3. Follow Discord ToS\n4. Listen to staff')
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
