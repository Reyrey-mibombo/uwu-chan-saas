const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_prediction')
    .setDescription('Predict your future rewards')
    .addUserOption(opt => opt.setName('user').setDescription('User to predict (optional)'))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to predict (default: 30)')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const days = interaction.options.getInteger('days') || 30;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rewards = await Activity.find({
      userId: targetUser.id,
      type: 'reward',
      createdAt: { $gte: since }
    });

    const avgDaily = rewards.length / 30;
    const avgPoints = rewards.length > 0 
      ? rewards.reduce((s, r) => s + (r.data?.points || 0), 0) / rewards.length 
      : 50;

    const predictedCount = Math.round(avgDaily * days);
    const predictedPoints = Math.round(avgPoints * predictedCount);

    const user = await User.findOne({ userId: targetUser.id });
    const currentPoints = user?.staff?.points || 0;

    const embed = new EmbedBuilder()
      .setTitle('🔮 Reward Prediction')
      .setColor(0x8e44ad)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Current Points', value: `${currentPoints}`, inline: true },
        { name: 'Avg Daily Rewards', value: avgDaily.toFixed(1), inline: true },
        { name: 'Avg Points/Reward', value: Math.round(avgPoints).toString(), inline: true },
        { name: `Predicted ${days} Days`, value: `${predictedCount} rewards`, inline: true },
        { name: 'Predicted Points', value: `+${predictedPoints}`, inline: true },
        { name: 'Projected Total', value: `${currentPoints + predictedPoints}`, inline: true }
      )
      .setFooter({ text: 'Based on last 30 days activity' });

    await interaction.reply({ embeds: [embed] });
  }
};
