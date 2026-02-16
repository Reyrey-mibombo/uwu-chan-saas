const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_alerts')
    .setDescription('Configure smart alerts')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable smart alerts'))
    .addStringOption(opt => opt.setName('types').setDescription('Alert types (comma-separated)').addChoices(
      { name: 'All', value: 'all' },
      { name: 'Promotion', value: 'promotion' },
      { name: 'Reward', value: 'reward' },
      { name: 'Task', value: 'task' }
    ))
    .addBooleanOption(opt => opt.setName('dm').setDescription('Send alerts via DM')),
  async execute(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const types = interaction.options.getString('types');
    const dm = interaction.options.getBoolean('dm');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    if (enabled !== null) {
      guild.settings = guild.settings || {};
      guild.settings.smartAlertsEnabled = enabled;
    }
    if (types) {
      guild.settings = guild.settings || {};
      guild.settings.smartAlertTypes = types.split(',').map(t => t.trim());
    }
    if (dm !== null) {
      guild.settings = guild.settings || {};
      guild.settings.smartAlertsDM = dm;
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('🔔 Smart Alerts Configuration')
      .setColor(0xe67e22)
      .addFields(
        { name: 'Enabled', value: guild.settings.smartAlertsEnabled ? 'Yes' : 'No', inline: true },
        { name: 'Alert Types', value: guild.settings.smartAlertTypes?.join(', ') || 'Not set', inline: true },
        { name: 'Send via DM', value: guild.settings.smartAlertsDM ? 'Yes' : 'No', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
