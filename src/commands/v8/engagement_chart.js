const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_chart')
    .setDescription('Visual engagement chart comparing 4 weeks of activity'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const now = new Date();
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date(now - (w + 1) * 7 * 86400000);
      const end = new Date(now - w * 7 * 86400000);
      const count = await Activity.countDocuments({ guildId, createdAt: { $gte: start, $lt: end } });
      const label = `W-${w}`;
      weeks.push({ label, count });
    }
    const max = Math.max(...weeks.map(w => w.count), 1);
    const chart = weeks.map(w => {
      const bar = '█'.repeat(Math.round((w.count / max) * 12)).padEnd(12, '░');
      return `${w.label}: ${bar} ${w.count}`;
    }).join('\n');

    const trend = weeks[3].count >= weeks[0].count ? '📈 Growing' : '📉 Declining';

    const embed = new EmbedBuilder()
      .setTitle('📊 4-Week Engagement Chart')
      .setColor(0x3498db)
      .setDescription(`\`\`\`${chart}\n\n(W-0 = this week, W-3 = 3 weeks ago)\`\`\``)
      .addFields(
        { name: '📈 Trend', value: trend, inline: true },
        { name: '🔝 Best Week', value: `${weeks.find(w => w.count === Math.max(...weeks.map(x => x.count)))?.label}: ${Math.max(...weeks.map(w => w.count))} events`, inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • 4-Week Comparison` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
