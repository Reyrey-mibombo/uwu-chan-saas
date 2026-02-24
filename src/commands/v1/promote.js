const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Manually promote a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to promote').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('Rank to promote to').setRequired(true)
      .addChoices(
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' },
        { name: 'Admin', value: 'admin' }
      )),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ You need Manage Roles permission!', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const newRank = interaction.options.getString('rank');
    const guildId = interaction.guildId;

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.tag });
    }

    if (!user.staff) user.staff = {};
    user.staff.rank = newRank;
    await user.save();

    const guild = await Guild.findOne({ guildId });
    const rankRole = guild?.rankRoles?.[newRank];

    if (rankRole) {
      const member = interaction.guild.members.cache.get(targetUser.id);
      if (member) {
        try {
          await member.roles.add(rankRole);
        } catch (e) {}
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ User Promoted')
      .setColor(0x2ecc71)
      .addFields(
        { name: '👤 User', value: targetUser.tag, inline: true },
        { name: '🎖️ New Rank', value: newRank, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
