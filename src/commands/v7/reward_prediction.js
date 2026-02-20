const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

const REWARD_THRESHOLDS = [50, 150, 300, 500, 1000];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_prediction')
    .setDescription('Predict when you will hit your next reward milestone')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const points = user?.staff?.points || 0;

    const nextThreshold = REWARD_THRESHOLDS.find(t => points < t);
    if (!nextThreshold) {
      return interaction.editReply(`🏆 **${target.username}** has unlocked all reward tiers with **${points}** points!`);
    }

    const needed = nextThreshold - points;
    const progress = Math.round((points / nextThreshold) * 100);
    const bar = '▓'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));

    const embed = new EmbedBuilder()
      .setTitle(`🎯 Reward Prediction — ${target.username}`)
      .setColor(0xf39c12)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '⭐ Current Points', value: points.toString(), inline: true },
        { name: '🎯 Next Reward at', value: nextThreshold.toString(), inline: true },
        { name: '📊 Needed', value: `${needed} more points`, inline: true },
        { name: '📈 Progress', value: `\`${bar}\` **${progress}%**` }
      )
      .setFooter({ text: `${interaction.guild.name} • Reward Prediction` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
