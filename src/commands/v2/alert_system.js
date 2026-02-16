const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_system')
    .setDescription('View alert system status and recent alerts')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform')
        .setRequired(false)
        .addChoices(
          { name: 'View Alerts', value: 'view' },
          { name: 'Statistics', value: 'stats' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const action = interaction.options.getString('action') || 'view';
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (action === 'stats') {
      const totalAlerts = await Activity.countDocuments({
        guildId,
        type: { $in: ['warning', 'promotion'] },
        createdAt: { $gte: weekAgo }
      });

      const warnings = await Activity.countDocuments({
        guildId,
        type: 'warning',
        createdAt: { $gte: weekAgo }
      });

      const promotions = await Activity.countDocuments({
        guildId,
        type: 'promotion',
        createdAt: { $gte: weekAgo }
      });

      const activeStaff = await User.countDocuments({
        'guilds.guildId': guildId,
        'staff.points': { $gt: 0 }
      });

      const embed = new EmbedBuilder()
        .setTitle('📊 Alert System Statistics')
        .setColor(0x3498db)
        .addFields(
          { name: 'Total Alerts (7d)', value: totalAlerts.toString(), inline: true },
          { name: 'Warnings', value: warnings.toString(), inline: true },
          { name: 'Promotions', value: promotions.toString(), inline: true },
          { name: 'Active Staff', value: activeStaff.toString(), inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const recentAlerts = await Activity.find({
      guildId,
      type: { $in: ['warning', 'promotion'] }
    })
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentAlerts.length === 0) {
      return interaction.reply({ 
        content: 'No alerts found in the system.',
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔔 Recent Alerts')
      .setColor(0xf39c12)
      .setDescription('Recent warning and promotion alerts');

    const alertList = recentAlerts.map(alert => {
      const icon = alert.type === 'warning' ? '⚠️' : '🎉';
      const date = new Date(alert.createdAt).toLocaleString();
      return `${icon} ${alert.type.toUpperCase()} - <@${alert.userId}> - ${date}`;
    });

    embed.addFields({ name: 'Recent Activity', value: alertList.join('\n') });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
