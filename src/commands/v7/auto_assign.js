const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_assign')
    .setDescription('Configure automatic role assignment')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto assign'))
    .addStringOption(opt => opt.setName('roles').setDescription('Comma-separated role IDs'))
    .addStringOption(opt => opt.setName('delay').setDescription('Delay in seconds (default: 30)')),
  async execute(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const roles = interaction.options.getString('roles');
    const delay = interaction.options.getString('delay');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    if (enabled !== null) {
      guild.settings = guild.settings || {};
      guild.settings.autoAssignEnabled = enabled;
    }
    if (roles) {
      guild.settings = guild.settings || {};
      guild.settings.autoAssignRoles = roles.split(',').map(r => r.trim());
    }
    if (delay) {
      guild.settings = guild.settings || {};
      guild.settings.autoAssignDelay = parseInt(delay);
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Auto Assign Configuration')
      .setColor(0x3498db)
      .addFields(
        { name: 'Enabled', value: guild.settings.autoAssignEnabled ? 'Yes' : 'No', inline: true },
        { name: 'Roles', value: guild.settings.autoAssignRoles?.join(', ') || 'Not set', inline: true },
        { name: 'Delay', value: `${guild.settings.autoAssignDelay || 30}s`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
