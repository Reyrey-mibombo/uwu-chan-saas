const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link_blocker')
    .setDescription('Configure link blocker settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable link blocker')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('whitelist')
        .setDescription('Block all links except whitelisted')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('links')
        .setDescription('Allowed links (comma separated)')
        .setRequired(false)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const whitelist = interaction.options.getBoolean('whitelist') || false;
    const links = interaction.options.getString('links') || '';
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    guild.settings.linkBlocker = {
      enabled,
      whitelist,
      allowedLinks: links.split(',').map(l => l.trim()).filter(l => l)
    };
    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('🔗 Link Blocker Settings')
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .addFields(
        { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Mode', value: whitelist ? 'Whitelist' : 'Blacklist', inline: true }
      )
      .setTimestamp();

    if (links) {
      embed.addFields({ name: 'Allowed Links', value: links, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
