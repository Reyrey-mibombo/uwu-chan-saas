const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_recommend')
    .setDescription('Get staff recommendations')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💡 Staff Recommendations')
      .setDescription('Based on performance data:')
      .addFields(
        { name: 'Focus Area', value: 'Task variety', inline: true },
        { name: 'Training', value: 'Recommended', inline: true },
        { name: 'Mentorship', value: 'Assign as mentor', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
