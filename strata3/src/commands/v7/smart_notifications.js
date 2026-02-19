const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_notifications')
    .setDescription('Configure smart notifications')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable smart notifications'))
    .addBooleanOption(opt => opt.setName('mentions').setDescription('Enable @mentions'))
    .addBooleanOption(opt => opt.setName('role_ping').setDescription('Enable role pings'))
    .addBooleanOption(opt => opt.setName('quiet_hours').setDescription('Enable quiet hours')),
  async execute(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const mentions = interaction.options.getBoolean('mentions');
    const rolePing = interaction.options.getBoolean('role_ping');
    const quietHours = interaction.options.getBoolean('quiet_hours');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    if (enabled !== null) {
      guild.settings = guild.settings || {};
      guild.settings.smartNotificationsEnabled = enabled;
    }
    if (mentions !== null) {
      guild.settings = guild.settings || {};
      guild.settings.notificationsMentions = mentions;
    }
    if (rolePing !== null) {
      guild.settings = guild.settings || {};
      guild.settings.notificationsRolePing = rolePing;
    }
    if (quietHours !== null) {
      guild.settings = guild.settings || {};
      guild.settings.notificationsQuietHours = quietHours;
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('🔔 Smart Notifications')
      .setColor(0x2980b9)
      .addFields(
        { name: 'Enabled', value: guild.settings.smartNotificationsEnabled ? 'Yes' : 'No', inline: true },
        { name: '@Mentions', value: guild.settings.notificationsMentions ? 'Yes' : 'No', inline: true },
        { name: 'Role Ping', value: guild.settings.notificationsRolePing ? 'Yes' : 'No', inline: true },
        { name: 'Quiet Hours', value: guild.settings.notificationsQuietHours ? 'Yes' : 'No', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
