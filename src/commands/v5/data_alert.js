const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('data_alert')
    .setDescription('Configure data alerts')
    .addStringOption(opt => opt.setName('alert_type').setDescription('Alert type to configure')
      .addChoices(
        { name: 'Low Activity', value: 'low_activity' },
        { name: 'High Warnings', value: 'high_warnings' },
        { name: 'New Members', value: 'new_members' }
      )
      .setRequired(false))
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable alert').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const alertType = interaction.options.getString('alert_type');
    const enabled = interaction.options.getBoolean('enabled');

    let guild = await Guild.findOne({ guildId });

    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings.alerts) {
      guild.settings.alerts = {
        lowActivity: { enabled: false, threshold: 10 },
        highWarnings: { enabled: false, threshold: 5 },
        newMembers: { enabled: false }
      };
    }

    if (alertType && enabled !== null) {
      const alertMap = {
        'low_activity': 'lowActivity',
        'high_warnings': 'highWarnings',
        'new_members': 'newMembers'
      };
      const key = alertMap[alertType];
      if (key) {
        guild.settings.alerts[key].enabled = enabled;
      }
      await guild.save();

      await interaction.reply({ content: `Alert **${alertType}** has been ${enabled ? 'enabled' : 'disabled'}.` });
    } else {
      const alerts = guild.settings.alerts;
      const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
        .setTitle('🔔 Data Alerts Configuration')
        
        .addFields(
          { name: 'Low Activity', value: alerts.lowActivity?.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'High Warnings', value: alerts.highWarnings?.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'New Members', value: alerts.newMembers?.enabled ? '✅ Enabled' : '❌ Disabled', inline: true }
        )
        .setDescription('Use `/data_alert alert_type:... enabled:...` to configure alerts.')
        ;

      await interaction.reply({ embeds: [embed] });
    }
  }
};
