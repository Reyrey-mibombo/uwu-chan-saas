const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_points')
    .setDescription('View and manage reward points')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)'))
    .addIntegerOption(opt => opt.setName('add').setDescription('Points to add'))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for points')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const addPoints = interaction.options.getInteger('add');
    const reason = interaction.options.getString('reason');

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.username });
    }

    if (!user.staff) user.staff = {};
    user.staff.points = user.staff.points || 0;

    if (addPoints && reason) {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ content: 'You need Manage Server permission to add points.', ephemeral: true });
      }

      user.staff.points += addPoints;
      await user.save();

      await Activity.create({
        userId: targetUser.id,
        guildId: interaction.guild.id,
        type: 'reward',
        data: {
          points: addPoints,
          description: reason,
          grantedBy: interaction.user.id
        }
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ Points Added')
        .setColor(0x2ecc71)
        .setDescription(`Added **${addPoints}** points to **${targetUser.username}**\nReason: ${reason}\nNew total: ${user.staff.points}`);

      return interaction.reply({ embeds: [embed] });
    }

    const recentPoints = await Activity.find({
      userId: targetUser.id,
      type: 'reward'
    }).sort({ createdAt: -1 }).limit(5);

    const embed = new EmbedBuilder()
      .setTitle('🎯 Reward Points')
      .setColor(0x9b59b6)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'User', value: targetUser.username, inline: true },
        { name: 'Total Points', value: `${user.staff.points}`, inline: true },
        { name: 'Recent Activity', value: `${recentPoints.length} transactions`, inline: true }
      );

    if (recentPoints.length > 0) {
      embed.addFields({ 
        name: 'Recent Points', 
        value: recentPoints.map(r => `+${r.data?.points || 0}: ${r.data?.description || 'Reward'}`).join('\n'),
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
