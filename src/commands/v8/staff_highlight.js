const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_highlight')
    .setDescription('Highlight staff member'),
    .addUserOption(opt => opt.setName('user').setDescription('Staff to highlight').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`⭐ Staff Highlight: ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription('**This week\'s top performer!**\n• 150 tasks completed\n• 100% attendance\n• Amazing teamwork!')
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
