const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_task')
    .setDescription('Configure automatic task system')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto tasks'))
    .addStringOption(opt => opt.setName('frequency').setDescription('Frequency: hourly, daily, weekly'))
    .addBooleanOption(opt => opt.setName('reminders').setDescription('Send task reminders')),
  async execute(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const frequency = interaction.options.getString('frequency');
    const reminders = interaction.options.getBoolean('reminders');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    if (enabled !== null) {
      guild.settings = guild.settings || {};
      guild.settings.autoTaskEnabled = enabled;
    }
    if (frequency) {
      guild.settings = guild.settings || {};
      guild.settings.autoTaskFrequency = frequency;
    }
    if (reminders !== null) {
      guild.settings = guild.settings || {};
      guild.settings.autoTaskReminders = reminders;
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('📋 Auto Task Configuration')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Enabled', value: guild.settings.autoTaskEnabled ? 'Yes' : 'No', inline: true },
        { name: 'Frequency', value: guild.settings.autoTaskFrequency || 'daily', inline: true },
        { name: 'Reminders', value: guild.settings.autoTaskReminders ? 'Yes' : 'No', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
