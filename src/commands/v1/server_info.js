const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_info')
    .setDescription('Get server information'),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildData = await Guild.findOne({ guildId: guild.id });
    
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount = guild.memberCount - botCount;
    const onlineCount = guild.members.cache.filter(m => m.presence?.status === 'online').size;

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${guild.name}`)
      .setThumbnail(guild.iconURL())
      .setColor(0x3498db)
      .addFields(
        { name: '👥 Members', value: `${humanCount} (${botCount} bots)`, inline: true },
        { name: '🟢 Online', value: onlineCount.toString(), inline: true },
        { name: '💬 Channels', value: guild.channels.cache.size.toString(), inline: true },
        { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
        { name: '📅 Created', value: guild.createdAt.toDateString(), inline: true },
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '💎 Premium', value: guildData?.premium?.isActive ? 'Active' : 'Not Active', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
