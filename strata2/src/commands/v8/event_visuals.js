const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_visuals')
    .setDescription('View event visuals and statistics')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to look back (default 30)').setMinValue(1).setMaxValue(90)),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 30;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const eventActivities = await Activity.find({
      guildId,
      type: 'event',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    const eventCounts = {};
    eventActivities.forEach(a => {
      const eventName = a.data?.eventName || 'Unknown Event';
      eventCounts[eventName] = (eventCounts[eventName] || 0) + 1;
    });

    const totalEvents = eventActivities.length;
    const uniqueEvents = Object.keys(eventCounts).length;
    const participants = new Set(eventActivities.map(a => a.userId)).size;

    const embed = new EmbedBuilder()
      .setTitle('🎉 Event Visuals')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Events', value: `${totalEvents}`, inline: true },
        { name: 'Unique Events', value: `${uniqueEvents}`, inline: true },
        { name: 'Total Participants', value: `${participants}`, inline: true }
      );

    if (Object.keys(eventCounts).length > 0) {
      const eventList = Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([event, count]) => `${event}: ${count}`)
        .join('\n');
      embed.addFields({ name: 'Top Events', value: eventList, inline: false });
    } else {
      embed.setDescription('No events found in this period.');
    }

    await interaction.reply({ embeds: [embed] });
  }
};
