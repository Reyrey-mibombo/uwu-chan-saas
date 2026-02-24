const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_trends')
    .setDescription('Compare engagement trends week over week'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const now = new Date();
    const w1Start = new Date(now - 7 * 86400000);
    const w2Start = new Date(now - 14 * 86400000);

    const [thisWeek, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: w1Start } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: w2Start, $lt: w1Start } }).lean()
    ]);

    const activeNow = [...new Set(thisWeek.map(a => a.userId))].length;
    const activeLast = [...new Set(lastWeek.map(a => a.userId))].length;
    const userChange = activeLast > 0 ? (((activeNow - activeLast) / activeLast) * 100).toFixed(1) : 'N/A';
    const actChange = lastWeek.length > 0 ? (((thisWeek.length - lastWeek.length) / lastWeek.length) * 100).toFixed(1) : 'N/A';

    const cmdNow = thisWeek.filter(a => a.type === 'command').length;
    const cmdLast = lastWeek.filter(a => a.type === 'command').length;
    const warnNow = thisWeek.filter(a => a.type === 'warning').length;
    const warnLast = lastWeek.filter(a => a.type === 'warning').length;

    const trend = (tw, lw) => lw === 0 ? '➡️' : tw > lw ? '📈' : tw < lw ? '📉' : '➡️';

    const embed = new EmbedBuilder()
      .setTitle('📈 Engagement Trends')
      .setColor(0x3498db)
      .addFields(
        { name: '📊 Activity This Week', value: thisWeek.length.toString(), inline: true },
        { name: '📅 Activity Last Week', value: lastWeek.length.toString(), inline: true },
        { name: `${trend(thisWeek.length, lastWeek.length)} Change`, value: actChange === 'N/A' ? 'N/A' : `${actChange}%`, inline: true },
        { name: `${trend(activeNow, activeLast)} Active Users`, value: `${activeNow} vs ${activeLast}`, inline: true },
        { name: `${trend(cmdNow, cmdLast)} Commands`, value: `${cmdNow} vs ${cmdLast}`, inline: true },
        { name: `${trend(warnLast, warnNow)} Warnings`, value: `${warnNow} vs ${warnLast}`, inline: true },
        { name: '👥 User Change', value: userChange === 'N/A' ? 'N/A' : `${userChange}%`, inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Engagement Trends` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
