const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_summary')
    .setDescription('Review algorithmic server alerts filtered by state')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Filter logs by priority state')
        .setRequired(false)
        .addChoices(
          { name: 'Active / Pending', value: 'active' },
          { name: 'Resolved / Mitigated', value: 'resolved' },
          { name: 'All Chronological Logs', value: 'all' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const status = interaction.options.getString('status') || 'all';

      const query = { guildId, type: 'alert' };
      if (status !== 'all') {
        query['data.status'] = status;
      }

      const alerts = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      if (alerts.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No log traces found mapping to the \`${status}\` parameter on this server.`)] });
      }

      const totalAlerts = await Activity.countDocuments({ guildId, type: 'alert' });
      const activeAlerts = await Activity.countDocuments({ guildId, type: 'alert', 'data.status': 'active' });
      const resolvedAlerts = await Activity.countDocuments({ guildId, type: 'alert', 'data.status': 'resolved' });

      const embed = await createCustomEmbed(interaction, {
        title: `🚨 Server Alert Aggregator`,
        description: `Tracing infrastructure events recorded within **${interaction.guild.name}**.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '🛡️ Parameter Bounds', value: `\`${status.toUpperCase()}\``, inline: false },
          { name: '✅ Resolved Matrices', value: `\`${resolvedAlerts}\` Cleared`, inline: true },
          { name: '⚠️ Pending Trajectories', value: `\`${activeAlerts}\` Active`, inline: true },
          { name: '🌐 Total Lifetime Logs', value: `\`${totalAlerts}\` Traces`, inline: true }
        ],
        footer: 'Background network engine intercepts automated alerts based on thresholds.'
      });

      const alertList = alerts.map(alert => {
        const alertStatus = alert.data?.status || 'unknown';
        const emoji = alertStatus === 'active' ? '🔴' : '🟢';
        const unixTime = Math.floor(new Date(alert.createdAt).getTime() / 1000);
        return `> ${emoji} **${alert.data?.title || 'Unknown Alert Hash'}** (<t:${unixTime}:R>)`;
      });

      embed.addFields({ name: `📋 Target Filter: ${status}`, value: alertList.join('\n'), inline: false });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Alert Summary Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred parsing the algorithmic alert summary tree.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
