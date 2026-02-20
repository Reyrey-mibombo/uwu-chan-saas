const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_report')
    .setDescription('View progress report')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`📈 ${user.username}'s Progress`)
      .setDescription('Weekly progress summary:')
      .addFields(
        { name: 'Tasks Completed', value: '23/30', inline: true },
        { name: 'Shifts Worked', value: '5/7', inline: true },
        { name: 'Points Earned', value: '+45', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
