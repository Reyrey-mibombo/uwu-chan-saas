const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_badges')
    .setDescription('View elite badges and achievements')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    const achievements = user?.staff?.achievements || [];
    const badgeLevels = {
      bronze: achievements.filter(a => a.includes('bronze')).length,
      silver: achievements.filter(a => a.includes('silver')).length,
      gold: achievements.filter(a => a.includes('gold')).length,
      platinum: achievements.filter(a => a.includes('platinum')).length,
      diamond: achievements.filter(a => a.includes('diamond')).length
    };

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Elite Badges - ${targetUser.username}`)
      .setColor(0xffd700)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '🥉 Bronze', value: badgeLevels.bronze > 0 ? `✅ x${badgeLevels.bronze}` : '❌', inline: true },
        { name: '🥈 Silver', value: badgeLevels.silver > 0 ? `✅ x${badgeLevels.silver}` : '❌', inline: true },
        { name: '🥇 Gold', value: badgeLevels.gold > 0 ? `✅ x${badgeLevels.gold}` : '❌', inline: true },
        { name: '💎 Platinum', value: badgeLevels.platinum > 0 ? `✅ x${badgeLevels.platinum}` : '❌', inline: true },
        { name: '💠 Diamond', value: badgeLevels.diamond > 0 ? `✅ x${badgeLevels.diamond}` : '❌', inline: true }
      );

    if (achievements.length > 0) {
      embed.addFields({ name: 'All Achievements', value: achievements.join(', '), inline: false });
    } else {
      embed.setDescription('No badges earned yet. Keep participating to earn badges!');
    }

    await interaction.reply({ embeds: [embed] });
  }
};
