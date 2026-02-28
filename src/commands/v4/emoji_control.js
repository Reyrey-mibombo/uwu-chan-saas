const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji_control')
    .setDescription('Configure emoji control settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable emoji control')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('stickers')
        .setDescription('Also control stickers')
        .setRequired(false)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const stickers = interaction.options.getBoolean('stickers') || false;
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    guild.settings.emojiControl = {
      enabled,
      includeStickers: stickers
    };
    await guild.save();

    const embed = createPremiumEmbed()
      .setTitle('😀 Emoji Control Settings')
      
      .addFields(
        { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Include Stickers', value: stickers ? 'Yes' : 'No', inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



