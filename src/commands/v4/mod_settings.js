const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_settings')
    .setDescription('Configure moderation settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable moderation')
        .setRequired(true)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    if (!guild.settings.modules) guild.settings.modules = {};
    guild.settings.modules.moderation = enabled;
    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Moderation Settings')
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .setDescription(`Moderation is now ${enabled ? 'enabled' : 'disabled'}`);

    await interaction.reply({ embeds: [embed] });
  }
};
