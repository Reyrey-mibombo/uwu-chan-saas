const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_points')
    .setDescription('View reward points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`🎁 ${user.username}'s Reward Points`)
      .addFields(
        { name: 'Available', value: '150', inline: true },
        { name: 'Lifetime', value: '500', inline: true }
      )
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};
