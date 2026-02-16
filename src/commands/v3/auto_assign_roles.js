const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_assign_roles')
    .setDescription('Configure auto role assignment')
    .addBooleanOption(option =>
      option.setName('enable')
        .setDescription('Enable auto role assignment')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to auto-assign')
        .setRequired(false)),

  async execute(interaction) {
    const enable = interaction.options.getBoolean('enable');
    const role = interaction.options.getRole('role');
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    if (!guild.settings.autoRoles) guild.settings.autoRoles = [];

    if (enable && role) {
      if (!guild.settings.autoRoles.includes(role.id)) {
        guild.settings.autoRoles.push(role.id);
      }
      guild.settings.modules = guild.settings.modules || {};
      guild.settings.modules.autoRoles = true;
    } else if (!enable) {
      guild.settings.modules = guild.settings.modules || {};
      guild.settings.modules.autoRoles = false;
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Auto Role Assignment')
      .setColor(enable ? 0x2ecc71 : 0xe74c3c)
      .setDescription(enable ? 'Auto role assignment enabled' : 'Auto role assignment disabled');

    if (role && enable) {
      embed.addFields({ name: 'Role', value: role.name, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
