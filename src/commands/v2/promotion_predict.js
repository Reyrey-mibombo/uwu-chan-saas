const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predict')
    .setDescription('[Premium] Predict when user will be promoted')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const userData = await User.findOne({ userId: user.id });
    const guild = await Guild.findOne({ guildId });

    if (!userData?.staff) {
      return interaction.editReply({ content: '❌ User is not a staff member yet.' });
    }

    const currentRank = userData.staff.rank || 'member';
    const points = userData.staff.points || 0;
    const consistency = userData.staff.consistency || 0;

    const rankOrder = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
    const currentIndex = rankOrder.indexOf(currentRank);
    const nextRank = rankOrder[currentIndex + 1];

    if (!nextRank) {
      const embed = createCoolEmbed()
        .setTitle(`👑 ${user.username} - Max Rank!`)
        .setDescription('🎉 Already at maximum rank!')
        
        .setThumbnail(user.displayAvatarURL())
        ;

      return interaction.editReply({ embeds: [embed] });
    }

    const req = guild?.promotionRequirements?.[nextRank] || {};
    const reqPoints = req.points || 100;
    const reqShifts = req.shifts || 5;
    const reqConsistency = req.consistency || 70;

    const pointsNeeded = Math.max(0, reqPoints - points);
    const shiftCount = await Shift.countDocuments({ userId: user.id, guildId, endTime: { $ne: null } });
    const shiftsNeeded = Math.max(0, reqShifts - shiftCount);

    const recentActivities = await Activity.find({ userId: user.id, guildId, type: 'shift' })
      .sort({ createdAt: -1 })
      .limit(10);

    let avgPointsPerShift = 2;
    let avgShiftsPerWeek = 3;

    if (recentActivities.length > 0) {
      const totalPoints = recentActivities.reduce((acc, a) => acc + (a.data?.amount || 2), 0);
      avgPointsPerShift = Math.max(1, Math.round(totalPoints / recentActivities.length));
      
      const daysDiff = (Date.now() - new Date(recentActivities[0].createdAt).getTime()) / (1000 * 60 * 60 * 24);
      avgShiftsPerWeek = Math.max(1, Math.round((recentActivities.length / Math.max(1, daysDiff)) * 7));
    }

    const weeksForPoints = pointsNeeded > 0 ? Math.ceil(pointsNeeded / (avgShiftsPerWeek * avgPointsPerShift)) : 0;
    const weeksForShifts = shiftsNeeded > 0 ? Math.ceil(shiftsNeeded / avgShiftsPerWeek) : 0;
    const predictedWeeks = Math.max(weeksForPoints, weeksForShifts);

    const pointsProgress = Math.min(100, (points / reqPoints) * 100);
    const shiftsProgress = Math.min(100, (shiftCount / reqShifts) * 100);
    const avgProgress = Math.round((pointsProgress + shiftsProgress) / 2);

    const progressBar = '█'.repeat(Math.floor(avgProgress / 10)) + '░'.repeat(10 - Math.floor(avgProgress / 10));

    const embed = createCoolEmbed()
      .setTitle(`🔮 Promotion Prediction - ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      
      .addFields(
        { name: '🏆 Current Rank', value: currentRank.toUpperCase(), inline: true },
        { name: '⬆️ Next Rank', value: nextRank.toUpperCase(), inline: true },
        { name: '📊 Progress', value: `\`${progressBar}\` **${avgProgress}%**`, inline: false },
        { name: '⭐ Points', value: `${points} / ${reqPoints} (${pointsNeeded} needed)`, inline: true },
        { name: '🔄 Shifts', value: `${shiftCount} / ${reqShifts} (${shiftsNeeded} needed)`, inline: true },
        { name: '📈 Consistency', value: `${consistency}% / ${reqConsistency}%`, inline: true },
        { name: '⏱️ Estimated Time', value: predictedWeeks === 0 ? '🎉 Ready now!' : `~${predictedWeeks} weeks`, inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



