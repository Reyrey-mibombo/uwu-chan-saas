const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_remind')
    .setDescription('Configure auto-reminders globally tracking operational deadlines on this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption(option =>
      option.setName('enable')
        .setDescription('Enable auto reminders engine tracking')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Reminder Type Sequence')
        .setRequired(false)
        .addChoices(
          { name: 'Shift Timeout Warnings', value: 'shift' },
          { name: 'Pending Task Reminders', value: 'task' },
          { name: 'Meeting Aggregation', value: 'meeting' }
        ))
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('Time buffer to ping before execution (Minutes)')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(1440)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const enable = interaction.options.getBoolean('enable');
      const type = interaction.options.getString('type') || 'shift';
      const minutes = interaction.options.getInteger('minutes') || 15;
      const guildId = interaction.guildId;
      const userId = interaction.user.id;

      let guild = await Guild.findOne({ guildId });
      if (!guild) {
        guild = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
      }

      if (!guild.settings) guild.settings = {};
      if (!guild.settings.reminders) guild.settings.reminders = {};

      guild.settings.reminders.enabled = enable;
      guild.settings.reminders.type = type;
      guild.settings.reminders.minutes = minutes;

      // Log the structural change tracking accountability
      const logTrace = new Activity({
        guildId,
        userId,
        type: 'command',
        data: { command: 'auto_remind', enabled: enable, type, minutes }
      });

      await Promise.all([guild.save(), logTrace.save()]);

      const embed = await createCustomEmbed(interaction, {
        title: '⏰ Auto-Reminder Vector Updated',
        description: enable
          ? `Background temporal tracking engine has been engaged.`
          : `The temporal sequence tracking engine is now shut down.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '⚙️ Operation Parameter', value: enable ? '✅ `Active`' : '❌ `Disabled`', inline: true },
          { name: '🎯 Objective Class', value: `\`${type.charAt(0).toUpperCase() + type.slice(1)}\``, inline: true },
          { name: '⏱️ Pre-Execution Buffer', value: `\`${minutes}\` Minutes Prior`, inline: true }
        ],
        footer: 'Temporal vectors utilize algorithmic timeouts bypassing generic limits'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Auto Remind Error:', error);
      const errEmbed = createErrorEmbed('A database execution error occurred attempting to modify the temporal engine.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
