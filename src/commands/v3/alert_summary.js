const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_summary')
    .setDescription('View alert summary')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Filter by status')
        .setRequired(false)
        .addChoices(
          { name: 'Active', value: 'active' },
          { name: 'Resolved', value: 'resolved' },
          { name: 'All', value: 'all' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const status = interaction.options.getString('status') || 'all';

    const query = { guildId };
    if (status !== 'all') {
      query['data.status'] = status;
    }

    const alerts = await Activity.find({
      guildId,
      type: 'alert',
      ...(status !== 'all' ? { 'data.status': status } : {})
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    const embed = new EmbedBuilder()
      .setTitle('🚨 Alert Summary')
      .setColor(0xe74c3c)
      .setDescription(`Server alerts for ${interaction.guild.name}`);

    const totalAlerts = await Activity.countDocuments({ guildId, type: 'alert' });
    const activeAlerts = await Activity.countDocuments({ guildId, type: 'alert', 'data.status': 'active' });
    const resolvedAlerts = await Activity.countDocuments({ guildId, type: 'alert', 'data.status': 'resolved' });

    embed.addFields(
      { name: 'Total Alerts', value: totalAlerts.toString(), inline: true },
      { name: 'Active', value: activeAlerts.toString(), inline: true },
      { name: 'Resolved', value: resolvedAlerts.toString(), inline: true }
    );

    if (alerts.length > 0) {
      const alertList = alerts.map(alert => {
        const alertStatus = alert.data?.status || 'unknown';
        const emoji = alertStatus === 'active' ? '🔴' : '🟢';
        const date = new Date(alert.createdAt).toLocaleDateString();
        return `${emoji} ${alert.data?.title || 'Alert'} - ${date}`;
      });
      embed.addFields({ name: 'Recent Alerts', value: alertList.join('\n'), inline: false });
    } else {
      embed.addFields({ name: 'Recent Alerts', value: 'No alerts found', inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
