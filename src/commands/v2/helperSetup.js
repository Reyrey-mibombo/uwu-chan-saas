const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('helper_setup')
    .setDescription('[Helper] Setup helper application system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option =>
      option.setName('staff_role')
        .setDescription('Role that can review applications')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('log_channel')
        .setDescription('Channel where applications will be posted')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('accepted_role')
        .setDescription('Role to give when accepted')
        .setRequired(true)),

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

    if (!guild.helperConfig) guild.helperConfig = {};

    guild.helperConfig.enabled = true;
    guild.helperConfig.staffRole = staffRole.id;
    guild.helperConfig.logChannel = logChannel.id;
    guild.helperConfig.acceptedRole = acceptedRole.id;

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Helper Application System Configured')
      .setColor(0x57F287) // green
      .setDescription('Your helper application system is now ready! Use `/helper_panel` to send the application form.')
      .addFields(
        { name: '👥 Staff Role', value: staffRole.toString(), inline: true },
        { name: '📝 Log Channel', value: logChannel.toString(), inline: true },
        { name: '✅ Accepted Role', value: acceptedRole.toString(), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    await interaction.editReply({ embeds: [embed] });
  }
};