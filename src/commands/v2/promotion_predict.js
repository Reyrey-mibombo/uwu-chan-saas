const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predict')
    .setDescription('[Premium] Predict when a user will reach their next milestone')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const userData = await User.findOne({ userId: targetUser.id, guildId: guildId }).lean();
      const guild = await Guild.findOne({ guildId: guildId }).lean();

      if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff records found for <@${targetUser.id}> in this server.`)] });
      }
      if (!guild || !guild.promotionRequirements) {
        return interaction.editReply({ embeds: [createErrorEmbed('No promotion requirements have been established in this server yet.')] });
      }

      const currentRank = userData.staff.rank || 'member';
      const points = userData.staff.points || 0;
      const consistency = userData.staff.consistency || 0;

      const ranks = Object.keys(guild.promotionRequirements);
      if (!ranks.includes('member')) ranks.unshift('member');
      if (!ranks.includes('trial')) ranks.splice(1, 0, 'trial');

      const currentIndex = ranks.indexOf(currentRank);
      const nextRankName = ranks[currentIndex + 1];

      if (!nextRankName || !guild.promotionRequirements[nextRankName]) {
        const maxEmbed = await createCustomEmbed(interaction, {
          title: `👑 Maximum Rank: ${targetUser.username}`,
          description: `🎉 <@${targetUser.id}> is already at the maximum achievable rank in this server!`,
          thumbnail: targetUser.displayAvatarURL()
        });
        return interaction.editReply({ embeds: [maxEmbed] });
      }

      const req = guild.promotionRequirements[nextRankName];
      const reqPoints = req.points || 100;
      const reqShifts = req.shifts || 5;
      const reqConsistency = req.consistency || 70;

      const pointsNeeded = Math.max(0, reqPoints - points);
      const shiftCount = await Shift.countDocuments({ userId: targetUser.id, guildId, endTime: { $ne: null } });
      const shiftsNeeded = Math.max(0, reqShifts - shiftCount);

      const recentActivities = await Activity.find({ userId: targetUser.id, guildId, type: 'shift' })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

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
      const avgProgress = Math.round((pointsProgress + shiftsProgress) / 2) || 0;

      const filled = Math.min(10, Math.floor(avgProgress / 10));
      const progressBar = `\`${'█'.repeat(filled)}${'░'.repeat(10 - filled)}\``;

      const embed = await createCustomEmbed(interaction, {
        title: `🔮 Milestone Prediction: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `Analyzing recent velocity and historical activity logs for <@${targetUser.id}>...`,
        fields: [
          { name: '🏆 Current Rank', value: `\`${currentRank.toUpperCase()}\``, inline: true },
          { name: '⬆️ Analyzing Target', value: `\`${nextRankName.toUpperCase()}\``, inline: true },
          { name: '📊 Cumulative Progress', value: `${progressBar} **${avgProgress}%**`, inline: false },
          { name: '⭐ Points Target', value: `\`${points} / ${reqPoints}\` (${pointsNeeded} needed)`, inline: true },
          { name: '🔄 Shifts Target', value: `\`${shiftCount} / ${reqShifts}\` (${shiftsNeeded} needed)`, inline: true },
          { name: '📈 Consistency', value: `\`${consistency}% / ${reqConsistency}%\``, inline: true },
          { name: '⏱️ Estimated Arrival', value: predictedWeeks <= 0 ? '🎉 Ready **NOW**!' : `~**${predictedWeeks}** Weeks`, inline: true }
        ],
        footer: 'Based on rolling 7-Day trajectory approximations'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Promotion Predict Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while calculating the prediction milestone.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
