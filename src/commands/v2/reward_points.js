const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_points')
    .setDescription('View reward points and redemption options')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} has no reward points yet.`,
        ephemeral: true 
      });
    }

    const points = user.staff.points || 0;
    const rewardsEarned = await Activity.countDocuments({
      guildId,
      userId: target.id,
      type: 'command',
      'data.reward': true,
      createdAt: { $gte: monthAgo }
    });

    const redemptionOptions = [
      { name: 'Custom Role', points: 500 },
      { name: 'Profile Badge', points: 250 },
      { name: 'Name Color', points: 300 },
      { name: 'Server Boost', points: 1000 },
      { name: 'Event Priority', points: 150 }
    ];

    const embed = new EmbedBuilder()
      .setTitle(`🎁 Reward Points: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xe91e63)
      .addFields(
        { name: 'Available Points', value: points.toString(), inline: true },
        { name: 'Rewards Earned (30d)', value: rewardsEarned.toString(), inline: true }
      );

    const optionsList = redemptionOptions.map(r => {
      const canRedeem = points >= r.points ? '✓' : '✗';
      return `${canRedeem} ${r.name}: ${r.points} pts`;
    });

    embed.addFields({ name: 'Redemption Options', value: optionsList.join('\n'), inline: false });
    embed.setFooter({ text: 'Use /redeem to claim rewards!' });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
