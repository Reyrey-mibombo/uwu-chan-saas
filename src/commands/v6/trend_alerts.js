const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_alerts')
    .setDescription('Alert when activity drops significantly compared to last week'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const license = await validatePremiumLicense(interaction, 'enterprise');
    if (!license.allowed) {
      return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
    }
    const guildId = interaction.guildId;
    const now = new Date();
    const thisWeekStart = new Date(now - 7 * 86400000);
    const lastWeekStart = new Date(now - 14 * 86400000);

    const [thisWeek, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: thisWeekStart } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: lastWeekStart, $lt: thisWeekStart } }).lean()
    ]);

    const alerts = [];
    const compareAndAlert = (label, thisVal, lastVal, dropThreshold = 20, riseThreshold = 30) => {
      if (lastVal === 0) return;
      const change = ((thisVal - lastVal) / lastVal) * 100;
      if (change <= -dropThreshold) alerts.push({ type: 'DROP', label, thisVal, lastVal, change: change.toFixed(1) });
      else if (change >= riseThreshold) alerts.push({ type: 'SPIKE', label, thisVal, lastVal, change: `+${change.toFixed(1)}` });
    };

    compareAndAlert('Total Activity', thisWeek.length, lastWeek.length);
    compareAndAlert('Commands', thisWeek.filter(a => a.type === 'command').length, lastWeek.filter(a => a.type === 'command').length);
    compareAndAlert('Warnings', thisWeek.filter(a => a.type === 'warning').length, lastWeek.filter(a => a.type === 'warning').length);
    compareAndAlert('Active Users',
      [...new Set(thisWeek.map(a => a.userId))].length,
      [...new Set(lastWeek.map(a => a.userId))].length
    );

    const alertText = alerts.length
      ? alerts.map(a => `${a.type} **${a.label}**: ${a.thisVal} vs ${a.lastVal} last week (**${a.change}%**)`).join('\n')
      : 'No significant trend changes detected this week.';

    const status = alerts.some(a => a.type.includes('DROP')) ? 'Alerts Active' : 'All Clear';

    const embed = createEnterpriseEmbed()
      .setTitle('Trend Alert Monitor')
      .setColor(alerts.some(a => a.type.includes('DROP')) ? 0xe74c3c : 0x2ecc71)
      .addFields(
        { name: 'Status', value: status, inline: true },
        { name: 'This Week Activity', value: thisWeek.length.toString(), inline: true },
        { name: 'Last Week Activity', value: lastWeek.length.toString(), inline: true },
        { name: 'Trend Alerts', value: alertText }
      );

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_trend_alerts').setLabel('Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
    await interaction.editReply({ embeds: [embed], components: [row] });
  }
};
