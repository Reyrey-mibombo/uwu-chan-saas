const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_visuals')
    .setDescription('View growth visualizations'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Growth Visuals')
      .setDescription('```\nJan  ▓▓▓▓░░░░ 40%\nFeb  ▓▓▓▓▓░░░ 50%\nMar  ▓▓▓▓▓▓░░ 60%\nApr  ▓▓▓▓▓▓▓░ 70%\n```')
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
