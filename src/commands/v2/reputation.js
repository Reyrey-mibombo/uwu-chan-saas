const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check reputation points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`⭐ ${user.username}'s Reputation`)
      .addFields(
        { name: 'Reputation Points', value: '150', inline: true },
        { name: 'Rank', value: 'Trusted', inline: true }
      )
      .setColor('#f1c40f');
    
    await interaction.reply({ embeds: [embed] });
  }
};
