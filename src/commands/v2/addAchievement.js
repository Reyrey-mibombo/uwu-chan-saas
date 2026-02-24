const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_achievement')
    .setDescription('[Premium] Add an achievement to a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addStringOption(opt => opt.setName('achievement').setDescription('Achievement name').setRequired(true)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const achievement = interaction.options.getString('achievement');

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.tag });
    }

    if (!user.staff) user.staff = {};
    if (!user.staff.achievements) user.staff.achievements = [];

    if (!user.staff.achievements.includes(achievement)) {
      user.staff.achievements.push(achievement);
      await user.save();
    }

    const embed = new EmbedBuilder()
      .setTitle('🏅 Achievement Added!')
      .setColor(0xf1c40f)
      .addFields(
        { name: '👤 User', value: targetUser.tag, inline: true },
        { name: '🏅 Achievement', value: achievement, inline: true },
        { name: '📊 Total', value: user.staff.achievements.length.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
