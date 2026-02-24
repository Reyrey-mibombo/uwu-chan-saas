const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_setup')
    .setDescription('[Admin] Setup the application system')
    .addRoleOption(opt => opt.setName('staff_role').setDescription('Role that can review applications').setRequired(true))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel where applications are sent').setRequired(true))
    .addRoleOption(opt => opt.setName('accepted_role').setDescription('Role given when accepted').setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const staffRole = interaction.options.getRole('staff_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const acceptedRole = interaction.options.getRole('accepted_role');

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.applicationConfig) {
      guild.applicationConfig = {};
    }

    guild.applicationConfig.enabled = true;
    guild.applicationConfig.staffRole = staffRole.id;
    guild.applicationConfig.logChannel = logChannel.id;
    guild.applicationConfig.acceptedRole = acceptedRole.id;
    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Application System Configured')
      .setColor(0x2ecc71)
      .addFields(
        { name: '👥 Staff Role', value: staffRole.name, inline: true },
        { name: '📝 Log Channel', value: logChannel.name, inline: true },
        { name: '✅ Accepted Role', value: acceptedRole.name, inline: true }
      )
      .setDescription('Now use `/apply_panel` to create the application form!')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
