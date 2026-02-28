const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_summary')
    .setDescription('View event summary')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 30)').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: startDate },
      type: { $in: ['shift', 'warning', 'promotion'] }
    });

    const shifts = activities.filter(a => a.type === 'shift').length;
    const warnings = activities.filter(a => a.type === 'warning').length;
    const promotions = activities.filter(a => a.type === 'promotion').length;

    const eventTypes = {};
    activities.forEach(a => {
      const dateKey = a.createdAt.toISOString().slice(0, 7);
      eventTypes[dateKey] = (eventTypes[dateKey] || 0) + 1;
    });

    const sortedMonths = Object.entries(eventTypes).sort((a, b) => b[0].localeCompare(a[0]));

    const embed = createPremiumEmbed()
      .setTitle('🎉 Event Summary')
      
      .addFields(
        { name: 'Shifts', value: shifts.toString(), inline: true },
        { name: 'Warnings', value: warnings.toString(), inline: true },
        { name: 'Promotions', value: promotions.toString(), inline: true },
        { name: 'Total Events', value: activities.length.toString(), inline: true }
      )
      .setDescription(sortedMonths.slice(0, 6).map(([month, count]) => `${month}: ${count} events`).join('\n'))
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



