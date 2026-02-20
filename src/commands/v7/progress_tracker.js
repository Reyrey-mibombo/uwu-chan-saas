const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_tracker')
    .setDescription('Track your progress')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📈 Progress Tracker')
      .addFields(
        { name: 'Level', value: '12', inline: true },
        { name: 'XP', value: '850/1000', inline: true },
        { name: 'Next Level', value: '150 pts', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
