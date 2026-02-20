const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_summary')
    .setDescription('View interactive summary'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Interactive Summary')
      .setDescription('**Your Stats at a Glance:**\n• Level: 5\n• Points: 850\n• Rank: Senior Staff\n• Achievements: 12\n\nSelect a category for details!')
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
