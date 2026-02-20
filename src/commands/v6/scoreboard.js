const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scoreboard')
    .setDescription('View staff scoreboard'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Scoreboard')
      .setDescription('Top performers:')
      .addFields(
        { name: '1. User1', value: '950 pts', inline: false },
        { name: '2. User2', value: '885 pts', inline: false },
        { name: '3. User3', value: '820 pts', inline: false }
      )
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
