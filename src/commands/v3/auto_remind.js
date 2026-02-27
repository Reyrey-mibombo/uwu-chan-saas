const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, Guild, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_remind')
    .setDescription('Configure auto reminders')
    .addBooleanOption(option =>
      option.setName('enable')
        .setDescription('Enable auto reminders')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Reminder type')
        .setRequired(false)
        .addChoices(
          { name: 'Shift Reminder', value: 'shift' },
          { name: 'Task Reminder', value: 'task' },
          { name: 'Meeting Reminder', value: 'meeting' }
        ))
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('Minutes before to remind')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(1440)),

  async execute(interaction) {
    const enable = interaction.options.getBoolean('enable');
    const type = interaction.options.getString('type') || 'shift';
    const minutes = interaction.options.getInteger('minutes') || 15;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    if (!guild.settings.reminders) guild.settings.reminders = {};

    guild.settings.reminders.enabled = enable;
    guild.settings.reminders.type = type;
    guild.settings.reminders.minutes = minutes;
    await guild.save();

    await Activity.create({
      guildId,
      userId,
      type: 'command',
      data: { command: 'auto_remind', enabled: enable, type, minutes }
    });

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⏰ Auto Reminder Configured')
      
      .addFields(
        { name: 'Status', value: enable ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
        { name: 'Remind Before', value: `${minutes} minutes`, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
