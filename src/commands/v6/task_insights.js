const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_insights')
    .setDescription('View shift and task completion insights'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const shifts = await Shift.find({ guildId, startTime: { $gte: thirtyDaysAgo } }).lean();

    if (!shifts.length) {
      return interaction.editReply('📊 No shift data found for the past 30 days.');
    }

    const completed = shifts.filter(s => s.endTime);
    const incomplete = shifts.filter(s => !s.endTime);
    const completionRate = ((completed.length / shifts.length) * 100).toFixed(1);

    const durations = completed.map(s => {
      const dur = s.duration || (new Date(s.endTime) - new Date(s.startTime)) / 3600000;
      return dur;
    });

    const avgDuration = durations.length ? (durations.reduce((s, v) => s + v, 0) / durations.length).toFixed(2) : '0';
    const maxDuration = durations.length ? Math.max(...durations).toFixed(2) : '0';
    const minDuration = durations.length ? Math.min(...durations).toFixed(2) : '0';

    const uniqueStaff = [...new Set(shifts.map(s => s.userId))].length;

    // Completion bar
    const bar = '▓'.repeat(Math.round(parseFloat(completionRate) / 10)) + '░'.repeat(10 - Math.round(parseFloat(completionRate) / 10));

    const embed = new EmbedBuilder()
      .setTitle('⏰ Task & Shift Insights')
      .setColor(0x1abc9c)
      .addFields(
        { name: '✅ Completed Shifts', value: completed.length.toString(), inline: true },
        { name: '⏳ Incomplete Shifts', value: incomplete.length.toString(), inline: true },
        { name: '📊 Completion Rate', value: `${completionRate}%`, inline: true },
        { name: '⏱️ Avg Duration', value: `${avgDuration}h`, inline: true },
        { name: '🔝 Longest Shift', value: `${maxDuration}h`, inline: true },
        { name: '⚡ Shortest Shift', value: `${minDuration}h`, inline: true },
        { name: '👥 Staff Who Shifted', value: uniqueStaff.toString(), inline: true },
        { name: '🔄 Total Shifts', value: shifts.length.toString(), inline: true },
        { name: '📈 Completion Bar', value: `\`${bar}\` ${completionRate}%`, inline: false }
      )
      .setFooter({ text: `${interaction.guild.name} • 30-Day Shift Insights` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
