const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_points')
    .setDescription('View reward points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = createCoolEmbed()
      .setTitle(`🎁 ${user.username}'s Reward Points`)
      .addFields(
        { name: 'Available', value: '150', inline: true },
        { name: 'Lifetime', value: '500', inline: true }
      )
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};



