const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_alerts')
    .setDescription('Alert when activity drops significantly compared to last week'),

  async execute(interaction, client) {
    await interaction.deferReply();
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
      if (change <= -dropThreshold) alerts.push({ type: '🔴 DROP', label, thisVal, lastVal, change: change.toFixed(1) });
      else if (change >= riseThreshold) alerts.push({ type: '🟢 SPIKE', label, thisVal, lastVal, change: `+${change.toFixed(1)}` });
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
      : '✅ No significant trend changes detected this week.';

    const status = alerts.some(a => a.type.includes('DROP')) ? '⚠️ Alerts Active' : '✅ All Clear';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🚨 Trend Alert Monitor')
      ) ? 0xe74c3c : 0x2ecc71)
      .addFields(
        { name: '📊 Status', value: status, inline: true },
        { name: '⚡ This Week Activity', value: thisWeek.length.toString(), inline: true },
        { name: '📅 Last Week Activity', value: lastWeek.length.toString(), inline: true },
        { name: '🔔 Trend Alerts', value: alertText }
      )
      ` })
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
