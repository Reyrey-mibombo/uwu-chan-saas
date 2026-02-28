const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_visuals')
    .setDescription('Visual trend display comparing this week vs last week'),

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

    const arrow = (a, b) => a > b ? '📈' : a < b ? '📉' : '➡️';
    const pct = (a, b) => b > 0 ? `${((a - b) / b * 100).toFixed(1)}%` : 'N/A';

    const rows = [
      ['Total Events', thisWeek.length, lastWeek.length],
      ['Commands', thisWeek.filter(a => a.type === 'command').length, lastWeek.filter(a => a.type === 'command').length],
      ['Warnings', thisWeek.filter(a => a.type === 'warning').length, lastWeek.filter(a => a.type === 'warning').length],
      ['Active Users', [...new Set(thisWeek.map(a => a.userId))].length, [...new Set(lastWeek.map(a => a.userId))].length],
    ];

    const display = rows.map(([name, cur, prev]) => `${arrow(cur, prev)} **${name}**: ${cur} vs ${prev} (${pct(cur, prev)})`).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('📊 Trend Visuals')
      
      .setDescription(display)
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};



