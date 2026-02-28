const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_trends_visual')
    .setDescription('Visual engagement trends with color-coded indicators'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const now = new Date();
    const w1 = new Date(now - 7 * 86400000);
    const w2 = new Date(now - 14 * 86400000);

    const [thisWeek, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: w1 } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: w2, $lt: w1 } }).lean()
    ]);

    const metrics = [
      ['Total Events', thisWeek.length, lastWeek.length],
      ['Commands', thisWeek.filter(a => a.type === 'command').length, lastWeek.filter(a => a.type === 'command').length],
      ['Unique Users', [...new Set(thisWeek.map(a => a.userId))].length, [...new Set(lastWeek.map(a => a.userId))].length],
      ['Warnings', thisWeek.filter(a => a.type === 'warning').length, lastWeek.filter(a => a.type === 'warning').length],
    ];

    const rows = metrics.map(([name, cur, prev]) => {
      const change = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
      const arrow = change > 5 ? '📈' : change < -5 ? '📉' : '➡️';
      return `${arrow} **${name}**: ${cur} vs ${prev} (${change > 0 ? '+' : ''}${change}%)`;
    }).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('📈 Engagement Trends Visual')
      
      .setDescription(rows)
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



