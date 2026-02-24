const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup_promo')
    .setDescription('[Free] Quick setup for promotion system')
    .addChannelOption(opt => opt.setName('channel').setDescription('Promotion announcements channel').setRequired(true))
    .addRoleOption(opt => opt.setName('staff_role').setDescription('Role for Staff rank').setRequired(true))
    .addRoleOption(opt => opt.setName('senior_role').setDescription('Role for Senior rank (optional)').setRequired(false))
    .addRoleOption(opt => opt.setName('manager_role').setDescription('Role for Manager rank (optional)').setRequired(false))
    .addRoleOption(opt => opt.setName('admin_role').setDescription('Role for Admin rank (optional)').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const channel = interaction.options.getChannel('channel');
    const staffRole = interaction.options.getRole('staff_role');
    const seniorRole = interaction.options.getRole('senior_role');
    const managerRole = interaction.options.getRole('manager_role');
    const adminRole = interaction.options.getRole('admin_role');

    let guildData = await Guild.findOne({ guildId });
    if (!guildData) {
      guildData = new Guild({ guildId, name: interaction.guild.name });
    }

    guildData.rankRoles = {
      staff: staffRole.id,
      senior: seniorRole?.id || null,
      manager: managerRole?.id || null,
      admin: adminRole?.id || null
    };

    guildData.settings = guildData.settings || {};
    guildData.settings.promotionChannel = channel.id;

    guildData.promotionRequirements = {
      staff: { points: 100, shifts: 5, consistency: 70 },
      senior: { points: 300, shifts: 10, consistency: 75 },
      manager: { points: 600, shifts: 20, consistency: 80 },
      admin: { points: 1000, shifts: 30, consistency: 85 }
    };

    guildData.settings.modules = guildData.settings.modules || {};
    guildData.settings.modules.automation = true;

    await guildData.save();

    const rolesList = [
      `⭐ Staff: **${staffRole.name}**`,
      seniorRole ? `🌟 Senior: **${seniorRole.name}**` : null,
      managerRole ? `💎 Manager: **${managerRole.name}**` : null,
      adminRole ? `👑 Admin: **${adminRole.name}**` : null
    ].filter(Boolean).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('✅ Promotion System Setup Complete!')
      .setColor(0x2ecc71)
      .setDescription('Your promotion system is now configured!')
      .addFields(
        { name: '📢 Announcement Channel', value: channel.name, inline: true },
        { name: '🎭 Rank Roles', value: rolesList, inline: false },
        { name: '⚙️ Default Requirements', value: 'Auto-promotion enabled with default settings', inline: false }
      )
      .addFields(
        { name: '📊 Default Point Thresholds', value: '```\nStaff: 100pts, 5 shifts, 70%\nSenior: 300pts, 10 shifts, 75%\nManager: 600pts, 20 shifts, 80%\nAdmin: 1000pts, 30 shifts, 85%\n```', inline: false }
      )
      .setFooter({ text: 'Use /set_requirements to customize • Use /set_rank_roles to change roles' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
