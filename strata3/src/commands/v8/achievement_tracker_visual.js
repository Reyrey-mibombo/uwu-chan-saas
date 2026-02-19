const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_tracker_visual')
    .setDescription('Visual achievement tracker')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    const totalAchievements = user?.achievements?.length || 0;
    const earned = user?.achievements?.filter(a => a.earnedAt)?.length || 0;
    const progress = totalAchievements > 0 ? Math.round((earned / totalAchievements) * 20) : 0;
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    const embed = new EmbedBuilder()
      .setTitle(`🎯 Achievement Tracker - ${targetUser.username}`)
      .setColor(0x3498db)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Progress', value: `\`${bar}\` ${Math.round((earned / (totalAchievements || 1)) * 100)}%`, inline: false },
        { name: 'Earned', value: `${earned}`, inline: true },
        { name: 'Total Available', value: `${totalAchievements}`, inline: true }
      );

    if (user?.achievements?.length > 0) {
      const recent = user.achievements.slice(-5).map(a => `✓ ${a.name}`).join('\n');
      embed.addFields({ name: 'Recent Achievements', value: recent, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
