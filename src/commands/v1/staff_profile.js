const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View detailed staff profile')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Staff member')
        .setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staffSystem;
    
    const points = await staffSystem.getPoints(target.id, interaction.guildId);
    const warnings = await staffSystem.getWarnings(target.id, interaction.guildId);
    const rank = await this.calculateRank(points);

    const embed = new EmbedBuilder()
      .setTitle(`👤 Staff Profile: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x9b59b6)
      .addFields(
        { name: '🏆 Rank', value: rank, inline: true },
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '⚠️ Warnings', value: warnings.length.toString(), inline: true },
        { name: '📝 Recent Warnings', value: warnings.slice(0, 3).map(w => w.reason).join('\n') || 'None' }
      )
      .setFooter({ text: 'Upgrade to Premium for detailed analytics! 💎' });

    await interaction.reply({ embeds: [embed] });
  },

  async calculateRank(points) {
    if (points >= 1000) return '🥇 Elite';
    if (points >= 500) return '🥈 Advanced';
    if (points >= 100) return '🥉 Intermediate';
    return '🆕 Novice';
  }
};
