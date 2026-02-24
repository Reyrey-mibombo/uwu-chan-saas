const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Manually demote a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to demote').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('Rank to demote to').setRequired(true)
      .addChoices(
        { name: 'Trial', value: 'trial' },
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' }
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

    const embed = new EmbedBuilder()
      .setTitle('⬇️ User Demoted')
      .setColor(0xe74c3c)
      .addFields(
        { name: '👤 User', value: targetUser.tag, inline: true },
        { name: '🎖️ New Rank', value: newRank, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
