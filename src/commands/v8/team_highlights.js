const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team_highlights')
    .setDescription('Highlight team achievements'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⭐ Team Highlights')
      .setDescription('**This Month:**\n• Team completed 5000 tasks\n• 100% uptime achieved\n• New record: 200 new members!')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
