const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_assign')
    .setDescription('Assign a role to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to assign role to')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to assign')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const guildId = interaction.guildId;
    const moderatorId = interaction.user.id;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }

    try {
      await member.roles.add(role);
    } catch (error) {
      return interaction.reply({ content: `Failed to assign role: ${error.message}`, ephemeral: true });
    }

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({
        userId: targetUser.id,
        username: targetUser.username,
        guilds: [{ guildId, joinedAt: new Date(), roles: [role.id] }]
      });
    } else {
      const guildMember = user.guilds?.find(g => g.guildId === guildId);
      if (guildMember) {
        if (!guildMember.roles) guildMember.roles = [];
        if (!guildMember.roles.includes(role.id)) {
          guildMember.roles.push(role.id);
        }
      } else {
        user.guilds = user.guilds || [];
        user.guilds.push({ guildId, joinedAt: new Date(), roles: [role.id] });
      }
      await user.save();
    }

    await Activity.create({
      guildId,
      userId: targetUser.id,
      type: 'command',
      data: {
        command: 'role_assign',
        roleId: role.id,
        roleName: role.name,
        moderatorId
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Role Assigned')
      .setColor(0x2ecc71)
      .setDescription(`Role ${role.name} assigned to ${targetUser.username}`)
      .addFields(
        { name: 'User', value: targetUser.username, inline: true },
        { name: 'Role', value: role.name, inline: true },
        { name: 'Assigned By', value: interaction.user.username, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
