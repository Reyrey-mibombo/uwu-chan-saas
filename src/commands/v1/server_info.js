const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('server_info').setDescription('Get server information'),
  async execute(interaction) {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle(`📋 ${guild.name}`)
      .setThumbnail(guild.iconURL())
      .setColor(0x3498db)
      .addFields(
        { name: 'Members', value: guild.memberCount.toString(), inline: true },
        { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
        { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
        { name: 'Created', value: guild.createdAt.toDateString(), inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
