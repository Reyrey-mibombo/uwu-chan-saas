const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_requirements')
    .setDescription('[Premium] Quick check if a user is mathematically ready to be promoted')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const guildId = interaction.guildId;

      const userData = await User.findOne({ userId: targetUser.id, guildId: guildId }).lean();
      const guild = await Guild.findOne({ guildId: guildId }).lean();

      if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`The user <@${targetUser.id}> is not enrolled as staff in this server.`)] });
      }
      if (!guild || !guild.promotionRequirements) {
        return interaction.editReply({ embeds: [createErrorEmbed('No promotion requirements have been established in this server.')] });
      }

      const currentRank = userData.staff.rank || 'member';
      const points = userData.staff.points || 0;
      const consistency = userData.staff.consistency || 0;

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
          thumbnail: targetUser.displayAvatarURL()
        });
        return interaction.editReply({ embeds: [maxEmbed] });
      }

      const req = guild.promotionRequirements[nextRankName];
      const reqPoints = req.points || 100;
      const reqShifts = req.shifts || 5;
      const reqConsistency = req.consistency || 70;
      const reqMaxWarnings = req.maxWarnings ?? 3;

      const canPromote =
        points >= reqPoints &&
        shiftCount >= reqShifts &&
        consistency >= reqConsistency &&
        warningCount <= reqMaxWarnings;

      // Visual progress bars for "Cool Feature"
      const getBar = (current, target) => {
        const percent = Math.min(100, Math.floor((current / target) * 100));
        const filled = Math.floor(percent / 10);
        return `\`${'■'.repeat(filled)}${'□'.repeat(10 - filled)}\` **${percent}%**`;
      };

      const embed = await createCustomEmbed(interaction, {
        title: canPromote ? '✅ ELIGIBILITY SIGNAL: CLEAR' : '❌ ELIGIBILITY SIGNAL: INCOMPLETE',
        description: canPromote
          ? `### 🎇 Milestone Achieved\n**${targetUser.username}** has successfully fulfilled all operational requirements for the **${nextRankName.toUpperCase()}** rank.`
          : `### 📈 Operational Roadmap\n**${targetUser.username}** is currently on the path to **${nextRankName.toUpperCase()}**. Further activity is required to hit target benchmarks.`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '🏆 Rank Trajectory', value: `\`${currentRank.toUpperCase()}\` ➔ \`${nextRankName.toUpperCase()}\``, inline: false },
          { name: '⭐ Points Protocol', value: `${getBar(points, reqPoints)}\n*Current:* \`${points.toLocaleString()}\` / *Target:* \`${reqPoints.toLocaleString()}\``, inline: true },
          { name: '🔄 Shift Volume', value: `${getBar(shiftCount, reqShifts)}\n*Current:* \`${shiftCount}\` / *Target:* \`${reqShifts}\``, inline: true },
          { name: '📈 Consistency Rating', value: `${getBar(consistency, reqConsistency)}\n*Current:* \`${consistency}%\` / *Target:* \`${reqConsistency}%\``, inline: true },
          { name: '⚠️ Risk Factor (Warnings)', value: `\`${warningCount} / ${reqMaxWarnings}\` ${warningCount <= reqMaxWarnings ? '✅' : '❌'}`, inline: true }
        ],
        color: canPromote ? 'success' : 'primary'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Check Requirements Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while calculating milestone eligibility.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
