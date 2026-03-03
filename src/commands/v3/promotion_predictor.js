const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Activity, Shift, Guild } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predictor')
    .setDescription('Algorithmic vector predicting dynamic promotion states based on raw execution statistics.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Operator target receiving predictive profiling')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      // Strip legacy execution constraints reading dynamically from object properties defined strictly by users
      const guild = await Guild.findOne({ guildId }).lean();
      if (!guild || !guild.promotionRequirements) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_predictor').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`Missing mapping bounds. Admin has not initialized \`/promo_setup\` inside this server yet.`)], components: [row] });
      }

      let user = await User.findOne({ userId: targetUser.id, guildId }).lean();
      if (!user || !user.staff) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_predictor').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`Unregistered execution. <@${targetUser.id}> isn't tracked globally inside this server footprint.`)], components: [row] });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activities = await Activity.find({ guildId, userId: targetUser.id, createdAt: { $gte: thirtyDaysAgo } }).lean();
      const shifts = await Shift.find({ guildId, userId: targetUser.id, startTime: { $gte: thirtyDaysAgo } }).lean();

      const staff = user.staff || {};
      const points = staff.points || 0;
      const consistency = staff.consistency || 100;
      const reputation = staff.reputation || 0;
      const currentRank = staff.rank || 'member';

      const commands = activities.filter(a => a.type === 'command').length;
      const completedShifts = shifts.filter(s => s.endTime).length;

      // Map hierarchy thresholds directly against valid JSON keys
      const rankHierarchy = Object.keys(guild.promotionRequirements);
      if (!rankHierarchy.includes('member')) rankHierarchy.unshift('member');
      if (!rankHierarchy.includes('trial')) rankHierarchy.splice(1, 0, 'trial'); // Enforce standard baseline

      const currentRankIndex = rankHierarchy.indexOf(currentRank);
      const nextRank = rankHierarchy[currentRankIndex + 1];

      if (!nextRank || !guild.promotionRequirements[nextRank]) {
        const embedMax = await createCustomEmbed(interaction, {
          title: `?? Algorithm Predictor: ${targetUser.username}`,
          thumbnail: targetUser.displayAvatarURL(),
          description: `Operator <@${targetUser.id}> has already achieved the highest execution parameters flagged mapped inside **${interaction.guild.name}**.`,
          fields: [
            { name: '? Rank Parameters Bound', value: `\`${currentRank.toUpperCase()}\``, inline: true },
            { name: '??? Algorithmic Vector', value: '`MAXIMUM THRESHOLD`', inline: true }
          ]
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_predictor').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embedMax], components: [row] });
      }

      const requirements = guild.promotionRequirements[nextRank];
      const reqPoints = requirements.points || 0;
      const reqConsistency = requirements.consistency || 0;
      const reqShifts = requirements.completedShifts || 0;

      // Calculate progress ratio predicting success
      let ratioScore = 0;
      let categories = 0;

      if (reqPoints > 0) { ratioScore += Math.min(100, (points / reqPoints) * 100); categories++; }
      if (reqConsistency > 0) { ratioScore += Math.min(100, (consistency / reqConsistency) * 100); categories++; }
      if (reqShifts > 0) { ratioScore += Math.min(100, (completedShifts / reqShifts) * 100); categories++; }

      const overallPredictiveScore = categories > 0 ? Math.round(ratioScore / categories) : 100;
      const isEligible = overallPredictiveScore >= 100;

      const predictionLabel = isEligible ? 'Eligible for promotion! ??' : `Trailing Target Limits`;
      const embedColor = isEligible ? '#00FF00' : '#FFA500';

      const reqStringList = [];
      if (reqPoints > 0) reqStringList.push(`?? \`${reqPoints}\` Priority Points`);
      if (reqConsistency > 0) reqStringList.push(`?? \`${reqConsistency}%\` Local Consistency`);
      if (reqShifts > 0) reqStringList.push(`?? \`${reqShifts}\` Processed Patrols`);
      if (requirements.reputation && requirements.reputation > 0) reqStringList.push(`?? \`${requirements.reputation}\` Lifetime Rep`);

      const embed = await createCustomEmbed(interaction, {
        title: `?? Algorithm Predictor: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `Trailing performance bounds aggregating against thresholds configured by **${interaction.guild.name}** backend metrics.`,
        color: embedColor,
        fields: [
          { name: '? Valid Executed Status', value: `\`${currentRank.toUpperCase()}\``, inline: true },
          { name: '?? Global Predictive Vectors', value: `\`${overallPredictiveScore}/100\``, inline: true },
          { name: '?? Algorithm Prediction', value: `\`${predictionLabel}\``, inline: false },

          { name: '? Point Trajectory', value: `\`${points}\``, inline: true },
          { name: '??? Local Consistency', value: `\`${consistency}%\``, inline: true },
          { name: '?? Reputation Lifetime', value: `\`${reputation}\``, inline: true },
          { name: '? Lifetime Deployments', value: `\`${commands}\` Cmds`, inline: true },
          { name: '?? Executed Bounds', value: `\`${completedShifts}\` Pings`, inline: true },

          { name: `?? Execution Requirements for limit: [${nextRank.toUpperCase()}]`, value: reqStringList.join('\n') || '*Unconfigured Algorithm Limits*', inline: false }
        ],
        footer: 'Dynamic matrices recalculate based securely entirely on local server execution traits.'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_predictor').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Promotion Predictor Error:', error);
      const errEmbed = createErrorEmbed('A database execution error occurred indexing algorithmic promotional bounds.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_predictor').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


