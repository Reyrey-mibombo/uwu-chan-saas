const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_alerts')
    .setDescription('Configure task alerts')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable task alerts'))
    .addStringOption(opt => opt.setName('reminder_time').setDescription('Reminder time in minutes'))
    .addBooleanOption(opt => opt.setName('overdue').setDescription('Alert on overdue tasks')),
  async execute(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const reminderTime = interaction.options.getString('reminder_time');
    const overdue = interaction.options.getBoolean('overdue');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    if (enabled !== null) {
      guild.settings = guild.settings || {};
      guild.settings.taskAlertsEnabled = enabled;
    }
    if (reminderTime) {
      guild.settings = guild.settings || {};
      guild.settings.taskReminderTime = parseInt(reminderTime);
    }
    if (overdue !== null) {
      guild.settings = guild.settings || {};
      guild.settings.taskAlertsOverdue = overdue;
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('⏰ Task Alerts Configuration')
      .setColor(0xc0392b)
      .addFields(
        { name: 'Enabled', value: guild.settings.taskAlertsEnabled ? 'Yes' : 'No', inline: true },
        { name: 'Reminder Time', value: `${guild.settings.taskReminderTime || 15} min`, inline: true },
        { name: 'Alert on Overdue', value: guild.settings.taskAlertsOverdue ? 'Yes' : 'No', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
