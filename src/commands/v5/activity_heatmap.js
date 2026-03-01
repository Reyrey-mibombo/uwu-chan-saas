const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_heatmap')
    .setDescription('Visual Spectral Activity Mapping tool')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 14)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const days = Math.min(interaction.options.getInteger('days') || 14, 30);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } }).lean();

      const heatmap = {};
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().split('T')[0];
        heatmap[key] = 0;
      }

      activities.forEach(a => {
        const key = a.createdAt.toISOString().split('T')[0];
        if (heatmap[key] !== undefined) heatmap[key]++;
      });

      const sorted = Object.entries(heatmap).sort((a, b) => b[0].localeCompare(a[0]));
      const maxVal = Math.max(...Object.values(heatmap), 1);
      const total = activities.length;
      const avgPerDay = (total / days).toFixed(1);

      const chart = sorted.map(([date, count]) => {
        const intensity = Math.min(10, Math.floor((count / maxVal) * 10));
        const bars = '█'.repeat(intensity) + '░'.repeat(10 - intensity);
        const dayLabel = new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        return `\`${dayLabel}\` ${bars} **${count}**`;
      }).join('\n');

      const embed = await createCustomEmbed(interaction, {
        title: '🔥 Spectral Activity Mapping',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Density Visualization\nVisualizing 14-day trailing engagement density for sector **${interaction.guild.name}**. Analyzing metabolic signal fluctuations.`,
        fields: [
          { name: '📊 Operational Heatmap', value: chart || '*No signals detected in the active vector.*', inline: false },
          { name: '📈 Total Density', value: `\`${total}\` Signals`, inline: true },
          { name: '🔄 Mean Frequency', value: `\`${avgPerDay}\` / Day`, inline: true },
          { name: '⚖️ Capture Vector', value: `\`${days} Days\``, inline: true }
        ],
        footer: 'Metabolic Activity Visualization • V5 Executive Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Heatmap Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Heatmap Intelligence failure: Unable to plot spectral density matrices.')] });
    }
  }
};
