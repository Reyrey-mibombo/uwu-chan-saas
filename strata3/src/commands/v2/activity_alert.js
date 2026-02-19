const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_alert')
    .setDescription('View activity alerts')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Alert type to filter')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Warnings', value: 'warning' },
          { name: 'Promotions', value: 'promotion' },
          { name: 'Shifts', value: 'shift' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const alertType = interaction.options.getString('type') || 'all';
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const query = {
      guildId,
      createdAt: { $gte: weekAgo }
    };

    if (alertType !== 'all') {
      query.type = alertType;
    } else {
      query.type = { $in: ['warning', 'promotion', 'shift'] };
    }

    const alerts = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(20);

    if (alerts.length === 0) {
      return interaction.reply({ 
        content: 'No activity alerts found for the past week.',
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Activity Alerts')
      .setColor(0xe74c3c)
      .setDescription(`Showing ${alerts.length} alerts from the past week`);

    const alertGroups = {
      warning: [],
      promotion: [],
      shift: []
    };

    alerts.forEach(alert => {
      if (alertGroups[alert.type]) {
        alertGroups[alert.type].push(alert);
      }
    });

    for (const [type, items] of Object.entries(alertGroups)) {
      if (items.length > 0) {
        const typeIcon = type === 'warning' ? '⚠️' : type === 'promotion' ? '🎉' : '⏱️';
        const typeList = items.slice(0, 5).map(a => 
          `${typeIcon} <@${a.userId}> - ${new Date(a.createdAt).toLocaleDateString()}`
        ).join('\n');
        embed.addFields({ name: `${type.charAt(0).toUpperCase() + type.slice(1)}s`, value: typeList, inline: true });
      }
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
