const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_patterns')
    .setDescription('Analyze activity patterns over time')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days to analyze').setMinValue(7).setMaxValue(90).setDefaultValue(30)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    
    const hourlyPattern = Array(24).fill(0);
    const dayOfWeekPattern = Array(7).fill(0);
    
    activities.forEach(act => {
      const hour = act.createdAt.getHours();
      const day = act.createdAt.getDay();
      hourlyPattern[hour]++;
      dayOfWeekPattern[day]++;
    });

    const peakHour = hourlyPattern.indexOf(Math.max(...hourlyPattern));
    const peakDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeekPattern.indexOf(Math.max(...dayOfWeekPattern))];
    
    const hourBuckets = [0, 0, 0, 0, 0, 0];
    hourlyPattern.forEach((count, i) => {
      const bucket = Math.floor(i / 4);
      hourBuckets[bucket] += count;
    });
    
    const timeBlocks = ['12AM-4AM', '4AM-8AM', '8AM-12PM', '12PM-4PM', '4PM-8PM', '8PM-12AM'];
    const peakBlock = timeBlocks[hourBuckets.indexOf(Math.max(...hourBuckets))];

    const embed = new EmbedBuilder()
      .setTitle('📈 Activity Patterns')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Peak Hour', value: `${peakHour}:00`, inline: true },
        { name: 'Peak Day', value: peakDay, inline: true },
        { name: 'Peak Time Block', value: peakBlock, inline: true },
        { name: 'Total Records', value: activities.length.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
