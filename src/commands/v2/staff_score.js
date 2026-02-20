const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_score')
    .setDescription('View overall staff score')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`🎯 ${user.username}'s Staff Score`)
      .setDescription('Overall Score: **82/100**')
      .addFields(
        { name: 'Activity', value: '85', inline: true },
        { name: 'Quality', value: '80', inline: true },
        { name: 'Consistency', value: '82', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
