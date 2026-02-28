const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
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

    const embed = createPremiumEmbed()
      .setTitle('🛡️ Anti-Spam Settings')
      
      .addFields(
        { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Max Messages', value: maxMessages.toString(), inline: true },
        { name: 'Interval', value: `${interval} seconds`, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



