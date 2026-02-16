const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_settings')
    .setDescription('Configure automation settings')
    .addBooleanOption(opt => opt.setName('all').setDescription('Enable all automations'))
    .addStringOption(opt => opt.setName('timezone').setDescription('Set timezone'))
    .addBooleanOption(opt => opt.setName('logs').setDescription('Log automation activities')),
  async execute(interaction, client) {
    const all = interaction.options.getBoolean('all');
    const timezone = interaction.options.getString('timezone');
    const logs = interaction.options.getBoolean('logs');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    if (all !== null) {
      guild.settings = guild.settings || {};
      guild.settings.automationEnabled = all;
      guild.settings.autoPromotionEnabled = all;
      guild.settings.autoTaskEnabled = all;
      guild.settings.autoAssignEnabled = all;
    }
    if (timezone) {
      guild.settings = guild.settings || {};
      guild.settings.timezone = timezone;
    }
    if (logs !== null) {
      guild.settings = guild.settings || {};
      guild.settings.automationLogs = logs;
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Automation Settings')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Master Switch', value: guild.settings.automationEnabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Timezone', value: guild.settings.timezone || 'UTC', inline: true },
        { name: 'Activity Logs', value: guild.settings.automationLogs ? 'Enabled' : 'Disabled', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
