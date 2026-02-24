const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_alert')
    .setDescription('Manage activity alerts (on/off/check status)')
    .addBooleanOption(option =>
      option
        .setName('set')
        .setDescription('Enable or disable alerts (leave empty to check current status)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Replace with your actual storage logic
    const guildId = interaction.guildId;
    let current = true; // ← get from database / settings

    const setValue = interaction.options.getBoolean('set');

    if (setValue !== null) {
      current = setValue;
      // await saveSetting(guildId, 'activity_alerts', current);

      const verb = current ? 'Enabled' : 'Disabled';
      const color = current ? 0x57F287 : 0xED4245;
      const emoji = current ? '🟢' : '🔴';

      return interaction.reply({
        embeds: [{
          description: `\( {emoji} ** \){verb}** activity alerts.`,
          color: color
        }],
        ephemeral: false
      });
    }

    // Show current status
    const status = current ? 'Enabled' : 'Disabled';
    const emoji = current ? '🔔' : '🔕';
    const color = current ? 0x5865F2 : 0x99AAB5;

    await interaction.reply({
      embeds: [{
        description: `\( {emoji} Activity alerts are currently ** \){status}**.`,
        color: color
      }],
      ephemeral: false
    });
  }
};