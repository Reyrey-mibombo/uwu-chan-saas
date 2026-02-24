const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('helper_setup')
    .setDescription('[Helper] Setup helper application system')
    .addRoleOption(opt => opt.setName('staff_role').setDescription('Role that can review applications').setRequired(true))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel for application logs').setRequired(true))
    .addRoleOption(opt => opt.setName('accepted_role').setDescription('Role to give when accepted').setRequired(true)),

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

    if (!guild.helperConfig) {
      guild.helperConfig = {};
    }

    guild.helperConfig.enabled = true;
    guild.helperConfig.staffRole = staffRole.id;
    guild.helperConfig.logChannel = logChannel.id;
    guild.helperConfig.acceptedRole = acceptedRole.id;
    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Helper Application System Configured')
      .setColor(0x2ecc71)
      .addFields(
        { name: '👥 Staff Role', value: staffRole.name, inline: true },
        { name: '📝 Log Channel', value: logChannel.name, inline: true },
        { name: '✅ Accepted Role', value: acceptedRole.name, inline: true }
      )
      .setDescription('Now use `/helper_panel` to create the application form!')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
