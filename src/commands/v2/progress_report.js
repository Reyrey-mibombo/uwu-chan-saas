const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_report')
    .setDescription('View progress report')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = createCoolEmbed()
      .setTitle(`📈 ${user.username}'s Progress`)
      .setDescription('Weekly progress summary:')
      .addFields(
        { name: 'Tasks Completed', value: '23/30', inline: true },
        { name: 'Shifts Worked', value: '5/7', inline: true },
        { name: 'Points Earned', value: '+45', inline: true }
      )
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};



