const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Warning, Shift, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alerts_dashboard')
    .setDescription('View active alerts and issues requiring attention'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

    const [recentWarnings, stuckShifts, guild] = await Promise.all([
      Warning.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).sort({ createdAt: -1 }).limit(5).lean(),
      Shift.find({ guildId, startTime: { $lte: eightHoursAgo }, endTime: null }).lean(),
      Guild.findOne({ guildId }).lean()
    ]);

    const highWarnings = recentWarnings.filter(w => w.severity === 'high');
    const medWarnings = recentWarnings.filter(w => w.severity === 'medium');

    let alertLevel = '🟢 Low';
    if (highWarnings.length > 0 || stuckShifts.length > 3) alertLevel = '🔴 High';
    else if (medWarnings.length > 2 || stuckShifts.length > 0) alertLevel = '🟡 Medium';

    const warningText = recentWarnings.length
      ? recentWarnings.slice(0, 3).map(w => `• <@${w.userId}> — ${w.reason?.slice(0, 40) || 'No reason'} (${w.severity})`).join('\n')
      : '✅ No warnings this week';

    const shiftText = stuckShifts.length
      ? stuckShifts.slice(0, 3).map(s => `• <@${s.userId}> — Started <t:${Math.floor(new Date(s.startTime).getTime() / 1000)}:R>`).join('\n')
      : '✅ No stuck shifts';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🚨 Alerts Dashboard')
      
      .addFields(
        { name: '⚠️ Alert Level', value: alertLevel, inline: true },
        { name: '🔴 High Warnings (7d)', value: highWarnings.length.toString(), inline: true },
        { name: '🟡 Medium Warnings (7d)', value: medWarnings.length.toString(), inline: true },
        { name: '🕐 Stuck Shifts (8h+)', value: stuckShifts.length.toString(), inline: true },
        { name: '📊 Total Warnings (7d)', value: recentWarnings.length.toString(), inline: true },
        { name: '⚡ Commands Used (All)', value: (guild?.stats?.commandsUsed || 0).toString(), inline: true },
        { name: '🔔 Recent Warnings', value: warningText },
        { name: '⏰ Stuck Shifts', value: shiftText }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
