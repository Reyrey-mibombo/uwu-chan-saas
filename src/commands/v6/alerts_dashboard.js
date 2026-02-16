const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alerts_dashboard')
    .setDescription('View alerts and notifications dashboard')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to look back').setMinValue(1).setMaxValue(30).setDefaultValue(7)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ 
      guildId, 
      createdAt: { $gte: startDate },
      type: { $in: ['warning', 'promotion'] }
    });

    const warnings = activities.filter(a => a.type === 'warning');
    const promotions = activities.filter(a => a.type === 'promotion');
    
    const recentAlerts = await Activity.find({ guildId, createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(10);

    const alertList = recentAlerts.length > 0 
      ? recentAlerts.map(a => `• ${a.type} - ${a.createdAt.toLocaleDateString()}`).join('\n')
      : 'No recent alerts';

    const embed = new EmbedBuilder()
      .setTitle('🚨 Alerts Dashboard')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Warnings', value: warnings.length.toString(), inline: true },
        { name: 'Promotions', value: promotions.length.toString(), inline: true },
        { name: 'Period', value: `${days} days`, inline: true },
        { name: 'Recent Alerts', value: alertList, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
