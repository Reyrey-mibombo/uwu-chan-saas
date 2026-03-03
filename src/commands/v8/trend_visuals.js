const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_visuals')
    .setDescription('Visual trend display comparing this week vs last week'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const now = new Date();
    const w1 = new Date(now - 7 * 86400000);
    const w2 = new Date(now - 14 * 86400000);
    const [thisWeek, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: w1 } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: w2, $lt: w1 } }).lean()
    ]);

    const arrow = (a, b) => a > b ? '??' : a < b ? '??' : '??';
    const pct = (a, b) => b > 0 ? `${((a - b) / b * 100).toFixed(1)}%` : 'N/A';

    const rows = [
      ['Total Events', thisWeek.length, lastWeek.length],
      ['Commands', thisWeek.filter(a => a.type === 'command').length, lastWeek.filter(a => a.type === 'command').length],
      ['Warnings', thisWeek.filter(a => a.type === 'warning').length, lastWeek.filter(a => a.type === 'warning').length],
      ['Active Users', [...new Set(thisWeek.map(a => a.userId))].length, [...new Set(lastWeek.map(a => a.userId))].length],
    ];

    const display = rows.map(([name, cur, prev]) => `${arrow(cur, prev)} **${name}**: ${cur} vs ${prev} (${pct(cur, prev)})`).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('?? Trend Visuals')
      
      .setDescription(display)
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_trend_visuals').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







