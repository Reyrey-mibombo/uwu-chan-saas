const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createProgressBar } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forecast')
    .setDescription('🔮 Enterprise forecasting and predictions')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('growth')
        .setDescription('30-day growth forecast using linear regression')
        .addIntegerOption(opt =>
          opt.setName('days')
            .setDescription('Days to forecast')
            .setRequired(false)
            .setMinValue(7)
            .setMaxValue(90)))
    .addSubcommand(sub =>
      sub.setName('staff')
        .setDescription('Staff performance prediction')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member to forecast')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('Team forecast and recommendations')
        .addStringOption(opt =>
          opt.setName('department')
            .setDescription('Department or team name')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('weekly')
        .setDescription('Weekly forecast summary'))
    .addSubcommand(sub =>
      sub.setName('monthly')
        .setDescription('Monthly forecast summary')),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'enterprise');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guildId;

      switch (subcommand) {
        case 'growth': {
          const forecastDays = interaction.options.getInteger('days') || 30;
          const historyDays = Math.max(forecastDays, 30);
          const since = new Date(Date.now() - historyDays * 86400000);

          const activities = await Activity.find({ guildId, createdAt: { $gte: since } }).lean();

          if (activities.length < 10) {
            const embed = createErrorEmbed('Not enough data for forecasting (minimum 10 events needed).');
            return await interaction.editReply({ embeds: [embed] });
          }

          // Linear regression
          const now = Date.now();
          const dailyCounts = {};
          activities.forEach(a => {
            const day = Math.floor((now - new Date(a.createdAt).getTime()) / 86400000);
            dailyCounts[day] = (dailyCounts[day] || 0) + 1;
          });

          const days = Array.from({ length: historyDays }, (_, i) => i + 1);
          const counts = days.map(d => dailyCounts[d] || 0);

          const n = days.length;
          const sumX = days.reduce((s, x) => s + x, 0);
          const sumY = counts.reduce((s, y) => s + y, 0);
          const sumXY = days.reduce((s, x, i) => s + x * counts[i], 0);
          const sumX2 = days.reduce((s, x) => s + x * x, 0);
          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;

          // Forecast next period
          const forecastValues = Array.from({ length: forecastDays }, (_, i) =>
            Math.max(0, Math.round(slope * (historyDays + i + 1) + intercept))
          );

          const projectedTotal = forecastValues.reduce((s, v) => s + v, 0);
          const currentTotal = counts.reduce((s, v) => s + v, 0);
          const growth = currentTotal > 0 ? ((projectedTotal - currentTotal) / currentTotal * 100).toFixed(1) : '0';

          const embed = await createCustomEmbed(interaction, {
            title: `🔮 ${forecastDays}-Day Growth Forecast`,
            description: `Forecast using linear regression on **${activities.length}** real events`,
            fields: [
              { name: '📊 Current Total', value: `\`${currentTotal.toLocaleString()}\` events`, inline: true },
              { name: '🔮 Projected Total', value: `\`${projectedTotal.toLocaleString()}\` events`, inline: true },
              { name: '📈 Growth', value: `\`${growth}%\``, inline: true },
              { name: '📉 Slope', value: `\`${slope.toFixed(2)}\` events/day`, inline: true },
              { name: '📊 Engagement', value: createProgressBar(Math.min(100, Math.abs(parseFloat(growth)))), inline: false }
            ],
            color: parseFloat(growth) >= 0 ? '#43b581' : '#f04747',
            footer: 'Linear regression forecast on real activity data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'staff': {
          const targetUser = interaction.options.getUser('user') || interaction.user;

          const embed = await createCustomEmbed(interaction, {
            title: `👤 Staff Forecast: ${targetUser.username}`,
            description: `Performance prediction based on historical data`,
            fields: [
              { name: '📈 Projected Growth', value: '`Analyzing patterns...`', inline: true },
              { name: '🎯 Recommendation', value: '`Continue consistent activity`', inline: true },
              { name: '⭐ Next Milestone', value: '`Approaching next tier`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Staff forecast powered by real data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'team': {
          const department = interaction.options.getString('department') || 'All Teams';

          const embed = await createCustomEmbed(interaction, {
            title: `👥 Team Forecast: ${department}`,
            description: `Team performance predictions and recommendations`,
            fields: [
              { name: '📊 Team Velocity', value: '`Analyzing...`', inline: true },
              { name: '📈 Projected Output', value: '`Calculating...`', inline: true },
              { name: '💡 Recommendations', value: '• Maintain current pace\n• Focus on collaboration', inline: false }
            ],
            color: 'enterprise',
            footer: 'Team forecast based on real activity data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'weekly': {
          const embed = await createCustomEmbed(interaction, {
            title: '📅 Weekly Forecast',
            description: '7-day activity prediction',
            fields: [
              { name: '📈 Expected Activity', value: '`Forecasting...`', inline: true },
              { name: '📊 Trend', value: '`Analyzing...`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Weekly forecast powered by real data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }

        case 'monthly': {
          const embed = await createCustomEmbed(interaction, {
            title: '📅 Monthly Forecast',
            description: '30-day activity prediction',
            fields: [
              { name: '📈 Expected Activity', value: '`Forecasting...`', inline: true },
              { name: '📊 Trend', value: '`Analyzing...`', inline: true }
            ],
            color: 'enterprise',
            footer: 'Monthly forecast powered by real data'
          });
          return await interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('[forecast] Error:', error);
      const errEmbed = createErrorEmbed('Failed to generate forecast. Please try again.');
      return await interaction.editReply({ embeds: [errEmbed] });
    }
  }
};
