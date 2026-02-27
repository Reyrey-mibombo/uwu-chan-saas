const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your current points balance')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staff;
    
    const userPoints = await staffSystem.getPoints(user.id, interaction.guildId);
    const rank = await staffSystem.getRank(user.id, interaction.guildId);
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('💰 Points')
      .setDescription(`${user.username} has **${userPoints}** points`)
      .addFields(
        { name: 'Rank', value: rank, inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
