const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_visual')
    .setDescription('View visual leaderboard')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show (default 10)').setMinValue(1).setMaxValue(25)),
  async execute(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;
    const guildId = interaction.guild.id;

    const users = await User.find({
      'guilds.guildId': guildId,
      'staff.points': { $gt: 0 }
    })
      .sort({ 'staff.points': -1 })
      .limit(limit);

    const leaderboard = await Promise.all(users.map(async (user, index) => {
      const discordUser = await interaction.client.users.fetch(user.userId).catch(() => null);
      const name = discordUser ? discordUser.username : `User ${user.userId}`;
      const points = user.staff?.points || 0;
      const rank = user.staff?.rank || 'member';
      return { index: index + 1, name, points, rank };
    }));

    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard')
      .setColor(0xffd700)
      .setDescription(leaderboard.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${entry.index}.`;
        return `${medal} **${entry.name}** - ${entry.points} pts (${entry.rank})`;
      }).join('\n'))
      .setFooter({ text: `Showing ${leaderboard.length} users` });

    if (leaderboard.length > 0) {
      const topUser = await interaction.client.users.fetch(users[0].userId).catch(() => null);
      if (topUser) embed.setThumbnail(topUser.displayAvatarURL());
    }

    await interaction.reply({ embeds: [embed] });
  }
};
