const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_showcase')
    .setDescription('Showcase top staff members'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⭐ Staff Showcase')
      .setDescription('**Top Performers This Month:**\n\n👑 @User1 - 500 pts\n⭐ @User2 - 450 pts\n🌟 @User3 - 400 pts')
      .setColor('#f39c12');
    
    await interaction.reply({ embeds: [embed] });
  }
};
