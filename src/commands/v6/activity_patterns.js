const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_patterns')
    .setDescription('Analyze activity patterns over the last 30 days'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean();

    if (!activities.length) {
      return interaction.editReply('📊 No activity data found for the past 30 days.');
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = Array(7).fill(0);
    const typeCounts = { command: 0, message: 0, shift: 0, warning: 0, promotion: 0 };

    activities.forEach(a => {
      dayCounts[new Date(a.createdAt).getDay()]++;
      if (typeCounts[a.type] !== undefined) typeCounts[a.type]++;
    });

    const maxDay = Math.max(...dayCounts);
    const dayBars = dayNames.map((d, i) => {
      const bar = '▓'.repeat(Math.round((dayCounts[i] / Math.max(maxDay, 1)) * 8)) + '░'.repeat(8 - Math.round((dayCounts[i] / Math.max(maxDay, 1)) * 8));
      return `${d}: ${bar} ${dayCounts[i]}`;
    }).join('\n');

    const weekdays = dayCounts.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekends = dayCounts[0] + dayCounts[6];

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📅 Activity Patterns — Last 30 Days')
      
      .addFields(
        { name: '📊 Total Events', value: activities.length.toString(), inline: true },
        { name: '📅 Weekday Activity', value: weekdays.toString(), inline: true },
        { name: '🏖️ Weekend Activity', value: weekends.toString(), inline: true },
        { name: '⚡ Commands', value: typeCounts.command.toString(), inline: true },
        { name: '🔔 Warnings', value: typeCounts.warning.toString(), inline: true },
        { name: '🏆 Promotions', value: typeCounts.promotion.toString(), inline: true },
        { name: '📆 Weekly Pattern', value: `\`\`\`${dayBars}\`\`\`` }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
