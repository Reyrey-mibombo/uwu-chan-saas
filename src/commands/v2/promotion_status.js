const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_status')
    .setDescription('[Premium] Check your authentic promotion status against server requirements')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const userData = await User.findOne({ userId: targetUser.id, guildId: guildId }).lean();
      const guild = await Guild.findOne({ guildId: guildId }).lean();

      if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`The user <@${targetUser.id}> is not registered in the staff system for this server.`)] });
      }
      if (!guild || !guild.promotionRequirements) {
        return interaction.editReply({ embeds: [createErrorEmbed('This server has not configured any promotion requirements.')] });
      }

      const currentRank = userData.staff.rank || 'member';
      const points = userData.staff.points || 0;
      const consistency = userData.staff.consistency || 0;
      const reputation = userData.staff.reputation || 0;
      const achievements = userData.staff.achievements?.length || 0;

      const shiftCount = await Shift.countDocuments({ userId: targetUser.id, guildId, endTime: { $ne: null } });
      const warningCount = await Warning.countDocuments({ userId: targetUser.id, guildId });

      const ranks = Object.keys(guild.promotionRequirements);
      if (!ranks.includes('member')) ranks.unshift('member');
      if (!ranks.includes('trial')) ranks.splice(1, 0, 'trial');

      const currentIndex = ranks.indexOf(currentRank);
      const nextRankName = ranks[currentIndex + 1];

      if (!nextRankName || !guild.promotionRequirements[nextRankName]) {
        const maxEmbed = await createCustomEmbed(interaction, {
          title: `👑 Maximum Rank: ${targetUser.username}`,
          description: `🎉 <@${targetUser.id}> is already at the maximum achievable rank in this server!`,
          thumbnail: targetUser.displayAvatarURL(),
          fields: [
            { name: '🏆 Current Rank', value: `\`${currentRank.toUpperCase()}\``, inline: true },
            { name: '⭐ Lifetime Points', value: `\`${points}\``, inline: true }
          ]
        });
        return interaction.editReply({ embeds: [maxEmbed] });
      }

      const req = guild.promotionRequirements[nextRankName];
      const reqPoints = req.points || 100;
      const reqShifts = req.shifts || 5;
      const reqConsistency = req.consistency || 70;
      const reqMaxWarnings = req.maxWarnings ?? 3;
      const reqAchievements = req.achievements || 0;
      const reqReputation = req.reputation || 0;

      const meetsPoints = points >= reqPoints;
      const meetsShifts = shiftCount >= reqShifts;
      const meetsConsistency = consistency >= reqConsistency;
      const meetsWarnings = warningCount <= reqMaxWarnings;
      const meetsAchievements = achievements >= reqAchievements;
      const meetsReputation = reputation >= reqReputation;

      const requirements = [
        { name: '⭐ Points', current: points, required: reqPoints, met: meetsPoints },
        { name: '🔄 Shifts', current: shiftCount, required: reqShifts, met: meetsShifts },
        { name: '📈 Consistency', current: `${consistency}%`, required: `${reqConsistency}%`, met: meetsConsistency },
        { name: '⚠️ Max Warnings', current: warningCount, required: reqMaxWarnings, met: meetsWarnings, reverse: true }
      ];

      if (reqAchievements > 0) {
        requirements.push({ name: '🏅 Achievements', current: achievements, required: reqAchievements, met: meetsAchievements });
      }
      if (reqReputation > 0) {
        requirements.push({ name: '💫 Reputation', current: reputation, required: reqReputation, met: meetsReputation });
      }

      const metCount = requirements.filter(r => r.met).length;
      const totalCount = requirements.length;
      const progress = Math.round((metCount / totalCount) * 100) || 0;

      const filled = Math.min(10, Math.floor(progress / 10));
      const progressBar = `\`${'■'.repeat(filled)}${'□'.repeat(10 - filled)}\``;

      const reqList = requirements.map(r => {
        const status = r.met ? '🟢' : '🔴';
        return `${status} **${r.name}**: \`${r.current.toLocaleString()} / ${r.required.toLocaleString()}\` ${r.reverse ? '(Limit)' : ''}`;
      }).join('\n');

      const embed = await createCustomEmbed(interaction, {
        title: `📈 Advancement Telemetry: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Operational Milestone Analysis\nCurrently benchmarking performance metrics against **${nextRankName.toUpperCase()}** standards in the **${interaction.guild.name}** sector.`,
        fields: [
          { name: '🏆 Current Status', value: `\`${currentRank.toUpperCase()}\` ➔ \`${nextRankName.toUpperCase()}\``, inline: false },
          { name: '📊 Target Readiness', value: `${progressBar} **${progress}%** Verified\n*(${metCount}/${totalCount} Operational Milestones Cleared)*`, inline: false },
          { name: '📋 Objective Checklist', value: reqList, inline: false }
        ],
        color: progress >= 100 ? 'success' : 'primary'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Promotion Status Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the promotion status.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
