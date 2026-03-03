const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_forecast')
    .setDescription('View next week\'s activity forecast based on the past 2 weeks'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [twoWeeks, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: fourteenDaysAgo } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean()
    ]);

    if (!twoWeeks.length) {
      return interaction.editReply('?? Not enough data for a weekly forecast.');
    }

    const firstWeekCount = twoWeeks.length - lastWeek.length;
    const growth = firstWeekCount > 0 ? ((lastWeek.length - firstWeekCount) / firstWeekCount * 100).toFixed(1) : '0';
    const predictedTotal = Math.round(lastWeek.length * (1 + parseFloat(growth) / 200));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const lastWeekByDay = Array(7).fill(0);
    lastWeek.forEach(a => { lastWeekByDay[new Date(a.createdAt).getDay()]++; });

    const now = new Date();
    const nextWeekLines = [];
    for (let i = 1; i <= 7; i++) {
      const day = new Date(now.getTime() + i * 86400000);
      const dow = day.getDay();
      const base = lastWeekByDay[dow];
      const predicted = Math.max(0, Math.round(base * (1 + parseFloat(growth) / 200)));
      const bar = '�'.repeat(Math.min(8, Math.round(predicted / Math.max(...lastWeekByDay, 1) * 8)));
      nextWeekLines.push(`${dayNames[dow]} ${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${bar.padEnd(8)} ~${predicted}`);
    }

    const embed = createEnterpriseEmbed()
      .setTitle('?? Weekly Activity Forecast')
      
      .setDescription(`\`\`\`${nextWeekLines.join('\n')}\`\`\``)
      .addFields(
        { name: '?? Last Week Total', value: lastWeek.length.toString(), inline: true },
        { name: '?? Week-over-Week Growth', value: `${growth}%`, inline: true },
        { name: '?? Predicted Next Week', value: predictedTotal.toString(), inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_weekly_forecast').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





