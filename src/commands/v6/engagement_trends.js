const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_trends')
    .setDescription('Compare engagement trends week over week'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
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

    const trend = (tw, lw) => lw === 0 ? '??' : tw > lw ? '??' : tw < lw ? '??' : '??';

    const embed = createEnterpriseEmbed()
      .setTitle('?? Engagement Trends')
      
      .addFields(
        { name: '?? Activity This Week', value: thisWeek.length.toString(), inline: true },
        { name: '?? Activity Last Week', value: lastWeek.length.toString(), inline: true },
        { name: `${trend(thisWeek.length, lastWeek.length)} Change`, value: actChange === 'N/A' ? 'N/A' : `${actChange}%`, inline: true },
        { name: `${trend(activeNow, activeLast)} Active Users`, value: `${activeNow} vs ${activeLast}`, inline: true },
        { name: `${trend(cmdNow, cmdLast)} Commands`, value: `${cmdNow} vs ${cmdLast}`, inline: true },
        { name: `${trend(warnLast, warnNow)} Warnings`, value: `${warnNow} vs ${warnLast}`, inline: true },
        { name: '?? User Change', value: userChange === 'N/A' ? 'N/A' : `${userChange}%`, inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_engagement_trends').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





