const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Guild } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_rank_advanced')
    .setDescription('Advanced hierarchy ranking calculation matrices mapped against Guild DB.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check rank for')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const user = await User.findOne({ userId: targetUser.id, guildId }).lean();
      if (!user || !user.staff) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_staff_rank_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`Missing target footprint. <@${targetUser.id}> is unregistered globally inside this server.`)], components: [row] });
      }

      const guild = await Guild.findOne({ guildId }).lean();
      if (!guild || !guild.promotionRequirements) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_staff_rank_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`Missing mapping. The active administrator has not setup backend /promo_setup values required to project ranking boundaries.`)], components: [row] });
      }

      // Global Guild Ranked Sandbox Filtering to compute comparative positioning
      const users = await User.find({
        guildId,
        staff: { $exists: true }
      }).lean();

      const sortedByPoints = [...users].sort((a, b) => (b.staff?.points || 0) - (a.staff?.points || 0));
      const rankIndex = sortedByPoints.findIndex(u => u.userId === targetUser.id);
      const rank = rankIndex + 1;

      const staff = user.staff || {};
      const currentRank = staff.rank || 'member';
      const points = staff.points || 0;
      const consistency = staff.consistency || 100;
      const reputation = staff.reputation || 0;
      const warnings = staff.warnings || 0;

      // Fetch Dynamic Values instead of legacy Array String Mockups!
      const rankHierarchy = Object.keys(guild.promotionRequirements);
      if (!rankHierarchy.includes('member')) rankHierarchy.unshift('member');
      if (!rankHierarchy.includes('trial')) rankHierarchy.splice(1, 0, 'trial');

      const currentRankIndex = rankHierarchy.indexOf(currentRank);
      const nextRank = rankHierarchy[currentRankIndex + 1];

      // Retrieve actual target score threshold from Db mapped logic dynamically
      let pointsForNextRank = null;
      let pointsToNext = 0;
      let progressStr = '';

      if (nextRank && guild.promotionRequirements[nextRank]) {
        pointsForNextRank = guild.promotionRequirements[nextRank].points || 150;
        pointsToNext = Math.max(0, pointsForNextRank - points);

        // Generate string mapping progress against Custom mapped limit
        const previousThreshold = currentRankIndex > 0 && guild.promotionRequirements[currentRank]
          ? guild.promotionRequirements[currentRank].points || 0
          : 0;

        const deltaLimit = pointsForNextRank - previousThreshold;
        const currentProgress = points - previousThreshold;
        const progressRatio = Math.min(1, Math.max(0, currentProgress / deltaLimit));
        const pipCount = Math.round(progressRatio * 15); // Width

        progressStr = `\`${'�'.repeat(pipCount)}${'�'.repeat(15 - pipCount)}\` ${points}/${pointsForNextRank}`;
      } else {
        progressStr = '`���������������` **MAXIMUM**';
      }

      const embed = await createCustomEmbed(interaction, {
        title: `?? Advanced Progression Vector: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `Aggregating hierarchy thresholds directly against mapping logic created by **${interaction.guild.name}**.`,
        fields: [
          { name: '?? Valid Rank Status', value: `\`${currentRank.toUpperCase()}\``, inline: true },
          { name: '?? Server Position', value: `\`#${rank} / ${users.length}\``, inline: true },
          { name: '?? Projection Queue', value: nextRank ? `\`${nextRank.toUpperCase()}\`` : '`---`', inline: true },
          { name: '?? Projection Yield', value: nextRank ? `**${pointsToNext}** points required` : '*Zero requirements flagged.*', inline: false },
          { name: '?? Mathematical Bounds', value: progressStr, inline: false },
          { name: '? Total Points Yield', value: `\`${points}\``, inline: true },
          { name: '?? Rolling Consistency', value: `\`${consistency}%\``, inline: true },
          { name: '?? Reputation Nodes', value: `\`${reputation}\``, inline: true },
          { name: '?? Disciplinary Action', value: `\`${warnings}\``, inline: true }
        ],
        footer: 'Algorithms execute locally. They respect arbitrary parameters dynamically selected.'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_staff_rank_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Rank Advanced Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred generating overlapping requirement boundaries.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_staff_rank_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


