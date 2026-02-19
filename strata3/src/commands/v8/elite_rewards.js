const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_rewards')
    .setDescription('View elite rewards available to you')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    const eliteStatus = user?.elite?.status || 'none';
    const elitePoints = user?.elite?.points || 0;
    const eliteTier = user?.elite?.tier || 0;

    const rewards = [
      { tier: 1, name: 'Bronze Elite', points: 500, perks: 'Custom role, Bonus 10%' },
      { tier: 2, name: 'Silver Elite', points: 1500, perks: 'Priority support, Bonus 25%' },
      { tier: 3, name: 'Gold Elite', points: 5000, perks: 'Exclusive channels, Bonus 50%' },
      { tier: 4, name: 'Platinum Elite', points: 15000, perks: 'All perks, Bonus 100%' }
    ];

    const embed = new EmbedBuilder()
      .setTitle('👑 Elite Rewards')
      .setColor(0x9b59b6)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'User', value: targetUser.username, inline: true },
        { name: 'Status', value: eliteStatus === 'active' ? '✅ Active' : '❌ Not Active', inline: true },
        { name: 'Current Tier', value: `${eliteTier}`, inline: true },
        { name: 'Elite Points', value: `${elitePoints}`, inline: true }
      );

    const rewardList = rewards.map(r => {
      const earned = elitePoints >= r.points ? '✅' : '🔒';
      return `${earned} **${r.name}** (${r.points} pts): ${r.perks}`;
    }).join('\n');

    embed.addFields({ name: 'Available Rewards', value: rewardList, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
