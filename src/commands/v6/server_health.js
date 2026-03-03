const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createEnterpriseEmbed, createErrorEmbed, createProgressBar, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, Warning, Shift, User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_health')
    .setDescription('?? Enterprise server health score � calculated from real retention, safety, and engagement data'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'enterprise');
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 86400000);
      const thirtyDaysAgo = new Date(now - 30 * 86400000);

      const [weekActs, monthActs, weekWarnings, weekShifts, allUsers] = await Promise.all([
        Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        Activity.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean(),
        Warning.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        Shift.find({ guildId, startTime: { $gte: sevenDaysAgo }, endTime: { $ne: null } }).lean(),
        User.find({ userId: { $exists: true } }).lean()
      ]);

      const memberCount = interaction.guild.memberCount;

      // 1. Engagement score (0-100): active users vs total members
      const activeUsers = new Set(weekActs.map(a => a.userId)).size;
      const engageScore = Math.min(100, Math.round((activeUsers / Math.max(memberCount, 1)) * 100 * 2));

      // 2. Safety score (0-100): fewer warnings = better
      const warningsPerUser = weekWarnings.length / Math.max(activeUsers, 1);
      const safetyScore = Math.max(0, Math.round(100 - (warningsPerUser * 30)));

      // 3. Activity score (0-100): command count vs member count
      const activityPerMember = monthActs.length / Math.max(memberCount, 1);
      const activityScore = Math.min(100, Math.round(activityPerMember * 10));

      // 4. Staff consistency (0-100): average consistency of all staff
      const staffUsers = allUsers.filter(u => u.staff?.consistency);
      const avgConsistency = staffUsers.length > 0
        ? staffUsers.reduce((s, u) => s + (u.staff.consistency || 100), 0) / staffUsers.length
        : 100;

      // 5. overall health score (weighted avg)
      const healthScore = Math.round(
        (engageScore * 0.30) +
        (safetyScore * 0.30) +
        (activityScore * 0.20) +
        (avgConsistency * 0.20)
      );

      const healthLabel = healthScore >= 80 ? '?? **Excellent**' : healthScore >= 60 ? '?? **Good**' : healthScore >= 40 ? '?? **Fair**' : '?? **Poor**';
      const healthColor = healthScore >= 80 ? '#43b581' : healthScore >= 60 ? '#faa61a' : healthScore >= 40 ? '#ff7043' : '#f04747';

      const embed = await createCustomEmbed(interaction, {
        title: `?? Server Health � ${interaction.guild.name}`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `**Overall Health Score:** ${healthLabel}\n\`${createProgressBar(healthScore)}\` **${healthScore}/100**`,
        fields: [
          { name: '?? Engagement', value: `\`${createProgressBar(engageScore)}\` **${engageScore}%**\n${activeUsers} active users this week`, inline: false },
          { name: '??? Safety', value: `\`${createProgressBar(safetyScore)}\` **${safetyScore}%**\n${weekWarnings.length} warnings this week`, inline: false },
          { name: '? Activity Level', value: `\`${createProgressBar(activityScore)}\` **${activityScore}%**\n${monthActs.length} events in 30 days`, inline: false },
          { name: '?? Staff Consistency', value: `\`${createProgressBar(Math.round(avgConsistency))}\` **${avgConsistency.toFixed(1)}%**`, inline: false },
          { name: '?? Shifts This Week', value: `\`${weekShifts.length}\` completed`, inline: true },
          { name: '?? Total Members', value: `\`${memberCount.toLocaleString()}\``, inline: true }
        ],
        color: healthColor,
        footer: 'uwu-chan � Enterprise Server Health � Real Data'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_server_health').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('[server_health] Error:', error);
      const errEmbed = createErrorEmbed('Failed to calculate server health score.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_server_health').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary)); if (interaction.deferred || interaction.replied) {
            return await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};


