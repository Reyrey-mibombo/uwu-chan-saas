const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check reputation points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = createCoolEmbed()
      .setTitle(`⭐ ${user.username}'s Reputation`)
      .addFields(
        { name: 'Reputation Points', value: '150', inline: true },
        { name: 'Rank', value: 'Trusted', inline: true }
      )
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};



