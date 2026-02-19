const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View staff member profile')
    .addUserOption(opt => opt.setName('user').setDescription('The staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
    
    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.username}'s Profile`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '📛 Username', value: user.username, inline: true },
        { name: '🏷️ Nickname', value: member?.nickname || 'None', inline: true },
        { name: '📅 Joined Server', value: member?.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: '📅 Joined Discord', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '🎭 Roles', value: member?.roles.cache.size ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r).slice(0, 5).join(', ') : 'None', inline: false }
      )
      .setColor('#3498db')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
