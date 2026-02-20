const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_chart')
    .setDescription('View rank progression chart'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Rank Chart')
      .setDescription('Rank progression:\n```\nNovice    ████░░░░░░░ 40%\nStaff     ████████░░░ 80%\nSenior    ██░░░░░░░░░ 20%\nLead      ░░░░░░░░░░░ 0%\n```')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
