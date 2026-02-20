const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View staff member profile')
    .addUserOption(opt => opt.setName('user').setDescription('The staff member').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
    const staffSystem = client.systems.staff;
    
    const points = await staffSystem.getPoints(user.id, interaction.guildId);
    const rank = await staffSystem.getRank(user.id, interaction.guildId);
    const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);
    const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);
    
    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.username}'s Profile`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '📛 Username', value: user.username, inline: true },
        { name: '🏷️ Nickname', value: member?.nickname || 'None', inline: true },
        { name: '📅 Joined Server', value: member?.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: '⭐ Points', value: `${points}`, inline: true },
        { name: '🏆 Rank', value: rank, inline: true },
        { name: '📈 Score', value: `${score}/100`, inline: true },
        { name: '⚠️ Warnings', value: `${warnings.total}`, inline: true }
      )
      .setColor('#3498db')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
