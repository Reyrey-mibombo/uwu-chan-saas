const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_heatmap')
    .setDescription('View hourly activity heatmap for the server'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const acts = await Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean();

    if (!acts.length) return interaction.editReply('📊 No activity data for heatmap.');

    const hours = Array(24).fill(0);
    acts.forEach(a => hours[new Date(a.createdAt).getHours()]++);
    const max = Math.max(...hours, 1);

    const morning = hours.slice(6, 12).reduce((s, v) => s + v, 0);
    const afternoon = hours.slice(12, 18).reduce((s, v) => s + v, 0);
    const evening = hours.slice(18, 24).reduce((s, v) => s + v, 0);
    const night = hours.slice(0, 6).reduce((s, v) => s + v, 0);

    const blocks = hours.map((c, h) => {
      const intensity = c / max;
      const char = intensity > 0.75 ? '█' : intensity > 0.5 ? '▓' : intensity > 0.25 ? '▒' : intensity > 0 ? '░' : '·';
      return `${String(h).padStart(2, '0')}: ${char.repeat(Math.round(intensity * 8)).padEnd(8, '·')} ${c}`;
    });

    const half1 = blocks.slice(0, 12).join('\n');
    const half2 = blocks.slice(12, 24).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🌡️ Server Activity Heatmap — 7 Days')
      .setColor(0xe74c3c)
      .addFields(
        { name: '🌙 Night (00-06)', value: night.toString(), inline: true },
        { name: '🌅 Morning (06-12)', value: morning.toString(), inline: true },
        { name: '🌞 Afternoon (12-18)', value: afternoon.toString(), inline: true },
        { name: '🌆 Evening (18-24)', value: evening.toString(), inline: true },
        { name: '⏰ Hours 00-11', value: `\`\`\`${half1}\`\`\`` },
        { name: '⏰ Hours 12-23', value: `\`\`\`${half2}\`\`\`` }
      )
      .setFooter({ text: `${interaction.guild.name} • Hourly Heatmap (7d)` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
