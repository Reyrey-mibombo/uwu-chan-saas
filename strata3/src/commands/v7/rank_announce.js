const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_announce')
    .setDescription('Announce rank changes')
    .addUserOption(opt => opt.setName('user').setDescription('User to announce'))
    .addStringOption(opt => opt.setName('new_rank').setDescription('New rank name')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const newRank = interaction.options.getString('new_rank');

    if (!targetUser || !newRank) {
      return interaction.reply({ content: 'Please specify a user and new rank.' });
    }

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.username });
    }

    const oldRank = user.staff?.rank || 'member';
    user.staff = user.staff || {};
    user.staff.rank = newRank;
    await user.save();

    const channel = interaction.channel;
    const embed = new EmbedBuilder()
      .setTitle('⬆️ Rank Announcement')
      .setColor(0xf1c40f)
      .setDescription(`🎉 **${targetUser.username}** has been promoted from **${oldRank}** to **${newRank}**!`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: 'Congratulations!' });

    await interaction.reply({ embeds: [embed] });

    if (interaction.guild) {
      const announcementChannel = interaction.guild.channels.cache.find(
        c => c.name.includes('announcement') || c.name.includes('general')
      );
      if (announcementChannel && announcementChannel.id !== channel.id) {
        await announcementChannel.send({ embeds: [embed] });
      }
    }
  }
};
