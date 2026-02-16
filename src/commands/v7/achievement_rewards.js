const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_rewards')
    .setDescription('View achievement rewards')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });
    
    const achievements = user?.staff?.achievements || [];
    const rewards = achievements.length * 50;

    const embed = new EmbedBuilder()
      .setTitle('🎁 Achievement Rewards')
      .setColor(0xf1c40f)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Achievements Unlocked', value: `${achievements.length}`, inline: true },
        { name: 'Points Earned', value: `${rewards}`, inline: true },
        { name: 'Status', value: achievements.length > 0 ? 'Active' : 'None', inline: true }
      );

    const rewardTiers = [
      { count: 1, reward: 'Bronze Badge' },
      { count: 5, reward: 'Silver Badge' },
      { count: 10, reward: 'Gold Badge' },
      { count: 15, reward: 'Platinum Badge' }
    ];

    const earnedTiers = rewardTiers.filter(t => achievements.length >= t.count);
    if (earnedTiers.length > 0) {
      embed.addFields({ name: 'Earned Badges', value: earnedTiers.map(t => t.reward).join(', ') });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
