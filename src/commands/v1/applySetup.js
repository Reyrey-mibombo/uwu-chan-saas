const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_setup')
    .setDescription('Setup application system for Staff or Helpers')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Application type')
        .setRequired(true)
        .addChoices(
          { name: '👮 Staff (Moderators/Admins)', value: 'staff' },
          { name: '🌟 Helper (Trial/Assistant)', value: 'helper' }
        ))
    .addRoleOption(opt => opt.setName('reviewer_role').setDescription('Role that can review applications').setRequired(true))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel where applications are sent').setRequired(true))
    .addRoleOption(opt => opt.setName('accepted_role').setDescription('Role given when accepted').setRequired(true))
    .addStringOption(opt => opt.setName('custom_title').setDescription('Custom panel title (optional)').setRequired(false))
    .addStringOption(opt => opt.setName('custom_desc').setDescription('Custom panel description (optional)').setRequired(false))
    .addStringOption(opt => opt.setName('banner_url').setDescription('Custom panel banner image URL (optional)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const type = interaction.options.getString('type');
    const reviewerRole = interaction.options.getRole('reviewer_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const acceptedRole = interaction.options.getRole('accepted_role');
    const customTitle = interaction.options.getString('custom_title');
    const customDesc = interaction.options.getString('custom_desc');
    const bannerUrl = interaction.options.getString('banner_url');

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.applicationConfig) {
      guild.applicationConfig = { enabled: true, types: {} };
    }
    if (!guild.applicationConfig.types) {
      guild.applicationConfig.types = {};
    }

    guild.applicationConfig.types[type] = {
      enabled: true,
      staffRole: reviewerRole.id,
      logChannel: logChannel.id,
      acceptedRole: acceptedRole.id,
      customTitle: customTitle || (type === 'staff' ? '👮 Staff Applications' : '🌟 Helper Applications'),
      customDesc: customDesc || `Apply to become a ${type}!`,
      bannerUrl: bannerUrl || null,
      questions: type === 'staff' ? [
        { question: 'Why do you want to join staff?', required: true, type: 'paragraph' },
        { question: 'Previous experience?', required: true, type: 'paragraph' },
        { question: 'How active are you?', required: true, type: 'short' },
        { question: 'Your age', required: true, type: 'short' },
        { question: 'Anything else?', required: false, type: 'paragraph' }
      ] : [
        { question: 'Why do you want to be a Helper?', required: true, type: 'paragraph' },
        { question: 'How would you assist the community?', required: true, type: 'paragraph' },
        { question: 'Any experience as helper/mod?', required: true, type: 'paragraph' },
        { question: 'How active are you?', required: true, type: 'short' },
        { question: 'Anything else?', required: false, type: 'paragraph' }
      ]
    };

    guild.markModified('applicationConfig');
    await guild.save();

    const emoji = type === 'staff' ? '👮' : '🌟';
    const color = type === 'staff' ? 0x5865f2 : 0x9b59b6;

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${type.toUpperCase()} Application System Configured`)
      .setColor(color)
      .addFields(
        { name: '👥 Reviewer Role', value: `<@&${reviewerRole.id}>`, inline: true },
        { name: '📝 Log Channel', value: `<#${logChannel.id}>`, inline: true },
        { name: '✅ Accepted Role', value: `<@&${acceptedRole.id}>`, inline: true }
      )
      .setDescription(`The application system for **${type}** has been successfully set up and is ready to use!\n\nUse \`/apply_panel type:${type}\` in your desired channel to generate the application panel.`)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    if (bannerUrl && bannerUrl.startsWith('http')) {
      embed.setImage(bannerUrl);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};