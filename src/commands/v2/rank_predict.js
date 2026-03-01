const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_predict')
    .setDescription('Predict the velocity and estimated time to your next server rank')
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
        return interaction.editReply({ embeds: [createErrorEmbed('No promotion requirements configured for this server.')] });
      }

      const currentRank = userData.staff.rank || 'member';
      const points = userData.staff.points || 0;

      const ranks = Object.keys(guild.promotionRequirements);
      if (!ranks.includes('member')) ranks.unshift('member');
      if (!ranks.includes('trial')) ranks.splice(1, 0, 'trial');

      const currentIndex = ranks.indexOf(currentRank);
      const nextRankName = ranks[currentIndex + 1];

      if (!nextRankName || !guild.promotionRequirements[nextRankName]) {
        const maxEmbed = await createCustomEmbed(interaction, {
          title: `👑 Endpoint Reached`,
          description: `🎉 <@${targetUser.id}> is already at the maximum achievable rank!`,
          thumbnail: targetUser.displayAvatarURL()
        });
        return interaction.editReply({ embeds: [maxEmbed] });
      }

      const reqPoints = guild.promotionRequirements[nextRankName].points || 100;
      const pointsNeeded = Math.max(0, reqPoints - points);

      const recentActivities = await Activity.find({ userId: targetUser.id, guildId, type: 'shift' })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      let avgPointsPerShift = 1;
      let avgShiftsPerWeek = 2;

      if (recentActivities.length > 0) {
        const totalPoints = recentActivities.reduce((acc, a) => acc + (a.data?.amount || 1), 0);
        avgPointsPerShift = Math.max(1, Math.round(totalPoints / recentActivities.length));

        const daysDiff = (Date.now() - new Date(recentActivities[0].createdAt).getTime()) / (1000 * 60 * 60 * 24);
        avgShiftsPerWeek = Math.max(1, Math.round((recentActivities.length / Math.max(1, daysDiff)) * 7));
      }

      const pointsPerWeek = avgPointsPerShift * avgShiftsPerWeek;
      const predictedWeeks = pointsNeeded > 0 ? Math.ceil(pointsNeeded / pointsPerWeek) : 0;

      const embed = await createCustomEmbed(interaction, {
        title: `🔮 Personnel Velocity Forecast: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Operational AI Analysis\nPredicting Advancement trajectory to **${nextRankName.toUpperCase()}** based on rolling velocity metrics in the **${interaction.guild.name}** sector.`,
        fields: [
          { name: '⭐ Velocity Index', value: `\`+${pointsPerWeek.toLocaleString()}\` **PTS/Week**`, inline: true },
          { name: '🎯 Required Delta', value: `\`${pointsNeeded.toLocaleString()}\` **PTS Remaining**`, inline: true },
          { name: '⏱️ Estimated Readiness', value: predictedWeeks <= 0 ? '✨ **IMMEDIATE ELIGIBILITY**' : `**~${predictedWeeks}** Standard Weeks`, inline: false }
        ],
        footer: 'Projections are based on rolling 14-day performance telemetry',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Rank Predict Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while calculating the velocity trajectory.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
