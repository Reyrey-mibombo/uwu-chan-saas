const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predict')
    .setDescription('Predict promotion timeline')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} is not on the staff team yet.`,
        ephemeral: true 
      });
    }

    const currentRank = (user.staff.rank || 'member').toLowerCase();
    const points = user.staff.points || 0;
    const consistency = user.staff.consistency || 0;

    const ranks = [
      { name: 'member', points: 0, label: 'Member' },
      { name: 'trial', points: 100, label: 'Trial Staff' },
      { name: 'staff', points: 500, label: 'Staff' },
      { name: 'moderator', points: 1000, label: 'Moderator' },
      { name: 'admin', points: 2500, label: 'Admin' },
      { name: 'owner', points: 5000, label: 'Owner' }
    ];

    const currentIndex = ranks.findIndex(r => r.name === currentRank);
    const nextRank = ranks[currentIndex + 1];

    if (!nextRank) {
      return interaction.reply({ 
        content: `${target.username} is already at the highest rank!`,
        ephemeral: true 
      });
    }

    const pointsNeeded = nextRank.points - points;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weeklyActivity = await Activity.countDocuments({
      guildId,
      userId: target.id,
      createdAt: { $gte: weekAgo }
    });

    const avgWeeklyPoints = weeklyActivity * 10;

    let prediction = 'Unable to predict';
    let daysToPromote = null;

    if (avgWeeklyPoints > 0 && pointsNeeded > 0) {
      daysToPromote = Math.ceil(pointsNeeded / avgWeeklyPoints);
      prediction = `~${daysToPromote} weeks`;
    } else if (pointsNeeded <= 0) {
      prediction = 'Ready for promotion!';
    } else {
      prediction = 'Start earning more points to see prediction';
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔮 Promotion Prediction: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Current Rank', value: ranks[currentIndex].label, inline: true },
        { name: 'Next Rank', value: nextRank.label, inline: true },
        { name: 'Points Needed', value: pointsNeeded.toString(), inline: true },
        { name: 'Weekly Points (avg)', value: avgWeeklyPoints.toString(), inline: true },
        { name: 'Predicted Time', value: prediction, inline: true },
        { name: 'Consistency', value: `${consistency}%`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
