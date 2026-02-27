const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_warn')
    .setDescription('Configure auto-warn settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable auto-warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Default warn reason')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('points')
        .setDescription('Warning points to assign')
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(false)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const reason = interaction.options.getString('reason') || 'Automatic warning';
    const points = interaction.options.getInteger('points') || 1;
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    if (!guild.settings.autoMod) guild.settings.autoMod = {};

    guild.settings.autoMod.autoWarn = {
      enabled,
      reason,
      points
    };
    await guild.save();

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⚠️ Auto-Warn Settings')
      
      .addFields(
        { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Points', value: points.toString(), inline: true },
        { name: 'Default Reason', value: reason, inline: false }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
