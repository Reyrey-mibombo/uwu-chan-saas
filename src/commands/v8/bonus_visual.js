const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_visual')
    .setDescription('View bonus visualization'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💰 Bonus Visual')
      .setDescription('**+500 BONUS POINTS!**\n```\n[████████████] 100%\n```')
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
