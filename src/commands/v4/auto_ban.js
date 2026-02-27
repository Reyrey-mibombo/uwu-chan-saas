const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_ban')
    .setDescription('Configure auto-ban settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable auto-ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Default ban reason')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('strikes')
        .setDescription('Number of strikes to trigger ban')
        .setMinValue(3)
        .setMaxValue(10)
        .setRequired(false)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const reason = interaction.options.getString('reason') || 'Automatic ban';
    const strikes = interaction.options.getInteger('strikes') || 5;
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    if (!guild.settings.autoMod) guild.settings.autoMod = {};

    guild.settings.autoMod.autoBan = {
      enabled,
      reason,
      strikeThreshold: strikes
    };
    await guild.save();

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🔨 Auto-Ban Settings')
      
      .addFields(
        { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Strike Threshold', value: strikes.toString(), inline: true },
        { name: 'Default Reason', value: reason, inline: false }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
