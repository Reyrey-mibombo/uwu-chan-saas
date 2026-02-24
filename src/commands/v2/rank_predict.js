const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_predict')
    .setDescription('Predict time to rank up')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`🔮 Rank Prediction for ${user.username}`)
      .setDescription('Estimated time to next rank: **3 weeks**')
      .addFields(
        { name: 'Points rate', value: '+15/week', inline: true },
        { name: 'Needed', value: '25 more', inline: true }
      )
      .setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed] });
  }
};
