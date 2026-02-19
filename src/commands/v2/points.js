const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your current points balance')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const userId = user.id;
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    if (!guildData.points) guildData.points = {};
    
    const userPoints = guildData.points[userId] || 0;
    
    const embed = new EmbedBuilder()
      .setTitle('💰 Points')
      .setDescription(`${user.tag} has **${userPoints}** points`)
      .setColor('#f1c40f')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
