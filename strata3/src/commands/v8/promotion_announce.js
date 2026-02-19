const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_announce')
    .setDescription('Announce a promotion with visual effects')
    .addUserOption(opt => opt.setName('user').setDescription('User being promoted'))
    .addStringOption(opt => opt.setName('new_rank').setDescription('New rank'))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to announce in')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const newRank = interaction.options.getString('new_rank');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!targetUser || !newRank) {
      return interaction.reply('Please provide both a user and new rank.');
    }

    const user = await User.findOne({ userId: targetUser.id });
    const oldRank = user?.staff?.rank || 'member';
    const points = user?.staff?.points || 0;

    await User.updateOne(
      { userId: targetUser.id },
      { $set: { 'staff.rank': newRank } }
    );

    const embed = new EmbedBuilder()
      .setTitle('🎉 Promotion Announcement!')
      .setColor(0xffd700)
      .setDescription(`🎊 **Congratulations ${targetUser.username}!** 🎊\n\nYou have been promoted from **${oldRank}** to **${newRank}**!`)
      .addFields(
        { name: 'Previous Rank', value: oldRank.toUpperCase(), inline: true },
        { name: 'New Rank', value: newRank.toUpperCase(), inline: true },
        { name: 'Total Points', value: `${points}`, inline: true }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Promotion announced in ${channel}`, ephemeral: true });
  }
};
