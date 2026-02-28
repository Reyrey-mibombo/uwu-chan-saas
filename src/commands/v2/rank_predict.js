const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_predict')
    .setDescription('Predict time to rank up')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = createCoolEmbed()
      .setTitle(`🔮 Rank Prediction for ${user.username}`)
      .setDescription('Estimated time to next rank: **3 weeks**')
      .addFields(
        { name: 'Points rate', value: '+15/week', inline: true },
        { name: 'Needed', value: '25 more', inline: true }
      )
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};



