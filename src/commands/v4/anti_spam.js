const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anti_spam')
    .setDescription('Configure anti-spam settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable anti-spam')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('max_messages')
        .setDescription('Max messages per interval')
        .setMinValue(3)
        .setMaxValue(10)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('interval')
        .setDescription('Time interval in seconds')
        .setMinValue(3)
        .setMaxValue(30)
        .setRequired(false)),

  async execute(interaction) {
    try {
      const enabled = interaction.options.getBoolean('enabled');
      const maxMessages = interaction.options.getInteger('max_messages') || 5;
      const interval = interaction.options.getInteger('interval') || 5;
      const guildId = interaction.guildId;

      let guild = await Guild.findOne({ guildId });
      if (!guild) {
        guild = new Guild({ guildId, name: interaction.guild.name });
      }

      if (!guild.settings) guild.settings = {};
      if (!guild.settings.antiSpam) guild.settings.antiSpam = {};

      guild.settings.antiSpam.enabled = enabled;
      guild.settings.antiSpam.maxMessages = maxMessages;
      guild.settings.antiSpam.interval = interval;
      await guild.save();

      const embed = await createCustomEmbed(interaction, {
        title: '🛡️ Guardian Security: Anti-Spam Node',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 📡 Operational Security: Sector ${interaction.guild.name}\nAutomated Threat Detection and Mitigation protocol configuration. Analyzing real-time signal density to prevent network saturation.`,
        fields: [
          { name: '⚖️ Node Status', value: enabled ? '`🔵 ACTIVE`' : '`🔴 OFFLINE`', inline: true },
          { name: '📡 Signal Ceiling', value: `\`${maxMessages}\` Packets`, inline: true },
          { name: '⏱️ Pulse Interval', value: `\`${interval}\` Seconds`, inline: true },
          { name: '🛡️ Protection Tier', value: enabled ? '`Guardian V4 Standard`' : '`Unprotected`', inline: false }
        ],
        footer: 'Threat Neutralization Protocol • V4 Guardian Suite',
        color: enabled ? 'success' : 'premium'
      });

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Anti-Spam Config Error:', error);
      await interaction.reply({ content: 'Guardian Security failure: Unable to synchronize threat neutralization parameters.', ephemeral: true });
    }
  }
};
