const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_predict')
    .setDescription('Predict time to rank up')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
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
