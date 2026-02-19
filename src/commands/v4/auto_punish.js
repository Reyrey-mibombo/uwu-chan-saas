const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_punish')
    .setDescription('Configure auto-punishment settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable auto-punish')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to take')
        .setRequired(false)
        .addChoices(
          { name: 'Warn', value: 'warn' },
          { name: 'Mute', value: 'mute' },
          { name: 'Kick', value: 'kick' },
          { name: 'Ban', value: 'ban' }
        ))
    .addIntegerOption(option =>
      option.setName('threshold')
        .setDescription('Trigger threshold')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const action = interaction.options.getString('action') || 'warn';
    const threshold = interaction.options.getInteger('threshold') || 3;
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    if (!guild.settings.autoMod) guild.settings.autoMod = {};

    guild.settings.autoMod.autoPunish = {
      enabled,
      action,
      threshold
    };
    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Auto-Punish Settings')
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .addFields(
        { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Action', value: action.toUpperCase(), inline: true },
        { name: 'Threshold', value: `${threshold} violations`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
